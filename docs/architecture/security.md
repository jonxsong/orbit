# Security and privacy

## Trust boundaries

The iOS client is untrusted from the API's perspective. Every cloud request is authenticated, every record query is owner-scoped, and client-supplied user IDs are ignored. Local-only guest data never leaves the device unless the user enables cloud sync.

## Secrets

- OpenAI credentials exist only in server runtime configuration.
- OIDC tokens are stored through Expo SecureStore (iOS Keychain).
- `.env.local` and every `.env.*` variant are ignored by Git.
- Logs redact authorization headers, journal text, AI inputs, and tokens.

## Data deletion and export

Account deletion requires recent authentication, marks the account pending deletion, revokes devices, removes user-owned rows transactionally, and records a minimal audit event without content. Export produces a versioned archive of user records and relationships.

## Accurate claims

TLS protects remote transport in production. Orbit does not claim end-to-end encryption. SQLite database encryption is not part of the initial implementation; device-level iOS data protection and Keychain storage protect the device boundary.

