import { createNavigation } from 'next-intl/navigation'

import { routing } from './routing'

/**
 * Locale-aware navigation (spec 010, FR-006).
 *
 * These are the plain `next/navigation` exports with one behaviour added: an href keeps the prefix
 * of the locale the visitor is reading. `<Link href="/cart">` from a Russian page goes to
 * `/ru/cart`, which is why `src/components/ui/link` routes through here and why the href builders —
 * `listing-url.ts`, `blog-url.ts`, `policy-url.ts` — keep returning unprefixed paths. A path is a
 * fact about a document; a prefix is a fact about a request.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing)
