# Social platform menu viewport and mobile remove control

Date: 2026-11-17
Scope and intended outcome: Keep the social platform picker within the visible screen and place each mobile card's remove button in its top-right corner.
Status: Implemented; local checks passed; physical-device and independent design review pending.

## Ownership

Product Owner: Micaela Piacenza (requested behavior and screenshots).
Product Manager: Main agent.
Product / UX Designer: Main agent, following the supplied screenshots.
Design Engineer: Main agent.
Independent Design Reviewer: Pending; implementer cannot approve own UI.
Engineering Owner: Main agent.
QA Owner: Main agent for local checks; independent QA pending.
Security reviewer: No security or data-flow change; independent review pending.

## Experience and acceptance criteria

On the musician profile, opening the social platform picker on a phone keeps its top and bottom inside the viewport. The options scroll. Each mobile social card has its remove control at the top right. The desktop control remains beside the link field. The change does not submit or alter profile data.

## Architecture and design evidence

The existing Radix Select continues to handle collision placement and keyboard selection. A shorter viewport is used only for the social picker; the reusable component retains its normal size for other selects. The picker is also capped to the viewport height. The button uses responsive positioning within the existing card. User screenshots from 2026-11-17 show the overflow and desired mobile button location. Independent critique remains pending.

## Delivery and verification

Changed `apps/web/src/components/ui.tsx` and `apps/web/src/features/portal/profile-editor.tsx`; the Next.js production build regenerated `apps/web/next-env.d.ts`. `npm run typecheck` passed. Local browser inspection at 390×844 measured menu top 452px, bottom 714px, viewport 844px, with the remove button at the card's top right. At 390×568, menu top 314px, bottom 499px, viewport 568px; its option viewport was 159px high with 2028px of scroll content. At desktop 1280×800, the remove button and URL field shared the same row. Both Netlify production builds completed and manual deployments succeeded: `musicaalacarta` deploy `6afbdc8b6469df5cb697319d` and `themusicmenu` deploy `6afbdcde3babbbf00ab90963`. Both live `/portal/perfil` and `/api/v1/health` endpoints returned HTTP 200. Physical iPhone/Android checks and independent design review remain pending. No payment or backend behavior changed.

## Decisions and handoff

Product: Requested placement accepted. Engineering: Local typecheck, measured layout, builds, deployments, and live HTTP checks passed. Design/QA: Independent review and physical-device evidence pending.
