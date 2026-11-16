# Password visibility on musician access

Date: 2026-11-17
Scope and intended outcome: Let musicians reveal or hide what they type in password and confirmation fields without submitting the form.
Status: Implemented and manually published; independent design and physical-phone review pending.

## Ownership

Product Owner: user request in this chat.
Product Manager: not separately assigned.
Product / UX Designer: not separately assigned.
Design Engineer: implementation agent; cannot approve its own UI.
Independent Design Reviewer: pending.
Engineering Owner: implementation agent.
QA Owner: implementation agent for functional checks; independent QA pending.
Security reviewer: pending.

## Experience and acceptance criteria

The musician can toggle visibility separately on the password and confirmation fields. Each control is a 44-pixel touch target, uses a non-submitting button, exposes a localized accessible name and pressed state, and defaults to hidden when the form mode changes. The entered value stays in the field while toggling. Password reset has no password input and is unaffected.

## Architecture and design evidence

Used the existing semantic Tailwind theme and a reusable `PasswordField` component. The icon stays inside the field boundary with input padding to avoid overlap. Alternatives such as a plain text link or duplicating controls in each form were unnecessary for this small change. Visual styling follows the existing monochrome controls. No separate design approval or physical-device observation was available.

## Delivery and verification

- Changed `apps/web/src/components/ui.tsx`, `apps/web/src/features/portal/login.tsx`, and translations for all five supported locales.
- `npm run typecheck` passed. Netlify production build passed and manual deploy `6afb92699e8496eca42d9f3d` became live.
- In an isolated production browser session, the login field toggled from «Mostrar contraseña» to «Ocultar contraseña» and back. Registration displayed independent controls for password and confirmation; the confirmation control toggled correctly. No account was created and no form was submitted.
- Production `/ingresar` returned 200, all 16 referenced JS/CSS assets returned 200, and `/api/v1/health` remained Firebase/prod/200.

## Decisions and handoff

Keep the control in the shared UI layer so future password forms can reuse it. Independent design review and a physical-phone check remain pending; no sign-off is implied by this implementation record.
