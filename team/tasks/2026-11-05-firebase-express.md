# Firebase and Express architecture update

Date: 2026-11-05
Scope and intended outcome: Explain and document how an Express/TypeScript REST server fits the user's preferred Firebase platform while retaining mobile-first presentation, Clean Architecture and low operating cost.
Status: Planning documentation complete; implementation and operational validation pending.

## Ownership

Product Owner: Micaela Piacenza.
Engineering documentation: Codex, primary agent.
Independent architecture, security, QA and design review: pending for implementation; no independent approval claimed by this update.

## Experience and acceptance criteria

Guests browse without registration and use anonymous Firebase identity for private requests. Musicians sign in through Firebase Auth. Express owns capacity, pricing, payment verification and business writes. Protected Firestore listeners update musician queues and individual guest status. Pending UI never implies confirmed money or a reserved slot before server acknowledgment. Mobile-first, tablet and desktop requirements remain unchanged.

## Architecture and design evidence

Selected working stack: Next.js/TypeScript, Express/TypeScript, Firebase Auth and Cloud Firestore Standard. Plain TypeScript domain models and runtime validation replace Mongoose. Server-side Admin SDK authorization and browser Security Rules are separate boundaries. Transactional read projections prevent exposing payment details through live listeners. Current Firebase documentation supports wrapping Express in a second-generation HTTP function and requires Blaze billing for deployment; no-cost allowances do not guarantee a zero bill. Source links are recorded in the design and hosting documents.

The prior MongoDB implementation plan is preserved as a superseded reference. Required interactive simulations, device observations and independent design review remain pending before production implementation under the team's quality gates.

## Delivery and verification

Created `docs/FIREBASE-EXPRESS.md` and the historical MongoDB reference. Updated active technical implementation, application architecture, hosting, product brief, stack comparison, decisions, acceptance criteria, repository instructions and team overview to the current direction. Documentation checks cover local links, fenced blocks and stale active stack language. No application code, runtime tests, provider resources, billing changes or deployment were produced. This folder is not currently a Git repository.

## Decisions and handoff

REST is the sole business write path; client listeners are read-only. API and frontend remain in one repository with separate deployment entrypoints. Next work is to validate the interaction/architecture simulations and implement a reservation-to-queue vertical slice with transaction contention and authorization tests. Hosting provisioning, backup costs and restore evidence remain open operational work.

## Product and design clarification follow-up

Recorded the user-confirmed name `Musica a la carta`, Firebase email/password authentication, Airbnb/Apple design inspiration, mobile web bottom navigation and user-owned Firebase provisioning. Guest registration scope is explicitly unresolved. Proposed navigation and six groups of product/operational questions are recorded in the product brief. Updated active documentation branding and corrected a repository-mapping sentence. Documentation checks only; no implementation, design approval, team consensus or device-test evidence claimed.

## Confirmed product decisions from six annotations

Scope: reconcile all six Product Owner answers across the current plans; documentation only. Status: complete. Engineering documentation owner: primary Codex agent; no new independent review or runtime evidence claimed.

1. Guests have no registration or profile; only musicians use email/password profiles. Transparent anonymous guest identity remains a technical implementation choice.
2. Musician checks bank transfers; include private screenshot uploads in MVP. Uploads cannot confirm money.
3. One reusable musician-owned QR serves all tables and resolves the single explicitly active show. Live repertoire/capacity updates do not change the printed QR. Removed table route entities and table-selection endpoints.
4. Musician profile owns prices and queue preferences. Default controls are marked as proposals; quote/version/capacity protections persist across live edits.
5. Unfulfilled requests and any refunds are arranged directly outside the system. Removed refund-ledger, support-ticket and resolution endpoints/acceptance requirements; preserve truthful request/payment history.
6. Pilot has one musician and one show at a time. Enforce active-show exclusivity per musician across venues. Budget was not supplied; no free-cost guarantee inferred.

Updated product brief, decisions, technical plan, Firebase/Express design, state architecture, hosting, acceptance plan, README and engineering/quality instructions. Historical reference documents and earlier task entries remain historical evidence. Cloud Storage billing requirements were checked against Firebase's official documentation and added to hosting. Source: https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024.

Verification: scanned active docs for superseded table/refund/guest-scope requirements, checked local Markdown links and fenced blocks, and checked the core revised data model and routes. Runtime tests, device evidence, infrastructure creation and deployment remain unperformed. The next work is the existing prototype/review sequence; no new product clarification is needed to prepare prototypes.
