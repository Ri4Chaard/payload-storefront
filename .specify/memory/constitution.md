<!--
SYNC IMPACT REPORT
==================
Version change: 2.2.0 -> 3.0.0
Bump rationale: MAJOR. The project is redefined from one specific shop into a domain-neutral store
                template that can be turned into any kind of shop. A new principle (VII. Domain-
                Neutral Core) constrains every future feature, and i18n parity becomes a principle
                (VIII) rather than a convention.
Principle changes:
  - Preamble rewritten: the constitution governs the template and every shop built from it.
  - V. Budgets: the measured-baseline history is dropped; the rule and the method stay.
  - VI. Commerce: the order hand-off (messenger checkout) is named; payment rules apply as soon
        as a payment provider is added.
  - NEW VII. Domain-Neutral Core
  - NEW VIII. Three Languages by Construction
Runtime guidance: AGENTS.md (read by Codex, imported by CLAUDE.md for Claude Code).
Deferred TODOs: none
-->

# Store Template Constitution

This repository is a **store template**: a domain-neutral e-commerce storefront and content platform
built on Payload CMS and Next.js, meant to be turned into any kind of shop — clothing, groceries,
bicycles, jewelry, books. This constitution governs the template and every shop built from it: how
components are shared, how content is modeled, how the core stays neutral, and how pages ship.

Throughout this document "the shop" means whatever store is being built from the template, and
"the core" means the code that every such store shares.

## Core Principles

### I. Payload Is the Single Source of Truth

Content, structure, and merchandising live in Payload — never in the codebase.

- User-visible copy, images, navigation, promotional banners, SEO metadata, and page composition
  MUST come from Payload collections or globals. Hardcoded strings in components are permitted
  only for developer-facing errors and non-content UI affordances.
- Pages MUST be assembled from Payload Blocks. Adding a new page layout means composing existing
  blocks in the admin, not writing a new bespoke page component.
- Payload's generated types (`payload-types.ts`) are the canonical shape of all content data.
  Components MUST consume those generated types. Hand-written interfaces that mirror a collection
  are forbidden — regenerate instead.
- Data MUST be fetched through Payload's Local API in server components and the REST/GraphQL API
  elsewhere. Direct database queries that bypass Payload's access control and hooks are forbidden.
- Anything an editor should be able to change without a deploy MUST be editable without a deploy.
  If a marketing request requires a code change to alter copy or ordering, that is a modeling
  defect to be fixed, not a ticket to be fulfilled.

Rationale: The entire reason for a CMS is that content changes without engineering involvement.
Every hardcoded string quietly converts an editor task back into a deployment.

### II. Reuse Before Creation (NON-NEGOTIABLE)

The UI kit is the vocabulary of this site. New components are the exception, not the default.

- Before creating any component, the author MUST search the UI kit and the existing component tree
  for something that already does the job. A pull request introducing a component that duplicates
  an existing one MUST be rejected.
- If an existing component is 80% right, extend it with props or variants. Do NOT copy it into a
  near-identical sibling. `ProductCard`, `ProductCardNew`, and `ProductCardV2` may never coexist.
- Genuinely new components MUST be added to the UI kit with their variants, states, and props
  documented — not dropped into a feature folder where the next developer cannot find them.
- A component belongs in the shared UI kit the moment it has a second consumer. The second usage
  is the trigger to promote it, not to duplicate it.
- The same rule governs non-component code: utilities, hooks, formatters, and Payload field
  configurations are shared before they are rewritten. Repeated field groups MUST become reusable
  field configs; repeated block patterns MUST become shared blocks.
- Third-party UI libraries MUST NOT be added when the existing kit can express the pattern. Each
  new dependency requires justification in the feature plan against what already exists.

Rationale: Component duplication is the primary way a site's UI drifts out of consistency. Two
copies of a button diverge within weeks, and every future change costs double while the site
slowly stops looking like one product.

### III. Design Tokens Over Magic Values

Visual consistency is enforced by the system, not by discipline.

- Colors, spacing, typography scale, border radii, shadows, breakpoints, and animation durations
  MUST reference design tokens. Raw hex values, arbitrary pixel spacing, and one-off font sizes
  are forbidden in component code.
- Changing a token MUST propagate site-wide. If a brand color change requires touching more than
  the token definition, the tokens have been bypassed somewhere and that is the bug to fix.
- Layout MUST be responsive by construction using the defined breakpoints. Fixed pixel widths on
  containers and desktop-only assumptions are rejected in review.
- Dark mode, where supported, MUST be expressed through token redefinition — never through
  per-component conditional color logic.
- Every interactive element MUST implement its full state set: default, hover, focus-visible,
  active, disabled, and loading. A component shipped without focus-visible styling is incomplete.

Rationale: Tokens are what makes a redesign a configuration change instead of a rewrite, and they
are the only reliable defense against a hundred slightly different greys.

### IV. Content Modeling & Schema Evolution

Payload's schema is a shared contract with editors and with production data.

- Collections, globals, and blocks MUST be modeled before implementation and recorded in the
  feature spec. Field naming MUST be consistent across collections — the same concept uses the
  same field name everywhere.
- Every field MUST have an editor-facing label and, where its purpose is not self-evident, admin
  description or helper text. Fields no editor can interpret will be filled incorrectly.
- Relationships MUST be modeled as Payload relationship fields. Storing foreign IDs in text fields
  is forbidden.
- Required fields, validation, and sensible defaults MUST be defined at the field level so invalid
  content cannot be published in the first place.
- Schema changes affecting existing content MUST ship with a tested Payload migration and a
  rollback path. Renaming or removing a populated field without a migration is prohibited.
- Access control MUST be defined explicitly on every collection. A collection that relies on the
  default access configuration MUST have that decision stated deliberately, not by omission.
- Drafts, versions, and scheduled publishing MUST be enabled for editorial content so changes can
  be previewed and reverted without a deploy.

Rationale: Content models are far harder to change than code once real content exists, and every
modeling shortcut is paid for by editors doing manual work forever.

### V. Performance, Accessibility & SEO Budgets

A storefront that is slow, unreachable, or unindexed does not sell.

- Field-measured Core Web Vitals MUST stay within LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1 at the 75th
  percentile on mobile for home, category, product-detail, cart, and checkout.
- Initial JavaScript MUST NOT exceed **300KB gzipped per route**, and MUST NOT exceed **100KB
  gzipped above the measured framework baseline** (a page carrying no application code). A change
  that breaches either MUST reduce elsewhere or be rejected.
  - Two numbers because they police different things: the total is what a visitor on a phone
    downloads; the delta is the half this codebase controls.
  - The baseline MUST be re-measured on a framework upgrade rather than carried forward as a
    constant.
  - Measure against a **production server**, not a build log: the figures that matter are what the
    browser fetches before the load event, gzipped as served.
- Server components are the default. `use client` MUST be justified by actual interactivity and
  pushed as far down the tree as possible.
- All images MUST go through the framework's image pipeline with explicit dimensions, responsive
  sizes, and modern formats. Payload uploads MUST define image sizes; unoptimized `<img>` tags and
  layout-shifting images are rejected in review.
- The site MUST meet WCAG 2.2 Level AA. Semantic HTML is required, and ARIA is used only where
  semantics are insufficient. The full purchase flow MUST be operable by keyboard alone and with a
  screen reader.
- Every page MUST render meaningful content server-side. Product, category, and article pages MUST
  emit canonical URLs, editor-controlled metadata, Open Graph tags, and valid structured data
  (schema.org Product, Offer, BreadcrumbList, Article).
- Caching and revalidation strategy MUST be explicit per route, and content publishing MUST
  invalidate the affected pages. Stale content after publish is a defect.

Rationale: Speed, reach, and discoverability are the three inputs to traffic and conversion, and
all three regress silently unless they are budgeted and measured. A budget nobody can meet is
measured once and then ignored, which is worse than a generous one that is enforced every release.

### VI. Commerce Correctness & Data Protection

Money, inventory, and customer data are the parts of a website where mistakes are unrecoverable.

- The template's checkout is a **hand-off**: the cart is sent to the seller through a messenger
  (WhatsApp, Telegram, Instagram) with every line, option and total composed server-side. The rules
  below about payments apply in full the moment a payment provider is added.
- Prices, taxes, discounts, and shipping MUST be computed server-side at order creation. Client
  supplied amounts are display inputs only and MUST NEVER be trusted for charging.
- Monetary values MUST use integer minor units with an explicit currency code. Floating-point
  arithmetic on money is forbidden.
- Checkout, payment webhooks, and refunds MUST be idempotent. Duplicate delivery MUST NOT
  double-charge, double-ship, or double-decrement inventory. Inbound webhooks MUST be
  signature-verified before any side effect.
- Inventory MUST be reserved before payment capture, and order state MUST be an explicit
  append-only progression with an audit trail. Order history is never mutated in place.
- Raw payment instrument data MUST NEVER touch application servers, logs, or the Payload database.
  Payment capture uses a PCI-compliant provider; the system stores only provider tokens and
  last-four digits.
- Customer personal data MUST be access-controlled at the collection level so one customer can
  never read another's orders or addresses, and admin-only fields MUST be hidden from customer
  facing APIs. Logs and analytics MUST be scrubbed of personal data.
- Every data collection point MUST have a documented retention period and a working deletion path
  (GDPR/CCPA erasure). Non-essential cookies and trackers MUST be gated on explicit consent.
- Secrets, API keys, and the Payload secret MUST NEVER appear in the repository or in client
  bundles, and MUST be rotatable without a code change.

Rationale: A visual bug is embarrassing; a pricing, inventory, or privacy bug is a refund, a
chargeback, or a regulatory notice. These rules are the floor, and the floor does not move for
schedule.

### VII. Domain-Neutral Core

The core sells "products". It never knows what they are.

- The core MUST NOT contain vocabulary, fields, filters, icons, or logic specific to one kind of
  shop. Rings, sizes, ISBNs, frame geometries and expiry dates are all *some* shop's concepts, not
  the template's.
- What differs between shops is modeled as **data**, not schema: categories, collections, colours,
  attributes (name/value pairs editors define), and variant types with their options (each option
  with its own price, stock and photograph). A new kind of shop SHOULD need only admin work and
  seed changes.
- When a shop genuinely needs a new structural concept (a filter facet, a field with behaviour), it
  MUST be added generically — named for what it does ("option", "attribute", "facet"), not for the
  first product that needed it — and documented in `docs/customizing.md`.
- Seed data, Storybook stories and test fixtures MUST use neutral placeholders ("Product 1",
  "Option A", "Collection A"). Real catalogue content belongs in a shop's own database, not in the
  template.
- Brand identity — name, palette, typefaces, icon — MUST be swappable from the token sources, the
  font loader, the wordmark component and the app icon, without touching feature code.

Rationale: every jewelry- or clothing-shaped assumption baked into the core is a rewrite for the
next shop. Keeping the core neutral is what makes this a template rather than a fork.

### VIII. Three Languages by Construction

The storefront ships in English, Russian and Ukrainian, and every change keeps all three whole.

- Interface strings live in `src/i18n/messages/{en,ru,uk}.json`, and the three files MUST have
  identical key sets (enforced by a unit test). A key added in one language is added in all three
  in the same change.
- Editorial content is localized in Payload; a field an editor writes MUST be `localized: true`
  unless it is an identifier, a number or a relationship.
- Seeds MUST provide every locale: English in `scripts/seed-catalog.ts`, Russian and Ukrainian in
  `scripts/seed-translations-data.ts`.
- Adding or removing a locale is a configuration change documented in `docs/customizing.md`, not a
  refactor.

Rationale: a translation added later is a translation never added. Parity enforced at review time
costs minutes; parity recovered after launch costs a project.

## Technology Stack & Project Structure

- **Stack**: Payload CMS with a Next.js App Router frontend, TypeScript in strict mode across the
  whole codebase. `any` requires an inline justification comment.
- **Structure**: Payload collections, globals, blocks, and reusable field configs live in
  dedicated directories with one concern per file. Shared UI lives in the UI kit directory;
  feature directories may hold only components with a single consumer.
- **Naming — paths**: Every file and directory in the repository is kebab-case, with no
  per-directory dialect. `hero-banner.tsx`, never `HeroBanner.tsx` or `heroBanner.tsx`;
  `button.stories.tsx`, never `Button.stories.tsx`. Framework syntax in a path is exempt from the
  check but not from the convention — Next.js route groups `(frontend)` and dynamic segments
  `[slug]` keep their brackets, and the name inside them is still kebab-case. Enforced by
  `pnpm check:naming`, not by review: macOS has a case-insensitive filesystem, so `import './Button'`
  resolves against `button.tsx` locally and fails only once CI runs on Linux — a class of defect
  that is invisible in a diff.
- **Naming — identifiers**: Exported names are unaffected by the path rule. React components stay
  PascalCase, so `hero-banner.tsx` exports `HeroBanner`. Collections are plural, blocks are named
  for what an editor sees, and components are named for what they are rather than where they are
  used. `HeroBanner`, not `HomepageTopThing`.
- **Types**: `payload-types.ts` is generated, committed, and MUST be regenerated in the same commit
  as any schema change. A pull request whose generated types are stale fails review.
- **Styling**: One styling approach for the entire codebase. Mixing paradigms for the same concern
  requires an approved exception in the feature plan.
- **Dependencies**: Every new dependency MUST be justified in the plan against the existing stack,
  and MUST be checked for bundle-size impact before it reaches a client route.
- **Environments**: Local, staging, and production are configured identically apart from
  credentials. Production payment credentials MUST NEVER exist in a non-production environment.

## Development Workflow & Quality Gates

- **Specification first**: Features begin with a spec (`/speckit-specify`) and a plan
  (`/speckit-plan`). Specs MUST state which existing components and blocks will be reused, which
  new ones are genuinely required and why, and what the Payload schema changes are.
- **Branching**: Short-lived feature branches off `main`. Direct pushes to `main` are prohibited.
- **Review**: At least one approving review. Changes to checkout, payments, pricing, or access
  control require two. Every reviewer MUST explicitly check for duplicated components and
  hardcoded content before approving.
- **CI gates** — all MUST pass before merge, with no manual override:
  1. Lint and strict type checks clean; generated Payload types current.
  2. Unit and integration tests pass. Business logic — pricing, cart, discounts, inventory — MUST
     be covered by tests, and every bug fix MUST start with a failing regression test.
  3. Checkout end-to-end suite passes against the payment provider sandbox.
  4. Automated accessibility scan passes on changed pages.
  5. Performance budgets (bundle size, Lighthouse CI) not exceeded.
  6. Dependency vulnerability scan reports no new critical or high findings.
- **Migrations**: Every Payload migration MUST ship with a tested rollback path and MUST be
  verified against a production-sized content set before release.
- **Releases**: Deployments MUST be rollback-capable within 10 minutes without data loss.
  Behaviour-changing commerce features ship behind a flag with a documented kill switch.
- **Observability**: Structured logging with a request correlation ID is mandatory. Checkout
  conversion, payment failure rate, error rate, and p95 route latency MUST be monitored and
  alerted on.
- **Editorial verification**: Any change to a block or content model MUST be verified in the
  Payload admin by actually creating and previewing content before merge. Shipping a block that is
  unusable in the admin is a defect regardless of how well it renders.
- **Complexity**: New services, data stores, or dependencies MUST be justified against a simpler
  alternative in the plan. Unjustified complexity is grounds for rejection.

## Governance

This constitution supersedes all other development practices, conventions, and preferences. Where
a style guide, ticket, or reviewer preference conflicts with this document, this document wins.

**Amendment procedure**: Amendments MUST be proposed as a pull request modifying this file,
stating the motivation, the impact on in-flight work, and a migration plan for any code the
amendment renders non-compliant. Approval requires agreement from the project maintainers.
Amendments take effect on merge; existing non-compliant code MUST be brought into compliance
within the window stated in the amendment's migration plan.

**Versioning policy**: This constitution uses semantic versioning.
- MAJOR — a principle is removed or redefined in a backward-incompatible way.
- MINOR — a principle or governance section is added, or guidance is materially expanded.
- PATCH — clarifications, wording, and non-semantic refinements.

**Compliance review**: Every pull request review MUST verify compliance with these principles,
with particular attention to Principle II — component duplication is the most common and most
expensive violation — and Principle VII, since a domain-specific assumption is the easiest one to
merge without noticing. A full audit of the component tree and content model is performed quarterly,
and its findings are tracked as blocking work items. Deviations require a documented, time-boxed
exception approved by the maintainers and recorded in the feature plan's Complexity Tracking
section; undocumented deviation is a defect.

**Runtime guidance**: `AGENTS.md` at the repository root carries day-to-day development guidance
for agents and contributors — Codex reads it directly and `CLAUDE.md` imports it for Claude Code.
It MUST remain consistent with this constitution; on conflict, this constitution governs.

**Version**: 3.0.0 | **Ratified**: 2026-08-25 | **Last Amended**: 2026-11-18
