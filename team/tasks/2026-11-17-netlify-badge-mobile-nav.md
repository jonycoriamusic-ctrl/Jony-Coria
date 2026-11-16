# Keep the Netlify badge clear of mobile navigation

Date: 2026-11-17
Scope and intended outcome: Keep all mobile bottom-navigation actions usable while retaining Netlify Free's injected badge.
Status: Published; independent review and post-fix physical-phone check pending.

## Ownership

Product Owner: user request and iPhone screenshot in this chat.
Product Manager: not separately assigned.
Product / UX Designer: not separately assigned.
Design Engineer: implementation agent; cannot independently approve its own UI.
Independent Design Reviewer: pending.
Engineering Owner: implementation agent.
QA Owner: implementation agent for browser checks; independent QA pending.
Security reviewer: not separately assigned for this layout change.

## Experience and acceptance criteria

On narrow screens, the Netlify badge must not cover Carta, Mis pedidos, El show, or the musician portal's bottom links. When the badge is absent, navigation stays at the normal bottom position. Page content must retain enough scroll space below the raised navigation. Desktop navigation remains unchanged.

## Architecture and design evidence

Netlify injects an isolated badge iframe at the bottom right. At a 390 × 844 browser viewport, the badge measured 202 × 64 px and occupied the same bottom band as the 66.5 px mobile navigation. [Netlify documents its placement](https://docs.netlify.com/manage/projects/powered-by-netlify-badge/) at bottom right; the current Free-plan setting does not permit hiding it. The selected solution reserves 72 px only when the injected badge iframe is present, moving the existing bottom bar above it and adding matching document space. This keeps the user's chosen Netlify Free host and app-like navigation. The narrow CSS selector is a platform integration helper in the shared base stylesheet, not a per-screen stylesheet.

## Delivery and verification

- Changed `apps/web/src/components/shell.tsx` and `apps/web/src/app/globals.css`.
- `npm run typecheck` and the Netlify production build passed. Manual deploy `6afb94e96c76ac0fe0e8b378` became live at `https://musicaalacarta.netlify.app`.
- In a 390 × 844 production browser viewport, the injected badge remained 202 × 64 px at `y=780`; the mobile navigation moved to `y=705.5–772`, leaving an 8 px gap. The page spacer gained the matching 72 px margin. The bottom `El show` link was clicked successfully and navigated to `/musico`.
- The user's iPhone screenshot records the pre-fix overlap. A post-fix physical-phone observation is pending.

## Decisions and handoff

Do not move or suppress Netlify's injected iframe. Verify the spacing on an actual iPhone when available; a browser viewport check does not replace physical-device review.
