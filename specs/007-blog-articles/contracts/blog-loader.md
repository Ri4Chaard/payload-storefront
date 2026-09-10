# Contract — `src/lib/blog/queries.ts`

**Feature**: 007-blog-articles · **Data model**: [../data-model.md](../data-model.md)

The only module in this feature permitted to read Payload documents. Everything below it receives
view models as props. This is the rule spec 002 set and the mechanism behind the catalogue's
`queries.ts` — a later spec can rewrite this file and no component changes.

## 1. The boundary

`eslint-rules/catalog-boundary.mjs` forbids components from importing `@/payload-types`. Its
allowlist must gain `src/lib/blog/`, in the same change that creates it — the rule fires on correct
code otherwise, and a developer who meets a lint error on a file they just wrote correctly will
reach for a disable comment.

## 2. The surface

| Function              | Arguments                                   | Returns                    | Read as |
| --------------------- | ------------------------------------------- | -------------------------- | ------- |
| `getBlogIndex`        | `{ category?: string; page: number }`        | `BlogIndexView \| null`    | public |
| `getArticle`          | `slug: string`                               | `ArticleView \| null`      | public |
| `getArticleSlugs`     | —                                            | `string[]`                 | public |
| `getBlogCategories`   | —                                            | `BlogCategory[]`           | public |

Every function is wrapped in React `cache()`, so a route that reads for `generateMetadata` and again
for the render pays for one query. `/blog/[slug]` does exactly that.

## 3. Rules the loader owns

1. **Published only, always.** Reads use default access, so `adminOrPublishedStatus` applies and a
   draft is absent from the index, from `getArticleSlugs` (and therefore from `generateStaticParams`
   and the sitemap) and from `getArticle`. There is no `overrideAccess: true` anywhere in this file.
2. **`null` means the database was unreachable.** An empty index and an unreadable one must stay
   distinguishable — `src/lib/catalog/prerender.ts` records why at length. `getBlogIndex` returns
   `null` only for that case; an index with no articles returns a view model whose `cards` are empty.
3. **A missing article is `null`, and the route answers 404.** A category that does not exist is the
   route's `notFound()`, not an empty grid (FR-016).
4. **Depth is stated, not defaulted.** The index resolves the category and the hero's still image and
   nothing else; the article additionally resolves its chapters. A `depth` that pulls the whole
   graph makes every card pay for relationships it will not draw.
5. **Pagination is inclusive-from-one.** `page: 2` returns the first `2 × 7` articles, matching the
   catalogue's `LoadMore` semantics. `total` is the count *after* narrowing, which is what the
   "Showing N of M" line means.
6. **A page beyond the end is coherent, not an error.** It returns whatever exists and a `moreHref`
   of `null` (FR-020 edge case).

## 4. Mapping happens here, never in a component

`src/lib/blog/mappers.ts` owns four derivations, each unit-tested without rendering:

- **Anchors** — heading → slug, deduplicated per article in document order (research R10).
- **Contents** — `chapters` → `contents`, using `tocLabel` where present, empty below two chapters.
- **Emphasis** — index → `{ tabletLead, desktopWide }` per the R4 table.
- **Dates** — one ISO value and one display string per document (research R12).

Serialising lexical to HTML also happens here, via `convertLexicalToHTML`, exactly as
`src/lib/story/mappers.ts` does for a question's answer. A component never sees an editor state.

## 5. What the loader must not do

- Decide what a page is called, what a URL looks like (that is `blog-url.ts`), or what is cached
  (that is the route).
- Throw for an article that does not exist.
- Return a document, a `_status`, or an unresolved relationship.
