# Application layers and optimistic interaction

> **Current policy update (2026-11-05):** The user removed musician payment approval. A guest’s “Ya transferí” immediately enqueues the request in good faith, retaining capacity and without setting bank-verification timestamps. Receipt upload remains optional/private. There is no review queue, confirmation endpoint or overdue-review intake pause. Earlier manual-review requirements below are superseded by this decision; independent bank/API verification remains absent.
The working direction is Next.js/TypeScript frontend, Express/TypeScript REST backend, Firebase Authentication and Cloud Firestore Standard. Use MVC with Clean Architecture on the server and frontend domain/application/presentation layers. The user selected Firebase to reduce identity/realtime integration work. The [Firebase and Express design](FIREBASE-EXPRESS.md) is the detailed source for routes, trust boundaries, repository layout and deployment.

## Server layers

| Layer | Responsibility | Boundary |
| --- | --- | --- |
| Express controller | Validate input/identity, invoke use case, map HTTP result | No direct Firestore mutations or pricing decisions |
| Application | Reserve, attach screenshot, declare transfer, record musician confirmation, perform; enforce tenant policy and coordinate transaction | Depends on focused domain/persistence contracts |
| Domain | Plain TypeScript entities, money, state/capacity rules | Imports no Express, Firebase or React |
| Infrastructure | Firebase Admin SDK, Firestore mapping/transactions, auth integration, future payment adapter | Implements application ports; credentials remain here |
| React presentation | Components, view models, local/pending states, accessibility | Receives typed DTOs and subscription events; no Admin SDK |

Runtime flow: Express route → controller → application use case → domain rules and infrastructure adapter → DTO. Source-code dependencies point inward. Firestore converters and runtime schemas support Firestore Admin repositories; use Zod or an equivalent validator at the input and persistence boundary. Share safe DTOs/error codes, never server credentials or repository implementations.

One repository contains `apps/web`, `apps/api`, shared contracts, and Firebase rules/indexes. The API exports an Express app independent of its hosting entrypoint. Use a Firebase HTTP wrapper or ordinary Node listener without changing domain code. The frontend and API are separate deployment units, but domain modules remain in one backend. Do not duplicate commands in Next.js Server Actions or cloud database triggers.

Firebase Web SDK handles login and protected read subscriptions. All business writes go through Express. Admin SDK access bypasses Security Rules, requiring API authorization and rule tests as separate boundaries. Private projections are updated in the same transaction as canonical requests/payments; whole-document rule permissions mean sensitive fields must be omitted or stored separately.

## Shared theme and reusable presentation

The actual theme source is [apps/web/src/styles/theme.css](../apps/web/src/styles/theme.css). It uses Tailwind CSS v4 `@theme` namespaces so tokens generate semantic utilities. [globals.css](../apps/web/src/app/globals.css) imports Tailwind and this theme; [postcss.config.mjs](../apps/web/postcss.config.mjs) declares the Tailwind PostCSS plugin. The frontend package/root layout is not scaffolded yet: install `tailwindcss`, `@tailwindcss/postcss` and `postcss`, lock compatible versions, then import `./globals.css` once in the Next.js root layout. Do not duplicate theme values in a TypeScript theme or legacy Tailwind config. Semantic tokens keep the palette monochrome while allowing future global changes in one file.

Tailwind is the user-selected styling approach. Use unprefixed utilities for phones, then `sm:`, `md:`, `lg:` and `xl:` only where the content benefits from wider layouts. Keep standard Tailwind breakpoints unless a measured layout requires an exception. For example, `grid grid-cols-1 gap-4 md:grid-cols-2 lg:gap-6` adapts a shared layout; `bg-action text-action-foreground rounded-control` styles a primary control. Reference: [Tailwind responsive design](https://tailwindcss.com/docs/responsive-design) and [theme variables](https://tailwindcss.com/docs/theme).

Reusable React components own complete class strings and typed variants. Keep variant maps static so Tailwind can detect them; do not generate fragments such as `bg-${color}`. Use `focus-visible:`, `disabled:`, `aria-*`, `data-*` and `motion-reduce:` variants for states and reduced motion. Scope exceptional arbitrary values to shared components, not copied throughout screens. Prefer composition over `@apply` component classes, per-screen CSS modules or CSS-in-JS. Custom CSS stays in the shared theme/global base and essential platform utilities only.

`pb-safe` adds the device safe area to mobile navigation; `pb-nav` reserves its minimum footprint in the content container. AppShell must account for any additional navigation height caused by wrapped labels/enlarged text (for example, an auto-sized layout row), rather than assuming the minimum is the rendered height. Navigation remains labeled and accessible across viewport/keyboard changes.

Proposed component boundaries:

| Location | Reusable components | Contract |
| --- | --- | --- |
| `src/components/ui/` | Button, IconButton, TextField, TextArea, Card, Badge, Skeleton, Dialog/Sheet | Typed variants, accessible labels/focus, loading/error/disabled states; no API calls or business rules |
| `src/components/layout/` | AppShell, PageHeader, BottomNavigation, ContentContainer | Shared safe-area spacing, labeled destinations, browser navigation, responsive sidebar/header adaptation |
| `src/features/musician-profile/presentation/` | MusicianAvatar, MusicianBanner, MusicianProfileHeader, ContactLinks, SocialLinks, ProfileImageEditor | Same profile display used on public page, show and editor preview; upload/editor behavior comes from application hooks |
| Feature presentation folders | SongCard, RequestStatus, QueueItem | Reuse within their domain; typed view models and callbacks, no Firebase/REST imports |

Reuse concrete patterns; do not build a configurable page-builder or a generic component with unrelated feature flags. Keep native links/buttons/form semantics. Use one coherent icon set, monochrome `currentColor` icons and visible labels. Error, success and pending states use explicit text/icons rather than red/green. Focus rings must remain visible on black and white surfaces. Subtle divider tokens are not sufficient for input boundaries; use the control-border token there.

Share the image picker/preview interaction where useful, but keep public profile publishing and private receipt uploading in distinct application gateways and authorization paths. Local image selection, crop coordinates, object URLs and upload progress remain local form state; revoke temporary URLs on replacement/unmount. The canonical cache stores only committed asset metadata. Failed updates retain the previous published image and preserve an editable draft. Publishing contact changes never changes the authentication email.

The theme defaults to a white canvas, black text/actions and neutral secondary surfaces. No dark-mode toggle or per-musician color customization is required. The bottom bar uses minimum sizing plus content and safe-area padding rather than a fixed height that clips enlarged text. Use `motion-reduce:transition-none` / `motion-reduce:animate-none` and test keyboard/screen-reader operation separately from appearance.

## Frontend state ownership

Use **TanStack Query** for remote data and mutations, React local state/reducers for view/form state, and the URL for shareable navigation. A small Zustand store is optional only if an actual cross-route draft cannot be handled cleanly by the route boundary; it is not an additional copy of the server cache. Avoid Redux plus Zustand plus Query for the same data.

| State | Owner | Lifetime |
| --- | --- | --- |
| Menu, own request including ready receipt metadata, musician queue | TanStack Query cache populated by REST and typed Firestore subscription adapters | One canonical cache; listeners own updates where active, REST handles initial/fallback reads |
| Pending request/claim and optimistic patches | Mutation state with operation ID | Until acknowledged, rejected, or reconciled after timeout |
| Search, genre, selected show, locale | URL where safe and meaningful | Navigable/bookmarkable; no tokens or dedication in URL |
| Dedication draft, field errors, selected option | Feature form reducer/local state | Current draft; avoid persistent private text by default |
| Dialog, expanded row, focus, toast | Local component/view model state | Current view |
| Login and guest access | Firebase Auth SDK identity, verified by Express and read rules | Email/password for musicians; no guest signup/profile, transparent anonymous guest session proposed; no duplicate token store or client-only permission decision |

Query keys include the authenticated principal/guest scope and show/request identity where relevant. Clear private caches on logout, account switch, or guest-session invalidation. Create query clients per server request; no global SSR cache can mix musicians' private results. Hydrate only authorized, minimal DTOs. Never put bearer recovery tokens into query keys, analytics, or persisted query caches.

The browser domain layer controls display eligibility, local input rules, and interaction state. The server revalidates everything. Frontend application hooks call a typed gateway and return view models; presentational components should not assemble URLs, inspect provider response formats, or decide what constitutes settlement.

## Immediate interaction and optimistic updates

Every interaction responds immediately. Optimism means a visible local prediction with reconciliation, not an invented successful payment or guaranteed performance slot. Initial data loading uses a stable skeleton; existing data remains visible during background refresh with a stale indicator when needed.

| Action | Immediate UI | What requires server acknowledgment |
| --- | --- | --- |
| Choose song/type, edit dedication, change language | Update selection, draft and preview instantly | Server rechecks quote and availability when reserving |
| Save biography or song metadata | Show new text with subtle saving state | Persisted result; restore relevant fields on definitive rejection |
| Toggle a song's future availability | Optimistically toggle with pending marker | Existing holds/paid requests remain intact; server checks version |
| Reserve a song | Open checkout shell and show “Reservando…” immediately | Hold ID, deadline, accepted price and payment instructions only after commit |
| Press “Ya transferí” | Show “Enviando aviso…” and keep the same operation ID | Show durable review status after receipt; this never means payment verified |
| Musician verifies payment | Pending row/action feedback immediately | Confirmed queue entry only after server records verification |
| Start/finish performance | Preview requested transition with “Guardando…” | Canonical playing/played state and single-playing constraint |
| Cancel, change recipient, close show | Pending feedback with deliberate action confirmation | Server preserves commitments and truthful status; direct arrangements/refunds are outside the app |
| Attach transfer screenshot | Local file preview and upload progress/error | Show durable receipt only after validated upload/attachment; never imply confirmed payment |
| Reorder confirmed queue | Pending proposed order | Server validates ownership, queued states and expected queue version |

If two guests want the last song, both may see a pending checkout, but only the winner receives payment instructions. The losing guest keeps their draft and receives an updated menu. Predictive UI does not consume authoritative capacity.

### Mutation and reconciliation protocol

1. Generate an operation/idempotency key once per user intent. Include expected entity version where applicable.
2. Register the pending operation, cancel affected refetches when appropriate, and apply only its allowed optimistic field patch or temporary UI row.
3. Disable or serialize conflicting edits to the same resource. Independent resources may update concurrently.
4. On success, replace the prediction with the canonical server response and invalidate affected keys, including queue/menu availability.
5. On a definitive validation/conflict rejection, remove only that operation's patch, retain the editable draft, and refetch. Never restore a whole stale queue snapshot over newer data.
6. On timeout/disconnection, the outcome may be unknown. Keep a clear “Comprobando…” state and reconcile using owned status or the same idempotent retry. Do not invent rollback of an operation that may have committed or instruct the guest to pay again.
7. Merge polling responses by entity version and pending operation identity. A late response cannot overwrite newer confirmed state. Pending overlays never change the canonical cached payment truth.

TanStack Query documents both UI-based optimistic updates and cache update/rollback patterns. Prefer temporary UI overlays for sensitive operations and cache patches for reversible metadata. [TanStack Query optimistic updates](https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates).

Retain focus during updates, announce meaningful status changes accessibly, and respect reduced motion. Loading should be local to the affected control/section. No simulated countdown, animation, or cached menu can authorize a transfer while the server is unavailable.

## Realtime and free-tier usage

Listen to the owning musician's current-show queue and the guest's own status projection. Feed versioned snapshots into TanStack Query; never poll the same key while its listener is healthy or keep a second authoritative queue store. Unsubscribe on logout/show switch, hidden screens and terminal guest states; clear private caches on identity changes. Do not interpret cached offline snapshots as newly confirmed availability or payments.

Keep public menu retrieval bounded through REST, refreshed on focus and before reservation plus a proposed 15-second visible-page interval for musician live edits. Suspend when hidden/offline. This public refresh is distinct from private queue/status listeners. Where listeners fail, enable explicit REST fallback with five-second musician and fifteen-second guest refresh, hidden/terminal suspension and error backoff. These intervals no longer define the normal realtime path.

Firestore listeners consume reads for initial matching documents, changes and some reconnections. Every guest listens only to their own request, not the entire show queue. Avoid rewriting every guest document whenever queue position changes; show approximate position from on-demand bounded reads or omit it until a cost-tested approach is selected. Measure daily reads/writes, projection fanout, API invocations and auth usage before claiming a free-tier fit. [Firestore billing](https://firebase.google.com/docs/firestore/pricing).

## Acceptance checks before implementation is accepted

- Import-boundary check: domain imports no Next.js, React, Firebase Admin SDK, provider SDK, or environment secrets; presentation imports no server infrastructure.
- Emulator rules/API tests plus staging Firestore transaction tests: two last-slot contenders, same-song contenders, claim/expiry race, show close/verify race, idempotent retry, duplicate bank movement, and tenant denial.
- UI tests: optimistic save rejection, conflicting edits, delayed older response, polling during a pending mutation, ambiguous timeout after commit, banking-app interruption, and logout cache clearing.
- Financial UI tests: no transfer destination before a committed hold, no false paid state, no duplicate transfer prompt, and no in-app refund state or workflow.
- Responsive/accessibility checks: phone, tablet and desktop; immediate local feedback without focus loss, full-page blocking spinners, or hidden errors.

These are implementation criteria. No application, runtime benchmark, or device test is claimed by this planning update.
