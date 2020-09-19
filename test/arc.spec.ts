import { BigNumber, ethers } from 'ethers'
import { Wallet } from 'ethers'
import { providers } from 'ethers'
import gql from 'graphql-tag'
import { first } from 'rxjs/operators'
import {
  Address,
  Arc,
  Plugin,
  REDEEMER_CONTRACT_VERSIONS,
  Token
} from '../src/index'
import {
  fromWei,
  newArc,
  newArcWithoutEthereum,
  newArcWithoutGraphql,
  toWei,
  waitUntilTrue,
  getTestAddresses,
  getTestScheme
} from './utils'

jest.setTimeout(20000)

/**
 * Arc test
 */
describe('Arc ', () => {
  it('Arc is instantiable', () => {
    const arc = new Arc({
      contractInfos: [],
      graphqlHttpProvider: 'https://graphql.provider',
      graphqlWsProvider: 'https://graphql.provider',
      ipfsProvider: 'http://localhost:5001/api/v0',
      web3Provider: 'http://web3.provider'
    })
    expect(arc).toBeInstanceOf(Arc)
  })

  it('Arc is usable without subgraph connection', async () => {
    const arc = await newArcWithoutGraphql()
    expect(arc).toBeInstanceOf(Arc)

    expect(() => arc.sendQuery(gql`{daos {id}}`)).toThrowError(/no connection/i)
  })

  it('Arc is usable without knowing about contracts', async () => {
    const arc = await newArcWithoutEthereum()
    expect(arc).toBeInstanceOf(Arc)

    const daos = arc.sendQuery(gql`{daos {id}}`)
    expect(daos).toBeTruthy()
  })

  it('arc.allowances() should work', async () => {
    const arc = await newArc()

    const allowances: BigNumber[] = []
    const spender = '0xDb56f2e9369E0D7bD191099125a3f6C370F8ed15'
    const amount = toWei(1001)
    await arc.approveForStaking(spender, amount).send()

    if (!arc.web3) { throw new Error('Web3 provider not set') }
    let defaultAccount = await arc.getDefaultAddress()

    if (!defaultAccount) {
      defaultAccount = await arc.web3.getSigner().getAddress()
    }

    arc.allowance(defaultAccount, spender).subscribe(
      (next: BigNumber) => {
        allowances.push(next)
      }
    )
    const lastAllowance = () => allowances[allowances.length - 1]
    await waitUntilTrue(() => (allowances.length > 0))
    expect(fromWei(lastAllowance())).toEqual('1001.0')
  })

  it('arc.allowance() should work', async () => {
    const arc = await newArc()

    const allowances: BigNumber[] = []
    const spender = '0xDb56f2e9369E0D7bD191099125a3f6C370F8ed15'
    const amount = toWei(1001)
    await arc.approveForStaking(spender, amount).send()

    if (!arc.web3) { throw new Error('Web3 provider not set') }
    let defaultAccount = await arc.getDefaultAddress()

    if (!defaultAccount) {
      defaultAccount = await arc.web3.getSigner().getAddress()
    }

    arc.allowance(defaultAccount, spender).subscribe(
      (next: BigNumber) => {
        allowances.push(next)
      }
    )

    const lastAllowance = () => allowances[allowances.length - 1]
    await waitUntilTrue(() => (allowances.length > 0))
    expect(fromWei(lastAllowance())).toEqual('1001.0')
  })

  it('arc.getAccount() works and is correct', async () => {
    const arc = await newArc()
    const addressesObserved: Address[] = []
    arc.getAccount().subscribe((address) => addressesObserved.push(address))
    await waitUntilTrue(() => addressesObserved.length > 0)

    if (!arc.web3) { throw new Error('Web3 provider not set') }
    let defaultAccount = await arc.getDefaultAddress()

    if (!defaultAccount) {
      defaultAccount = await arc.web3.getSigner().getAddress()
    }

    expect(addressesObserved[0]).toEqual(defaultAccount)
  })

  it('arc.ethBalance() works with an account with 0 balance', async () => {
    const arc = await newArc()
    const balance = await arc.ethBalance('0x90f8bf6a479f320ead074411a4b0e7944ea81111').pipe(first()).toPromise()
    expect(balance).toEqual(BigNumber.from(0))

  })

  it('arc.ethBalance() works with multiple subscriptions', async () => {
    const arc = await newArc()
    // observe two balances
    const balances1: BigNumber[] = []
    const balances2: BigNumber[] = []
    const balances3: BigNumber[] = []

    if (!arc.web3) { throw new Error('Web3 provider not set') }

    const address1 = await arc.web3.getSigner(1).getAddress()
    const address2 = await arc.web3.getSigner(2).getAddress()

    const subscription1 = arc.ethBalance(address1).subscribe((balance) => {
      balances1.push(balance)
    })
    const subscription2 = arc.ethBalance(address2).subscribe((balance) => {
      balances2.push(balance)
    })
    //
    // send some ether to the test accounts
    async function sendEth(address: Address, amount: BigNumber) {

      if (!arc.web3) { throw new Error('Web3 provider not set') }

      //console.log(BigNumber.from(amount.toString()), amount.toString())
      //console.log("bbs",await arc.ethBalance(address).pipe(first()).toPromise())
      console.log(address)
      console.log(amount)
      const provider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:8545')
      const signer = provider.getSigner()
      await signer.sendTransaction({
        gasPrice: BigNumber.from('100000000000'),
        to: address,
        value: amount
      })

      console.log("55")

      //console.log("bs",await arc.ethBalance(address).pipe(first()).toPromise())

    }
    const amount1 = BigNumber.from('123456')
    const amount2 = BigNumber.from('456677')
    console.log("balance before send",await arc.web3.getBalance(address1))
    await sendEth(address1, amount1)
    console.log("balance after send",await arc.web3.getBalance(address1))
    console.log("11")
    await sendEth(address2, amount2)
    console.log("22")
    console.log("balances1", balances1)
    await waitUntilTrue(() => balances1.length > 1)
    
    console.log("33")
    await waitUntilTrue(() => balances2.length > 1)
    console.log("44")

    expect(balances1.length).toEqual(2)
    expect(balances2.length).toEqual(2)
    expect(balances1[1].sub(balances1[0]).toString()).toEqual(amount1.toString())
    expect(balances2[1].sub(balances2[0]).toString()).toEqual(amount2.toString())

    // add a second subscription for address2's balance
    const subscription3 = arc.ethBalance(address2).subscribe((balance) => {
      balances3.push(balance)
    })

    await waitUntilTrue(() => balances3.length >= 1)

    expect(balances3[balances3.length - 1].toString()).toEqual(balances2[balances2.length - 1].toString())
    await subscription2.unsubscribe()
    // expect(Object.keys(arc.observedAccounts)).toEqual([address1])
    await subscription1.unsubscribe()

    // we have unsubscribed from subscription2, but we are still observing the account with subscription3
    expect(Object.keys(arc.observedAccounts).length).toEqual(1)

    const amount3 = BigNumber.from('333333')
    expect(balances3.length).toEqual(1)
    await sendEth(address2, amount3)
    await waitUntilTrue(() => balances3.length >= 2)
    expect(balances3[balances3.length - 1]).toEqual(balances3[balances3.length - 2].add(amount3))

    await subscription3.unsubscribe()
    // check if we cleanup up completely
    expect(Object.keys(arc.observedAccounts).length).toEqual(0)
  })

  it('arc.proposals() should work', async () => {
    const arc = await newArc()
    const proposals = await arc.proposals().pipe(first()).toPromise()
    expect(typeof proposals).toEqual(typeof [])
    expect(proposals.length).toBeGreaterThanOrEqual(4)
  })

  it('arc.plugin() should work', async () => {
    const arc = await newArc()
    const nonUniquePlugin = await arc.plugin({ where: { name: 'GenericScheme' } })
    const uniquePlugin = await arc.plugin({ where: { address: getTestScheme('GenericScheme') } }, true)

    expect(nonUniquePlugin).toBeInstanceOf(Plugin)
    expect(uniquePlugin).toBeInstanceOf(Plugin)
    await expect(arc.plugin({ where: { name: 'ContributionReward' } }, true)).rejects.toThrow()
  })

  it('arc.plugins() should work', async () => {
    const arc = await newArc()
    const plugins = await arc.plugins().pipe(first()).toPromise()
    expect(plugins.length).toBeGreaterThan(0)
  })

  it('arc.fetchContractInfos() should return lower case addresses', async () => {
    const arc = await newArc()
    await arc.fetchContractInfos()
    const anAddress = arc.contractInfos[2].address
    expect(anAddress).toEqual(anAddress.toLowerCase())
  })

  it('arc.getABI works', async () => {
    const arc = await newArc()
    await arc.fetchContractInfos()
    const abi = arc.getABI({ abiName: 'Redeemer', version: REDEEMER_CONTRACT_VERSIONS[0] })
    expect(abi[0].name).toEqual('redeem')
  })

  it('new Arc fails when a custom signer has no provider', async () => {
    await expect(
      newArc({
        web3Provider: new Wallet(
          '0xe485d098507f54e7733a205420dfddbe58db035fa577fc294ebd14db90767a52'
        )
      })
    ).rejects.toThrow(
      /Ethers Signer is missing a provider,/i
    )
  })

  it('arc.getContract uses the custom signer', async () => {
    const signer = new Wallet(
      '0xe485d098507f54e7733a205420dfddbe58db035fa577fc294ebd14db90767a52',
      new providers.JsonRpcProvider('http://127.0.0.1:8545')
    )

    const arc = await newArc({
      web3Provider: signer
    })

    const avatar = arc.getContract(getTestAddresses().dao.Avatar)

    expect(await avatar.signer.getAddress())
      .toEqual(await signer.getAddress())
  })

  it('arc.getAccount works with a custom signer', async () => {
    const signer = new Wallet(
      '0xe485d098507f54e7733a205420dfddbe58db035fa577fc294ebd14db90767a52',
      new providers.JsonRpcProvider('http://127.0.0.1:8545')
    )

    const arc = await newArc({
      web3Provider: signer
    })

    expect(await arc.getAccount().pipe(first()).toPromise())
      .toEqual(await signer.getAddress())
  })

  it('arc.setAccount fails when a custom signer is used', async () => {
    const signer = new Wallet(
      '0xe485d098507f54e7733a205420dfddbe58db035fa577fc294ebd14db90767a52',
      new providers.JsonRpcProvider('http://127.0.0.1:8545')
    )

    const arc = await newArc({
      web3Provider: signer
    })

    const promisify = new Promise(() => {
      arc.setAccount('0xADDRESS')
    })

    await expect(promisify).rejects.toThrow(
      /The account cannot be set post-initialization when a custom Signer is being used/i
    )
  })

  it('arc.getSigner returns the custom signer', async () => {
    const signer = new Wallet(
      '0xe485d098507f54e7733a205420dfddbe58db035fa577fc294ebd14db90767a52',
      new providers.JsonRpcProvider('http://127.0.0.1:8545')
    )

    const arc = await newArc({
      web3Provider: signer
    })

    expect(await (await arc.getSigner().pipe(first()).toPromise()).getAddress())
      .toEqual(await signer.getAddress())
  })
})

it('plugin contractInfo should contain alias', async () => {
  const arc = await newArc()
  const pluginId = '0x86072cbff48da3c1f01824a6761a03f105bcc697'

  const contractInfo = arc.getContractInfo(pluginId)

  expect(contractInfo.alias).toEqual("ContributionRewardExt")
})

it('arc.approveToken should return tx with status one', async () => {
  const arc = await newArc()
  const addresses = getTestAddresses()
  const tokenAddress = addresses.dao.DAOToken
  const spender = '0x90f8bf6a479f320ead074411a4b0e7944ea8c9c1'
  const amount = toWei('31415')
  const approval = await arc.approveTokens(tokenAddress, spender, amount).send();
  expect(approval.transactionHash).toBeDefined();
  expect(approval.receipt!.status).toEqual(1);
  const token = new Token(arc, tokenAddress);
  const signer = (arc.web3 as providers.JsonRpcProvider).getSigner(arc.defaultAccount as any)
  const allowances: Array<BigNumber> = []
  const lastAllowance = () => allowances[allowances.length - 1]
  await token.allowance(await signer.getAddress(), spender).subscribe(
    (next: any) => allowances.push(next)
  )
  await waitUntilTrue(() => allowances.length > 0 && lastAllowance().gte(amount))
  expect(lastAllowance()).toMatchObject(amount)
})