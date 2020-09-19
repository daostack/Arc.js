import { from } from 'rxjs'
import { concatMap } from 'rxjs/operators'
import {
  Address,
  Arc,
  IPluginState,
  ITransaction,
  Logger,
  Operation,
  Plugin,
  toIOperationObservable
} from '../../index'

export interface IInitParamsRT {
  daoId: string
  tokenContract: string
  curveInterface: string
}

export class ReputationFromTokenPlugin extends Plugin<IPluginState> {

  public static initializeParamsMap(initParams: IInitParamsRT) {

    Object.keys(initParams).forEach((key) => {
      if (initParams[key] === undefined) {
        throw new Error(`ContributionReward's initialize parameter '${key}' cannot be undefined`)
      }
    })

    return [
      initParams.daoId,
      initParams.tokenContract,
      initParams.curveInterface
    ]
  }

  public static itemMap(context: Arc, item: any, queriedId?: string): IPluginState | null {
    if (!item) {
      Logger.debug(`ReputationFromTokenPlugin ItemMap failed. ${queriedId ? `Could not find ReputationFromTokenPlugin with id '${queriedId}'` : ''}`)
      return null
    }

    if (item.name !== 'ReputationFromToken') {
      throw new Error(`Plugin ${queriedId ? `with id '${queriedId}'` : ''}wrongly instantiated as ReputationFromToken Plugin`)
    }

    return Plugin.itemMapToBaseState(context, item)
  }

  public async getAgreementHash(): Promise<string> {
    const contract = await this.getContract()
    const result = await contract.getAgreementHash()
    return result
  }

  public redeem(beneficiary: Address, agreementHash?: string): Operation<undefined> {
    const createTransaction = async (): Promise<ITransaction> => {
      return {
        contract: await this.getContract(),
        method: 'redeem(bytes32,bool[4])',
        args: [beneficiary]
      }
    }

    const observable = from(createTransaction()).pipe(
      concatMap((transaction) => {
        return this.context.sendTransaction(transaction)
      })
    )

    return toIOperationObservable(observable)
  }

  public async getContract() {
    const state = await this.fetchState()
    const contract = this.context.getContract(state.address)
    return contract
  }
}
