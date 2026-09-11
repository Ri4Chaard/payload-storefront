# Implementation Plan: Policy Pages and Cookie Consent

**Branch**: `009-policy-pages-cookie-consent` | **Date**: 2026-09-11 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/009-policy-pages-cookie-consent/spec.md`

## Summary

Close the site's last four dead links — *Privacy Policy*, *Terms & Conditions*, *Cookie Policy* and
*Shipping & Returns*, all of which the footer has published since spec 001 and all of which 404 today
— by making policies an owner-writable collection served under `/legal/` and rendered through the
existing page-header band and rich-text renderer. Add the drawn cookie consent banner and the chooser the design implies but never draws, recording the
visitor's decision in a client-side cookie that nothing on the server reads.

Two decisions shape the whole build:

1. **Policies live under a `/legal/` prefix**, at `src/app/(frontend)/legal/[slug]/page.tsx`. The
   owner chose it, and it dissolves the hardest constraint this feature had: the site's single
   root-level dynamic segment belongs to the catalogue (`(shop)/[category]`), and Next permits
   exactly one per path position — so root addresses would have meant replacing the catalogue's
   route with a shared resolver, re-routing the shop as a side effect of shipping legal pages.
   **With the prefix, no existing route is touched at all.** The footer's four `href`s are repointed;
   nothing is migrated, because those four addresses have never resolved.
2. **Nothing reads the consent cookie on the server.** `cookies()` is a request-time API and the
   banner lives in the root layout, so a server read would opt every route on the site into dynamic
   rendering. The codebase already refused this once for the cart badge. The banner mounts on the
   client and reads `document.cookie` itself.

No analytics, no script gating, no provider integration — cut at the owner's direction. Categories
exist as content so the chooser and the Cookie Policy cannot drift apart; nothing consults them to
load anything, because there is nothing on this site to load.

The banner's paragraph is Payload-managed; its heading and button labels are not. That line moved
twice during the build and settled where the meaning is — the paragraph is the only part that makes
a claim about data processing, so it is the only part that must be correctable without a release.

## Technical Context

**Language/Version**: TypeScript 5 (strict), Node 22, React 19

**Framework**: Next.js 16.3.3 (App Router, Turbopack) — guides read from
`node_modules/next/dist/docs/` per `AGENTS.md`: `04-functions/cookies.md`,
`03-file-conventions/01-metadata/sitemap.md`, `04-functions/generate-metadata.md`

**CMS**: Payload 3.88.0 on `@payloadcms/db-postgres`, `lexicalEditor`

**Storage**: PostgreSQL via Payload. Two new tables plus versions; no existing table altered. One
client-side cookie, `aurum-consent`.

**Addresses**: `/legal/privacy`, `/legal/terms`, `/legal/cookies`, `/legal/shipping`, and
`/legal/<slug>` for any policy the owner creates. No redirects — the bare paths never resolved.

**Testing**: Vitest (`pnpm test`, `pnpm test:integration`), Playwright (`pnpm test:e2e`,
`pnpm test:a11y`, `pnpm test:stories`), Storybook

**Target Platform**: Server-rendered web, mobile-first from 390px

**Project Type**: Web application — Payload CMS with a Next.js App Router storefront

**Performance Goals**: Constitution V — LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1 at p75 mobile

**Constraints**: ≤ 300KB gzipped JS per route **and** ≤ 100KB above the measured 181KB framework
baseline. This feature adds a client component to the **root layout**, so it is charged to every
route on the site — the chooser is therefore lazily imported (research R9). WCAG 2.2 AA.

**Routing**: one dynamic segment per path position. The root one belongs to `(shop)/[category]`;
this feature takes `/legal/[slug]` and does not contend for it (research R1).

**Scale/Scope**: 4 seeded policy pages (extensible), 1 banner, 1 chooser, 1 collection, 1 global,
1 route added, 3 existing files edited (root layout, footer, sitemap). No route moved or deleted.

## Constitution Check

*GATE: evaluated before Phase 0, re-evaluated after Phase 1 design, and again after implementation.
Result: **PASS**. The one exception this plan carried — hardcoded banner copy — was resolved when the
owner made the banner's body editable; Complexity Tracking keeps the history.*

| Principle | Status | Evidence |
| --- | --- | --- |
| **I. Payload Is the Single Source of Truth** | ✅ | Policy content, cookie categories, the banner's paragraph, its on/off switch and the consent version are all Payload-managed with no deploy. What stays in code is the banner's heading and its three button labels — names for what a control does, which the principle itself exempts as "non-content UI affordances". See Complexity Tracking for why this row changed twice. |
| **II. Reuse Before Creation** | ✅ | `PageHeaderBlock`, `RichText`, `Container`, `EmptyState`, `Modal`, `Drawer`, `Switch`, `Button`, `Link` all reused. **No policy-page component is created** — the route composes kit parts directly, as `src/app/(frontend)/faq/page.tsx` already does; a single-consumer wrapper with no logic is exactly what Constitution II argues against. Shared `slugField` and `seoField` reused. New: the banner and the chooser, which have no equivalent — both go into the UI kit with documented states, not into a feature folder. |
| **III. Design Tokens Over Magic Values** | ✅ | No new colour, spacing, or type values. `pnpm check:tokens` and `check:styles` gate it. |
| **IV. Content Modeling & Schema Evolution** | ✅ | Collection, global, and field shapes specified in `data-model.md` before implementation. Every field labelled and described. Slug collisions rejected at save time with an actionable message. Access explicit on both. Drafts and versions on both. One migration with a rollback that drops two new tables holding no prior content. |
| **V. Performance, Accessibility & SEO Budgets** | ✅ | Chooser lazily imported so the root-layout cost is the banner alone; budget measured against a production server, not a build log. Banner is `position: fixed` so it contributes no CLS. Server components everywhere except the banner and chooser, which are genuinely interactive. Metadata, canonicals, and sitemap rows per FR-052 – FR-055. WCAG 2.2 AA on all five surfaces. |
| **VI. Commerce Correctness & Data Protection** | ✅ | No money, no inventory, no customer data touched. **Strengthens** the principle's cookie clause: the consent record carries no identifier, there is no server-side consent log, and FR-048 forbids any admin field that could inject a third-party script. The two cart cookies keep the ungated classification spec 005 reasoned out. |
| **Naming — paths** | ✅ | All new files kebab-case; `pnpm check:naming` is a blocking gate. |
| **Workflow — editorial verification** | ✅ | Quickstart requires creating and previewing a fifth policy in the admin, not just the seeded four. |

**Post-Phase-1 re-evaluation**: no new violations. The design added one thing worth noting —
`footerPlacement` has three values rather than two, which is marginally wider than the spec's Out of
Scope wording. Recorded in research R7 and below; it is required to keep FR-015c honest.

## Project Structure

### Documentation (this feature)

```text
specs/009-policy-pages-cookie-consent/
├── plan.md                  # This file
├── spec.md
├── research.md              # Phase 0 — 13 decisions
├── data-model.md            # Phase 1
├── quickstart.md            # Phase 1
├── contracts/
│   ├── consent-record.md    # The cookie's shape and staleness rules
│   └── policy-route.md      # /legal/[slug] — resolution, caching, rendering
├── checklists/
│   └── requirements.md
└── tasks.md                 # Phase 2 — NOT created by /speckit-plan
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── (frontend)/
│   │   ├── legal/
│   │   │   └── [slug]/page.tsx               # NEW — the only route this feature adds
│   │   ├── (shop)/                           # UNTOUCHED — the prefix is why
│   │   └── layout.tsx                        # EDIT — third Payload read; mounts the banner
│   └── sitemap.ts                            # EDIT — published policy addresses
├── collections/
│   └── policies.ts                           # NEW
├── globals/
│   └── cookie-settings.ts                    # NEW
├── components/
│   ├── layout/footer/footer.tsx              # EDIT — legal row + Customer Care from content
│   └── ui/
│       ├── cookie-banner/                    # NEW — kit component, three actions
│       └── cookie-preferences/               # NEW — kit component, lazily imported
├── lib/
│   ├── consent/
│   │   ├── record.ts                         # NEW — serialise/parse/compare (contract §2–§4)
│   │   ├── cookie.ts                         # NEW — the document.cookie read/write
│   │   └── types.ts                          # NEW
│   └── policies/
│       ├── queries.ts                        # NEW — by slug, footer set, slugs for the sitemap
│       ├── mappers.ts                        # NEW — lexical → HTML, per the blog's pattern
│       └── types.ts                          # NEW
├── migrations/                               # NEW migration + regenerated payload-types.ts
└── payload.config.ts                         # EDIT — register collection and global

scripts/
└── seed-policies.ts                          # NEW — idempotent, uses skipRevalidation

tests/
├── unit/consent-record.spec.ts               # NEW
├── integration/policies.spec.ts              # NEW
├── a11y/                                     # EDIT — four pages, banner, chooser
├── e2e/consent.spec.ts                       # NEW
└── stories/                                  # EDIT — banner and chooser stories
```

**Structure Decision**: The existing structure is followed without deviation — collections in
`src/collections/`, globals in `src/globals/`, shared components in `src/components/ui/`, per-feature
data access in `src/lib/<feature>/` split into `queries` / `mappers` / `types` exactly as
`src/lib/blog/` and `src/lib/questions/` are. **No existing route is moved, renamed, or deleted.**
The feature adds one route segment under a prefix it owns outright — see `contracts/policy-route.md`.
Three existing files are edited: the root layout, the footer, and the sitemap.

## Phasing

Ordered so that each phase leaves the site working and demonstrable.

| Phase | Delivers | Spec |
| --- | --- | --- |
| 1 | `policies` collection, global, migration, regenerated types, seed script | US3 groundwork |
| 2 | `/legal/[slug]` route + policy page rendering; the four links resolve | **US1 (P1)** |
| 3 | Footer legal row and Customer Care from published content | FR-015b, FR-015c |
| 4 | Consent record library + unit tests (no UI) | contract §2–§4 |
| 5 | Banner in the root layout, three actions | **US2 (P2)** |
| 6 | Chooser, lazily imported, plus the footer re-entry point | FR-028 – FR-033 |
| 7 | Metadata, canonicals, sitemap rows | **US6 (P6)** |
| 8 | a11y, e2e, budget measurement, editorial verification in the admin | all gates |

US3 (owner writes policies) and US4 (owner controls when it asks) are satisfied by phases 1, 5 and 6
rather than having phases of their own — both are admin-side consequences of schema that earlier
phases land.

## Complexity Tracking

> Two entries. The first is a Constitution violation the owner chose knowingly; the second is a
> deviation from the spec's own stated scope that the design forced.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| ~~**Constitution I** — the banner's heading, body and button labels hardcoded~~ **Resolved, no longer an exception** | — | The banner's **body is now editable** (FR-025), so the sentence that carried the legal meaning is the owner's and the exception this row existed for is gone. What remains in code is the heading and three button labels, which name controls rather than asserting anything — inside the principle's own carve-out for "non-content UI affordances" rather than a departure from it. **Recorded rather than deleted** because the decision reversed twice: fully editable → fully hardcoded → split. FR-025c keeps the surviving labels free of any claim about the cookie set, permanently, since those genuinely cannot be corrected without a release. |
| **Spec Out of Scope** — `footerPlacement` has three values (`legal`, `customer-care`, `hidden`) rather than governing the legal row alone | FR-015c requires that unpublishing a policy leaves no link to it anywhere. *Shipping & Returns* is drawn under CUSTOMER CARE, so a `legal`/`hidden` pair would have left a hardcoded link to a 404 the moment that policy was unpublished. | A two-value field satisfies the spec's wording and breaks its requirement. Hardcoding the Customer Care link was the status quo and is what FR-015c exists to end. The footer's navigation remains non-editable — headings, order, and non-policy links are still code; all that moves is which named slot a policy link lands in. |
