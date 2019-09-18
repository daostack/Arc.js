import { Observable as ZenObservable } from 'apollo-link'
import * as WebSocket from 'isomorphic-ws'
import { Observable, Observer } from 'rxjs'
import { IContractInfo } from './arc'
import { Address, ICommonQueryOptions } from './types'
const Web3 = require('web3')
export const BN = require('bn.js')

export function fromWei(amount: typeof BN): string {
  return Web3.utils.fromWei(amount, 'ether')
}

export function toWei(amount: string | number): typeof BN {
  return Web3.utils.toWei(amount.toString(), 'ether')
}

export function checkWebsocket(options: { url: string }) {
  const ws = new WebSocket(options.url, {
    // origin: 'https://websocket.org'
  })

  ws.onopen = function open() {
    // console.log('connected')
    ws.send(Date.now())
  }

  ws.onclose = function close() {
    // console.log('disconnected')
  }

  ws.onmessage = function incoming(data: any) {
    // console.log(`Roundtrip time: ${Date.now() - data} ms`)
    setTimeout(function timeout() {
      ws.send(Date.now())
    }, 500)
  }
}

// function lifted and adapted from @daostack/subgraph/src/utils to generate unique ids
export function concat(a: Uint8Array, b: Uint8Array): Uint8Array {

  const out = new Uint8Array(a.length + b.length)
  for (let i = 0; i < a.length; i++) {
    out[i] = a[i]
  }
  for (let j = 0; j < b.length; j++) {
    out[a.length + j] = b[j]
  }
  // return out as ByteArray
  // return web3.utils.bytesToHex(out)
  return out
  // return web3.utils.keccak256(out)
}

type EthereumEvent = any

export function eventId(event: EthereumEvent): string {
  const hash = Web3.utils.keccak256(concat(event.transactionHash, event.logIndex as Uint8Array))
  return hash
}

export function isAddress(address: Address) {
  if (!address) {
    throw new Error(`Not a valid address: ${address}`)
  }
  if (!Web3.utils.isAddress(address)) {
    throw new Error(`Not a valid address: ${address}`)
  }
}

/**
 * convert a ZenObservable to an rxjs.Observable
 * @param  zenObservable [description]
 * @return an Observable instance
 */
export function zenToRxjsObservable(zenObservable: ZenObservable<any>) {
  return Observable.create((obs: Observer<any>) => {
    const subscription = zenObservable.subscribe(obs)
    return () => subscription.unsubscribe()
  })
}

// /**
//  * get the contract addresses by querying the "meta-url" of the subgraph deployment
//  * (in the default configuration, if the subgraph is at a url of the form:
//  *      http://some.thing/subgraphs/name/{subgraphName}/graphql
//  * then the "metaurl" is:
//  *      http://some.thing/subgraphs/graphql
//  * @param  graphqlHttpProvider a URL of the form http://some.thing/subgraphs/graphql
//  * @param  subgraphName        name of the subgraph
//  * @return                     an array with contract names as keys and addresses as values
//  */
// export async function getContractAddresses(graphqlHttpProvider: string, subgraphName: string) {
//
//   const query = gql`{
//     subgraphs (where: { name: "${subgraphName}"} ) {
//       id
//       name
//       currentVersion {
//         deployment {
//           manifest {
//             dataSources {
//               name
//               source {
//                 abi
//                 address
//               }
//             }
//           }
//         }
//       }
//     }
//   }`
//   const httpLink = new HttpLink({
//     credentials: 'same-origin',
//     fetch,
//     uri: graphqlHttpProvider
//   })
//
//   const client = new ApolloClient({
//     cache: new InMemoryCache(),
//     link: httpLink
//   })
//
//   let response: any
//   try {
//     response = await client.query({query}) as ApolloQueryResult<{ subgraphs: any[]}>
//   } catch (err) {
//     throw err
//   }
//   if (response.data.subgraphs.length === 0) {
//     throw Error(`Could not find a subgraph with this name: "${subgraphName}" -- does it exist?`)
//   }
//   const dataSources = response.data.subgraphs[0].currentVersion.deployment.manifest.dataSources
//   const result: IContractAddresses = {}
//   for (const record of dataSources) {
//     const name: string = record.name
//     const address = record.source.address
//     result[name] = address.toLowerCase()
//   }
//   return result
// }
/** convert the number representation of RealMath.sol representations to real real numbers
 * @param  t a BN instance of a real number in the RealMath representation
 * @return  a BN
 */
export function realMathToNumber(t: typeof BN): number {
  const REAL_FBITS = 40
  const fraction = t.maskn(REAL_FBITS).toNumber() / Math.pow(2, REAL_FBITS)
  return t.shrn(REAL_FBITS).toNumber() + fraction
}

export const NULL_ADDRESS = '0x0000000000000000000000000000000000000000'

export function getContractAddressesFromMigration(environment: 'private'|'rinkeby'|'mainnet'): IContractInfo[] {
  const migration = require('@daostack/migration/migration.json')[environment]
  const contracts: IContractInfo[] = []
  for (const version of Object.keys( migration.base)) {
    for (const name of Object.keys(migration.base[version])) {
      contracts.push({
        address: migration.base[version][name],
        id: migration.base[version][name],
        name,
        version
      })
    }

  }
  return contracts
}

/**
 * creates a string to be plugsging into a graphql query
 * @example
 * `{  proposals ${createGraphQlQuery({ skip: 2}, 'id: "2"')}
 *    { id }
 * }`
 * @param  options [description]
 * @param  where   [description]
 * @return         [description]
 */
export function createGraphQlQuery(options: ICommonQueryOptions, where: string = '') {
  let queryString = ``

  if (!where) {
    for (const key of Object.keys(options.where)) {
      where += `${key}: "${options.where[key]}"\n`
    }
  }
  if (where) {
    queryString += `where: {
      ${where}
    }`
  }
  if (options.first) {
    queryString += `first: ${options.first}\n`
  }
  if (options.skip) {
    queryString += `skip: ${options.skip}\n`
  }
  if (options.orderBy) {
    queryString += `orderBy: ${options.orderBy}\n`
  }
  if (options.orderDirection) {
    queryString += `orderDirection: ${options.orderDirection}\n`
  }
  if (queryString) {
    return `(${queryString})`
  } else {
    return ''
  }
}
