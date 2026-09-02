# Tasks: Customer Accounts — Authentication and Profile

**Input**: [spec.md](./spec.md), [plan.md](./plan.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/auth-actions.md](./contracts/auth-actions.md),
[contracts/ui-kit-additions.md](./contracts/ui-kit-additions.md)

**Design source**: Figma sections `255:3352` ("Авторзиация", nine auth frames) and `266:4382` ("ЛК",
the profile and its four modals). Every UI task cites the node it implements. Pull it with
`get_design_context` **when you start that task**, not before — the reference code is large and goes
stale against decisions the earlier tasks have not made yet.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel — different files, no dependency on incomplete work
- **[Story]**: US1–US7, mapping to the spec's user stories

## Path Conventions

Payload config, collections, globals and shared field configs under `src/payload.config.ts`,
`src/collections/`, `src/globals/`, `src/fields/`. Server logic under `src/lib/auth/` and
`src/lib/email/`. Kit under `src/components/ui/`; feature components under `src/components/account/`;
routes under `src/app/(frontend)/`. Every path kebab-case — `pnpm check:naming` is a blocking gate,
not a review note.

Every new component lands **with its stories in the same change**, and every new story title is added
to `tests/a11y/ui-kit.spec.ts` in the same change — the rule specs 002 and 003 established, and the
only thing that keeps the accessibility sweep honest as the surface grows.

---

## Carried decisions and open items

Read before starting.

| Item | State | Affects |
| --- | --- | --- |
| **The six-digit code is an alias for Payload's own token**, not a second credential | Decided in research R3. `verify.generateEmailHTML` and `forgotPassword.generateEmailHTML` are the interception points | T414, T430, T431 |
| **`addresses` already exists** — generated, access-controlled and migrated by the plugin | Decided in R5. This spec **configures** it; writing a new one is a Principle II violation | T412, T413 |
| Hooks on `addresses` go through **`addressesCollectionOverride`**; fields through `addressFields` | Verified at `dist/types/index.d.ts:449`. The plugin's own comment prefers `addressFields` for fields because they propagate to Orders and Transactions | T412, T413, T521 |
| **The plugin's 40-country list has neither Kazakhstan nor the UAE** | The shop's address is in Dubai and the design's sample address is in Astana. `supportedCountries` is replaced (R6) | T411, T413 |
| **`middleware.ts` does not exist in Next 16** — it is `proxy.ts` | Verified in `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`. A file named `middleware.ts` silently never runs | T441 |
| **A layout is the wrong place for an auth check** | Layouts do not re-render on client-side navigation. Authorization lives in the DAL, next to the data (R9) | T440, T442 |
| `access.isAuthenticated` is **not** passed today, so addresses' `create` falls through to a default | Live omission. Constitution IV forbids access by omission (R7) | T410 |
| **One migration**, covering all schema — customers, addresses, verification-codes, the global | Constitution IV. Generate once, after every schema task | T421 |
| The `down` **narrows** `addresses.country`'s enum | Rehearse it with a Kazakhstan address saved. This is the rollback that fails at 2am otherwise | T421, T575 |
| Marketing consent is **opt-in, off by default**, with a control the design does not draw | The spec's one resolved clarification (FR-036, FR-036a) | T417, T452 |
| Transactional and marketing mail are **different mechanisms** and cannot reach each other | R2. This is what makes FR-035 structural rather than a conditional | T430, T431, T537 |
| `src/lib/ecommerce-schema.ts` says "delete this when spec 004 enables orders and transactions" | **That is not this spec.** Orders belong to requests-and-handoff. Leave the workaround in place | — |
| Untranslated Russian, `Fargot password?`, `Security`/`safety` drift | Design defects. Fixed in the copy constants, never entered into code as drawn (FR-047, FR-049) | T419 |
| Two OTP box sizes drawn (60px, 56px) | A drafting artefact. One component, one size (FR-048) | T444 |
| Per-origin rate limiting | **Deferred to the reverse proxy**, recorded in plan Complexity Tracking. Per-address throttling is in the database | T432 |
| Inbound Resend unsubscribe webhook | **Deferred**, recorded in plan Complexity Tracking | T431 |
| The design was drawn at **1920 only** | No tablet or mobile frames. Smaller widths derive from existing breakpoints (FR-042) | every UI task |

---

## Phase 1: Setup — email actually has to send

**Purpose**: Get the transport working before anything depends on it. A verification code that never
arrives blocks every story in this feature.

- [X] T400 Install `@payloadcms/email-resend@3.88.0` — exact version, not a range. Every
      `@payloadcms/*` package in this repo upgrades as a set against `payload@3.88.0` (research R1)
- [X] T401 [P] Add `RESEND_API_KEY` and `EMAIL_FROM_ADDRESS` to the `REQUIRED` tuple in `src/env.ts`,
      so a missing one fails startup naming it rather than at the first send
- [X] T402 [P] Document both variables in `.env.example` with the same comment style as the existing
      entries, including the `onboarding@resend.dev` note for local development
- [X] T403 Configure `resendAdapter` as `email` in `src/payload.config.ts`, reading from `env`
- [X] T404 [P] Create `src/lib/auth/config.ts` — code expiry (10 min), resend cooldown (60 s), code
      attempt limit (5), login attempt limit (10), lockout (15 min), unverified purge age (7 days).
      Named exports with documented defaults; these are configuration, not literals scattered in code
      (R14)
- [X] T405 Prove the transport: trigger one send and confirm it arrives. Do this **before** T430 —
      debugging a template is a different problem from debugging a domain that is not verified

**Checkpoint**: mail leaves the application and arrives in an inbox.

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: No user story work can begin until this phase is complete. It contains all schema
(one migration), the whole server tier, and both new kit primitives.

### Schema

- [X] T410 Add `isAuthenticated` to `src/lib/access.ts` and pass it in the plugin's `access` block in
      `src/payload.config.ts`. Closes the live omission from R7 — the plugin's addresses collection
      sets `create: access.isAuthenticated` and we have never passed it
- [X] T411 [P] Create `src/lib/countries.ts` — the ISO 3166-1 alpha-2 code list, with labels from
      `Intl.DisplayNames` rather than a hardcoded English list. No new dependency (R6)
- [X] T412 [P] Create `src/fields/address-fields.ts` — an `addressFields` override adding `apartment`
      (optional) and `isDefault`, and marking `addressLine1`, `city` and `postalCode` required.
      `apartment` stays **optional** despite the design's error frame flagging it red (FR-030)
- [X] T413 Configure `addresses` in `src/payload.config.ts`: `addressFields` from T412,
      `supportedCountries` from T411, and an `addressesCollectionOverride` carrying the
      default-address hooks (T521 fills the hooks; wire the seam here). Replaces the current
      `addresses: false`, which never disabled anything
- [X] T414 Create `src/collections/verification-codes.ts` — the only genuinely new collection.
      `email` (indexed), `customer`, `purpose`, `codeHash`, `token`, `expiresAt`, `attempts`,
      `consumedAt`, `supersededAt`. **Every access function returns `false`** and
      `admin.hidden: true`: it holds live credentials and nothing reaches it through any API
      ([data-model.md](./data-model.md))
- [X] T415 Extend `src/collections/customers.ts` auth config — `verify`, `forgotPassword`,
      `maxLoginAttempts: 10`, `lockTime: 900_000`, `tokenExpiration: 2_592_000`. Payload's default
      token expiry of 7200s would sign customers out every two hours and fail FR-012 outright
- [X] T416 In `src/collections/customers.ts`, change `access.create` from `isAdmin` to `publicAccess` and update the
      collection's doc comment — it currently says registration is "deliberately absent … those are
      the customer accounts spec". This is that spec; the comment should say so
- [X] T417 [P] Add customer fields in `src/collections/customers.ts` — `firstName`, `lastName`, `marketingEmail` (defaults **false**,
      FR-036), `marketingEmailUpdatedAt`, `marketingEmailSource`. The last two are
      `update: () => false` for everyone: consent evidence a customer can set from a form post is
      evidence of nothing
- [X] T418 Add the `beforeChange` hook in `src/collections/customers.ts` — recompose the existing `name` from
      `firstName`/`lastName` so `useAsTitle` and `defaultColumns` keep working, and stamp
      `marketingEmailUpdatedAt`/`marketingEmailSource` only when `marketingEmail` actually changes
      value (FR-034)
- [X] T419 [P] Every customer-visible string is written in the component that renders it, and the
      three email bodies in `src/lib/email/transactional.ts`. **The strings are the corrected
      English**: the Russian strings translated, `Forgot password?` spelled correctly, and one label
      for the Security row (FR-047, FR-049). *Originally an `Account` global, then a shared
      `copy.ts`; both reversed — see R11.*
- [X] T420 Register `VerificationCodes` and the `AccountSettings` global in `src/payload.config.ts`.
      `account-settings` holds the configurable half — default country, countries offered, whether
      marketing consent is asked for — read through `resolveAccountSettings` (R11)
- [X] T421 Generate ONE migration covering T412–T420, run `pnpm generate:types`, and commit both in
      the same change. Then **test the `down` with a Kazakhstan address saved** — the rollback
      narrows `addresses.country`'s enum, and a row outside the plugin's 40 values is exactly what
      breaks it ([data-model.md](./data-model.md))
- [X] T422 Add `react-hook-form`, `zod` and `@hookform/resolvers`, and create
      `src/lib/auth/schemas.ts` — one schema per form, imported by both the browser and the action
      it posts to (R16). Actions take typed values and **re-parse**: the client check is a courtesy,
      not a boundary. Messages stay copy keys, so the tests keep asserting
      `toBe('createPasswordMismatch')`. Costs no-JS submission on these forms — see the plan's
      Complexity Tracking

### Server tier

- [X] T430 Create `src/lib/email/transactional.ts` — `sendVerificationCode`, `sendResetCode`,
      `sendPasswordChangedNotice`, rendering copy from `emailCopy`. **This module has no
      access to `marketingEmail`**, which is what makes FR-035 hold by construction (R2)
- [X] T431 [P] Create `src/lib/email/marketing.ts` — `syncMarketingContact` against the Resend
      audience. **It cannot send a message.** A failure is logged and swallowed: a consent change is
      recorded in Payload whether or not Resend was reachable
- [X] T432 Create `src/lib/auth/codes.ts` — `issueCode` and `consumeCode`. Six digits from a
      cryptographically secure source; only the hash stored; constant-time comparison; `purpose` part
      of every lookup; the per-address cooldown from R8. **All four terminal states — consumed,
      expired, attempts-exhausted, superseded — are checked in this one function** so no call site
      can forget one ([contracts/auth-actions.md](./contracts/auth-actions.md) C1–C7)
- [X] T433 [P] Create `src/lib/auth/password.ts` — the strength rule (≥8 characters, checked against
      a common-password list). Pure, and the highest-value unit test in the feature
- [X] T434 [P] Tests for all four terminal states, the attempt counter, and the purpose separation.
      **Landed in `tests/integration/auth-codes.test.ts`, not `tests/unit`**: the terminal states are
      database state — single-use is enforced by the write, not by arithmetic — so testing them
      against a fake would test the fake. `tests/unit` stays runnable with nothing installed
- [X] T435 [P] Unit tests in `tests/unit/auth-password.test.ts` and `tests/unit/countries.test.ts` —
      the latter asserting Kazakhstan and the UAE are present, which is the regression that would
      otherwise reappear silently on a plugin upgrade
- [X] T440 Create `src/lib/auth/dal.ts` — `getCustomer` and `requireCustomer`, memoized with React
      `cache`, reading Payload's session through `payload.auth({ headers })`. Returns a **DTO**
      (`id`, `email`, `firstName`, `lastName`, `marketingEmail`), never the Payload document. Returns
      `null` for an unverified customer — unverified is not signed in (FR-008)
- [X] T441 Create `src/proxy.ts` — **`proxy.ts`, not `middleware.ts`** (R9). Matches `/account/:path*`
      and redirects to `/sign-in?next=…` on cookie absence. **Cookie presence only, no database
      read**: it runs on prefetches. It is not the security boundary; the DAL is
- [X] T442 [P] Integration test in `tests/integration/account-access.test.ts` — the negative cases
      that matter: customer B reading customer A's row, any request to `verification-codes`, and a
      customer session against the admin panel (SC-007, SC-008)

### Kit

- [X] T443 Build `Modal` in `src/components/ui/modal/` on the **existing** `useOverlay` hook, which
      already implements the focus trap, initial and restored focus, Escape, scroll lock and inert
      backgrounds. Reimplement none of it. Full-bleed below the `md` breakpoint (FR-042). Ship with
      stories; add the story titles to `tests/a11y/ui-kit.spec.ts`
      ([contracts/ui-kit-additions.md](./contracts/ui-kit-additions.md) M1–M7)
- [X] T444 [P] Build `OtpInput` in `src/components/ui/otp-input/` — nodes `428:11924`, `429:12404`.
      **The paste handler is on the group, not per box**: ⌘V/Ctrl+V anywhere fills all six and fires
      `onComplete`. `autocomplete="one-time-code"` on the **first** box only. Backspace, arrows,
      Home/End; one tab stop out of the group. One size, not the two drawn (FR-048). Ship with
      stories (contract O1–O13)
- [X] T445 [P] Story-level behaviour tests in `tests/stories/ui-kit.spec.ts` for `OtpInput` — paste
      into box four fills all six; a `Your code is 482913` paste yields `482913`; backspace walks
      back. These are the behaviours that break silently
- [X] T446 Export `Modal` and `OtpInput` from `src/components/ui/index.ts`, the kit's single entry
      point
- [X] T447 [P] Build `AuthCard` in `src/components/account/auth-card/` — the centred 500px column
      every auth screen shares (heading, subheading, form slot, footer link), responsive rather than
      fixed to the drawn width

**Checkpoint**: schema migrated, server tier unit-tested, both primitives in the kit. User stories
can now begin — in parallel, if staffed.

---

## Phase 3: User Story 1 — Create an account and verify the email (P1) 🎯 MVP

**Goal**: A visitor registers, receives a six-digit code, verifies, and is signed in.

**Independent Test**: Register with a fresh address, read the code from the delivered mail, paste it,
and confirm a verified account exists and the visitor is signed in. No catalog, cart or profile
involvement.

- [X] T450 [P] [US1] Integration test in `tests/integration/us1-registration.test.ts` — registration
      creates an unverified account; a correct code verifies and signs in; expired, spent, superseded
      and wrong codes are each refused distinctly
- [X] T451 [US1] Wire `verify.generateEmailHTML` in `src/collections/customers.ts` — mint a code against Payload's token
      via `issueCode`, and return the **code** email rather than a link (R3). Document the side
      effect at the call site so the next reader does not mistake it for a pure template
- [X] T452 [US1] Implement `registerCustomer` in `src/lib/auth/actions.ts` — validates email shape,
      password strength and the confirmation match (FR-002, FR-003); creates the customer with
      `marketingEmail` from the **unticked-by-default** consent box. **An already-registered address
      returns the same success and creates no second account** (FR-009), re-sending a code if that
      account is still unverified
- [X] T453 [US1] Implement `verifyEmailCode` in `src/lib/auth/actions.ts` — `consumeCode`, then
      `payload.verifyEmail({ collection: 'customers', token })`, then sign in (FR-007). Each failure
      reason gets its own message key: "invalid code" when the real problem is an expired one is how
      a customer gets stuck
- [X] T454 [US1] Implement `resendCode` in `src/lib/auth/actions.ts` with the cooldown from T404, superseding the previous code
      (FR-005, FR-006)
- [X] T455 [US1] Build `/create-account` in `src/app/(frontend)/(account)/create-account/page.tsx` —
      node `428:11594`. Email, password, confirm password, **plus the marketing consent control the
      design does not draw** (FR-036, FR-036a: unticked, and never a condition of registering)
- [X] T456 [US1] Build `/verify-email` in `src/app/(frontend)/(account)/verify-email/page.tsx` —
      nodes `428:11869` and `429:12615` for the error state. `OtpInput`, submit, resend prompt
- [X] T457 [US1] Build the registration success screen in `src/components/account/registration-success/` — node `432:13049`. Check emblem, heading,
      body, one onward action
- [X] T458 [P] [US1] E2E in `tests/e2e/registration.spec.ts` — the full journey including
      **pasting the code**, plus the mismatch, duplicate-address and expired-code paths. Mail
      transport stubbed so CI needs no API key
- [X] T459 [P] [US1] Add the three new routes to `tests/a11y/routes.spec.ts`, and set `noindex` on
      all auth routes — a sign-in page in search results is not a feature

**Checkpoint**: US1 is fully functional and demonstrable on its own. This is the MVP.

---

## Phase 4: User Story 2 — Sign in, stay signed in, sign out (P1)

**Goal**: A returning customer signs in, stays signed in across visits, and can sign out.

**Independent Test**: Sign in with a seeded verified account, restart the browser to confirm the
session survives, sign out, confirm the profile is unreachable.

- [X] T470 [P] [US2] Integration test in `tests/integration/us2-sign-in.test.ts` — correct
      credentials; wrong password and unknown address producing **identical** responses (FR-011);
      lockout after ten failures; the unverified route
- [X] T471 [US2] Implement `signIn` in `src/lib/auth/actions.ts` — one message key for both wrong
      password and unknown address; catch Payload's `UnverifiedEmail` and return
      `requiresVerification` with a fresh code (US2 scenario 3); catch `LockedAuth` and surface the
      retry time (FR-014). **Validate `next` as a same-origin relative path** — an open redirect on a
      sign-in form is the classic version of this bug
- [X] T472 [US2] Implement `signOutCustomer` in `src/lib/auth/actions.ts` — ends the session immediately, and the profile must not
      be restorable with the browser back button (FR-013)
- [X] T473 [US2] Build `/sign-in` in `src/app/(frontend)/(account)/sign-in/page.tsx` — node
      `408:7412`. Use `TextInput`'s existing `trailing` prop for the forgot-password link; its own
      doc comment was written for this control
- [X] T474 [P] [US2] Build `PasswordField` in `src/components/account/password-field/` — the show/hide toggle, using `TextInput`'s `iconEnd` and the existing
      `eye` / `eye-off` icons (FR-044)
- [X] T475 [US2] Point the header's account control at `/sign-in` when anonymous and `/account` when
      signed in, in `src/components/layout/header/header.tsx` (FR-016)
- [X] T473a [US2] Build a minimal `/account` in `src/app/(frontend)/(account)/account/page.tsx` —
      heading, the email, and the sign-out button, guarded by `requireCustomer`. Not in the original
      plan: US2's Independent Test ends "sign out, confirm the profile is unreachable", and there
      was no profile to sign out of. Node `266:4382`'s rows land with US4–US7
- [X] T476 [P] [US2] E2E in `tests/e2e/sign-in.spec.ts` — sign in, restart context to prove the
      30-day session, sign out, back-button check, and a **literal comparison** of the two failure
      messages (SC-010)

**Checkpoint**: US1 and US2 both work independently. The feature is deployable.

---

## Phase 5: User Story 3 — Recover a forgotten password (P2)

**Goal**: A customer resets their password with an emailed code rather than a link.

**Independent Test**: From a seeded account, run the three screens end to end; the new password signs
in and the old one does not.

- [X] T485 [P] [US3] Integration test in `tests/integration/us3-reset.test.ts` — including the
      **unregistered address producing an identical response** (FR-017), and other sessions ending on
      success (FR-021)
- [X] T486 [US3] Wire `forgotPassword.generateEmailHTML` in `src/collections/customers.ts`, same pattern as T451
- [X] T487 [US3] Implement `requestPasswordReset` in `src/lib/auth/actions.ts` — ~~`payload.forgotPassword({ disableEmail: true })`~~
      **Built the other way round, and T486 is why.** With `disableEmail` set, Payload never calls
      `generateEmailHTML`, so the two tasks below are mutually exclusive and one of them would be
      dead code. Letting Payload send means the code is minted inside the same transaction that
      rotates `resetPasswordToken` — which matters: minting outside it, a throttled second request
      rotates the token while refusing to send, and the code from the FIRST email silently stops
      working with no message able to explain why. The throttle now refuses by throwing, so the
      rotation rolls back with it. Original wording kept below.
      to get the token, mint a code against it, send. **Always returns success**: the
      forgot-password form is the easiest place in any application to enumerate registered addresses,
      and the only defence is a response that does not vary
- [X] T488 [US3] Implement `verifyResetCode` and `resetPassword` in `src/lib/auth/actions.ts` — two actions because the design is
      two screens. The first returns a short-lived opaque **handle**, so Payload's raw token never
      travels to the browser and back
- [X] T489 [US3] Build `/forgot-password` in `src/app/(frontend)/(account)/forgot-password/page.tsx` — nodes
      `429:12087` / `614:13323`
- [X] T490 [US3] Build the reset code step in `src/components/account/reset-code-step/` — nodes `429:12348`
      and `429:12615`, reusing `OtpInput`
      with the invalid-code message wired through `aria-describedby` so it is announced (FR-046)
- [X] T491 [US3] Build `/reset-password` in `src/app/(frontend)/(account)/reset-password/page.tsx` — node
      `429:12884`, rendering T490's step first and the new-password step once a handle is issued. Note the drawn Russian placeholders and
      button are replaced by `resetCopy`'s English (FR-047)
- [X] T492 [P] [US3] E2E in `tests/e2e/password-reset.spec.ts`

**Checkpoint**: US1–US3 work independently.

---

## Phase 6: User Story 4 — See and edit the profile (P2)

**Goal**: A signed-in customer sees their profile and can set their name.

**Independent Test**: Sign in, open the profile, set a first and last name, reload, confirm both
persisted.

- [X] T500 [P] [US4] Integration test in `tests/integration/us4-profile.test.ts` — a customer reads
      only their own profile (FR-026)
- [X] T501 [US4] Build `ProfileRow` in `src/components/account/profile-row/` — the labelled
      read-with-edit row: value, optional pencil or `+`, optional empty state. Six instances on one
      page. **If a second feature grows a row like it, promote it to the kit rather than copy it**
- [X] T502 [US4] Build `/account` in `src/app/(frontend)/account/page.tsx` — node `261:4066`,
      card `266:5096`. Six rows in the FR-022 order, guarded by `requireCustomer()` from the DAL, not
      by a layout check (R9)
- [X] T503 [US4] In `src/app/(frontend)/account/page.tsx`, render the Email row **read-only with no edit
      affordance** — the design gives it no
      pencil, and FR-023 scopes email changes out
- [X] T504 [US4] Implement `updateName` in `src/lib/auth/actions.ts`, starting with
      `requireCustomer()` as every mutating action does
- [X] T505 [US4] Build `NameModal` in `src/components/account/name-modal/` on `Modal` — node
      `525:13319` (which Figma misnames "Add address"). First name and last name side by side;
      Cancel discards
- [X] T506 [US4] Wire `revalidatePath('/account')` into the actions in `src/lib/auth/actions.ts` so the server-rendered row updates without a
      reload (FR-024)
- [X] T507 [P] [US4] E2E in `tests/e2e/profile.spec.ts`, and add `/account` plus the modals to
      `tests/a11y/routes.spec.ts`

**Checkpoint**: the profile page exists and its name row works.

---

## Phase 7: User Story 5 — Save and manage delivery addresses (P2)

**Goal**: A customer adds, edits, deletes and defaults delivery addresses.

**Independent Test**: From an account with no addresses, add one, reload, edit it, add a second,
switch the default, delete one.

- [ ] T515 [P] [US5] Integration test in `tests/integration/us5-addresses.test.ts` — the ownership
      case first: customer B requesting customer A's address by id gets nothing (FR-032, SC-007)
- [ ] T516 [P] [US5] Unit test in `tests/unit/address-default.test.ts` for the invariant's four
      transitions
- [ ] T517 [US5] Implement `saveAddress` and `deleteAddress` in `src/lib/auth/actions.ts` — create when `id` is absent, update
      when present. **Both re-read the row and confirm ownership before writing**, even though the
      plugin's access already refuses another customer's row. Two checks on a client-supplied
      identifier is the right number
- [ ] T518 [US5] Build `AddressList` in `src/components/account/address-list/` — the filled row and
      the `No addresses added` empty state with `+`
- [ ] T519 [US5] Build `AddressModal` in `src/components/account/address-modal/` on `Modal` — node
      `583:12968`. Country `Select` from T411, address line 1, optional line 2, optional apartment,
      city and postcode on one row, the `This is my default address` `Checkbox`
- [ ] T520 [US5] Implement the validation state in `src/components/account/address-modal/` — node `525:12889`: required fields marked
      individually, Save **disabled** while any is empty (FR-030). `apartment` is **not** required,
      whatever the error frame draws
- [X] T521 [US5] Implement the default-address hooks in `src/fields/address-hooks.ts`, wired through the
      `addressesCollectionOverride` seam from T413 — first address becomes default; setting a default clears the previous; deleting the
      default promotes another (FR-031). **In a hook, not the form**: two tabs, the admin panel and a
      future checkout are all writers, and an invariant enforced in one form holds until the second
      writer appears
- [ ] T522 [US5] Add delete with confirmation to `src/components/account/address-list/`, using `Modal` (FR-029)
- [ ] T523 [P] [US5] E2E in `tests/e2e/addresses.spec.ts` — **choose Kazakhstan**, which the plugin's
      default country list would not have allowed. That assertion is the regression test for R6

**Checkpoint**: US1–US5 work independently.

---

## Phase 8: User Story 6 — Control marketing email preferences (P3)

**Goal**: One switch, saved immediately, evidenced.

**Independent Test**: Toggle, reload, confirm persistence; toggle back.

- [ ] T535 [P] [US6] Integration test in `tests/integration/us6-marketing.test.ts` — the consent
      timestamp is stamped by the hook and **cannot** be set from a form post; a customer with
      marketing off still receives a reset code (FR-035)
- [ ] T536 [US6] Implement `setMarketingEmail` in `src/lib/auth/actions.ts` — the action writes only `marketingEmail`; the
      timestamp and source are the hook's from T418
- [ ] T537 [US6] Call `syncMarketingContact` from an `afterChange` hook in `src/collections/customers.ts` on a consent
      change and on first verification. **A sync failure is logged and swallowed** — a consent change
      must not be lost because a third party was down
- [ ] T538 [US6] Build `MarketingToggle` in `src/components/account/marketing-toggle/` using the
      existing `Switch` — node row `I266:5096;266:4954`. Optimistic, **reverting on failure with the
      error stated** rather than silently swallowed (US6 scenario 3)
- [ ] T539 [P] [US6] E2E in `tests/e2e/marketing-preference.spec.ts`

**Checkpoint**: US1–US6 work independently.

---

## Phase 9: User Story 7 — Change the password while signed in (P3)

**Goal**: A signed-in customer changes their password, with a route to reset if they cannot recall it.

**Independent Test**: Change the password; the new one signs in and the old one does not.

- [ ] T545 [P] [US7] Integration test in `tests/integration/us7-change-password.test.ts` — wrong
      current password refused; other sessions ended on success (FR-021)
- [ ] T546 [US7] Implement `changePassword` in `src/lib/auth/actions.ts` — verify the current password by attempting a login
      before writing anything, then end other sessions
- [ ] T547 [US7] Build `ChangePasswordModal` in `src/components/account/change-password-modal/` on
      `Modal` — node `426:11616`. Three labelled fields; the current-password field carries the reset
      link via `TextInput`'s `trailing`, spelled **`Forgot password?`**
- [ ] T548 [US7] Wire the Security row's `change password` link in `src/app/(frontend)/account/page.tsx` —
      node row `I266:5096;419:14494`,
      using the single label from T419, not the design's two
- [ ] T549 [P] [US7] E2E in `tests/e2e/change-password.spec.ts`

**Checkpoint**: all seven stories are independently functional.

---

## Phase 10: Polish & Cross-Cutting Concerns

- [ ] T560 Implement the scheduled purge in `src/jobs/purge-unverified.ts` — unverified accounts past
      the age in T404, and terminal code rows older than 24 hours (FR-041, FR-040). Payload's own job
      queue with a `schedule`; no new service (R15)
- [ ] T561 [P] Register the job and its cron in `src/payload.config.ts`
- [ ] T562 [P] Confirm no password, code or session token reaches a log, an analytics event or an
      error report — inspect a full journey's output (FR-038, SC-014)
- [ ] T563 [P] Responsive pass at 1024, 768, 390 and 320 for all six routes and all four modals. The
      design has **no frames below 1920**, so this is derivation from the existing breakpoints, not
      transcription (FR-042)
- [ ] T564 [P] Reduced-motion pass — every transition suppressed, including the modal entrance
- [ ] T565 [P] Full state set audit on every new interactive element: default, hover, focus-visible,
      active, disabled, loading (Constitution III)
- [ ] T566 [P] Run `pnpm test:a11y` across the new routes and all four modals; fix to WCAG 2.2 AA
- [ ] T567 [P] Confirm no customer-visible string is duplicated across two components, and that
      every message key an action can return has a sentence in the screen that renders it — a key
      with no entry falls back to showing the key, which is loud in review and invisible in passing
- [ ] T568 Verify the JS budget: every new route under 200KB gzipped initial JS (Constitution V)
- [ ] T570 Editorial verification in the Payload admin, per Constitution: change the default country
      in **Account settings** and confirm the address form opens on it with no deploy; confirm there
      is no **Account** copy global (R11); confirm `verification-codes`
      is absent from the navigation and refuses a direct URL; confirm the customer row shows the name
      and marketing fields with the consent timestamp read-only
- [ ] T571 [P] Update `README.md` with the two new environment variables and the local
      `onboarding@resend.dev` note
- [ ] T572 [P] Delete the "deliberately absent" paragraph from `src/collections/customers.ts` if T416
      left it, and confirm the doc comment describes what the collection now is
- [ ] T575 Run the whole of [quickstart.md](./quickstart.md), including the **rollback rehearsal with
      a Kazakhstan address saved**, and the full gate set: `pnpm lint`, `typecheck`, `check:naming`,
      `check:tokens`, `check:stories`, `test`, `test:integration`, `test:e2e`, `test:a11y`

---

## Dependencies & Execution Order

### Phase dependencies

- **Phase 1 (Setup)**: no dependencies. T405 gates everything that sends mail.
- **Phase 2 (Foundational)**: depends on Phase 1. **Blocks all user stories.**
- **Phases 3–9 (User stories)**: all depend on Phase 2. Then parallelizable, or sequential in
  priority order.
- **Phase 10 (Polish)**: depends on the stories you intend to ship.

### Within Phase 2

```
T410 ─┐
T411 ─┼─→ T413 ─┐
T412 ─┘         │
T414 ───────────┼─→ T420 ─→ T421 (migration + types)
T415 → T416     │
T417 → T418 ────┘
T419 ───────────┘

T404 → T432 → T434          T443 ─┐
T430, T431 (after T403)     T444 ─┼─→ T446
T433 → T435                 T447 ─┘
T440 → T441, T442
```

T421 is the join point: nothing that reads generated types can start before it.

### Story dependencies

All seven stories depend only on Phase 2 — none depends on another. Two soft couplings worth naming:

- **US2 is easier to demo after US1**, because US1 is how a verified account comes to exist. US2 is
  still independently testable against a seeded account.
- **US4 builds the `/account` page** that US5, US6 and US7 hang their rows on. If those three are
  worked in parallel with US4, agree the page shell first.

### Parallel opportunities

- Phase 1: T401, T402, T404 together.
- Phase 2: T411, T412 together; T417, T419 together; the whole kit strand (T443, T444, T447) runs
  alongside the whole schema strand; T430/T431 alongside T432/T433.
- Every story's test task is `[P]` against its implementation tasks.
- With three developers after Phase 2: US1+US2 / US3 / US4→US5.

---

## Parallel Example: Phase 2

```bash
# Schema strand and kit strand are independent — run them together:
Task: "T411 Create src/lib/countries.ts with Intl.DisplayNames labels"
Task: "T412 Create src/fields/address-fields.ts with apartment and isDefault"
Task: "T443 Build Modal in src/components/ui/modal/ on the existing useOverlay"
Task: "T444 Build OtpInput in src/components/ui/otp-input/ with group-level paste"

# Then the server tier's pure modules and their tests:
Task: "T432 Create src/lib/auth/codes.ts"
Task: "T433 Create src/lib/auth/password.ts"
```

---

## Implementation Strategy

### MVP (User Story 1 only)

1. Phase 1 — mail sends (T405 is the gate).
2. Phase 2 — all schema in one migration, the server tier, both kit primitives.
3. Phase 3 — register, verify, success.
4. **Stop and validate**: a fresh visitor becomes a verified, signed-in customer.

That is a demonstrable feature, and it is what unblocks the requests-and-handoff spec, which cannot
send an order without knowing who the customer is.

### Incremental delivery

Phase 2 → **US1 (MVP)** → US2 → deployable → US3 → US4 → US5 → US6 → US7 → Phase 10.

Each stop is coherent. Stopping after US2 gives accounts that work; after US5, a profile that is
genuinely useful; US6 and US7 are conveniences over capability that already exists.

### Notes

- `[P]` means different files with no dependency on incomplete work.
- Every mutating server action starts with `requireCustomer()` — including the ones whose forms only
  render on an authenticated page. The bundled Next docs are explicit about this and it is the
  easiest thing in the feature to forget.
- Commit after each task or logical group. `pnpm generate:types` runs in the same commit as any
  schema change; a PR with stale generated types fails review.
- Pull Figma nodes when you start the task that needs them, not before.
