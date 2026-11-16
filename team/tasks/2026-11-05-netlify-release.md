# Netlify production release

## Product intent and ownership

The user requested a live Netlify Free release at `musicaalacarta.netlify.app`, with a permanent dynamic QR per musician. Main agent owns deployment integration and verification. The production database must remain separate from Jony's local demo.

## Implementation and evidence

- Created Netlify project `musicaalacarta` in Jony Coria's team; intended HTTPS URL `https://musicaalacarta.netlify.app`. Netlify CLI authorization was approved by the user and verified.
- Added a Netlify Function wrapper around the existing Express app and a root `netlify.toml` for the npm workspace, Next.js build, Function bundling and `/api/*` routing. Production Next.js config uses the same-origin route on Netlify and retains HTTPS proxy validation for other hosts.
- Production Firebase public SDK settings, production switches and allowed origin were saved for the Netlify production context. Cloudinary API key and secret were saved in production Functions scope as hidden secrets after the user's specific authorization. No values were committed.
- Firebase Admin requires a matching `jony-coria` service account JSON on Netlify and fails closed when absent; dedicated tests cover missing and mismatched credentials. The current `developer@inizia.agency` identity cannot list/create service accounts. The user agreed to open the project with its owner account for this step.
- Local Netlify Function bundle built successfully. A direct invocation of the wrapper's `/api/v1/health` route returned Firebase/prod/200 using local ADC. The optimized Next.js production build passed with Netlify's same-origin API setting. Frontend and backend tests passed after the integration changes.
- Reduced image upload max to 4 MiB, including banners, for Netlify's effective binary payload limit. Existing receipt UI already displayed 4 MB.
- The stable QR route is `/q/{slug}`, and the API reconciles scheduled shows on guest menu reads; Firestore public signals and polling refresh availability. Existing tests cover switch and capacity updates. No production musician data has been seeded.

## Remaining verification

- Obtain a least-privilege service account from the project owner, store it only as a production Functions secret, connect the GitHub repository to Netlify, deploy, then verify hosted API/web and sign-up/QR flows.
- Check Netlify's hosted Linux `sharp` bundle, response payload and cold-start behavior. Check real-device layout and Argentina network latency. Do not claim a live release until these pass.
- Independent source review exists for the pre-Netlify application. The Netlify adapter and exact deployed build still need separate review; physical-phone review and product sign-off remain pending.
