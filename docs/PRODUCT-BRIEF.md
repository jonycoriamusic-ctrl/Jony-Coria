# Musica a la carta product brief

> **Capacity update (2026-11-05):** Per-song limits have been removed. Songs may repeat while total show capacity remains. En vivo offers plus/minus controls for that total. A reduction cannot go below committed requests or below one more than the songs already played. For example, with capacity 8 and 7 songs played, 8 is the minimum. Guest menus receive capacity changes immediately through a public Firestore update; the local demo polls every second. Earlier per-song-limit rules below are superseded.
> **Current policy update (2026-11-05):** The user removed musician payment approval. A guest’s “Ya transferí” immediately enqueues the request in good faith, retaining capacity and without setting bank-verification timestamps. Receipt upload remains optional/private. There is no review queue, confirmation endpoint or overdue-review intake pause. Earlier manual-review requirements below are superseded by this decision; independent bank/API verification remains absent.
> **Show scheduling update (2026-11-05):** The musician creates shows with an Argentina start date and time. The same printed QR automatically resolves the scheduled show when its start time arrives. Each show has a 24-hour window unless a later show starts first. A finished show stays finished; an older draft never reopens as a fallback. Earlier explicit-activation language below is superseded.
Musica a la carta lets bar guests request a song that the performing musician knows, optionally add a dedication, and pay the musician. Jony is the first musician; the product supports separate musician accounts and repertoires from the first release. The core experience is mobile-first web, reached by scanning the musician’s reusable QR displayed on tables, with responsive tablet and desktop layouts for both guests and musicians.

## Confirmed requirements

- Public song menu and ordering flow accessible by one permanent musician-owned QR and ordinary web link; all tables may display the same QR.
- A musician account with Firebase email/password authentication, profile, repertoire upload/management, and separate prices for a standard song and a song with a dedication message. Guests do not register or create a profile.
- One active show per musician at a time, with a musician-defined cap and repertoire that can be updated live. The first pilot has one musician.
- Dynamic song availability and a private incoming queue usable on the musician's phone.
- Manual bank transfer to an alias or CBU initially, with private screenshot upload and confirmation by the musician after checking the bank. Mercado Pago verification remains a later phase.
- Argentina first, Argentine Spanish by default, with English, Portuguese, and two additional languages.
- Shared black-and-white application theme and reusable frontend components. Each musician can upload a profile image and banner and publish their contact information and social links.
- English code and a monolithic web framework. Firebase Auth/Firestore and an Express/TypeScript REST backend are now the working direction, replacing the earlier SQL/MongoDB alternatives.
- MVC with Clean Architecture on the server, frontend domain/presentation layers with deliberate state management, and immediate optimistic interaction with truthful pending/recovery states.

## Confirmed design direction and proposed navigation

The product name is **Musica a la carta**, using the spelling supplied by the Product Owner. The user requests Airbnb-inspired design and Apple's "less is more" approach, with a mobile-app-like web experience and bottom navigation, also responsive on tablet and desktop.

The confirmed application palette is black and white, with neutral grays for hierarchy, borders and disabled/loading states. The shared theme source is [theme.css](../apps/web/src/styles/theme.css). Reusable components use Tailwind semantic utilities for color, typography, spacing and radii, plus responsive and reduced-motion variants. Styling is utility-first; avoid screen-specific CSS and palettes. Musician-uploaded images retain their original colors by default. Our proposed interpretation is clear hierarchy, generous spacing, readable typography, consistent controls, conversational Argentine Spanish and immediate feedback. Payment totals, deadlines and unresolved status remain visible. Favor original product styling and reusable components. These are project design proposals, not claims of endorsement or completed design review.

Proposed guest tabs: **Carta**, **Mis pedidos**, **El show**. The show view includes the musician profile and contact/social links, with a persistent public musician page available even when no show is active. Proposed musician tabs: **En vivo**, **Repertorio**, **Shows**, **Perfil**. Tabs navigate stable top-level destinations; requesting a song, confirming payment and starting a show remain in-context actions. Adapt navigation to a sidebar or header on larger screens. Preserve browser back behavior, labeled icons, keyboard access, focus, reduced motion and bottom safe-area/virtual-keyboard clearance. Reference: [Apple tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars). Airbnb's published design case study provides a reference for consistent, conversational presentation: [Airbnb design case study](https://design.google/library/airbnb-invites-you-in).

An app-like appearance is required; installable PWA behavior and push notifications remain separate scope decisions. Prototype the guest journey and musician's live screen before settling visual details.

## Public musician profile

Every musician can upload/replace/remove a profile image and banner, edit their stage name and biography, and publish contact details and social links. Contact fields are public email, WhatsApp number and website; there is no separate public telephone field. Social links support a platform label and URL, including Instagram, TikTok, YouTube, Facebook and Spotify. All contact fields are optional. Saving explicitly selected public fields publishes them; login email and private bank/receipt details are never copied automatically into the public profile. Bank details include the account holder, transfer alias and optional CBU. A request retains the bank details shown when it was reserved.

Guests can open the profile from the show/menu, including when requests are closed. A stable `/m/{slug}` profile shows the musician identity and published links independently of the active show. Follow/contact buttons open the relevant external platform, email client or dialer; no guest account, in-app following system, chat or social API integration is required.

Use a square avatar and wide banner with crop/position preview, initials and neutral-cover fallbacks, and responsive image sizing. Proposed banner crop is 3:1; store focal positioning so the musician's subject remains visible on smaller screens. Keep essential text outside the photo for predictable contrast. Empty contact sections are omitted. Images are never required to publish a profile or start a show. The public profile can have color photos while the app controls remain monochrome.

## Proposed MVP rules

These defaults make the plan concrete and remain adjustable before implementation. See [decisions](DECISIONS.md).

| Topic | Proposed rule |
| --- | --- |
| Additional languages | Italian and French; Portuguese is Brazilian Portuguese |
| Prices | The musician sets a song price and a dedication add-on in ARS. A request with dedication costs their sum, shown as a breakdown and total before payment. Existing request quotes remain unchanged |
| Price changes | New reservations use the current price; existing reservations retain their quoted amount and payment destination |
| Ordering | One song per request; a dedication is optional and requires the dedicated option |
| Dedication | Plain text, maximum 280 characters; recipient/name optional within message; no HTML or links rendered as active content |
| Guest access | Confirmed: no registration, credentials or guest profile. Proposed internal mechanism: transparent Firebase anonymous identity plus private recovery capability |
| Capacity | Number of paid requests the musician commits to perform; their own opening/closing songs sit outside this number |
| Repeats | Musician controls this preference; propose a profile max-per-song setting defaulting to 1. Every accepted request consumes one performance slot |
| Queue order | Musician controls the queue; propose verified-payment order as default and manual reordering of confirmed queued requests; no paid priority tier |
| Reservation | Ten minutes to submit a transfer claim; server time is authoritative |
| Transfer review | Keep the slot while the claim is reviewed; alert and pause new reservations if still unreviewed fifteen minutes after submission, never automatically free a possibly paid slot |
| Verification | Guest may attach a private transfer screenshot; musician checks the bank outside the app and confirms manually. No OCR or automated settlement inference |
| QR | One permanent musician-owned URL resolves the scheduled show automatically by its start date and time. Same QR at every table; no table inventory, required table selection or table routing |
| Initial operation | One musician in the pilot; one active show per musician across all venues, one performer per show |
| Catalog upload | CSV with preview and validation; manual song editor; PDF/image recognition deferred |
| Refresh | Protected live queue and own-status listeners; menu through REST, refreshed on focus/submit; bounded polling only as a listener fallback |
| Time | Store UTC instants; show venue dates in `America/Argentina/Buenos_Aires` |

## Guest experience

1. **Scan and orient.** The musician's reusable QR opens their active show with musician name, venue, language, current menu and availability. There is no registration or table-selection step. No active show means a clear closed page without payment instructions.
2. **Choose.** Search title/artist and select “Pedir canción” or “Pedir con dedicatoria.” Display current musician-configured totals and availability. Dedications are private to the guest and musician.
3. **Reserve.** Review song, dedication and total. The server reserves a song allocation and a show slot before providing payment instructions. Concurrent last-slot requests cannot both succeed.
4. **Transfer.** Copy the musician's alias/CBU, transfer using the bank app, then return to the same request.
5. **Submit evidence.** Offer “Adjuntar comprobante” for a transfer screenshot and “Ya transferí.” Screenshot attachment is available in MVP; optional is the working default. An upload failure preserves the request and permits retry; it does not claim payment success or force a second transfer.
6. **Track.** Show “El músico está revisando tu transferencia.” Only after the musician confirms actual credit does the request enter the confirmed performance queue. Private request status survives reloads and ordinary banking-app switches.
7. **Arrange directly if needed.** For a request the musician cannot perform, show its actual status and “Hablá con el músico para coordinarlo.” The guest and musician arrange alternatives or refunds directly. There is no in-app refund, dispute, support-chat or repayment-details workflow.

## Musician experience

1. Sign in using Firebase email/password; set up profile photo, banner, stage name/bio, public contact/social links, payment details, repertoire, song price and dedication add-on. The first pilot is Jony; no helper account is required.
2. Create a show with venue/time, requested-song cap and repertoire. The show opens automatically at its scheduled Argentina time if the musician's verified account, transfer details, prices and selected repertoire are ready. Profile price settings supply the current public menu; existing requests retain their quoted amount.
3. Print the musician's QR once and display copies at any table. The next scheduled show appears through that same QR when it starts. Menu/capacity edits change content behind the same QR.
4. During a show, add repertoire songs, enable/disable future availability or raise capacity. Lowering a cap cannot invalidate existing commitments. Playing a song still consumes a performance from the night's total.
5. View incoming transfer claims and private screenshots. Check the bank outside the app and confirm payment manually. A screenshot alone is not bank verification; the system does not access the musician's bank.
6. Manage the confirmed queue and mark songs playing/played. Proposed controls: verified-payment order by default, with manual reorder of confirmed queued songs. Reordering never approves unpaid requests.
7. Pause/close intake or finish the show. Warn about remaining requests and preserve their actual statuses; closing a show does not assert they were played or refunded. Any unfulfilled request is arranged directly with the guest, outside the app.

## Public and private state inventory

| Surface | Required states |
| --- | --- |
| QR landing | Active show, no show, invalid or revoked QR, show paused, show full, show ended |
| Menu | Loading, available results, no search results, empty repertoire, unavailable song, stale availability, connection lost |
| Order form | Standard, dedication, missing/oversized message, price changed, simultaneous last-slot loss, rate limit |
| Transfer | Reserved, copy success/failure, timer running/expired, return from bank app, claim submitted, duplicate claim, screenshot selecting/uploading/ready/failed, uncertain network response |
| Request status | Under review, review overdue, confirmed/queued, playing, performed, canceled, rejected, late payment, not performed / arrange directly |
| Musician account | Registration, verification, sign-in, password reset, expired session, unauthorized tenant access |
| Catalog and setup | Empty catalog, valid import preview, invalid CSV, duplicate songs, invalid prices/capacity, missing payment details |
| Musician show | No active show, live queue, no requests, payment review, review overdue, paused, reconnecting, close warning with remaining requests preserved |

State labels are translated; song titles and dedication text remain in their original language. Both guest and musician surfaces need localization. Payment state and performance state must remain distinct even when presented together.

## Scope priorities

**Must for the first pilot:** separate musician accounts; profile photo/banner/contact/social editing and public profile; shared monochrome theme and reusable components; repertoire management; CSV import; two prices; show/QR setup; five-locale plumbing and translated release copy; atomic reservations; private screenshot upload; manual verification; private status; phone queue; pause/close handling; audit history; basic abuse limits; backup and recovery.

**Later:** Mercado Pago automation, musician helper roles, advanced reporting, per-song price overrides if demanded, installation as a PWA, multi-room venues, and venue-operated QR routing across different musicians.

**Outside the current product:** streaming music, uploading copyrighted tracks, algorithmic song recommendations, public dedication feeds, guest social accounts, tips, split payments, marketplace commissions, ticketing, refund/dispute administration, and native iOS/Android apps.

## Acceptance targets

These are test targets, not measured results. Detailed cases are in [quality and acceptance](QUALITY-AND-ACCEPTANCE.md).

- A first-time guest can choose an available song and reach correct transfer instructions without creating an account.
- Simultaneous requests for the last show slot produce exactly one reservation; no losing request sees instructions to pay for an unreserved slot.
- Tapping “Ya transferí” never marks a payment verified. Only authorized verification can admit a request to the confirmed queue.
- A paid request cannot disappear because a timer expires, the browser reloads, or the musician performs a different song.
- The musician QR continues to work when a show changes; existing orders retain their original show, price, and destination.
- A musician cannot read or mutate another musician's private records. Guests cannot enumerate anyone else's requests.
- Under healthy network conditions, committed queue/status changes appear through protected realtime listeners, with latency measured in the pilot. Own mutations provide immediate pending feedback and reconcile on acknowledgment. Offline/cached snapshots visibly report stale data; bounded polling is a fallback, not a second active channel.
- Reversible metadata edits may appear optimistically. A pending reservation never reveals transfer instructions before commit, and a pending verification never appears as confirmed payment. Preserve drafts and reconcile uncertain outcomes without requesting a second transfer.
- Core flows work at a 360 CSS-pixel viewport, with keyboard access and enlarged text, on physical iPhone Safari and Android Chrome.
- All core flows also work on tablet and desktop browsers. Validate representative widths of 768, 1024, and 1440 CSS pixels, portrait/landscape tablet use, mouse/keyboard input, and browser zoom. Wider layouts can show menu/details or queue/details side by side without hiding functionality or changing payment rules.
- All customer-visible controls, errors, status messages, and money/date formatting work in the five selected locales with `es-AR` fallback.
- At the end of a pilot, every recorded request retains its actual performance and manually recorded payment status; unperformed requests remain visible for direct arrangement. The app does not claim to audit bank receipts or refunds.

## Confirmed scope and remaining preparation

The Product Owner confirmed: no guest accounts; musician checks transfers with screenshot uploads available; one musician-owned reusable QR; musician-configured prices and queue rules; direct arrangements outside the app for unfulfilled requests; and a one-musician pilot with one show at a time. These replace the former table-routing and in-app refund proposals.

Implementation defaults still distinguish product intent from engineering choices: anonymous guest session mechanism, optional single screenshot, profile-wide song and dedication add-on prices, manual queue reordering, and ten-minute unpaid holds. These are proposed controls, not claims that the user selected every detail.

The user will create Firebase resources. Actual launch prices are entered by the musician, not a development blocker. Italian/French and pt-BR remain proposed locale choices. Monthly budget, measured request volume and backup/retention settings remain operational preparation; do not claim a guaranteed free deployment. No additional product answer is required to prepare the next prototype.
