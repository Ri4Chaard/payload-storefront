# Contract — `src/lib/blog/blog-url.ts`

**Feature**: 007-blog-articles

One module writes every `/blog` address. This is `src/lib/catalog/listing-url.ts`'s lesson restated:
six callers assembling `basePath + query` themselves is six chances to disagree, and the
disagreement surfaces as two URLs for one view — two cache entries, two things to index, two answers
to "what is the canonical address of the Guides tab".

## 1. The addresses

| View                       | Address                          |
| -------------------------- | -------------------------------- |
| The index, newest first    | `/blog`                          |
| Narrowed to a category     | `/blog?category=guides`          |
| The first two pages        | `/blog?page=2`                   |
| Both                       | `/blog?category=guides&page=2`   |
| An article                 | `/blog/<slug>`                   |
| A chapter within an article| `/blog/<slug>#<anchor>`          |

## 2. The surface

```
BLOG_ROOT               = '/blog'
BLOG_PAGE_SIZE          = 7
blogHref({ category?, page? })  → string
articleHref(slug)               → string
```

## 3. Rules

1. **LATEST is the absence of `category`.** There is no `?category=latest`; a tab whose slug is
   `latest` would be a real category with articles in it.
2. **Page one is the absence of `page`.** `blogHref({ page: 1 })` returns `/blog`, so the canonical
   address of the first screen has one form.
3. **Parameters are emitted in a fixed order** — `category`, then `page` — so two callers asking for
   the same view produce byte-identical strings.
4. **`page` accumulates.** `?page=2` is the first fourteen articles, not the second seven. This is
   what lets `LoadMore` be reused unchanged and what makes the back button and a shared link land on
   the same grid the visitor was looking at (FR-020).
5. **Unknown input is the route's problem, not this module's.** `blogHref` writes addresses; parsing
   `searchParams` and deciding that a category does not exist — and calling `notFound()` — belongs to
   `/blog/page.tsx`. A malformed `page` falls back to 1 rather than erroring.
6. **Absolute URLs are the sitemap's business.** Everything here is root-relative; only
   `src/app/sitemap.ts` prefixes `NEXT_PUBLIC_SERVER_URL`.

## 4. Canonical addresses

`/blog` emits `alternates.canonical` for the **unnarrowed, unpaged** address, so paged and narrowed
views do not compete with it in an index. An article emits its own `/blog/<slug>`.
