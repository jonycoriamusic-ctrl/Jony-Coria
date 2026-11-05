# Musica a la carta decision register

Date: 2026-11-05. User requirements are distinguished from planning defaults. Defaults make the implementation proposal coherent; they are not recorded as user approval.

| ID | Decision | Status | Reason or next action |
| --- | --- | --- | --- |
| D01 | Mobile-first web with responsive tablet and desktop layouts for public QR flow and musician portal | User requirement, clarified | One application serves all device sizes with the same capabilities |
| D02 | Separate musician profiles, repertoires, prices, nightly capacity | User requirement | Jony is first user, not a hardcoded singleton |
| D03 | Modular Express backend plus Next.js frontend in one repository | User direction, refined | Two deployment entrypoints; one business backend and one Firestore database |
| D04 | Firebase Authentication and Cloud Firestore Standard | User-selected working direction | Replaces MongoDB/Mongoose to reduce identity and realtime integration work |
| D05 | Next.js frontend and TypeScript Express REST API | User direction | Framework boundaries independent of domain logic; Express owns all business writes |
| D06 | es-AR first; English and Portuguese | User requirement | English code, translated UI |
| D07 | pt-BR, Italian, French | Proposed locale choices | Confirm regional Portuguese and the two additional languages |
| D08 | Musician owns prices in their profile; public menu displays those settings | User requirement | The base song price and dedication add-on remain configurable; no hardcoded amounts. Per-song overrides are not requested |
| D09 | Ten-minute reservation; alert and pause new reservations when a claim remains unreviewed for fifteen minutes | Proposed operating defaults | Claimed transfers retain capacity while verified; existing valid holds remain honored; observe real bank-app behavior in pilot |
| D10 | Musician controls song-repeat preferences | User direction; control details proposed | Propose profile default max performances per song, initially 1; validate committed allocations before lowering |
| D11 | Performed songs consume nightly capacity | Proposed interpretation | Capacity represents total requested performances, not current queue length |
| D12 | Musician controls queue preferences | User direction; control details proposed | Propose verified-payment order by default with manual reorder of queued requests; these controls are implementation proposals |
| D13 | Alias/CBU and manual verification first | User requirement | Transfer declaration and receipt cannot establish settlement |
| D14 | Money goes directly to the musician; musician checks transfers | Confirmed operating direction | No bank reconciliation automation, wallet or commission ledger in MVP |
| D15 | Mercado Pago automated verification later | User requirement for later phase | Choose provider checkout/API family and merchant account model before integration |
| D16 | One reusable musician-owned QR resolves the active show | User requirement | Same code across tables; content changes with show/menu/capacity and automatically follows the scheduled show by Argentina date and time |
| D17 | At most one active show per musician, across all venues | User requirement | Enforce a musician-level activeShowId transaction guard, not a per-venue guard |
| D18 | Manual entry and CSV repertoire import | Proposed upload format | Structured import is testable; no OCR/PDF parsing in initial scope |
| D19 | Guests have no registration or profile; only musicians have accounts | User requirement | Transparent anonymous Firebase identity is the proposed access mechanism for private status and receipts |
| D20 | Protected Firestore listeners for current queue and own guest status | Revised Firebase implementation | No parallel polling; bounded REST initial/fallback reads and menu refresh |
| D21 | No automatic expiration after transfer claim | Proposed safety rule | An unseen/late bank settlement must not silently oversell a performance |
| D22 | Unfulfilled requests and refunds arranged directly with musician | User requirement | Remove in-app refund/dispute/support workflows; preserve truthful request status and prior payment confirmation |
| D23 | Free-allowance Next.js hosting plus Express on Firebase Functions | Revised hosting recommendation | Functions deployment requires Blaze billing; no guaranteed zero bill; external Express hosting remains an alternative |
| D24 | Low-cost Firestore recovery plan to be selected | Open operational choice | No five-minute-loss/one-hour-recovery guarantee; old Atlas $3 backup pricing does not apply |
| D25 | MVC plus Clean Architecture on server | User requirement | Thin transport controllers, application use cases, domain rules, infrastructure adapters |
| D26 | Frontend domain/application/presentation and explicit state management | User requirement | TanStack Query for remote state; local/reducer state for forms and UI; no redundant global server cache |
| D27 | Immediate optimistic interaction with reconciliation | User requirement, implementation policy defined | Predict reversible updates; show pending for scarce capacity, musician payment confirmation until server acknowledgment |
| D28 | REST commands plus protected read-only Firestore projections | Proposed implementation | Admin SDK bypasses client rules, so API authorization and rule tests are separate requirements |
| D29 | Brand spelling: Musica a la carta | User requirement | Use the exact supplied name in product identity |
| D30 | Firebase email/password for musicians only | User requirement | Guests never enter account credentials; musician email verification/recovery included |
| D31 | Airbnb/Apple-inspired restrained mobile web with bottom navigation | User requirement | Proposed tab destinations and accessibility behavior are in the product brief; detailed design review pending |
| D32 | User creates Firebase resources | User instruction | Agent prepares design/configuration requirements; no provisioning performed |
| D33 | Pilot musician onboarding | Proposed implementation | Start with Jony; wider onboarding can be decided later |
| D34 | Private transfer screenshot upload in MVP | User requirement | Musician reviews manually; attachment never proves settlement; optional attachment is the working UX default |
| D35 | Live show menu and capacity edits | User requirement | Add songs and raise cap without QR reprint; reject cap below committed count; existing quotes remain unchanged |
| D36 | One-musician pilot | User requirement | One active show at a time; retain ownership boundaries for future musicians; monthly budget remains unspecified |
| D37 | Black-and-white app theme in one shared file | User requirement | Neutral grays support hierarchy; actual CSS tokens added in apps/web/src/styles/theme.css; uploaded photos retain color by default |
| D38 | Reusable frontend components | User requirement | Shared primitives/layout plus domain components; semantic theme tokens, typed view models and callbacks; no business rules in shared UI |
| D39 | Musician avatar, banner, contact information and social links | User requirement | Editable public profile; explicitly published contacts are distinct from login email; private receipts never enter public assets |
| D40 | Tailwind CSS for reusable components and responsive layouts | User requirement | Use v4 CSS theme and mobile-first utility variants; minimal centralized custom CSS only |

| D41 | Build the application now; connect Firebase last | User instruction, 2026-11-05 | Local demo uses explicit development-only sessions, JSON persistence and bounded polling; no cloud resources connected |

| D42 | Accept transfer declarations in good faith; no musician approval | User instruction, 2026-11-05 | “Ya transferí” atomically queues the request. Removes review queue and overdue-review pause; supersedes manual-approval portions of D09, D12–D14, D21 and earlier plans. Optional receipts remain private. Bank verification is not asserted. |

| D43 | Remove maximum requests per song; edit total capacity in En vivo | User instruction, 2026-11-05 | Supersedes D10. Repeated songs are allowed within the show’s total cap. Plus/minus controls update capacity with version checks; existing allocations remain protected. |

| D44 | Automatically switch the permanent QR by show date and time | User instruction, 2026-11-05 | Show starts use Argentina time and are stored as UTC. The latest scheduled show within a 24-hour window wins; a later show supersedes the prior one. Finished shows do not reopen older drafts. The 24-hour window is the current implementation default. |

| D45 | Dedication has an additive price | User instruction, 2026-11-05 | The musician sets a song price and a dedication add-on. Dedication total equals their sum. Show the breakdown before reservation and on the new request; preserve old request quotes. Convert ordinary legacy totals to add-ons without changing their combined price. If a legacy dedication total was below the song price, pause new requests until the musician sets an add-on; never silently increase the old price. |

| D46 | Preserve one contingency song when reducing live show capacity | User instruction, 2026-11-05 | The minimum is the greater of committed requests and songs already played plus one, without forcing an increase to a legacy show already at its maximum. The server rejects reductions below that floor; En vivo disables the minus button at the floor. Capacity changes are published to guest menus immediately through a public, read-only Firestore update document. Local demo uses one-second polling. |

| D47 | WhatsApp only for phone contact; add CBU to bank details | User instruction, 2026-11-05 | Remove the separate public telephone field and link. Keep the musician's WhatsApp number. Add an optional 22-digit CBU alongside the existing transfer alias and account holder; validate it, keep it out of the public musician profile, and snapshot it on each request so later bank-detail edits do not alter an earlier quote. |

## Implementation decision gate

The inherited builder-team guardrails require interaction exploration, three architecture-as-experience simulations, independent critique, and Product Owner architecture selection before production code or provider integration. The current technical plan and stack comparison prepare that decision; they do not claim to satisfy the simulation or device-review gates.

The user subsequently selected the Next.js/Express/Firebase direction and explicitly requested that building commence with Firebase last. A working local application now exists; see the implementation task for observed behavior and review evidence. The three comparative simulations and physical-device/release reviews remain uncompleted, rather than retroactively claimed as passed. Local demo polling is a temporary exception to D20 until Firebase listeners are connected.

## Production setup steering

On 2026-11-05 the user authorized Firebase integration and release preparation, then narrowed cloud infrastructure to only the existing `jony-coria` production project for now. Keep the Jony demo locally; no second cloud project. Desired display name: Musica a la carta. The user created the Standard `(default)` Firestore database in `nam5`; this replaces the earlier Santiago proposal. Email/password musician Auth and transparent anonymous guest Auth are enabled. Firestore rules and seven indexes are configured, and a read-only Admin SDK connection succeeded. No paid billing activation or live API/frontend deployment has been completed. See `team/tasks/2026-11-05-firebase-production.md` for verification and remaining gates.

The user subsequently selected Cloudinary Free for all images instead of Firebase Storage. The provider adapter is implemented and live-tested with synthetic content; Firebase remains responsible for Auth and Firestore. Cloudinary credentials remain server-only. This avoids the Storage Blaze requirement, but Firebase Functions would still require Blaze independently.
