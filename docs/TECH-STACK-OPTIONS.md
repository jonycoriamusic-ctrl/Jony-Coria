# Musica a la carta technology options

**Current direction: Next.js + TypeScript frontend, Express + TypeScript REST backend, Firebase Authentication and Cloud Firestore Standard.** The user selected Firebase for faster integration and asked for Express. Firebase SDK repository adapters and runtime validation replace the earlier Mongoose proposal.

See [Firebase and Express](FIREBASE-EXPRESS.md), [application state/layers](APPLICATION-ARCHITECTURE.md), and [current hosting](HOSTING.md). Deploying Express on Firebase Functions requires billing-enabled Blaze; included no-cost allowances are not a guarantee of zero cost.

The framework comparison below is retained as an earlier language-neutral survey with PostgreSQL held constant. Those compositions, scores and single-process suggestions do not override the current Express/Firebase direction. Do not build the old database adapters alongside the selected one.

## What the stack must support

The system needs a public phone-friendly site reached through a musician-owned reusable QR and an authenticated musician portal in the same application. A guest selects one repertoire song, chooses a standard request or a dedication at a different total price, reserves an available slot, sees bank-transfer instructions, and tracks their own request. A musician configures their profile, repertoire, prices, show capacity, and queue, and manually verifies transfers at first.

The difficult engineering is the same in every stack: tenant isolation, no overselling under concurrency, immutable price snapshots, idempotent submissions, recoverable payment states, and clear behavior when a transfer arrives late. A rendering framework does not solve these rules automatically.

Initial constraints:

- One repository, Next.js frontend and one modular Express backend, Firebase Auth and Firestore; all business commands have a single backend implementation.
- Server-rendered public pages with small progressive enhancements; no guest account required.
- Authenticated musician accounts with explicit resource ownership checks.
- Argentine Spanish first; English, Brazilian Portuguese, Italian, and French supported through translation catalogs. Italian and French remain proposed choices.
- ARS amounts stored as integer minor units; locale controls presentation, never currency conversion.
- Protected queue/status listeners in the current Firebase plan; one stable musician QR resolves the active show and changing menu/capacity.
- Manual transfer review first; Mercado Pago integration later within the same application.
- No native mobile app, microservice boundary, message broker, or separate frontend deployment required.

## Original framework comparison with PostgreSQL

| Stack | Best fit | Main advantage here | Main tradeoff here |
| --- | --- | --- | --- |
| Laravel + Livewire + PostgreSQL | PHP team, or no existing language commitment | Closely integrated forms, authentication starter, server UI, queues, and translations | Livewire interaction behavior must be tested on weak mobile networks |
| Django + HTMX + PostgreSQL | Python team | Mature data/authentication framework with small HTML updates | Public onboarding and background execution need deliberate assembly |
| Next.js + TypeScript + PostgreSQL | React/TypeScript team | Strong UI composition with one language across browser and server | Authentication, ORM, job execution, and translation choices add integration work |
| ASP.NET Core + Razor Pages + PostgreSQL | C# team | Typed application code, Identity, and a coherent server framework | More explicit wiring for a highly interactive musician portal |

All four can satisfy the functional requirements in a monolith. None needs a separate API service merely because it supports JSON endpoints.

## Weighted decision matrix

Scores are **engineering judgments for this product**, not benchmark results or measured developer productivity. Scale: 1 = weak fit, 5 = strong fit. The assumed team is equally capable of learning each stack. Team familiarity is deliberately excluded because it has not been established.

| Criterion | Weight | Laravel | Django | Next.js | ASP.NET Core |
| --- | ---: | ---: | ---: | ---: | ---: |
| Speed to a maintainable forms-and-queue MVP | 25% | 5 | 5 | 4 | 4 |
| Integrated authentication, validation, and data conventions | 20% | 5 | 5 | 4 | 5 |
| Background work with little operational machinery | 15% | 5 | 4 | 3 | 4 |
| Mobile web UX and localization implementation fit | 15% | 4 | 4 | 4 | 4 |
| UI composition and richer interaction headroom | 10% | 4 | 4 | 5 | 4 |
| Practical maintenance and ecosystem fit | 10% | 4 | 4 | 5 | 4 |
| Browser/server language sharing | 5% | 4 | 4 | 5 | 4 |
| **Weighted score out of 5** | **100%** | **4.60** | **4.45** | **4.10** | **4.20** |

Formula: sum of each score multiplied by its percentage weight. The decimal totals make the arithmetic reproducible, not the judgment precise. PostgreSQL concurrency capability is a pass/fail requirement for all options, so it does not artificially distinguish frameworks that can all implement it.

In the original language-neutral assessment, Laravel leads because the first product is mostly transactional forms and operational screens. Django is close; its background-task execution choice accounts for most of the difference. ASP.NET Core is a strong alternative where C# expertise already exists. Next.js has excellent UI headroom, but assembling production auth, persistence, and jobs is more work than this small product necessarily needs. The Product Owner has since preferred Next.js/TypeScript. Use that direction without presenting these subjective scores as a reason to override it.

## Option 1 Laravel and Livewire

### Proposed composition

- Laravel modular monolith with Blade templates and Livewire for interactive parts.
- Eloquent models, migrations, PostgreSQL, and explicit application actions for reservations and payments.
- Laravel's Livewire starter kit for authentication scaffolding; adapt its UI to the product's approved design.
- Framework translation catalogs; project-owned Argentine Spanish copy and explicit locale mapping.
- Framework scheduler for housekeeping; database-backed queue for work that needs durable retries.
- CSS tokens and a modest component set; no mandatory purchase of premium UI components.

Laravel's official starter kits include a Livewire option and use Fortify for registration, login, password recovery, and email verification. These are useful foundations, not tenant authorization or a finished musician onboarding flow. [Laravel starter kits](https://laravel.com/docs/starter-kits).

Laravel supports a database queue driver, letting a small deployment avoid Redis solely for queued jobs. A worker is still a supervised process and must be deployed and monitored; declaring a queue is not the same as running it. [Laravel queues](https://laravel.com/docs/queues).

Livewire supports configurable polling and background throttling. For this alternative, use the current cost-oriented refresh policy: five-second musician queue and fifteen-second guest status, with hidden-tab suspension and error backoff. Poll only the relevant component and stop on terminal states. [Livewire polling](https://livewire.laravel.com/docs/wire-poll).

Laravel provides request locale selection and fallback translations. Keep the public locale `es-AR` even if framework catalog naming needs an internal adapter. Verify translated validation and authentication messages as well as product labels. [Laravel localization](https://laravel.com/docs/localization).

### Important implementation choices

Keep business rules in small actions such as `ReserveSongRequest` and `ConfirmTransfer`, not duplicated across Livewire components and future webhook handlers. Use transactions and a consistent show-row lock to serialize capacity changes. Laravel exposes `lockForUpdate`; the surrounding transaction and all competing writers must follow the same protocol. [Laravel pessimistic locking](https://laravel.com/docs/queries#pessimistic-locking).

Livewire properties and browser-submitted IDs remain untrusted. Load the price, musician ownership, and availability again on the server. Do not allow client state to select a bank account or mark a payment as confirmed.

Use JavaScript only where it earns its place: copying an alias, maintaining accessible focus, and small device interactions. Avoid turning every keystroke into a server request. Keep critical controls usable while polling replaces queue content.

### Choose this when

Choose it when fast delivery and one coherent server application are more valuable than sharing TypeScript everywhere. Reconsider it if the maintainers are substantially stronger in another stack or if richer client-side editing becomes a central product requirement.

## Option 2 Django and HTMX

### Proposed composition

- Django views, templates, forms, ORM, migrations, and PostgreSQL.
- HTMX for bounded queue/menu updates; ordinary HTTP forms remain the foundation.
- Django authentication, a custom musician signup/onboarding flow, and explicit tenant checks.
- Django translation catalogs and formatting; a purpose-built phone portal rather than the generic admin as the stage UI.
- Scheduled management commands for housekeeping; choose a durable task backend only when asynchronous jobs require it.

Django includes user accounts, permissions, groups, password hashing, and cookie sessions. These give a solid starting point, but a logged-in user must still be scoped to the musician resources they own. [Django authentication](https://docs.djangoproject.com/en/stable/topics/auth/).

Its localization system covers translated text, date and number formatting, and time zones. This suits the five-language requirement, while Argentine phrasing and translation quality remain product work. [Django internationalization](https://docs.djangoproject.com/en/stable/topics/i18n/).

HTMX supports HTML-fragment updates and polling directly from markup. Use narrowly scoped fragments and test focus, pending form inputs, and screen-reader announcements when content changes. [HTMX documentation](https://htmx.org/docs/).

Django's current Tasks framework defines and enqueues work but does not itself provide the production worker execution mechanism; its built-in backends are for development/testing. A scheduled management command can be sufficient for the pilot's expiry sweep, with durable asynchronous execution selected when needed. [Django Tasks](https://docs.djangoproject.com/en/stable/topics/tasks/).

### Important implementation choices

Put reservations and verification in explicit transaction boundaries and use row locks for competing show mutations. Do not assume separate ORM calls form an atomic workflow automatically: Django defaults to autocommit outside an active transaction. [Django transactions](https://docs.djangoproject.com/en/stable/topics/db/transactions/).

Use the Django admin for trusted operational maintenance if helpful. Do not expose it as the polished mobile musician experience. Build guest and musician screens with the same acceptance criteria as any other stack.

### Choose this when

Choose it when Python is familiar or future data/reporting work is likely. It is an equally reasonable first choice when a Python maintainer can operate it confidently. It does not require adding React or a separate REST API to support this MVP.

## Option 3 Next.js and TypeScript

### Proposed composition

- Next.js App Router as one full-stack application, with server-rendered pages and small client components.
- PostgreSQL through a maintained ORM such as Prisma, with reviewed SQL for the locking protocol when needed.
- A maintained authentication library, selected deliberately; a project-specific authorization layer.
- Server-side translation dictionaries or a maintained localization library with explicit fallback rules.
- A scheduled command and, when required, a durable worker from the same codebase.
- This original SQL composition can run on a Node/serverless host after connection and transaction verification; current low-cost provider choices are in the hosting plan.

Next.js recommends an authentication library for secure session and authentication behavior. Authentication does not remove the need to authorize each mutation and every requested musician resource. [Next.js authentication](https://nextjs.org/docs/app/guides/authentication).

The App Router documentation describes locale routing and translation dictionaries. This comparison does not assume that the Pages Router's `i18n` configuration automatically supplies the same behavior in the App Router. [Next.js internationalization](https://nextjs.org/docs/app/guides/internationalization).

Next.js can be self-hosted; its deployment guidance covers the reverse proxy and cache coordination. One Node application is a valid monolith. Review cache behavior explicitly so a public page never serves another guest's private status or an old availability value as a guarantee. [Next.js self-hosting](https://nextjs.org/docs/app/guides/self-hosting).

Prisma supports atomic transaction groups. Select the ORM/runtime combination when implementation begins, then prove the actual locking and connection behavior with PostgreSQL integration tests; TypeScript types do not establish database isolation. [Prisma transactions](https://www.prisma.io/docs/orm/prisma-client/queries/transactions).

### Important implementation choices

Do not put correctness-critical expiry jobs in browser timers or rely on a request process continuing after its response. Persist deadlines in SQL, enforce them during reads and mutations, and run a durable housekeeping mechanism.

Keep secrets, payment verification, and bank-account selection on the server. Every Server Action and route handler needs authorization and input validation. Keep one business implementation behind both UI actions and future payment callbacks.

Avoid adding NestJS or another API service just because the project uses React. A second backend is unnecessary for the stated product.

### Choose this when

Choose it when React/TypeScript is the strongest existing skill or the UI is expected to grow into a richer interactive product. It remains feasible and maintainable here, but the team should accept the additional library-selection and operations work consciously.

## Option 4 ASP.NET Core and Razor Pages

### Proposed composition

- ASP.NET Core Razor Pages with small JavaScript or HTMX enhancements.
- Entity Framework Core, the Npgsql PostgreSQL provider, and migrations.
- ASP.NET Core Identity for musician accounts, with application authorization policies.
- Resource-based translations and request localization.
- An in-process hosted service or scheduled command for retryable housekeeping, using persisted database state.
- One Linux/container web application; no requirement for Azure Functions, Windows hosting, or a separate SPA.

Razor Pages is designed for page-oriented application flows, which fits menu browsing, payment instructions, and show configuration. [Razor Pages](https://learn.microsoft.com/en-us/aspnet/core/razor-pages/).

Identity manages account credentials and related login features. EF Core can use PostgreSQL through Npgsql; SQL Server is not required by this choice. [ASP.NET Core Identity](https://learn.microsoft.com/en-us/aspnet/core/security/authentication/identity), [Npgsql EF Core provider](https://www.npgsql.org/efcore/).

ASP.NET Core includes localization services and middleware. It also supports hosted services for background tasks, but an in-memory timer or queue is not durable work storage. The application must persist deadlines and reconcile after process restarts. [ASP.NET Core localization](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/localization), [hosted services](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/host/hosted-services).

### Important implementation choices

Keep the solution small: one web project with feature folders and explicit use-case services is sufficient initially. Do not inherit the shared Gym template's Azure Functions, mobile client, or multiple architectural projects just because those were its original technologies.

Use polling first. Introduce SignalR only if measured latency or traffic justifies operating a persistent connection path. Ensure concurrent and restarted hosted processes cannot run the same side effect twice.

### Choose this when

Choose it for a C#-experienced team or an existing .NET operational environment. It is a strong monolithic option; its lower default score here reflects delivery assumptions, not a correctness or scaling limitation.

## PostgreSQL as the retained alternative

The domain is relational: musicians own repertoire and shows; shows bind availability and requests; requests have payments and audit events. Foreign keys and uniqueness constraints express those relationships and prevent duplicate identifiers. Check constraints protect local invariants such as valid nonnegative prices. [PostgreSQL constraints](https://www.postgresql.org/docs/current/ddl-constraints.html).

For the last available slot, lock the show row, recalculate eligible reservations, validate capacity and song availability, then write the request in one short transaction. Consistent row locking is a database capability independent of the web framework. Keep network/payment-provider calls outside the lock. [PostgreSQL explicit locking](https://www.postgresql.org/docs/current/explicit-locking.html).

If PostgreSQL is selected, test against PostgreSQL rather than relying on SQLite for locking guarantees. For the current Firebase direction, test Firestore transactions, contention, indexes, API authorization and client Security Rules as specified in the technical plan. Build only the selected persistence implementation.

## Current low cost deployment direction

Use the free allowance of the chosen frontend host and consider one Express HTTP function colocated with Firestore. Firebase Auth and direct protected listeners reduce custom identity and push infrastructure. Express still validates all business writes. Monitor document reads/writes, listener reconnects, API compute, build/storage costs and backup requirements. See [hosting](HOSTING.md); older Atlas and Vercel/Supabase estimates are superseded.

## Mercado Pago does not determine the framework

The later integration can use HTTPS calls and a webhook endpoint in any of these stacks. Mercado Pago documents webhook configuration, test URLs, and notification validation; exact verification behavior depends on the selected integration product. The app’s musician QR is an application URL and must not be confused with Mercado Pago's payment-QR integration. [Mercado Pago webhooks](https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks).

For the MVP, keep manual-transfer confirmation as an explicit audited use case. Later, a validated provider event can invoke the same business transition after checking payment identity, amount, currency, musician account, and current state. A hosted checkout return URL is not proof of payment. Per-musician merchant onboarding and who receives the funds need a separate product decision before provider implementation.

## Selection and next step

Next.js, Express/TypeScript and Firebase are the working direction. Specify runtime versions, API contracts, Firestore rules/indexes, transaction/read-model behavior, and auth/recovery details. Complete the inherited design/architecture evidence and a compatibility/latency/cost spike before provisioning a production service. The [technical plan](TECHNICAL-IMPLEMENTATION.md) and [Firebase design](FIREBASE-EXPRESS.md) govern implementation.
