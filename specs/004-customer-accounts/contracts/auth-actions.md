# Contract — Server Actions and the auth data layer

**Feature**: [../spec.md](../spec.md) | **Research**: [../research.md](../research.md) R3, R9, R10

The interface this feature exposes is not an HTTP API. It is a set of **Server Actions** the forms
bind to, and a **data access layer** every one of them starts with. This document is the contract
for both: what each takes, what it returns, and what it guarantees.

Payload's REST and GraphQL endpoints for `customers` remain mounted and are governed by the
collection's access control ([../data-model.md](../data-model.md)); this feature adds no route
handlers of its own.

---

## The data access layer

`src/lib/auth/dal.ts`. Server-only. Per R9, this — not a layout, not the proxy — is where
authorization is actually decided.

```ts
/** The signed-in customer, or null. Memoized per render pass with React `cache`. */
getCustomer(): Promise<CustomerSession | null>

/** As above, but redirects to /sign-in?next=<path> when there is none. */
requireCustomer(): Promise<CustomerSession>
```

`CustomerSession` is a **data transfer object**, not the Payload document: `id`, `email`,
`firstName`, `lastName`, `marketingEmail`. Nothing else crosses into a component. The Next
authentication guide's DTO section is the reason — a component that receives the whole document
receives fields it has no business rendering, and one of them eventually gets rendered.

**Guarantees**

| | |
| --- | --- |
| G1 | `getCustomer` reads Payload's session cookie through `payload.auth({ headers })`. It never trusts a client-supplied identifier. |
| G2 | It is memoized with React `cache`, so N calls in one render pass are one verification. |
| G3 | It returns `null` for an unverified customer. Unverified is not signed in (FR-008). |
| G4 | **Every mutating action below calls `requireCustomer()` first**, even when its form only renders on an authenticated page — per the bundled forms guide's warning. |

---

## Action result

Every action returns the same discriminated shape.

**Actions take typed values, not `FormData`** (R16). Each one re-parses its input with the schema in
`src/lib/auth/schemas.ts` — the same schema the form used in the browser — because an action is a
public endpoint and the browser's check protects nobody. `registerCustomer({ email, password, … })`
is also what the integration tests call.

```ts
type ActionResult<T = void> =
  | { status: 'success'; data: T }
  | { status: 'error'; message: string; fieldErrors?: Record<string, string> }
```

**`message` is a key into the copy constants, not a sentence** (R11, FR-047). No user-visible
English is produced by an action — which is also what lets the integration tests assert
`toBe('codeExpired')` instead of matching prose.

`fieldErrors` is keyed by form field name so the error lands on the control that caused it —
FR-002's mismatch must appear against the confirmation field, not at the top of the form.

---

## Anonymous actions

### `registerCustomer(prev, formData)`

Fields: `email`, `password`, `confirmPassword`, `marketingConsent?`.

| | |
| --- | --- |
| Validates | Email shape; `password` meets the strength rule; `password === confirmPassword` (FR-002, FR-003) |
| Creates | A `customers` row with `_verified: false`, `marketingEmail` from the unticked-by-default consent box (FR-036) |
| Sends | A six-digit code, via Payload's `verify.generateEmailHTML` interception (R3) |
| Returns | `success` always, when the input is well-formed |

**The uniform response is the requirement, not a shortcut.** FR-009 forbids disclosing that an
address is registered. An address that already has an account produces the same `success` and the
same redirect to the verification step, and no second account. If that existing account is
unverified, a fresh code is sent to it — so the legitimate owner of an abandoned registration can
still complete it, and an attacker learns nothing either way.

**Never**: reflects the password back, or includes it in `fieldErrors`.

---

### `verifyEmailCode(prev, formData)`

Fields: `email`, `code`.

Resolves the code through `consumeCode(email, 'verify-email', code)` below, then
`payload.verifyEmail({ collection: 'customers', token })`, then signs the customer in and returns
`success` (FR-007).

Failure is one of: wrong, expired, spent, superseded, or too many attempts — each a distinct
message key, because "invalid code" when the real problem is "you have three minutes left on a code
from an hour ago" is how a customer gets stuck.

---

### `resendCode(prev, formData)`

Fields: `email`, `purpose`.

Issues a new code, marks the previous one superseded (FR-005), and enforces the cooldown from R8.
Returns `success` whether or not the address exists — same disclosure rule as registration.

---

### `signIn(prev, formData)`

Fields: `email`, `password`, `next?`.

| Outcome | Returns |
| --- | --- |
| Correct credentials, verified | `success`, session cookie set, redirect to `next` or `/account` |
| Wrong password, or unknown address | `error` with **one** message key for both (FR-011) |
| Correct credentials, unverified | `success` with `data.requiresVerification = true`, and a fresh code sent (FR-011's single permitted disclosure, US2 scenario 3) — driven by catching Payload's `UnverifiedEmail` |
| Locked out | `error` with the lockout key and the retry time — Payload's `LockedAuth` (R8) |

`next` is validated as a same-origin relative path before use. An open redirect on a sign-in form is
the classic version of this bug.

---

### `requestPasswordReset(prev, formData)`

Field: `email`.

Calls `payload.forgotPassword({ collection: 'customers', data: { email }, disableEmail: true })`,
mints a code against the returned token, and sends it. **Always returns `success`** (FR-017) — the
forgot-password form is the easiest place in any application to enumerate registered addresses, and
the only defence is that the response does not vary.

### `verifyResetCode(prev, formData)` → `resetPassword(prev, formData)`

The first resolves the code and returns a short-lived opaque handle; the second exchanges the handle
plus `password`/`confirmPassword` for `payload.resetPassword({ data: { token, password }, overrideAccess: true })`.

**Two actions, not one, because the design is two screens.** The handle exists so the raw Payload
token never travels to the browser and back — the customer's device holds a reference, not a
credential.

On success: all other sessions for that customer end (FR-021).

---

## Authenticated actions

Each begins with `requireCustomer()`.

| Action | Fields | Notes |
| --- | --- | --- |
| `updateName` | `firstName`, `lastName` | FR-024 |
| `saveAddress` | the address fields, `id?` | Creates when `id` is absent, updates when present (FR-029). Ownership is set by the plugin's hook, never from the form. |
| `deleteAddress` | `id` | FR-029. The default-address invariant is a collection hook's job, not this action's ([../data-model.md](../data-model.md)). |
| `setMarketingEmail` | `enabled` | FR-033. The consent timestamp is stamped by a hook; this action cannot set it. |
| `changePassword` | `currentPassword`, `newPassword`, `confirmPassword` | FR-020. Verifies the current password by attempting a login before writing. Ends other sessions (FR-021). |
| `signOutCustomer` | — | FR-013 |

**On `id` parameters**: `saveAddress` and `deleteAddress` take an address id from the form, so both
re-read the row and confirm ownership before writing — the plugin's owner-scoped access already
refuses another customer's row, and the action does not rely on that alone. Two checks on the
identifier a client supplies is the right number.

**Cache invalidation**: every authenticated action calls `revalidatePath('/account')` on success, so
the server-rendered profile reflects the change.

---

## Code lifecycle

`src/lib/auth/codes.ts`. Server-only. The four terminal states from
[../data-model.md](../data-model.md) are checked in one place so no call site can forget one.

```ts
/** Mints a code for a token, supersedes any live code for the same (email, purpose), returns the digits. */
issueCode(email: string, purpose: CodePurpose, token: string): Promise<string>

/** The only reader. Returns the aliased token, or why not. */
consumeCode(email: string, purpose: CodePurpose, code: string):
  Promise<{ ok: true; token: string } | { ok: false; reason: CodeFailure }>

type CodeFailure = 'not-found' | 'expired' | 'consumed' | 'superseded' | 'too-many-attempts' | 'mismatch'
```

**Guarantees**

| | |
| --- | --- |
| C1 | Codes are six digits from a cryptographically secure source — never `Math.random`. |
| C2 | Only the hash is stored (R4, FR-038). Comparison is constant-time. |
| C3 | A successful `consumeCode` stamps `consumedAt` in the same write that returns the token. Single-use is enforced by the database, not by the caller remembering. |
| C4 | Every failed attempt increments `attempts`; the fifth burns the code. |
| C5 | `issueCode` supersedes any live code for the same `(email, purpose)` before writing (FR-005). |
| C6 | `purpose` is part of every lookup. A verification code can never complete a password reset. |
| C7 | The digits never enter a log, an error message, or an analytics event (FR-038). |

---

## Email

`src/lib/email/`. Two send paths that cannot reach each other (R2).

```ts
/** Transactional. Payload's adapter. Never consults marketing consent. */
sendVerificationCode(to: string, code: string, locale: string): Promise<void>
sendResetCode(to: string, code: string, locale: string): Promise<void>
sendPasswordChangedNotice(to: string, locale: string): Promise<void>

/** Marketing. Resend audience membership only. Sends nothing itself. */
syncMarketingContact(email: string, subscribed: boolean): Promise<void>
```

**Guarantee E1**: the transactional functions have no access to `marketingEmail`, and
`syncMarketingContact` cannot send a message. FR-035 therefore holds by construction rather than by
a conditional somebody has to remember — which is the same argument that keeps `admins` and
`customers` in separate collections.

**Guarantee E2**: the three messages are written in `src/lib/email/transactional.ts` itself (R11).
Server-side only — they never reach a browser bundle.

**Guarantee E3**: a `syncMarketingContact` failure is logged and swallowed. A consent change is
recorded in Payload whether or not Resend was reachable; the sync is reconciled, never rolled back.

---

## Route protection

`src/proxy.ts` — **`proxy.ts`, not `middleware.ts`**; Next 16 renamed it (R9).

| | |
| --- | --- |
| P1 | Matches `/account/:path*`. Redirects to `/sign-in?next=…` when Payload's session cookie is absent. |
| P2 | **Cookie presence only.** No database read, no token verification — it runs on prefetches, and the guide is explicit that it must stay optimistic. |
| P3 | It is not the security boundary. A forged cookie passes P1 and is refused by the DAL, which is where FR-015 is actually met. |

---

## What this feature does not expose

No public REST or GraphQL endpoint is added. No route handler is added. `verification-codes` is
unreachable through every API surface — every access function returns `false`
([../data-model.md](../data-model.md)) — and is touched only by the Local API with
`overrideAccess: true` from the module above.
