# Synchronization protocol

## Goals

The protocol is incremental, idempotent, bounded, resumable, and explicit about conflicts. It does not use wall-clock timestamps to order distributed writes.

## Client state

Each client owns a UUID device identifier, a durable mutation outbox, per-record versions, and the most recently applied server cursor. A domain mutation and its outbox entry are committed in one SQLite transaction.

## Push

`POST /v1/sync/push` accepts up to 100 mutations. Every mutation contains a client-generated mutation UUID, device UUID, entity UUID, entity type, operation, base server version, schema version, and changed fields. The server stores mutation IDs under a uniqueness constraint, so retries return the original result.

For a new mutation the server:

1. Locks or creates the target record.
2. Checks ownership, tombstones, graph invariants, and the base version.
3. Merges independent field changes when their field versions prove they do not overlap.
4. Creates a conflict for overlapping scalar changes rather than silently overwriting them.
5. Allocates a global monotonic revision in the transaction.
6. Stores the change event and mutation result before committing.

The client removes an outbox row only after receiving its mutation-specific acknowledgement.

## Pull

`GET /v1/sync/pull?after=<cursor>&limit=500` returns owner-scoped changes ordered by server revision plus `next_cursor` and `has_more`. Applying the batch and advancing the local cursor happen in one SQLite transaction. An interrupted batch is safe to replay.

## Conflict policies

| Record | Policy |
| --- | --- |
| Task, goal, milestone, habit | Merge disjoint fields; surface overlapping field edits |
| Habit completion | Event identity is `(habit_id, occurrence_key)`; duplicate delivery is idempotent |
| Reflection | Surface overlapping body edits; never send content to AI implicitly |
| Relationship | Validate ownership and cycles transactionally |
| Deletion | Tombstone wins over stale edits; restoration is an explicit new mutation |

## Retry

Transient failures use exponential backoff with full jitter, capped at five minutes. Authentication failures pause sync while the client refreshes through Keychain-backed credentials. Schema incompatibility pauses the affected mutations and prompts for an app update; it does not discard the outbox.

## Limits

This protocol does not provide real-time collaborative text editing or end-to-end encryption. Large attachments are outside the first protocol version. Server revision order guarantees a stable change stream, not causality between unrelated offline devices.

