# Action feedback and notifications

Date: 2026-11-18
Scope and intended outcome: Add consistent, dismissible, temporary notifications at the top of the app for confirmed actions and failures in all five locales.
Status: Implemented and manually deployed to both production sites; independent visual review pending.

## Ownership

Product Owner: User (requested behavior and reference)
Product Manager: Engineering, action inventory only
Product / UX Designer: Engineering implementation; independent review pending
Design Engineer: Codex
Independent Design Reviewer: Pending
Engineering Owner: Codex
QA Owner: Codex (automated checks); physical device pending
Security reviewer: Pending; payment wording checked against declared-transfer model

## Experience and acceptance criteria

Messages sit below the device safe area at the top. Each has an icon, plain language, a close button, and automatic dismissal after 5 seconds (7 for errors). At most three are shown. Success appears only after the operation succeeds. A queued transfer claim states that it was **not verified** by the bank. Field validation remains near the field as well as in a notification when appropriate. Guest identity and other guests' payment data are never included in notification text.

### Guest actions

| Action | Feedback |
| --- | --- |
| Reserve a standard song | Song reserved; transfer still needed to join queue |
| Reserve a song with dedication | Dedicated song reserved; transfer still needed |
| Declare transfer | Request entered queue; transfer **not verified** |
| Attach transfer screenshot | Receipt attached; no claim of settlement |
| Cancel reservation | Reservation cancelled |
| Copy alias, CBU, or PayID | Payment detail copied; clipboard failure shown |

### Musician actions

| Area | Actions with feedback |
| --- | --- |
| Account | Register, sign in, sign out, request password reset, send verification email, refresh verification status, create musician profile |
| Profile | Save profile, upload avatar, upload banner |
| Repertoire | Add/edit song, make song available/unavailable, preview/import CSV, create/rename/delete folder |
| Shows | Create/edit show, change live capacity, open/pause/resume/finish show, reorder queue |
| Performance | Start song, mark song played, mark request not performed |
| QR | Copy permanent URL, download print card |

All server mutations also show a localized, safe error if they fail. Form controls, navigation, opening modals, search, language selection, and automatic background refreshes do not create notifications.

## Architecture and design evidence

Reusable `ToastProvider` owns the queue and timers above route content. `useCommand` maps the confirmed server action to a message, while specific flows handle reservation, authentication, clipboard, and print actions. Five locale tables supply the copy. The visual treatment uses the app's white surface, black border rail, neutral text, and semantic Tailwind tokens. Independent visual critique remains pending.

## Delivery and verification

`npm run typecheck -w @musica/web` passed. `npm run test -w @musica/web` passed 21 tests, including message mapping and locale coverage. The production Netlify builds completed for both sites. Manual production deploys: `musicaalacarta` `6afd50c84677873db367bfb5` and `themusicmenu` `6afd5323347d90ded567c4f3`. Root, login, public QR/profile routes, and `/api/v1/health` returned HTTP 200 on the relevant production sites; both health responses reported Firebase production mode. Browser interaction and physical-device visual review remain pending; no independent UI approval is claimed.

## Decisions and handoff

No notification says a transfer is paid or settled. A manual transfer declaration puts the request in queue in good faith. Review copy and timing on an actual phone before broad rollout.
