# Contract: The policy route

**Feature**: `specs/009-policy-pages-cookie-consent` | **Date**: 2026-09-11

`src/app/(frontend)/legal/[slug]/page.tsx`. One route, one job.

---

## 1. Why a prefix, and why this one

Policies live under `/legal/`, not at the root. The owner chose the prefix; it also removes the
single hardest constraint this feature had.

The site already has a root-level dynamic segment — `src/app/(frontend)/(shop)/[category]/page.tsx`
— and Next.js permits exactly one per path position. Route groups do not help, because they
contribute nothing to the URL. An earlier draft of this plan therefore proposed replacing that route
with a shared root resolver that tried category first and policy second, which meant re-routing the
catalogue as a side effect of shipping legal pages.

A prefix makes that unnecessary. **`(shop)/[category]/page.tsx` is not touched by this feature**,
`listing.tsx` is not touched, and the catalogue carries no regression risk at all.

`legal` over `policy`: `/policy/privacy` reads redundantly, and *legal* is the conventional grouping
that visitors and crawlers already recognise. *Shipping & Returns* sits under it comfortably — it is
a contractual terms document, whatever the footer files it under.

The param is `[slug]`, not `[category]`. Inside `/legal/` a param named `category` would point at the
catalogue's vocabulary and mislead the next reader.

### Addresses

| Policy | Address |
| --- | --- |
| Privacy Policy | `/legal/privacy` |
| Terms & Conditions | `/legal/terms` |
| Cookie Policy | `/legal/cookies` |
| Shipping & Returns | `/legal/shipping` |
| Any the owner creates | `/legal/<their slug>` |

**No redirects are needed from the bare `/privacy`, `/terms`, `/cookies`, `/shipping`.** Those
addresses have never resolved — they are 404s in production today and they stay 404s. There is no
history to preserve, no external link to honour, and no index entry to move. The footer's `href`s
change from the bare paths to the prefixed ones in the same change that makes them content-driven.

---

## 2. Resolution

```
/legal/:slug
  ├─ a published policy with this slug  → the policy page
  └─ otherwise                          → notFound()
```

That is the whole resolver. No ordering, no fall-through, no shadowing — the namespace belongs to
this collection alone.

---

## 3. Route segment config

```ts
export const dynamic = 'force-dynamic'
```

**A choice here, not an inheritance.** Under the rejected root-resolver design this was forced: the
listing branch reads `searchParams`, and route segment config applies to the whole segment. With a
prefix, this route could have been cached and revalidated on publish instead. It is still dynamic,
for the reason `/`, `/about`, `/blog`, `/contact` and `/faq` all record:

> the production image is built with no database, so a prerendered page would bake empty on a first
> deploy and stay that way until somebody happened to edit something.

Two things follow, and both are wanted. **FR-056 is free** — there is no cache, so publishing is
visible to the very next visitor with no revalidation hook anywhere. And no hook means no risk of
reaching for the shared `invalidate()`, which walks every product slug and would evict the entire
catalogue because somebody fixed a typo in a policy — the trap `questions.ts` and `articles.ts` both
document.

The cost is a render per request on four low-traffic pages. Accepted.

There is no `generateStaticParams`.

---

## 4. `generateMetadata`

| Field | Source |
| --- | --- |
| `title` | `seo.title`, else the policy's `title` |
| `description` | `seo.description` when set, omitted otherwise |
| `alternates.canonical` | `/legal/${slug}` — the same address the footer links to (FR-053) |
| `openGraph` | `type: 'website'`, the same title and description, `url`, and `seo.image` when present |

Mirrors `/faq`'s `generateMetadata` field for field, including its no-database tolerance: when the
policy cannot be read, return a bare title rather than throwing. A container build runs this code
path even though it prerenders nothing here.

---

## 5. Rendering

| Input | Output |
| --- | --- |
| Published policy, non-empty `body` | `PageHeaderBlock` with `headingLevel={1}`, `heading={title}`, `body={subtitle}`, then the body through the kit's `RichText` inside a `Container` |
| Published policy, empty `body` | The same header, then an `EmptyState` with an honest short message. **Never `notFound()`** — FR-006 |
| Unpublished or non-existent | `notFound()`. Consistent with FR-015c, which removes the footer link at the same moment, so nothing on the site points at it |

`PageHeaderBlock` already draws a centred, uppercased display heading with an optional capped
paragraph beneath it at `md` and up — the four drawn pages' header band exactly. Constitution II: it
is reused, not reimplemented.

---

## 6. What this route must not do

- It must not read `searchParams`. A policy is a document, not a filtered view, and a
  `searchParams` read here would be the one thing that could make the caching decision in §3
  irreversible.
- It must not import from `src/app/(frontend)/(shop)/`. The two have nothing to share, and the
  absence of that import is what keeps this feature off the catalogue's critical path.
