import { first } from 'rxjs/operators'
import { Arc, IProposalCreateOptionsCR, AnyProposal } from '../src'
import { DAO } from '../src'
import { IProposalStage, Proposal } from '../src'
import {
  fromWei,
  getTestDAO,
  getTestScheme,
  newArc,
  newArcWithoutGraphql,
  toWei,
  waitUntilTrue,
  createCRProposal
} from './utils'
import { BigNumber } from 'ethers/utils'
jest.setTimeout(20000)

/**
 * DAO test
 */
describe('DAO', () => {
  let arc: Arc

  beforeAll(async () => {
    arc = await newArc()
  })

  it('is instantiable', () => {
    const address = '0x12345'
    const dao = new DAO(arc, address)
    expect(dao).toBeInstanceOf(DAO)
  })

  it('collection is searchable', async () => {
    let result: DAO[]
    result = await DAO.search(arc).pipe(first()).toPromise()
    expect(result.length).toBeGreaterThan(1)
    result = await DAO.search(arc, {where: { register: 'unRegistered'}}).pipe(first()).toPromise()
    expect(result.length).toEqual(0)
    result = await DAO.search(arc, {where: { register: 'registered'}}).pipe(first()).toPromise()
    expect(result.length).toBeGreaterThan(0)
  })

  it('fetchAllData in DAO.search works', async () => {
    let result: DAO[]
    result = await DAO.search(arc).pipe(first()).toPromise()
    expect(result.length).toBeGreaterThan(1)
  })

  it('should be possible to get the token balance of the DAO', async () => {
    const dao = await getTestDAO()
    const { token } = await dao.fetchState()
    const balance = await token.entity.balanceOf(dao.id).pipe(first()).toPromise()
    expect(fromWei(balance)).toEqual('0.0')
  })

  it('should be possible to get the reputation balance of the DAO', () => {
    // const { reputation } = await dao.state().toPromise()
    // const balance = await reputation.balanceOf(address).toPromise()
  })

  it('get the list of daos', async () => {
    const daos = arc.daos()
    const daoList = await daos.pipe(first()).toPromise()
    expect(typeof daoList).toBe('object')
    expect(daoList.length).toBeGreaterThan(0)
  })

  it('get the dao state', async () => {
    const dao = await getTestDAO()
    expect(dao).toBeInstanceOf(DAO)
    const state = await dao.fetchState()
    expect(Object.keys(state)).toEqual([
      'address',
      'id',
      'memberCount',
      "metadata",
      'metadataHash',
      'name',
      'numberOfBoostedProposals',
      'numberOfPreBoostedProposals',
      'numberOfQueuedProposals',
      'register',
      'reputation',
      'reputationTotalSupply',
      'token',
      'tokenName',
      'tokenSymbol',
      'tokenTotalSupply',
      'ethBalance'
    ])
    expect(state.address).toEqual(dao.id)
    // the created DAO has 6 members but other tests may add rep
    expect(state.memberCount).toBeGreaterThanOrEqual(5)

  })

  it('throws a reasonable error if the contract does not exist', async () => {
    expect.assertions(1)
    const dao = new DAO(arc, '0xfake')
    await expect(dao.state().toPromise()).rejects.toThrow(
      /Could not find DAO with id '0xfake'/i
    )
  })

  it('dao.member() should work', async () => {
    const dao = await getTestDAO()

    if(!arc.web3) throw new Error("Web3 provider not set")
    let defaultAccount = await arc.getDefaultAddress()

    if (!defaultAccount) {
      defaultAccount = await arc.web3.getSigner().getAddress()
    }

    const member = await dao.member(defaultAccount)
    expect(typeof member).toEqual(typeof [])
  })

  it('dao.members() should work', async () => {
    const dao = await getTestDAO()
    const members = await dao.members().pipe(first()).toPromise()
    expect(typeof members).toEqual(typeof [])
    expect(members.length).toBeGreaterThanOrEqual(6)
    const member = members[3]
    const memberState = await member.fetchState()
    expect(Number(fromWei(memberState.reputation))).toBeGreaterThan(0)
  })

  it('dao.proposals() should work', async () => {
    const dao = await getTestDAO()
    const proposals = await dao.proposals().pipe(first()).toPromise()
    expect(typeof proposals).toEqual(typeof [])
    expect(proposals.length).toBeGreaterThanOrEqual(4)
  })

  it('dao numberOfProposals counts are correct', async () =>  {
    const dao = await getTestDAO()
    const daoState = await dao.fetchState()
    const queuedProposals = await dao.proposals({ where: { stage: IProposalStage.Queued}, first: 1000})
      .pipe(first()).toPromise()
    expect(daoState.numberOfQueuedProposals).toEqual(queuedProposals.length)
    const preBoostedProposals = await dao.proposals({ where: { stage: IProposalStage.PreBoosted}, first: 1000})
      .pipe(first()).toPromise()
    expect(daoState.numberOfPreBoostedProposals).toEqual(preBoostedProposals.length)
    const boostedProposals = await dao.proposals({ where: { stage: IProposalStage.Boosted}, first: 1000})
      .pipe(first()).toPromise()
    expect(daoState.numberOfBoostedProposals).toEqual(boostedProposals.length)
  })

  it('createProposal should work', async () => {
    const dao = await getTestDAO(arc)
    const options: IProposalCreateOptionsCR = {
      beneficiary: '0xffcf8fdee72ac11b5c542428b35eef5769c409f0',
      dao: dao.id,
      ethReward: toWei('300'),
      externalTokenAddress: undefined,
      externalTokenReward: toWei('0'),
      nativeTokenReward: toWei('1'),
      reputationReward: toWei('10'),
      plugin: getTestScheme("ContributionReward")
    }

    const proposal = await createCRProposal(arc, options)

    let proposals: AnyProposal[] = []
    const proposalIsIndexed = async () => {
      proposals = await Proposal.search(arc, {where: {id: proposal.id}}, { fetchPolicy: 'network-only'})
        .pipe(first()).toPromise()
      return proposals.length > 0
    }
    await waitUntilTrue(proposalIsIndexed)
    expect(proposal.id).toBeDefined()

  })

  it.skip('createProposal should work without a graphql connection', async () => {
    const arcWithoutGraphql = await newArcWithoutGraphql()
    const dao = await getTestDAO(arcWithoutGraphql)
    const options: IProposalCreateOptionsCR = {
      beneficiary: '0xffcf8fdee72ac11b5c542428b35eef5769c409f0',
      dao: dao.id,
      ethReward: toWei('300'),
      externalTokenAddress: undefined,
      externalTokenReward: toWei('0'),
      nativeTokenReward: toWei('1'),
      reputationReward: toWei('10'),
      plugin: getTestScheme("ContributionReward")
    }

    await createCRProposal(arc, options)
  })

  it('dao.plugins() should work', async () => {
    const dao = await getTestDAO()
    let plugins = await dao.plugins().pipe(first()).toPromise()
    expect(typeof plugins).toEqual(typeof [])
    expect(plugins.length).toBeGreaterThanOrEqual(3)
    plugins = await dao.plugins({ where: {name: 'ContributionReward'}}).pipe(first()).toPromise()
    expect(plugins.length).toBeGreaterThanOrEqual(1)
  })

  it('dao.ethBalance() should work', async () => {
    const dao = await getTestDAO()
    const previousBalance = await (await dao.ethBalance()).pipe(first()).toPromise()

    if(!arc.web3) throw new Error("Web3 provider not set")

    await arc.web3.getSigner().sendTransaction({
      gasLimit: 4000000,
      gasPrice: 100000000000,
      to: dao.id,
      value: new BigNumber(toWei('1').toString()).toHexString()
    })
    const newBalance = await (await dao.ethBalance()).pipe(first()).toPromise()
    expect(Number(fromWei(newBalance.sub(previousBalance)))).toBe(1)
  })

  it('paging and sorting works', async () => {
    const ls1 = await DAO.search(arc, { first: 3, orderBy: 'id' }).pipe(first()).toPromise()
    expect(ls1.length).toEqual(3)
    expect(ls1[0].id <= ls1[1].id).toBeTruthy()

    const ls2 = await DAO.search(arc, { first: 2, skip: 2, orderBy: 'id' }).pipe(first()).toPromise()
    expect(ls2.length).toEqual(2)
    expect(ls1[2].id).toEqual(ls2[0].id)

    const ls3 = await DAO.search(arc, {  orderBy: 'id', orderDirection: 'desc'}).pipe(first()).toPromise()
    expect(ls3[0].id >= ls3[1].id).toBeTruthy()
  })

})
