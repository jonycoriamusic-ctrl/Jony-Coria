# Restore mobile navigation after Netlify badge removal

Date: 2026-11-17
Scope and intended outcome: Place mobile bottom navigation at the viewport bottom after the project owner upgraded Netlify and requested badge removal.
Status: Published; independent review and physical-phone verification pending.

## Ownership

Product Owner: user request in this chat.
Product Manager: not separately assigned.
Product / UX Designer: not separately assigned.
Design Engineer: implementation agent; cannot independently approve its own UI.
Independent Design Reviewer: pending.
Engineering Owner: implementation agent.
QA Owner: implementation agent for browser checks; independent QA pending.
Security reviewer: not separately assigned for this layout change.

## Experience and acceptance criteria

On a mobile viewport, the bottom navigation aligns with the bottom safe area without a blank band above it. Its three guest links and four portal links remain usable. Content retains a spacer equal to the actual navigation height. Tablet and desktop navigation are unchanged.

## Architecture and design evidence

The previous Free-plan workaround raised the navigation only while Netlify's injected badge iframe existed. After the owner's plan upgrade, Netlify Project configuration > General still reported “The badge is shown on this project.” The badge was turned off there; the setting then reported “The badge is not shown on this project.” A new public request with a cache-busting query did not contain the badge iframe. Removing the conditional CSS offset restores the existing `bottom-0` Tailwind layout, while the measured spacer and safe-area padding remain. Independent design review is pending.

## Delivery and verification

- Removed the badge-specific CSS and now-unused selector classes from the shared shell.
- `npm run typecheck` and the Netlify production build passed. Manual deploy `6afbad75d820ed9683bcac7e` is live at `https://musicaalacarta.netlify.app`.
- A fresh 390 × 844 production browser viewport had no `nl-badge-frame`. The guest navigation measured `y=777.5–844`, aligned to the viewport bottom, and contained Carta, Mis pedidos, and El show. The screenshot is `design/evidence/mobile-nav-without-netlify-badge.png`.
- Physical iPhone and Android checks: pending.

## Decisions and handoff

Keep the Netlify badge setting off for this project. A custom domain can be added later once its registration and DNS are ready; update the app's public origin, Firebase Auth authorized domains, and QR URL generation before printing new permanent QR codes.
