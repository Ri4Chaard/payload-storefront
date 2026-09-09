/**
 * The shop's own contact details, in one place.
 *
 * The contact strip, the footer and the menu each show the same address, the same number and the
 * same three social marks — three copies of one fact, which is three chances for the number to be
 * updated in two of them. The menu (002/T140) would have been the third copy, which is what forced
 * this out into a module rather than leaving it as a default beside each component.
 *
 * The design writes the address as `hello@aurum.exampIe` — a capital I where "example" has an l.
 * Corrected here once, rather than in each of the three places it is drawn.
 *
 * These are not content in the `src/mocks` sense: they are the shop's identity rather than page
 * copy, they appear in chrome on every route, and components read them directly. When Payload owns
 * a settings global, this becomes the loader's job and the components keep their props.
 */
export const CONTACT = {
  email: 'hello@aurum.example',
  /** As displayed. `tel:` will not accept the spaces and brackets. */
  phone: '+1 (555) 010 20-30',
  phoneHref: 'tel:+15550102030',
} as const

/**
 * **`SOCIAL_LINKS` lived here and has been removed** (spec 005, T071, FR-052).
 *
 * It held three placeholder destinations — `https://wa.me/` and friends — under a comment saying
 * they needed the real accounts before launch. They still did: an owner who set their real WhatsApp
 * number in the admin would have watched the footer keep pointing at a bare root on every page,
 * because nothing connected the two. The shop's messenger accounts now live in the
 * `contact-settings` global, and `src/lib/messengers/settings.ts` is where the chrome reads them.
 *
 * What is left below is genuinely the shop's own: an address and a phone number that appear in
 * three places and had the same duplication problem this module was written to solve.
 */
