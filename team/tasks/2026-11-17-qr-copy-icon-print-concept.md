# QR link, round icon, and table card concept

Date: 2026-11-17
Scope and intended outcome: Let a musician copy the URL encoded in their reusable QR, make the brand favicon circular, and present a table-ready card concept before implementing the styled download.
Status: Copy URL and icon published; print-card concept prepared for Product Owner review. Styled download is not implemented.

## Ownership

Product Owner: user request and screenshots in this chat.
Product Manager: implementation agent.
Product / UX Designer: implementation agent for concept; not an independent reviewer.
Design Engineer: implementation agent.
Independent Design Reviewer: pending.
Engineering Owner: implementation agent.
QA Owner: implementation agent for technical checks; independent QA pending.
Security reviewer: not separately assigned for these presentation changes.

## Experience and acceptance criteria

- The QR dialog displays a copy control that copies exactly the URL used to generate the QR, provides success feedback, and offers manual selection if clipboard access fails.
- The browser and install icons use the same existing symbol inside a fully circular black mark with transparent outer corners.
- The print concept shows the musician's banner, stage name, a high-contrast QR, public email, and social handles in a monochrome A6 table card. This is a design preview; no production download changes before user review.
- One musician slug remains the QR destination across scheduled shows. A different domain or slug changes the encoded URL; previously printed URLs remain usable only while their original domain and route are maintained.

## Architecture and design evidence

`QrDialog` currently builds `${location.origin}/q/${slug}` and uses that exact string in `QRCode.toDataURL`. The Firebase menu endpoint resolves the slug to a musician, reconciles the schedule, and returns that musician's active show. The API test `the same musician QR switches scheduled shows automatically and preserves old request history` passes. The print concept isolates the QR from banner photography to preserve scanning contrast, uses the musician's public profile fields, and has no show title or date that would require reprinting. The placeholder banner was generated for this mockup only; its file and layout source are in `design/mockups/`. The user's supplied brand symbol remains the icon source. Independent design and physical print review remain pending.

The user's proposed `musicaalacarta.com.ar` cannot be registered without an additional domain fee. NIC Argentina lists an annual `.com.ar` charge; a WHOIS lookup on 2026-11-17 also returned an existing registration for that exact name. No domain transaction or configuration was performed. Do not retain or publish the registrant's personal data from the lookup.

## Delivery and verification

- Added copy state, error feedback, and translations for all five locales to the QR dialog.
- Re-exported 96, 180, 192, and 512 px icon files with a black circle, white version of the existing mark, and transparent corners. The 96 px and 180 px exports were visually inspected.
- Produced the A6 concept at 300 dpi and a half-resolution preview. Example contact details and QR slug are not real profile data.
- Typecheck, API/web tests, and the Netlify production build passed. The API suite included the scheduled-show QR switching test. Manual deploy `6afbb0c57f34d5a75c5a0ecf` went live; a small accessibility follow-up was released as `6afbb1a505fbd68693c62486`. The production icon and Apple icon returned `200 image/png`, `/api/v1/health` returned Firebase/prod/ok, and the production sign-in page rendered without the Netlify badge.
- In the local demo, opening the QR dialog showed the stable `/q/jony` URL. Clicking Copy changed the button to “Enlace copiado.” Desktop and 390 × 844 browser screenshots are stored in `design/evidence/qr-copy-local-demo.png` and `design/evidence/qr-copy-local-mobile.png`.
- Actual clipboard contents were not independently read from the browser harness. The control uses the same `url` state that is passed to `QRCode.toDataURL`; the resolved clipboard write is reflected by the success label.
- Physical iPhone/Android and actual printed-card scan: pending.

## Decisions and handoff

Present the concept to the Product Owner before implementing the styled download. If approved, use profile data, handle extraction, long-content layout, high-resolution export, and phone scan verification. Keep the raw QR download until the styled replacement is ready. Choose and register an available domain separately before encoding it in new printed materials.
