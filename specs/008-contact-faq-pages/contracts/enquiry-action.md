# Contract: The enquiry server action

**Module**: `src/lib/contact/actions.ts` (`'use server'`) · **Schema**:
`src/lib/contact/enquiry-schema.ts` · **Throttle**: `src/lib/contact/throttle.ts`

The one public write surface this feature adds. It is reachable by anything that can make an HTTP
request, so every rule below is enforced here rather than in the form.

---

## §1 Signature

```ts
export async function submitEnquiry(
  prevState: EnquiryState,
  formData: FormData,
): Promise<EnquiryState>
```

`(prevState, formData)` is required by `useActionState` — Next 16's forms guide,
`01-app/02-guides/forms.md`. **`FormData`, not typed values**, and this is the deliberate departure
from `src/lib/auth/actions.ts` recorded in [research.md](../research.md) R3: typed values cannot
arrive from a browser with JavaScript disabled, and FR-018 requires that they can.

## §2 State

```ts
type EnquiryState =
  | { status: 'idle' }
  | { status: 'success' }
  | {
      status: 'error'
      message: 'sendFailed' | 'throttled' | 'invalid'
      fieldErrors?: Partial<Record<'name' | 'email' | 'message', string>>
      values: { name: string; email: string; message: string }
    }
```

Three properties this shape is carrying deliberately:

1. **`message` is a key, never a sentence.** The words come from `contact-page.form` and are
   rendered by the component (FR-042). `src/lib/auth/actions.ts` established the convention and
   explains why: `toBe('throttled')` does not break when somebody rewords the copy.
2. **`values` is on the error branch and nowhere else.** It is what re-populates the form when the
   page is re-rendered from scratch, which is what happens on the no-JavaScript path. Without it,
   FR-019 and FR-022's "keep what the visitor wrote" fails in exactly the mode nobody tests by hand.
3. **`success` carries nothing.** The confirmation text is content, and the submitted values must
   not be echoed back into a rendered page.

## §3 Validation (§FR-016, FR-017)

`enquiry-schema.ts` is the single zod shape. The action parses `FormData` through it; the form uses
the same maxima for its `maxLength` attributes. One source, two enforcement points.

| Field | Rule |
| --- | --- |
| `name` | trimmed, non-empty, ≤ `ENQUIRY_MAX.name` (100) |
| `email` | trimmed, valid address, ≤ 254 |
| `message` | trimmed, non-empty, ≤ `ENQUIRY_MAX.message` (5000) |
| `website` | honeypot — **must be empty** |

A failure returns `status: 'error'`, `message: 'invalid'`, per-field keys, and `values`. Nothing is
written and nothing is sent.

The honeypot failure returns the **same shape as success** (`status: 'success'`) rather than an
error. A bot told precisely which check it failed is a bot that learns; a visitor cannot reach this
branch because the control is off-screen, `tabindex="-1"` and `aria-hidden`.

## §4 Throttle (FR-027)

Refuse when **either** key already has `ENQUIRY_RATE_LIMIT` (5) accepted enquiries inside
`ENQUIRY_RATE_WINDOW_MS` (1 hour):

- the submitted **email address**, normalised to lower case
- `senderHash` — `HMAC(PAYLOAD_SECRET, clientIp)`

Both are `count` queries against `enquiries`. There is no throttle table (R5).

A refused submission returns `message: 'throttled'` and **writes nothing and sends nothing** — a
throttle that fills the enquiry list with the traffic it exists to stop is not a throttle.

Guarantees this construction gives, each named by the requirement it satisfies:

- Survives a redeploy and holds across instances (FR-027) — it is database state, not a counter in
  a process. `src/lib/auth/codes.ts:81-84` rejected the in-process form for the same reason.
- Asks the visitor nothing (FR-027) — no puzzle, no challenge.
- Needs no JavaScript — it is server-side by construction.

## §5 Ordering — the load-bearing rule (FR-021, FR-024a)

```text
1. validate            fail → 'invalid'    | nothing written, nothing sent
2. honeypot + throttle fail → 'throttled'  | nothing written, nothing sent
3. CREATE enquiry (notification='pending', senderHash)
        fail → 'sendFailed'                 | nothing sent; the visitor is told plainly
4. send notification
        ok   → UPDATE notification='sent'
        fail → UPDATE notification='failed', notificationError=<reason>
5. return 'success'  ── decided by step 3, NEVER by step 4
```

**Step 5 is the contract.** The record is the receipt; the email is how the owner finds out. A
visitor whose enquiry was stored is told it arrived, because it did, even when the notification
failed — the failure is the owner's to see, in the admin (FR-029c) and in the logs (§7).

The inverse must never happen: `'success'` is unreachable without a written row.

Writes use `overrideAccess: true`. The collection refuses `create` and `update` to everyone
(data-model §1), so this action is structurally the only path in — the same construction
`src/collections/verification-codes.ts` uses and documents.

## §6 Notification (FR-024, FR-025, FR-026)

`src/lib/email/enquiry.ts`, built on `payload.sendEmail`, following `src/lib/email/transactional.ts`.

| Property | Value |
| --- | --- |
| `to` | `contactSettings.enquiryEmail` → falls back to `contactSettings.email` → falls back to `DEFAULT_CONTACT.email` |
| `replyTo` | the visitor's address. Supported end to end — `@payloadcms/email-resend/dist/index.js:51` maps it onto Resend's `reply_to` |
| `subject` | fixed, and **never** carries visitor text |
| body | name, address and message, each through `escapeHtml` |

`escapeHtml` already exists in `transactional.ts`, whose comment says it is kept for "the day
somebody interpolates a customer's name into a subject line". This is that day: all three values are
attacker-controlled (FR-026), and they are treated as text everywhere — in the mail, in the admin,
and on any page that ever shows them.

`to` is resolved at send time from the global, never from a constant. An address written in code is
what FR-024 forbids.

## §7 Logging (FR-028)

One structured line per submission through `payload.logger`, carrying the outcome
(`accepted` | `invalid` | `throttled` | `notify-failed` | `write-failed`) and a correlation id — the
enquiry's own id once one exists, otherwise a generated one.

**It must never carry the message text or the email address.** Those live in an access-controlled
collection; a log line is not access-controlled and is frequently shipped somewhere else. The
`senderHash` may be logged; the IP it was derived from may not.

## §8 What this action must not do (FR-030)

- Must not read or write the visitor's session, and must not set a cookie.
- Must not require an account.
- Must not look up or link a customer by the submitted address (FR-029f). An enquiry is
  correspondence; joining it to a profile widens who can see it.
- Must not call `revalidatePath` or any invalidation. `src/lib/revalidate.ts` walks every product
  slug, so that would let a visitor evict the catalogue by sending a message (R8).

## §9 Test obligations

Integration (`tests/integration/enquiries.test.ts`), against a real database:

- A valid submission writes exactly one row and returns `'success'`.
- A failing notification still returns `'success'`, and leaves `notification: 'failed'` with a
  reason. **The regression test for the whole point of the design.**
- A failing write returns `'sendFailed'` and sends nothing.
- The 6th submission inside the window is `'throttled'`, writes nothing, and sends nothing — proved
  for the email key and the `senderHash` key separately.
- A filled honeypot returns `'success'` and writes nothing.
- `create` and `update` are refused to an admin session, a customer session and an anonymous request
  through REST; `read` is refused to a customer and to anonymous.
- The purge job deletes a row past the cutoff and leaves one inside it.

Unit (`tests/unit/enquiry-schema.test.ts`): the maxima, the trimming, the address shape, and that
schema and field validation agree because both read `ENQUIRY_MAX`.
