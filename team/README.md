# Musica a la carta engineering team

The team designs and delivers a simple, reliable web app for live music requests in Argentine bars. Guests choose from a musician's actual repertoire, optionally add a dedication, transfer the displayed amount, and track their request. Musicians manage their repertoire, prices, nightly capacity, payment verification, and performance queue from a phone.

## Template provenance

Adapted on 2026-11-05 from the existing shared [builder-team template](../../../../../Owner/Shared-Resources/Engineering/Teams/builder-team/README.md) and its [design quality guardrails](../../../../../Owner/Shared-Resources/Engineering/Teams/builder-team/DESIGN-QUALITY-GUARDRAILS.md). Canonical source directory: `/Users/micapiacenza/Micaela Piacenza Co/Owner/Shared-Resources/Engineering/Teams/builder-team/`.

Preserved: principal orchestration, simplicity review, architecture, product, domain expertise, UX, independent design review, design engineering, implementation, QA, security, vertical slices, and evidence-based gates. Adapted: Gym becomes live music; native iPhone/Flutter constraints become responsive browser constraints; Next.js/TypeScript remains the frontend; Firebase Auth/Firestore and an Express/TypeScript REST API now follow the Product Owner’s direction. Shared originals are unchanged.

## Responsibilities

| Role | Responsibility | Initial planning assignment |
| --- | --- | --- |
| Product Owner | Business priorities and final product decisions | Micaela; choices awaiting confirmation are recorded, never assumed approved |
| Principal Engineer / orchestrator | Integrate work, resolve inconsistencies, roadmap, architecture coherence | Main agent |
| Product Manager | Scope, experience brief, measurable acceptance criteria | Main agent |
| Domain expert | Repertoire, dedication, performance capacity, bar/table/night operations | Architect agent models rules; validation with Jony pending |
| Software Architect / Engineering Owner | Database model, contracts, transactions, payment lifecycle, deployment | Architecture agent |
| Simplicity Guardian / technology researcher | Compare realistic stacks, challenge unnecessary infrastructure | Stack evaluation agent |
| Product / UX Designer | Guest and musician flows, state inventory, reference designs | Main agent for planning; detailed visual design pending |
| Design Engineer | Faithful responsive UI implementation and evidence | Unassigned until implementation |
| Independent Design Reviewer | Critique references and inspect target-device UI | Unassigned until design; must differ from designer and implementer |
| Full-stack Engineer | Small tested vertical slices in selected framework | Unassigned until implementation |
| QA Owner | Independent review, concurrency, failure recovery, accessibility | QA/security agent for planning; runtime checks pending |
| Security and Privacy Engineer | Tenant isolation, authentication, payment trust, abuse, data minimization | QA/security agent |

These are reusable project roles, not employees or permanently running agents. The planning task records actual agent assignments and results. Four concurrent execution seats are sufficient: orchestrator, architect, stack researcher, and independent QA/security reviewer. Specialists can be reassigned later while preserving independence.

## Current implementation assignments

The local build is recorded in [2026-11-05 local application](tasks/2026-11-05-local-application.md). The main agent implemented the frontend and integration, build_api implemented the Express application and API tests, frontend_i18n implemented locale dictionaries/provider, and independent_review reviewed source and rendered screenshots independently. The planning-role table above records the original assignments; actual implementation evidence and remaining production gates are in the new task record.

## Operating rules

Prefer one understandable modular Express backend and one database, with a Next.js frontend in the same repository. Separate frontend/API deployables are intentional; do not split domain modules into microservices. Follow the MVC/Clean Architecture and frontend state contracts in `docs/APPLICATION-ARCHITECTURE.md` from the project root. Prefer free tiers where usable and keep paid components justified by actual live-show needs. Add infrastructure only for a measured requirement. Keep framework boundaries thin; do not invent a generic platform, microservices, or separate mobile apps. Search existing project code before adding abstractions. Use established framework authentication, migrations, validation, and transactions.

Every user-facing task includes product intent, important failure states, design references, independent review, functional evidence, and physical-phone evidence. Labels such as “premium” and “complete” are not evidence. A planning deliverable is assessed as a plan; it does not pass implementation or release gates.

See [quality gates](QUALITY-GATES.md) and [task template](tasks/TEMPLATE.md).
