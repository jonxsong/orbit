# AI architecture

AI is optional and server-side. Deterministic recommendation rules remain available offline and are the default source for overload, missed-task, deadline, habit-consistency, and blocked-milestone insights.

## Request boundary

The API builds a bounded snapshot containing only fields necessary for the chosen capability: active goal summaries, upcoming milestone dates, task completion aggregates, habit consistency, and available planning capacity. Reflection text is excluded unless the user explicitly enables it for that request.

## Output boundary

The OpenAI response must match a strict JSON schema with `type`, `title`, `explanation`, `evidence`, `proposed_action`, `confidence`, and `limitations`. Unknown fields and invalid enum values are rejected. Model output is treated as untrusted data.

Validated results become pending recommendations. They never mutate tasks, schedules, goals, or habits. A separate user-approved command applies a proposal after re-validating current record versions.

## Reliability

Calls have bounded input, a short timeout, limited retries for transient failures, per-user rate limits, and metadata-only usage logs. AI unavailability returns deterministic recommendations and a calm status message; it never blocks core workflows.

