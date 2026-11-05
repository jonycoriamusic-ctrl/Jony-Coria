# Musica a la carta

A mobile web app where bar guests scan the musician’s reusable QR, choose a song from the performing musician's repertoire, optionally add a dedication, and pay. The musician manages each night's capacity and queue from a phone. Jony is the first musician; accounts and data are separated for future musicians.

**Working direction: Next.js + TypeScript frontend, Express + TypeScript REST backend, Firebase Authentication and Cloud Firestore Standard.** The backend follows MVC/Clean Architecture; the frontend has explicit domain, application, presentation and state-management boundaries. Firebase was selected to reduce identity/realtime integration work. All business writes go through Express. The local demo uses an atomic JSON repository and bounded polling. Firebase integration uses verified identity and scoped Firestore operations through Express; direct browser Firestore/Storage access is denied. Live cloud deployment is pending the prerequisites recorded below.

Both guest and musician experiences are mobile first and responsive on tablet/desktop, with reusable Tailwind components and a shared monochrome theme. The production web app is registered in Firebase project `jony-coria`; Email/Password and anonymous Auth providers are enabled. Cloudinary image hosting is connected and verified. The production Firestore database exists, its rules and indexes are configured, and a read-only server connection has been verified. The API and frontend still need public hosting.

## Run locally

Requires Node.js 22 and npm. Firebase emulator checks also require Java 21. From this folder:

```sh
npm ci
npm run dev
```

Open <http://127.0.0.1:3000>. The Next.js frontend proxies `/api` to Express on `127.0.0.1:4000`. Both servers bind to localhost. No environment file or Firebase credentials are required for this demo; `.env.example` documents optional settings.

Musician login: **jony@demo.local** / **musica-demo**. Guests need no account. Demo login is refused in production mode. Use only test content: the alias `DEMO.NO.TRANSFERIR` is a placeholder and no money should be transferred.

Demo data and sessions persist in `.data/demo.json`, with images in `.data/media/`. Stopping the server preserves them. This single-process repository is intentionally local, not a production database. The QR points at localhost until the app has a public domain, so it cannot yet be scanned from another phone.

To test **real Firebase Email/Password registration and musician profile creation locally**, start a separate Firebase emulator preview with Java 21 and Node 22:

```sh
npm run dev:firebase
```

Open <http://127.0.0.1:3001/ingresar> and choose **Crear cuenta**. This preview uses local Auth, Firestore and Storage emulators, with a separate web build and API on port 4001; it never creates production accounts. The existing demo remains on port 3000. Emulator data is temporary unless exported separately. In a configured production deployment, the same registration flow uses the `jony-coria` Firebase project and stores each musician's profile in Firestore.

## Implemented

- Guest song search/filter, standard requests and dedications, ten-minute reservation, transfer instructions, private receipt upload, transfer claim, own request status and cancellation before transfer.
- Automatic queue entry on the guest’s “Ya transferí”, queue ordering, current performance, completion and direct-arrangement exceptions. Historical shows keep their requests visible.
- Repertoire add/edit/availability and CSV preview/import; show creation with Argentina start time, automatic switching behind one reusable musician QR, repertoire/capacity edits, pause/resume/finish and QR download. A scheduled show remains available for 24 hours or until a later show starts; a finished show does not reopen an older one.
- Public profile, avatar/banner upload, contact/social links, song price plus dedication add-on, and transfer alias. The guest sees the itemized dedication total before reservation and in the new request. Songs can be requested repeatedly while show capacity remains.
- Firebase Email/Password registration, email verification, musician onboarding, recovery and profile setup in Firebase mode. The local demo retains only Jony's sample login.
- Argentine Spanish plus English, Brazilian Portuguese, Italian and French interface dictionaries. Musician-entered content remains in its original language.
- Pending feedback for commands and optimistic song availability with rollback; payment and capacity success require a server acknowledgment.

## Verification

```sh
npm run typecheck
npm test
npm run build
```

The API suite covers capacity races, idempotency, ownership, good-faith queue entry, expiry, immutable quotes, show exclusivity, receipt privacy, image decoding, CSV validation and persisted state. The build command validates the API deployable and Next.js bundle. Production builds require the Firebase web variables and a real HTTPS API_ORIGIN; the demo cannot run as a production service. See the [implementation evidence](team/tasks/2026-11-05-local-application.md) for browser checks, independent review and remaining release gates.

## Start here

| Document | Purpose |
| --- | --- |
| [Engineering team](team/README.md) | Roles adapted from the existing shared builder-team template |
| [Product brief](docs/PRODUCT-BRIEF.md) | User flows, scope, interface states, and proposed business defaults |
| [Technical implementation](docs/TECHNICAL-IMPLEMENTATION.md) | Architecture, Firestore model, contracts, payment/capacity lifecycle, and delivery plan |
| [Firebase and Express](docs/FIREBASE-EXPRESS.md) | REST, identity, protected listeners, Clean Architecture and deployment |
| [Shared black-and-white theme](apps/web/src/styles/theme.css) | Tailwind v4 semantic color, typography, spacing, shape and layout utilities |
| [Layers and optimistic state](docs/APPLICATION-ARCHITECTURE.md) | MVC/Clean Architecture, frontend state ownership, optimistic updates and reconciliation |
| [Technology options](docs/TECH-STACK-OPTIONS.md) | Four monolithic web stacks, tradeoffs, scoring, official sources, and recommendation |
| [Hosting for Argentina](docs/HOSTING.md) | Proposed app/database regions, operating costs, recovery, and deployment requirements |
| [Quality and acceptance](docs/QUALITY-AND-ACCEPTANCE.md) | Failure scenarios, tenant/security boundaries, and release checks |
| [Decision register](docs/DECISIONS.md) | Confirmed requirements, recommendations, defaults, and open business inputs |
| [Planning task record](team/tasks/2026-11-05-engineering-foundation.md) | Actual team assignments, review results, and handoff |
| [Quality gates](team/QUALITY-GATES.md) | Adapted design, architecture, implementation, and release requirements |

## Product boundaries

Customer-facing language defaults to Argentine Spanish, with English, Brazilian Portuguese, Italian and French implemented as the current additional languages. Code and engineering documentation are English. Amounts are in ARS.

Payment initially means a direct transfer to the musician’s alias or optional CBU, an optional private screenshot, and good-faith acceptance when the guest taps “Ya transferí”. The CBU is validated as 22 digits and snapshotted on the request; bank details are shown only to that guest and the musician, never on the public profile. Public contact uses WhatsApp without a separate telephone field. No musician acceptance step is required. Guests have no signup/profile. Refunds or alternatives are arranged directly outside the system. A guest's “Ya transferí” immediately enters the queue without claiming independently verified bank settlement. Mercado Pago verification is a later phase with explicit provider and merchant-account decisions.

One QR contains a stable musician URL; all tables can use it, and the application resolves that musician’s single active show and current availability. It can be reused across the same musician's nights. A shared bar QR that switches between different musicians is a future venue-permissions feature.

The plan reserves capacity before showing transfer instructions, keeps queued requests from expiring, and preserves direct-arrangement exceptions. Transfer declarations do not automatically pause intake. Performing a song consumes the night's capacity permanently. There is no per-song request limit. The musician can increase or decrease the total show capacity directly from En vivo. A decrease preserves existing requests and at least one slot beyond songs already played: 7 played out of 8 cannot be lowered below 8. Firebase guest menus receive live capacity updates through a read-only Firestore projection; the local demo refreshes within about one second.

## Production Firebase setup

The only cloud environment currently requested is production: `jony-coria`. Its Standard `(default)` Firestore database exists in `nam5`, with restrictive rules and seven composite indexes created. The Jony demo stays local and has not been seeded into production. `config/prod.env.example` contains the registered public web SDK identifiers; it is not a service-account credential. `config/non-prod.env.example` describes optional local Firebase emulators with a synthetic `demo-` project ID. No cloud non-production project is created.

Run `npm run test:firebase` to exercise Firebase identity, database transactions and direct-access rules against local emulators. Run `npm run prepare:firebase` to build the standalone Node 22 HTTP function and prepare its production environment file. Preparation does not deploy anything or activate billing. Firebase deployment also runs this preparation hook, so rebuilding cannot discard the runtime configuration. The generated function export is `api`; its region defaults to `us-central1` to match the existing `nam5` database.

Before deployment:

- All seven Firestore indexes are Ready and a production server read succeeded. The existing `nam5` location cannot be changed. Automated Firebase CLI deployment needs `serviceusage.services.use` for `developer@inizia.agency`; rules and indexes were created through the console without that permission.
- Cloudinary Free is selected and live-tested for images. Supply its server credentials in the deployed host's secret settings; the local credential file is ignored by Git. Firebase Storage is not required for this provider. The optional Firebase Functions deployment still requires Blaze; external Express hosting remains possible and no paid plan has been activated.
- Set `API_ORIGIN` in the frontend hosting environment to the actual deployed function base URL (including `/api` for a function named `api`). Next.js appends the Express `/api/...` route. Configure Firebase Auth's authorized domain for the deployed frontend.
- Use managed server credentials on Firebase, or server-only secret credentials on another host. Never expose Admin credentials as `NEXT_PUBLIC_*` variables.
- Deploy the API and frontend, verify the full guest/musician flow, and review the exact release candidate. Keep the Jony test profile and requests in the local demo only.

See [Firebase production task](team/tasks/2026-11-05-firebase-production.md) for verified console state, tests and open release prerequisites. The current account also cannot edit the project display name; the requested name is Musica a la carta, while the immutable technical ID stays `jony-coria`. No live release has been completed. Physical-device acceptance remains pending.
