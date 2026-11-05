# Netlify Free release

## Current target

- Netlify team: `jony-coria`; project: `musicaalacarta`; intended URL: <https://musicaalacarta.netlify.app>.
- Source: the local checkout of `jonycoriamusic-ctrl/Jony-Coria`, root npm workspaces. The user selected manual deployments, with no GitHub webhook or Netlify GitHub App connection. `netlify.toml` builds `apps/web/.next` and packages `netlify/functions/api.ts`. `/api/*` is rewritten to the Express function before Next.js routing.
- Production data: Firebase project `jony-coria`, Firestore `(default)` in `nam5`. The database has restrictive rules and seven ready indexes. It has no Jony demo records. The local demo remains in ignored `.data/demo.json`.
- Media: Cloudinary Free. API key and secret are stored with Netlify Functions production scope. Never store a Firebase Admin credential in source, a `NEXT_PUBLIC_*` variable, or a browser.

## Required production environment

The public Firebase web identifiers and non-secret production switches come from `config/prod.env.example`. Set `DEPLOY_TARGET=netlify` in both production Builds and Functions scopes to select the same-origin API route and require explicit server credentials. Set `ALLOWED_ORIGINS=https://musicaalacarta.netlify.app` for the API.

Set these as **production / Functions-only secrets** in Netlify:

- `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET` for authenticated media.
- `FIREBASE_SERVICE_ACCOUNT_JSON` containing a `jony-coria` service-account JSON credential with only the permissions needed to verify Firebase Auth tokens and access Firestore. The API validates the JSON's project ID and refuses to start without the secret on Netlify.

The service-account key must be created by the Firebase project owner or an IAM administrator. Treat the key as a long-lived production credential: restrict who can read it, rotate it if exposed, and do not save it in Git or a shared document. No Blaze billing is required for this Netlify API deployment.

Manual release command from the repository root after setting all secrets: `netlify deploy --remote --prod --site musicaalacarta --filter @musica/web`. The remote build uses Linux so native image dependencies match Netlify's runtime. GitHub pushes alone do not deploy this site.

## QR and show resolution

Each musician prints one QR pointing at `https://musicaalacarta.netlify.app/q/{slug}`. The encoded URL never contains a show ID, date, table, price, or capacity. The musician dashboard generates and downloads that QR. On each guest menu read, Express resolves the slug to the musician and reconciles scheduled shows against server time. The show starting at the current date/time opens automatically when its profile, bank information and repertoire are ready; the previous show is finished. Availability changes publish a `publicUpdates/{slug}` revision; guests refresh the menu on the Firestore listener signal, with periodic fallback. The same QR works for the next show without reprinting.

The public production database is intentionally empty until a real musician registers, verifies their email, completes profile/bank details, adds songs and schedules a show. A local Jony test record must never be copied into it.

## Verification before publishing or printing

1. `npm run typecheck`, `npm test`, `npm run test:firebase` and a production Next build pass. The Netlify function bundle must include Express, Firebase Admin, Cloudinary and the Linux `sharp` binary in its hosted build.
2. The deployed `/api/v1/health` response reports `firebase` / `prod`, and `/api/v1/demo/guest` returns 404. An unknown musician QR should show a graceful empty/error state; it must not show the Jony demo.
3. Register a real musician through the production form. Verify email, set the profile and bank alias, create a folder/song, schedule a show, and open its permanent QR from a phone. Submit a small test request and confirm it appears in that musician's queue. Do not use actual money during a test.
4. Verify the guest QR responds to a capacity change and the next scheduled show. Review private receipt access, mobile layout and Argentina connectivity before printing a QR for tables.

Netlify's synchronous Functions have a 6 MB buffered payload limit; binary uploads have roughly 4.5 MB of effective room after encoding. The app caps image uploads at 4 MiB. The Free plan has a fixed usage allowance and can pause when it is exhausted. [Netlify function limits](https://docs.netlify.com/build/functions/configuration/), [Netlify Free plan](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/).
