import { Observable, Observer } from 'rxjs'
import { Logger } from './logger'

export enum TransactionState {
  Sent,
  Mined
}

/**
 * A transaction update is a snapshot of the state of a transaction at a particular time.
 */
export interface ITransactionUpdate<T> {
  state: TransactionState
  /**
   *  number of confirmations
   */
  transactionHash: string
  receipt?: object
  confirmations?: number
  /**
   * Parsed return value from the method call
   * or contract address in the case of contract creation tx.
   */
  result?: T
}

/**
 * An operation is a stream of transaction updates
 */
export type Operation<T> = Observable<ITransactionUpdate<T>>

type web3receipt = object

/**
 * send a transaction to the ethereumblockchain, and return a observable of ITransactionUpdatessend
 * @parameter transaction A web3 transaction, or an (async) function that returns a transaction
 * @parameter map A function that takes the receipt of the transaction and returns an object
 * @return An observable with ITransactionUpdate instnces
 */
export function sendTransaction<T>(
  transaction: any,
  map: (receipt: web3receipt) => T,
  errorHandler: (error: Error) => Promise<Error> | Error = (error) => error
): Operation<T> {
  const observable = Observable.create(async (observer: Observer<ITransactionUpdate<T>>) => {
    let transactionHash: string
    let result: any
    let tx
    if (typeof transaction === 'function') {
      tx = await transaction()
    }  else {
      tx = transaction
    }

    const emitter = tx.send()

    emitter
      .once('transactionHash', (hash: string) => {
        Logger.debug('Sending transaction..')
        transactionHash = hash
        observer.next({
          state: TransactionState.Sent,
          transactionHash
        })
      })
      .once('receipt', (receipt: any) => {
        Logger.debug(`transaction mined!`)
        try {
          result = map(receipt)
        } catch (err) {
          observer.error(err)
        }
        observer.next({
          confirmations: 0,
          receipt,
          result,
          state: TransactionState.Mined,
          transactionHash
        })
      })
      .on('confirmation', (confNumber: number, receipt: any) => {
        // result should have been set by previous call to 'receipt', but better be sure
        if (!result) {
          try {
            result = map(receipt)
          } catch (err) {
            observer.error(err)
          }
        }
        observer.next({
          confirmations: confNumber,
          receipt,
          result,
          state: TransactionState.Mined,
          transactionHash
        })
        if (confNumber > 23) {
          // the web3 observer will confirm up to 24 subscriptions, so we are done here
          observer.complete()
        }
      })
      .on('error', async (error: Error) => {
        observer.error(await errorHandler(error))
      })
    }
  )
  return observable
}
