# Phase 0 — Research: Customer Accounts

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-09-01

Fifteen decisions. Four of them change the shape of the work rather than confirm it, and they are
R3 (codes are aliases for Payload's own tokens), R5 (the addresses collection already exists), R6
(the plugin's country list excludes this shop's own market), and R9 (Next 16 renamed Middleware).

Every claim below was verified against the installed packages, not recalled. Paths are given so the
next reader can check them.

---

## R1 — Email transport: `@payloadcms/email-resend`

**Decision**: Add `@payloadcms/email-resend@3.88.0` and configure it as Payload's `email` adapter.
Transactional mail — verification codes, reset codes, password-change notices — is sent through
`payload.sendEmail()` and Payload's own auth templates.

**Rationale**: The version matches the installed `payload@3.88.0` exactly, as every other
`@payloadcms/*` package in `package.json` does. It is first-party, so it is covered by the same
release train rather than becoming an independent upgrade risk. Resend handles SPF/DKIM domain
authentication, which is the part of "email delivery" that actually decides whether a verification
code reaches an inbox — and a verification code that lands in spam is a customer who cannot
register.

**Alternatives considered**:

- `@payloadcms/email-nodemailer@3.88.0` (also published at the matching version) — rejected because
  it only moves the problem: we would still have to choose an SMTP provider and own the
  deliverability story, with more configuration and no benefit.
- Calling the Resend HTTP API directly from our own code — rejected because Payload's auth
  operations send mail through the configured adapter. Without an adapter, `forgotPassword` and
  `verify` cannot send at all, and we would be reimplementing the send path Payload already owns.

**Consequences**: two new environment variables (R14). One new runtime dependency, justified here
against Principle II. The dependency is server-only and never reaches a client bundle.

---

## R2 — Marketing mail is a different mechanism from transactional mail

**Decision**: Transactional mail goes through the Payload email adapter (R1). **Marketing** mail
goes through Resend **Audiences and Broadcasts**: Payload holds the source of truth for consent, and
a change to `marketingEmail` syncs the customer's Resend contact to `unsubscribed: true|false`.
Marketing campaigns are composed and sent from Resend against that audience; this application never
sends a marketing message itself.

**Rationale**: FR-035 requires that turning marketing off never suppresses a verification code. If
both kinds of mail went through one send path, that guarantee would be a conditional somebody has to
remember to write — and the first time it is forgotten, a customer who unsubscribed cannot reset
their password. Two mechanisms make the separation structural instead: the transactional path has no
access to the consent flag, and the marketing path has no ability to send to an unsubscribed contact.
This is the same reasoning that put `admins` and `customers` in separate collections.

**Alternatives considered**:

- One send path with a consent check per message — rejected above.
- Storing consent only in Resend — rejected: consent is customer data and Constitution VI puts
  customer data under Payload's access control, not a third party's.

**Scope boundary, stated deliberately**: this feature ships the **one-way** sync, Payload → Resend,
on every consent change and on verification. It does **not** ship the inbound webhook that would
catch an unsubscribe performed from the email client's own List-Unsubscribe header. That gap is real
and is recorded in [plan.md](./plan.md) Complexity Tracking rather than hidden: until it is closed,
an unsubscribe made in Gmail is honoured by Resend but not reflected on the profile page. It is
deferred because it needs a signed-webhook endpoint and a replay story of its own, and no marketing
campaign exists to send yet.

---

## R3 — The six-digit code is an alias for Payload's own token, not a second credential

**Decision**: Keep Payload's built-in email-verification and forgot-password machinery, and
intercept the point where it would send a link.

- `customers.auth.verify.generateEmailHTML({ token, user })` — mint a six-digit code, store it bound
  to `token`, and return an email containing the **code**.
- `customers.auth.forgotPassword.generateEmailHTML({ token, user })` — the same, for reset.
- On a correct code, look the token up and call `payload.verifyEmail({ collection, token })` or
  `payload.resetPassword({ collection, data: { token, password }, overrideAccess: true })`.

**Rationale**: The brief and the design both require a code rather than a link
([spec.md](./spec.md) FR-018). The naive reading — build our own credential — means reimplementing
token generation, comparison, expiry and the `_verified` state transition, which is exactly the
security-critical code worth not writing twice. This design leaves Payload owning the cryptography
and the account state machine, and gives us only the code→token indirection and the code's own
expiry and attempt policy. The code is a delivery format, not a secret of its own standing.

**Verified**, so this is not an assumption:

| Claim | Where |
| --- | --- |
| `verify?: { generateEmailHTML?, generateEmailSubject? } \| boolean` | `node_modules/payload/dist/auth/types.d.ts:250-256` |
| `forgotPassword?: { expiration?, generateEmailHTML?, generateEmailSubject? }` | same file, `:200-208` |
| `forgotPassword` returns the token as a `string`; `disableEmail` suppresses the send | `dist/auth/operations/forgotPassword.d.ts` — `export type Result = string` |
| `payload.verifyEmail({ collection, token })` exists in the Local API | `dist/auth/operations/local/verifyEmail.d.ts` |
| `payload.resetPassword({ collection, data: { password, token }, overrideAccess })` exists | `dist/auth/operations/local/resetPassword.d.ts` |
| Login throws `UnverifiedEmail` when `auth.verify` is on and `_verified === false` | `dist/auth/operations/login.js:184` |

That last row is what makes spec US2 scenario 3 buildable: an unverified customer signing in
produces a distinguishable error, so the flow can route them to the verification step rather than
showing a generic failure.

**Alternatives considered**:

- A custom Payload auth strategy with our own tokens — rejected: reimplements the state machine.
- Reading the hidden `_verificationToken` field back out of the database after create — works, but
  couples us to a hidden field name and costs a second read, where `generateEmailHTML` is handed the
  token directly.

**Note on `generateEmailHTML` having a side effect**: minting and storing a code inside what looks
like a template function is the one inelegant part of this decision. It is accepted because it is
the only hook Payload gives that receives the token at send time, and it is documented at the call
site so the next reader does not mistake it for a pure template.

---

## R4 — Codes live in a Payload collection, not a new datastore

**Decision**: A `verification-codes` collection, hidden from the admin navigation, holding a
**hashed** code, its purpose, the Payload token it aliases, the email it was issued for, an expiry,
an attempt count, and a consumed marker.

**Rationale**: Constitution's complexity gate asks for a new datastore to be justified against a
simpler alternative, and there is not much to justify here — this is a handful of short-lived rows
in a database the application already has. Storing them in Postgres also means expiry and
single-use are enforced by the same query that reads the row, and that a redeploy does not forget
every code in flight.

**Alternatives considered**: Redis with a native TTL — rejected as a whole new service, a new
failure mode, and a new thing to run in three environments, for a table this small.

**The code is hashed, not stored in clear.** FR-038 keeps codes out of logs; storing them
recoverably in a table anyone with database access can read would make that guarantee
half-hearted. The comparison is against the hash.

---

## R5 — The `addresses` collection already exists. This feature configures it

**Decision**: Do not create an addresses collection. Configure the one the e-commerce plugin already
generates, through `addresses: { addressFields, supportedCountries }`.

**Rationale**: `addresses: false` is currently set in `src/payload.config.ts` with a comment noting
it is ignored. That comment is correct, and the consequence is larger than the comment claims — the
collection is not merely created, it is **already modelled, already access-controlled, and already
migrated**:

- `sanitizePluginConfig` rewrites any non-`true` value into `{ addressFields: defaultAddressFields() }`
  (`node_modules/@payloadcms/plugin-ecommerce/dist/utilities/sanitizePluginConfig.js`).
- `createAddressesCollection` gives it a `customer` relationship, `read`/`update`/`delete` composed
  as admin-or-owner, a `beforeChange` hook that assigns ownership, and `country` promoted from text
  to a `select` over `supportedCountries`
  (`dist/collections/addresses/createAddressesCollection.js`).
- The generated `Address` interface is already in `src/payload-types.ts:452`, and the table is
  already in the committed migrations.

Writing our own would be the duplicate-component violation Principle II names as the most expensive
one, in the collection tier rather than the component tier.

**What this feature adds** to `addressFields`: an `apartment` text field and an `isDefault`
checkbox. Neither exists in `defaultAddressFields()` (verified — the defaults are `title`,
`firstName`, `lastName`, `company`, `addressLine1`, `addressLine2`, `city`, `state`, `postalCode`,
`country`, `phone`).

**What this feature leaves alone**: `title`, `company`, `state`, `phone`, `firstName`, `lastName`.
The design draws none of them. They stay in the schema — removing populated plugin fields would need
a migration to fight a collection we do not own — and are simply not surfaced. This is recorded so a
later reader does not read their absence from the form as an oversight.

---

## R6 — The plugin's country list excludes this shop's own market

**Decision**: Override `supportedCountries` with the full ISO 3166-1 alpha-2 list, rendered through
`Intl.DisplayNames` so the labels are localized by the request's locale rather than hardcoded in
English.

**Rationale**: This is a genuine defect, not a preference. `defaultCountries` has exactly 40 entries
and contains **neither Kazakhstan nor the United Arab Emirates**
(`dist/collections/addresses/defaultCountries.js`, verified by enumerating the values). The shop's
own address in the footer is in Dubai, and the sample address drawn in the profile design is
`Kazakhstan, Astana, Mangilik el 22`. Shipping the default list would make the design's own example
address unsaveable.

**No new dependency.** The country **codes** are a fixed standard, so a static array in
`src/lib/countries.ts` is data, not the hardcoded user-visible content Principle I forbids — and the
**names**, which are user-visible, come from `Intl.DisplayNames`, which is in the runtime and is
already localized into every language the site might add. A country-list package would ship a second
copy of the names in one language.

**The design's `United Kingdom` default is placeholder content.** The actual default comes from the
Account global (R11), so the owner can point it at the market they actually sell into.

---

## R7 — `isAuthenticated` is missing from the plugin access object

**Decision**: Add `isAuthenticated` to `src/lib/access.ts` and pass it in the plugin's `access`
block.

**Rationale**: `createAddressesCollection` sets `create: access.isAuthenticated`, and the config in
`src/payload.config.ts` passes six access functions, none of them `isAuthenticated` — the key is
optional in the plugin's types (`dist/types/index.d.ts:644`), so it is silently `undefined` today
and `create` falls through to Payload's default. Constitution IV forbids exactly this: a collection
relying on the default must say so deliberately, not by omission. The feature that starts writing
addresses is the feature that should close it.

---

## R8 — Rate limiting: Payload's lockout for passwords, our own counter for codes

**Decision**:

- **Sign-in** (FR-014): `auth.maxLoginAttempts` and `auth.lockTime` on the customers collection.
  Payload increments the counter, locks the account, and throws `LockedAuth` — verified present at
  `dist/auth/types.d.ts:210-222` and `dist/errors/LockedAuth.js`. Ten attempts, fifteen minutes.
- **Code entry** (FR-005, FR-019): an `attempts` counter on the code row. Five wrong entries burn
  the code, and the customer is told to request a new one.
- **Code requests** (FR-006): a per-address cooldown enforced by reading the most recent code row
  for that address before issuing another. Sixty seconds between sends, ten per address per hour.

**Rationale**: Every one of these is keyed on the **email address** and stored in the database,
which is the axis that matters for both threats this feature has — brute-forcing one account's code,
and enumerating which addresses are registered. It also works across instances without shared
memory, which an in-process counter would not.

**Stated honestly**: per-origin (IP) throttling is **not** implemented in application code. Doing it
properly needs a shared counter store, which R4 already declined to add for better reasons. It
belongs at the reverse proxy in front of the deployment, and this is recorded in
[plan.md](./plan.md) Complexity Tracking so it is a decision rather than an oversight. The spec's
FR-014 mention of per-origin limits is satisfied at the edge, not here.

---

## R9 — Next 16 renamed Middleware to Proxy; session checks belong in a data access layer

**Decision**: Route protection is two layers.

1. `src/proxy.ts` — an optimistic redirect for `/account*` based only on the presence of Payload's
   session cookie. No database read.
2. `src/lib/auth/dal.ts` — `verifySession()` and `getCustomer()`, wrapped in React's `cache`,
   calling `payload.auth({ headers })`. This is the real check, and every Server Action re-runs it.

**Rationale**: `AGENTS.md` is right that this is not the Next.js in the training data. Two findings
from `node_modules/next/dist/docs/`:

- **`middleware.ts` is now `proxy.ts`.** "Starting with Next.js 16, Middleware is now called Proxy"
  (`01-app/01-getting-started/16-proxy.md`). A file named `middleware.ts` would simply not run.
- **A layout is the wrong place for an auth check.** "A layout also does not control whether the
  rest of the route renders … you should do the checks close to your data source"
  (`01-app/02-guides/authentication.md`). Layouts do not re-render on navigation under partial
  rendering, so an account layout that checks the session once would keep letting a signed-out
  visitor through on client-side transitions.

The same guide is explicit that Proxy "should not be used as a full session management or
authorization solution" and that its checks must stay optimistic because it runs on prefetches too.
Hence the split: the proxy saves an anonymous visitor from rendering a shell they cannot use; the
DAL is what actually decides.

**Also carried from that guide**: "Always verify authentication and authorization inside each Server
Action, even if the form is only rendered on an authenticated page"
(`01-app/02-guides/forms.md`). Every mutating action in this feature starts with `verifySession()`.

---

## R10 — Forms are Server Actions with `useActionState`

**Decision**: Every form in this feature — sign in, create account, verify, forgot, reset, and the
four profile modals — is a `<form action={...}>` bound to a Server Action, with `useActionState` for
the pending and error states.

**Rationale**: It is the pattern the bundled forms guide documents for this version, it keeps
validation server-side where FR-002/FR-003 need it to be authoritative, and it means the forms
submit without JavaScript. The client components stay small: the OTP group, the password show/hide
toggle, the modals, and the marketing switch.

**Session persistence**: `auth.tokenExpiration` is set to 30 days (FR-012). Payload's default is
7200 seconds, which would sign a customer out roughly every two hours and fail the spec outright.

---

## R11 — Account copy comes from a new `Account` global

**Decision**: A new `Account` global holds every customer-visible string in this feature — the
headings and helper text on all nine auth screens, the profile row labels, the modal titles, the
email subjects and bodies, and the default country for the address form.

**Rationale**: Principle I. Hardcoding "Please fill in the information below:" in a component makes
changing it a deployment. A new global rather than more fields on `Shop` because `Shop` is labelled
"Shop settings" and models product-page copy — a different editor concern, and Constitution's
structure rule asks for one concern per file.

**This is also where the design's defects get fixed** (FR-047, FR-049). The untranslated Russian
strings, the `Fargot password?` typo, and the `Security` / `safety` drift are not reproduced in
component code and then corrected later; they never enter the codebase, because the strings are
editor-owned defaults and the defaults are the corrected English.

---

## R12 — `Modal` is a new kit primitive on the existing `useOverlay`

**Decision**: Build `Modal` in `src/components/ui/modal/`, on top of the existing `useOverlay` hook.

**Rationale**: This feature alone has four modals — Full name, Add address, Change password, and the
newsletter confirmation. Principle II promotes a component to the kit at its **second** consumer, so
four settles it. `useOverlay` already implements focus trap, initial and restored focus, Escape,
scroll lock and inert backgrounds (`src/components/ui/overlay/use-overlay.ts`), which is the
entirety of the hard part; `Drawer`, `Lightbox` and `MobileNav` are already built on it. `Modal` is
the centred-panel presentation of the same behaviour and should not reimplement any of it.

**Reuse audit for the rest of the design** — most of it is already built:

| Needed | Status |
| --- | --- |
| Email / password fields | `TextInput` — and it already has a `trailing` prop whose doc comment says "the design puts a 'Forgot password?' link here" |
| Password show/hide | `TextInput` `iconEnd` + the existing `eye` / `eye-off` icons |
| Country dropdown | `Select` |
| Default-address checkbox | `Checkbox` |
| Marketing toggle | `Switch` |
| Buttons, close control | `Button`, `IconButton` |
| Modal shell | **New** (this decision) |
| Six-digit code input | **New** (R13) |
| Profile row, auth form shell | **New** — feature components, single consumer each |

---

## R13 — The OTP input: six boxes, one paste

**Decision**: A kit component, `OtpInput`. Six `<input>` elements, one per digit, with:

- **Paste anywhere in the group distributes the whole code.** A `paste` handler on the group reads
  the clipboard text, strips non-digits, and fills every box from the first — so Ctrl+V (or ⌘V) into
  any box completes the code, which is what was asked for.
- `autocomplete="one-time-code"` on the **first** box only, plus `inputmode="numeric"` and
  `pattern="[0-9]*"`, so iOS and Android offer the emailed code above the keyboard and the
  autofilled value flows through the same distribute path as a paste.
- Backspace in an empty box moves focus back and clears the previous one; arrow keys move without
  editing; typing over a filled box replaces it.
- The whole group is one labelled control to a screen reader, with the invalid-code message wired as
  its description so it is announced rather than merely drawn (FR-046).

**Rationale**: Six separate inputs is what the design draws and what customers expect, but it is
also the arrangement that breaks paste and autofill in most hand-rolled implementations — which is
precisely the failure the request calls out. Handling paste at the **group** rather than per box is
what makes "paste into any box" work; per-box handlers give the second box a one-character code.

**One control, not two** (FR-048): the design draws 60px boxes for registration and 56px for reset.
That is a drafting artefact; the component ships one size.

**Deliberately out of scope**: the WebOTP API (`navigator.credentials.get({ otp })`), which reads
codes from SMS. There is no SMS in this feature.

---

## R14 — Environment and configuration

**Decision**: Two new required environment variables, added to `REQUIRED` in `src/env.ts` so a
missing one fails startup by name rather than at first send:

| Variable | Purpose |
| --- | --- |
| `RESEND_API_KEY` | Resend authentication. Secret; rotatable without a code change. |
| `EMAIL_FROM_ADDRESS` | The verified sending identity, e.g. `no-reply@aurum.example`. |

`.env.example` gains both with comments, as every existing variable has.

**Rationale**: `src/env.ts` already exists and already implements exactly this pattern with a
comment explaining why. Following it is free; inventing a second configuration path is not.

**Timing constants** — code expiry, resend cooldown, attempt limits, unverified-account purge age —
are **configuration, not literals in code**, because [spec.md](./spec.md) states them as testable
values that operations may need to change. They live in one module with named exports and
documented defaults: 10 minutes, 60 seconds, 5 attempts, 7 days.

---

## R15 — Purging unverified accounts uses Payload's job queue

**Decision**: FR-041's purge and the expired-code cleanup run as a scheduled Payload task.

**Rationale**: Payload 3.88 ships a job queue with `schedule` on a task and an `autoRun` cron
configuration (`node_modules/payload/dist/queues/config/types/index.d.ts:17, 127`). It is already in
the framework, runs against the same database, and needs no new service — which is the cheapest
correct answer to a requirement that is otherwise an invitation to add a cron container.

**Alternative considered**: an authenticated HTTP endpoint called by an external scheduler —
rejected as a second thing to configure per environment and a new authenticated surface, for a job
that has no reason to be reachable from outside.

---

## Resolved unknowns

Every "NEEDS CLARIFICATION" the Technical Context would otherwise carry is closed above.

| Unknown | Closed by |
| --- | --- |
| Email transport | R1 |
| Marketing send mechanism and its isolation from transactional | R2 |
| Code-based verification on a link-based auth system | R3 |
| Where codes are stored | R4 |
| Whether addresses are new | R5 |
| Country list | R6 |
| Address `create` access | R7 |
| Rate limiting and lockout | R8 |
| Route protection under Next 16 | R9 |
| Form and session mechanics | R10 |
| Where copy lives | R11 |
| Modal, and the rest of the reuse audit | R12 |
| OTP paste behaviour | R13 |
| New configuration | R14 |
| Scheduled purge | R15 |
