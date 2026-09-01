/**
 * Publishing invalidates the pages that draw the published thing (003/T294).
 *
 * Constitution V calls stale content after a publish a defect, and both of this site's cached
 * routes can go stale that way: **the home page is prerendered at build**, and **every published
 * product page is prerendered from `generateStaticParams`**. Without something on this side, an
 * owner could change a price in the admin and watch the old one stay on the page until the next
 * deployment.
 *
 * **The listings are deliberately absent from this file.** `/[category]` and `/all-jewelry` read
 * `searchParams` — a filtered grid is a function of the query string — so they render per request
 * and hold nothing to invalidate. If one of them is ever made cacheable, its path belongs in
 * `invalidate()` below, and this paragraph is where to look for why it is not there already.
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

  // The featured row and the category band.
  revalidatePath('/')

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
}

/**
 * A product path no query will name any more: the address a renamed piece has just left, or the one
 * a deleted piece used to hold. `undefined` for every other collection — a category and a size have
 * slugs of their own, and neither is a product page.
 */
const renamedFrom = (
  collectionSlug: string,
  doc: unknown,
  previousDoc: unknown,
): string | undefined => {
  if (collectionSlug !== 'products') return undefined

  const before = (previousDoc as { slug?: unknown } | undefined)?.slug
  const after = (doc as { slug?: unknown } | undefined)?.slug
  return typeof before === 'string' && before !== after ? before : undefined
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
