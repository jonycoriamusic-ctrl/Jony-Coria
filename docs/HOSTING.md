# Low cost Firebase and Express hosting for Argentina

The selected direction is Next.js frontend, Express/TypeScript REST API, Firebase Authentication and Cloud Firestore Standard. Free allowances and low operating cost remain priorities. The production project `jony-coria` has Email/Password and anonymous Auth, Firestore in `nam5` with rules and indexes, and Cloudinary Free for images. The `musicaalacarta` Netlify Free project now exists; Next.js and the Express API are configured for one same-origin deployment. The live release status is in `docs/NETLIFY-RELEASE.md`. Sources checked 2026-11-05.

## Proposed deployment

| Component | Proposed host | Cost boundary |
| --- | --- | --- |
| Next.js frontend | Netlify Free | Monthly credits and framework/runtime limits; can pause when exhausted |
| Express REST API | Netlify Function alongside Next.js | Included in the Netlify Free fixed monthly allowance; no Firebase Blaze upgrade |
| Identity | Firebase Authentication | Email/password musicians and anonymous guests; check configured auth quotas; no SMS in MVP |
| Database and realtime views | Cloud Firestore Standard | Free database quota, then paid usage on Blaze |
| Transfer screenshots | Cloudinary Free authenticated assets, accessed through Express | User-selected; shared 25-credit storage/traffic/transformation quota; no card required |
| Profile avatar/banner | Separate Cloudinary profile namespace, sanitized variants served by public Express route | Shared Free credits; upload/download usage separate from private receipt authorization |
| Backup/recovery | Firestore-supported backup/export process to be selected | Not included in the database free allowance; former Atlas pricing no longer applies |

Netlify supports wrapping Express in a Function alongside a frontend application. The existing Firebase Functions entrypoint remains an optional deployment target; the app retains one backend codebase. [Netlify Express integration](https://docs.netlify.com/build/frameworks/framework-setup-guides/express/), [Firebase Express integration](https://firebase.google.com/docs/functions/http-events).

Deploying Functions requires the Blaze plan. This is pay-as-you-go with no-cost allowances, not a promise of a zero bill. Builds/artifacts, logs, networking, API execution, database reads/writes, storage and backups must all be accounted for. Set minimum instances to zero for the cost-first pilot, bound instance growth and requests, and monitor cold starts. Budget alerts are notifications, and an instance limit is not a hard currency cap. [Deployment requirements](https://firebase.google.com/docs/functions/get-started), [Firebase pricing](https://firebase.google.com/pricing).

Netlify currently offers a 300-credit monthly Free plan and Next.js support; verify remaining usage before a show. The fixed Free limit can pause the site when exhausted. Do not silently enable an upgrade. [Netlify pricing](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/), [Next.js support](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/).

## Image storage cost

**Confirmed update:** the user selected Cloudinary Free instead of Firebase Storage. Synthetic authenticated upload, authorized download, unsigned-access denial and deletion passed against their Cloudinary account. All assets are authenticated in Cloudinary; published profile images are exposed through the public API, while receipt reads require ownership. The server re-encodes images before upload. Cloudinary Free includes 25 credits shared between storage, bandwidth and transformations, with no card required; this is a bounded allowance, not unlimited hosting. [Cloudinary pricing](https://cloudinary.com/pricing), [protected delivery](https://cloudinary.com/documentation/control_access_to_media). The Firebase Storage discussion below describes the rejected default, retained only for the optional adapter.

Transfer screenshots and musician profile images/banners require object storage in the MVP. Published profile variants are publicly viewable; receipts remain private. Profile images persist while referenced and use separate cleanup from receipt retention. Firebase Storage requires Blaze billing even if some usage is free. New default buckets follow Google Cloud Storage pricing; the documented Always Free storage regions are US regions, not Santiago. Compare storage/transfer cost and latency before bucket creation; do not promise a zero bill. Proposed controls are one optional image per request, a 4 MiB upload limit, image re-encoding, bounded reads and 30-day retention after show end, subject to operational confirmation. [Firebase Storage requirements](https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024).

## Argentina and region

The user-created production Firestore database is in `nam5`, which cannot be changed after creation. Earlier plans proposed Santiago (`southamerica-west1`) because it is closer to Buenos Aires; that proposal no longer describes the actual database. Firebase recommends `us-central1` for a function serving a `nam5` database, so the optional Functions entrypoint now defaults there. An external API host should likewise account for database latency and be measured from Argentina before launch. The frontend CDN location does not establish the API's region. [Firestore locations](https://firebase.google.com/docs/firestore/locations), [Functions locations](https://firebase.google.com/docs/functions/locations).

Netlify Free uses the default Ohio Function region; São Paulo selection requires Pro/Enterprise. This is reasonably close to the existing US `nam5` database, but Argentina latency still needs measurement on the deployed app. [Netlify Function regions](https://docs.netlify.com/build/functions/configuration/).

## What can remain free

Firestore's documented free database allowance includes 1 GiB storage, 50,000 document reads/day and 20,000 writes/day. It applies to one eligible database per project. Listener initial data, document changes and certain reconnects consume reads, and transaction/read-model fanout adds writes. Do not estimate cost from song count alone. Backups, restores, TTL deletion and PITR do not have the same free allowance. [Firestore billing](https://firebase.google.com/docs/firestore/pricing).

One musician and a bounded show may fit free usage, but no measured budget exists yet. Target low usage with exact-document guest listeners, a show-scoped musician listener, bounded menu reads, no redundant polling, no needless projection rewrites, and short API operations. Stop hidden/terminal listeners while accounting for reconnect reads.

Netlify is the selected external Express host, and Cloudinary Free is the selected image provider. Neither requires Firebase Storage billing. Cold-start latency still needs testing before a show.

The previous $3 Atlas daily-snapshot add-on and five-minute-loss/one-hour-recovery proposal do not apply. Choose a modest Firestore backup/export schedule with actual pricing, restore evidence and an explicit recovery gap before the paid pilot. Reconcile external bank transfers after restoring state.

## Operational requirements

- Use managed application credentials on Firebase/Google hosting. The Express runtime service identity is server-only and least privileged. Never ship service-account files, provider credentials or Admin SDK access to the browser.
- Configure origins/API base URL, Firebase authorized domains, email verification/recovery links and index/rules deployment. Firebase ID tokens authenticate REST requests; private reads have independently tested rules.
- Store deadlines durably. Commands and relevant reads enforce expiry/overdue policies even when housekeeping has not run. A scheduler, if enabled, is bounded/idempotent and its own billing is considered; no in-process timer is treated as durable in Functions.
- Keep the local demo/emulators and production data/credentials separated. The user selected no cloud non-production project for now; never route deploy previews to production writes.
- Validate the Next.js adapter, Express function, Admin transactions, read projections, authenticated listeners, cold starts and current quotas in a small deployment spike. Mock tests are insufficient for regional latency or contention.
- Monitor read/write volume, listener reconnects, API errors, invocation duration, failed backups and index/storage growth. Pause intake when infrastructure cannot accept new commitments safely.

## Remaining choices

The Firebase project, Authentication providers and Firestore already exist. Cloudinary Free replaces Firebase Storage. The Netlify Free project and same-origin Express deployment configuration also exist. Before the live release, the project owner must supply a least-privilege Firebase service account for the Netlify Function; then run the hosted guest/musician/QR checks and decide backup/receipt retention. No paid billing has been activated.
