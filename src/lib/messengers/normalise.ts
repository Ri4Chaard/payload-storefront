/**
 * What an owner types becomes what we store (spec 005, T043,
 * [messenger-handoff.md §1](../../../specs/005-checkout-handoff/contracts/messenger-handoff.md)).
 * FR-035, FR-036.
 *
 * **This normalisation is the feature, not a nicety.** WhatsApp's click-to-chat format requires the
 * number in international format with no `+`, no spaces, no brackets, no dashes and no leading
 * zero. The shop's own number, as it is written everywhere else in this repository, is
 * `+1 (555) 010 20-30` — so an owner pasting a hand-built `wa.me` URL produces a dead link, and an
 * owner typing the number they say out loud produces a working one. That gap is the whole reason
 * the destination is stored as a raw account identifier and the link is built from it.
 *
 * Pure: no Payload, no network, no `Intl`. Run as Payload field validation on save (FR-039) and
 * unit-tested on its own.
 */

export type Platform = 'instagram' | 'telegram' | 'whatsapp'

export type NormaliseResult = { ok: true; value: string } | { error: string; ok: false }

/** Every platform offered at handoff, in the order the design draws them (node `590:13108`). */
export const PLATFORMS: Platform[] = ['instagram', 'telegram', 'whatsapp']

export const PLATFORM_LABELS: Record<Platform, string> = {
  instagram: 'Instagram',
  telegram: 'Telegram',
  whatsapp: 'WhatsApp',
}

/**
 * A username, as Telegram and Instagram both define one: 5–32 characters of letters, digits and
 * underscores. Accepted with a leading `@` or wrapped in a profile URL, because that is how a
 * handle is copied from a phone.
 */
const USERNAME = /^[A-Za-z0-9_]{5,32}$/

const stripUsername = (input: string, host: string): string =>
  input
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(new RegExp(`^(?:www\\.)?${host}/`, 'i'), '')
    .replace(/^@/, '')
    .replace(/\/+$/, '')

function username(input: string, host: string, platform: string): NormaliseResult {
  const value = stripUsername(input, host)

  if (!USERNAME.test(value)) {
    return {
      ok: false,
      error: `That does not look like a ${platform} username. Write it as “@aurum”, or paste the profile link.`,
    }
  }

  return { ok: true, value }
}

/**
 * A phone number in international format, reduced to the digits `wa.me` accepts.
 *
 * Leading zeros go after the non-digits do: `001 555 0102030` is a trunk prefix in front of a
 * country code, and `+1 (555) 010 20-30` is the same number written the way a person says it. Both
 * end as `15550102030`.
 *
 * The 8–15 bound is E.164's own: the shortest national numbers with a country code are eight
 * digits, and fifteen is the maximum the standard allows. It is a sanity check rather than
 * validation — no offline rule can tell a real number from a well-shaped one.
 */
function phone(input: string): NormaliseResult {
  const digits = input.replace(/\D/g, '').replace(/^0+/, '')

  if (digits.length < 8 || digits.length > 15) {
    return {
      ok: false,
      error:
        'That does not look like a phone number with a country code. Write it as you would say it — “+1 (555) 010 20-30”.',
    }
  }

  return { ok: true, value: digits }
}

export function normaliseDestination(platform: Platform, input: string): NormaliseResult {
  if (typeof input !== 'string' || input.trim() === '') {
    return { ok: false, error: 'Fill in the account this messenger opens, or untick it.' }
  }

  switch (platform) {
    case 'whatsapp':
      return phone(input)
    case 'telegram':
      return username(input, 't\\.me', 'Telegram')
    case 'instagram':
      return username(input, 'instagram\\.com', 'Instagram')
  }
}
