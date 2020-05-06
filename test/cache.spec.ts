import { getMainDefinition } from 'apollo-utilities'
import { first } from 'rxjs/operators'
import { Member, Proposal } from '../src'
import { createApolloClient } from '../src/'
import { Vote } from '../src/vote'
import { graphqlHttpProvider, graphqlWsProvider, newArc } from './utils'

jest.setTimeout(20000)
/**
 * Tests to see if the apollo cache works as expected
 */
describe('apolloClient caching checks', () => {

  let networkSubscriptions: any[] = []
  let networkQueries: any[] = []

  beforeEach(async () => {
    networkSubscriptions = []
    networkQueries = []
  })

  it('pre-fetching DAOs works', async () => {
    const arc = await newArc({
      graphqlHttpProvider,
      graphqlWsProvider,
      ipfsProvider: '',
      web3Provider: 'http://127.0.0.1:8545'
    })

    // now get all the DAOs with defailed data
    const daos = await arc.daos().pipe(first()).toPromise()

    // now we have all data in the cache - and we can get the whole state from the cache without error
    const p = arc.dao(daos[0].id).state({ fetchPolicy: 'cache-only'}).pipe(first()).toPromise()
    expect(p).resolves.toBeTruthy()
  })

  it('pre-fetching Proposals works', async () => {
    const arc = await newArc({
      graphqlHttpProvider,
      graphqlWsProvider,
      ipfsProvider: '',
      web3Provider: 'http://127.0.0.1:8545'
    })

    // now get all the DAOs with detailed data
    const proposals = await Proposal.search(arc).pipe(first()).toPromise()
    const proposal = proposals[0]
    // now we have all data in the cache - and we can get the whole state from the cache without error
    const p = proposal.state({ fetchPolicy: 'cache-only'}).pipe(first()).toPromise()
    expect(p).resolves.toBeTruthy()
  })

  it('pre-fetching Members with Member.search() works', async () => {
    const arc = await newArc({
      graphqlHttpProvider,
      graphqlWsProvider,
      ipfsProvider: '',
      web3Provider: 'http://127.0.0.1:8545'
    })

    // get all members of the dao
    const members = await Member.search(arc).pipe(first()).toPromise()
    const member = members[0]

    // we will still hit the server when getting the DAO state, because the previous query did not fetch all state data
    // so the next line with 'cache-only' will throw an Error
    expect(member.id).toBeTruthy()
    await new Member(arc, member.id as string).state({ fetchPolicy: 'cache-only'}).pipe(first()).toPromise()
  })

  it('pre-fetching ProposalVotes works', async () => {
    const arc = await newArc({
      graphqlHttpProvider,
      graphqlWsProvider,
      ipfsProvider: '',
      web3Provider: 'http://127.0.0.1:8545'
    })

    if (!arc.apolloClient) {
      throw Error('ApolloClient is missing on Arc')
    }

    // find a proposal in a plugin that has > 1 votes
    let proposals = await Proposal.search(arc).pipe(first()).toPromise()

    proposals = proposals.filter((p) => {

      if (!p.coreState) { throw new Error('Proposal coreState should not be null') }

      return p.coreState.votes.length > 1 && p.coreState.name === 'ContributionReward'
    })
    const proposal = proposals[0]

    if (!proposals[0].coreState) { throw new Error('Proposal coreState should not be null') }

    const vote = proposals[0].coreState.votes[0].entity
    const voteState = await vote.fetchState()
    const voterAddress = voteState.voter

    // now we have our objects, reset the cache
    await arc.apolloClient.cache.reset()
    expect((arc.apolloClient.cache as any).data.data).toEqual({})

    const proposalVotes = await proposal.votes({ where: { voter: voterAddress}})
      .pipe(first()).toPromise()
    expect(proposalVotes.map((v: Vote) => v.id)).toEqual([vote.id])

    await proposal
      .votes({ where: { voter: '0x2a5994b501e6a560e727b6c2de5d856396aadd38' }})
      .pipe(first()).toPromise()
    await proposal.stakes({}, { fetchPolicy: 'cache-only'})
      .pipe(first()).toPromise()
    await proposal.stakes({where: { staker: voterAddress }})
      .pipe(first()).toPromise()
  })

  it('pre-fetching Members with dao.members() works', async () => {
    const arc = await newArc({
      graphqlHttpProvider,
      graphqlWsProvider,
      ipfsProvider: '',
      web3Provider: 'http://127.0.0.1:8545'
    })

    arc.apolloClient = createApolloClient({
      graphqlHttpProvider,
      graphqlWsProvider,
      prefetchHook: (query: any) => {
        const definition = getMainDefinition(query)

        // @ts-ignore
        if (definition.operation === 'subscription') {
          networkSubscriptions.push(definition)
        } else {
          networkQueries.push(definition)
        }
      }
    })

    expect(networkSubscriptions.length).toEqual(0)
    expect(networkQueries.length).toEqual(0)
    const daos = await arc.daos({where: {reputationHoldersCount_gt: 1}}, { subscribe: false }).pipe(first()).toPromise()
    expect(networkSubscriptions.length).toEqual(0)
    expect(networkQueries.length).toEqual(1)
    const dao = daos[0]
    expect(dao.coreState).toBeTruthy()

    const members = await dao.members({}, {subscribe: false}).pipe(first()).toPromise()
    // we now should have sent a subscriptino for dao.members()

    const member = members[1]
    // subscribe to all (well, the first 100) members and member changes
    await dao.members({}, {subscribe: true }).subscribe()
    expect(networkQueries.length).toEqual(2)
    expect(networkSubscriptions.length).toEqual(1)
    // if we now get the member state, we should not be sending any query at all
    await member.state({ fetchPolicy: 'cache-only', subscribe: false}).subscribe()
    expect(networkQueries.length).toEqual(2)
    expect(networkSubscriptions.length).toEqual(1)
    await member.state({ subscribe: false}).subscribe()
    expect(networkQueries.length).toEqual(2)
    expect(networkSubscriptions.length).toEqual(1)

    // for sanity, check fi we actually ahve the member info
    const memberState = await member.state({fetchPolicy: 'cache-only', subscribe: false}).pipe(first()).toPromise()
    expect(memberState.reputation.isZero()).toBeFalsy()
    // getting the member by address does not open a new subscription either
    await dao.member(memberState).state({ subscribe: false}).pipe(first()).toPromise()
    expect(networkQueries.length).toEqual(2)
    expect(networkSubscriptions.length).toEqual(1)

  })
})
