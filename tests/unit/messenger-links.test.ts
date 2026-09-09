import { describe, expect, it } from 'vitest'

import { LINK_BUDGET, buildLink, messengerLink } from '@/lib/messengers/links'

/**
 * Identifier plus text becomes a URL —
 * [messenger-handoff.md §2](../../specs/005-checkout-handoff/contracts/messenger-handoff.md).
 * FR-021, FR-022, research R10.
 *
 * The formats are asserted literally, against the forms verified in the research from Telegram's
 * own API reference and WhatsApp's click-to-chat documentation. A test that rebuilt the URL from
 * the same template the code uses would pass whatever the template said.
 */

describe('buildLink', () => {
  it('builds the verified wa.me form, with the message percent-encoded', () => {
    const { href, carriesMessage } = buildLink('whatsapp', '15550102030', 'Hello Aurum')
    expect(href).toBe('https://wa.me/15550102030?text=Hello%20Aurum')
    expect(carriesMessage).toBe(true)
  })

  it('builds the verified t.me form', () => {
    const { href, carriesMessage } = buildLink('telegram', 'aurum', 'Hello Aurum')
    expect(href).toBe('https://t.me/aurum?text=Hello%20Aurum')
    expect(carriesMessage).toBe(true)
  })

  /**
   * Instagram has no documented way to pre-fill a direct message. The flag is how that fact reaches
   * the modal, which has to say so rather than let a customer arrive at an empty chat believing
   * their selection travelled (FR-021).
   */
  it('opens Instagram without a message, and says the message did not travel', () => {
    const { href, carriesMessage } = buildLink('instagram', 'aurum', 'Hello Aurum')
    expect(href).toBe('https://ig.me/m/aurum')
    expect(href).not.toContain('text=')
    expect(carriesMessage).toBe(false)
  })

  it('encodes newlines and punctuation rather than breaking the URL', () => {
    const { href } = buildLink('whatsapp', '15550102030', 'One\nTwo & three?')
    expect(href).toContain('%0A')
    expect(href).toContain('%26')
    expect(href).not.toMatch(/[\n ]/)
  })

  /**
   * A Cyrillic character is two UTF-8 bytes and becomes two `%XX` escapes — six characters of
   * budget for one of message. This is the arithmetic that makes a `message.length` check useless
   * for the market this shop sells into.
   */
  it('costs six characters of URL for one Cyrillic character', () => {
    const { href } = buildLink('whatsapp', '15550102030', 'ЗК')
    expect(href).toBe('https://wa.me/15550102030?text=%D0%97%D0%9A')
    expect(href.length - 'https://wa.me/15550102030?text='.length).toBe(12)
  })

  it('states the budget the message composer has to fit inside', () => {
    expect(LINK_BUDGET).toBe(2000)
  })
})

describe('messengerLink', () => {
  it('carries the platform name and the displayed handle, which are not the destination', () => {
    const link = messengerLink(
      { platform: 'whatsapp', destination: '15550102030', handle: '@aurum' },
      'Hello',
    )

    expect(link.label).toBe('WhatsApp')
    expect(link.handle).toBe('@aurum')
    expect(link.href).toContain('15550102030')
    expect(link.handle).not.toBe(link.href)
  })
})
