import { first} from 'rxjs/operators'
import { Arc } from '../src/arc'
import { Proposal, ProposalStage } from '../src/proposal'
import { getArc, getContractAddresses, getOptions, getWeb3, nullAddress } from './utils'

const DAOstackMigration = require('@daostack/migration')

/**
 * Proposal test
 */
describe('Proposal', () => {
  let addresses: { [key: string]: string }
  let arc: Arc
  let web3: any
  let accounts: any

  beforeAll(async () => {
    addresses = getContractAddresses()
    arc = getArc()
    web3 = await getWeb3()
    accounts = web3.eth.accounts.wallet
    web3.eth.defaultAccount = accounts[0].address
  })

  it('Proposal is instantiable', () => {
    const id = 'some-id'
    const proposal = new Proposal(id, arc)
    expect(proposal).toBeInstanceOf(Proposal)
  })

  it('get list of proposals', async () => {
    const { Avatar, proposalId } = DAOstackMigration.migration('private').test
    const dao = arc.dao(Avatar.toLowerCase())
    const proposals = dao.proposals()
    const proposalsList = await proposals.pipe(first()).toPromise()
    expect(typeof proposalsList).toBe('object')
    expect(proposalsList.length).toBeGreaterThan(0)
    expect(proposalsList[proposalsList.length - 1].id).toBe(proposalId)
  })

  it('dao.proposals() accepts different query arguments', async () => {
    const { Avatar, proposalId } = DAOstackMigration.migration('private').test
    const dao = arc.dao(Avatar.toLowerCase())
    const proposals = await dao.proposals({ stage: ProposalStage.Open}).pipe(first()).toPromise()
    expect(typeof proposals).toEqual(typeof [])
    expect(proposals.length).toBeGreaterThan(0)
    expect(proposals[proposals.length - 1].id).toBe(proposalId)
  })

  it('get proposal dao', async () => {
    const { Avatar, proposalId } = DAOstackMigration.migration('private').test

    const dao = arc.dao(Avatar.toLowerCase()).address
    const proposal = new Proposal(proposalId, arc)
    const proposalDao = await proposal.dao().pipe(first()).toPromise()
    expect(proposal).toBeInstanceOf(Proposal)
    expect(proposalDao.address).toBe(dao)
  })

  it('Check proposal state is correct', async () => {
    const { proposalId } = DAOstackMigration.migration('private').test

    const proposal = new Proposal(proposalId, arc)
    const proposalState = await proposal.state.pipe(first()).toPromise()
    expect(proposal).toBeInstanceOf(Proposal)
    delete proposalState.dao
    delete proposalState.createdAt
    expect(proposalState).toEqual({
        beneficiary: '0xffcf8fdee72ac11b5c542428b35eef5769c409f0',
        boostedAt: 0,
        boostedVotePeriodLimit: 259200,
        boostingThreshold: 0,
        description: null,
        ethReward: 10,
        executedAt: null,
        externalTokenReward: 10,
        id: '0xc31f2952787d52a41a2b2afd8844c6e295f1bed932a3a433542d4c420965028e',
        ipfsHash: '0x000000000000000000000000000000000000000000000000000000000000abcd',
        preBoostedVotePeriodLimit: 259200,
        proposer: '0x1cea1e112ec409762ab4795daead616b5a3acf72879303434a87cbcd3a1785b9',
        quietEndingPeriodBeganAt: null,
        reputationReward: 10,
        resolvedAt: null,
        stage: 'Open',
        stakesAgainst: 0,
        stakesFor: 0,
        title: null,
        tokensReward: 10,
        url: null,
        votesAgainst: web3.utils.toWei('1000'),
        votesFor: web3.utils.toWei('1000'),
        winningOutcome: 'Fail'
    })
  })

  it('get proposal votes', async () => {
    const { Avatar, proposalId } = DAOstackMigration.migration('private').test

    const proposal = new Proposal(proposalId, arc)
    const votes = await proposal.votes().pipe(first()).toPromise()
    expect(votes.length).toBeGreaterThan(0)
    const vote = votes[0]
    expect(vote.proposalId).toBe(proposalId)
    expect(vote.dao).toBe(Avatar.toLowerCase())
  })
})
