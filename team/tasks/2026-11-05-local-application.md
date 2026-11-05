# Local application implementation

Date: 2026-11-05
Scope and intended outcome: Build Musica a la carta in the selected Next.js/Express/TypeScript architecture, leaving Firebase connection until last as explicitly requested.
Status: Working local demo delivered; Firebase, public hosting and production release pending.

## Ownership

Product Owner: Micaela; existing product decisions retained, no fabricated approval.
Product Manager / Product UX Designer / Design Engineer / Engineering Owner: main agent.
API engineering and focused integration tests: build_api agent.
Localization engineering: frontend_i18n agent.
Independent Design Reviewer / QA and security source reviewer: independent_review agent, separate from implementers.

## Experience and acceptance criteria

Guests scan the musician's permanent link, browse a searchable repertoire, choose a standard request or dedication, reserve capacity, see a fixed ARS quote and transfer instructions, optionally attach a private receipt and declare a transfer. The musician explicitly checks the bank and confirms before a request enters the performance queue. Completing a song retains its nightly capacity allocation. Shared guest pages do not expose dedications or receipts.

The portal supports repertoire entry/edit/disable, CSV preview/import, prices and repeat limits, show creation/repertoire/capacity, pause/resume/finish, historical requests, queue ordering and profile media/contact/social links. No real transfer, Firebase connection, cloud provisioning or deployment occurred. Demo Jony is seeded; real musician registration and multiple cloud tenants are not delivered yet.

Loading, empty, unavailable/full, paused, expired, review-pending, queued, playing, completed, failed commands and direct-arrangement outcomes have UI handling. Financial/capacity success is server-authoritative. Reversible song availability uses optimistic cache updates and targeted rollback.

## Architecture and design evidence

The user selected Next.js + Express + Firebase and expressly authorized building now with provider connection last. Local development uses explicit demo-only sessions and a serialized atomic JSON repository; these are refused in production mode. The aggregate repository contract must become scoped Firestore transactional operations during integration. Five-second private and fifteen-second public polling temporarily substitute for protected listeners.

Frontend domain helpers are framework-free; application hooks coordinate reservation, private images and login; TanStack Query owns remote state; feature components own form/presentation state. Shared UI primitives use Tailwind v4 semantic theme tokens. The monochrome layout uses mobile bottom navigation and expands into desktop navigation and columns. The stage image is an original decorative SVG, not a photograph of Jony.

The inherited three comparative architecture simulations were not completed. User authorization allows this local build; it does not imply that production or physical-device gates passed.

Independent review examined source and screenshots. All eight findings were corrected and re-verified: unresolved claims lacked direct-arrangement handling; historical show requests became inaccessible; guests lacked held-request cancellation; profile saves used a fresh version rather than the draft baseline; dialogs lacked accessible names; control borders were too faint; arbitrary light banners reduced text contrast; input lengths exceeded server constraints. No further findings in the bounded verification. This is not production release approval.

## Delivery and verification

Implementation: apps/web, apps/api and packages/contracts; npm workspace, lockfile, optional environment example, shared theme and local seed. Setup and limitations are in README.md and apps/api/README.md.

Final automated checks, after all source fixes and formatting:

- npm run typecheck: passed for API and frontend.
- npm test: 9 integration tests passed, 0 failures. Covers concurrent last-slot allocation, idempotency, guest ownership, claim versus confirmation, played capacity, expiry, immutable quotes, active-show exclusivity, receipt/public image validation and byte serving, CSV atomicity, overdue-review pause, queue membership and durable restart.
- npm run build: Next.js optimized build passed for all routes.
- npm audit --audit-level=moderate: 0 known vulnerabilities at the time of the check.

Browser verification in the in-app browser: reserved a dedicated song; uploaded a generated, clearly synthetic transfer screenshot; claimed transfer; signed in as the demo musician; inspected the protected receipt; checked the bank-confirmation acknowledgment; confirmed, started and completed the song. Verified remaining capacity was 19/20 after completion. Found and fixed a real receipt-image 500 caused by serving from a hidden .data directory; the integration suite now decodes the actual authorized response bytes. No real payment was made.

Also verified reusable QR display with localhost notice; profile media upload and save after media mutation; white-banner readability; English and Portuguese switching with ARS formatting; restored Spanish and the original demo banner. Locale dictionaries include all five languages. Browser layout checks at 390x844, 768x1024 and 1440x1000; mobile/tablet page width equals viewport width (scrollbar reduces CSS viewport to 375/753). Fixed mobile grid min-width overflow. These are emulated browser viewports, not physical-device checks.

Evidence under design/evidence:

- guest-mobile.jpg: guest menu and mobile navigation.
- guest-tablet.jpg: tablet layout.
- guest-desktop.jpg: desktop guest menu.
- musician-mobile.jpg: queue/current performance during the walkthrough.
- light-banner-contrast.jpg: actual white raster upload under the final 72% dark scrim.

The test request remains in local demo history, labeled as test content. Private demo receipts and tokens remain in ignored .data files, not evidence screenshots or source control. Tests use isolated temporary stores.

## Decisions and handoff

Firebase connection is intentionally deferred. See docs/FIREBASE-EXPRESS.md#local-demo-handoff for identity, scoped repositories/transactions, Storage, rules, indexes, listeners and onboarding work. Current QR is local to this computer; a public domain is required for phone scanning. No hosting or billing resources were created.

Remaining production work includes Firebase identity and recovery, multiple-musician onboarding/isolation, private request recovery across devices, scoped cloud persistence, protected realtime projections, asset retention, richer song-code CSV updates if needed, physical-device/weak-network testing and release review. Manual bank verification stays manual. Focal-point image editing and Mercado Pago remain unimplemented.

The local verification servers can be restarted from the repository with npm run dev. No production service is running.

## Follow-up: good-faith transfers (2026-11-05)

The user removed musician approval to speed up requests. “Ya transferí” now atomically moves a valid held request directly to queued with a unique queue rank and claimedAt. It does not set confirmedAt or assert bank settlement. Removed the confirmation endpoint, review tab/dialog and overdue-review automatic intake pause. Optional private receipts remain available, including after joining the queue. Updated guest guidance and queue labels in all five locales.

Existing review_pending demo requests migrate once, preserving allocations and historical evidence. Claims from active shows append to the existing queue in declaration order; claims on finished shows become not_performed for direct arrangements, avoiding a false promise of a future performance. Manual pauses are preserved. The legacy DTO value remains only for persisted-state compatibility.

Independent reviewer verified queue serialization/idempotency/capacity and identified the finished-show migration edge; corrected with regression coverage. Browser inspected the actual existing guest request and musician queue after migration; no musician approval controls remain. No test mutations were made to the user's request beyond the authorized status migration. Final checks: TypeScript, Next.js build and all 10 API tests passed. Server remains running as requested.

## Follow-up: repeated songs and live capacity (2026-11-05)

The user removed maximum requests per song and requested total capacity editing from En vivo. Removed repeatLimit from contracts, validation, seeds, profile form, reservation checks and availability. Legacy stored fields are stripped. Same-song requests now compete only for the show’s total capacity.

Added responsive En vivo capacity controls, translated into all five locales. Each plus/minus action sends the current show version; controls disable during the request, on finished shows, below max(1, occupiedCount) or above 500. Capacity changes remain authoritative on the server; existing reservations and completed-song allocations cannot be erased. The existing show editor still supports entering a total directly.

Independent review found no source regressions. All 11 API tests, TypeScript checks and frontend build passed. Added meaningful integration coverage for repeated songs, capacity exhaustion, lowering below allocations and stale edits. Browser verified increasing 20→21 (available 18→19) and decreasing back to 20 (available 18); original show capacity restored. Mobile layout inspected at 390×844. No real payment action occurred. App servers remain running.

## Follow-up: musician-owned song folders (2026-11-05)

The musician can create and rename folders in Repertorio, assign any existing or new song to one, and choose one folder for a CSV import. Removing a folder keeps its songs and returns them to the unfiled catalogue. The public menu derives its filter pills only from musician-created folders containing songs in the current show; with no such folders, it shows the complete song list without a category strip. The old genre input, fixed genre seed categories and genre presentation are removed. Existing local demo songs are migrated to no folder without touching requests. Legacy CSV `genre` columns are accepted but ignored so old files still import without recreating unwanted categories.

The API validates folder ownership on song writes and imports; Firebase stores the ordered folder list on the musician document and uses revisioned catalog writes when deleting a folder. New API and Firebase emulator integration coverage checks folder visibility, isolation, legacy genre removal and song preservation. The local menu was inspected in the browser with the existing 16 songs and no genre chips. The local app remains running. Production deployment remains paused at the user's direction; no cloud data or configuration was changed for this follow-up. Physical-device and production checks remain pending.

Independent source review of this folder change found a potential Firebase data-loss edge for catalogs above 2,000 songs, plus two mobile UX issues. The edge was closed by enforcing a 2,000-song creation limit, storing a transactional song count, and rejecting deletion of oversized legacy catalogs before publishing a replacement; an emulator test inserts 2,001 songs and verifies the last remains after the rejected deletion. Folder chips now truncate long names on mobile, and Add song/Import inherit the selected folder. The reviewer did not inspect the post-fix UI or approve a release. Final follow-up checks: API typecheck, web typecheck, local API tests (18 passed, one emulator-only skip), optimized web/API build, and Firebase Auth/Firestore/Storage emulator suite (2 integration plus 3 rules tests passed). Browser inspection confirmed the public menu has no genre chips and Repertorio shows the new folder controls. Physical-device and production checks remain pending.

## Follow-up: musician self-registration (2026-11-05)

Firebase mode now has a complete musician self-registration path at Acceso músicos: Email/Password account creation with password confirmation, verification email, stage name and suggested editable public slug, then a redirect to the profile editor for photo, banner, contact, pricing and transfer setup. A partially onboarded signed-in musician can resume profile creation after reloading or returning from the portal. Demo credentials remain local and cannot create real Firebase accounts.

Added a separate local Firebase emulator preview on ports 3001 (web), 4001 (API) and 4002 (emulator UI) via `npm run dev:firebase`; the existing Jony demo remains on port 3000. Browser-tested account creation through the client Firebase SDK, profile onboarding through Express/Firestore, and arrival at the profile editor using a synthetic `example.test` account. Both local servers were left running. Typecheck, all local tests and optimized build pass. The production project was not changed; its Firestore provisioning and deployment are still pending.

Independent review of the registration change found one actionable validation issue: mismatched passwords produced a generic error. It now uses a typed `PASSWORD_MISMATCH` error mapped in the shared notice and translated into all five locales. Browser verification confirmed the Spanish message. An interrupted second synthetic account was reloaded and successfully returned to the profile-creation form; it was then signed out. Emulator UI and API use distinct ports (4002 and 4001). The reviewer found no remaining blocking source issue in onboarding resume, tenant ownership or demo/emulator separation; this is not production release approval.

## Follow-up: automatic show scheduling behind one QR (2026-11-05)

The Product Owner chose automatic switching by show date and time. The musician can enter an Argentina start date and time in the show editor. Both API implementations normalize incoming dates to UTC. The permanent `/q/{slug}` QR remains unchanged; the public menu and musician dashboard reconcile the latest eligible show when read. A show occupies a 24-hour window, and a later scheduled show supersedes it. A finished latest show never falls back to an older skipped draft. Between shows, the public menu has no selectable songs.

The Firebase service checks the musician's verified email, transfer destination, prices and selected enabled repertoire before automatically opening a draft. The schedule transition updates the show and musician pointer transactionally, and expires only unclaimed holds on the old show; accepted requests remain in their history. Reservation and transfer-claim paths reconcile the schedule so an old payment page cannot queue a request after the next show starts. The local demo applies the same scheduling rules, without a cloud email check. Manual early opening remains an optional musician override.

Independent source review found three actionable cases: an older skipped draft reopening after the latest show finished, a Firebase transfer claim joining the old show without a QR refresh, and offset-formatted timestamps sorting differently from UTC. All three were corrected. Regression tests now cover skipped drafts, claims across the boundary, UTC normalization of Argentine input, stable QR routing and historical request retention. Local suite: 21 API tests passed with one emulator-only skip, plus 5 web tests. Firebase emulator suite: 2 API tests and 3 rules tests passed. TypeScript checks and optimized build passed. The 390px local show screen and new-show form were inspected in the browser; the QR control gained an accessible label. Physical-device and production reviews remain pending.

## Follow-up: additive dedication price (2026-11-05)

The Product Owner clarified that a musician sets a base song price and an additional dedication price. The guest sees base + add-on = total in the menu, selection dialog and new request/transfer detail. The musician's profile editor shows the same live calculation. Contracts and API validation now use `dedicationSurcharge`; both demo and Firebase reservation transactions calculate the total on the server, reject stale expected prices, and snapshot the base, add-on and total on each new request. Historical request amounts remain immutable and older requests without component snapshots continue to show their total.

Existing demo `dedicationPrice` totals migrate on the next local read: for example 3,000 song + 4,500 prior combined total becomes a 1,500 add-on and stays 4,500 combined. Firebase reads use the same compatibility calculation and replace the legacy field on profile save. Independent source review identified an old valid case where the dedication total was below the song price. That cannot become a nonnegative add-on without changing a price, so the app marks the profile for pricing review, hides guest prices, blocks new reservations and automatic opening, and prompts the musician to set an add-on in Perfil. Review also found that Firebase Open/Resume needed the dedicated translated error; corrected and covered by the emulator test. Existing request quotes are unaffected.

Verification: TypeScript checks and production build passed. Local suite: 24 API tests passed with one emulator-only skip, plus 5 web tests. Firebase emulator suite: 2 API tests and 3 rules tests passed. Browser inspection checked the existing demo profile and guest QR, including a 390px mobile request dialog. The visible example is ARS 3,000 song + ARS 1,500 dedication = ARS 4,500 total. No new demo request or payment was created in the browser. Production deployment and physical-device review remain pending.

## Follow-up: live capacity contingency and guest updates (2026-11-05)

The Product Owner specified that the musician cannot lower a live show below songs already played plus one contingency song. Existing committed requests are an additional floor. With seven played of eight, the minus control is disabled and the server rejects capacity seven; increasing to nine is allowed. Both the demo repository and Firestore transaction enforce the rule, with show-version conflict checks retained. The direct show editor uses the same server rule.

Capacity and availability changes in Firebase now write a public `publicUpdates/{slug}` projection in the same transaction, containing only show ID, capacity, occupancy, status and an opaque revision. Guest menus subscribe with read-only Firestore rules, apply capacity changes immediately, then reconcile the full REST menu. The local demo polls the guest menu every second. A changed or finished show clears the old guest menu immediately; a late REST response is patched with the latest signal. The full refresh is bounded even during successive signals, with polling fallback if the listener fails.

Independent source review found two guest-menu races: repeated events indefinitely postponed a full refresh, and a delayed REST response could overwrite a newer capacity signal. Both were corrected. Tests cover seven of eight played, Firebase capacity projection and its read-only rules, stale REST response protection, consecutive signals and show-switch deactivation. Production deployment remains paused; physical-device and release review are pending.

The reviewer then found that a stale Firestore signal could override newer REST data after listener failure. The listener now clears its signal on failure, and REST reads begun after the bounded reconciliation window regain authority; a reverse-race regression test covers this. The reviewer rechecked the fix and reported no remaining concrete blocker. Final checks: API tests 25 passed (one emulator-only skip), web tests 9 passed, Firebase emulator integration 2 passed, rules tests 6 passed, TypeScript and optimized build passed. Both the demo guest page (3000) and Firebase preview guest page (3001), plus the preview API (4001), returned HTTP 200 after the test run. No production deployment or physical-device review occurred.

## Follow-up: unified dropdown controls (2026-11-05)

The user supplied a screenshot of the native blue show dropdown and asked for all dropdowns to match the monochrome app. Replaced the four native select controls (language, live show, song folder, CSV import folder) with one Radix-based SelectField primitive using the shared Tailwind theme. It has consistent borders, selected-state checkmarks, touch-sized rows, focus styling, keyboard navigation and a bounded menu. Folder controls retain the empty “No folder” value; an empty show list displays “No active show.”

Browser inspection of the actual local portal showed the new show menu and the folder menu inside the Add song dialog. Escape first closes the dropdown while preserving the dialog; a second Escape closes the dialog. Arrow-key navigation through language options was verified without changing the saved language. Independent review found long labels could clip in narrow menus; option text now wraps within the bounded menu. TypeScript, the nine web tests and optimized build passed. The running local portal and repertoire routes returned HTTP 200. Physical-phone and production review remain pending.

## Follow-up: WhatsApp contact and CBU bank field (2026-11-05)

The Product Owner removed the separate public telephone field, retaining only WhatsApp for phone contact. The profile editor and public profile no longer show a telephone input/link. Legacy phone fields are removed from demo state on read and from Firestore musician documents on the next profile save; DTOs never return them.

Bank details now include an optional CBU alongside account holder and transfer alias. The server accepts either an empty value or exactly 22 digits, preserving leading zeros. The CBU stays out of the public musician profile and is snapshotted on a newly reserved request, so later edits do not change an earlier guest's transfer instructions. The held-request page shows and copies it when present. Existing requests without a CBU remain readable. No bank settlement or ownership verification is claimed.

Independent source review found no concrete privacy, validation, migration or UI issue. The isolated local API suite passed 26 tests with one emulator-only skip; Firebase emulator integration passed 2 tests and Firestore/Storage rules passed 6 tests. TypeScript and optimized build passed. Browser inspection of the local Perfil screen confirmed WhatsApp and CBU are present and Teléfono is absent. Demo and Firebase preview pages plus preview API returned HTTP 200; no production deployment or physical-device review occurred.
