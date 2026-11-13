# Data model

All distributed entity IDs are UUIDs generated on the client. Synchronized records include `version`, `created_at`, `updated_at`, and optional `deleted_at`. Server revisions are change-stream positions, not record IDs.

## Core entities

- `users` and `devices` identify cloud principals and sync clients.
- `goals` contain intent, category, priority, target date, and lifecycle state.
- `milestones` belong to goals and may form an acyclic parent hierarchy.
- `tasks` are actionable records with scheduling, recurrence, and completion state.
- `habits` describe schedules; `habit_completions` are immutable occurrence events.
- `reflections` store private daily or weekly journal content.
- `relationships` provide typed edges among goals, milestones, tasks, and habits.
- `recommendations` store deterministic or AI proposals and approval state.
- `sync_mutations`, `sync_changes`, and `deletion_tombstones` implement replication.

## Progress

Goal progress is deterministic. A goal with explicitly weighted milestones is the sum of completed milestone weights divided by total weight. An unweighted goal is completed milestones divided by total milestones. A goal with no milestones reports an indeterminate state rather than an invented percentage.

## Device-local data

Onboarding state, notification authorization status, last successful sync diagnostics, transient UI preferences, and cached query projections remain device-local. Access and refresh tokens are not database records; they are Keychain items.

