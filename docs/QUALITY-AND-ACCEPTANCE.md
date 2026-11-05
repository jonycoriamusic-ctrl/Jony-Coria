# Musica a la carta quality and acceptance plan

> **Capacity update (2026-11-05):** Per-song limits have been removed. Songs may repeat while total show capacity remains. En vivo offers plus/minus controls for that total, which cannot drop below existing allocations. Earlier per-song-limit rules below are superseded.
> **Current policy update (2026-11-05):** The user removed musician payment approval. A guest’s “Ya transferí” immediately enqueues the request in good faith, retaining capacity and without setting bank-verification timestamps. Receipt upload remains optional/private. There is no review queue, confirmation endpoint or overdue-review intake pause. Earlier manual-review requirements below are superseded by this decision; independent bank/API verification remains absent.
This plan defines the evidence needed to trust a live show's requests, payments, capacity, and mobile experience. The principal release risks are overselling a limited performance slot, treating a transfer claim as money received, losing a paid request, and exposing one musician's or guest's private information to another.

Status: planning criteria prepared on 2026-11-05. These scenarios have not been executed against an application. Runtime, accessibility, physical-device, design, and payment-provider approval remain pending. Review of the planning documents is recorded separately in the team task.

## Release invariants

1. The server calculates the payable amount from the selected musician, show, song, and request type. The client never chooses its own price.
2. A request reserves at most one performance slot. Confirmed and completed requests continue consuming the night's capacity. Cancellation releases capacity only under the documented policy and transaction.
3. Occupied slots cannot exceed configured capacity, even when submission, expiry, confirmation, cancellation, or show settings change concurrently.
4. A guest's “Ya transferí” action, reference text, or uploaded receipt is a claim requiring review. Only a recorded verification against actual received funds confirms a manual payment.
5. Once a timely transfer claim enters review, its reservation remains protected until an explicit resolution. A review deadline triggers escalation, not silent capacity reuse.
6. Late money cannot silently create an extra performance slot. Reacquisition must be atomic; otherwise it stays outside the performance queue and directs the guest to arrange with the musician; no refund workflow is required.
7. All authenticated reads and writes enforce musician ownership. All guest status reads authorize one guest's request, not any other guest’s requests.
8. One permanent musician QR resolves that musician’s single active show safely. A request already created remains attached to its original show and payment destination.
9. Refresh, retry, connection loss, and duplicate payment notifications cannot produce duplicate requests, confirmations, performances, or receipt attachments.
10. The guest sees a truthful result: awaiting transfer, under review, confirmed, playing, played, cancelled, expired, or requiring assistance. A browser redirect alone is never proof of payment.

## Test fixtures

Use synthetic data only: Jony and a second musician with separate accounts; different venue labels; one stable QR per musician; one open show, one paused show, and one finished show. Give both musicians songs with overlapping titles to expose incorrect ownership assumptions. All tables use the same musician QR. Each musician can have only one active show across all venues; tenant isolation fixtures do not expand the one-musician pilot.

Configure the open show with a small capacity and two price types. Use arbitrary test ARS values, one song disabled for the night, one available only once, and at least one song already played. Create guests A, B and C through the same public musician QR with separate private sessions. Include long accented names, emoji, and dedication text containing markup characters.

Freeze and advance the server clock in tests; do not wait real minutes to test expiration. Execute concurrency cases with independent database connections and synchronized requests through the Admin SDK against the Firestore emulator and a staging regional Firestore database. Sequential unit tests cannot prove transaction/contention behavior.

## Capacity and concurrency acceptance

| ID | Scenario | Required result |
| --- | --- | --- |
| CAP-01 | Two guests reserve the final slot concurrently | Exactly one succeeds; the other gets a capacity conflict with refreshed availability. Exactly one live reservation exists. |
| CAP-02 | Two guests reserve the final permitted occurrence of the same song | The song rule is enforced inside the same transaction as capacity; no duplicate prohibited occurrence appears. |
| CAP-03 | Expiry and payment claim run simultaneously | One legal ordering wins. A timely accepted claim protects the reservation; an already expired request uses the late-payment path. No state both releases and retains the slot. |
| CAP-04 | Payment confirmation races with cancellation or expiry | A Firestore show transaction and versioned transition prevents duplicate consumption or an untracked paid cancellation. Money and request outcomes remain auditable. |
| CAP-05 | Musician lowers capacity below occupied slots | Reject the change with a clear explanation, or require a separately designed resolution; never erase accepted commitments. |
| CAP-06 | Musician finishes a song | Occupied nightly capacity does not decrease merely because the song is now played. |
| CAP-07 | New guest opens a stale menu after another guest takes the slot | Final submission rechecks current server rules; stale UI does not authorize a request. |
| CAP-08 | Musician disables a song or pauses intake while a guest submits | Transactional ordering produces a valid reservation or a clear conflict; existing commitments follow the explicit policy. |
| CAP-09 | Expiry worker crashes or runs twice | Logical expiry remains correct; repeated cleanup cannot double-release capacity or change a reviewed/confirmed request. |
| CAP-10 | Two musician devices mark different songs as currently playing | Enforce the chosen single-current-performance rule transactionally; show the winning state on both devices. |

Verify persisted counts and states after every concurrent case, not only HTTP responses. Read all transaction dependencies before writes and use bounded transaction retries for contention; a retry must preserve the same idempotency identity.

## Payments and financial exceptions

| ID | Scenario | Required result |
| --- | --- | --- |
| PAY-01 | Guest taps “Ya transferí” without transferring | Request is under review, absent from the confirmed queue, and never displayed as paid. |
| PAY-02 | Guest uploads a convincing but false receipt | Receipt remains untrusted evidence. A human must verify actual settlement before confirmation. |
| PAY-03 | Two same-amount transfers arrive for different guests | Reviewer has reference, payer information supplied for reconciliation, amount, and timestamp context; ambiguous matching stays unresolved. No guessing from amount alone. |
| PAY-04 | One bank movement is offered for two requests, including after alias/payment-configuration version changes | Payment reconciliation records prevent confirming the same movement twice within the same actual receiving account across configuration versions. An ambiguous record requires manual resolution. |
| PAY-05 | Claim arrives before hold expiry but musician is busy performing | Claim protects capacity. Review deadline produces an overdue indicator and the configured intake escalation; no silent expiry. |
| PAY-06 | Transfer arrives after an unclaimed hold expires and its slot is sold | Record late-payment exception. Do not add to performance queue. Display direct-arrangement guidance; no refund object or payment approval is created. |
| PAY-07 | Late transfer arrives while a slot is still free | Verify money, reacquire song and show capacity atomically, then confirm. Never rely on a prior availability read. |
| PAY-08 | Wrong amount, partial amount, excessive amount, or wrong recipient | Clear exception state; no automatic standard-price confirmation. Record the final resolution and who performed it. |
| PAY-09 | Musician rejects dedication after money is received | Preserve the musician-recorded payment and mark not performed; arrangements happen directly with the guest. Rejection must not erase the payment. |
| PAY-10 | Show is closed with confirmed requests or unresolved claimed payments | Warn about remaining requests and preserve their status after closure; no in-app resolution is mandatory and closure implies neither performance nor refund. |
| PAY-11 | Unfulfilled request is marked not performed | Preserve request/payment history and direct-arrangement copy; no refund/dispute form, repayment-details field or refund-completion claim appears. |
| PAY-12 | Musician changes alias/CBU or price after guest reserved | Existing request keeps the original amount, currency, destination snapshot, and instructions. New requests use the new configuration. |

Manual-transfer release requires an operational owner who can actually check received funds during the show. A real pilot must measure review delay. If Jony cannot review while performing, assign an authorized assistant in a future scoped feature or pause intake; do not imply manual verification is automatic.

The guest must see the reservation deadline, exact ARS amount, recipient name, alias/CBU, and consequences of transferring after expiry before leaving for a banking app. Return from the banking app must preserve access to the request. Do not promise an exact performance time unless the product later implements and validates scheduling.

For the future Mercado Pago phase, add provider-specific tests only after the integration design is selected: invalid signature, duplicate and out-of-order events, delayed approval, provider lookup failure, wrong recipient/currency/amount, expired reservation, refund failure, and credential isolation. Verify authoritative provider status on the server; never trust the return page or webhook payload alone to fulfill a request.

## Retry and connectivity acceptance

- **NET-01:** Double-tap “Reservar” and retry the same submission after a timeout. Return the same request for the same idempotency key and payload; a changed payload using that key produces a conflict.
- **NET-02:** Lose the response after the database commits. The recovered result is the existing reservation, with its original expiry and price, rather than a second reservation or an extended hold.
- **NET-03:** Refresh, reopen a tab, or switch to a banking app. The guest can resume their private request using the supported session/recovery mechanism; public QR reopening alone does not reveal private history.
- **NET-04:** Lose connectivity before submission. Keep editable form values locally where appropriate, show an unsent state, and never indicate a reservation was created.
- **NET-05:** Lose connectivity while confirming a payment or marking a song played. Reconnect and refetch before presenting final success; an explicit retry uses the same operation identity.
- **NET-06:** Polling fails repeatedly. Display stale status and a last-successful-update indicator, back off appropriately, and resume immediately when the page becomes active and connected.
- **NET-07:** The browser suspends the musician portal while another app is foregrounded. On return, refresh the authoritative queue before allowing actions against stale state.
- **NET-08:** Multiple tabs receive an updated queue. Preserve focus and the current action; do not unexpectedly jump the musician to a different song or display another guest's dedication publicly.

## Tenant isolation and guest privacy

| ID | Attempt | Required result |
| --- | --- | --- |
| SEC-01 | Musician A requests B's profile settings, repertoire, show, queue, transfer data, import, or export by changing an ID | Denied at the server; no data mutation or private response leakage. Test list and bulk routes as well as individual records. |
| SEC-02 | Guest A changes a sequential request ID or show parameter to view B's status | No access. Use a high-entropy, request-scoped capability/session rather than enumerable IDs as authorization. |
| SEC-03 | Public menu/queue response is inspected in browser developer tools | No guest dedications, payer names, receipt URLs, private account settings, email addresses, or internal audit records. Public transfer instructions expose only the intended receiving details. |
| SEC-04 | Stolen/reused old public musician QR is visited after reassignment | Resolves only the valid current public context, or a safe inactive state; it cannot mutate musician settings or expose historical requests. |
| SEC-05 | Cross-site form attempts authenticated state changes | Framework CSRF and origin protections prevent unauthorized actions; cookie settings and session lifecycle match the deployment. |
| SEC-06 | Repeated anonymous holds attempt to exhaust capacity | Rate limits and active-hold limits constrain abuse without locking out an entire bar merely because guests share a network. Review-claim abuse has a visible operator response. |
| SEC-07 | Private request URL is loaded with analytics or external resources | Capability tokens do not leak through referrers, logs, analytics, screenshots, or third-party scripts. Prefer a token exchange into an HTTP-only session where practical. |
| SEC-08 | Musician logs out, changes password, or account is disabled | Session lifecycle follows the selected auth system; sensitive routes reject expired/revoked sessions. |

Receipt screenshots are included in MVP. Test private storage and authorized Express reads, allowed image types, actual-byte validation, size/pixel limits, re-encoding, metadata stripping, safe generated filenames and rejection of active content. Treat MIME type and extension as hints, not proof. Do not render uploaded HTML/SVG as a receipt. Define retention and deletion before a pilot, including backup behavior; do not invent a legal compliance claim.

## Repertoire import and dedication content

- **DATA-01:** Preview CSV import and report row-specific errors before committing. Missing titles, invalid prices, unknown columns, encoding problems, and duplicate rows do not produce a half-imported menu silently.
- **DATA-02:** Validate file size and row count. Reject malformed inputs predictably; database writes remain tenant-scoped even when a file includes guessed IDs.
- **DATA-03:** Escape song names and dedication content on every display. Text such as `<script>` renders harmlessly; links and markup do not execute.
- **DATA-04:** Neutralize spreadsheet formulas when exporting user text to CSV. Test leading `=`, `+`, `-`, `@`, tabs, and carriage returns in relevant cells.
- **DATA-05:** A dedicated request requires nonblank text within the configured length limit. A standard request never silently becomes a dedication or charges its price because hidden text remains in a form.
- **DATA-06:** Import or catalog edits do not alter the title, artist, price, or dedication already snapshotted on an accepted request. Deletion archives referenced songs rather than breaking history.
- **DATA-07:** Repertoire upload means structured song metadata. PDF/image menus, music-file upload, streaming, and song-recognition features require separate scope.

## QR, show, and language acceptance

Test the same printed musician QR across no active show, draft-only, open, paused, full, finished and revoked states. Activate the next show without reprinting; the public page shows the current musician/show/venue and never exposes historical private requests. Existing request status remains attached to its original show.

Race two show activations for the same musician at different venues: only one wins. Drafts may coexist; paused/intake-closed active shows still prevent another activation. After finishing the first, activate another while preserving old request access. No table records or table-selection screen are required.

Add a song and increase cap during a show: public menu refresh shows both behind the same QR. Race a lower cap/repeat limit against a reservation: accepted allocations are preserved. Change profile prices: new quotes use them and existing quotes remain unchanged. Test proposed manual queue reorder against confirmation/start/finish races, including unauthorized and stale-version edits.

Default UI language is Argentine Spanish (`es-AR`). Planned choices are English, Brazilian Portuguese, Italian, and French; the last two remain product defaults awaiting confirmation. Language switching preserves the selected song, dedication, request, and payment state. Use locale identifiers internally and localized names in the selector. Translate UI copy, not user-entered dedications or song titles automatically.

Verify all critical states in every enabled locale, including price, countdown, validation, offline, expired, pending review, cancellation and direct-arrangement information. Missing translations fall back consistently to `es-AR`; raw translation keys never reach the guest. ARS remains the charged currency regardless of language. Date boundaries use the show timezone, not a guest browser's timezone or the developer machine's timezone.

## Mobile UX and accessibility evidence

Mobile first is required for both guest and musician surfaces, with full tablet and desktop support. Check representative 360, 768, 1024, and 1440 CSS-pixel widths, physical tablet portrait/landscape, and desktop Chrome, Safari, and Firefox. Resizing/rotation must preserve form values, selection, private access, and payment/request identity. Test mouse, touch, keyboard, and browser zoom; do not hide essential actions at any breakpoint or depend on hover. Device/browser support must be pinned to tested versions before release.

The guest should identify the song, request type, final total, and primary action without guessing. The musician should distinguish payments to review from songs ready to perform without reading every row. Draft acceptance targets are a five-second hierarchy check and a reservation flow with no account creation; validate them in prototype testing before implementation.

Test physical iPhone Safari and Android Chrome, narrow and large viewports, enlarged text, portrait/landscape, keyboard navigation, visible focus, screen-reader labels/order, color-independent status, sufficient contrast, and reduced motion. Large tap targets and destructive-action separation matter during a performance. Confirm that the on-screen keyboard does not hide dedication validation or payment actions.

Polling announcements must not repeatedly interrupt screen readers. Updating queue rows must preserve stable focus. Copy-alias feedback needs visible text and an accessible announcement. Loading indicators must distinguish an action still processing from a stale page. Test weak connectivity in the actual venue context during the pilot.

The independent Design Reviewer records exact references, browser/device/OS, build, states, findings, and decision. Passing automated accessibility tools does not establish full accessibility or visual approval. The designer and implementer cannot supply their own independent approval.

## Operations and release checks

- **OPS-01:** Restore a backup into an isolated environment and reconcile requests, payments, show capacity, and audit records. Record measured recovery time and data loss against the agreed recovery targets.
- **OPS-02:** Test database migrations and rollback/recovery on production-like data. Never depend on an automatic down-migration that destroys payment history.
- **OPS-03:** Restart the application during holds, pending review, and queued requests. Durable state survives; cleanup resumes safely and polling reconnects.
- **OPS-04:** Alert on failed expiry work, excessive pending-payment age, repeated webhook errors in the later provider phase, elevated server errors, and database backup failure. Avoid guest names, dedication text, tokens, and receipts in logs.
- **OPS-05:** Use distinct environments and secrets. Staging test transfers/provider credentials cannot charge or alter production requests.
- **OPS-06:** Verify HTTPS, protected administrative routes, safe error pages, secret rotation procedure, and musician account recovery before the pilot.
- **OPS-07:** Rehearse closing a show, preserving remaining requests/payment status and showing direct-arrangement guidance. Do not treat browser closure as show closure.

## Test execution layers

| Layer | Focus | Evidence |
| --- | --- | --- |
| Domain tests | Allowed transitions, expiry boundaries, money calculations, dedication rules | Boundary cases and invalid-transition assertions |
| Firestore integration | Atomic counters/allocations, uniqueness-claim documents, idempotency, projections, tenant relationships | Emulator plus staging database, synchronized contenders, persisted invariants |
| HTTP/security integration | Ownership checks, capability authorization, CSRF, rate limits, request validation | Both successful and denied actions; no leaked response fields |
| Browser end-to-end | Scan/menu/reserve/claim/verify/play; banking-app interruption and reload | Synthetic guest and musician accounts, screenshots, state assertions |
| Physical-device review | Readability, screen-reader behavior, keyboard, one-handed use, weak connectivity | Named devices, browser versions, observations, independent findings |
| Operational rehearsal | Restart, failed cleanup, restore, close-show reconciliation | Recovery timing, data reconciliation, documented operator steps |

Unit tests should exercise business behavior rather than copy method internals. Use Firestore emulator integration and the selected staging database for concurrency/index behavior; mocked repositories do not establish these guarantees. Browser tests should assert guest and musician outcomes, not fragile CSS implementation details.

After a bug is reproduced, add a regression at the lowest layer that faithfully exposes it. Broaden testing when a changed dependency or shared behavior justifies it. Avoid claiming an arbitrary coverage percentage establishes release readiness.

## Optimistic UI and layer acceptance

- **OPT-01:** Every action immediately updates local/pending feedback without claiming a committed reservation or payment before acknowledgment.
- **OPT-02:** Reject an optimistic profile/catalog edit; roll back only its fields, preserve the draft, show an accessible error, and keep newer confirmed data.
- **OPT-03:** Lose a reservation response after commit; reconcile with the same idempotency key. Never expose a second payment prompt or invent a fresh hold.
- **OPT-04:** Poll while multiple mutations are pending; late responses cannot overwrite newer versions or remove another operation's optimistic overlay.
- **OPT-05:** Logout/account switch clears private query caches. SSR query clients are request-scoped; no guest/musician data leaks between renders.
- **OPT-06:** Domain code imports no framework/database packages. Components import no Firebase Admin repositories. Transactional behavior remains in use cases through infrastructure contracts.
- **COST-01:** Verify show-scoped queue and exact-request status listeners, hidden/terminal cleanup, no duplicate polling, and read/write/reconnect accounting. REST fallback refresh is bounded.
- **COST-02:** Measure Express cold/warm latency, Firestore transaction contention, listener fanout and Functions/host costs with the pilot load. Free allowances do not prove sufficient capacity.
- **COST-03:** Verify the selected Firestore backup/export/restore process and cost. No Atlas snapshot price or five-minute-loss/one-hour-recovery guarantee applies.

## Firebase trust boundaries and realtime checks

- **FB-01:** Reject invalid, expired and wrong-project ID tokens at Express; check inactive/revoked users on sensitive operations and missing tenant membership on every private operation.
- **FB-02:** Emulator rule tests deny all client business writes, raw payment/audit reads, guest queue reads, and cross-musician/guest projections. Include query shapes, not only direct document reads.
- **FB-03:** API isolation tests still deny cross-tenant IDs even though Admin SDK bypasses rules. CORS alone is not an authorization result.
- **FB-04:** Canonical state, counters, song allocation, bank/idempotency claims and private projections commit atomically. Failed/retried callbacks produce no extra payment or email side effect.
- **FB-05:** Listener reconnect/offline cache does not create a false confirmation. REST and listener results merge by version, and only one source actively refreshes a cache key.
- **FB-06:** Anonymous signup works on shared bar Wi-Fi within actual quotas. Recovery grants only the requested record to the new UID, rotates its token and denies the old UID; no signup form is introduced.
- **FB-07:** CSV/show initialization larger than one safe transaction uses staged revisions and an atomic publish pointer. Failed batches never expose partial catalogs; closing a large show leaves obligations durably visible.

## Evidence required for a pilot

Record the commit/build, schema version, fixtures, browser/device versions, test commands, results, failures, and reviewer. Link concurrency traces and database assertions for capacity/payment cases. Link physical-device evidence and independent design findings separately from automated tests.

Critical or High failures in capacity, payment truth, tenant isolation, recovery, or the core mobile flow block a paid pilot. Missing evidence is pending, not a pass. Medium findings need a named owner and delivery decision; Low findings may be scheduled as refinement. The Product Owner confirms business defaults and the team records Engineering, QA, and independent Design Reviewer decisions before launch.

## Receipt and revised product acceptance

- **UPLOAD-01:** Guest uploads an allowed screenshot and the owning musician can view it; other guests/musicians and unauthenticated bucket access are denied. It never confirms payment.
- **UPLOAD-02:** Reject oversized, corrupt, spoofed and active-content files without losing the request or submitted transfer claim. Retry keeps one ready attachment.
- **UPLOAD-03:** Interrupt Storage upload or metadata commit; reconcile retry/orphan cleanup. Private reads expose only ready attachments and recheck ownership after guest recovery.
- **UPLOAD-04:** Validate retention cleanup and bounded upload/download usage; no receipt content or access token in logs, public projections or analytics.
- **SCOPE-01:** Guest journey has no signup, email/password request or profile. Only musicians have registered profiles.
- **SCOPE-02:** No refund/dispute/support-ticket workflow or repayment-detail collection. A not-performed request preserves its history and directs the guest to speak to the musician.

## Monochrome theme, reuse and public musician profile

- **THEME-01:** Shared primitives and feature components consume semantic theme tokens; no duplicated screen palette. Check normal/hover/focus/disabled/pending/error states in black/white and neutral grays. Status has text/icon meaning independent of color.
- **THEME-02:** Test text/control contrast, enlarged text, reduced motion and keyboard focus on white/black surfaces. Bottom navigation includes safe-area padding and never hides content or keyboard-focused controls.
- **PROFILE-01:** Musician can add, crop/position, replace and remove avatar/banner. Failed upload/save preserves the last published asset. Empty images use initials/neutral fallback.
- **PROFILE-02:** Profile contact/social changes publish only explicitly selected fields; login email, private account/payment metadata and receipts never leak through the public profile or media route. Validate malicious URLs and cross-musician asset attachment attempts.
- **PROFILE-03:** Public image route cannot read staged, retired, foreign or receipt assets. Owner-only preview, bounded file/pixel validation, orphan cleanup and cache expiry are verified separately.
- **PROFILE-04:** Public musician profile remains accessible with no active show; external contact/follow links work without guest registration. Avatar/banner and links adapt at phone/tablet/desktop sizes with suitable accessible labels.
- **REUSE-01:** The public page, show header and profile preview share profile presentation components. Domain components take typed view models/callbacks; API/auth code lives in application/infrastructure, not shared UI.

These are pending implementation checks. Theme token inspection alone does not establish visual/accessibility approval.

- **STYLE-01:** Compile semantic theme classes, responsive variants and interaction/reduced-motion variants through Tailwind. Check static variant maps are detected, no screen-specific style duplication and no default chromatic palette is reintroduced. Run actual responsive/accessibility checks after components exist; utility compilation does not prove visual correctness.
