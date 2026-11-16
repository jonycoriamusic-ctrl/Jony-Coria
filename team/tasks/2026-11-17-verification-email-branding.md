# Verification email branding

Date: 2026-11-17
Scope and intended outcome: Send musician account verification email in the selected language with Musica a la carta branding.
Status: Partial. Locale is configured; Firebase currently rejects verification-template edits.

## Ownership

Product Owner: Micaela Piacenza
Product Manager: Main agent
Product / UX Designer: Main agent
Design Engineer: Main agent
Independent Design Reviewer: Pending
Engineering Owner: Main agent
QA Owner: Main agent for type checking; independent QA pending
Security reviewer: Pending

## Experience and acceptance criteria

- New musicians and musicians requesting a resend receive a verification message in the selected app language. Argentine Spanish uses the project's Spanish (Latin America) default.
- The sender display name and subject should show Musica a la carta. The body should be concise and branded if the provider permits editing.
- Verification links must continue to work; no custom action handler or sender domain is introduced without its infrastructure.

## Architecture and design evidence

The current Firebase template sends from `noreply@jony-coria.firebaseapp.com` and uses `%APP_NAME%`, which resolves to `jony-coria` for this web app. Firebase's template editor permits sender name and subject editing in principle, but disables the verification body to prevent spam. A custom sender domain requires ownership and DNS verification. Fully custom HTML would require generated action links and an external email sender.

On 2026-11-17, the template language was successfully set to Spanish (Latin America). Saving `Musica a la carta` as the sender name and `Verificá tu email | Musica a la carta` as the subject failed: the console reported “Email template updates are currently unavailable for this project.” The values did not persist. Firebase support is the documented route for this project restriction.

## Delivery and verification

The web app now applies the selected locale before sending verification and password reset emails. For `es-AR`, it uses the Firebase console's Spanish (Latin America) default template; other supported locales are passed explicitly. TypeScript type checking and production Next.js/Netlify builds passed. Manual Netlify deploy `6afb96a68febd6e145b4834d` went live; `/`, `/ingresar`, and `/api/v1/health` returned 200, with the health endpoint reporting `firebase` and `prod`. Live delivery and rendered email review remain pending.

## Decisions and handoff

Keep Firebase's default action URL until a complete action handler exists. Request Firebase support to lift the template update restriction, then set sender display name and subject. A domain owned by the product is needed to replace the `firebaseapp.com` sender and address the mail-client sender warning. Independent design and physical-device review remain pending.
