# ADR 0001: SQLite is the mobile source of truth

**Status:** Accepted

Orbit commits user mutations to SQLite before reporting durable success. Remote state is replicated through an outbox rather than treated as the primary store. This makes guest mode, poor connectivity, and long offline periods normal operating modes instead of edge cases.

