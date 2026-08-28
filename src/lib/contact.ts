import { type IconName } from '@/lib/icon-registry'

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

/** Placeholder destinations — these need the real accounts before launch. */
export const SOCIAL_LINKS: { icon: IconName; label: string; href: string }[] = [
  { icon: 'whatsapp', label: 'WhatsApp', href: 'https://wa.me/' },
  { icon: 'instagram', label: 'Instagram', href: 'https://instagram.com/' },
  { icon: 'telegram', label: 'Telegram', href: 'https://t.me/' },
]
