# Netlify production release

## Product intent and ownership

The user requested a live Netlify Free release at `musicaalacarta.netlify.app`, with a permanent dynamic QR per musician. Main agent owns deployment integration and verification. The production database must remain separate from Jony's local demo.

## Implementation and evidence

- Created Netlify project `musicaalacarta` in Jony Coria's team; intended HTTPS URL `https://musicaalacarta.netlify.app`. Netlify CLI authorization was approved by the user and verified.
- Added a Netlify Function wrapper around the existing Express app and a root `netlify.toml` for the npm workspace, Next.js build, Function bundling and `/api/*` routing. Production Next.js config uses the same-origin route on Netlify and retains HTTPS proxy validation for other hosts.
- Production Firebase public SDK settings, production switches and allowed origin are configured in Netlify's production context. The service-account JSON and Cloudinary API values are provided as deploy-specific Function secrets. Netlify Free rejected secret-scoped persistent environment variables; all three sensitive site-level variables were removed after the first deploy. No secret values were committed.
- Firebase Admin requires a matching `jony-coria` service account JSON on Netlify and fails closed when absent; dedicated tests cover missing and mismatched credentials. The owner supplied a signed-in Firebase session. A dedicated service account already existed, and its credential passed a real Firestore read and Firebase Auth lookup before release.
- Local Netlify Function bundle built successfully. A direct invocation of the wrapper's `/api/v1/health` route returned Firebase/prod/200 using local ADC. The optimized Next.js production build passed with Netlify's same-origin API setting. Frontend and backend tests passed after the integration changes.
- Reduced image upload max to 4 MiB, including banners, for Netlify's effective binary payload limit. Existing receipt UI already displayed 4 MB.
- The stable QR route is `/q/{slug}`, and the API reconciles scheduled shows on guest menu reads; Firestore public signals and polling refresh availability. Existing tests cover switch and capacity updates. No production musician data has been seeded.
- On 2026-11-16, local Netlify build succeeded with Linux x64 Sharp binaries included in both uploaded Function bundles. Manual deploy `6afb8afab3b8bd7af4e63fa1` became live at <https://musicaalacarta.netlify.app>. Disabled Netlify team-login protection for public access. Live checks: homepage and login 200; `/api/v1/health` 200 with Firebase/prod; demo guest endpoint 404; unknown QR API lookup safe 404. The health and Firestore-backed QR check still passed after deleting the persistent Firebase credential from site settings. No GitHub-to-Netlify connection was added.
- During the documentation push, remote `main` had been force-updated with three unexpected `init` files containing obfuscated executable code and package scripts that would run them on development/build. The published Netlify build came from the earlier clean local tree and did not include those files. Reverted the remote commit without running it, then reapplied the clean release commits; `main` now matches the deployed source tree. The suspicious commit remains in Git history for investigation. Anyone who executed its `dev` or `build` scripts should treat local credentials as potentially exposed and rotate them.

## Remaining verification

- Register a real musician, verify email, create a profile, folder/song and show, then test a guest request on a phone. Production Firestore is still empty, so a musician's printable QR does not exist yet. Do not use actual money for this test.
- Check hosted media upload and receipt authorization, real-device layout, and Argentina network latency. The Function bundles include Linux Sharp binaries, but image processing has not been exercised in production.
- Independent source review exists for the pre-Netlify application. The Netlify adapter and exact deployed build still need separate review; physical-phone review and product sign-off remain pending.
