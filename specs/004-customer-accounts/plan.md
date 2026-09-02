# Implementation Plan: Customer Accounts — Authentication and Profile

**Branch**: `004-customer-accounts` | **Date**: 2026-09-01 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-customer-accounts/spec.md`

## Summary

Open the door `customers` has been a frame for since spec 003. Public registration, a six-digit
email verification, sign-in with a persistent session, a code-based password reset, and the profile
page with name, addresses, marketing preference and a password change.

The approach is **to add as little new machinery as possible**, because most of what this feature
needs already exists and was not obvious until the packages were read rather than recalled. Four
findings changed the shape of the work:

**The six-digit code is an alias for Payload's own token, not a second credential.** Payload's
verification and password reset are link-based, and the brief requires a code. The naive reading —
build a parallel credential system — means reimplementing token generation, comparison, expiry and
the `_verified` state transition, which is the security-critical code most worth not writing twice.
Instead, `verify.generateEmailHTML` and `forgotPassword.generateEmailHTML` are the interception
points: they receive Payload's token at send time, we mint a code bound to it and email the code,
and a correct code resolves back to the token for `payload.verifyEmail()` or
`payload.resetPassword()`. Payload keeps owning the cryptography and the state machine. See
[research.md](./research.md) R3, with every API verified against `node_modules/payload`.

**The `addresses` collection already exists, already access-controlled, already migrated.** Spec 003
left `addresses: false` in the config with a note that it is ignored. That note is correct and its
consequence is bigger than it claims: `createAddressesCollection` gives us a `customer`
relationship, admin-or-owner access on read/update/delete, a hook that assigns ownership, and
`country` as a select — and the `Address` type is already in `payload-types.ts`. This feature
**configures** that collection. Writing our own would be the duplicate-component violation
Principle II calls the most expensive one, one tier up. See R5.

**The plugin's country list excludes this shop's own market.** `defaultCountries` has 40 entries and
contains neither Kazakhstan nor the UAE. The footer's shop address is in Dubai and the profile
design's sample address is in Astana — shipping the default would make the design's own example
address unsaveable. `supportedCountries` is replaced with the full ISO list, labelled through
`Intl.DisplayNames` so no dependency and no hardcoded English name list is needed. See R6.

**Next 16 renamed Middleware to Proxy.** `AGENTS.md` is right that this is not the Next.js in the
training data: `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md` states the rename
outright, so a `middleware.ts` would simply never run. The same docs are explicit that a layout is
the wrong place for an auth check — layouts do not re-render on client-side navigation — so
authorization lives in a data access layer next to the data, with `proxy.ts` doing only an
optimistic cookie-presence redirect. See R9.

## Technical Context

**Language/Version**: TypeScript 5.9 (strict; `any` requires an inline justification comment)

**Primary Dependencies**: Payload 3.88.0, Next.js 16.3.3, React 19, Tailwind 4.3.3 — all unchanged.
No dependency is added for the OTP input, the modal, or the country list.

**Four new runtime dependencies**, each justified against Principle II as Constitution requires:

| Package | Why it earns its place |
| --- | --- |
| `@payloadcms/email-resend@3.88.0` | The version matching every other `@payloadcms/*` package installed. Payload's auth operations send through the configured adapter, so without one `forgotPassword` and `verify` cannot send at all (R1). Server-only; never in a client bundle. |
| `zod@4` | This feature ships **nine** forms. The alternative is a hand-written validator per form, duplicated between the browser and the action it posts to — and the copy that drifts silently is always the server's. One schema per form, imported by both, is the only arrangement where "what counts as valid" cannot disagree with itself (R16). |
| `react-hook-form@7` | Nine forms again, four of them inside modals. Uncontrolled by default, so typing does not re-render the form — which matters most for the address modal, the largest control set in the feature. |
| `@hookform/resolvers@5` | The three-line adapter binding the two together. Writing it by hand to avoid a dependency would be the version of Principle II that costs more than it saves. |

`react-hook-form` and `zod` are the only two that reach the browser. Their combined cost is measured
against Constitution V's 200KB budget in T568.

**Storage**: PostgreSQL via `@payloadcms/db-postgres`. One generated, committed migration with a
tested `down`. Five columns on `customers`, two on `addresses`, one new `verification_codes` table,
plus a **widening** alteration of `addresses.country`'s enum whose
rollback is narrowing and therefore the one thing in this migration worth rehearsing
([quickstart.md](./quickstart.md)).

**External services**: Resend, in two roles that cannot reach each other — the Payload email adapter
for transactional mail, and Audiences for marketing consent state. That separation is what makes
FR-035 structural rather than a conditional somebody has to remember (R2).

**Testing**: Vitest units for the pure logic — the code lifecycle's four terminal states, password
strength, the country list, the default-address invariant. Integration tests against a real database
for access control, weighted toward the **negative** cases (customer B reading customer A's address;
anonymous reads of `verification-codes`; a customer session against the admin panel). Playwright for
the seven journeys, with the mail transport stubbed so CI needs no API key. Stories for both new kit
components, swept by the existing a11y and story suites.

**Target Platform**: Modern evergreen browsers, mobile-first. Server-rendered. Client components are
the OTP group, the four modals, the marketing switch, and the password show/hide toggle — nothing
else.

**Project Type**: Web application — Next.js app with Payload mounted inside it.

**Performance Goals**: Every route under 200KB gzipped initial JS. The auth screens are forms on a
static shell and should be well under it. Session lookup is memoized per render pass with React
`cache`, so a page that reads the customer three times verifies once.

**Constraints**: WCAG 2.2 AA at 1920, 1024 and 390, including all four modals and the OTP group. No
horizontal scroll at 320px or 200% zoom. Tokens only. Reduced motion suppresses every transition.
Forms submit without JavaScript; the paste-a-whole-code behaviour is an enhancement on top, not a
prerequisite. **The design was drawn at 1920 only** — unlike spec 003, there are no tablet or mobile
frames, so the smaller widths are derived from the existing breakpoints rather than transcribed.

**Scale/Scope**: 7 user stories, 50 functional requirements. 1 new collection, 1 collection
reconfigured, 1 collection extended, 1 new global, 1 migration. 6 new routes. 2 new kit primitives,
~7 feature components, ~12 server actions, 1 proxy, 1 scheduled task.

## Constitution Check

_GATE: evaluated before Phase 0 and re-evaluated after Phase 1 design._

| Principle | Gate | Pre | Post | Notes |
| --- | --- | --- | --- | --- |
| **I. Payload Is the Single Source of Truth** | No hardcoded user-visible content; generated types canonical; Local API | ✅ Pass | ⚠️ Deviation, accepted | Shop content stays in Payload, and so does the feature's *configuration* — the `account-settings` global (R11). Auth and profile **copy** does not: it is written in the components that render it. These screens are functional UI, and three of their strings — `signInFailed`, `forgotSent`, the resend prompt — carry a security property that depends on them *not* being edited. The design's untranslated Russian, its `Fargot password?` typo and its `Security`/`safety` drift are still resolved in the constants, so the defects never enter the codebase. |
| **II. Reuse Before Creation** | No duplicate components; new dependency justified | ✅ Pass | ✅ Pass | The audit (R12) found most of the design already built — `TextInput` even carries a `trailing` prop documented for this exact "Forgot password?" link. Two genuinely new primitives, both entering the kit. **The addresses collection is reused, not rewritten** (R5). One dependency, justified in R1. |
| **III. Design Tokens Over Magic Values** | Tokens only; full state set | ✅ Pass | ✅ Pass | No new tokens expected. `OtpInput` and `Modal` ship default, hover, focus-visible, active, disabled and error. The design's two OTP box sizes collapse to one (FR-048). |
| **IV. Content Modeling & Schema Evolution** | Modelled before implementation; explicit access; labels; migration with rollback | ✅ Pass | ✅ Pass | [data-model.md](./data-model.md) is the record. `verification-codes` states its access as "nobody" deliberately. **R7 closes a live omission**: the plugin's addresses `create` currently falls through to a default because `isAuthenticated` was never passed. |
| **V. Performance, Accessibility & SEO Budgets** | CWV, WCAG 2.2 AA, SSR, canonical | ✅ Pass | ✅ Pass | FR-042–FR-046. Auth routes are `noindex` — a sign-in page in search results is not a feature. Modal focus management is the existing `useOverlay`, already proven by three consumers. |
| **VI. Commerce Correctness & Data Protection** | Access control; no secrets in bundles; retention and erasure | ✅ Pass | ✅ Pass | Owner-scoped access on customers and addresses, enforced at the collection. Codes stored hashed, never logged. Passwords memory-hard via Payload. Retention stated for both new collections. `RESEND_API_KEY` is server-only and rotatable. Customers remain structurally incapable of reaching the admin panel. |

**Gate result: PASS.** No principle deviation. Two scope boundaries are recorded in Complexity
Tracking — they are deferred work with reasons, not violations.

## Project Structure

### Documentation (this feature)

```text
specs/004-customer-accounts/
├── spec.md
├── plan.md                       # this file
├── research.md                   # Phase 0 — fifteen decisions, each verified against the packages
├── data-model.md                 # Phase 1 — collections, fields, access, migration
├── quickstart.md                 # Phase 1 — how to run it and how to prove it
├── contracts/
│   ├── auth-actions.md           # Phase 1 — server actions, the DAL, code lifecycle, email
│   └── ui-kit-additions.md       # Phase 1 — Modal and OtpInput
├── checklists/requirements.md
└── tasks.md                      # Phase 2 — /speckit-tasks, not created here
```

### Source Code (repository root)

```text
migrations/
└── 2026XXXX_customer_accounts.ts        # NEW — generated, committed, tested down

src/
├── proxy.ts                             # NEW — Next 16's rename of middleware (R9)
├── env.ts                               # RESEND_API_KEY, EMAIL_FROM_ADDRESS added to REQUIRED
├── payload.config.ts                    # email adapter; addresses configured; isAuthenticated passed
├── collections/
│   ├── customers.ts                     # EXTENDED — auth config, public create, five fields, hooks
│   └── verification-codes.ts            # NEW — the only genuinely new collection
├── globals/
│   ├── shop.ts                          # unchanged
│   └── account-settings.ts              # NEW — how accounts BEHAVE, not what they say (R11)
├── fields/
│   └── address-fields.ts                # NEW — apartment + isDefault, passed to the plugin
├── lib/
│   ├── access.ts                        # isAuthenticated added (R7)
│   ├── countries.ts                      # NEW — ISO codes; names from Intl.DisplayNames (R6)
│   ├── auth/
│   │   ├── dal.ts                       # NEW — getCustomer / requireCustomer, React cache
│   │   ├── actions.ts                   # NEW — the server actions
│   │   ├── codes.ts                     # NEW — issueCode / consumeCode, four terminal states
│   │   ├── password.ts                  # NEW — the strength rule, pure and unit-tested
│   │   └── config.ts                    # NEW — expiry, cooldown, attempt limits (R14)
│   └── email/
│       ├── transactional.ts             # NEW — codes and notices; no access to consent (R2)
│       └── marketing.ts                 # NEW — Resend audience sync; cannot send
├── jobs/
│   └── purge-unverified.ts              # NEW — scheduled task (R15, FR-041)
├── components/
│   ├── ui/
│   │   ├── modal/                       # NEW kit primitive, on the existing useOverlay
│   │   ├── otp-input/                   # NEW kit primitive, paste handled at the group
│   │   └── index.ts                     # both exported from the single entry point
│   └── account/                         # NEW — feature components, one consumer each
│       ├── auth-card/
│       ├── profile-row/
│       ├── address-list/
│       ├── marketing-toggle/
│       ├── name-modal/
│       ├── address-modal/
│       └── change-password-modal/
└── app/(frontend)/
    ├── (account)/
    │   ├── sign-in/page.tsx             # NEW
    │   ├── create-account/page.tsx      # NEW
    │   ├── verify-email/page.tsx        # NEW
    │   ├── forgot-password/page.tsx     # NEW
    │   └── reset-password/page.tsx      # NEW
    └── account/page.tsx                 # NEW — the profile

tests/
├── unit/         # codes, password strength, countries, default-address invariant
├── integration/  # access control, weighted to the negative cases
├── e2e/          # the seven journeys, mail transport stubbed
└── a11y/         # new routes and all four modals
```

**Structure Decision**: The existing structure, extended. Routes join `src/app/(frontend)/` under a
new `(account)` group for the five anonymous screens; the profile is `/account` outside that group
because it is the one authenticated route and the proxy matches on it. Kit additions go to
`src/components/ui/`; single-consumer components to `src/components/account/`. All paths kebab-case,
enforced by `pnpm check:naming` rather than by review.

## Phase sequencing

The order matters, because three of the four surprises are upstream of the screens.

1. **Configuration and schema** — email adapter, auth config, `isAuthenticated`, address fields,
   country list, `verification-codes`, the `account-settings` global, migrations, regenerated types.
2. **The server tier** — `codes.ts`, `password.ts`, the two email modules, the DAL, `proxy.ts`.
   Unit-testable without a single screen, and where the security-critical logic lives.
3. **The kit** — `Modal` and `OtpInput` with their stories. Both are consumed by everything after.
4. **Registration and verification (US1)** and **sign-in/out (US2)** — the two P1 stories. At the end
   of this step the feature is independently demonstrable.
5. **Reset (US3)**, then **profile and name (US4)**, **addresses (US5)**.
6. **Marketing preference (US6)** and **change password (US7)**.
7. The scheduled purge, the a11y sweep, and the editorial verification pass in the admin.

Steps 4–6 are the spec's priority order, so stopping after any of them leaves something coherent.

## Complexity Tracking

No constitutional violation to justify. Two deferrals are recorded here so they are decisions with
reasons rather than gaps someone finds later.

| Deferred | Why now | Consequence until closed |
| --- | --- | --- |
| **Inbound Resend webhook for unsubscribes** (R2) | Needs a signed-webhook endpoint and a replay story of its own, and no marketing campaign exists to send yet. The one-way Payload → Resend sync ships. | An unsubscribe performed from the email client's List-Unsubscribe header is honoured by Resend but not reflected on the profile page. The profile can therefore show marketing as on when Resend will not send. |
| **No-JS submission on the account forms** (R16) | Adopting `react-hook-form` means the form submits through `handleSubmit`, not through a server action bound to `<form action>`. Spec 003 holds the opposite line for catalogue filtering (FR-029) and it stays true there. | The account forms need JavaScript. Half this flow already did — `OtpInput` is a JS control, and the design's paste-the-code journey has no non-JS equivalent — and every account route is `noindex`, so no crawler is affected. Spec 004 states no no-JS requirement. Reversible: the actions still take plain values and would bind to a `<form action>` unchanged. |
| **Per-origin (IP) rate limiting** (R8) | Doing it properly needs a shared counter store, which R4 declined to add for better reasons. Belongs at the reverse proxy in front of the deployment. | Per-address throttling — the axis that actually defends against code brute-forcing and address enumeration — is enforced in the database. Per-origin limits are an operational configuration, not application code, and FR-014's mention of them is met at the edge. |

Both are cheap to add later and neither is load-bearing for any acceptance scenario.
