# Firebase production integration

## Authorized scope

The user authorized connecting Firebase, retaining the local Jony demo, and preparing the application for production. Latest steering: use only the existing `jony-coria` cloud project for production for now; no cloud non-production project. Complete Firebase before GitHub publication. Requested display name is Musica a la carta. The user-created Firestore database is in `nam5`; its location is immutable.

## Ownership

- Main agent: console configuration, environment boundaries, security rules, release preparation and integration validation.
- build_api: Firebase Admin identity, Firestore transactions, media, runtime bundle and API emulator tests.
- frontend_i18n: Firebase client authentication, identity-scoped state, registration/onboarding and guest routing.
- Independent review: pending final implementation.

## Verified console state

- Existing project ID: `jony-coria`; number: `1076626750334`.
- Project environment is marked Production. Display name remains Jony Coria; current account has no project-name editor in Firebase settings.
- User registered web app `1:1076626750334:web:5aa1ae5f2801e108c3912f`, nickname `musica a la carta`.
- Email/Password provider is enabled (user action, verified).
- Anonymous provider enabled by main agent and verified in provider list. Guests have no signup form; this identity protects their own requests.
- Current account: developer@inizia.agency, Firebase Admin. Project owner: jonycoriamusic@gmail.com.
- The user created a Standard, Firestore Native `(default)` database in `jony-coria`; the console shows it empty and reports location `nam5`. It is the production database. The local Jony demo is never copied into it.
- Published `firebase/firestore.rules` through the console: only exact `publicUpdates/{slug}` reads are public; list and all browser writes are denied, as are all other direct client reads.
- Created all seven composite indexes from `firebase/firestore.indexes.json` through the console. `firebase firestore:indexes --project jony-coria` returned seven live definitions, with no missing index after normalizing Firestore's implicit `__name__` field. A read-only Firestore Admin API status check subsequently returned `READY` for all seven.
- Obtained local Google Application Default Credentials for `developer@inizia.agency` through the user's browser verification. A read-only Admin SDK check listed zero collections in the real `jony-coria` database. A Web SDK read of the absent public `publicUpdates/jony` document succeeded; a direct read of `musicians/no-such-user` returned `permission-denied`.
- Firebase CLI authenticated as `developer@inizia.agency` and can list the project and database. Its rules/indexes deployment command received HTTP 403 because this account lacks `serviceusage.services.use` (`roles/serviceusage.serviceUsageConsumer` or equivalent). Console publication worked; automated deployment remains blocked by that permission.
- Local Admin Auth `listUsers` could not be exercised with user ADC: Identity Toolkit requires a quota project, and `gcloud auth application-default set-quota-project jony-coria` is denied by the same missing `serviceusage.services.use` permission. Auth behavior passed emulator integration, but production Auth Admin still needs hosted-identity or corrected local IAM verification.
- Storage page explicitly requires a billing account / Blaze upgrade. No bucket provisioned or billing changed.
- No API/frontend deployment yet. The production database has no seeded Jony profile or demo requests.

## Local evidence

- Production web configuration saved in `config/prod.env.example`; these are public SDK identifiers, not server credentials. Analytics is not initialized.
- `.firebaserc` includes only prod alias. Local emulators use a `demo-` project ID explicitly and never access production.
- Firestore rules allow only exact public availability document reads and deny every browser write; Storage rules deny direct access. Business access goes through Express authorization and the Admin SDK.
- Emulator rules suite: 6/6 cases passed for unauthenticated, anonymous guest and musician identities, rejecting direct internal database reads/writes and receipt reads/uploads.
- Production dependency audit: zero advisories after dependency fixes; developer tooling audit remains separate.
- Firebase emulator integration and a read-only production smoke test passed. Hosted API/frontend end-to-end testing, exact release-candidate visual review and physical-device checks remain pending.

## Release prerequisites

- All seven Firestore indexes are Ready. A server-side read with production credentials succeeded and confirmed zero collections. The database already exists in `nam5`; do not try to recreate it in Santiago.
- Grant the deployment identity `serviceusage.services.use` before using Firebase CLI deployment or local Auth Admin tests. This is not needed for the console-created rules/indexes already present or the successful Firestore Admin read.
- Project rename by an account with project-update permission.
- Server hosting and credentials remain open. Cloudinary Free replaces Firebase Storage for images; the Spark plan remains unchanged.
- Production server credentials via managed identity or a deployment secret; never public frontend environment variables or committed keys.
- Actual deployed frontend/API URLs, authorized Auth domain and API origin configuration.
- End-to-end tests and review of the exact release candidate; physical-device checks remain pending.

## Cloudinary and final integration evidence

The user selected Cloudinary Free, then opened their existing account. Its server credential is stored in ignored `.env.cloudinary.local` with mode 0600; never copied into public config. The live smoke test uploaded a synthetic white image as an authenticated asset, downloaded it through a server-only signed URL, confirmed unsigned delivery was blocked, and removed it. No user receipt or profile image was used. Three adapter tests cover protected/sanitized uploads, private download boundaries, and invalid path/origin rejection. Firebase Storage is now optional, not a release dependency.

Backend tests include real emulator password/anonymous authentication, capacity races, tenant isolation, private receipts, 505 discarded-request churn, and cross-instance catalog-cache invalidation. Independent review identified and verified fixes for Functions consumed multipart bodies, historical queue truncation, production environment preparation and excessive catalog reads. Its final source review reports no additional release-blocking code findings; it is not a live production sign-off. Frontend verification passed typecheck, five release-config tests, and an optimized production build.

Production templates select Cloudinary. The Functions preparation script copies cloud name/API key only; API secret must come from the host's runtime secret store. Firebase Functions remains an optional deployment requiring Blaze; hosting without paid Firebase billing needs an external Node/Express host. No cloud non-production project or live application deployment has occurred.

Final local verification: workspace typecheck passed; 26 API/local tests and 9 frontend tests passed (the emulator integration is intentionally skipped in the ordinary test command). The Firebase emulator integration passed 2/2 tests; direct-access rules passed 6/6 tests. The production Express process started against real `jony-coria` using local ADC and Cloudinary credentials; `/api/v1/health` reported Firebase/prod, the absent Jony public menu returned 404, and `/api/v1/demo/guest` returned 404. The temporary production process was stopped. The local demo remained available on ports 3000/4000 and still reports `local-demo`/`non-prod`. Production dependency audit reports zero advisories. Secret exclusion scan found no Cloudinary secret in any Git-eligible file.
