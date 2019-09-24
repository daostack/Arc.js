[@daostack/client](../README.md) › [Globals](../globals.md) › [Queue](queue.md)

# Class: Queue

## Hierarchy

* **Queue**

## Implements

* [IStateful](../interfaces/istateful.md)‹[IQueueState](../interfaces/iqueuestate.md)›

## Index

### Constructors

* [constructor](queue.md#constructor)

### Properties

* [context](queue.md#context)
* [dao](queue.md#dao)
* [id](queue.md#id)

### Methods

* [state](queue.md#state)
* [search](queue.md#static-search)

## Constructors

###  constructor

\+ **new Queue**(`id`: string, `dao`: [DAO](dao.md), `context`: [Arc](arc.md)): *[Queue](queue.md)*

*Defined in [queue.ts:86](https://github.com/daostack/client/blob/c62f433/src/queue.ts#L86)*

**Parameters:**

Name | Type |
------ | ------ |
`id` | string |
`dao` | [DAO](dao.md) |
`context` | [Arc](arc.md) |

**Returns:** *[Queue](queue.md)*

## Properties

###  context

• **context**: *[Arc](arc.md)*

*Defined in [queue.ts:91](https://github.com/daostack/client/blob/c62f433/src/queue.ts#L91)*

___

###  dao

• **dao**: *[DAO](dao.md)*

*Defined in [queue.ts:90](https://github.com/daostack/client/blob/c62f433/src/queue.ts#L90)*

___

###  id

• **id**: *string*

*Defined in [queue.ts:89](https://github.com/daostack/client/blob/c62f433/src/queue.ts#L89)*

## Methods

###  state

▸ **state**(`apolloQueryOptions`: [IApolloQueryOptions](../interfaces/iapolloqueryoptions.md)): *Observable‹[IQueueState](../interfaces/iqueuestate.md)›*

*Defined in [queue.ts:96](https://github.com/daostack/client/blob/c62f433/src/queue.ts#L96)*

**Parameters:**

Name | Type | Default |
------ | ------ | ------ |
`apolloQueryOptions` | [IApolloQueryOptions](../interfaces/iapolloqueryoptions.md) |  {} |

**Returns:** *Observable‹[IQueueState](../interfaces/iqueuestate.md)›*

___

### `Static` search

▸ **search**(`context`: [Arc](arc.md), `options`: [IQueueQueryOptions](../interfaces/iqueuequeryoptions.md), `apolloQueryOptions`: [IApolloQueryOptions](../interfaces/iapolloqueryoptions.md)): *Observable‹[Queue](queue.md)[]›*

*Defined in [queue.ts:38](https://github.com/daostack/client/blob/c62f433/src/queue.ts#L38)*

Queue.search(context, options) searches for queue entities

**Parameters:**

Name | Type | Default | Description |
------ | ------ | ------ | ------ |
`context` | [Arc](arc.md) | - | an Arc instance that provides connection information |
`options` | [IQueueQueryOptions](../interfaces/iqueuequeryoptions.md) |  {} | the query options, cf. IQueueQueryOptions |
`apolloQueryOptions` | [IApolloQueryOptions](../interfaces/iapolloqueryoptions.md) |  {} | - |

**Returns:** *Observable‹[Queue](queue.md)[]›*

an observable of Queue objects
