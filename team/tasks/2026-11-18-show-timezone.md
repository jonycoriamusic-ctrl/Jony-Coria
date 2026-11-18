# Correct musician show and visitor time zones

Date: 2026-11-18
Scope and intended outcome: Show dates and start times follow the musician's saved country/time zone, while personal request timestamps follow the viewer's device time zone. Deploy the fix to both production sites.
Status: Released to both production sites; physical-device and independent review pending.

## Ownership

Product Owner: Micaela Piacenza (reported the bug and requested release)
Product Manager: Main agent
Product / UX Designer: Main agent (small label correction)
Design Engineer: Main agent
Independent Design Reviewer: Pending
Engineering Owner: Main agent
QA Owner: Main agent for automated regression checks; independent QA pending
Security reviewer: Pending; no authentication or authorization changes

## Experience and acceptance criteria

- For an Argentine musician, a show starting at 2026-11-17 21:30 Buenos Aires time appears on 17 November in the show editor, show list, and live selector, even when the viewer is in Australia.
- For an Australian musician selecting Brisbane, the same instant appears as 2026-11-18 10:30 in the show editor, show list, and live selector.
- Saving either local start time produces the same UTC instant for scheduling; invalid local dates do not save.
- Guest personal request timestamps use the browser's IANA time zone; language and IP market hints do not change the show schedule.
- The display label names the musician's city for the show start time.

## Architecture and design evidence

The API stores ISO UTC instants and compares them to UTC now for automatic show selection. `timeZoneOf` normalizes Argentine profiles to `America/Argentina/Buenos_Aires` and allows a musician-selected Australian zone. The editor already converted local show time correctly. The live selector sliced the UTC ISO string for its date, producing the wrong calendar day near midnight UTC. The shared date formatter also inferred a viewer's time zone from their country hint, which could choose Sydney for someone in Brisbane. The fix keeps event display tied to the musician profile and uses the browser's actual IANA zone for personal timestamps. It preserves the existing language suggestion and manual language choice.

## Delivery and verification

Files changed: `apps/web/src/features/portal/dashboard.tsx`, `apps/web/src/features/portal/shows.tsx`, `apps/web/src/lib/i18n.tsx`, `apps/web/src/lib/date-time.ts`, `apps/web/src/lib/show-date-time.ts`, `apps/web/tests/date-time.test.mjs`.

Automated checks: `npm run test --workspace @musica/web` passed (17 tests), the focused timezone suite passed after the final file split (4 tests), `npm run typecheck --workspace @musica/web` passed, and both Netlify production builds passed Next.js TypeScript and page generation. Regression cases cover Argentina and Brisbane on opposite sides of midnight UTC, show save/reopen round-trips, viewer device time zone, and invalid dates.

Manual Netlify production deploys: `musicaalacarta` deploy `6afd30e7835a59fa01542c68`; `themusicmenu` deploy `6afd3260feff077288d38fee`. On both sites, the landing page, `/portal/shows`, and `/api/v1/health` returned HTTP 200 after deployment. Physical iPhone/Android, tablet, authenticated production show editing, and independent visual review remain pending; these HTTP smoke checks do not substitute for those checks.

## Decisions and handoff

No backend data migration is needed because show instants were already stored in UTC. Existing country and time zone profile settings remain the source of truth for show scheduling. Deployment was manual, matching the Product Owner's choice to avoid GitHub webhooks.
