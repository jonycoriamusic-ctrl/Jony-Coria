# Recover the musician menu after returning to the browser

Date: 2026-11-18
Scope and intended outcome: Make the printed QR link permanent, refresh the public menu after a mobile browser returns from another app, and give guests a branded recovery path if an in-app URL is invalid.
Status: Released to both production sites; physical-device and independent review pending.

## Ownership

Product Owner: Micaela Piacenza (reported the mobile navigation issue)
Product Manager: Main agent
Product / UX Designer: Main agent (branded recovery page)
Design Engineer: Main agent
Independent Design Reviewer: Pending
Engineering Owner: Main agent
QA Owner: Main agent for automated checks; independent QA pending
Security reviewer: Pending; only a public musician slug and stage name are stored locally

## Experience and acceptance criteria

- A QR created from a Netlify deploy preview encodes the permanent production `/q/<musician>` URL. Custom domains and local demo origins keep their own origin.
- Direct opening and reloading of `/q/<musician>` works without a show-specific URL. A future show still resolves from the same musician slug.
- Returning to a visible QR menu after switching apps triggers a fresh public-menu read; Safari back/forward cache restoration triggers one too.
- After a successful menu visit, the app stores only the public slug and stage name. The branded 404 and the landing page offer a link back to that menu, even after a browser restart. Storage denial does not break the menu.
- Invalid in-app routes show an accessible, localized page with the brand mark and a route home.

## Architecture and design evidence

The two screenshots show `app.netlify.com`, the Netlify administration domain, not the `musicaalacarta.netlify.app` or `themusicmenu.netlify.app` application. Our 404 and redirects cannot render on the administration domain. Production smoke checks before the fix confirmed that direct `/q/jony` requests returned HTTP 200 on both app domains. The current QR code used `location.origin`, which could encode a temporary deploy-preview host if printed there. The return-to-browser flow previously relied on React Query's focus event; `visibilitychange` and persisted `pageshow` now cover mobile backgrounding and Safari history restoration. The last public menu is a recovery link, not private guest request state.

## Delivery and verification

Files changed: `apps/web/src/lib/last-menu.ts`, `apps/web/src/lib/use-last-menu.ts`, `apps/web/src/lib/queries.ts`, `apps/web/src/features/portal/shows.tsx`, `apps/web/src/app/not-found.tsx`, `apps/web/src/features/landing/musician-landing.tsx`, `apps/web/src/lib/translations.ts`, `apps/web/tests/last-menu.test.mjs`.

Automated web tests passed (19/19), including permanent QR URL and browser-restart recovery cases; web typecheck and both Netlify production builds passed. Manual deploy IDs: `musicaalacarta` `6afd4b0aa63cea805c422aaa`, `themusicmenu` `6afd4bc4fcc34cfd4b746d0a`.

Production checks: `/q/micaela` returned HTTP 200 after direct requests on both sites; invalid routes returned HTTP 404 with the app page; the English API health endpoint returned HTTP 200. In a live in-app browser on the Spanish site, `/q/micaela` loaded after a full reload, an invalid route displayed the branded 404 and “Back to the menu · Micaela”, and that link returned to the same musician's menu. The browser test used a desktop viewport. Physical iPhone Safari and Android Chrome return-from-app checks and independent design review remain pending; the supplied screenshots are evidence of the problem, not verification of this fix.

## Decisions and handoff

The QR stays on the musician's permanent `/q/<slug>` route; no per-show QR or external Netlify dashboard redirect is introduced. The app can recover only on its own domain. If a user lands on `app.netlify.com`, they must reopen the printed QR or the app URL. The temporary preview-to-canonical mapping covers the two current Netlify sites; a future custom domain is preserved when accessed directly.
