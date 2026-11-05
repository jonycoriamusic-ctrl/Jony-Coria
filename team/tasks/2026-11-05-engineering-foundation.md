# Música a la Carta engineering foundation

Date: 2026-11-05, Australia/Brisbane.
Scope: create the engineering team from the existing template; produce a technical implementation plan and technology-stack options.
Status: complete for team setup and engineering planning. Application implementation has not started.

## Ownership

| Responsibility | Assignment for this task |
| --- | --- |
| Product Owner | Micaela; no unrequested sign-off recorded |
| Principal Engineer, Product Manager, planning UX | Main agent `/root` |
| Architecture and Engineering Owner | Subagent `/root/architecture` |
| Stack research and Simplicity Guardian | Subagent `/root/stack_evaluation` |
| Independent QA and Security planning review | Subagent `/root/quality_review` |
| Design Engineer | Not needed for documentation scope; pending implementation assignment |
| Independent Design Reviewer | Pending visual-design phase; no visual approval claimed |

The three subagents are execution collaborators for this task, not new user-owned chats or permanently running services. Persistent role contracts live in `team/README.md` and root `AGENTS.md`.

## Evidence and acceptance

- Source template read: shared `Owner/Shared-Resources/Engineering/Teams/builder-team/README.md` and `DESIGN-QUALITY-GUARDRAILS.md`.
- Source originals preserved; domain and platform assumptions adapted for mobile browsers and live music.
- Product requirements mapped to flows, interface states, technical rules, and acceptance scenarios.
- Parallel workstreams: architecture and implementation plan; current official-source stack research; independent failure/security review.
- Framework remains a recommendation until selected. Application code, cloud provisioning, actual provider integration, visual prototypes, and runtime testing are outside this task.

## Review and verification

Independent QA/security reviewed the architecture, product brief, decisions, and stack comparison. The proposed reservation/payment lifecycle had no critical planning finding. The review identified three concrete clarifications, all incorporated and checked by the Principal:

- Keep verified FIFO and defer manual queue reordering, aligning the product rule and HTTP contracts.
- Include the show's two total price fields explicitly in the SQL model.
- Deduplicate bank movements using stable receiving-account identity across configuration versions.

The Principal also aligned guest polling at five seconds, made table selection mandatory in the data model, and required route changes and reservations to use a consistent locking protocol. Receipt uploads remain deferred; QA cases for them are conditional on later implementation. The fifteen-minute review escalation pauses new reservations while protecting existing commitments.

Document checks: 11 Markdown files, 17 local links resolved, no unbalanced code fences. Weighted stack scores were recalculated: Laravel 4.60, Django 4.45, ASP.NET Core 4.20, Next.js 4.10. These are subjective fit scores, not performance benchmarks. Framework claims cite official documentation checked for the stack comparison.

Engineering and independent QA planning review are complete. No application, device, concurrency, or payment tests have been run; listed cases are specifications for the implementation phase. Product selection, visual references, independent design approval, and release verification remain future gates rather than claimed passes.

## Handoff

Use `docs/DECISIONS.md` to settle business defaults. The next user-facing implementation task must carry the inherited interaction, architecture-as-experience, and independent-design evidence forward. Planning completion does not satisfy those future release gates.
