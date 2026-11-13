<p align="center">
  <img src="assets/brand/orbit-logo-readme.png" width="180" alt="Orbit logo" />
</p>

<h1 align="center">Orbit</h1>

<p align="center"><strong>Stay aligned with the life you're building.</strong></p>

<p align="center">
  <img alt="iOS 16.4+" src="https://img.shields.io/badge/iOS-16.4%2B-292724?style=flat-square&logo=apple&logoColor=white" />
  <img alt="Expo SDK 58" src="https://img.shields.io/badge/Expo-SDK%2058-E36B45?style=flat-square&logo=expo&logoColor=white" />
  <img alt="React Native 0.88" src="https://img.shields.io/badge/React%20Native-0.88-7E9270?style=flat-square&logo=react&logoColor=white" />
  <img alt="Local first" src="https://img.shields.io/badge/architecture-local--first-C7A77A?style=flat-square" />
</p>

<p align="center">
  A calm, private personal operating system for turning the life you want<br />
  into the choices you make today.
</p>

---

Orbit is an iPhone-first personal operating system that connects long-term goals to the tasks, habits, milestones, and reflections that shape each day. The mobile application is local-first: creating a task, completing a habit, or writing a reflection commits to SQLite before the interface reports success. Cloud sync and AI are optional enhancements.

### Designed for the day, connected to the bigger picture

| Today | Life Graph | Adaptive planning |
| --- | --- | --- |
| A focused daily plan that works offline. | Every task and habit can explain which goal it advances. | Evidence-backed suggestions remain proposals until you approve them. |

## Status

Orbit is under active development. The repository currently targets Expo SDK 58, React Native 0.88, iOS 16.4+, Go, PostgreSQL, and an incremental revision-based sync protocol. The primary design and test device is an iPhone 15 Pro Max. Android is intentionally out of scope.

## Repository

```text
apps/mobile/                 Expo Router iOS application
services/api/                Go REST API and sync service
packages/contracts/          Shared protocol types and schemas
packages/design-tokens/      Product color, spacing, and typography tokens
infrastructure/docker/       Local container configuration
infrastructure/terraform/    Deployment configuration
docs/architecture/           System, sync, data, security, and AI design
docs/decisions/              Architecture decision records
```

## How Orbit works

<p align="center">
  <img src="assets/architecture/orbit-ios-architecture.svg" width="100%" alt="Orbit iOS local-first architecture diagram" />
</p>

See [architecture overview](docs/architecture/overview.md) and [synchronization protocol](docs/architecture/synchronization.md).

## Prerequisites

- Node.js 22.13 or newer
- pnpm 11
- Xcode 26.4 or newer for local iOS builds
- Docker Desktop for PostgreSQL and API containers
- Go 1.24 or newer when running the backend outside Docker

Windows can run linting, TypeScript tests, backend tests, and Expo web tooling, but an iOS simulator or signed device build requires macOS/Xcode or EAS Build.

## Local development

```bash
cp .env.example .env.local
pnpm install
docker compose up -d postgres
pnpm api:run
pnpm ios
```

The mobile app remains useful without the API. Set `EXPO_PUBLIC_API_URL` only when testing sync. Store `OPENAI_API_KEY` in `.env.local` for the API service; it must never be added to `EXPO_PUBLIC_*` variables or bundled into the mobile app.

### Run on your iPhone from a Mac

1. Install Xcode, Node.js 22+, pnpm 11, and the Expo Go app on the iPhone.
2. Clone this repository and run `pnpm install` from its root.
3. Run `pnpm dev:mobile`, then scan the QR code with the iPhone Camera app while both devices are on the same network.
4. If local networking blocks the connection, run `pnpm --filter @orbit/mobile start --tunnel`.

Expo Go is the fastest daily loop. Before TestFlight or App Store submission, create a signed development build with EAS and verify notifications, Keychain, background behavior, accessibility, and release configuration on the physical phone.

## Verification

```bash
pnpm lint
pnpm typecheck
pnpm test
go test ./...
docker compose config
```

## Mobile builds

Development and App Store builds are defined in `apps/mobile/eas.json`.

```bash
pnpm --filter @orbit/mobile exec eas build --platform ios --profile development
pnpm --filter @orbit/mobile exec eas build --platform ios --profile production
```

Production submission still requires an Apple Developer account, final bundle identifier ownership, privacy disclosures, screenshots, app icon approval, and EAS project linkage. No deployment is claimed until a signed build and App Store Connect upload are verified.

## Privacy by design

- Guest mode requires no account.
- Core records live locally in SQLite.
- Cloud synchronization is opt-in.
- Reflection content is excluded from AI requests unless the user explicitly enables it for that request.
- AI output is a proposal; applying it always requires user approval.
- Access and refresh tokens belong in iOS Keychain through Expo SecureStore, never SQLite.

## Known limitations

- OIDC provider metadata and production hosting credentials are deployment-time configuration.
- Background sync timing is ultimately controlled by iOS.
- Local SQLite is not described as encrypted; highly sensitive tokens are stored separately in Keychain.
- The initial sync conflict policy merges independent fields and surfaces same-field conflicts; rich-text collaborative merging is not attempted.

## Roadmap

1. Offline-first onboarding and daily planning
2. Goals, milestones, habits, and reflections
3. Account linking and multi-device synchronization
4. Life Graph and adaptive recommendations
5. App Store hardening, accessibility audit, and signed release

