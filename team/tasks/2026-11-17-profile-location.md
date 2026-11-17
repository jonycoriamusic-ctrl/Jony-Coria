# Unified profile location

Date: 2026-11-17
Scope and intended outcome: Remove contradictory musician profile location and country fields.
Status: Implemented and deployed; independent device review pending.

## Ownership

Product Owner: Micaela requested unifying the two fields.
Product Manager: Main agent.
Product / UX Designer: Main agent.
Design Engineer: Main agent.
Independent Design Reviewer: Pending; implementer cannot approve own UI.
Engineering Owner: Main agent.
QA Owner: Main agent for type/build checks; independent device review pending.
Security reviewer: Pending.

## Experience and acceptance criteria

The musician edits one profile location setting: country. It determines the currency, transfer method, phone hint and allowed show time zones. Public profile and guest menu display that country, so an old free-text location cannot contradict it. Each show's venue still describes the actual performance place.

## Architecture and design evidence

The existing `market` value remains the authoritative country. The legacy `location` property stays in the API for compatibility and is set to the chosen country on the next profile save. Existing profiles require no migration because public views render from `market`. Australia retains its show time zone selector. The change uses existing `SelectField` and Tailwind theme styles.

## Delivery and verification

Changed the profile editor and two public views. TypeScript checks and both Netlify production builds passed. The original site was manually deployed as `6afbd60f58d75c088b5a0ff4`, and the English site as `6afbd666ddf394ed8c314a62`. Live browser checks on both addresses showed an Australian profile as “Australia” even while its legacy database `location` field still held `auss`. Independent visual and physical device reviews remain pending.

## Decisions and handoff

Country is the sole musician profile location control. Venue remains show-specific. If city-level public location is needed later, it should be added as an explicit city field with country still authoritative.
