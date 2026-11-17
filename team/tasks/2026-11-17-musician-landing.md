# Public landing page for musicians

Date: 2026-11-17
Scope and intended outcome: Give prospective musicians a public explanation of Musica a la carta / Music Menu, its setup and live-show flow, benefits, and current free-to-use status in all five supported languages.
Status: Released to both production sites; physical-device and independent design review pending.

## Ownership

Product Owner: Micaela Piacenza (requested outcome and free-for-now statement).
Product Manager: Main agent.
Product / UX Designer: Main agent.
Design Engineer: Main agent.
Independent Design Reviewer: Pending; the implementer cannot approve their own design.
Engineering Owner: Main agent.
QA Owner: Main agent for local checks; independent QA pending.
Security reviewer: No new data collection or payment logic; independent review pending.

## Experience and acceptance criteria

The root route speaks to musicians and explains what the app does, how it works, and how it helps a performer. The musician can open account creation or sign in. The page states that use is free for now, without implying a permanent price promise. The QR remains one permanent link per musician, while guests continue directly to `/q/{slug}`. Copy is available in Argentine Spanish, English, Brazilian Portuguese, Italian, and French. Payment copy must not imply that the app verifies settlement.

## Architecture and design evidence

The existing root guest empty state was replaced with a musician landing view. Guest QR routes and the musician portal keep their behavior. The landing page uses the existing locale provider and semantic Tailwind theme, with no new dependencies or data flow. Account creation links to `/ingresar?mode=register`; the login page selects registration mode after hydration. The shared shell hides guest navigation on the landing and sign-in routes, while showing musician access on the landing route on mobile.

Design references are the established black/white identity, brand mark, and mobile-first component system. The illustrative queue is explicitly decorative and shows no real guest data. Independent visual critique and physical-device review remain pending.

## Delivery and verification

Changed `apps/web/src/app/page.tsx`, `apps/web/src/components/shell.tsx`, `apps/web/src/features/portal/login.tsx`, and added `apps/web/src/features/landing/musician-landing.tsx`. Local typecheck passed after the responsive typography and sign-in navigation changes. Browser inspection confirmed translated hero and four steps in all five locales. At 1440px desktop the adjusted headline occupies two lines and the page has no horizontal overflow. At 320px width with French copy, document width equals viewport width; the header and CTA fit within the page. On the initial English production deployment, the account CTA opened the registration form. That check exposed stale guest navigation on the sign-in page; the shell now omits it. Both final production builds passed. Manual releases succeeded for `musicaalacarta` (`6afbe1e1df53f32a399026a5`) and `themusicmenu` (`6afbe236a4dd396191bf5685`). The final English production registration page rendered the create-account form without guest navigation. The final Spanish production homepage rendered the landing content and registration links. Both sites' home, registration, QR and API-health paths returned HTTP 200 after the final redeploy. Physical iPhone/Android and independent design review remain pending.

## Decisions and handoff

Product: Root is the musician introduction; printed QR still bypasses it. Engineering: No API or database change. Design/QA: Independent review and device evidence pending.
