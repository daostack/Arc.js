import { BigNumber } from 'ethers'
import { IContractInfo, realMathToNumber } from '../src'
import { advanceTimeAndBlock, getContractAddressesFromMigration, newArc } from './utils'

/**
 * Token test
 */
describe('Utils', () => {

  it('realMathToNumber works', () => {

    expect(realMathToNumber(BigNumber.from('4727698744810')).toFixed(5))
      .toEqual(Math.pow(1.2, 8).toFixed(5))
  })

  it('getTestAddresses works', () => {
    let addresses: IContractInfo[]
    addresses = getContractAddressesFromMigration('private')
    expect(addresses.length).toBeGreaterThan(0)
    addresses = getContractAddressesFromMigration('rinkeby')
    expect(addresses.length).toBeGreaterThan(0)
    // TODO: uncomment once mainnet
    // addresses = getContractAddressesFromMigration('mainnet')
    // expect(addresses.length).toBeGreaterThan(0)
  })

  it('advanceTime works', async () => {
    const arc = await newArc()
    const web3 = arc.web3

    async function getBlockTime() {
      if(!web3) throw new Error("Web3 provider not set")

      const block = await web3.getBlock('latest')
      return block.timestamp
    }
    const blockTimeBefore  = await getBlockTime()
    const timeDelta = 900000
    await advanceTimeAndBlock(timeDelta)
    const blockTimeAfter  = await getBlockTime()
    // we expect the block times not to be perfectly alinged, but nearly so
    expect(Math.round((blockTimeAfter - blockTimeBefore) / 100)).toBeGreaterThanOrEqual(Math.round(timeDelta / 100))
  })

})
