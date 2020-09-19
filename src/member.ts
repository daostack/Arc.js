import { BigNumber } from 'ethers'
import { utils } from 'ethers'
import gql from 'graphql-tag'
import { Observable, Observer } from 'rxjs'
import { map } from 'rxjs/operators'
import {
  Address,
  AnyProposal,
  Arc,
  concat,
  createGraphQlQuery,
  DAO,
  Date,
  Entity,
  hexStringToUint8Array,
  IApolloQueryOptions,
  ICommonQueryOptions,
  IEntityRef,
  IProposalQueryOptions,
  isAddress,
  IStakeQueryOptions,
  IVoteQueryOptions,
  Proposal,
  Reward,
  Stake,
  toIOperationObservable,
  Vote
} from './index'

export interface IMemberState {
  id: string
  address: Address
  contract?: Address
  createdAt: Date
  dao: IEntityRef<DAO>
  reputation: BigNumber
}

export interface IMemberQueryOptions extends ICommonQueryOptions {
  where?: {
    id?: string
    address?: Address
    dao?: Address
  }
}

/**
 * Represents an account that holds reputaion in a specific DAO
 */
export class Member extends Entity<IMemberState> {
  public static fragments = {
    ReputationHolderFields: gql`
      fragment ReputationHolderFields on ReputationHolder {
        id
        address
        contract
        createdAt
        dao {
          id
        }
        balance
      }
    `
  }

  public static search(
    context: Arc,
    options: IMemberQueryOptions = {},
    apolloQueryOptions: IApolloQueryOptions = {}
  ): Observable<Member[]> {
    if (!options.where) {
      options.where = {}
    }

    const itemMap = (arc: Arc, item: any, queriedId?: string) => {
      const state = Member.itemMap(arc, item, queriedId)
      return new Member(arc, state)
    }

    if (options.where.id) {
      return new Member(context, options.where.id).state().pipe(map((r: any) => [r]))
    } else {
      let where = ''
      for (let key of Object.keys(options.where)) {
        if (options.where[key] === undefined) {
          continue
        }

        // TODO: remove once this issue is closed https://github.com/daostack/subgraph/issues/537
        const value = options.where[key]
        key = key.replace('plugin', 'scheme')
        key = key.replace('Plugin', 'Scheme')
        options.where[key] = value

        if (key === 'address' || key === 'dao') {
          const option = options.where[key] as string
          isAddress(option)
          options.where[key] = option.toLowerCase()
        }

        if (Array.isArray(options.where[key])) {
          // Support for operators like _in
          const values = options.where[key].map((val: number) => '"' + val + '"')
          where += `${key}: [${values.join(',')}]\n`
        } else {
          where += `${key}: "${options.where[key] as string}"\n`
        }
      }
      where += ' dao_not: null\n'

      const query = gql`
        query ReputationHolderSearch {
          reputationHolders ${createGraphQlQuery(options, where)} {
            ...ReputationHolderFields
          }
        }
        ${Member.fragments.ReputationHolderFields}
      `

      return context.getObservableList(context, query, itemMap, options.where?.id, apolloQueryOptions)
    }
  }

  public static itemMap(context: Arc, item: any, queriedId?: string): IMemberState {
    if (!item || item.id === undefined) {
      throw Error(`Member ItemMap failed. ${queriedId ? `Could not find Member with id '${queriedId}'` : ''}`)
    }

    return {
      id: item.id,
      address: item.address,
      createdAt: Number(item.createdAt),
      dao: {
        id: item.dao.id,
        entity: new DAO(context, item.dao.id)
      },
      contract: item.contract,
      reputation: BigNumber.from(item.balance)
    }
  }

  public static calculateId(opts: {
      contract: Address
      address: Address
    }): string {
    const seed = concat(
      hexStringToUint8Array(opts.contract.toLowerCase()),
      hexStringToUint8Array(opts.address.toLowerCase())
    )
    return utils.keccak256(seed)
  }

  public state(apolloQueryOptions: IApolloQueryOptions = {}): Observable<IMemberState> {
    let query: any

    if (this.id) {
      query = gql`query ReputionHolderStateFromId {
          reputationHolder (
              id: "${this.id}"
          ) {
            ...ReputationHolderFields
          }
        }
        ${Member.fragments.ReputationHolderFields}
      `
      return this.context.getObservableObject(
        this.context,
        query,
        (context: Arc, item: any, queryId?: string) => {
          if (!item || !item.id) {
            // we return a dummy object with 0 reputation
            if (this.coreState) {
              return {
                id: this.coreState.id,
                address: this.coreState.address,
                dao: this.coreState.dao,
                reputation: BigNumber.from(0)
              }
            } else {
              throw Error(`No member with id ${this.id} was found`)
            }
          }
          return Member.itemMap(context, item, queryId)
        },
        this.id,
        apolloQueryOptions
      )
    } else {
      const state = this.coreState as IMemberState

      if (!state.address || !state.dao) {
        throw Error('Cannot fetch state on a member. Members must either have an ID, or an address + DAO address.')
      }

      query = gql`query ReputationHolderStateFromDAOAndAddress {
          reputationHolders (
            where: {
              address: "${state.address}"
              dao: "${state.dao.id}"
            }
          ) {
            ...ReputationHolderFields
          }
        }

        ${Member.fragments.ReputationHolderFields}
      `
    }

    return this.context.getObservableObject(
      this.context,
      query,
      (arc: Arc, items: any, queriedId?: string) => {
        if (items.length === 0) {
          if (!this.coreState) {
            throw new Error('Member state is not set')
          }

          return {
            address: this.coreState.address,
            dao: this.coreState.dao,
            reputaion: BigNumber.from(0)
          }
        } else {
          return Member.itemMap(arc, items[0], queriedId)
        }
      },
      this.id,
      apolloQueryOptions
    ) as Observable<IMemberState>
  }

  public async dao(): Promise<DAO> {
    const state = await this.fetchState()
    return new DAO(this.context, state.dao.id as Address)
  }

  public rewards(): Observable<Reward[]> {
    throw new Error('not implemented')
  }

  public proposals(
    options: IProposalQueryOptions = {},
    apolloQueryOptions: IApolloQueryOptions = {}
  ): Observable<AnyProposal[]> {
    const observable = Observable.create(async (observer: Observer<AnyProposal[]>) => {
      const state = await this.fetchState()
      if (!options.where) {
        options.where = {}
      }
      options.where.proposer = state.address
      options.where.dao = state.dao.id
      const sub = Proposal.search(this.context, options, apolloQueryOptions).subscribe(observer)
      return () => sub.unsubscribe()
    })

    return toIOperationObservable(observable)
  }

  public stakes(
    options: IStakeQueryOptions = {},
    apolloQueryOptions: IApolloQueryOptions = {}
  ): Observable<Stake[]> {
    const observable = Observable.create(async (observer: Observer<Stake[]>) => {
      const state = await this.fetchState()
      if (!options.where) {
        options.where = {}
      }
      options.where.staker = state.address
      options.where.dao = state.dao.id
      const sub = Stake.search(this.context, options, apolloQueryOptions).subscribe(observer)
      return () => sub.unsubscribe()
    })

    return toIOperationObservable(observable)
  }

  public votes(
    options: IVoteQueryOptions = {},
    apolloQueryOptions: IApolloQueryOptions = {}
  ): Observable<Vote[]> {
    const observable = Observable.create(async (observer: Observer<Vote[]>) => {
      const state = await this.fetchState()
      if (!options.where) {
        options.where = {}
      }
      options.where.voter = state.address
      options.where.dao = state.dao.id
      const sub = Vote.search(this.context, options, apolloQueryOptions).subscribe(observer)
      return () => sub.unsubscribe()
    })

    return toIOperationObservable(observable)
  }

  public setState(opts: IMemberState) {
    isAddress(opts.address)

    if (opts.contract) {
      this.id = Member.calculateId({ contract: opts.contract, address: opts.address })
    }

    if (!opts.dao) {
      throw new Error('DAO not defined in options')
    }

    const daoId = opts.dao.id.toLowerCase()

    this.coreState = {
      id: this.id,
      address: opts.address.toLowerCase(),
      contract: opts.contract && opts.contract.toLowerCase(),
      dao: {
        id: daoId,
        entity: new DAO(this.context, daoId)
      },
      createdAt: opts.createdAt,
      reputation: opts.reputation
    }
    return this.coreState
  }
}
