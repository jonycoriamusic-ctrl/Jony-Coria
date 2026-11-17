# Social platform picker

Date: 2026-11-17
Scope and intended outcome: Replace musician free-text social platform names with an inclusive icon dropdown while keeping existing links usable.
Status: Implemented and deployed; independent review pending.

## Ownership

Product Owner: Micaela requested a broad social and music service dropdown with automatic platform selection.
Product Manager: Main agent.
Product / UX Designer: Main agent.
Design Engineer: Main agent.
Independent Design Reviewer: Pending; implementer cannot approve their own UI.
Engineering Owner: Main agent.
QA Owner: Main agent for automated and local browser checks; independent device review pending.
Security reviewer: Pending.

## Experience and acceptance criteria

Musicians select a branded service icon and name, enter its URL, and save without typing the platform name. The list covers music platforms, mainstream social networks, messaging apps, and creator links. “Other” accepts a custom service. Existing platform names resolve case-insensitively, with historical Twitter and Facebook Messenger names mapped to the current icons. Public profile links show the same branded icon. The server continues to validate safe URLs and limit the number of links.

## Architecture and design evidence

The existing `SocialLink` API shape stays unchanged. A shared frontend registry defines platform names, groups, URL hints, and icons; the existing reusable Radix `SelectField` gained optional icon and group rendering. No new API or data migration is required. The known icon set is intentionally broad but finite, with “Other” to avoid excluding smaller services.

## Delivery and verification

Added `react-icons` for brand marks, the registry and regression tests. Local desktop and 390 × 844 browser checks showed grouped icon options, selected Spotify icon, contextual URL hint, and a usable mobile layout. The custom option exposed its text field. No demo profile changes were saved. TypeScript checks, 13 web tests, and both production Netlify builds passed. The original site was manually deployed as `6afbd885a53dd7bbeeee4d22`; the English site as `6afbd8db07beb31d758a2278`. Both live health endpoints returned Firebase production mode. Live public-profile browser checks showed existing links on both sites, with branded icons visually checked on the original address. Independent visual and physical-device review remain pending.

## Decisions and handoff

The selected option stores the platform name in the existing field; the musician supplies the URL. Unsupported services use “Other” with a custom name. The profile’s separate WhatsApp number remains available; a WhatsApp social URL is optional.
