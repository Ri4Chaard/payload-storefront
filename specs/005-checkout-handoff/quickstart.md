# Quickstart — Validating Checkout, Cart and Messenger Handoff

**Feature**: `005-checkout-handoff` | **Plan**: [plan.md](./plan.md)

How to prove the feature works, end to end, against a real database and a real browser. Written to
be runnable by someone who did not build it.

---

## Prerequisites

```bash
pnpm install
docker compose --profile dev up -d          # Postgres
pnpm payload migrate                        # includes this feature's contact-settings migration
pnpm seed                                   # a catalogue with stones and sizes to choose from
```

The seed matters: several checks below need **a piece with both a stone and a size**, one with
neither, and one that is sold out. `scripts/seed-catalog.ts` provides all three.

---

## The blocking spike (run this first)

Phase 0 of the plan. Everything else assumes it passed.

```bash
pnpm test:integration -t "guest cart secret"
```

**Expected**: a Local API read passing only `req: { context: { cartSecret } }` returns the guest's
cart. **If it fails**, `hasCartSecretAccess` is not seeing the injected context and the fallback in
[research R3](./research.md) applies — stop and take that decision before building on top of it.

---

## Automated suites

```bash
pnpm test                  # unit — no database needed
pnpm test:integration      # cart operations, access control, merge, global validation
pnpm test:e2e              # the flow, both modals, responsive frames
pnpm test:a11y             # axe scan on /cart and both dialogs
pnpm lint && pnpm typecheck && pnpm check:naming && pnpm check:tokens
```

All must pass before merge; the constitution allows no manual override. Checkout changes need **two**
approving reviews.

---

## Scenario 1 — Add a piece with both options (US1)

1. `pnpm dev`, open a product with stones and sizes.
2. Press **ADD TO CART** without choosing → refused, and the message **names** the missing choice.
3. Choose a stone and a size, press again → the header badge increments.
4. Reload → the badge survives.
5. Add the same piece in a **different size**.

**Expected**: two lines, not one of quantity two. This is the invariant `cartItemMatcher` exists for
and the one the plugin's own React provider could not express — see
[research R1](./research.md).

---

## Scenario 2 — Review and adjust (US2)

Open `/cart`.

1. Each line shows photograph, name, chosen stone, chosen size, unit price, quantity.
2. Change a quantity → the summary follows, and survives a reload.
3. Press the bin → **REMOVE ITEM** asks first. Dismiss by close mark, backdrop **and** Escape;
   nothing is removed by any of them.
4. Confirm → the line and its contribution to the total both go.
5. Remove everything → the empty state appears with a route back to the catalogue, and **no summary
   card and no CHECKOUT**.

**Staleness check** — the part that is easy to skip and is the point of FR-014:

```
# with a piece in the cart, in the admin:
unpublish it → reload /cart   → line named, excluded from the total, checkout blocked
sell it out  → reload /cart   → reason in TEXT, not colour alone
change price → reload /cart   → both amounts shown; the total uses the current one
```

Verify the totals against the constitution's rule: the number on screen is computed by the loader,
not read from `cart.subtotal`. Open the cart in the Payload admin — the sidebar subtotal **may
legitimately differ** once a line is unavailable ([research R5](./research.md)).

---

## Scenario 3 — Hand off to the seller (US3)

1. In the admin, **Shop → Contact settings**, add WhatsApp with the number written naturally:
   `+1 (555) 010 20-30`. Save.
2. On `/cart`, press **CHECKOUT** with the agreement unticked → refused, and the agreement is
   identified as the reason.
3. Tick it, press again → the modal opens listing the enabled messengers with their handles.
4. Choose WhatsApp.

**Expected**: `wa.me/15550102030?text=…` — digits only, no `+`, no punctuation, and the message
carries every piece with its stone, size and quantity plus the total. This is
[research R10](./research.md) verified by hand.

5. Return to the site → **the cart still holds everything** (FR-027).
6. Choose Instagram → the chat opens **empty**, the modal said it would, and the message is on the
   clipboard.

### The customer block (FR-043 – FR-046)

Run the same checkout **four times** and compare the drafts. Only the customer block should differ:

| Who | Expect in the message |
| --- | --- |
| Signed out | Pieces, options, total. No customer block, **no ragged blank line** where it would have been, and **no redirect to sign-in at any point** |
| Signed in, profile never filled in | Byte-identical to the signed-out message |
| Signed in, name saved, no address | The name, no address |
| Signed in, name and default address saved | Both — and the address includes its **postcode** |

Two failures to watch for specifically, because each looks fine until you look closely:

- **A redirect.** If pressing CHECKOUT while signed out sends you to `/sign-in`, the composer is
  calling `requireCustomer` instead of `getCustomer` — the accidental sign-in gate FR-046 forbids
  ([research R18](./research.md)).
- **A missing postcode.** If the address in the message stops at the street, the composer reused
  `formatAddress`, which drops the postcode on purpose for the profile row. A seller posting a ring
  needs it.

With several addresses saved, mark a different one as default and confirm the message follows
(FR-044).

---

## Scenario 4 — Buy now (US4)

With **three unrelated lines already in the cart**, open a fourth product, choose its options, press
**BUY NOW**.

**Expected**: the modal describes only that piece, and the cart still holds exactly the original
three — same lines, same quantities. Check the cart page, not just the badge.

---

## Scenario 5 — The owner controls the destinations (US5)

In **Shop → Contact settings**:

| Do this | Expect |
| --- | --- |
| Change a handle | The modal shows it, no deployment |
| Enable a row with an empty destination | **Save refused**, the field named |
| Enter `aurum`, `@aurum`, `https://t.me/aurum` in turn | All three save identically |
| Untick a row | It leaves the modal; the others keep their order |
| Drag to reorder | The modal follows |
| Remove `{{items}}` from the template | **Save refused** |
| Untick every row | The customer gets the copyable fallback, not an empty modal |
| Sign in as a customer and attempt the update via the API | Refused |

Then check the **footer and the contact strip**: their WhatsApp, Telegram and Instagram icons point
at the accounts you just configured, not at the old placeholder roots. That is
[research R11](./research.md), and it is the check that catches the "owner sets the real number,
footer still says `wa.me/`" defect.

---

## Scenario 6 — Budgets and access (the gates that fail quietly)

**Bundle** — against a production server, not a build log; Next 16 with Turbopack no longer prints
per-route JS:

```bash
pnpm build && pnpm start
# then, in the browser devtools Network panel on /cart, filter JS, reload,
# and sum the gzipped transfer size of everything fetched before load.
```

**Expected**: ≤ 300KB total **and** ≤ 100KB above the 181KB framework baseline. The margin is
genuinely thin — the worst existing route already spends 84KB of the 100KB delta
([research R15](./research.md)).

**Accessibility**: complete the entire flow — add, adjust, remove, confirm, checkout, choose a
messenger — **by keyboard alone**, then again with a screen reader. Both modals must trap focus,
close on Escape, and return focus to what opened them.

**Cross-customer isolation**: sign in as A, build a cart, note its id; sign in as B and attempt to
read and mutate it via a direct Server Action POST and via the REST API. Both must be refused. The
integration suite asserts this, but it is worth seeing once.

---

## What you should *not* find

Deliberate absences. Finding any of these means scope has drifted from what the spec agreed:

- No order or request record anywhere, in the database or the admin (FR-029).
- No reference number, confirmation screen, acknowledgement email or admin queue.
- No sign-in prompt at any point in the flow (FR-031).
- No cart cleared by the site (FR-027).
- No payment of any kind.
