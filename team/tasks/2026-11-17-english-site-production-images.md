# English site and production profile images

Date: 2026-11-17
Scope and intended outcome: Publish an English-facing address in the existing Netlify team and repair uploaded profile images on production.
Status: Implemented and manually deployed; independent device review pending.

## Ownership

Product Owner: Micaela selected `themusicmenu.netlify.app` after `musicmenu.netlify.app` was unavailable.
Product Manager: Main agent.
Product / UX Designer: Existing design reused.
Design Engineer: Main agent, cache-safe image URLs and locale default.
Independent Design Reviewer: Pending.
Engineering Owner: Main agent.
QA Owner: Main agent for automated and live smoke checks; independent device review pending.
Security reviewer: Pending.

## Experience and acceptance criteria

An Australian visitor can open the English address and see English copy by default. A musician's avatar and banner render after upload on both public pages and the profile editor. The existing permanent QR on the Spanish address continues to work. A musician may print a QR from either site; its encoded origin stays stable across shows.

## Architecture and design evidence

Both Netlify sites serve the same Next.js and Express application and the same Firebase project. The English host selects `en` when there is no saved preference; a visitor's explicit language choice wins. The musician's saved country still determines currency and transfer details. The Netlify Function adapter must base64 encode WebP responses; without this, the Function converted binary bytes to UTF-8 and produced corrupt images with HTTP 200. Image URLs use the profile revision to bypass older cached corrupt responses. No additional backend, database, or plan is required.

## Delivery and verification

- Added a binary-preserving Netlify handler and a byte-for-byte regression test covering WebP and JSON.
- Versioned public image URLs in profile, guest menu, musician editor, and print-card banner.
- Allowed manual deploy script to select either Netlify site by ID. No GitHub webhook was added.
- TypeScript checks and unit suite passed on 2026-11-17: 29 API tests passed, one emulator integration test skipped; 11 web tests passed.
- Original site manual production deploy: `6afbd1ce5444f35c5d2d9a95`. English site manual production deploy: `6afbd21c7875fbfa1258cc25`.
- Both live health endpoints returned `firebase` / `prod` / `firebaseConfigured: true`. The English site returned the same Micaela profile as the original database.
- In a fresh browser session, `themusicmenu.netlify.app` displayed English copy and `EN` in the language selector. Both sites rendered Micaela's banner at natural size 1199 × 1312 and avatar at 600 × 600. Image URLs included profile version `v=11` and the downloaded bytes decoded as WebP.
- Physical iPhone, Android, tablet, and independent visual review remain pending.

## Decisions and handoff

The user selected `themusicmenu.netlify.app`; the original address remains available for printed QR codes. Existing Firebase email/password authentication remains the only musician sign-in method. Firebase's Authorized domains screen says extra domains are required for phone, Google, and third-party OAuth redirects; none of those providers are enabled for this release.
