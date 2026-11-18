/**
 * The shop's own contact details, in one place.
 *
 * The contact strip, the footer and the menu each show the same address, the same number and the
 * same three social marks — three copies of one fact, which is three chances for the number to be
 * updated in two of them. The menu would have been the third copy, which is what forced
 * this out into a module rather than leaving it as a default beside each component.
 *
 * The design writes the address as `hello@aurum.exampIe` — a capital I where "example" has an l.
 * Corrected here once, rather than in each of the three places it is drawn.
 *
 * These are not content in the `src/mocks` sense: they are the shop's identity rather than page
 * copy, they appear in chrome on every route, and components read them directly. When Payload owns
 * a settings global, this becomes the loader's job and the components keep their props.
 */
/**
 * What the shop's contact details are **before an owner has set any**.
 *
 * No longer the source of truth: the email and the phone are fields on the `contact-settings`
 * global, and `src/lib/messengers/settings.ts` is where the chrome reads them. This is the fallback
 * a fresh installation gets, and what is used if somebody empties both fields — a footer with no
 * way to reach the shop is worse than one showing the details it shipped with.
 */
export const DEFAULT_CONTACT = {
  email: 'hello@aurum.example',
  /** As displayed. `tel:` will not accept the spaces and brackets. */
  phone: '+1 (555) 010 20-30',
  address: '12 Market Street, Old Town, Example City',
  openingHours: 'Daily · 10:00 AM–9:00 PM',
} as const

/**
 * Where "Open in Maps" goes when the owner has not pinned a specific place.
 *
 * **Derived from the address rather than defaulted to a bare root.** The footer shipped with
 * `https://maps.google.com/`, which is a link to Google Maps and not to this shop — the same defect
 * as the `wa.me/` social marks, and the same reason it survived: a link that opens *something*
 * looks like it works. A search for the address is at least about the right place, and an owner who
 * wants the exact pin can paste one.
 */
export function mapsHref(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
}

/**
 * `+1 (555) 010 20-30` → `tel:+15550102030`.
 *
 * **Derived, never stored beside the display form.** Two fields for one number is two things to
 * keep in step, and the one nobody looks at is the `tel:` — a visitor only finds out it is wrong by
 * dialling it. `tel:` accepts digits and a leading `+` and nothing else, so the punctuation a
 * person writes has to come out somewhere; here is the only place it does.
 */
export function telHref(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  return digits === '' ? '' : `tel:+${digits}`
}

/**
 * **`SOCIAL_LINKS` lived here and has been removed**.
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
