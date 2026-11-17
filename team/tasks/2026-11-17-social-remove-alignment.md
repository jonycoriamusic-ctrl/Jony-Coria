# Align social remove control with mobile platform title

Date: 2026-11-17
Scope and intended outcome: Align the remove (X) control with each social link card's platform title on mobile, including the fourth card in the supplied screenshot, while retaining the desktop layout.
Status: Released to both production sites; independent design and physical-device review pending.

## Ownership

Product Owner: Micaela Piacenza (screenshot and requested alignment).
Product Manager: Main agent.
Product / UX Designer: Main agent.
Design Engineer: Main agent.
Independent Design Reviewer: Pending; the implementer cannot approve their own UI.
Engineering Owner: Main agent.
QA Owner: Main agent for local checks; independent QA pending.
Security reviewer: No security or data-flow change; independent review pending.

## Experience and acceptance criteria

At mobile widths, the platform title and X share one header row and are vertically centered together. The platform selector and URL input remain full width below. At desktop widths, the X stays beside the URL input. Removing a link still removes only that card; unsaved changes are not submitted automatically.

## Architecture and design evidence

The mobile card now has a flex header containing the title and a touch-sized remove button. The shared SelectField retains its accessible name but hides its duplicate visual label at mobile widths. The desktop button remains in the third grid column. The supplied 2026-11-17 screenshot showed the previous X lower than “Platform 4”. Independent design review remains pending.

## Delivery and verification

Changed `apps/web/src/features/portal/profile-editor.tsx`. `npm run typecheck` passed. In the local demo at 390×844, after adding four unsaved social cards, the Platform 4 title and remove button had the same vertical center (435px); the selector began below the header and the document width remained 390px. At 1280×800, the desktop remove button stayed immediately right of the URL field. Both Netlify production builds and manual deployments succeeded: `musicaalacarta` deploy `6afbe556884651f24d06abd0`, `themusicmenu` deploy `6afbe5a9a5f4fab4710945cc`. Both live profile routes and API health endpoints returned HTTP 200. An existing local demo hydration warning can appear when a saved locale differs from the server-rendered Spanish default; it was not introduced by this change and did not prevent the layout check. Independent physical-device and design checks remain pending.

## Decisions and handoff

Product: Requested alignment implemented. Engineering: Local typecheck, measured layout, builds and deployments passed. Design/QA: Independent review and phone evidence pending.
