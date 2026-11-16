# Show editor desktop field layout

Date: 2026-11-17
Scope and intended outcome: Prevent native date and time controls from overlapping in the musician's New/Edit Show modal at web widths.
Status: Published; independent design and physical-phone review pending.

## Ownership

Product Owner: user request and screenshot in this chat.
Product Manager: not separately assigned.
Product / UX Designer: not separately assigned.
Design Engineer: implementation agent; cannot independently approve its own UI.
Independent Design Reviewer: pending.
Engineering Owner: implementation agent.
QA Owner: implementation agent for local checks; independent QA pending.
Security reviewer: not separately assigned for this layout-only change.

## Experience and acceptance criteria

In the New/Edit Show dialog, date and time have distinct non-overlapping controls at web widths. The song limit appears on its own row. Below the small-screen breakpoint, all three fields stack. Labels, browser date/time pickers, keyboard focus, and form submission remain usable.

## Architecture and design evidence

The prior three-column layout gave browser-native date and time inputs less width than their intrinsic controls needed inside the fixed-width modal. Switched to two columns at the shared `sm` breakpoint and made the song-limit field span both columns. Added `min-w-0` to the reusable input and Field wrapper so grid children can shrink without crossing cell boundaries. These are Tailwind utilities consistent with the shared theme. The user screenshot provided the failure state; no separate design sign-off is claimed.

## Delivery and verification

- Changed `apps/web/src/features/portal/shows.tsx` and `apps/web/src/components/ui.tsx`.
- Opened the local demo New Show modal in a 1280-pixel browser viewport. The date and time controls rendered side by side with a clear gap; the song limit filled the next row. No show was saved.
- `npm run typecheck` and the Netlify production build passed. Manual deployment `6afb93ae435cafece3902445` became live at `https://musicaalacarta.netlify.app`.
- Production `/portal/shows` returned 200 and all 17 referenced JS/CSS assets returned 200. `/api/v1/health` remained Firebase/prod/200. A fresh Chrome tab redirected to sign-in, so the production modal was not opened in that separate session; the visual modal check was done in the local demo using the same source before the production build.
- Physical-phone review: pending.

## Decisions and handoff

Keep the modal width and native date/time inputs. Review the same fields on a physical phone when available. No independent review or production form submission is claimed.
