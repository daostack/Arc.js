import gql from 'graphql-tag'
import { Observable, Observer, of, Subscription } from 'rxjs'
import { first, map } from 'rxjs/operators'
import { DAO, IDAOQueryOptions } from './dao'
import { GraphNodeObserver } from './graphnode'
import { Logger } from './logger'
import { Operation, sendTransaction, web3receipt } from './operation'
import { IProposalQueryOptions, Proposal } from './proposal'
import { ISchemeQueryOptions, Scheme } from './scheme'
import { Token } from './token'
import { Address, IPFSProvider, Web3Provider } from './types'
import { BN } from './utils'
import { isAddress } from './utils'
const IPFSClient = require('ipfs-http-client')
const Web3 = require('web3')

/**
 * The Arc class holds all configuration.
 * Any useage of the library typically will start with instantiating a new Arc instance
 * @return an instance of Arc
 */
export class Arc extends GraphNodeObserver {
  public web3Provider: Web3Provider = ''
  public ipfsProvider: IPFSProvider

  public pendingOperations: Observable<Array<Operation<any>>> = of()

  public ipfs: any
  public web3: any
  /**
   * a mapping of contrct names to contract addresses
   */
  public contractAddresses: IContractInfo[]
  public contracts: {[key: string]: any} = {}

  // accounts obseved by ethBalance
  public blockHeaderSubscription: Subscription|undefined = undefined
  public observedAccounts: { [address: string]: {
      observable?: Observable<typeof BN>
      observer?: Observer<typeof BN>
      lastBalance?: number
      subscriptionsCount: number
    }
  } = {}

  constructor(options: {
    contractAddresses?: IContractInfo[]
    graphqlHttpProvider?: string
    graphqlWsProvider?: string
    ipfsProvider: IPFSProvider
    web3Provider: string
}) {
    super({
      graphqlHttpProvider: options.graphqlHttpProvider,
      graphqlWsProvider: options.graphqlWsProvider
    })
    this.ipfsProvider = options.ipfsProvider

    if (options.web3Provider) {
      this.web3 = new Web3(options.web3Provider)
    }

    this.contractAddresses = options.contractAddresses || []
    if (!this.contractAddresses) {
      Logger.warn('No contract addresses given to the Arc.constructor: expect most write operations to fail!')
    }

    if (this.ipfsProvider) {
      this.ipfs = IPFSClient(this.ipfsProvider)
    }
  }

  public async initialize(): Promise<boolean> {
    this.contractAddresses = await this.getContractAddresses()
    return true
  }
  public async getContractAddresses(): Promise<IContractInfo[]> {
    const query = gql`{
      contractInfos {
        id
        name
        version
        address
      }
    }`
    const itemMap = (record: any): IContractInfo => {
      return record
    }
    const result = await this.getObservableList(query, itemMap).pipe(first()).toPromise()
    return result
  }

  /**
   * get a DAO instance from an address
   * @param  address address of the dao Avatar
   * @return an instance of a DAO
   */
  public dao(address: Address): DAO {
    isAddress(address)
    return new DAO(address, this)
  }

  /**
   * return an observable of the list of DAOs
   * @param options options to pass on to the query
   * @return [description]
   */
  public daos(options: IDAOQueryOptions = {}): Observable<DAO[]> {
    return DAO.search(this, options)
  }

  public async scheme(id: string): Promise<Scheme> {
    const schemes = await Scheme.search(this, {where: { id }}).pipe(first()).toPromise()
    if (schemes.length === 0) {
      throw Error(`No scheme with id ${id} is known`)
    }
    return schemes[0]
  }

  public schemes(options: ISchemeQueryOptions = {}): Observable<Scheme[]> {
    return Scheme.search(this, options)
  }

  public async proposal(id: string): Promise<Proposal> {
    const proposals = await Proposal.search(this, { where: {id }}).pipe(first()).toPromise()
    if (proposals.length === 0) {
      throw Error(`No proposal with id ${id} was found`)
    }
    return proposals[0]
  }

  public proposals(options: IProposalQueryOptions = {}): Observable<Proposal[]> {
    return Proposal.search(this, options)
  }

  public ethBalance(owner: Address): Observable<typeof BN> {
    if (!this.observedAccounts[owner]) {
      this.observedAccounts[owner] = {
        subscriptionsCount: 1
       }
    }
    if (this.observedAccounts[owner].observable) {
        this.observedAccounts[owner].subscriptionsCount += 1
        return this.observedAccounts[owner].observable as Observable<typeof BN>
    }

    const observable = Observable.create((observer: Observer<typeof BN>) => {
      this.observedAccounts[owner].observer = observer

      // get the current balance and return it
      this.web3.eth.getBalance(owner).then((currentBalance: number) => {
        const accInfo = this.observedAccounts[owner];
        (accInfo.observer as Observer<typeof BN>).next(new BN(currentBalance))
        accInfo.lastBalance = currentBalance
      })

      // set up the blockheadersubscription if it does not exist yet
      if (!this.blockHeaderSubscription) {
        this.blockHeaderSubscription = this.web3.eth.subscribe('newBlockHeaders', (err: Error) => {
          Object.keys(this.observedAccounts).forEach((addr) => {
            const accInfo = this.observedAccounts[addr]
            if (err) {
              (accInfo.observer as Observer<typeof BN>).error(err)
            } else {
              this.web3.eth.getBalance(addr).then((balance: any) => {
                if (balance !== accInfo.lastBalance) {
                  (accInfo.observer as Observer<typeof BN>).next(new BN(balance))
                  accInfo.lastBalance = balance
                }
              })
            }
          })
        })
      }
      // unsubscribe
      return( ) => {
        this.observedAccounts[owner].subscriptionsCount -= 1
        if (this.observedAccounts[owner].subscriptionsCount <= 0) {
          delete this.observedAccounts[owner]
        }
        if (Object.keys(this.observedAccounts).length === 0 && this.blockHeaderSubscription) {
          this.blockHeaderSubscription.unsubscribe()
          this.blockHeaderSubscription = undefined
        }
      }
    })

    this.observedAccounts[owner].observable = observable
    return observable
      .pipe(map((item: any) => new BN(item)))
  }

  /**
   * return information about the contract
   * @param  address [description]
   * @return      an IContractInfo instance
   */
  public getContractInfo(address: Address) {
    isAddress(address)
    for (const contractInfo of this.contractAddresses) {
      if (contractInfo.address.toLowerCase() === address.toLowerCase()) {
        return contractInfo
      }
    }
    if (!this.contractAddresses) {
      throw Error(`no contract info was found - did you call "arc.initialize()"?`)
    }
    throw Error(`No contract with address ${address} is known`)
  }

  public getContractInfoByName(name: string, version: string) {
    for (const contractInfo of this.contractAddresses) {
        if (contractInfo.name === name && contractInfo.version === version) {
          return contractInfo
        }
      }
    if (!this.contractAddresses) {
      throw Error(`no contract info was found - did you call "arc.initialize()"?`)
    }
    throw Error(`No contract with name ${name}  and version ${version} is known`)
  }

  public getABI(address: Address, abiName?: string, version?: string) {
    if (!abiName || !version) {
      const contractInfo = this.getContractInfo(address)
      abiName = contractInfo.name
      version = contractInfo.version
      if (abiName === 'GEN') {
        abiName = 'ERC827'
      }
    }

    const abi = require(`@daostack/migration/abis/${version}/${abiName}.json`)
    return abi
  }

  /**
   * return a web3 Contract instance.
   * @param  address address of the contract to look up in self.contractAddresses
   * @param  [abiName] (optional) name of the ABI (i.e. 'Avatar' or 'SchemeRegistrar').
   * @param  [version] (optional) Arc version of contract (https://www.npmjs.com/package/@daostack/arc)
   * @return   a web3 contract instance
   */
  public getContract(address: Address, abi?: any) {
    // we use a contract "cache" because web3 contract instances add an event listener
    if (this.contracts[address]) {
      return this.contracts[address]
    } else {
      if (!abi) {
        abi = this.getABI(address)
      }
      const contract = new this.web3.eth.Contract(abi, address)
      this.contracts[address] = contract
      return contract
    }
  }

  /**
   * get the GEN Token
   * @return a Token instance
   */
  public GENToken() {
    if (this.contractAddresses) {
      // TODO: remove this reference to LATEST_ARC_VERSION
      // (it's aworkaround for https://github.com/daostack/subgraph/issues/257)
      const LATEST_ARC_VERSION = '0.0.1-rc.19'
      if (this.contractAddresses) {
        for (const contractInfo of this.contractAddresses) {
          if (contractInfo.name === 'GEN' && contractInfo.version === LATEST_ARC_VERSION) {
            return new Token(contractInfo.address, this)
          }
        }
      }

      for (const contractInfo of this.contractAddresses) {
        if (contractInfo.name === 'GEN') {
          return new Token(contractInfo.address, this)
        }
      }
      throw Error(`Cannot find address of GEN Token`)
    } else {
      throw Error(`No contract addresses known - did you run arc.initialize()?`)
    }
  }

  public getAccount(): Observable<Address> {
    // this complex logic is to get the correct account both from the Web3 as well as from the Metamaask provider
    // This polls for changes. But polling is Evil!
    // cf. https://github.com/MetaMask/faq/blob/master/DEVELOPERS.md#ear-listening-for-selected-account-changes
    return Observable.create((observer: any) => {
      const interval = 1000 /// poll once a second
      let account: any
      let prevAccount: any
      const web3 = this.web3
      if (web3.eth.accounts[0]) {
        observer.next(web3.eth.accounts[0].address)
        prevAccount = web3.eth.accounts[0].address
      } else if (web3.eth.defaultAccount ) {
        observer.next(web3.eth.defaultAccount)
        prevAccount = web3.eth.defaultAccount
      }
      const timeout = setInterval(() => {
        web3.eth.getAccounts().then((accounts: any) => {
          if (accounts) {
            account = accounts[0]
          } else if (web3.eth.accounts) {
            account = web3.eth.accounts[0].address
          }
          if (prevAccount !== account && account) {
            web3.eth.defaultAccount = account
            observer.next(account)
            prevAccount = account
          }
        })
      }, interval)
      return() => clearTimeout(timeout)
    })
  }

  public setAccount(address: Address) {
    this.web3.eth.defaultAccount = address
  }

  public approveForStaking(spender: Address, amount: typeof BN) {
    return this.GENToken().approveForStaking(spender, amount)
  }

  /**
   * How much GEN spender may spend on behalve of the owner
   * @param  owner Address of the owner of the tokens
   * @param  spender Address of the spender
   * @return
   */
  public allowance(owner: Address, spender: Address): Observable<typeof BN> {
    return this.GENToken().allowance(owner, spender)
  }

  /**
   * send an Ethereum transaction
   * @param  transaction  [description]
   * @param  mapToObject  [description]
   * @param  errorHandler [description]
   * @return  An observable of
   */
  public sendTransaction<T>(
    transaction: any,
    mapToObject: (receipt: web3receipt) => T,
    errorHandler: (error: Error) => Promise<Error> | Error = (error) => error
  ): Operation<T> {
    return sendTransaction(transaction, mapToObject, errorHandler, this)
  }

  /**
   * save data of a proposal to IPFS, return  the IPFS hash
   * @param  options an Object to save. This object must have title, url and desction defined
   * @return  a Promise that resolves in the IPFS Hash where the file is saved
   */
  public async saveIPFSData(options: { title: string, url: string, description: string}): Promise<string> {
    let ipfsDataToSave: object = {}
    if (options.title || options.url || options.description) {
      if (!this.ipfsProvider) {
        throw Error(`No ipfsProvider set on Arc instance - cannot save data on IPFS`)
      }
      ipfsDataToSave = {
        description: options.description,
        title: options.title,
        url: options.url
      }
    }
    Logger.debug('Saving data on IPFS...')
    let descriptionHash: string = ''
    try {
      const ipfsResponse = await this.ipfs.add(Buffer.from(JSON.stringify(ipfsDataToSave)))
      descriptionHash = ipfsResponse[0].path
      // pin the file
      await this.ipfs.pin.add(descriptionHash)
    } catch (error) {
      throw error
    }
    Logger.debug(`Data saved successfully as ${descriptionHash}`)
    return descriptionHash
  }
}

export interface IApolloQueryOptions {
  fetchPolicy?: 'cache-first' | 'cache-and-network' | 'network-only' | 'cache-only' | 'no-cache' | 'standby'
}

export interface IContractAddresses {
  [key: string]: Address
}

export interface IContractInfo {
  id: string
  version: string
  address: Address
  name: string
}
