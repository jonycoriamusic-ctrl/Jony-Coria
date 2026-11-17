# Profile photo layout repair

Date: 2026-11-17
Scope and intended outcome: Restore prominent profile imagery and simplify image editing controls in the musician portal.
Status: Implemented and deployed; independent review pending.

## Ownership

Product Owner: Micaela identified the regression and requested an edit icon on the avatar with no removal control.
Product Manager: Main agent.
Product / UX Designer: Main agent.
Design Engineer: Main agent.
Independent Design Reviewer: Pending; implementer cannot approve own UI.
Engineering Owner: Main agent.
QA Owner: Main agent for type and viewport checks; independent device review pending.
Security reviewer: Pending.

## Experience and acceptance criteria

The musician sees a larger banner and avatar at the top of the profile editor. The avatar overlaps the banner and has a small edit icon directly on it. The banner retains its upload control. The separate remove-avatar and remove-banner actions do not appear. Uploads continue through the existing authenticated media API.

## Architecture and design evidence

This is a presentation-only change using the shared `Avatar` component, semantic theme classes and the existing upload flow. API delete routes remain for compatibility but are no longer exposed in the profile editor. The public profile and stored media are unchanged.

## Delivery and verification

TypeScript checks and both Netlify production builds passed. Local demo browser checks at desktop and 390 × 844 showed the enlarged banner/avatar, overlapping edit pencil, clear stage-name spacing and no removal buttons. No demo profile data was changed. Manual production releases: `6afbd9d97d2c4d6fd4811ea4` on `musicaalacarta` and `6afbda3c534ab14b2758c43f` on `themusicmenu`. Both live profile routes and API health endpoints returned HTTP 200. The authenticated editor was not checked in a production browser session; independent visual and physical device reviews remain pending.

## Decisions and handoff

The icon opens the existing image file picker; the musician can replace the avatar. Banner replacement remains available on the banner. Neither image has a removal control in the portal.
