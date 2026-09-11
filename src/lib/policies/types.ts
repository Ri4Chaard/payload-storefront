/**
 * What a route and the footer see of a policy (spec 009).
 *
 * The view models, deliberately not the generated document types. `eslint-rules/catalog-boundary.mjs`
 * enforces the split site-wide: `src/lib/policies/` is the last place in this feature that may name
 * a `Policy`, and everything downstream sees these shapes instead. That is what lets the content
 * model change without a component knowing.
 */

/** The image behind an Open Graph tag, when the owner set one. */
export interface PolicySeoImage {
  src: string
  width: number
  height: number
  alt?: string
}

/** One policy page, ready to draw. */
export interface Policy {
  slug: string
  /** Root-relative, always `/legal/<slug>`. Built once in `policy-url.ts` and never assembled twice. */
  href: string
  title: string
  /** The small line under the title. Free text — a date on three pages, a sentence on the fourth. */
  subtitle?: string
  /** Serialised HTML, or `undefined` when the body is empty — which the route draws a placeholder for. */
  bodyHtml?: string
  seo: {
    title?: string
    description?: string
    image?: PolicySeoImage
  }
}

/** A policy as the footer needs it: a label and a destination, nothing more. */
export interface PolicyLink {
  label: string
  href: string
}

/** Published policies, already split by where the footer puts them (FR-015b). */
export interface FooterPolicies {
  legal: PolicyLink[]
  customerCare: PolicyLink[]
}

/**
 * One cookie category as the chooser draws it.
 *
 * `key` is the identifier stored in the visitor's consent record. It crosses from Payload into the
 * browser's cookie, which is why `src/globals/cookie-settings.ts` warns so loudly against re-using
 * one for a different purpose.
 */
export interface CookieCategory {
  key: string
  name: string
  purpose: string
  necessary: boolean
}

/** Everything the banner needs, read once in the root layout and passed down as props. */
export interface CookieSettings {
  enabled: boolean
  consentVersion: number
  /**
   * The banner's paragraph, written by the owner.
   *
   * Always a string by the time it reaches a component — the mapper substitutes the built-in
   * default for an empty field, so the banner never has to decide what to draw when nobody has
   * written anything.
   */
  bannerBody: string
  categories: CookieCategory[]
  /** The Cookie Policy's address, when one is linked and published. The banner copes without it. */
  policyHref?: string
}
