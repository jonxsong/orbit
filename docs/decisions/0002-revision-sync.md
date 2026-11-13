# ADR 0002: Server revisions order synchronization

**Status:** Accepted

The server allocates monotonic revisions for owner-scoped changes. Device timestamps are retained for display and diagnostics but never decide mutation order. Disjoint fields can merge through per-field versions; overlapping edits surface conflicts.

