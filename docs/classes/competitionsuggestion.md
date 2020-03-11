[@daostack/client - v0.2.64](../README.md) › [Globals](../globals.md) › [CompetitionSuggestion](competitionsuggestion.md)

# Class: CompetitionSuggestion

## Hierarchy

* **CompetitionSuggestion**

## Implements

* [IStateful](../interfaces/istateful.md)‹[ICompetitionSuggestionState](../interfaces/icompetitionsuggestionstate.md)›

## Index

### Constructors

* [constructor](competitionsuggestion.md#constructor)

### Properties

* [context](competitionsuggestion.md#context)
* [id](competitionsuggestion.md#id)
* [staticState](competitionsuggestion.md#optional-staticstate)
* [suggestionId](competitionsuggestion.md#optional-suggestionid)

### Methods

* [fetchStaticState](competitionsuggestion.md#fetchstaticstate)
* [getPosition](competitionsuggestion.md#getposition)
* [isWinner](competitionsuggestion.md#iswinner)
* [redeem](competitionsuggestion.md#redeem)
* [setStaticState](competitionsuggestion.md#setstaticstate)
* [state](competitionsuggestion.md#state)
* [vote](competitionsuggestion.md#vote)
* [votes](competitionsuggestion.md#votes)
* [calculateId](competitionsuggestion.md#static-calculateid)
* [mapItemToObject](competitionsuggestion.md#static-private-mapitemtoobject)
* [search](competitionsuggestion.md#static-search)

### Object literals

* [fragments](competitionsuggestion.md#static-fragments)

## Constructors

###  constructor

\+ **new CompetitionSuggestion**(`idOrOpts`: string | object | [ICompetitionSuggestionState](../interfaces/icompetitionsuggestionstate.md), `context`: [Arc](arc.md)): *[CompetitionSuggestion](competitionsuggestion.md)*

*Defined in [src/schemes/competition.ts:661](https://github.com/daostack/client/blob/b547acc/src/schemes/competition.ts#L661)*

**Parameters:**

Name | Type |
------ | ------ |
`idOrOpts` | string &#124; object &#124; [ICompetitionSuggestionState](../interfaces/icompetitionsuggestionstate.md) |
`context` | [Arc](arc.md) |

**Returns:** *[CompetitionSuggestion](competitionsuggestion.md)*

## Properties

###  context

• **context**: *[Arc](arc.md)*

*Defined in [src/schemes/competition.ts:665](https://github.com/daostack/client/blob/b547acc/src/schemes/competition.ts#L665)*

___

###  id

• **id**: *string*

*Defined in [src/schemes/competition.ts:659](https://github.com/daostack/client/blob/b547acc/src/schemes/competition.ts#L659)*

___

### `Optional` staticState

• **staticState**? : *[ICompetitionSuggestionState](../interfaces/icompetitionsuggestionstate.md)*

*Defined in [src/schemes/competition.ts:661](https://github.com/daostack/client/blob/b547acc/src/schemes/competition.ts#L661)*

___

### `Optional` suggestionId

• **suggestionId**? : *undefined | number*

*Defined in [src/schemes/competition.ts:660](https://github.com/daostack/client/blob/b547acc/src/schemes/competition.ts#L660)*

## Methods

###  fetchStaticState

▸ **fetchStaticState**(): *Promise‹[ICompetitionSuggestionState](../interfaces/icompetitionsuggestionstate.md)›*

*Defined in [src/schemes/competition.ts:688](https://github.com/daostack/client/blob/b547acc/src/schemes/competition.ts#L688)*

**Returns:** *Promise‹[ICompetitionSuggestionState](../interfaces/icompetitionsuggestionstate.md)›*

___

###  getPosition

▸ **getPosition**(): *Promise‹null | number›*

*Defined in [src/schemes/competition.ts:726](https://github.com/daostack/client/blob/b547acc/src/schemes/competition.ts#L726)*

**Returns:** *Promise‹null | number›*

___

###  isWinner

▸ **isWinner**(): *Promise‹boolean›*

*Defined in [src/schemes/competition.ts:732](https://github.com/daostack/client/blob/b547acc/src/schemes/competition.ts#L732)*

**Returns:** *Promise‹boolean›*

___

###  redeem

▸ **redeem**(): *[Operation](../globals.md#operation)‹boolean›*

*Defined in [src/schemes/competition.ts:738](https://github.com/daostack/client/blob/b547acc/src/schemes/competition.ts#L738)*

**Returns:** *[Operation](../globals.md#operation)‹boolean›*

___

###  setStaticState

▸ **setStaticState**(`opts`: [ICompetitionSuggestionState](../interfaces/icompetitionsuggestionstate.md)): *void*

*Defined in [src/schemes/competition.ts:684](https://github.com/daostack/client/blob/b547acc/src/schemes/competition.ts#L684)*

**Parameters:**

Name | Type |
------ | ------ |
`opts` | [ICompetitionSuggestionState](../interfaces/icompetitionsuggestionstate.md) |

**Returns:** *void*

___

###  state

▸ **state**(`apolloQueryOptions`: [IApolloQueryOptions](../interfaces/iapolloqueryoptions.md)): *Observable‹[ICompetitionSuggestionState](../interfaces/icompetitionsuggestionstate.md)›*

*Defined in [src/schemes/competition.ts:692](https://github.com/daostack/client/blob/b547acc/src/schemes/competition.ts#L692)*

**Parameters:**

Name | Type | Default |
------ | ------ | ------ |
`apolloQueryOptions` | [IApolloQueryOptions](../interfaces/iapolloqueryoptions.md) |  {} |

**Returns:** *Observable‹[ICompetitionSuggestionState](../interfaces/icompetitionsuggestionstate.md)›*

___

###  vote

▸ **vote**(): *[Operation](../globals.md#operation)‹[CompetitionVote](competitionvote.md)›*

*Defined in [src/schemes/competition.ts:706](https://github.com/daostack/client/blob/b547acc/src/schemes/competition.ts#L706)*

**Returns:** *[Operation](../globals.md#operation)‹[CompetitionVote](competitionvote.md)›*

___

###  votes

▸ **votes**(`options`: [ICompetitionVoteQueryOptions](../interfaces/icompetitionvotequeryoptions.md), `apolloQueryOptions`: [IApolloQueryOptions](../interfaces/iapolloqueryoptions.md)): *Observable‹[CompetitionVote](competitionvote.md)[]›*

*Defined in [src/schemes/competition.ts:717](https://github.com/daostack/client/blob/b547acc/src/schemes/competition.ts#L717)*

**Parameters:**

Name | Type | Default |
------ | ------ | ------ |
`options` | [ICompetitionVoteQueryOptions](../interfaces/icompetitionvotequeryoptions.md) |  {} |
`apolloQueryOptions` | [IApolloQueryOptions](../interfaces/iapolloqueryoptions.md) |  {} |

**Returns:** *Observable‹[CompetitionVote](competitionvote.md)[]›*

___

### `Static` calculateId

▸ **calculateId**(`opts`: object): *string*

*Defined in [src/schemes/competition.ts:566](https://github.com/daostack/client/blob/b547acc/src/schemes/competition.ts#L566)*

**Parameters:**

▪ **opts**: *object*

Name | Type |
------ | ------ |
`scheme` | [Address](../globals.md#address) |
`suggestionId` | number |

**Returns:** *string*

___

### `Static` `Private` mapItemToObject

▸ **mapItemToObject**(`item`: any, `context`: [Arc](arc.md)): *[ICompetitionSuggestionState](../interfaces/icompetitionsuggestionstate.md) | null*

*Defined in [src/schemes/competition.ts:625](https://github.com/daostack/client/blob/b547acc/src/schemes/competition.ts#L625)*

**Parameters:**

Name | Type |
------ | ------ |
`item` | any |
`context` | [Arc](arc.md) |

**Returns:** *[ICompetitionSuggestionState](../interfaces/icompetitionsuggestionstate.md) | null*

___

### `Static` search

▸ **search**(`context`: [Arc](arc.md), `options`: [ICompetitionSuggestionQueryOptions](../interfaces/icompetitionsuggestionqueryoptions.md), `apolloQueryOptions`: [IApolloQueryOptions](../interfaces/iapolloqueryoptions.md)): *Observable‹[CompetitionSuggestion](competitionsuggestion.md)[]›*

*Defined in [src/schemes/competition.ts:574](https://github.com/daostack/client/blob/b547acc/src/schemes/competition.ts#L574)*

**Parameters:**

Name | Type | Default |
------ | ------ | ------ |
`context` | [Arc](arc.md) | - |
`options` | [ICompetitionSuggestionQueryOptions](../interfaces/icompetitionsuggestionqueryoptions.md) |  {} |
`apolloQueryOptions` | [IApolloQueryOptions](../interfaces/iapolloqueryoptions.md) |  {} |

**Returns:** *Observable‹[CompetitionSuggestion](competitionsuggestion.md)[]›*

## Object literals

### `Static` fragments

### ▪ **fragments**: *object*

*Defined in [src/schemes/competition.ts:540](https://github.com/daostack/client/blob/b547acc/src/schemes/competition.ts#L540)*

###  CompetitionSuggestionFields

• **CompetitionSuggestionFields**: *any* =  gql`fragment CompetitionSuggestionFields on CompetitionSuggestion {
      id
      suggestionId
      proposal {
       id
      }
      descriptionHash
      title
      description
      url
      tags {
        id
      }
      # fulltext: [string]
      beneficiary
      suggester
      # votes: [CompetitionVote!] @derivedFrom(field: "suggestion")
      totalVotes
      createdAt
      redeemedAt
      rewardPercentage
      positionInWinnerList
    }`

*Defined in [src/schemes/competition.ts:541](https://github.com/daostack/client/blob/b547acc/src/schemes/competition.ts#L541)*
