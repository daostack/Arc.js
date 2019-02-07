import { first, take } from 'rxjs/operators'
import { Arc } from '../src/arc'
import { Proposal, ProposalOutcome } from '../src/proposal'
import { Vote } from '../src/vote'
import { createAProposal, getArc, getTestDAO, waitUntilTrue } from './utils'

describe('Vote on a ContributionReward', () => {
  let arc: Arc

  beforeAll(async () => {
    arc = getArc()
  })

  it('works and gets indexed', async () => {
    const dao = await getTestDAO()
    const proposal = await createAProposal()

    const voteResponse = await proposal.vote(ProposalOutcome.Pass).pipe(take(2)).toPromise()
    expect(voteResponse.result).toMatchObject({
      outcome : ProposalOutcome.Pass
    })

    let votes: Vote[] = []

    const voteIsIndexed = async () => {
      // we pass no-cache to make sure we hit the server on each request
      votes = await Vote.search(arc, {proposal: proposal.id}, { fetchPolicy: 'no-cache' })
        .pipe(first()).toPromise()
      return votes.length > 0
    }
    await waitUntilTrue(voteIsIndexed)

    expect(votes.length).toEqual(1)
    const vote = votes[0]
    expect(vote.proposalId).toBe(proposal.id)
    expect(vote.dao).toEqual(dao.address)
  })

  it('throws a meaningful error if the proposal does not exist', async () => {

    const dao = await getTestDAO()
    // a non-existing proposal
    const proposal = new Proposal(
      '0x1aec6c8a3776b1eb867c68bccc2bf8b1178c47d7b6a5387cf958c7952da267c2', dao.address, arc
    )
    proposal.context.web3.eth.defaultAccount = arc.web3.eth.accounts.wallet[2].address
    await expect(proposal.vote(ProposalOutcome.Pass).pipe(take(2)).toPromise()).rejects.toThrow(
      /unknown proposal/i
    )
  })
})
