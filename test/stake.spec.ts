import { first} from 'rxjs/operators'
import { Arc } from '../src/arc'
import { IProposalOutcome, ContributionRewardProposal} from '../src'
import { Stake } from '../src/stake'
import { createAProposal, newArc, toWei, waitUntilTrue } from './utils'
import { utils } from 'ethers'

jest.setTimeout(60000)

/**
 * Stake test
 */
describe('Stake', () => {

  let arc: Arc

  beforeAll(async () => {
    arc = await newArc()
  })

  it('Stake is instantiable', () => {
    const stake = new Stake(arc, {
      amount: toWei('300'),
      createdAt: new Date(),
      id: '0x1234id',
      outcome: IProposalOutcome.Fail,
      proposal: {
        id: '0x12445proposalId',
        entity: new ContributionRewardProposal(arc, '0x12445proposalId')
      },
      staker: '0x124staker'
    })
    expect(stake).toBeInstanceOf(Stake)
  })

  it('Stakes are searchable', async () => {
    let result: Stake[]
    const proposal = await createAProposal()
    const stakes: any[] = []

    const stakeAmount = toWei('18')

    if(!arc.web3) throw new Error("Web3 provider not set")
    let defaultAccount = await arc.getDefaultAddress()
    
    if (!defaultAccount) {
      defaultAccount = await arc.web3.getSigner().getAddress()
    }

    await proposal.stakingToken().mint(defaultAccount, stakeAmount).send()
    const votingMachine = await proposal.votingMachine()
    await arc.approveForStaking(votingMachine.address, stakeAmount).send()

    proposal.stakes().subscribe((next) => stakes.push(next))
    await proposal.stake(IProposalOutcome.Pass, stakeAmount).send()

    // wait until we have the we received the stake update
    await waitUntilTrue(() => stakes.length > 0 && stakes[stakes.length - 1].length > 0)

    // search for a stakes in an invalid proposal
    result = await Stake.search(arc, {where: {proposal: '0x12345'}})
      .pipe(first()).toPromise()
    expect(result).toEqual([])

    result = await Stake.search(arc, {where:  {proposal: proposal.id}})
      .pipe(first()).toPromise()
    expect(result.length).toEqual(1)
    const state = await result[0].fetchState()
    expect(state.outcome).toEqual(IProposalOutcome.Pass)

    result = await Stake
      .search(arc, {where: {staker: state.staker, proposal: proposal.id}})
      .pipe(first()).toPromise()
    expect(result.length).toEqual(1)

    result = await Stake
      .search(arc, {where:  {staker: utils.getAddress(state.staker), proposal: proposal.id}})
      .pipe(first()).toPromise()
    expect(result.length).toEqual(1)
  })

  it('paging and sorting works', async () => {
    const ls1 = await Stake.search(arc, { first: 3, orderBy: 'id' }).pipe(first()).toPromise()
    expect(ls1.length).toEqual(3)
    expect(Number(ls1[0].id)).toBeLessThan(Number(ls1[1].id))

    const ls2 = await Stake.search(arc, { first: 2, skip: 2, orderBy: 'id' }).pipe(first()).toPromise()
    expect(ls2.length).toEqual(2)
    expect(Number(ls1[2].id)).toEqual(Number(ls2[0].id))

    const ls3 = await Stake.search(arc, {  orderBy: 'id', orderDirection: 'desc'}).pipe(first()).toPromise()
    expect(Number(ls3[0].id)).toBeGreaterThanOrEqual(Number(ls3[1].id))
  })

})
