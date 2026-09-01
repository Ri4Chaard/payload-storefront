/**
 * What a route prerenders when there is no database to ask (003/T294, deployment).
 *
 * **The production image is built without one.** `docker compose --profile dev up -d --build` runs
 * `next build` inside a container, then `pnpm payload migrate`, then `pnpm start` — so at build time
 * the deployment database is not merely unreachable, on a first deploy its tables do not exist yet.
 * Making the build depend on it puts a chicken-and-egg in front of every new environment: the
 * migrations that create the tables cannot run until an image exists, and the image cannot be built
 * until the tables do.
 *
 * So a build with no database prerenders nothing and every page renders on demand instead, is cached
 * from then on, and is invalidated by the same hooks as always (`src/lib/revalidate.ts`). Nothing
 * about correctness changes — the first visitor to each page pays for one render, which is what
 * incremental static regeneration does everywhere.
 *
 * A build WITH a database still prerenders the whole catalogue, which is what happens locally and in
 * CI. This is a graceful degradation, not a retreat from T294.
 */

/**
 * Only Payload failing to CONNECT is tolerated. A schema mismatch, a bad query or a mapper throwing
 * are all bugs that must stop a build rather than quietly ship a site with no pages in it — and
 * "the catalogue came back empty" and "the catalogue could not be read" have to stay
 * distinguishable, or the day the database is misconfigured looks exactly like the day the shop is
 * empty.
 *
 * Payload marks it on the error object; the message is checked too, because that flag is not part
 * of any documented contract and a rename would silently turn this into a bare `catch`.
 */
function isDatabaseUnreachable(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false
  if ((error as { payloadInitError?: unknown }).payloadInitError === true) return true
  const message = error instanceof Error ? error.message : ''
  return message.includes('cannot connect')
}

/**
 * Wrap a `generateStaticParams` body in this. It returns what the read returned, or an empty list
 * when there is no database — never a build failure for that one reason.
 */
export async function prerenderable<T>(what: string, read: () => Promise<T[]>): Promise<T[]> {
  try {
    return await read()
  } catch (error) {
    if (!isDatabaseUnreachable(error)) throw error

    // Loud, because a build that silently prerenders nothing looks identical to a build of an empty
    // shop, and the difference matters when a page is slower than expected in production.
    console.warn(
      `  ⚠ No database at build time — prerendering no ${what}. Every page will render on ` +
        'demand and be cached from then on. This is expected when building the container image.',
    )
    return []
  }
}
