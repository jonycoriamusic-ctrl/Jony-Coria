# Low cost hosting and layered application architecture

Date: 2026-11-05. Status: planning update complete; document checks passed.

## Scope and ownership

Product Owner: Micaela. Main agent: engineering/product planning and document verification. Independent design review, implementation engineering, and runtime QA are pending for the build phase. This update does not claim an independent review of a running application.

User priorities: very low maintenance cost, free tiers where possible, consideration of MongoDB/Mongoose, MVC with Clean Architecture on the server, explicit frontend domain/presentation and state management, and optimistic interaction throughout.

## Delivered decisions

- Retained Next.js/TypeScript as one application; MongoDB Atlas Free/Mongoose is the revised database proposal, with transaction/index semantics specified. Database choice is not falsely recorded as confirmed.
- Added `docs/APPLICATION-ARCHITECTURE.md`: dependency direction, thin controllers, application use cases, framework-independent domain, Mongoose adapters, frontend state ownership, optimistic/pending behavior and reconciliation.
- Reworked hosting around a Netlify Free plus Atlas Free candidate, quotas/connection validation, optional low-cost daily snapshots, and a small paid Node fallback. The earlier Vercel/Supabase/PITR budget is superseded.
- Withdrew proposed five-minute-loss/one-hour-recovery guarantees from the cost-first MVP. Daily recovery is an explicit proposal with restore evidence still required.
- Adapted reservation concurrency to a MongoDB show-guard transaction protocol instead of assuming SQL row locks. Preserved earlier PostgreSQL design as a clearly labeled reference, not a second production adapter.
- Made guest polling less frequent and suspended hidden/terminal polling. Added optimistic conflict, unknown-outcome, stale-response, cache-isolation and layer-boundary acceptance cases.

## Evidence and verification

Official hosting/database/state-library sources are linked in the hosting and architecture documents. Netlify's current pricing governs credits; its older free-plan announcement is used only for commercial-project eligibility, not obsolete quotas. Render's free sleep behavior is distinguished from its paid runtime. Atlas daily snapshot pricing is distinct from free database storage.

Document checks passed: 31 local links resolved, balanced code fences, current recommendation/status consistency reviewed, and polling arithmetic verified (17.33 requests/second and 249,600 over four hours for the stated hypothetical workload). Future runtime checks include actual Netlify/Atlas transactions and pooling, quota consumption, cold starts, the small-instance fallback memory, restore, and physical-device optimistic/error flows.

No cloud resources, subscriptions, application code, live payments, or production schemas were created. Continue with architecture/design evidence and a small deployment compatibility spike before accepting the proposed free tier for live shows.
