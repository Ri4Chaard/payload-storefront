/**
 * Publishing invalidates the pages that draw the published thing (003/T294).
 *
 * Constitution V calls stale content after a publish a defect, and one of this site's routes can go
 * stale that way: **every product page is cached**, whether it was prerendered from
 * `generateStaticParams` or rendered on demand and kept. Without something on this side, an owner
 * could change a price in the admin and watch the old one stay on the page until the next
 * deployment.
 *
 * **Two cached route families, and six routes deliberately absent.** `/products/[slug]` has been
 * cached since spec 003; `/blog/[slug]` joins it in spec 007, for the same reason — many pages,
 * each a pure function of one document, changing rarely and read often.
 *
 * The absent ones are absent because they are not cached. `/[category]` and `/all-jewelry` read
 * `searchParams` — a filtered grid is a function of the query string — and `/`, `/about` and
 * `/blog` are `force-dynamic` because a page prerendered from a database the container build cannot
 * reach would bake empty and stay empty. `/cart` (spec 005) is the sixth: it reads the session and
 * the cart cookie, so it is per-visitor by construction and there is no shared entry to invalidate.
 * A cart mutation settles with `refresh()` instead, which refreshes the one client that asked —
 * `revalidatePath` there would evict catalogue pages for everybody because somebody changed a
 * quantity. If any of these is ever made cacheable, its path belongs in `invalidate()` below, and
 * this paragraph is where to look for why it is not there already.
 *
 * **There is no time-based revalidation anywhere.** An interval is a guess in both directions: too
 * long and a publish is late, too short and pages are rebuilt for nobody. Every write that can
 * change a page goes through Payload, so an exact signal is available, and this is it.
 */

import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  GlobalAfterChangeHook,
  Payload,
  RequestContext,
} from 'payload'

/**
 * Pass this as `context` on a Local API write that is NOT a publish — the seed script, above all.
 *
 * Seeding runs in its own process (`payload run`), so there is no request scope for
 * `revalidatePath` to reach; it throws `Invariant: static generation store missing` rather than
 * doing nothing. And when a dev server happens to be running alongside, that server is a DIFFERENT
 * process whose cache this one could not have invalidated anyway. Skipping is not a workaround
 * here, it is the only correct answer.
 */
export const skipRevalidation: RequestContext = { disableRevalidate: true }

/**
 * Every cached path the catalogue can change, named one at a time.
 *
 * **Literal paths, not the `/products/[slug]` pattern — this was measured, not assumed.** The
 * pattern form is the obvious way to say "every product page", and against a page that had been
 * rendered on demand it works. It does not touch a page that `generateStaticParams` prerendered at
 * build: with the pattern, a product whose title had changed in the database kept serving the old
 * HTML through repeated requests, `x-nextjs-cache: HIT` every time, and the literal path fixed it
 * on the next request. Since every published piece IS prerendered, the pattern would have
 * invalidated almost nothing.
 *
 * **Every product page, rather than only the one that changed.** A product page draws its own
 * piece, the shop settings, the category name in its eyebrow, and its collection-mates in _Complete
 * the Collection_ — so editing one product changes its mates' pages, editing a category changes the
 * eyebrow on every piece in it, and re-uploading a photograph can change any of them. One cheap
 * query for the slugs is honest about that; working out exactly which pages are affected would take
 * several.
 *
 * It is also cheaper than it reads. Marking a path stale does not rebuild anything — Next
 * regenerates a page when it is next visited — so a catalogue-wide invalidation costs one render
 * each for the pages someone actually opens.
 *
 * **Drafts are included on purpose**, which is why this query does not pass `overrideAccess:
 * false` like every read in `queries.ts` does. A piece that was just unpublished is exactly the one
 * whose page must stop being served, and asking only for published pieces would leave it up.
 *
 * `next/cache` is imported here rather than at the top of the file so that a process with no Next
 * server around it — `payload run`, a migration — never loads it at all.
 */
async function invalidate(payload: Payload, orphanedSlug?: string): Promise<void> {
  const { revalidatePath } = await import('next/cache')

  const { docs } = await payload.find({
    collection: 'products',
    depth: 0,
    limit: 0,
    // Only the segment is needed. Resolving the whole catalogue's relationships to throw them away
    // would make every save in the admin pay for a page render.
    select: { slug: true },
  })
  for (const product of docs) revalidatePath(`/products/${product.slug}`)

  // A renamed piece leaves a page at an address no query will ever return again. It has to go, or
  // the old URL keeps serving a piece that has moved.
  if (orphanedSlug) revalidatePath(`/products/${orphanedSlug}`)

  /*
    The blog's pages, for the one write that can reach both families: a photograph.

    `media` carries this hook, and a re-uploaded photograph can be a product's gallery image OR an
    article's hero — the same document, in two cached route families. Marking only the catalogue
    would leave an article serving the old picture indefinitely, and there is no way to tell from
    here which of the two a given upload is used by without a query per article.

    It is cheaper than it reads, for the same reason the product loop is: marking a path stale does
    not rebuild anything. A blog of forty articles costs one `select: { slug: true }` query here and
    one render each for the pages somebody actually opens.

    Note this is the SHARED invalidation. An article's own edit does NOT come through here — see
    `revalidateArticleOnChange` below, which exists precisely so that a typo in a paragraph does not
    evict the entire product catalogue.
  */
  const articles = await payload.find({
    collection: 'articles',
    depth: 0,
    limit: 0,
    select: { slug: true },
  })
  for (const article of articles.docs) revalidatePath(`/blog/${article.slug}`)
}

/**
 * One article's page, and the address it has just left. Nothing else (spec 007, FR-037, research
 * R6).
 *
 * **Separate from `invalidate()` on purpose, and this is the whole point of the file's design.**
 * The shared function walks every product slug, because editing one product genuinely does change
 * its mates' pages, its category's eyebrow, and the row it appears in. None of that is true of an
 * article: an article's page draws that article and nothing draws it back. Routing a blog edit
 * through the shared path would evict the entire catalogue because somebody fixed a typo —
 * `src/collections/questions.ts` records refusing exactly that trade for exactly this reason.
 *
 * `/blog` itself is absent because it is `force-dynamic`; there is no cache entry for it to hold a
 * stale grid.
 */
async function invalidateArticle(slug: string, orphanedSlug?: string): Promise<void> {
  const { revalidatePath } = await import('next/cache')

  revalidatePath(`/blog/${slug}`)
  if (orphanedSlug && orphanedSlug !== slug) revalidatePath(`/blog/${orphanedSlug}`)
}

/**
 * A path no query will name any more: the address a renamed document has just left, or the one a
 * deleted document used to hold.
 *
 * `undefined` for every collection whose documents are not pages — a category and a size have slugs
 * of their own, and neither is an address anybody can visit. `products` and `articles` are the two
 * that are, and the caller decides which prefix to put in front of what comes back.
 */
const renamedFrom = (
  collectionSlug: string,
  doc: unknown,
  previousDoc: unknown,
): string | undefined => {
  if (collectionSlug !== 'products' && collectionSlug !== 'articles') return undefined

  const before = (previousDoc as { slug?: unknown } | undefined)?.slug
  const after = (doc as { slug?: unknown } | undefined)?.slug
  return typeof before === 'string' && before !== after ? before : undefined
}

/** The slug on a document, when it has one. */
const slugOf = (doc: unknown): string | undefined => {
  const slug = (doc as { slug?: unknown } | undefined)?.slug
  return typeof slug === 'string' ? slug : undefined
}

/**
 * Attach to `afterChange` on any collection whose documents reach the storefront. Publishing,
 * unpublishing, editing and restoring from trash all arrive here.
 */
export const revalidateOnChange: CollectionAfterChangeHook = async ({
  collection,
  context,
  doc,
  previousDoc,
  req,
}) => {
  if (context.disableRevalidate) return
  await invalidate(req.payload, renamedFrom(collection.slug, doc, previousDoc))
}

/**
 * The same for a deletion, which takes a piece off the page as surely as unpublishing it.
 *
 * The deleted piece is already gone from the query inside `invalidate`, so its own path is passed
 * in the same way a renamed one is — otherwise its page would keep being served after the document
 * behind it stopped existing.
 */
export const revalidateOnDelete: CollectionAfterDeleteHook = async ({
  collection,
  context,
  doc,
  req,
}) => {
  if (context.disableRevalidate) return
  await invalidate(req.payload, renamedFrom(collection.slug, undefined, doc))
}

/** And for the shop settings, whose three accordion headings and bodies are on every product. */
export const revalidateGlobalOnChange: GlobalAfterChangeHook = async ({ context, doc, req }) => {
  if (!context.disableRevalidate) await invalidate(req.payload)
  // A global's `afterChange` is expected to return the document, unlike a collection's.
  return doc
}

/**
 * Attach to `afterChange` on `articles` (spec 007, T051/T053).
 *
 * Publishing, unpublishing, editing and restoring from trash all arrive here, and all of them
 * change what `/blog/<slug>` should serve — including unpublishing, which has to make a page that
 * was cached stop being served at all.
 */
export const revalidateArticleOnChange: CollectionAfterChangeHook = async ({
  collection,
  context,
  doc,
  previousDoc,
}) => {
  if (context.disableRevalidate) return

  const slug = slugOf(doc)
  if (slug) await invalidateArticle(slug, renamedFrom(collection.slug, doc, previousDoc))
}

/** The same for a deletion, which takes the page away as surely as unpublishing it does. */
export const revalidateArticleOnDelete: CollectionAfterDeleteHook = async ({ context, doc }) => {
  if (context.disableRevalidate) return

  const slug = slugOf(doc)
  if (slug) await invalidateArticle(slug)
}
