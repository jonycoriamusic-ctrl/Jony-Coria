# Netlify release

## Current target

- Netlify team: `jony-coria`; project: `musicaalacarta`; live URL: <https://musicaalacarta.netlify.app>. The first manual production deploy was published on 2026-11-16 (`6afb8afab3b8bd7af4e63fa1`). Production deploys are public; Netlify team-login protection is off for this site.
- Source: the local checkout of `jonycoriamusic-ctrl/Jony-Coria`, root npm workspaces. The user selected manual deployments, with no GitHub webhook or Netlify GitHub App connection. `netlify.toml` builds `apps/web/.next` and packages `netlify/functions/api.ts`. `/api/*` is rewritten to the Express function before Next.js routing.
- Production data: Firebase project `jony-coria`, Firestore `(default)` in `nam5`. The database has restrictive rules and seven ready indexes. It has no Jony demo records. The local demo remains in ignored `.data/demo.json`.
- Media: Cloudinary Free. Firebase Admin and Cloudinary credentials are passed as deploy-specific Function secrets with `--secret-env`; they are absent from site-level environment variables. Never store a Firebase Admin credential in source, a `NEXT_PUBLIC_*` variable, or a browser.

## Required production environment

The public Firebase web identifiers and non-secret production switches come from `config/prod.env.example`. They are configured for the site's production context, including `DEPLOY_TARGET=netlify` and `ALLOWED_ORIGINS=https://musicaalacarta.netlify.app`. The API uses the same origin as the web app.

Pass these as **deploy-specific Function secrets** on every manual release:

- `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET` for authenticated media.
- `FIREBASE_SERVICE_ACCOUNT_JSON` containing a `jony-coria` service-account JSON credential with only the permissions needed to verify Firebase Auth tokens and access Firestore. The API validates the JSON's project ID and refuses to start without the secret on Netlify.

The dedicated account is `musicaalacarta-netlify@jony-coria.iam.gserviceaccount.com`. The local JSON is stored at `~/.config/musicaalacarta/firebase-service-account.json` with owner-only permissions; the Cloudinary values are in ignored `.env.cloudinary.local`. Treat them as long-lived production credentials: restrict who can read them, rotate them if exposed, and do not save them in Git or a shared document. Netlify Free rejected marking persistent environment variables as secrets because that requires Functions-only scope, so no sensitive site-level variables are retained. No Blaze billing is required for this Netlify API deployment.

Manual release from the repository root with Node.js 22 and an authorized Netlify CLI:

```sh
npm ci
npm run prepare:netlify-native
npx --yes netlify-cli@27.20.0 build --filter @musica/web --context production
npm run deploy:netlify
```

The native preparation installs the Linux x64 Sharp binaries into ignored `node_modules` so the Mac-built Function can process images on Netlify. The deploy script reads the two local credential files and supplies them as deploy-specific Function secrets; they are not committed or placed in Netlify's site-level variables. Every new deploy must include those secrets. The Netlify CLI requires a Git-connected site for `--remote`, which the user declined, so releases build locally and upload manually. GitHub pushes alone do not deploy this site. The command-line secret values are briefly visible to local processes while the deploy command runs; use a trusted workstation.

For manual deployment, `apps/web/.next` is the build input; the Netlify Next adapter places browser assets under `apps/web/.netlify/static`. The deploy script explicitly publishes that output folder. Publishing `.next` directly serves HTML but leaves `/_next/static/*` at 404, producing a blank page. Verify browser assets and a rendered page after every release, not only the HTTP status of `/`.

## QR and show resolution

Each musician prints one QR pointing at `https://musicaalacarta.netlify.app/q/{slug}`. The encoded URL never contains a show ID, date, table, price, or capacity. The musician dashboard generates and downloads that QR. On each guest menu read, Express resolves the slug to the musician and reconciles scheduled shows against server time. The show starting at the current date/time opens automatically when its profile, bank information and repertoire are ready; the previous show is finished. Availability changes publish a `publicUpdates/{slug}` revision; guests refresh the menu on the Firestore listener signal, with periodic fallback. The same QR works for the next show without reprinting.

The public production database is intentionally empty until a real musician registers, verifies their email, completes profile/bank details, adds songs and schedules a show. A local Jony test record must never be copied into it.

## Verification and remaining product checks

1. The production Next/Netlify build passed and the uploaded Function bundle includes Linux x64 Sharp binaries. Prior type, unit, and Firebase emulator checks are recorded in the task. Repeat them when code changes warrant it.
2. The live homepage and `/ingresar` returned 200. `/api/v1/health` returned `firebase` / `prod` / 200 after removing the persistent site-level Firebase credential. `/api/v1/demo/guest` returned 404. An unknown musician QR page returned 200, and its API lookup returned a safe 404. Jony's demo is not in the production database.
3. After the corrected manual deploy `6afb8f963e4e4b5a598fe801`, all 16 JavaScript/CSS assets referenced by the homepage returned 200. Chrome visibly rendered the homepage and the musician sign-in form. On 2026-11-17, after the user upgraded the Netlify plan, the project's Powered by Netlify badge setting was turned off and verified as “not shown” in Project configuration > General. A fresh public page request had no badge iframe. Manual deploy `6afbad75d820ed9683bcac7e` removed the temporary mobile navigation offset and a 390 × 844 production browser check confirmed that the navigation reaches the viewport bottom.
4. Register a real musician through the production form. Verify email, set the profile and bank alias, create a folder/song, schedule a show, and open its permanent QR from a phone. Submit a small test request and confirm it appears in that musician's queue. Do not use actual money during a test.
5. Verify the guest QR responds to a capacity change and the next scheduled show. Review private receipt access, mobile layout and Argentina connectivity before printing a QR for tables.

Netlify's synchronous Functions have a 6 MB buffered payload limit; binary uploads have roughly 4.5 MB of effective room after encoding. The app caps image uploads at 4 MiB. Check the team's current plan and credit usage in Netlify before relying on plan-specific limits. [Netlify function limits](https://docs.netlify.com/build/functions/configuration/), [Netlify plans](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/).
