# Quickstart: Policy Pages and Cookie Consent

**Feature**: `specs/009-policy-pages-cookie-consent` | **Date**: 2026-09-11

How to prove this feature works end to end. Everything below is a check a person can run; nothing
here is implementation.

---

## Prerequisites

```bash
pnpm install
docker compose up -d db          # PostgreSQL
pnpm payload migrate             # includes this feature's migration
pnpm seed                        # catalogue
pnpm payload run scripts/seed-policies.ts
pnpm dev
```

The policy seed is idempotent by slug — running it twice creates nothing new and overwrites nothing
an owner has edited.

---

## 1. The four dead links are dead no longer (US1, SC-001)

From any page of the site, click each footer destination:

| Link | Expect |
| --- | --- |
| *Privacy Policy* | `/legal/privacy`, headed **Privacy Policy**, site header and footer present |
| *Terms & Conditions* | `/legal/terms` |
| *Cookie Policy* | `/legal/cookies` |
| *Shipping & Returns* (Customer Care) | `/legal/shipping`, subtitle reading as a sentence rather than a date |

Then confirm the whole chrome resolves:

```bash
# Every footer and nav destination should answer 200. Nothing should 404.
for p in / /all-jewelry /about /blog /contact /faq /cart \
         /legal/privacy /legal/terms /legal/cookies /legal/shipping; do
  printf '%s -> ' "$p"; curl -s -o /dev/null -w '%{http_code}\n' "http://localhost:3000$p"
done

# The bare paths are still 404s, and that is correct — they never resolved, so nothing
# is owed a redirect. Confirm no footer link still points at one.
for p in /privacy /terms /cookies /shipping /legal /legal/nope; do
  printf '%s -> ' "$p"; curl -s -o /dev/null -w '%{http_code}\n' "http://localhost:3000$p"
done
```

**The catalogue is not touched by this feature** — the `/legal/` prefix is precisely what avoided
sharing a route with it — so there is no non-regression pass to run. One sanity check is still worth
the ten seconds, because the claim is worth confirming rather than assuming:

```bash
for p in /rings "/rings?colour=black" /not-a-real-page; do
  printf '%s -> ' "$p"; curl -s -o /dev/null -w '%{http_code}\n' "http://localhost:3000$p"
done
# 200, 200, 404 — exactly as before this feature.
```

**Mobile**: at 390px, each policy is one readable column with no horizontal scroll.

---

## 2. The owner rewrites a policy (US3, SC-005)

1. Admin → **Content → Policies → Privacy Policy**.
2. Change a sentence in the body. Add a heading, a bullet list, a bold run-in term, and a link.
3. **Save as draft.** Reload `/legal/privacy` as a visitor — the old text is still there.
4. **Publish.** Reload — the new text appears, with no deploy and no cache to wait on.
5. Change only the body, publish, and confirm the **effective date is unchanged** (FR-008).
6. Use **Versions** to restore the previous revision; confirm the page follows.

---

## 3. A fifth policy, created by the owner (US3, FR-015)

This is the check that separates "four pages" from "a list".

1. Admin → **Policies → Create New**. Title *Accessibility Statement*; the slug fills itself in.
2. Set **Footer placement** to *Legal*, **Footer order** to `40`, write a paragraph, publish.
3. `/legal/accessibility-statement` renders, and the link appears in the footer's legal row **last**.
4. Unpublish it. The page 404s **and the footer link is gone** (FR-015c).

### Slug collisions are refused at save time

| Try slug | Expect |
| --- | --- |
| `privacy` | Rejected, naming the policy that holds it |
| `rings` | **Accepted** — `/legal/rings` collides with nothing. The prefix means this collection owns its namespace, so there is no reserved-word list to maintain and none to test. |

---

## 4. The banner and the three choices (US2, SC-002, SC-003)

Use a **fresh browser profile** or a private window for each run.

| Action | Expect |
| --- | --- |
| Load any page | Banner appears bottom-anchored; the page behind it is readable and scrollable |
| Inspect layout shift | No CLS contribution — the banner is fixed, it does not push content |
| Press *Agree* | Banner closes; navigate and reload — it does not return |
| Press *Allow Technical Cookies* (fresh profile) | Same, and nothing optional is recorded |
| Press *Configure All Cookies* (fresh profile) | Chooser opens listing **Strictly necessary**, shown permanently on and explained, with a message that nothing optional is in use |
| Ignore it and browse (fresh profile) | Banner is still present on the next page, still unanswered |

**At 390px**, the three buttons stack full-width and the banner's purpose plus all three actions are
reachable in one tap without scrolling the banner (SC-002).

**Persistence** (SC-003): decide, then reload, then open a second tab, then close the browser and
return. The banner stays away in all four.

**Re-entry** (FR-032): after deciding, the footer carries a cookie settings entry point. Open it —
the chooser shows the current choices. Save a narrower set and confirm it takes effect immediately.

### Cookies blocked entirely

Block all cookies in browser settings and load the site. The banner must appear, be fully usable,
and never throw; the decision simply cannot be stored, so it reappears on the next page. **Nothing
on the page may break.**

---

## 5. Nothing optional is set or contacted (SC-004, SC-008a)

The central privacy claim, and it must be measured rather than asserted.

With a fresh profile, and with each of the three decisions in turn, browse the catalogue, open a
product, add to the cart, and open a policy page. Then in DevTools:

- **Application → Cookies**: only the Payload session cookie (if signed in), `aurum-cart`,
  `aurum-cart-count`, and `aurum-consent`. Nothing else, under any decision.
- **Network → filter by third party**: zero requests to any origin other than this site's own.
- **Application → Local Storage / Session Storage**: empty.

---

## 6. The owner controls when it asks (US4, SC-006)

| Step | Expect |
| --- | --- |
| Decide as a visitor, then admin → **Cookies → Cookie banner**, advance **Consent version** | Reload as that same visitor: the banner returns, and opening the chooser shows the previous answers pre-filled |
| Do not answer | The previous decision does not count as consent for the new version |
| Set **Enabled** to off | A fresh visitor sees no banner, and nothing optional is treated as consented |
| Turn it back on | A visitor who had already decided is **not** asked again |

---

## 7. Categories stay truthful (US5, SC-007, SC-012)

1. Admin → **Cookies → Cookie banner → Categories**. Reword the necessary category's purpose.
   Reload — the chooser shows the new wording, no deploy.
2. Add an optional category (*Analytics*, say). A visitor who had already decided is asked again, and
   it arrives **switched off** (FR-030, FR-040).
3. Confirm there is **no field anywhere** accepting a script, a snippet, or a measurement ID
   (FR-048). If one exists, the implementation is wrong.
4. Read the published Cookie Policy against the chooser's list: every category described on the page
   is offered, and every category offered is described (SC-012).
5. Remove the added category. It disappears from the chooser and stored decisions about it are
   ignored without error.

---

## 8. Found and shared (US6, SC-010)

```bash
curl -s http://localhost:3000/sitemap.xml | grep -E '/legal/'
# All four published policy addresses appear.
```

For each page, view source and confirm a `<title>`, a meta description, `rel="canonical"` pointing at
the same address the footer links to, and Open Graph tags. Set an SEO title on one policy in the
admin and confirm it overrides the fallback.

Unpublish a policy and confirm its address leaves the sitemap.

---

## 9. Gates

```bash
pnpm lint
pnpm typecheck
pnpm check:naming
pnpm check:tokens
pnpm check:styles
pnpm check:stories
pnpm test                 # includes the consent-record unit suite
pnpm test:integration     # includes policies access control and slug collisions
pnpm test:a11y            # four pages + banner + chooser, zero violations
pnpm test:e2e             # the consent journey
pnpm test:stories
```

### Accessibility, by hand as well (SC-009)

Automated scans do not catch these:

- Tab from the top of a fresh page — the banner is reachable early, not after the whole page.
- Every banner and chooser control is operable by keyboard with visible focus.
- The banner does **not** trap focus (the page behind it stays usable); the chooser **does**, and
  returns focus to what opened it on close.
- With a screen reader, the banner is announced without stealing focus mid-sentence.
- With `prefers-reduced-motion`, the banner's entrance respects it.

### Performance budget (SC-011, Constitution V)

Measured against a **production server**, not a build log — Next 16 with Turbopack no longer prints
per-route JS, and what matters is what the browser fetches before load, gzipped as served.

```bash
pnpm build && pnpm start
pnpm measure:js http://localhost:3000 / /all-jewelry /products/<slug> /legal/privacy
```

### Baseline, measured 2026-09-11 before any code in this feature landed (T001)

Every `/_next/static/**.js` the route's HTML references, gzipped locally at default level so the
figure does not depend on how the server was configured.

| Route | Chunks | Gzipped initial JS |
| --- | --- | --- |
| `/` | 15 | **235.1 KB** |
| `/all-jewelry` | 13 | **220.3 KB** |
| `/products/zolotoe-kolco-s-brilliantom` | 15 | **235.1 KB** |
| `/faq` | 14 | **225.2 KB** |

`/faq` is the closest existing analogue to a policy page — content, no catalogue interactivity — so
it is the row `/legal/privacy` should be compared against rather than `/`.

> **Not directly comparable to the constitution's 181KB framework baseline.** That figure was
> measured on 2026-09-03 against a 404 page carrying no application code; this one counts every
> chunk the route's HTML references. What SC-011 is accountable for is the **delta** between this
> table and the same measurement after the banner lands. Re-measure with the identical script and
> method or the comparison is worthless.

Record gzipped initial JS for `/`, `/all-jewelry`, `/products/<slug>`, and `/legal/privacy`. Every route
must be ≤ 300KB total **and** ≤ 100KB above the 181KB framework baseline. This feature adds a client
component to the root layout, so the delta is charged to **every** route — compare against the
figures recorded before the change, and confirm the chooser's code is absent from the initial bundle
and arrives only when *Configure All Cookies* is pressed.

---

## 10. Editorial verification (Constitution — Development Workflow)

Not optional, and not satisfied by the seed script. In the Payload admin, actually:

- create a new policy from scratch, preview it, and publish it;
- edit a category and see the chooser change;
- advance the consent version and watch a visitor be re-asked.

A block or content model that renders correctly but is unusable in the admin is a defect regardless
of how well it renders.
