import config from '@payload-config'
import { cache } from 'react'
import { getPayload } from 'payload'

import { DEFAULT_MESSAGE_TEMPLATE } from '@/globals/contact-settings'
import { DEFAULT_CONTACT, mapsHref, telHref } from '@/lib/contact'
import type { IconName } from '@/lib/icon-registry'

import { profileHref } from './links'
import { PLATFORM_LABELS, type Platform } from './normalise'

/**
 * Reading the seller's destinations (spec 005, T050, FR-023, FR-038).
 *
 * **Server-only, and cached per request.** A page may ask for these twice — the handoff modal and,
 * after the chrome migration, the footer — and this collapses that into one read.
 *
 * **A Local API global read is not a request-time API**, which is the property that matters: unlike
 * `cookies()`, calling this from the root layout does not opt every route into dynamic rendering.
 * That is what makes the chrome migration in Phase 8 free rather than a trade against the
 * prerendered catalogue (research R8, R11).
 *
 * **Only enabled rows, in array order.** Order is the array's own (FR-038) — there is no position
 * field to sort by, and therefore nothing that can disagree with what the admin shows.
 */

export interface SellerMessenger {
  platform: Platform
  /** The raw account identifier: a phone number for WhatsApp, a username for the others. */
  destination: string
  /** What the modal displays beneath the platform name. Separate from the destination (FR-037). */
  handle: string
}

const client = cache(async () => getPayload({ config }))

const settings = cache(async () => {
  const payload = await client()
  return payload.findGlobal({ slug: 'contact-settings', depth: 0, overrideAccess: false })
})

export const getMessengers = cache(async (): Promise<SellerMessenger[]> => {
  const doc = await settings()

  return (doc.messengers ?? [])
    .filter((row) => row.enabled !== false)
    // A row can only be half-filled while it is unticked — the field validation refuses an enabled
    // one with no destination (FR-039). This is the belt to that braces: a row that somehow arrives
    // incomplete is dropped rather than rendered as a link to nowhere.
    .filter((row): row is typeof row & { destination: string; handle: string; platform: Platform } =>
      Boolean(row.platform && row.destination && row.handle),
    )
    .map((row) => ({
      platform: row.platform,
      destination: row.destination,
      handle: row.handle,
    }))
})

export const getMessageTemplate = cache(async (): Promise<string> => {
  const doc = await settings()
  const template = doc.messageTemplate

  // An empty template is treated as absent rather than as an instruction to send nothing. The
  // field's own validation only refuses one that is present and missing `{{items}}`.
  return typeof template === 'string' && template.trim() !== '' ? template : FALLBACK_TEMPLATE
})

/**
 * What is sent if the owner has emptied the field entirely.
 *
 * **The global's own default, imported rather than restated.** An earlier draft wrote the string
 * out a second time here, and a second copy of a template is a second thing that can quietly lose
 * its `{{customer}}` placeholder while the first keeps it.
 */
const FALLBACK_TEMPLATE = DEFAULT_MESSAGE_TEMPLATE

/**
 * The shop's accounts as the chrome draws them (spec 005, T072, FR-052).
 *
 * **This is the whole of "one set of accounts".** Before it, `src/lib/contact.ts` carried a second
 * copy — three links whose own comment admitted "these need the real accounts before launch" — and
 * an owner who set their real WhatsApp number in the admin would have watched the footer keep
 * pointing at a bare `wa.me/` on every page. Two records of one fact is two chances for one of
 * them to be wrong, and it is always the one nobody is looking at.
 *
 * Includes messengers that are unticked for handoff on purpose: "do not offer this for orders" and
 * "do not show this in the footer" are different decisions, and an owner who hides WhatsApp from
 * checkout has not asked to be un-followable. What it does need is a destination, which the field
 * validation only guarantees for enabled rows — so an incomplete one is dropped here.
 */
export interface SocialLink {
  icon: IconName
  label: string
  href: string
}

export const getSocialLinks = cache(async (): Promise<SocialLink[]> => {
  const doc = await settings()

  return (doc.messengers ?? [])
    .filter((row): row is typeof row & { destination: string; platform: Platform } =>
      Boolean(row.platform && row.destination),
    )
    .map((row) => ({
      icon: row.platform as IconName,
      label: PLATFORM_LABELS[row.platform],
      href: profileHref(row.platform, row.destination),
    }))
})

/**
 * The shop's email and phone, as the chrome draws them.
 *
 * **`phoneHref` is derived, never a third field.** `tel:` accepts digits and a leading `+`, so the
 * punctuation an owner types has to come out somewhere; doing it here means there is one number to
 * edit and no second value that can quietly disagree with it.
 *
 * An empty field falls back to what shipped rather than rendering a blank line or a dead `mailto:`.
 * A footer with no way to reach the shop is worse than one showing the details it came with, and an
 * owner who genuinely wants no phone published is better served by a field that says so than by an
 * empty one that renders `tel:`.
 */
export interface ContactDetails {
  email: string
  phone: string
  phoneHref: string
  address: string
  openingHours: string
  /** The owner's pinned link where they set one, otherwise a search for the address. */
  mapsHref: string
}

export const getContactDetails = cache(async (): Promise<ContactDetails> => {
  const doc = await settings()

  const filled = (value: unknown, fallback: string): string =>
    typeof value === 'string' && value.trim() !== '' ? value : fallback

  const phone = filled(doc.phone, DEFAULT_CONTACT.phone)
  const address = filled(doc.address, DEFAULT_CONTACT.address)
  const pinned = typeof doc.mapsUrl === 'string' ? doc.mapsUrl.trim() : ''

  return {
    email: filled(doc.email, DEFAULT_CONTACT.email),
    phone,
    phoneHref: telHref(phone),
    address,
    openingHours: filled(doc.openingHours, DEFAULT_CONTACT.openingHours),
    // The pin wins where the owner set one; otherwise a search for the address they typed.
    mapsHref: pinned === '' ? mapsHref(address) : pinned,
  }
})
