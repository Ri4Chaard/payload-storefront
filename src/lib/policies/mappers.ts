import { convertLexicalToHTML } from '@payloadcms/richtext-lexical/html'
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'

import { toCatalogImage } from '@/lib/catalog/mappers'
import type { CookieSetting, Policy as PolicyDocument } from '@/payload-types'

import { policyHref } from './policy-url'
import type { CookieCategory, CookieSettings, Policy, PolicyLink } from './types'

/**
 * Policy documents to view models (spec 009, T012).
 *
 * The seam between Payload's shapes and what a route draws. `eslint-rules/catalog-boundary.mjs`
 * makes this directory the last place in the feature that may name a document type.
 */

/** Trim to `undefined`, so "left empty" and "typed spaces" agree downstream. */
const text = (value: string | null | undefined): string | undefined => {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

/**
 * Serialised body, or `undefined` when the document is empty.
 *
 * `undefined` rather than an empty string is what lets the route tell "the owner has not written
 * this yet" from "the owner wrote something", and draw the placeholder FR-006 requires instead of an
 * empty column. `src/lib/blog/mappers.ts` reached the same convention.
 */
export const bodyHtml = (value: PolicyDocument['body']): string | undefined => {
  if (!value) return undefined

  // The generated type describes the same document `SerializedEditorState` does, one field at a
  // time, and the two descriptions are not assignable to each other. The cast is the seam between
  // Payload's generated shape and lexical's own; it is not hiding an unknown.
  const output = convertLexicalToHTML({
    data: value as unknown as SerializedEditorState,
    disableContainer: true,
  }).trim()

  return output === '' ? undefined : output
}

export const toPolicy = (document: PolicyDocument | null | undefined): Policy | null => {
  if (!document) return null

  const title = text(document.title)
  if (!title || !document.slug) return null

  const image = toCatalogImage(document.seo?.image)

  return {
    slug: document.slug,
    href: policyHref(document.slug),
    title,
    ...(text(document.subtitle) ? { subtitle: text(document.subtitle) } : {}),
    ...(bodyHtml(document.body) ? { bodyHtml: bodyHtml(document.body) } : {}),
    seo: {
      ...(text(document.seo?.title) ? { title: text(document.seo?.title) } : {}),
      ...(text(document.seo?.description) ? { description: text(document.seo?.description) } : {}),
      ...(image
        ? {
            image: {
              src: image.src,
              width: image.width,
              height: image.height,
              ...(image.alt ? { alt: image.alt } : {}),
            },
          }
        : {}),
    },
  }
}

/** The footer needs a label and a destination and nothing else. */
export const toPolicyLink = (document: PolicyDocument): PolicyLink | null => {
  const label = text(document.title)
  if (!label || !document.slug) return null
  return { label, href: policyHref(document.slug) }
}

/**
 * A category row, or nothing.
 *
 * Every field is required at the schema level, so a row failing here predates that rule or arrived
 * through a direct database write. Dropping it is right: a category the chooser cannot describe is
 * a switch with no explanation, and a visitor cannot consent to something unexplained.
 */
const toCategory = (row: CookieSetting['categories'][number]): CookieCategory | null => {
  const key = text(row.key)
  const name = text(row.name)
  const purpose = text(row.purpose)
  if (!key || !name || !purpose) return null

  return { key, name, purpose, necessary: Boolean(row.necessary) }
}

export const toCookieSettings = (document: CookieSetting | null | undefined): CookieSettings => {
  /*
    An absent global means the site has not been configured — a fresh database, or a container build
    with nothing to read. The banner must not ask for consent it cannot describe, so it stays away
    and nothing optional is treated as agreed to. This is the same conclusion FR-026 reaches for the
    switch the owner controls, arrived at from the other direction.
  */
  if (!document) return { enabled: false, consentVersion: 1, categories: [] }

  const categories = document.categories.flatMap((row) => {
    const category = toCategory(row)
    return category ? [category] : []
  })

  /*
    The relationship resolves to a document at depth, and to a bare id otherwise. An unresolved id
    means it points at a policy this read could not see — an unpublished one, most likely — and the
    banner has to cope with that (FR-022): it renders with no link rather than linking to a 404.
  */
  const policy = document.policy && typeof document.policy === 'object' ? document.policy : null

  return {
    enabled: Boolean(document.enabled),
    consentVersion: document.consentVersion,
    categories,
    ...(policy?.slug ? { policyHref: policyHref(policy.slug) } : {}),
  }
}
