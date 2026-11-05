# Superseded PostgreSQL implementation reference

Historical reference only. Superseded as the working proposal by the low-cost MongoDB plan in TECHNICAL-IMPLEMENTATION.md. Its PostgreSQL schema, lock protocol and former hosting budget apply only if the SQL alternative is deliberately selected.

Use a modular monolith with PostgreSQL, server-rendered or framework-integrated responsive pages, and a small amount of browser interactivity. One codebase serves the public song menu and the authenticated musician portal. SQL transactions own availability, capacity, and queue transitions. A scheduled command from the same application expires abandoned holds and reports overdue payment reviews.

The working framework direction is Next.js App Router with TypeScript, reflecting the Product Owner's preference. Use server-side application functions behind Route Handlers/Server Actions for all reservations, payment verification, and tenant authorization. Proposed hosting is Vercel with Supabase PostgreSQL, both in São Paulo; see [hosting for Argentina](HOSTING.md). Under that deployment, an authenticated scheduled Route Handler invokes the same maintenance use case. No continuously running Node process is assumed.

### Mobile first with tablet and desktop support

Design both guest and musician journeys from a 360 CSS-pixel phone layout, then adapt to tablet and desktop. Use responsive CSS and content-driven breakpoints, with representative checks at 768, 1024, and 1440 CSS pixels. Phone uses a clear single-column flow; wider screens may pair menu and order details or queue and selected request. Keep every feature available at every supported size. Support touch, keyboard, mouse, visible focus, zoom, screen readers, portrait/landscape tablets, and safe-area insets. Avoid hover-only controls and horizontal page overflow. Retain input, selection, and request identity across resizing or rotation. No separate mobile app or device-specific business logic is needed.

The first pilot is Jony in an Argentine bar. The data model supports other musicians without sharing their repertoire, payment details, or requests. Framework choice is a separate decision in [stack options](TECH-STACK-OPTIONS.md). This document specifies behavior and boundaries, not a deployed application or an approved architecture.

## 1. Scope and working defaults

| Concern | Proposed MVP behavior |
| --- | --- |
| Public customer | No account required; private browser session owns each request |
| Musician | Verified email/password account, profile, repertoire, payment details, and shows |
| Request | Exactly one song and one performance slot; either standard or dedicated |
| Prices | Two final ARS totals: standard price and dedicated-song price; dedication is not an ambiguous surcharge |
| Dedication | Required only for dedicated requests, 1–280 Unicode characters after trimming; plain text |
| Show capacity | Musician enters maximum request performances for that show; completed songs still consume capacity |
| Song availability | One performance per song per show by default; repeats and bundled dedications are deferred |
| Payment | Guest transfers directly to musician's alias/CBU; musician checks actual account credit |
| Unpaid hold | 10 minutes from server creation, bounded by request cutoff |
| Submitted transfer | Retains its slot until explicitly resolved; alert after 15 minutes, pause new intake while overdue |
| Queue | First verified payment first; manual queue reordering deferred |
| Locales | `es-AR` default; `en`, `pt-BR`, `it`, `fr`; last two await product confirmation |
| Currency and time | ARS only; integer centavos; UTC persistence and `America/Argentina/Buenos_Aires` display |
| Venue ownership | Each musician manages their own venue/table records; shared bar ownership/routing is later |

A musician's maximum request count excludes any planned personal set unless entered as unavailable capacity. For example, Jony can perform 30 songs but reserves 10 for his own set: he opens 20 request slots. The setup UI must explain this distinction. No time-of-performance guarantee is inferred from a queue position.

## 2. Application shape

```mermaid
flowchart LR
    Guest[Guest mobile browser] --> Web[Monolithic web application]
    Musician[Musician mobile portal] --> Web
    QR[Printed table QR] --> Guest
    Web --> Auth[Identity and authorization]
    Web --> Catalog[Profiles and repertoire]
    Web --> Shows[Shows and table routing]
    Web --> Requests[Reservations and queue]
    Web --> Payments[Manual payment review]
    Auth --> DB[(PostgreSQL)]
    Catalog --> DB
    Shows --> DB
    Requests --> DB
    Payments --> DB
    Jobs[Scheduled command from same codebase] --> DB
    Web -. later .-> MP[Mercado Pago]
```

Use framework modules/directories for `identity`, `musicians`, `catalog`, `shows`, `requests`, and `payments`; these are code boundaries, not services. Framework controllers/actions validate inputs and call explicit use-case functions. Keep pricing and request transitions in one server implementation. Avoid a generic repository layer, event bus, public API platform, separate SPA backend, or distributed cache until justified.

A production deployment needs an HTTPS web process, managed PostgreSQL, and a scheduled invocation of the same application's maintenance command. A database-backed job runner may be added if the selected framework needs one for email. Receipt uploads are not required for the MVP. Profile photos may use object storage with a public sanitized derivative; default avatar keeps onboarding usable without a photo.

## 3. Primary flows

### Guest

1. Scan table QR or open musician's public page. Resolve the current show and display musician, venue/table, show date, availability, and locale switcher.
2. Search/filter the repertoire available for this show. Display standard and dedicated totals before selection.
3. Choose request type; enter dedication only when needed. Show the full amount, reservation period, manual verification, and policy for a show that cannot fulfill the request.
4. Submit once. Server atomically creates the hold and immutable quote. Only the resulting checkout shows recipient, alias/CBU, exact amount, reference, and countdown.
5. Transfer in banking app; return and press **“Ya transferí”** with payer name and transaction/reference information available to the guest. This is a payment claim, not verification.
6. See **“Estamos verificando tu transferencia”**. After actual credit is verified, see **“Tu canción está en la fila”**, own request status and approximate position.
7. Follow `queued → playing → played`, or an explicit exception with an operator contact/reconciliation path. Guests cannot read another guest's dedication, name, transfer data, or status by guessing an ID.

### Musician

1. Register, verify email, create public profile, enter recipient display name and alias/CBU, and verify those details personally.
2. Add/edit songs or import a validated CSV; choose the musician’s standard and dedicated total prices.
3. Create a show with venue, timezone, start, request cutoff, capacity, repertoire subset, and confirmed payment destination; print/download table QR labels.
4. Open intake explicitly. The portal has separate **Transfers to review**, **Confirmed queue**, **Playing**, **Completed**, and **Exceptions** views with counts.
5. Check account credit outside the app; verify exact payment or record an exception. The app cannot read the bank account in the MVP.
6. Start and finish performances in verified FIFO order, disable new requests for a song, or pause intake.
7. Close intake and finish the show. Unperformed paid requests and unresolved transfers require visible reconciliation rather than disappearing into an archive.

## 4. SQL data model

Use UUID primary keys and `timestamptz` timestamps. Tenant-owned records carry `musician_id`. Every mutation derives the authorized musician from the server session; it does not trust an incoming tenant ID.

| Table | Essential columns and purpose |
| --- | --- |
| `users` | `id`, unique normalized email, framework password hash, verification timestamp, preferred locale; framework-managed sessions and recovery tokens |
| `musicians` | `id`, unique `owner_user_id`, unique public slug, display name, biography, photo key, default standard/dedicated prices, active flag |
| `payment_accounts` | `id`, `musician_id`, stable `recipient_account_key`, version, recipient name, alias, CBU, active flag; new version on changes |
| `venues` | `id`, `musician_id`, name, timezone; private management record, public name only |
| `venue_tables` | `id`, `musician_id`, `venue_id`, table label, random public QR token, enabled flag |
| `shows` | `id`, `musician_id`, `venue_id`, name, scheduled start, cutoff, timezone, status, capacity, standard/dedicated total prices, payment-account version, queue sequence, row version |
| `table_routes` | `table_id` unique, `musician_id`, `show_id` nullable, version; explicit destination behind permanent table URL |
| `songs` | `id`, `musician_id`, musician song code, title, original artist, genre/tags, active flag; per-song price overrides deferred |
| `show_songs` | `id`, `musician_id`, `show_id`, `song_id`, enabled flag, snapshotted title/artist and final prices; unique `(show_id, song_id)` |
| `guest_sessions` | `id`, secret hash, created/expiry times; no guest account or required email |
| `song_requests` | `id`, `musician_id`, `show_id`, `show_song_id`, `table_id NOT NULL`, guest session ID, recovery-token hash, status, `capacity_retained`, type, dedication, amount, currency, hold deadline, review deadline, accepted time, queue rank, row version |
| `payment_claims` | `id`, `musician_id`, request ID, payer name, guest reference, claimed time; immutable submitted claims and correction history |
| `payments` | `id`, `musician_id`, request ID, method, state, expected/observed amount, bank reference when available, provider IDs later, verified-by/time, refund tracking |
| `request_events` | `id`, `musician_id`, request ID, actor, prior/new state, reason code, minimal metadata, time; append-only audit |
| `idempotency_keys` | scope, key, request-body hash, outcome/resource ID, expiry; unique `(scope, key)` |

`payment_accounts` version changes affect future shows; a show's active destination is frozen once intake opens. To change it, pause new intake and create an explicitly reviewed new payment configuration for future requests. Existing requests keep the original recipient/alias/CBU snapshot so transfers already made remain reconcilable. Never overwrite payment instructions on an existing hold.

Store request-time snapshots of song title/artist, request type, dedication text, price, currency, recipient details, locale, venue/table label, and policy version. Changing a repertoire item, profile, or price must not rewrite an accepted customer's purchase. Archiving songs is preferable to deleting referenced rows.

### Constraints and indexes

- `CHECK` nonnegative prices, positive configured capacity, nonnegative observed payment amounts, ARS currency, valid status/type values, and dedication required iff type is `dedicated`.
- For MVP, require dedicated total at least standard total; allow equal totals deliberately. Whether zero-price requests are allowed is a product decision; default require positive prices for this paid flow.
- Composite unique keys `(id, musician_id)` support composite foreign keys from child rows; ensure request, show, show song, table, and payment share a musician. Include show ID in the show-song reference to prevent selecting a song from another show.
- Validate table venue equals show venue. A table route can point to only one show and only the same musician/venue. Avoid arbitrary cross-tenant URLs in routes.
- Partial unique constraint for one active (`open`, `paused`, or `intake_closed`) show per musician-owned venue. Different venues may have concurrent shows, so direct links must resolve explicitly.
- Partial unique constraint for one `playing` request per show. Partial unique constraint for one capacity-consuming request per show song under the no-repeat policy; expired holds must first be transitioned under the show lock.
- Unique `(show_id, queue_rank)` for queue ranks where non-null. Assign monotonically at verification under the show lock; ranks are immutable in the FIFO MVP.
- Unique provider payment ID scoped to provider account when later introduced. A bank transaction ID is unique with the stable `recipient_account_key`, shared across all versions of that actual receiving account; changing an alias/version must not permit reusing the same credit. Resolve account identity when configuring the recipient, and keep ambiguous identity/movement matching unresolved. Never fabricate uniqueness from payer name + amount alone.
- Index requests by `(musician_id, show_id, status, queue_rank)`, holds by `(status, hold_expires_at)`, reviews by `(status, review_due_at)`, songs by tenant and normalized search fields, events by request/time.
- No database column grants a browser permission to change state; every transition still needs authorization and precondition checks.

PostgreSQL ownership checks, composite foreign keys, and scoped queries form the MVP isolation boundary. Row-level security is an optional additional layer if the selected framework can set and reset tenant context safely on every pooled connection. Do not claim RLS protection without testing it. Administrative maintenance queries require a separately scoped operational path and audit.

## 5. Catalog and pricing

Provide an editable structured catalog, not only a menu image/PDF: the application needs song IDs and availability. Manual add/edit plus CSV import satisfy initial repertoire upload. The import template uses English headers: `song_code,title,artist,genre,active`.

CSV workflow: upload → parse bounded UTF-8 input → validate each row → preview additions/updates/errors → confirm atomic import. Proposed limits: 1 MB and 2,000 rows; unknown columns, including unsupported per-song prices, receive actionable validation errors. Never execute formulas. Escape formula-leading content when later exporting to spreadsheet software.

Use musician-owned `song_code` for idempotent updates. Exact code duplicates are errors; normalized title/artist similarities are warnings rather than silent merges. No import deletes omitted songs. Store musician/show prices as integer centavos after exact decimal parsing. Opening a show copies its two final prices to `show_songs`; per-song overrides can be added later without changing existing request snapshots.

During an open show, price changes apply to newly created requests only, with a new menu version. A guest who loaded an old menu receives `PRICE_CHANGED` and explicitly accepts the new amount before a hold is created. Existing holds retain the server quote until expiry. A song disabled for new requests does not cancel existing reservations or confirmed performances.

## 6. Permanent QR and live availability

Encode a stable first-party HTTPS URL such as `/t/{random_token}` in each QR; the pixels remain unchanged while the database routing and live page change. No external dynamic-QR subscription is needed. A QR conveys public context, not authorization or proof that someone is physically at the table.

`table_routes` explicitly selects the current show. The musician previews the destination before activating routes. Binding requires same musician and venue, enabled table, and an openable show. Do not automatically select “today's newest show,” which becomes ambiguous after midnight or for overlapping events. Keep table context on checkout; a stale browser submitting an earlier show receives `SHOW_CHANGED` and must refresh.

A public `/m/{slug}` page shows the musician's current open show. If multiple shows are published, let the guest choose venue/date rather than silently route them. A non-table link requires the guest to choose and confirm an enabled table currently assigned to that show. Return allowed table labels and opaque tokens from a show-scoped public table endpoint, then revalidate the selected table on submission. A table label supplied by the browser is never trusted as a routing authority.

Return `available`, `temporarily_reserved`, `already_requested`, `played`, `disabled`, `paused`, `full`, or `closed` as appropriate. Public counts may be shown; never expose private request rows. Disable checkout when the page is stale/offline, then let the server make the final decision after refresh.

MVP QR permanence is within a musician's venue/table namespace. The same physical bar rotating different musician accounts would need shared venue ownership and authorized route assignment; this is a separate extension. Do not promise that one musician can redirect another's table QR.

## 7. State and capacity rules

Keep performance/request state separate from evidence of money. A bank transfer is external to the database transaction and cannot be rolled back by cancelling a request.

| Request state | Meaning | Consumes a slot? |
| --- | --- | --- |
| `held` | Unexpired quote, waiting for transfer claim | Yes until server expiry |
| `review_pending` | Guest says transferred; musician checks credit | Yes, including overdue review |
| `queued` | Full matching payment verified; awaiting performance | Yes |
| `playing` | Current performance | Yes |
| `played` | Performance completed | Yes for the remainder of this show |
| `expired` | Unclaimed hold timed out | No |
| `cancelled` | Explicitly resolved before performance | No; money may remain a refund obligation |
| `exception` | Late/mismatched/duplicate payment or unfulfillable request | Explicit `capacity_retained` flag; default retain if already allocated |

For `exception`, record a structured reason and whether its previously allocated slot remains retained. The flag can only change inside the same show-locked transition that evaluates capacity. This avoids forcing “money received but no slot” into the normal queue or releasing a paid slot invisibly.

Payment states: `awaiting_transfer`, `claimed`, `verified`, `not_found`, `mismatch`, `refund_due`, `partially_refunded`, `refunded`. A later electronic provider may add `pending`, `rejected`, `chargeback`, and provider-specific reconciliation details. Payments remain recorded after request expiry/cancellation.

Allowed common transitions:

```text
held → review_pending → queued → playing → played
held → expired
held → cancelled                         (guest confirms no transfer made)
review_pending → exception               (mismatch or uncertainty)
review_pending → cancelled               (explicit operator resolution)
expired/cancelled → exception            (later money discovered)
exception → queued                       (full payment and capacity re-acquired)
exception → cancelled + refund_due       (cannot perform)
queued → cancelled + refund_due          (musician cannot perform)
```

Do not allow a guest to cancel a claimed transfer and instantly reclaim capacity. Send it to review. Do not mark a performed request unperformed to make capacity available; a correction requires an audited operator action and never erases actual performance history.

### Reservation transaction

All capacity-changing commands lock the same `shows` row first. Use a short PostgreSQL transaction and a consistent lock order: affected show rows sorted by ID → table route if applicable → relevant show-song/request → payment. A route update locks both previous and destination show rows in that sorted order, then the route row, rechecks its expected version/current binding, and retries from the start if the binding changed while locks were acquired. A reservation locks its requested show and then the route row, verifies the binding under that lock, and rejects stale routing. It never follows a changed route to lock another show out of order. This serializes route changes against reservations without a check-then-write race. No bank/provider network calls inside the lock.

1. Check the guest session, request body, rate limit, and idempotency key. An already completed matching key returns the prior outcome; the same key with different content returns conflict.
2. Lock the show. Read server time and expire unclaimed due holds for this show within this transaction.
3. Verify show is open, before cutoff, table route still matches, song is enabled, menu price/version is accepted, and guest has no other unresolved hold for this show.
4. Compute consumed slots from unexpired `held`, `review_pending`, `queued`, `playing`, `played`, and capacity-retaining exceptions. Require consumed < capacity. Check the show's no-repeat song constraint.
5. Create request, immutable quote/payment destination, initial payment row, and event. Hold deadline = earlier of now + 10 minutes or cutoff. Refuse a new hold if insufficient practical checkout time remains; proposed minimum 2 minutes.
6. Save the idempotency outcome and commit. Return the same request on client retry. Handle unique-key collisions by reloading the original outcome, never by creating a second hold.

The same show lock serializes expiry, verification, capacity edits, cancellation, and queue transitions. Capacity cannot be lowered below consumed slots; increasing it is explicit. A failed transaction cannot send a success screen. Browser calculations are informational only.

### Transfer claim and review

Claim submission locks the show/request, verifies guest ownership and the hold deadline, then sets `review_pending`, `claimed_at`, and `review_due_at = claimed_at + 15 minutes`. Duplicate claims return the existing result. A claim received after expiry becomes an exception; do not revive capacity automatically.

At review deadline, retain capacity, flag overdue, and pause new intake. The musician verifies, investigates, or explicitly resolves the claim. Pausing is safer than collecting more transfers while reconciliation is unattended. A maintenance delay cannot skip this rule: new-reservation commands also check overdue reviews transactionally.

Verification requires recipient, currency, full amount, actual account credit, and transaction identifier when supplied by the bank. A receipt alone, payer name alone, or **“Ya transferí”** is insufficient. Record verifier, time, observed amount, and reference. If these do not match, record an exception; do not silently top up, discount, or accept a partial payment. Duplicate credits and overpayments remain visible for reconciliation/refund.

On verification, atomically change `review_pending → queued`, mark payment `verified`, and assign a monotonically increasing queue rank. FIFO is based on verified acceptance, not QR scan time or an unverifiable transfer claim. Store bank transaction time separately when known. Manual reordering is deferred; FIFO sequence is immutable in the MVP.

### Late money and refunds

A late verified transfer after expiry may find the song or last slot already allocated. Under the show lock, re-check show status, cutoff policy, song availability, and capacity. Only re-acquire if it can be honored and the guest accepts any changed arrangement; preserve the original price. Otherwise set a refund obligation and show the exception to both parties.

Manual refunds happen outside the app. Capture amount, operator, timestamp, and bank reference after execution; `refund_due` is not `refunded`. Retain the private request-status page with a **“Necesito ayuda con mi transferencia”** action after expiry/cancellation. It accepts a late claim/reference and creates an operator-visible exception in the musician portal; it never silently books capacity. The same view shows the operator resolution/reply. No external email/WhatsApp support channel is assumed. If bank details are needed for return transfer, collect them privately only for that purpose with access/retention controls.

For an ambiguous payment, never invent a settlement result. The operator may release capacity only through an explicit recorded decision acknowledging possible later credit; later credit must still enter the exception process. Partial refunds remain open until the obligation is satisfied.

## 8. Show lifecycle and queue behavior

`draft → open ↔ paused → intake_closed → finished`; a show may be `cancelled` with outstanding obligations retained. Opening requires verified musician contact, valid payment details, at least one enabled song, positive capacity, valid time window, and table routes as applicable.

- **Pause:** blocks new holds; honors existing unexpired quotes and claims. Resume requires overdue reviews resolved. It does not stop the musician performing already confirmed requests.
- **Close intake:** blocks new holds; existing valid holds may finish until their deadlines. The normal cutoff closes intake; it does not mean the musician has stopped performing.
- **Finish now:** closes unpaid holds, prevents new confirmations from entering performance automatically, and converts unplayed paid/claimed requests to visible exceptions for fulfillment/refund decisions. Warn with exact outstanding counts before committing.
- **Cancel show:** stops intake, records the reason, expires unpaid holds, and creates reconciliation/refund obligations for claimed or verified funds. Never bulk-mark these as refunded.
- **Playing/played:** explicit one-tap state changes with optimistic version checks. Only one song can be `playing`; retry of the same action is harmless.

Portal polls while visible, proposed every 5 seconds, with a queue version/ETag and backoff to 15–30 seconds on errors. Refresh immediately on foreground return. The guest menu and own status poll every 5 seconds while visible. A **“Última actualización…”** indicator and manual refresh prevent false confidence during poor signal.

Start with polling; server-sent events are an optional later optimization. Polling failures do not change server state. No offline payment confirmations, background auto-play, or service-worker caching of private queue/payment responses. A future installable PWA can cache only safe static assets.

## 9. HTTP contracts

Paths are illustrative; use framework-native routes/actions while retaining these semantics. Authenticated mutations use session cookies and CSRF protection. Guest mutations also require their session, CSRF/origin validation, and idempotency keys where effects can repeat.

| Method and route | Contract |
| --- | --- |
| `GET /m/{slug}` | Public profile and current published shows, no private bank metadata |
| `GET /t/{token}` | Resolve table context and current show, or inactive/closed state |
| `GET /public/shows/{id}/tables` | Enabled table labels/tokens assigned to this show, for direct-link selection |
| `GET /public/shows/{id}/menu` | Public song list, totals, remaining count, show/menu version, server time |
| `POST /public/shows/{id}/requests` | Body: song ID, type, dedication if any, table token if applicable, accepted price/menu version; creates hold |
| `GET /public/requests/{id}` | Requires guest ownership; own amount, state, deadline, recipient instructions while valid, approximate queue position |
| `POST /public/requests/{id}/transfer-claim` | Payer/reference fields; claim only, never payment approval |
| `POST /public/requests/{id}/help` | Owned request only; report late transfer or reconciliation issue into musician exceptions inbox, including after expiry; no automatic booking/approval |
| `POST /public/requests/{id}/cancel` | Unclaimed hold cancellation or claimed-payment review request |
| `GET/PUT /portal/profile` | Own profile, defaults and locale |
| `GET/POST/PATCH /portal/songs` | Tenant-scoped structured repertoire, archive rather than destructive deletion |
| `POST /portal/catalog-imports/preview` | Validated preview token, row errors, totals; no catalog mutation |
| `POST /portal/catalog-imports/{id}/commit` | Atomic explicit apply; idempotent import identity |
| `GET/POST/PATCH /portal/shows` | Own shows, dates, repertoire, capacity and payment configuration |
| `POST /portal/shows/{id}/open-or-pause` | Explicit command and expected version; authorization + lifecycle rules |
| `PUT /portal/tables/{id}/route` | Bind own table to own show in same venue; expected route version |
| `GET /portal/shows/{id}/queue` | Private queue/review/exception projection; version/ETag support |
| `POST /portal/requests/{id}/verify-payment` | Actual observed amount/reference, expected version; verifies and queues atomically |
| `POST /portal/requests/{id}/resolve` | Explicit exception/cancellation/refund command with reason and expected version |
| `POST /portal/requests/{id}/start-or-complete` | Legal state transition; duplicate-safe |
| `POST /portal/shows/{id}/finish` | Counts + expected version and explicit outstanding-obligation handling |

Return stable English machine codes plus localized user messages. Examples: `SHOW_CHANGED`, `SHOW_CLOSED`, `SHOW_PAUSED`, `CAPACITY_FULL`, `SONG_UNAVAILABLE`, `PRICE_CHANGED`, `HOLD_EXPIRED`, `REVIEW_REQUIRED`, `STALE_VERSION`, `IDEMPOTENCY_CONFLICT`. Use 401/403 for authentication/authorization, 404 for non-visible resources, 409 for conflicts, 422 for validation, and 429 for throttling. Do not leak another tenant's resource existence.

Creation response contains request ID, status, amount in centavos/currency, server time, deadline, and status URL. Display a countdown based on server time; the database deadline controls acceptance. After a timeout, retry the same idempotency key or fetch owned request status before presenting another transfer instruction.

## 10. Identity, privacy, abuse, and localization

Use the chosen framework's maintained authentication, password hashing, email verification, recovery, secure session rotation, HttpOnly/Secure/SameSite cookies, and CSRF protections. Rate-limit login/recovery and sensitive payment-account changes; require recent reauthentication for changing recipients. Never store passwords or provider tokens in browser storage.

Guest access uses a high-entropy server-issued session cookie. UUIDs and short display references are not secrets. A separate high-entropy recovery capability restores one request on another browser; offer a private recovery link when reserving, store only its hash, exchange it for session access, and strip it from the visible URL/history. Use `Referrer-Policy: no-referrer`, redacted access logs, no third-party analytics on checkout/status, and `Cache-Control: private, no-store` for private responses.

Require ownership checks on every profile/catalog/show/payment/request endpoint, including imports and downloads. Expose a dedicated public projection, not a serialized internal ORM model. Escape dedication/name/CSV content; accept plain text only. Image upload checks include magic bytes, byte/pixel limits, re-encoding, metadata stripping, and safe generated filenames. Avoid receipt uploads until needed; if introduced, keep private objects with short-lived access and no public bucket URLs.

Limit one unresolved hold per guest/show, proposed 5 reservation attempts per minute per guest and a tunable IP threshold. Shared bar Wi-Fi makes aggressive IP blocking harmful; monitor and tune. Rate limits cannot prove physical presence; QR images may be shared. Escalate to an accessible challenge only when abuse warrants it. A musician can pause intake and revoke a compromised table token.

Persist minimal payer data, dedication, and audit metadata. Do not log dedication text, CBU, payer reference, guest recovery tokens, passwords, or credentials. Propose deleting dedications/payer notes 30 days after show resolution; financial/audit record retention requires a separately confirmed operational/legal policy. Open disputes suspend deletion of necessary evidence.

Use translation keys and English identifiers. Argentine copy uses natural voseo: **“Elegí una canción”**, **“Dedicá una canción”**, **“Ya transferí”**, **“Quedan 3 lugares”**, **“La fila está completa”**. Format money with the selected locale and explicit `ARS`; localize date/time, plurals, validation, email, and status copy. Locale selection persists without changing the show or losing a dedication draft. Do not translate song titles or guest dedication text automatically. Test long Portuguese/German-like expansion even though German is not an initial locale; the layout must tolerate translation length.

## 11. Mercado Pago extension

Keep the manual payment lifecycle independent of a provider implementation. Later add a focused provider integration that creates checkout, records provider references, and reconciles the resulting payment into the same capacity/queue rules. Do not implement a generic plugin system now.

For multi-musician direct collection, confirm the eligible integration product and seller onboarding model. Mercado Pago documents seller-specific OAuth tokens for marketplace checkout; using Jony's credential for every musician would not implement independent sellers. Marketplace commission is a separate business decision, not an MVP assumption. [Mercado Pago marketplace integration](https://www.mercadopago.com.ar/developers/en/docs/checkout-api-payments/how-tos/integrate-marketplace).

For the selected API family, validate the documented webhook signature, persist a deduplicated event, retrieve authoritative payment/order data server-side, and check seller, currency, full amount, and request reference. Browser return URLs cannot confirm payment. Retry reconciliation after transient failures and handle out-of-order updates. Mercado Pago currently documents distinct Preferences/Payments and Orders flows; choose one supported flow during implementation and do not mix their identifiers or status names. [Preferences payment notifications](https://www.mercadopago.com.ar/developers/en/docs/checkout-pro-preferences/payment-notifications), [Orders payment notifications](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro-orders/notifications?scope=prod).

Store encrypted seller credentials server-side with scoped access, refresh/revocation handling, and rotation. Payment creation and provider calls use supported idempotency semantics; webhook acknowledgment follows durable receipt. A scheduled reconciliation process catches missed notifications. A provider approval after hold expiry still requires atomic capacity reacquisition or refund resolution. Delayed payment methods may be inappropriate for same-night fulfillment; evaluate them explicitly before enabling.

Provider sandbox tests, Argentine account eligibility, fees, refunds, dispute/chargeback states, and the exact API/SDK version are prerequisites for that later release. No production credentials, webhook integration, or live payment verification have been created in this planning task.

## 12. Delivery sequence and evidence

| Slice | Deliverable | Required evidence |
| --- | --- | --- |
| 0 | Product decisions, three architecture/interaction simulations, selected framework, references | Product selection and independent critique; current planning package is input |
| 1 | Musician registration/profile and catalog import | Tenant isolation, import preview/rollback, exact decimal pricing, mobile onboarding |
| 2 | Show setup, capacity, repertoire snapshots, printable stable QR | Correct routing across dates/midnight, disabled tables, closed/full states |
| 3 | Guest menu, hold, private request status | Concurrent last-slot and same-song races, duplicate retries, stale prices, expired holds |
| 4 | Transfer claims, verification, exceptions/refunds | Screenshot cannot approve; mismatch/late/double payment, overdue review, exact recipient snapshot |
| 5 | Musician queue, playing/completion, pause/finish | Two-phone conflicting actions, verified FIFO, played capacity, interruption/reconnect |
| 6 | Full locale coverage and pilot hardening | Physical iPhone/Android, keyboard/screen reader, enlarged text, poor signal, backup restore |
| Later | Mercado Pago seller onboarding and checkout | Provider sandbox, webhook authenticity/replay, missed event reconciliation, refunds |

Prioritize integration tests with real PostgreSQL transactions for last-slot contention; an in-memory database cannot establish row-lock correctness. Exercise two guests racing for one slot, two verifications racing, expiry against claim, show finish against verification, and repeated idempotency keys with changed bodies. Assert tenant separation with at least two musicians and overlapping song/venue names.

Browser end-to-end coverage should include one complete standard request, one dedicated request, claimed-transfer review, performer completion, and late-payment refund resolution. Add targeted unit tests for price parsing, state transitions, locale formatting, and deadline boundaries. Accessibility and visual checks remain separate from functional success.

## 13. Deployment, observability, and operational limits

Use development, staging, and production environments with separate databases/secrets. Deploy one application artifact; run tracked database migrations once per release. Prefer additive migrations and a rollback-compatible application window. Set timeouts and connection-pool limits; measure latency from Argentina before selecting hosting region. Avoid an idle/sleeping production process during performances.

Health checks cover process and database connectivity. Structured logs use correlation IDs and non-sensitive request/show identifiers. Monitor request errors, reservation conflicts, unverified/overdue transfers, outstanding refund amounts, maintenance heartbeat, and queue refresh latency. Alert the operator for failures that threaten paid requests, not every harmless polling retry.

Run hold expiry/review escalation at least every minute. Correctness must also occur on transactional reservation/claim paths so a delayed scheduler cannot oversell capacity. Database backups need a tested restore process; propose managed point-in-time recovery with a pilot recovery target of under one hour and at most five minutes of database loss, contingent on the selected plan. Reconcile external transfers after any restore before resuming intake.

Supabase Pro's baseline daily backups do not establish that five-minute data-loss target. Meeting it requires separately budgeted PITR and eligible compute, followed by a restore rehearsal; otherwise the Product Owner must explicitly select a less stringent recovery target. Vercel Cron on Pro supports minute-level scheduling, but failed invocations are not automatically retried: persist work/deadlines, retry on subsequent runs, and monitor the maintenance heartbeat. See [hosting](HOSTING.md) for sources and cost assumptions.

At an outage: stop accepting new transfers in the web UI, retain private state where safely readable, display stale status explicitly, and let Jony manage already-confirmed requests from the last trusted view while recording changes for reconciliation. Do not continue collecting payments via a cached menu. Keep a private operator runbook for outage, wrong recipient, account takeover, abandoned show, and refund reconciliation.

## 14. Decisions required before implementation

Finalize the Next.js dependency and hosting choices through the template's simulations/review gate. Validate with Jony: request-only capacity, no-repeat rule, dedicated total pricing, manual review workload, hold/review timing, recipient account, and cancellation/refund policy. Confirm Italian/French and whether the same physical venue QR must rotate across independent musicians in the first release. These choices are explicit defaults for planning, not claimed user approvals.
