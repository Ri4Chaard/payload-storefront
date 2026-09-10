# Quickstart: verifying Our Story and the shared FAQ

**Feature**: `006-our-story-faq` | **Date**: 2026-09-10

How to prove the feature works, end to end. Each section maps to success criteria in
[spec.md](./spec.md) so a reviewer can check the claim rather than take it.

---

## Prerequisites

```bash
pnpm install
docker compose --profile dev up -d          # Postgres
pnpm payload migrate                        # includes this feature's migration
pnpm seed                                   # catalogue + the story page's drawn defaults
pnpm dev
```

An admin account is needed for everything in §2 onwards. The admin panel is at `/admin`.

---

## 1. The dead links are alive — SC-001

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/about
```

Expect `200`. Then in the browser, follow all three routes to the page and confirm each lands:

- header → **About us**
- footer → **ABOUT / Our Story**
- home page → **Discover our story**

The fourth footer link, **CUSTOMER CARE / FAQ** → `/faq`, still 404s. That is correct — the standalone
FAQ page is out of scope for this feature.

---

## 2. Everything is editable — SC-002, SC-003

In `/admin` → **Content** → **Story page**:

1. Change the page headline. Save as draft. Confirm `/about` is **unchanged** (FR-015).
2. Publish. Reload `/about` and see the new headline.
3. Open **Versions** and restore the previous one.

Then audit: walk the rendered page top to bottom with the admin form open beside it. Every visible
string must appear in the form. Any string you cannot find is a Constitution I defect, not a
cosmetic one.

---

## 3. The page is composed, not fixed — SC-011, SC-012

Still in **Story page**, in the `body` blocks field:

1. **Reorder** — drag *From diamond to jewel* above *The Aurum Standard*. Publish. The live page
   follows the new order.
2. **Add** — add a second **Banner** block, fill it, set `textSide: right`. Publish. It renders where
   you placed it, with no code change.
3. **Remove** — delete it again. The bands above and below meet correctly.
4. **Heading survival** — drag a Banner to the very top, above the page header. Publish. Then:

```bash
curl -s http://localhost:3000/about | grep -c '<h1'
```

Expect exactly `1`, in every arrangement you try — including one with the page-header block deleted,
and one with two of them.

---

## 4. Video in a slot — SC-004, SC-004a

In `/admin` → **Media**, upload a short `.mp4`. Confirm an oversized file or a `.mov` beyond the
accepted formats is **refused at upload** with a message naming the limit (FR-021b).

Then in **Story page**, on any block's media slot:

1. Set **kind** to *Video*, choose the upload, and try to publish **without a poster**. It must be
   refused, naming the slot (FR-022, FR-027).
2. Add the poster and publish. The band renders the video in the same frame the photograph occupied,
   at 1920, 768 and 390.
3. Confirm there is **no field anywhere** in the slot that accepts a pasted address (FR-021).

**Deferred loading** — open DevTools → Network, filter to Media, and load `/about` without scrolling:

- the video file must **not** appear until you scroll its band into view (FR-024a, SC-004a).

**Reduced motion** — enable it (macOS: System Settings → Accessibility → Display → Reduce motion) and
reload:

- no video plays, and the video file **never** appears in the network panel (FR-024).

---

## 5. Questions are shared, not owned — SC-009

In `/admin` → **Content** → **FAQ**:

1. Create a question. Confirm it cannot be published with an empty question or empty answer (FR-030).
2. Write an answer containing a link and a bulleted list. Confirm both render on `/about` when the
   question is opened (FR-029).
3. Select it in the Story page's FAQ block. Reorder the selection; the page follows.
4. Select the same question **twice**. It appears **once** (FR-032).
5. Unpublish it. It disappears from `/about` with **no edit to the story page** (FR-033).
6. Unpublish every question. The whole FAQ band is absent — no heading over nothing (FR-034).

Then confirm the separateness that matters: unpublish the **story page** itself. The questions still
exist and are still editable. They are not owned by it (FR-031).

---

## 6. Empty and partial states — SC-010

Three states, none of which may break:

| State | How | Expect |
|-------|-----|--------|
| Every band filled | the seeded default | the drawn page |
| One band only | delete the rest | a coherent short page |
| No blocks at all | empty the `body` field | chrome, metadata, nothing between — not an error (FR-053) |

Also: add a block and leave it unfilled. It must be **absent**, not an empty frame (FR-004).

---

## 7. Accessibility — SC-005

```bash
pnpm test:a11y                    # Playwright a11y project, axe over /about
```

Zero violations at Level AA, at all three widths, with a question both open and closed. Then by hand:

- Tab through the whole page. Every link, button and question header takes a visible focus ring.
- Open and close questions with Enter and Space.
- With a screen reader, list the headings: one page title, band headings one level below, no skips.
- Open two questions at once — opening one must not close another (FR-035).

---

## 8. Performance and budget — SC-006, SC-007

Against a **production server**, not a dev server and not a build log — Next 16 with Turbopack does
not print per-route JS:

```bash
pnpm build && pnpm start
```

Then measure what the browser fetches before load, gzipped as served, on `/about`:

- **≤ 300KB total**, and **≤ 100KB above the 181KB framework baseline** measured 2026-09-03.
- Record both numbers in the task notes. A budget claimed and not measured is not a budget.

Lighthouse (mobile) with every media slot filled and at least one a video:

- LCP ≤ 2.5s, CLS ≤ 0.1. Watch the video bands specifically — CLS there would mean a poster is
  missing or a box is not being reserved.

---

## 9. Publishing is never stale — SC-008

Change a headline, publish, and reload once. The change is there. There is no cache to wait out —
`/about` is `force-dynamic` (see [contracts/story-loader.md](./contracts/story-loader.md) §4), which
is why this test is one reload rather than a timing exercise.

---

## 10. The gates

All must pass before merge, no manual override:

```bash
pnpm lint            # incl. design-tokens and catalog-boundary
pnpm typecheck       # payload-types must be current and committed
pnpm check:naming    # kebab-case paths — catches macOS case-insensitivity bugs CI would find first
pnpm check:styles
pnpm check:tokens
pnpm check:stories   # RichText and Media are UI-kit components and need stories
pnpm test            # unit — heading ownership, empty-band dropping, de-duplication
pnpm test:integration # access rules against a real database
pnpm test:e2e
pnpm test:a11y
```

**Plus the editorial check Constitution IV makes a merge gate**: a change to a block or content model
must be verified in the Payload admin by actually creating and previewing content before merge.
Sections 2–6 above *are* that check — a block that renders correctly but is unusable in the admin is
a defect regardless of how it looks on the page.

---

## 11. Rollback

The migration must be reversible against a database with content in it:

```bash
pnpm payload migrate:down
```

Verify the catalogue, the cart and the account pages still work afterwards — the blast radius of this
migration should be `questions`, `story_page` and the block tables, and nothing else.
