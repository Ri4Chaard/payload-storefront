/**
 * The query keys the listing owns. Every other key in a listing URL is an attribute's `name`.
 *
 * In a module of its own, with no imports, because two very different places need it: the pure URL
 * code in `filters.ts`, and the `attributes` collection's validation — which runs inside Payload's
 * config and must not drag the catalogue's view-model types in with it. An attribute named `sort`
 * would make `?sort=newest` mean two things, so the admin refuses one.
 */
export const RESERVED_FILTER_KEYS = [
  'category',
  'minPrice',
  'maxPrice',
  'inStock',
  'sort',
  'page',
  'q',
] as const

export type ReservedFilterKey = (typeof RESERVED_FILTER_KEYS)[number]

/** Lowercase words joined by single hyphens — the only shape an attribute name or value may take. */
export const KEBAB_CASE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
