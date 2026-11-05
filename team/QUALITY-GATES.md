# Musica a la carta quality gates

> **Current policy update (2026-11-05):** The user removed musician payment approval. A guest’s “Ya transferí” immediately enqueues the request in good faith, retaining capacity and without setting bank-verification timestamps. Receipt upload remains optional/private. There is no review queue, confirmation endpoint or overdue-review intake pause. Earlier manual-review requirements below are superseded by this decision; independent bank/API verification remains absent.
Adapted from the shared builder-team `DESIGN-QUALITY-GUARDRAILS.md`. These gates govern subsequent implementation; they do not prevent completing the requested planning package.

1. **Scope and experience:** identify guest/musician, venue context, primary action, information hierarchy, state inventory, non-goals, and measurable acceptance criteria. Explore interaction alternatives and record observed prototype-test evidence before choosing visual treatment or production UI.
2. **Architecture as experience:** before production code or provider integration, present at least three feasible interactive simulations with the same data and outcome, including timeout, offline, interruption, retry, duplicate submission, invalid result, and recovery. Compare responsibility, privacy, storage, cost, complexity, performance, and scaling. Product Owner selects the architecture; architecture, simplicity, QA, and security review it. A stack comparison or static diagram alone does not pass this gate. The source explicitly requires Product Owner selection before implementation; no additional approval is needed to write the current plans.
3. **Design ready:** UX provides reference screens for critical states, component anatomy, responsive behavior, final copy, typography/color/spacing tokens, icon rationale, keyboard/screen-reader behavior, reduced motion, and recovery. Independent Design Reviewer records findings and a decision. Creator and implementer cannot be their own independent reviewer.
4. **Implementation ready:** deliver a small vertical slice with server validation, database constraints/indexes, tenant checks, purposeful tests, seeded screenshots, and documented deviations. Include loading, empty, paused, full, expired, payment-under-review, error, and completed states where applicable.
5. **Quality and devices:** QA verifies functional and accessibility behavior separately from visual quality. Review current build on physical iPhone Safari and Android Chrome, tablet portrait/landscape, and desktop browsers, with small/large viewports, enlarged text/zoom, low-light context, touch/mouse/keyboard input, focus, safe-area insets, and weak connectivity. Inspect exact release candidate against references. Automated checks alone do not pass visual review.
6. **Release:** Product, Engineering, QA, and independent Design Reviewer record evidence-based decisions. Critical and High findings block release. Unknown or unavailable evidence stays pending. User is not the first serious visual reviewer.

## Music-specific acceptance boundaries

- A guest sees the musician, venue, show, price in ARS, remaining capacity, and payment conditions before transferring.
- An unverified transfer never silently enters the confirmed performance queue.
- Concurrent guests cannot oversell the last slot or a song's configured availability.
- A claimed transfer has visible manual review status; private screenshots are evidence only. Unfulfilled requests and any refunds are arranged directly outside the system; no in-app resolution/refund workflow is required.
- Dedication content is readable privately by the musician, safely rendered, and never exposed to other guests by a public queue endpoint.
- Lost network connectivity cannot produce a false payment or booking success.
- The musician can distinguish payments to review, confirmed requests, current performance, completed songs, and exceptions quickly on a phone.
- Code is English; guest and musician copy defaults to `es-AR`, with locale-safe money/date formatting and complete fallback behavior.

## Architecture and interaction requirements

Apply `docs/APPLICATION-ARCHITECTURE.md` from the project root: MVC/Clean Architecture, frontend domain/application/presentation, explicit cache/form state ownership, immediate pending/optimistic feedback, and deterministic reconciliation. Financial or capacity success must remain server-authoritative. Evaluate free-tier limits with the actual pilot workload.

## Evidence records

Store task decisions in `team/tasks/`; technical documents in `docs/`; future design references and privacy-safe device evidence in `design/`. Each review names the exact artifact/build, reviewer, states/devices checked, findings and severity, accepted deviations, and decision. Do not claim human approval, runtime tests, or device checks without evidence.
