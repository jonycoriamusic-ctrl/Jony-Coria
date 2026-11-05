# Express API: prod and non-prod

The API has two application environments: `APP_ENV=prod` and `APP_ENV=non-prod`. Local demo mode is a non-prod option; it is not a third environment. No real data is seeded by the Firebase path.

## Local demo

Run `npm run dev` from the repository root. The API binds `127.0.0.1:4000`; Next.js proxies `/api`. Demo musician: `jony@demo.local` / `musica-demo`. Guests receive random private sessions without registration. The alias `DEMO.NO.TRANSFERIR` is not a real payment destination.

Local state lives in `.data/demo.json`, images in `.data/media`; serialized atomic snapshots provide single-process demo persistence only. `APP_ENV=prod` or `NODE_ENV=production` refuses demo startup. Deployed Functions never expose demo auth routes.

## Firebase configuration

Real mode uses Firebase Admin credentials from the runtime/ADC, never browser service-account credentials:

- `APP_ENV=prod` or `non-prod`
- `DEMO_MODE=false`
- `FIREBASE_PROJECT_ID` for standalone execution, or runtime-injected `GCLOUD_PROJECT`
- `MEDIA_PROVIDER=cloudinary` (selected) or `firebase` (optional adapter)
- Cloudinary: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, server-only `CLOUDINARY_API_SECRET`
- Firebase Storage alternative: `STORAGE_BUCKET` (or legacy standalone `FIREBASE_STORAGE_BUCKET`); runtime `FIREBASE_CONFIG.storageBucket` also works
- `ALLOWED_ORIGINS`: comma-separated exact frontend origins; production origins must use HTTPS
- `FUNCTIONS_REGION=southamerica-west1` by default

Firebase Functions dotenv does not accept reserved `FIREBASE_*` keys; use runtime project identity and `STORAGE_BUCKET` only if needed. The Cloudinary Functions entrypoint declares `CLOUDINARY_API_SECRET` as a runtime secret. Missing configuration fails closed. Prod rejects Firebase emulator variables and demo project IDs. Do not create service-account key files to run the deployment.

Firebase Auth email/password tokens identify musicians by verified UID; anonymous tokens identify guests. Tokens are verified with revocation/disablement checks. Other sign-in providers are rejected. `GET /api/v1/auth/me` returns the derived actor. `POST /api/v1/musician/onboard` with `{stageName,slug}` creates a UID-owned profile and atomically claims a unique slug. Email verification is required to open a show, while onboarding/editing is available beforehand. Public menu/profile calls require the musician slug in Firebase mode; no Jony fallback exists.

## Data and transaction scope

- `musicians/{uid}`: profile, settings, catalog revision and active-show guard.
- `musicianSlugs/{slug}`: unique public route ownership.
- `musicians/{uid}/catalogs/{revision}/songs/{id}`: scoped, staged repertoire revisions.
- `shows/{id}`: owner UID, capacity/occupied counter, next queue rank, playing-request pointer and song counts.
- `requests/{id}`: owner/guest identities, immutable quote, hold deadline, status and private asset reference.
- `guestHolds/{hash}` / `idempotency/{hash}`: direct lookup guards for active guest holds and retry identity.
- `mediaAssets/{id}`: validated image metadata and active publication ownership.
- `musicians/{uid}/events/{id}`: minimal actor/event/resource audit without private message contents.

Reservations transactionally read their show, musician settings, selected song, guest hold and idempotency guard, then update the show counter with the new request. Claims move directly into the queue in good faith; `confirmedAt` stays null. No banking verification is implied. Songs can repeat; only total show capacity constrains requests. Played requests retain capacity.

Unclaimed holds expire after ten minutes. Expiry is reconciled in show-scoped batches of 100; query/read counters are never substituted for transactional reservation checks. Finish closes intake first and reconciles outstanding holds while preserving queued/performed history. CSV imports stage a complete merged revision in batches, then publish only if the profile revision is unchanged. No entire-database reads or single-document database snapshot are used.

## Bounded reads and costs

`GET /musician/shows/:id/requests` authorizes the selected show and returns its retained requests (at most the 500-slot cap). Cancelled/expired churn cannot crowd accepted requests out. It works for historical shows, independent of the active show. Dashboard metadata includes the newest 30 shows; the selected-show endpoint is the queue source and `dashboard.requests` is empty in Firebase mode. Guest own-history is bounded to the newest 100 requests.

Public menus share a 5-second per-instance snapshot cache. Catalogs cache up to 2000 songs for 10 minutes keyed by musician, catalog revision and fresh profile version, so cross-instance changes become visible after the short public snapshot TTL. Show metadata caches for 30 seconds. Mutation paths invalidate local view caches; reservations, ownership checks and authoritative transaction counters never use cached data. Cache is bounded to 200 entries and merges concurrent loads.

Example read budget (not a billing guarantee): 100-song repertoire, one warm instance, a continuously busy public menu and no edits means at most roughly 720 uncached menu loads/hour, about six Firestore document/query-minimum reads per load plus roughly 600 catalog reads/hour: around 4,920 reads/hour before retries or expired-hold work. Selected-show polling adds approximately `720 × (retained requests + 3)` reads/hour at a five-second interval; at ten retained requests this is about 9,360/hour. Dashboard polling should be 30 seconds/on-focus, not duplicate queue polling. More instances multiply cold/cache costs, and static catalog changes can invalidate caches. Measure the pilot; this is not a guaranteed free allowance fit. Browser Firestore reads remain denied; REST polling can later be replaced by explicit safe projections/listeners if measured cost justifies it.

## Images and Functions

Both media adapters use `MediaStore` and shared raster-image validation, bounded dimensions, metadata stripping and WebP re-encoding. Receipt reads require the originating guest or owning musician. Public profile images require an active published reference; arbitrary/private keys cannot be fetched through the public route. Asset replacement removes the old publication metadata; physical retired-asset cleanup/retention remains operational follow-up.

Cloud Functions supplies multipart `rawBody` after consuming the request stream. The API bounds this body and replays it through the same Multer validator, preserving fields/file limits. Regression coverage includes pre-consumed streams and actual image-byte delivery.

## Build and verification

`npm run build -w @musica/api` creates standalone `apps/api/dist/functions.js` and `package.json`, export `api`, Node 22. Shared contracts are type-only; no workspace package dependency is shipped. Runtime dependency overrides for patched gRPC/UUID are copied from the root package. The root deployment preparation generates the environment file after building.

- `npm run typecheck -w @musica/api`
- `npm test -w @musica/api`: demo, validation, multipart, selected-show and configuration tests; emulator test skips if emulators are absent.
- `firebase emulators:exec --project demo-musica-api --only auth,firestore,storage "npm run test:emulator -w @musica/api"`: actual Auth token, Firestore transaction/tenant-isolation and Storage image tests against a demo project only.

Emulator success does not prove cloud IAM, deployed indexes, provider quotas, Cloudinary credentials, regional latency or Firebase billing readiness. Actual cloud configuration/release evidence remains separate. No private recovery-link flow, scheduled expiry/retention job or paginated historical browsing beyond the stated bounds is claimed.
