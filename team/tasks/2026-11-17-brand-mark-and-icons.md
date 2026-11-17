# Brand mark and application icons

Date: 2026-11-17
Scope and intended outcome: Use the supplied black-and-white cloche/music-note mark as the Musica a la carta identity across browser and app surfaces.
Status: Implemented and manually published; independent visual and physical-device checks pending.

## Ownership

Product Owner: Micaela Piacenza (supplied the mark and requested its use)
Product Manager: Main agent
Product / UX Designer: Main agent, constrained to the supplied artwork
Design Engineer: Main agent
Independent Design Reviewer: Pending
Engineering Owner: Main agent
QA Owner: Main agent for technical checks; independent QA pending
Security reviewer: Not required for this static public asset

## Experience and acceptance criteria

- The browser tab, iOS home screen, and Android home screen show the new mark with no clipping.
- The header, landing state, login illustration area, and footer use the same mark.
- The mark remains legible on white and black surfaces, with the same silhouette in both cases.
- Navigation icons continue to represent their destinations; they are not brand marks.

## Architecture and design evidence

The user supplied one image with black on white and white on black versions. The original is retained in `design/brand/source.jpeg`. The black mark was extracted with the built-in image generation tool using a transparent background. Prompt: “Extract ONLY the black line-art symbol from the LEFT half ... Remove the white background completely ... Preserve the exact original silhouette, proportions, stroke geometry ... Center the complete mark on a transparent square canvas.” The produced asset was inspected against a white background and retained as `apps/web/public/brand/mark-black.png`.

Two attempts to extract the white mark produced visible artifacts, so those outputs were discarded. The reusable `BrandMark` component renders the clean transparent black source and applies a CSS inversion on dark surfaces. This keeps the geometry identical and avoids a separate low-quality white file. Static browser and home-screen icons use the same source, sized and placed on a white square for contrast against browser chrome and home-screen backgrounds. The PNG exports are format and size adaptations, not a new illustration.

## Delivery and verification

Files changed: brand master and icon exports, app icon and Apple touch icon, web manifest, shared `BrandMark` component, and brand placements in the shell, landing state, and login.

TypeScript type checking and the production Next.js/Netlify builds passed. Local browser review at desktop and 390px mobile width showed the header mark without clipping; local icon exports were inspected at 96px and 180px. Production deploy `6afb992f7930e0ea9f822dc9` went live. `/ingresar`, `/icon.png`, `/apple-icon.png`, `/brand/mark-black.png`, and `/site.webmanifest` returned 200. Netlify initially served the manifest as `application/octet-stream`; a `netlify.toml` header fixed it to `application/manifest+json`, verified after deployment. The production login page visibly renders the new header and dark-surface mark. Physical-device and independent design review remain pending until separately performed.

## Decisions and handoff

Use the supplied symbol without lettering inside the icon. Keep the existing “musica a la carta” wordmark next to the header mark. Re-export icons from the transparent master if a future visual review requests different padding. Do not use the discarded white raster variants.
