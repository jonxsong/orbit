# Architecture overview

Orbit uses a modular monorepo with a local-first iOS client and a stateless Go API. The mobile application owns immediate user interactions; the API adds optional identity, synchronization, export, and AI assistance.

## Mobile boundaries

- **Routes and screens** render domain state and gather intent.
- **Domain stores** coordinate use cases but do not bypass persistence.
- **Repositories** transact against Expo SQLite and enqueue sync mutations in the same local transaction.
- **Sync engine** pushes a bounded outbox batch, then pulls changes after a server cursor.
- **Secure storage** holds tokens and device secrets in iOS Keychain.

The UI updates after the local transaction succeeds. Network status never gates core creation, editing, completion, or reflection flows.

## Backend boundaries

- HTTP handlers validate transport input and return a consistent error envelope.
- Domain services enforce ownership, graph invariants, and recommendation rules.
- Repositories use pgx transactions and explicit SQL.
- Sync assigns a monotonic revision inside the same transaction as a mutation.
- The AI adapter accepts bounded snapshots and validates structured results before producing a pending proposal.

## iPhone product constraints

- Portrait-first layout tuned for the 430 × 932 point class used by iPhone 15 Pro Max.
- Primary actions remain reachable near the bottom safe area.
- Lists, not dense dashboards, are the default information architecture.
- Dynamic Type and screen-reader labels are first-class acceptance criteria.
- Motion uses transform and opacity, respects Reduce Motion, and avoids blocking data commits.

## Failure model

Local writes can fail and must surface a recoverable error. Sync can be interrupted at any point and resumes from the durable outbox and last acknowledged server cursor. The API can be unavailable indefinitely without preventing local use. AI failures degrade to deterministic recommendations.

