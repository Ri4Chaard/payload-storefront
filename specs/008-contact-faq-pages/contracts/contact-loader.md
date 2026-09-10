# Contract: The contact page loader

**Module**: `src/lib/contact/queries.ts` · **View models**: `src/lib/contact/types.ts` ·
**Mapper**: `src/lib/contact/mappers.ts`

The only module that knows `/contact` came from Payload. Everything above it sees view models — the
same seam `src/lib/catalog/`, `src/lib/story/` and `src/lib/blog/` are for their subjects, and the
reason `catalog/no-document-types` keeps documents out of components.

---

## §1 What a route may ask for

```ts
getContactPage(): Promise<ContactPage | null>
```

One function. `/contact` calls it twice — once for the body, once from `generateMetadata` — and pays
for one read, because it is `cache()`-wrapped and both calls happen inside the same render.

The channel cards are **not** part of this loader's return. They come from
`src/lib/messengers/settings.ts`, which already exists and already serves the footer and the
checkout modal:

```ts
getSocialLinks(): Promise<SocialLink[]>     // one per saved messenger, in admin order
getContactDetails(): Promise<ContactDetails> // email, phone, address, hours, maps
```

Reused unmodified. FR-008 forbids a second place to write the shop's messengers or email, and this
is what makes that structural rather than a convention: there is no field to write them into.

## §2 What comes back

```ts
interface ContactPage {
  eyebrow?: string
  heading: string
  intro?: string
  form: {
    heading: string
    body?: string
    labels: { name: string; email: string; message: string }
    submitLabel: string
    footnote?: string
    messages: { success: string; error: string }
    photo?: MediaView
  }
  /** Absent when nothing is selected, or nothing selected is still published. */
  faq?: { heading: string; questions: Question[] }
  seo: { title?: string; description?: string; image?: MediaView }
  fallbacks: { title?: string; description?: string; image?: MediaView }
}
```

Three shapes worth stating outright:

1. **`faq` is `undefined`, never `{ questions: [] }`.** FR-032 requires the band to be absent when
   no question it would show is published. Making that a property of the view model means the
   component cannot forget it, and the empty case is unit-testable without rendering anything.
2. **`fallbacks` is computed here**, from the page's own heading, intro and photograph, so
   `generateMetadata` never reaches back into a document (FR-048).
3. **No document type escapes.** `MediaView` and `Question` are view models; `payload-types` is
   named only inside this tier.

## §3 Failure modes

| Condition | Result | Why |
| --- | --- | --- |
| Database unreachable | `null` | A container build. `next build` runs with no database — `src/lib/catalog/prerender.ts` records the chicken-and-egg. The route renders chrome and nothing between rather than failing the build |
| Global never saved | the shipped defaults | `defaultValue` on every copy field, so an untouched install renders the drawn page (FR-046) |
| A selected question is unpublished | it is absent | The collection's access rule makes drafts unreachable rather than filtered, so **there is no status check in this tier** (FR-033) |
| Every selected question unpublished | `faq` is `undefined` | FR-032 |
| `photo` empty or its media deleted | `photo` is `undefined` | The band renders without it; nothing throws |

Only a **connection** failure yields `null`. A bad query or a throwing mapper must still fail the
build, or the day the database is misconfigured looks exactly like the day the page is empty — the
rule `src/lib/story/queries.ts` states and `isDatabaseUnreachable()` implements.

## §4 Read parameters

```ts
payload.findGlobal({
  slug: 'contact-page',
  depth: 2,
  overrideAccess: false,
  draft: false,
})
```

- **`depth: 2`** is the number the shape needs, not Payload's default arriving by luck: the photo
  upload and the questions relationship resolve at depth 1, and a question's own fields are plain.
  Constitution IV rules out relying on a default that happens to work.
- **`overrideAccess: false`** is what makes the access rules load-bearing rather than decorative.
- **`draft: false`** — a visitor sees published content; the admin's preview is what shows drafts.

## §5 Caching

`cache()` for per-request deduplication only. Nothing longer-lived, because the route is
`force-dynamic` and therefore has no invalidation story and needs none (R8) — a publish is visible
to the next visitor because nothing was stored.

## §6 Test obligations

Unit (`tests/unit/contact-mappers.test.ts`), against fixtures rather than a database:

- An unsaved global maps to the drawn defaults.
- A selection of three questions maps in the selected order, not in the collection's `order`.
- An empty selection, and a selection whose questions are all absent, both yield `faq: undefined`.
- `fallbacks` derive from `heading`, `intro` and `photo`, and survive those being absent.
- A deleted photo reference yields `photo: undefined` rather than throwing.
