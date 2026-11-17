# Australia market and English-facing name

Date: 2026-11-17
Scope and intended outcome: Keep Argentina as the existing default while allowing Australian musicians to price in AUD, accept PayID transfers, schedule shows in an Australian time zone, and present the UI in English when location suggests Australia. Use “Music Menu” in the English interface, following the user's suggestion. Keep the permanent QR URL and backend identity unchanged.
Status: manually released to Netlify as deploy `6afbcb5636a5f595dd314ac0`; physical-device and independent design review pending.

## Ownership

Product Owner: user; proposed “Music Menu” and requested Australia support.
Product Manager: primary agent (requirements reconciliation).
Product / UX Designer: primary agent (reuse existing components and monochrome theme).
Design Engineer: primary agent.
Independent Design Reviewer: pending; implementer cannot approve own UI.
Engineering Owner: primary agent.
QA Owner: primary agent for automated checks; device review pending.
Security reviewer: pending independent review.

## Experience and acceptance criteria

- A visitor's inferred country suggests an initial language; a saved manual language choice wins. No precise location or IP is retained by the app.
- The musician chooses the operating country on onboarding and can correct it in profile. Their country controls currency and payment method. A guest's travel location never converts a musician's prices.
- An Australian profile shows AUD, a +61 WhatsApp hint, Australian show time zones, and PayID email/mobile fields. An Argentine profile keeps ARS, alias and optional CBU. The guest sees the exact PayID only after reserving, as with Argentine bank details.
- The app does not verify PayID settlement; the same good-faith declaration enters the queue. Existing requests retain their original amount, market and payment details.
- The QR remains `/q/{slug}` and continues resolving the current show; the print card adapts its language to the musician market.
- Invalid PayID, incompatible time zone, and changing country during an active show are rejected by the server. Changing country requires entering prices in the new currency.

## Architecture and design evidence

The Netlify Edge Function supplies only an AR/AU country hint; browser time zone/language is a local fallback. The existing Lambda-compatible Express function does not expose Netlify's geolocation context, so a narrowly scoped edge route handles this read. Profile market is stored in Firestore and controls currency. This avoids showing a guest a misleading currency when travelling. Server writes remain through Express. Existing Firestore documents without a market normalize to AR. Payment details are excluded from public menus and snapshotted on private requests. No database migration or paid service is required.

The English name uses the existing dish/music logo and English QR card copy. The Netlify URL, Firebase project name, and Argentine brand remain unchanged. Name/domain/trademark availability and independent visual critique are pending.

## Delivery and verification

Changed contracts, profile and request API, Firebase and demo implementations, locale/market state, profile/onboarding, guest payment UI, show time conversion, printable QR card, Netlify country route, and tests. `npm run typecheck`, API/web tests, and `npm run build` passed. Firebase Auth/Firestore/Storage emulator integration passed using Java 21 and alternate local ports because 8080 was already in use. The integration checks AU PayID redaction, reservation and immutable snapshot. The live `/api/v1/region` returned `AU` from an Australian connection; the live homepage rendered in English in the in-app browser. Existing `micaela` public profile returned normalized `AR` without private bank details. The final release was built with the Netlify adapter and uploaded manually. Physical iPhone/Android, tablet, and actual bank-app PayID transfer remain pending. No actual transfer should be inferred from a screenshot or guest declaration.

## Decisions and handoff

Use the musician market for currency/payment; use visitor country only for language suggestion. Keep manual language selection. Before broad Australian launch, review the live responsive UI independently and test PayID instructions with a real Australian account without treating the app as a bank-verification system.
