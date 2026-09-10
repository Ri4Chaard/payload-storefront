# Quickstart — verifying the blog end to end

**Feature**: 007-blog-articles · **Plan**: [plan.md](./plan.md)

How to prove this feature works, in the order that finds problems earliest. Run it before opening a
pull request; the Constitution's "editorial verification" gate means §4 is not optional.

## Prerequisites

- Node ≥ 22, pnpm, and a reachable PostgreSQL (the `.env` the rest of the project uses).
- The schema applied and the generated types current:

```bash
pnpm payload migrate        # applies 20260910_135959_blog_articles
pnpm generate:types         # payload-types.ts must be committed with the schema change
pnpm generate:importmap     # the chapters array's custom RowLabel is resolved through this
```

- Content to look at:

```bash
pnpm seed                   # extended by this feature: 4 categories, the drawn copy, 7 articles
                            # (only the first has chapters — it is the one the design draws a page for)
```

## 1. Static gates first — they are the cheapest

```bash
pnpm typecheck
pnpm lint                   # includes catalog/no-document-types; a component importing
                            # @/payload-types fails here, not in review
pnpm check:naming           # every new path kebab-case
pnpm check:tokens
pnpm check:styles
pnpm check:contrast         # the category badge over a photograph is the new risk
pnpm check:stories          # the promoted LoadMore and EmptyState must keep their stories
```

## 2. The logic that has no pixels

```bash
pnpm test                   # unit — tests/unit/blog-mappers.test.ts
pnpm test:integration       # against a real database — tests/integration/blog-articles.test.ts
```

The unit suite is where the four derivations are proved, and each has a case that is easy to get
wrong:

| Assertion | The case that catches it |
| --------- | ------------------------ |
| Anchors are unique | Two chapters both headed *Summary* → `summary`, `summary-2` |
| Contents are derived | `tocLabel` wins over `heading`; one chapter yields an empty list |
| Emphasis follows the index | Card 0 and card 6 are wide at xl; card 0 and card 5 lead at md |
| Dates format once | `2026-08-08` → `August 08, 2026`, and the ISO value is untouched |

The integration suite proves the things a route-level check cannot:

- An unpublished article is absent from `find()` **and** from a direct `findByID` under default
  access — the API path, not only the page.
- A duplicate slug is refused at save.
- Deleting a referenced category leaves its articles published and yields no badge (FR-041).
- Saving an article without a title, standfirst, category or publication date is refused, and the
  message names the field.

## 3. The pages

```bash
pnpm dev
```

Then walk these, at 1920, 768 and 390:

| Address | What to look for |
| ------- | ---------------- |
| `/blog` | Seven cards in the drawn rhythm — wide + narrow, three narrow, narrow + wide. No horizontal page scroll at any width |
| `/blog?page=2` | The first fourteen, not the second seven. Scroll position preserved when the control is used |
| `/blog?category=guides` | Only guides (the seed puts two there); the tab underlined, not merely tinted; the narrowing survives *load more* |
| `/blog?category=nonsense` | 404, not an empty grid |
| `/blog` with the seed removed | The heading still renders, with the empty message and no load control |
| `/blog/how-to-choose-the-perfect-diamond` | Eyebrow, one `h1`, standfirst, hero, chapters. The rail stays put as you scroll and marks the chapter you are reading |
| `…#clarity-beauty-beyond-perfection` | Lands the heading clear of the sticky header, and focus is inside the chapter |
| `/sitemap.xml` | Absolute URLs, the index and every published article, no drafts |

Two checks that are easy to skip and are the ones most likely to be broken:

- **Scripting off.** Disable JavaScript. Every tab still navigates, *load more* still adds articles,
  every contents entry still jumps. Only the "you are reading this chapter" marker disappears.
- **Reduced motion.** Turn it on at the OS level. A contents entry jumps instantly rather than
  gliding.

## 4. Editorial verification — required by the Constitution

Shipping a content model that is unusable in the admin is a defect regardless of how well it
renders. In `/admin`:

1. Create an article from an empty form. Confirm the slug fills itself in from the title.
2. Save it as a draft. Confirm `/blog` does not list it and its address 404s in a signed-out browser.
3. Add three chapters, reorder them by dragging, and confirm the contents list follows.
4. Rename the article. Confirm the address does **not** move.
5. Publish. Confirm it appears on `/blog` and at its address without a restart.
6. Replace the hero photograph. Confirm the article page shows the new one — this is the cached
   route family, so it is the check that proves the invalidation hook is wired (research R6).
7. Switch the hero to a video and back. Confirm the poster requirement is enforced and the message
   names the slot.
8. Delete a category that an article uses. Confirm the article stays published and its card loses
   the badge rather than the page breaking.

## 5. Accessibility and performance

```bash
pnpm test:e2e               # tests/e2e/blog.spec.ts, blog-admin.spec.ts
pnpm test:a11y              # /blog, a narrowed /blog and an article, at three widths
pnpm test:stories           # Storybook's own a11y pass over the four new components
```

Then the budget, measured against a production server rather than a build log — Next 16 with
Turbopack no longer prints per-route JS:

```bash
pnpm build && pnpm start
```

Record the gzipped JavaScript fetched before load on `/blog` and on an article. Both must sit within
300KB total and within 100KB above the framework baseline. The only client code this feature adds is
the contents-rail observer, so a large number here means something was made a client component by
accident — check for a stray `'use client'` before adjusting anything else.

**Measured on 2026-09-10**, against a production server, gzipped as served — request each chunk with
`Accept-Encoding: gzip` and do NOT let the client decompress, or the figures come out around 60%
too high and mean nothing:

| Route | Gzipped | Above baseline |
| --- | --- | --- |
| A 404, carrying no application code | 181.6KB | — (this is the baseline) |
| `/blog` | 190.9KB | 9.3KB |
| `/blog/<slug>` | 186.8KB | 5.2KB |

The 404 reproduces the 181KB the constitution recorded on 2026-09-03, which is what says the
measurement method is right rather than the numbers being flattering.

**Two failures in `pnpm test:stories` predate this feature and are not its to fix.** Four
`UI/Media` and `UI/VideoMedia` stories 404 on `/media/sample.mp4` — `media/` is gitignored, so that
file has never been in the repo and those stories have been broken on a fresh checkout since spec
006. And `hero holds the drawn height at each breakpoint` measures 840px against an expected 754 at
390. Both reproduce with this feature's changes stashed.

## 6. Rollback

```bash
pnpm payload migrate:down   # then `pnpm payload migrate && pnpm seed` to get back
```

The migration's `down` drops the seven new tables. Nothing existing changes shape, so a rollback is
a drop and a redeploy.

**Verify it against a database with content in it, not an empty one** — and this is not boilerplate
advice. The generated `down` did not work: Payload emits `DROP TABLE ... CASCADE` for the new tables
and then `DROP CONSTRAINT` for the foreign keys those tables had, but CASCADE has already removed
them, so Postgres aborts on `constraint … does not exist`. Four `IF EXISTS` clauses fix it, and the
migration file explains why at length. Nothing except running the rollback would have found it.

If the migration is ever regenerated, the bug comes back with it.
