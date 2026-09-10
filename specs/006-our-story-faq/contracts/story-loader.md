# Contract: The story page loader — `src/lib/story/queries.ts`

**Feature**: `006-our-story-faq`

The only module that knows the story page came from Payload. Everything above it sees the view models
in `src/lib/story/types.ts`. This mirrors `src/lib/catalog/queries.ts`, which is the module that made
spec 003's swap from fixtures to Payload a one-file change.

---

## §1 Surface

```ts
/** The composed page, or null when there is no database to read. */
export const getStoryPage: () => Promise<StoryPage | null>
```

One function. The route calls it once; `generateMetadata` calls it again and gets the same object
back for free (§4).

There is deliberately **no** `getQuestions()` export. Questions reach the page only through the FAQ
block's selection, and a second entry point would let a future caller show questions the editor did
not choose. When `/faq` is built it adds its own function here, reading the same collection.

---

## §2 What comes back

`StoryPage` as defined in [data-model.md](../data-model.md) §6:

- `blocks` — the composition, in the editor's order, **already filtered and levelled**. Empty blocks
  are dropped (FR-004); heading levels are assigned (FR-051); questions are resolved, de-duplicated
  and serialised.
- `seo` — the editor's metadata, unresolved fallbacks included, for `generateMetadata` to apply.

`null` means *the database was unreachable*, which happens exactly once in this system's life: during
the container build. It does not mean "the page is empty" — an unedited page returns a `StoryPage`
with the default composition. The two must stay distinguishable, for the reason
`src/lib/catalog/prerender.ts` gives at length.

---

## §3 Invariants the caller may rely on

1. **No document ever escapes.** No `_status`, no lexical tree, no unresolved relationship. The
   `catalog/no-document-types` lint rule enforces the boundary structurally.
2. **Drafts are unreachable.** Reads pass `overrideAccess: false`, so `adminOrPublishedStatus`
   constrains questions to published ones and the global is read at its published version. The loader
   writes no status filter of its own — that would put the rule in two places.
3. **Exactly one block carries the top heading level.** Guaranteed by the mapper, in every
   arrangement including zero page-headers and two (FR-006, FR-051).
4. **Every `StoryMedia` has `src`, `width` and `height`.** For a video these are the poster's, which
   is what lets a box be reserved before anything loads (FR-024b). A slot with neither photograph nor
   poster is dropped, not returned half-built.
5. **Order is the editor's order**, for blocks and for the questions inside the FAQ block. Nothing
   re-sorts.
6. **The same question chosen twice appears once**, de-duplicated by id, keeping its first position
   (FR-032).

---

## §4 Caching and request scope

- Wrapped in React's `cache()`, so a render that asks twice — the page body and `generateMetadata` —
  performs one read of each source. This is per-request deduplication, not a cross-request cache.
- The route is `force-dynamic` (research R6), so there is no cross-request cache to invalidate and
  **no revalidation hook exists on either the global or the collection**. A published change is
  visible to the next visitor because nothing was stored (FR-016, FR-041, SC-008).
- Do **not** introduce `use cache` / `cacheLife` / `cacheTag` here. This project is on Next 16's
  previous caching model — `next.config.mjs` sets no `cacheComponents` — and mixing the two models is
  not a change this feature should make.

---

## §5 Build-time tolerance

`getStoryPage()` returns `null` rather than throwing when Payload cannot connect, using
`isDatabaseUnreachable()` from `src/lib/catalog/prerender.ts` — the same guard
`src/lib/messengers/settings.ts` uses for the root layout, and for the same reason: the production
image is built before the migrations run.

Only a *connection* failure is tolerated. A schema mismatch, a bad query or a mapper throwing must
still fail the build, or the day the database is misconfigured looks exactly like the day the shop
has no About page. The warning is logged loudly, matching the existing two.

---

## §6 What the route does with `null`

Renders the chrome and nothing between — the same coherent-empty-page behaviour FR-053 requires of an
empty composition. It does **not** call `notFound()`: `/about` is linked from the header, the footer
and the home page, and a 404 on a link the site itself publishes is worse than a thin page.
