# Quickstart: Verifying Contact Us and FAQ

**Feature**: `008-contact-faq-pages` | **Plan**: [plan.md](./plan.md)

How to prove this feature works end to end. Runnable checks first, then what only a person can
confirm.

**Status as of 2026-09-11**: everything below has been run and passes, except the screen-reader pass
in item 4 of the last section — which is called out there rather than quietly counted as done.

---

## Prerequisites

```bash
pnpm install
docker compose -f docker-compose.dev.yml up -d     # PostgreSQL
pnpm payload migrate                               # includes <ts>_contact_and_faq
pnpm generate:types                                # must produce no diff
pnpm seed                                          # questions, media, the form photograph
```

`EMAIL_TRANSPORT=log` is set by both test runners, so nothing below spends a Resend quota. Leave it
unset only when you are deliberately testing a real send.

---

## The gates

All must pass; none may be waived (Constitution, Development Workflow).

```bash
pnpm lint && pnpm typecheck        # incl. catalog/no-document-types over the two new tiers
pnpm check:naming                  # kebab-case paths
pnpm check:tokens && pnpm check:styles && pnpm check:contrast
pnpm check:stories                 # question-list must have one
pnpm test                          # unit
pnpm test:integration              # enquiries: ordering, throttle, access, purge
pnpm test:e2e                      # contact, faq, contact-admin
pnpm test:a11y                     # /contact and /faq are in ROUTES
```

**The single most important test in this feature** is in
`tests/integration/enquiries.test.ts`: *a failing notification still returns `success`, and leaves
the row with `notification: 'failed'`*. That is the design decision the spec's clarification bought
(contract [enquiry-action](./contracts/enquiry-action.md) §5). If it ever inverts, a mail outage
starts telling visitors their message failed while the shop is holding it.

---

## Walkthrough

```bash
pnpm dev
```

### 1. The dead links are closed (US1, US3 — SC-001)

Open `/` and follow **Contact us** in the header, then **FAQ** and **Contact Us** in the footer, then
**CONTACT US** at the foot of `/about`. All four resolve. None did before this feature.

### 2. Channel cards come from the admin, not from code (US1 — SC-002)

At `/contact`, the first band shows one card per saved messenger plus an email card, last.

In `/admin` → **Shop → Contact settings**:

- Reorder the messengers → the cards follow, no deploy.
- Add a fourth → a fifth card appears.
- Untick **Offer this messenger** → the card **stays**. Hiding a messenger from checkout is not
  refusing contact on it (FR-012), and this is the check that catches someone "fixing" it.
- Clear the **Email address** → the email card falls back to the shipped default rather than
  rendering a dead `mailto:`.

Each card's value is a working link: the messenger profile, or `mailto:`.

### 3. The form, with JavaScript on (US2)

Submit with all three fields valid → the button shows it is working, then the form is replaced by
the confirmation from the admin.

In `/admin` → **Shop → Enquiries**: one row, newest first, showing name, address, `sent`, and when.
The captured mail (`EMAIL_TRANSPORT=log` writes it to the server log) carries all three values and
`replyTo` set to the visitor's address.

Then break it deliberately:

- Empty a field, or type `not-an-email` → nothing is written, the fields at fault are named, focus
  moves to the first, **and what you typed is still there**.
- Submit six times inside an hour → the sixth is refused, and **no sixth row appears**.

### 4. The form, with JavaScript disabled (US2 — FR-018)

The one path that is easy to ship broken. In DevTools → Settings → Debugger → **Disable JavaScript**,
reload `/contact`, and:

- Submit a valid message → it is recorded and confirmed.
- Submit an invalid one → the errors render **and the fields are re-populated**. This is what
  `EnquiryState.values` exists for; with JS on, React preserves the DOM and hides the bug.

`tests/e2e/contact.spec.ts` covers this with a JS-disabled context, but check it by hand once —
it is the requirement most likely to regress silently.

### 5. A mail outage loses nothing (US2 — SC-004a)

Point `RESEND_API_KEY` at something invalid (with `EMAIL_TRANSPORT` unset) and submit.

- The visitor **is still told the message was received**.
- The admin row reads `failed`, with a reason.

Restore the key. Nothing was lost, and nothing needed re-sending by hand.

### 6. `/faq` (US3)

Every published question, in the **Order** field's order — not the contact page's selection. Expand
one, then another: the first stays open (FR-035). Unpublish a question → it disappears from `/faq`,
`/contact` and `/about` with no other edit (SC-006).

Unpublish them all → a heading and the empty message, **not a 404** (FR-039). Every page on the site
links here.

View source: `schema.org/FAQPage` JSON-LD is present on `/faq` and **absent** on `/contact` (R12).

### 7. Both pages are the owner's (US4 — SC-005)

In `/admin` → **Content → Contact page**, change every string: eyebrow, headline, intro, the form's
heading, body, three field labels, button, footnote, and both messages. Then swap the photograph.
Then in **FAQ page**, change the heading and the empty message. All of it appears with no code
change.

Set the FAQ selection to nothing → **the whole band disappears** rather than leaving a heading over
an empty column (FR-032).

Save a draft and preview → you see it, a visitor does not.

### 8. Retention and erasure (US6 — SC-013)

```bash
# Age a row past the cutoff, then let the nightly queue drain it.
psql "$DATABASE_URI" -c "update enquiries set created_at = now() - interval '400 days' where id = 1;"
```

Within fifteen minutes (the queue runner's interval) the row is gone and newer ones remain. To force
it, run the job from the admin's jobs view rather than waiting.

For erasure: delete a visitor's enquiries in the admin, and confirm nothing on the site still carries
their name, address or text.

---

## What only a person can confirm

1. **Editorial usability** (Constitution, Editorial verification). Compose both pages from an empty
   global and ask whether the field labels make sense to somebody who did not write them. A block
   that renders correctly and is unusable in the admin is a defect — spec 006 found exactly this
   when its "Add Band" button said "Add Body".
2. **The drawing at three widths.** `/contact` at 1920 / 768 / 390 against `312:7499`, `419:10740`,
   `419:10831`; `/faq` against `266:4468`, `422:9509`, `422:9881`. Watch the channel grid's
   four → 2×2 → stacked transition and the form photograph moving from beside the form to beneath
   it.
3. ~~**The card chrome**~~ — **settled at T006**: `get_design_context` on `312:8535` shows four
   `bg-white` panels with a 20px gap and no borders, so the separation is gutters, which is what
   `FeatureCard` already does.
4. **Keyboard and screen reader over the form.** Tab through it, submit it empty, and confirm the
   error is *announced* rather than only rendered. The mechanics are now asserted — `aria-invalid`
   on the control, the error bound through `aria-describedby`, and a live region for the
   form-level failure — but whether a real screen reader says something a person can act on is
   still a human judgement. **This is the one item on this list nobody has done by hand.**

---

## Budgets

```bash
pnpm build && pnpm start
```

Measure gzipped initial JS against a **production server**, not the build log — Next 16 with
Turbopack no longer prints per-route JS, and the constitution's budget is what the browser fetches
before load.

**Measured 2026-09-11**, summing the gzipped transfer of every `/_next/static/**.js` the route
requests:

| Route | Total | Over baseline |
| --- | --- | --- |
| `/404` (framework baseline, no application code) | 170.7 KB | — |
| `/about` | 225.2 KB | 54.5 KB |
| `/blog` | 225.2 KB | 54.5 KB |
| **`/contact`** | **227.4 KB** | **56.7 KB** |
| **`/faq`** | **225.2 KB** | **54.5 KB** |

Both inside the budget with room: ≤ 300 KB total and ≤ 100 KB above the baseline.

Two things worth noting. The baseline **re-measured at 170.7 KB**, below the 181 KB the
constitution recorded on 2026-09-03 — and re-measuring rather than carrying the old number forward
is what Principle V asks for, since it is "a fact about the current dependencies, not a target".
And `/contact` costs only **2.2 KB more than `/faq`**, which is the whole of the contact form: the
progressive-enhancement approach turns out to be cheaper on the wire than the react-hook-form
pattern it declined to follow.
