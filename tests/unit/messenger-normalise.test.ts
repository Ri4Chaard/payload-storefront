import { describe, expect, it } from 'vitest'

import { normaliseDestination } from '@/lib/messengers/normalise'

/**
 * What an owner types becomes what we store —
 * [messenger-handoff.md §1](../../specs/005-checkout-handoff/contracts/messenger-handoff.md).
 * FR-035, FR-036, SC-007.
 *
 * **The first test is the one that justifies the whole module.** WhatsApp's click-to-chat format
 * takes digits only, and the shop's own number — as it is written in `src/lib/contact.ts` and on
 * every page of the site — is `+1 (555) 010 20-30`. An owner who pastes a hand-built `wa.me` URL
 * gets a dead link; an owner who types the number they say out loud gets a working one, and this is
 * the code that makes the difference.
 */

const value = (result: ReturnType<typeof normaliseDestination>) =>
  result.ok ? result.value : `REFUSED: ${result.error}`

describe('WhatsApp destinations (FR-035)', () => {
  it("reduces the shop's own number, as anyone would write it, to what wa.me accepts", () => {
    expect(value(normaliseDestination('whatsapp', '+1 (555) 010 20-30'))).toBe('15550102030')
  })

  it('accepts the same number written any of the ways a person writes numbers', () => {
    for (const written of [
      '+1 555 010 20 30',
      '1-555-010-2030',
      '(1) 555 0102030',
      '  15550102030  ',
      '001 555 010 2030',
    ]) {
      expect(value(normaliseDestination('whatsapp', written)), written).toBe('15550102030')
    }
  })

  it('strips a trunk prefix rather than treating it as part of the country code', () => {
    expect(value(normaliseDestination('whatsapp', '0044 7911 123456'))).toBe('447911123456')
  })

  it('refuses something that is not a number with a country code, and says how to write one', () => {
    const result = normaliseDestination('whatsapp', '5551234')
    expect(result.ok).toBe(false)
    expect(result.ok === false && result.error).toMatch(/country code/i)
    expect(result.ok === false && result.error).toContain('+1 (555) 010 20-30')
  })

  it('refuses an empty destination rather than storing one', () => {
    expect(normaliseDestination('whatsapp', '   ').ok).toBe(false)
  })
})

describe('Telegram and Instagram usernames (FR-036)', () => {
  it('accepts a bare username, an @ handle and a pasted profile link identically', () => {
    for (const written of [
      'aurum',
      '@aurum',
      't.me/aurum',
      'https://t.me/aurum',
      'https://t.me/aurum/',
    ]) {
      expect(value(normaliseDestination('telegram', written)), written).toBe('aurum')
    }
  })

  it('does the same for Instagram, against its own host', () => {
    for (const written of ['aurum', '@aurum', 'https://www.instagram.com/aurum']) {
      expect(value(normaliseDestination('instagram', written)), written).toBe('aurum')
    }
  })

  it('refuses a username that is too short to be one, naming the platform', () => {
    const result = normaliseDestination('telegram', 'ab')
    expect(result.ok).toBe(false)
    expect(result.ok === false && result.error).toMatch(/telegram username/i)
  })

  it('refuses characters a username cannot contain', () => {
    expect(normaliseDestination('telegram', 'aro vana').ok).toBe(false)
    expect(normaliseDestination('instagram', 'aro/vana').ok).toBe(false)
  })

  /** Normalising twice must not change the answer, or a re-save would corrupt a stored value. */
  it('is idempotent', () => {
    const once = normaliseDestination('whatsapp', '+1 (555) 010 20-30')
    expect(once.ok).toBe(true)
    expect(value(normaliseDestination('whatsapp', once.ok ? once.value : ''))).toBe('15550102030')

    const handle = normaliseDestination('telegram', '@aurum')
    expect(value(normaliseDestination('telegram', handle.ok ? handle.value : ''))).toBe('aurum')
  })
})
