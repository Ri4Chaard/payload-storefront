# Contract — the article's structure

**Feature**: 007-blog-articles · **Data model**: [../data-model.md](../data-model.md)

What an article is made of, and the invariants that make it readable by a screen reader as well as
by a person.

## 1. The heading outline is fixed

| Level | What                                          | Where |
| ----- | --------------------------------------------- | ----- |
| `h1`  | The article title — exactly one per page      | `ArticleHeader` |
| `h2`  | A chapter heading                             | `ArticleBody`, once per chapter |
| `h2`  | *On this page*                                | `TableOfContents` |
| `h3`  | none                                          | — |

There is no `h3` because the chapter body's editor has headings removed from its feature set
(data model). This is what makes the contents list complete by construction: every heading in the
article is a chapter, and every chapter is in the list.

The index has its own outline: `h1` is the page heading from `blog-page`, and each card's title is a
`h2` inside the mosaic.

## 2. Anchors

- `anchor = slugify(heading)`, using the rules in `src/fields/slug.ts`.
- Within one article, a repeated result takes `-2`, `-3`, … in document order.
- Anchors are derived at read time and stored nowhere.
- Each chapter heading renders `id={anchor}` and `tabIndex={-1}`, and carries a `scroll-margin-top`
  that clears the sticky header.

Renaming a heading changes its anchor and breaks a previously shared deep link to that chapter; the
link still lands on the article. Accepted, and recorded in research R10 with what a stored anchor
would cost.

## 3. The contents list

- Generated from `chapters`, in order. **Never** a second authored list (design inconsistency 2).
- Label is `tocLabel ?? heading`.
- Drawn only when the article has **two or more** chapters (FR-028).
- At ≥ 768: a rail that stays visible while the article scrolls, with the chapter currently on
  screen marked `aria-current`.
- At < 768: a card between the hero and the first chapter, listing **at most five** entries followed
  by a computed *+ N more chapters below*. The row is omitted entirely when `N` is zero — the drawn
  `+ 5 more chapters below` is a placeholder, not a string to ship (design inconsistency 3).

**Progressive enhancement**: the list is server-rendered as anchors. The client leaf adds
`aria-current` and nothing else. With scripting off, every entry still navigates.

**Reduced motion**: smooth scrolling lives inside
`@media (prefers-reduced-motion: no-preference)`. There is no JavaScript scroll animation to gate.

## 4. A chapter renders in one order

```
h2   heading
p    lede            (optional, emphasised)
     body            (rich text: paragraphs, bold, italic, links, lists)
blockquote pullQuote (optional, ruled)
```

`body` is HTML serialised in the mapper and rendered by the kit's `RichText`, which already restores
what the global reset strips from `<p>`, `<ul>`, `<ol>` and `<strong>`. `RichText` requires no change
for this feature: the pull quote is a separate field, so no `<blockquote>` styling is added to the
shared prose rules.

**On `dangerouslySetInnerHTML`**: the source is Payload, written by an authenticated admin and
serialised by lexical. It is never visitor input and never reaches the component from a URL, a form
or a query string. `RichText`'s own note says the same, and it still applies here.

## 5. Media

- The hero is a `mediaSlot`, so an article can open on a photograph or a video with no new code and
  no player dependency. When neither is set the band is omitted — nothing reserves an empty box
  (FR-022).
- `src`, `width` and `height` in the view model are always a **still** — the photograph, or the
  video's poster — so the box is reserved before anything loads.
- Alternative text comes from the `media` document, where it is already required. There is no `alt`
  field on the slot: one asset carries one description wherever it is used.
- Card photographs below the fold are lazily loaded; the hero on an article page is not.

## 6. Structured data

`Article` and `BreadcrumbList` JSON-LD on the article route, in the inline
`<script type="application/ld+json">` form the product page already uses. See research R13 for the
unresolved question of whether a breadcrumb should also be *drawn* — nothing in the design draws one,
and this ships as data only, flagged.
