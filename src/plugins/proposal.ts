import { BigNumber } from 'ethers'
import { utils } from 'ethers'
import { DocumentNode } from 'graphql'
import gql from 'graphql-tag'
import { from, Observable } from 'rxjs'
import { concatMap, first } from 'rxjs/operators'
import {
  Address,
  AnyPlugin,
  AnyProposal,
  Arc,
  concat,
  CONTRIBUTION_REWARD_DUMMY_VERSION,
  createGraphQlQuery,
  DAO,
  Entity,
  eventId,
  getEventAndArgs,
  hexStringToUint8Array,
  IApolloQueryOptions,
  ICommonQueryOptions,
  IEntityRef,
  IGenesisProtocolParams,
  IObservable,
  IQueueState,
  IRewardQueryOptions,
  isAddress,
  IStakeQueryOptions,
  ITransaction,
  ITransactionReceipt,
  IVoteQueryOptions,
  Logger,
  mapGenesisProtocolParams,
  NULL_ADDRESS,
  Operation,
  Plugin,
  Plugins,
  ProposalName,
  Proposals,
  Queue,
  realMathToNumber,
  REDEEMER_CONTRACT_VERSIONS,
  Reward,
  Stake,
  toIOperationObservable,
  Vote
} from '../index'

export enum IProposalOutcome {
  None,
  Pass,
  Fail
}

export enum IProposalStage {
  ExpiredInQueue,
  Executed,
  Queued,
  PreBoosted,
  Boosted,
  QuietEndingPeriod
}

export enum IExecutionState {
  None,
  QueueBarCrossed,
  QueueTimeOut,
  PreBoostedBarCrossed,
  BoostedTimeOut,
  BoostedBarCrossed
}

enum ProposalQuerySortOptions {
  resolvesAt = 'resolvesAt',
  preBoostedAt = 'preBoostedAt'
}

export interface IProposalQueryOptions extends ICommonQueryOptions {
  where?: {
    accountsWithUnclaimedRewards_contains?: Address[]
    active?: boolean
    boosted?: boolean
    dao?: Address
    expiresInQueueAt?: Date | number
    expiresInQueueAt_gte?: Date | number
    expiresInQueueAt_lte?: Date | number
    expiresInQueueAt_gt?: Date | number
    executedAfter?: Date | number
    executedBefore?: Date | number
    id?: string
    proposer?: Address
    proposalId?: string
    stage?: IProposalStage
    stage_in?: IProposalStage[]
    plugin?: Address
    orderBy?: ProposalQuerySortOptions
    type?: ProposalName
    [key: string]: any | undefined
  }
}

export interface IProposalBaseCreateOptions {
  dao: Address
  description?: string
  descriptionHash?: string
  title?: string
  tags?: string[]
  // Only required for plugins with more than one proposal type
  type?: ProposalName
  plugin?: Address
  url?: string
}

export interface IProposalState {
  id: string
  dao: IEntityRef<DAO>
  votingMachine: Address
  plugin: IEntityRef<AnyPlugin>
  closingAt: number
  createdAt: number | Date
  descriptionHash?: string
  description?: string
  name: ProposalName
  executedAt: number
  organizationId: string
  paramsHash: string
  // TODO: Stores proposal instance inside itself? Or is this another proposaltype?
  proposal: IEntityRef<AnyProposal>
  proposer: Address
  resolvedAt: number
  tags?: string[]
  title?: string
  totalRepWhenCreated: BigNumber
  totalRepWhenExecuted: BigNumber
  type: ProposalName
  url?: string
  votes: Array<IEntityRef<Vote>>
  votesFor: BigNumber
  votesAgainst: BigNumber
  votesCount: number
  voteOnBehalf: Address
  winningOutcome: IProposalOutcome

  // Genesis Protocol Proposal
  queue: IEntityRef<Queue>
  quietEndingPeriodBeganAt: number
  stage: IProposalStage
  accountsWithUnclaimedRewards: Address[]
  boostedAt: number
  upstakeNeededToPreBoost: BigNumber
  stakesFor: BigNumber
  stakesAgainst: BigNumber
  preBoostedAt: number
  genesisProtocolParams: IGenesisProtocolParams
  executionState: IExecutionState
  expiresInQueueAt: number
  downStakeNeededToQueue: BigNumber
  confidenceThreshold: number
}

export abstract class Proposal<TProposalState extends IProposalState> extends Entity<TProposalState> {
  public static get baseFragment(): DocumentNode {
    if (!this.baseFragmentField) {
      this.baseFragmentField = gql`fragment ProposalFields on Proposal {
        id
        accountsWithUnclaimedRewards
        boostedAt
        closingAt
        confidenceThreshold
        createdAt
        dao {
          id
          schemes {
            id
            address
          }
        }
        description
        descriptionHash
        executedAt
        executionState
        expiresInQueueAt
        genesisProtocolParams {
          id
          activationTime
          boostedVotePeriodLimit
          daoBountyConst
          limitExponentValue
          minimumDaoBounty
          preBoostedVotePeriodLimit
          proposingRepReward
          queuedVotePeriodLimit
          queuedVoteRequiredPercentage
          quietEndingPeriod
          thresholdConst
          votersReputationLossRatio
        }
        gpRewards {
          id
        }
        scheme {
          ...PluginFields
        }
        gpQueue {
          id
          threshold
          votingMachine
        }
        organizationId
        preBoostedAt
        proposer
        quietEndingPeriodBeganAt

        stage
        # stakes { id }
        stakesFor
        stakesAgainst
        tags {
          id
        }
        totalRepWhenCreated
        totalRepWhenExecuted
        title
        url
        votes { id }
        votesAgainst
        votesFor
        votingMachine
        winningOutcome
        ${Object.values(Proposals)
          .filter((proposal) => proposal.fragment)
          .map((proposal) => '...' + proposal.fragment?.name)
          .join('\n')}
      }
      ${Object.values(Proposals)
          .filter((proposal) => proposal.fragment)
          .map((proposal) => proposal.fragment?.fragment.loc?.source.body)
          .join('\n')}

      ${Plugin.baseFragment}
`
    }

    return this.baseFragmentField
  }

  public static fragment: {
    name: string
    fragment: DocumentNode
  } | undefined

  public static search<TProposalState extends IProposalState>(
    context: Arc,
    options: IProposalQueryOptions = {},
    apolloQueryOptions: IApolloQueryOptions = {}
  ): Observable<Array<Proposal<TProposalState>>> {
    let where = ''

    if (!options.where) {
      options.where = {}
    }

    for (let key of Object.keys(options.where)) {
      // TODO: remove once this issue is closed https://github.com/daostack/subgraph/issues/537
      const value = options.where[key]
      key = key.replace('plugin', 'scheme')
      key = key.replace('Plugin', 'Scheme')
      options.where[key] = value

      if (key === 'stage' && value !== undefined) {
        where += `stage: "${IProposalStage[value as IProposalStage]}"\n`
      } else if (key === 'stage_in' && Array.isArray(value)) {
        const stageValues = value.map(
          (stage: number) => '"' + IProposalStage[stage as IProposalStage] + '"'
        )
        where += `stage_in: [${stageValues.join(',')}]\n`
      } else if (key === 'type') {
        // TODO: we are not distinguishing between the schemeregisterpropose
        // and SchemeRegistrarProposeToRemove proposals
        if (value.toString().includes('SchemeRegistrar')) {
          where += `schemeRegistrar_not: null\n`
        } else {
          if (Proposals[value] === undefined) {
            throw Error(`Unknown value for "type" in proposals query: ${value}`)
          }
          const apolloKey = value[0].toLowerCase() + value.slice(1)
          where += `${apolloKey}_not: null\n`
        }
      } else if (Array.isArray(options.where[key])) {
        // Support for operators like _in
        const values = options.where[key].map((val: number) => '"' + val + '"')
        where += `${key}: [${values.join(',')}]\n`
      } else {
        if (key === 'proposer' || key === 'beneficiary' || key === 'dao') {
          const option = options.where[key] as string
          isAddress(option)
          where += `${key}: "${option.toLowerCase()}"\n`
        } else {
          where += `${key}: "${options.where[key]}"\n`
        }
      }
    }

    const query = gql`query ProposalsSearchAllData
      {
        proposals ${createGraphQlQuery(options, where)} {
          ...ProposalFields
          votes {
            id
          }
          stakes {
            id
          }
        }
      }
      ${Proposal.baseFragment}
    `

    return context.getObservableList(
      context,
      query,
      Proposal.deduceTypeAndCreate,
      options.where?.id,
      apolloQueryOptions
    ) as IObservable<
      Array<Proposal<TProposalState>>
    >
  }

  public static async create(context: Arc, id: string): Promise<AnyProposal> {
    const query = gql`query ProposalState
    {
      proposal(id: "${id}") {
        ...ProposalFields
        votes {
          id
        }
        stakes {
          id
        }
      }
    }
    ${Proposal.baseFragment}
    ${Plugin.baseFragment}
  `

    const observable = context.getObservableObject(
      context,
      query,
      Proposal.deduceTypeAndCreate,
      id,
      {}
    ) as Observable<AnyProposal | null>

    const result = await observable.pipe(first()).toPromise()

    if (!result) {
      throw new Error(`Proposal with id '${id}' does not exist or is not indexed`)
    }

    return result
  }

  public static calculateId(address: Address, proposalCount: number) {
    const seed = concat(
      hexStringToUint8Array(address.toLowerCase()),
      hexStringToUint8Array(proposalCount.toString())
    )
    return utils.keccak256(seed)
  }

  protected static itemMapToBaseState<TPlugin extends AnyPlugin, TProposal extends AnyProposal>(
    context: Arc,
    item: any,
    plugin: TPlugin,
    proposal: TProposal,
    type: ProposalName
  ): IProposalState | null {
    if (!item) {
      // no proposal was found - we return null
      // throw Error(`No proposal with id ${this.id} could be found`)
      return null
    }

    let name = item.scheme.name
    if (!name) {
      try {
        name = context.getContractInfo(item.scheme.address).name
      } catch (err) {
        if (err.message.match(/no contract/gi)) {
          // continue
        } else {
          throw err
        }
      }
    }

    // the  formule to enter into the preboosted state is:
    // (S+/S-) > AlphaConstant^NumberOfBoostedProposal.
    // (stakesFor/stakesAgainst) > gpQueue.threshold
    const stage: any = IProposalStage[item.stage]
    const threshold = realMathToNumber(BigNumber.from(item.gpQueue.threshold))
    const stakesFor = BigNumber.from(item.stakesFor)
    const stakesAgainst = BigNumber.from(item.stakesAgainst)
    /**
     * for doing multiplication between floating point (threshold) and BigNumber numbers
     */
    const PRECISION = Math.pow(2, 40)
    /**
     * The number of up-staking tokens (usually GEN) needed to qualify a queued proposal to move into the
     * pre-boosted queue.
     *
     * Only computed for queued proposals.
     *
     * The equation is derived from: threshold = (stakesFor + upstakeNeededToPreBoost) / stakesAgainst
     *
     * Where `upstakeNeededToPreBoost` is:
     *
     * >= 0 : then any number of up-staking tokens greater than upstakeNeededToPreBoost will qualify
     *        to move the proposal to the preboost queue
     * <  0 : then the proposal ought already to be pre-boosted
     */
    let upstakeNeededToPreBoost: BigNumber = BigNumber.from(0)
    if (stage === IProposalStage.Queued) {
      upstakeNeededToPreBoost = BigNumber.from(threshold * PRECISION)
        .mul(stakesAgainst)
        .div(BigNumber.from(PRECISION))
        .sub(stakesFor)
    }
    /**
     * The number of down-staking tokens (usually GEN) needed to qualify a pre-boosted proposal to move back
     * to the Queued queue.
     * Only computed for PreBoosted proposals.
     *
     * The equation is derived from: threshold = stakesFor / (stakesAgainst + downStakeNeededToQueue)
     *
     * When `downStakeNeededToQueue` is:
     *
     * >  0 : then any number of down-staking tokens greater-than-or-equal to downStakeNeededToQueue will qualify
     *        to move the proposal to the Queued queue
     * <= 0 : then the proposal ought to already be in the Queued queue
     */
    let downStakeNeededToQueue: BigNumber = BigNumber.from(0)
    if (stage === IProposalStage.PreBoosted) {
      downStakeNeededToQueue = stakesFor
        .mul(BigNumber.from(PRECISION))
        .div(BigNumber.from(threshold * PRECISION))
        .sub(stakesAgainst)
    }

    const gpQueue = item.gpQueue

    const dao = new DAO(context, item.dao.id)

    const queueState: IQueueState = {
      dao: {
        id: dao.id,
        entity: dao
      },
      id: gpQueue.id,
      name,
      plugin: {
        id: plugin.id,
        entity: plugin
      },
      threshold,
      votingMachine: gpQueue.votingMachine
    }

    return {
      accountsWithUnclaimedRewards: item.accountsWithUnclaimedRewards,
      boostedAt: Number(item.boostedAt),
      closingAt: Number(item.closingAt),
      confidenceThreshold: Number(item.confidenceThreshold),
      createdAt: Number(item.createdAt),
      dao: {
        id: dao.id,
        entity: dao
      },
      description: item.description,
      descriptionHash: item.descriptionHash,
      downStakeNeededToQueue,
      executedAt: Number(item.executedAt),
      executionState: IExecutionState[item.executionState] as any,
      expiresInQueueAt: Number(item.expiresInQueueAt),
      genesisProtocolParams: mapGenesisProtocolParams(item.genesisProtocolParams),
      id: item.id,
      name,
      organizationId: item.organizationId,
      paramsHash: item.paramsHash,
      preBoostedAt: Number(item.preBoostedAt),
      proposal: {
        id: proposal.id,
        entity: proposal
      },
      proposer: item.proposer,
      queue: {
        id: queueState.id,
        entity: new Queue(context, queueState, dao)
      },
      quietEndingPeriodBeganAt: Number(item.quietEndingPeriodBeganAt),
      resolvedAt: item.resolvedAt !== undefined ? Number(item.resolvedAt) : 0,
      plugin: {
        id: plugin.id,
        entity: plugin
      },
      stage,
      stakesAgainst,
      stakesFor,
      tags: item.tags.map((t: any) => t.id),
      title: item.title,
      totalRepWhenCreated: BigNumber.from(item.totalRepWhenCreated),
      totalRepWhenExecuted: BigNumber.from(item.totalRepWhenExecuted),
      type,
      upstakeNeededToPreBoost,
      url: item.url,
      votes: item.votes.map((vote: any) => {
        return {
          id: vote.id,
          entity: new Vote(context, vote.id)
        }
      }),
      voteOnBehalf: item.voteOnBehalf,
      votesAgainst: BigNumber.from(item.votesAgainst),
      votesCount: item.votes.length,
      votesFor: BigNumber.from(item.votesFor),
      votingMachine: item.votingMachine,
      winningOutcome: IProposalOutcome[item.winningOutcome] as any
    }
  }
  private static baseFragmentField: DocumentNode | undefined

  private static deduceTypeAndCreate(context: Arc, item: any, queriedId?: string): AnyProposal | null {
    if (!Object.keys(Plugins).includes(item.scheme.name)) {
      Logger.debug(
        `Proposal's Plugin name '${item.scheme.name}' not supported. Instantiating it as Unknown Proposal.`
      )

      const proposalState = Proposals.Unknown.itemMap(context, item, queriedId)
      if (!proposalState) {
        return null
      }

      return new Proposals.Unknown(context, proposalState)
    }

    if (item.scheme.name === 'ContributionRewardExt') {
      if (item.competition) {
        item.scheme.name = 'Competition'
      }
    }

    const state: IProposalState = Proposals[item.scheme.name].itemMap(context, item, queriedId)

    if (!state) {
      return null
    }

    return new Proposals[item.scheme.name](context, state)
  }

  public abstract state(apolloQueryOptions: IApolloQueryOptions): Observable<TProposalState>

  public async votingMachine() {
    const state = await this.fetchState()
    return this.context.getContract(state.votingMachine)
  }

  public stakingToken() {
    return this.context.GENToken()
  }

  public stake(outcome: IProposalOutcome, amount: BigNumber): Operation<Stake> {
    const mapReceipt = (receipt: ITransactionReceipt) => {
      const [event, args] = getEventAndArgs(receipt, 'Stake', 'Proposal.stake')

      return new Stake(this.context, {
        id: eventId(event),
        amount: args[3], // _amount
        // createdAt is "about now", but we cannot calculate the data that will be indexed by the subgraph
        createdAt: undefined,
        outcome,
        proposal: {
          id: this.id,
          entity: this
        },
        staker: args[2] // _staker
      })
    }

    const errorHandler = async (error: Error) => {
      const proposal = this
      const votingMachine = await this.votingMachine()
      const proposalState = await votingMachine.proposals(proposal.id)
      const stakingToken = this.stakingToken()
      if (proposalState.proposer === NULL_ADDRESS) {
        return new Error(`Unknown proposal with id ${proposal.id}`)
      }
      // staker has sufficient balance
      const defaultAccount = await this.context.getAccount().pipe(first()).toPromise()
      const balance = BigNumber.from(await stakingToken.contract().balanceOf(defaultAccount).toString())
      const amountBN = BigNumber.from(amount)
      if (balance.lt(amountBN)) {
        const msg = `Staker ${defaultAccount} has insufficient balance to stake ${amount.toString()}
          (balance is ${balance.toString()})`
        return new Error(msg)
      }

      // staker has approved the token spend
      const allowance = BigNumber.from(
        await stakingToken.contract().allowance(defaultAccount, votingMachine.address)
      )
      if (allowance.lt(amountBN)) {
        return new Error(
          `Staker has insufficient allowance to stake ${amount.toString()}
            (allowance for ${votingMachine.address} is ${allowance.toString()})`
        )
      }

      if (!!error.message.match(/event was found/)) {
        if (proposalState.state === IProposalStage.Boosted) {
          return new Error(`Staking failed because the proposal is boosted`)
        }
      }

      // if we have found no known error, we return the original error
      return error
    }

    const createTransaction = async (): Promise<ITransaction> => ({
      contract: await this.votingMachine(),
      method: 'stake(bytes32,uint256,uint256)',
      args: [
        this.id, // proposalId
        outcome, // a value between 0 to and the proposal number of choices.
        amount.toString() // the amount of tokens to stake
      ]
    })

    const observable = from(createTransaction()).pipe(
      concatMap((transaction) => {
        return this.context.sendTransaction(transaction, mapReceipt, errorHandler)
      })
    )

    return toIOperationObservable(observable)
  }

  public votes(
    options: IVoteQueryOptions = {},
    apolloQueryOptions: IApolloQueryOptions = {}
  ): Observable<Vote[]> {
    if (!options.where) {
      options.where = {}
    }
    options.where.proposal = this.id
    return Vote.search(this.context, options, apolloQueryOptions)
  }

  public stakes(
    options: IStakeQueryOptions = {},
    apolloQueryOptions: IApolloQueryOptions = {}
  ): Observable<Stake[]> {
    if (!options.where) {
      options.where = {}
    }
    options.where.proposal = this.id
    return Stake.search(this.context, options, apolloQueryOptions)
  }

  public rewards(
    options: IRewardQueryOptions = {},
    apolloQueryOptions: IApolloQueryOptions = {}
  ): Observable<Reward[]> {
    if (!options.where) {
      options.where = {}
    }
    options.where.proposal = this.id
    return Reward.search(this.context, options, apolloQueryOptions)
  }

  public execute(): Operation<undefined> {
    const mapReceipt = (receipt: ITransactionReceipt) => undefined

    const errorHandler = async (err: Error) => {
      const votingMachine = await this.votingMachine()
      const proposalDataFromVotingMachine = await votingMachine.proposals(this.id)

      if (proposalDataFromVotingMachine.callbacks === NULL_ADDRESS) {
        const msg = `Error in proposal.execute(): A proposal with id ${this.id} does not exist`
        return Error(msg)
      } else if (proposalDataFromVotingMachine.state === '2') {
        const msg = `Error in proposal.execute(): proposal ${this.id} already executed`
        return Error(msg)
      }

      return err
    }

    const createTransaction = async (): Promise<ITransaction> => ({
      contract: await this.votingMachine(),
      method: 'execute(bytes32)',
      args: [this.id]
    })

    const observable = from(createTransaction()).pipe(
      concatMap((transaction) => {
        return this.context.sendTransaction(transaction, mapReceipt, errorHandler)
      })
    )

    return toIOperationObservable(observable)
  }

  public vote(outcome: IProposalOutcome, amount: number = 0): Operation<Vote | null> {
    const mapReceipt = (receipt: ITransactionReceipt) => {
      try {
        const [event, args] = getEventAndArgs(receipt, 'VoteProposal', 'Proposal.vote')
        return new Vote(this.context, {
          id: eventId(event),
          amount: args[3], // _reputation
          // createdAt is "about now", but we cannot calculate the data that will be indexed by the subgraph
          createdAt: 0,
          outcome,
          proposal: {
            id: this.id,
            entity: this
          },
          voter: args[2] // _vote
        })
      } catch (e) {
        // no vote was cast
        return null
      }
    }

    const errorHandler = async (error: Error) => {
      const proposal = this
      const votingMachine = await this.votingMachine()
      const proposalDataFromVotingMachine = await votingMachine.proposals(proposal.id)

      if (proposalDataFromVotingMachine.proposer === NULL_ADDRESS) {
        return Error(`Error in vote(): unknown proposal with id ${proposal.id}`)
      }

      if (proposalDataFromVotingMachine.state === '2') {
        const msg = `Error in vote(): proposal ${proposal.id} already executed`
        return Error(msg)
      }

      // if everything seems fine, just return the original error
      return error
    }

    const createTransaction = async (): Promise<ITransaction> => ({
      contract: await this.votingMachine(),
      method: 'vote(bytes32,uint256,uint256,address)',
      args: [
        this.id, // proposalId
        outcome, // a value between 0 to and the proposal number of choices.
        amount.toString(), // amount of reputation to vote with . if _amount == 0 it will use all voter reputation.
        NULL_ADDRESS
      ]
    })

    const observable = from(createTransaction()).pipe(
      concatMap((transaction) => {
        return this.context.sendTransaction(transaction, mapReceipt, errorHandler)
      })
    )

    return toIOperationObservable(observable)
  }

  public redeemerContract() {
    for (const version of REDEEMER_CONTRACT_VERSIONS) {
      try {
        const contractInfo = this.context.getContractInfoByName('Redeemer', version)
        return this.context.getContract(contractInfo.address)
      } catch (err) {
        if (!err.message.match(/no contract/i)) {
          // if the contract cannot be found, try the next one
          throw err
        }
      }
    }
    throw Error(
      `No Redeemer contract could be found (search for versions ${REDEEMER_CONTRACT_VERSIONS})`
    )
  }

  public redeemRewards(beneficiary?: Address): Operation<boolean> {
    const mapReceipt = (receipt: ITransactionReceipt) => true

    const createTransaction = async (): Promise<ITransaction> => {
      if (!beneficiary) {
        beneficiary = NULL_ADDRESS
      }

      const state = await this.fetchState()
      let pluginAddress
      if (state.name === 'ContributionReward' || state.name === 'ContributionRewardExt') {
        const pluginState = await state.plugin.entity.fetchState()
        pluginAddress = pluginState.address
      } else {
        pluginAddress = this.context.getContractInfoByName(
          'ContributionReward',
          CONTRIBUTION_REWARD_DUMMY_VERSION
        ).address
      }
      let method
      if (state.name === 'ContributionRewardExt' || state.name === 'Competition') {
        method = 'redeemFromCRExt'
      } else {
        method = 'redeem'
      }
      const args = [pluginAddress, state.votingMachine, this.id, beneficiary]
      return {
        contract: this.redeemerContract(),
        method,
        args
      }
    }

    const observable = from(createTransaction()).pipe(
      concatMap((transaction) => {
        return this.context.sendTransaction(transaction, mapReceipt)
      })
    )

    return toIOperationObservable(observable)
  }
}
