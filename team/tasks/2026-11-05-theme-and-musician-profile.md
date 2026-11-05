# Shared monochrome theme and musician profile scope

Date: 2026-11-05
Scope and intended outcome: Add the requested theme file and record reusable frontend components plus musician photo, banner, contact and social-link requirements.
Status: Theme token file and planning updates complete. Frontend scaffolding, components, profile APIs/uploads and visual validation remain pending.

## Ownership

Product Owner: Micaela Piacenza.
Product/engineering documentation and theme foundation: primary Codex agent.
Independent Design Reviewer, QA and security review: pending; no independent sign-off claimed.

## Experience and acceptance criteria

Use one shared black-and-white palette with neutral grays, reusable UI primitives/layout and domain-specific presentation components. Preserve mobile bottom navigation and responsive tablet/desktop behavior. Musicians can publish an avatar, banner and chosen contact/social links; guests can follow/contact externally without an account. Public profile content is isolated from private payment evidence.

## Architecture and design evidence

Created apps/web/src/styles/theme.css with semantic CSS custom properties for colors, type, spacing, shape, motion, safe-area and layout sizing. This is an importable foundation with no dependency or runtime scaffold. All future components consume the shared tokens. Current token values and crop proportions are implementation proposals under the user's confirmed monochrome direction. The existing prototype and independent design-review gates remain pending; no production UI has been created.

Updated existing product, application architecture, Firebase/Express contracts, technical model, hosting, decision and acceptance documents. Public image publishing uses a separate namespace and authorization path from private receipts; social/contact fields are explicitly published, never copied from authentication email. Reusable presentation and image-picker behavior do not imply shared public/private upload permissions.

## Delivery and verification

Inspect CSS variable definitions/references, monochrome literals and representative text/control contrast pairs; check Markdown local links and fenced blocks. No dependency installation or application build is applicable because package/runtime scaffolding is absent. Browser rendering, physical-device evidence, full accessibility checks, API implementation and upload/storage tests remain pending.

## Decisions and handoff

The user chose the monochrome theme, reusable components and richer musician profiles. Preserve original photo colors by default; do not add per-musician app colors or an in-app following system. Next implementation work imports the theme once into the frontend root stylesheet and builds the shared primitives/profile components as part of the planned prototype and vertical slice. Firebase provisioning remains with the user.

## Tailwind follow-up

The user selected Tailwind for responsive layouts and reusable component styling. Converted theme.css to Tailwind v4 semantic theme namespaces, removed the default chromatic palette, added src/app/globals.css with shared base/safe-area helpers, and added the Tailwind PostCSS plugin configuration. Updated project instructions, product/architecture/technical plans, decisions and acceptance criteria to require utility-first styling, mobile-first responsive variants and static reusable component variant maps. No per-screen CSS or second theme configuration is introduced.

Verification: compiled the actual global stylesheet and imported theme using Tailwind 4.3.4 and its PostCSS plugin in an isolated temporary directory. Semantic, responsive, hover/focus/disabled, reduced-motion and safe-area utilities generated successfully; an explicitly requested default red utility did not. The initial selector assertion omitted generated pseudo-classes; correcting that verification assertion passed without a stylesheet change. Checked 49 local documentation links and code fences. Temporary dependency files removed; application dependencies/root layout and full browser/device checks remain pending. This is a compiled styling foundation, not a running Next.js application. Sources: https://tailwindcss.com/docs/theme, https://tailwindcss.com/docs/responsive-design, https://tailwindcss.com/docs/installation/framework-guides/nextjs.
