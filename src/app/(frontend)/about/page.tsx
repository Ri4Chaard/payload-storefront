import React from 'react'

import { BlockRenderer } from '@/components/blocks'
import { getStoryPage } from '@/lib/story/queries'

/**
 * The Our Story page (006/T035), from Figma section `220:699`.
 *
 * **This route closes three dead links.** The header's "About us", the footer's "Our Story" and the
 * home page's "Discover our story" have all pointed at `/about` since spec 001, and until now it
 * was a 404 in production.
 *
 * **Rendered per request, deliberately — and it is the same trade the home page made.** A page with
 * no dynamic segment is prerendered at build if Next can, and the production image is built with no
 * database: `src/lib/catalog/prerender.ts` records the whole chicken-and-egg. A prerendered `/about`
 * would therefore bake empty on a first deploy and stay that way until somebody happened to edit
 * something in the admin. An empty page that never heals is worse than two small queries, and
 * `src/app/(frontend)/page.tsx` reached the same conclusion for the same reason.
 *
 * The two queries are the whole cost — one global and its questions, both deduplicated within a
 * render by `cache()`, both from a database in the same process. The photographs are what a visitor
 * actually waits for, and they are unaffected.
 *
 * **It also removes a staleness bug rather than solving one.** `src/lib/revalidate.ts` invalidates
 * by walking every product slug, so hooking the story page into it would evict the entire catalogue
 * because somebody fixed a typo in a paragraph. Nothing is cached here, so a publish is visible to
 * the next visitor with no invalidation at all (FR-016, FR-041).
 */
export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  return { title: 'Our Story' }
}

export default async function AboutPage() {
  const page = await getStoryPage()

  /*
    `null` means the database was unreachable — a container build, and nothing else. An empty
    composition means the owner has not written the page yet. Both render the chrome and nothing
    between (FR-053), and neither is a 404: three places on this site link here, and answering a
    link the site itself publishes with "not found" is worse than a thin page.
  */
  return <main>{page ? <BlockRenderer blocks={page.blocks} /> : null}</main>
}
