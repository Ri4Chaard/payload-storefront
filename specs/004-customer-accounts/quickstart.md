# Quickstart — Customer Accounts

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

How to run this feature locally and how to prove it works. Details of shapes and guarantees live in
[data-model.md](./data-model.md) and [contracts/](./contracts/); this file is the run guide.

---

## Prerequisites

The project's existing setup, plus one new thing: **email actually has to send**, because a
verification code that never arrives blocks every flow in the feature.

```bash
pnpm install
docker compose --profile local up -d     # Postgres
cp .env.example .env                     # then fill in the values below
```

### New environment variables (R14)

| Variable | Where to get it |
| --- | --- |
| `RESEND_API_KEY` | Resend dashboard → API Keys. A sending key is enough. |
| `EMAIL_FROM_ADDRESS` | Must be on a domain verified in Resend, or sends are rejected. |

`src/env.ts` lists both as required, so a missing one fails startup naming it rather than failing at
the first send.

**Developing without a verified domain** (this is the current local setup). Resend accepts
`onboarding@resend.dev` as a from address without one, but then enforces two rules that are easy to
lose an hour to:

- **It refuses `example.com` and friends outright**, with `422 Invalid \`to\` field`. Use
  `delivered@resend.dev` — Resend's own sandbox address — to prove the transport works at all.
- **It delivers only to the address that owns the API key.** Anything else returns `403` and,
  helpfully, names the permitted address in the error.

That second rule would make the flow untestable — you register as a test address and the code goes
nowhere. Hence `EMAIL_OVERRIDE_RECIPIENT`: set it to the key owner's address and every message is
redirected there, so registering as `anything@wherever` still puts a readable code in your inbox.

None of this is enough for staging. A shared environment needs a verified domain, or every tester
receives nobody's codes — and the override must be **unset in production**, where redirecting all
customer mail to one mailbox would be its own incident.

### Migration and seed

```bash
pnpm payload migrate                     # adds the customers/addresses columns and verification_codes
pnpm generate:types                      # payload-types.ts must be regenerated in the same commit
pnpm dev
```

---

## Prove it works

Seven scenarios, one per user story. Each maps to acceptance criteria in [spec.md](./spec.md).

### 1. Register and verify (US1)

1. Open `http://localhost:3000/create-account`.
2. Submit a fresh address, a password, and a matching confirmation. Leave the marketing consent box
   **unticked** — it is unticked by default (FR-036).
3. You land on the verification step. The code arrives by email.
4. **Paste the whole code into any of the six boxes** with ⌘V. Every box fills and the form
   completes on its own (R13, O1/O3).
5. Expect: the success screen, and a signed-in session.

**Also check**, because these are the parts that are easy to get wrong:

- Submit a mismatched confirmation → refused, error against the confirmation field (FR-002).
- Register the **same address again** → same success response, no second account (FR-009). Verify in
  the admin that `customers` still holds one row.
- Wait past the expiry and submit the code → refused as expired, not as wrong (FR-005).
- Use Resend, then submit the **previous** code → refused as superseded (FR-005).
- Tick the consent box on a second registration → `marketingEmail` true, and
  `marketingEmailUpdatedAt` stamped (FR-034).

### 2. Sign in, persist, sign out (US2)

1. `/sign-in` with the account from step 1 → `/account`.
2. Restart the browser and reopen `/account` → still signed in (FR-012, 30-day token).
3. Sign out → `/account` redirects to sign-in, and **the browser back button does not restore it**
   (FR-013).
4. Wrong password and unknown address → **identical** message (FR-011). Compare them literally.
5. Ten wrong passwords → locked with a retry time (FR-014).
6. Register a fresh account, do not verify it, then sign in → routed to verification, not into the
   profile (US2 scenario 3, driven by Payload's `UnverifiedEmail`).

### 3. Forgotten password (US3)

1. `/forgot-password` with a registered address → code screen.
2. Repeat with an **unregistered** address → the same screen, the same wording, no email sent
   (FR-017). This is the enumeration defence; check it deliberately.
3. Wrong code → "Invalid code" beneath the boxes, still retryable (FR-019).
4. Correct code → new-password screen → set a new password.
5. The new password signs in; the old one does not; a session open in another browser is gone
   (FR-021).

### 4. Profile and name (US4)

1. `/account` → six rows in the order of [spec.md](./spec.md) FR-022.
2. The **Email row has no edit control** (FR-023).
3. Pencil on Full name → modal → save → the row updates without a reload (FR-024).
4. Cancel → nothing saved (US4 scenario 4).
5. A customer with no name → an empty state, not a blank box (FR-025).

### 5. Addresses (US5)

1. Empty state reads `No addresses added` with a `+`.
2. Add an address. **Choose Kazakhstan** — it is in the list, which the plugin's default 40-country
   list would not have allowed (R6). This is the check that proves the override shipped.
3. Leave `Address line 1` empty → Save stays disabled and the field is marked (FR-030). Confirm
   `Apartment` is **not** required despite the design's error frame drawing it red.
4. Reload → the address persisted, and is the default automatically as the only one (FR-031).
5. Add a second, mark it default → exactly one default remains (FR-031).
6. Delete the default → the other is promoted (FR-031).

**The ownership check, which matters more than any of the above**: sign in as a second customer and
request the first customer's address by id through the API. Expect nothing back (FR-032, SC-007).

### 6. Marketing preference (US6)

1. Toggle the switch → persists across a reload (FR-033).
2. `marketingEmailUpdatedAt` moves; `marketingEmailSource` reads `profile` (FR-034).
3. Turn it **off**, then run a password reset → **the reset code still arrives** (FR-035). This is
   the guarantee the two-send-path split exists for (R2), and it is worth checking by hand.

### 7. Change password (US7)

1. Security row → `change password` → three fields.
2. Wrong current password → refused against that field (US7 scenario 3).
3. Correct → changed, other sessions ended (FR-021).
4. The forgot link inside the modal reaches the reset flow without dropping the session.

---

## Automated checks

```bash
pnpm test                  # unit — code lifecycle, validation, country list, default-address invariant
pnpm test:integration      # against a real database — access control and the auth flows
pnpm test:e2e              # Playwright — the seven journeys above
pnpm test:a11y             # axe on every new route and the four modals
pnpm test:stories          # kit geometry and behaviour, including OtpInput paste
pnpm lint && pnpm typecheck && pnpm check:naming && pnpm check:tokens && pnpm check:stories
```

**The highest-value unit tests** are the pure ones: `consumeCode`'s four terminal states, the
password strength rule, the country list, and the default-address invariant. They are cheap and they
cover the logic most likely to be wrong.

**The integration tests that matter most** are the negative ones — customer B reading customer A's
address, an anonymous request to `verification-codes`, and a customer session against the admin
panel (SC-007, SC-008). A passing positive test proves a feature works; these prove it is not
open.

**In `tests/e2e`, email is intercepted rather than really sent.** The transport is stubbed and the
code read from the intercepted message, so the suite is deterministic and needs no API key in CI.

---

## Rollback

```bash
pnpm payload migrate:down
```

**Run this with a Kazakhstan address saved.** The `down` narrows `addresses.country` back to the
plugin's 40-value enum, and a row holding a value outside it is exactly what makes that fail — see
[data-model.md](./data-model.md). Proving the behaviour is understood before release is the point of
the exercise; discovering it during an incident is not.

---

## Verifying in the admin (Constitution: editorial verification)

Before merge, in the Payload admin:

1. Open **Account** and change a heading — for instance the sign-in title. Confirm the site renders
   the new words with no deploy (Principle I, FR-047).
2. Confirm `verification-codes` is **not** in the navigation, and that a direct URL to it is refused.
3. Confirm a customer row shows `firstName`, `lastName`, the composed `name`, and the marketing
   fields, with the consent timestamp read-only.
