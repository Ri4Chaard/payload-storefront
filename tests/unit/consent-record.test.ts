import { describe, expect, it } from 'vitest'

import { decide, isAllowed, parse, readState, serialise, startingSelection } from '@/lib/consent/record'
import type { ConsentState } from '@/lib/consent/types'
import type { CookieCategory } from '@/lib/policies/types'

/**
 * The consent record (spec 009, T025, T050; contract `consent-record.md` §4).
 *
 * **These are the assertions the whole feature rests on.** The banner and the chooser are drawings;
 * this is where "did this visitor agree to that?" is actually decided, and a wrong answer here is a
 * consent failure rather than a visual bug. Every rule in contract §4 has a test, including the ones
 * that look redundant today.
 */

const NECESSARY: CookieCategory = {
  key: 'necessary',
  name: 'Strictly necessary',
  purpose: 'Sign-in, the shopping bag, and this choice.',
  necessary: true,
}

const ANALYTICS: CookieCategory = {
  key: 'analytics',
  name: 'Analytics',
  purpose: 'Understanding how the site is used.',
  necessary: false,
}

/** The configuration this site actually ships with. */
const TODAY = [NECESSARY]
/** The configuration the day somebody adds Google Analytics. */
const LATER = [NECESSARY, ANALYTICS]

const stored = (record: Parameters<typeof serialise>[0]) => serialise(record)

describe('parse', () => {
  it('round-trips a record it wrote', () => {
    const record = decide({ kind: 'all' }, LATER, 3)
    expect(parse(serialise(record))).toEqual(record)
  })

  it.each([
    ['nothing', undefined],
    ['an empty string', ''],
    ['not JSON at all', 'wat'],
    ['JSON that is not an object', encodeURIComponent('"yes"')],
    ['an array', encodeURIComponent('[]')],
    ['null', encodeURIComponent('null')],
    ['a missing version', encodeURIComponent(JSON.stringify({ t: 1, o: [], a: [] }))],
    ['a non-numeric version', encodeURIComponent(JSON.stringify({ v: 'x', t: 1, o: [], a: [] }))],
    ['a missing timestamp', encodeURIComponent(JSON.stringify({ v: 1, o: [], a: [] }))],
    ['offered that is not an array', encodeURIComponent(JSON.stringify({ v: 1, t: 1, o: 'a', a: [] }))],
    ['accepted holding a non-string', encodeURIComponent(JSON.stringify({ v: 1, t: 1, o: ['a'], a: [1] }))],
  ])('refuses %s', (_label, raw) => {
    expect(parse(raw as string | undefined)).toBeNull()
  })

  it('refuses a record accepting something it was never offered (a ⊄ o)', () => {
    // The signature of a tampered cookie: somebody added a key to the accepted list by hand.
    const forged = encodeURIComponent(JSON.stringify({ v: 1, t: 1, o: ['necessary'], a: ['necessary', 'analytics'] }))
    expect(parse(forged)).toBeNull()
  })
})

describe('decide', () => {
  it('Agree accepts every configured category', () => {
    expect(decide({ kind: 'all' }, LATER, 1).a).toEqual(['analytics', 'necessary'])
  })

  it('Allow Technical Cookies accepts only what is necessary', () => {
    expect(decide({ kind: 'necessary-only' }, LATER, 1).a).toEqual(['necessary'])
  })

  it('the chooser keeps necessary categories whatever was ticked', () => {
    const record = decide({ kind: 'chosen', keys: [] }, LATER, 1)
    expect(record.a).toEqual(['necessary'])
  })

  it('the chooser ignores a key that is not configured', () => {
    const record = decide({ kind: 'chosen', keys: ['marketing'] }, LATER, 1)
    expect(record.a).toEqual(['necessary'])
  })

  it('always records what was on offer at the time, never a carried-forward list', () => {
    expect(decide({ kind: 'necessary-only' }, LATER, 1).o).toEqual(['analytics', 'necessary'])
  })

  it('stamps the current consent version', () => {
    expect(decide({ kind: 'all' }, TODAY, 7).v).toBe(7)
  })

  it('records the decision time in seconds', () => {
    expect(decide({ kind: 'all' }, TODAY, 1, 1_700_000_000_500).t).toBe(1_700_000_000)
  })
})

describe('readState', () => {
  const config = (categories: CookieCategory[], consentVersion = 1) => ({ consentVersion, categories })

  it('asks when there is no record', () => {
    expect(readState(undefined, config(TODAY))).toEqual({ status: 'ask' })
  })

  it('asks when the record is unreadable, with nothing to pre-fill', () => {
    expect(readState('garbage', config(TODAY))).toEqual({ status: 'ask' })
  })

  it('asks when the record was tampered with, with nothing to pre-fill', () => {
    const forged = encodeURIComponent(JSON.stringify({ v: 1, t: 1, o: ['necessary'], a: ['analytics'] }))
    expect(readState(forged, config(LATER))).toEqual({ status: 'ask' })
  })

  it('settles when the record matches the configuration', () => {
    const raw = stored(decide({ kind: 'all' }, TODAY, 1))
    expect(readState(raw, config(TODAY)).status).toBe('decided')
  })

  it('asks again when the owner advances the consent version, keeping previous answers', () => {
    const raw = stored(decide({ kind: 'all' }, LATER, 1))
    expect(readState(raw, config(LATER, 2))).toEqual({
      status: 'ask-with-previous',
      previous: ['analytics', 'necessary'],
    })
  })

  it('settles when the stored version is ahead of the configured one', () => {
    // A rolled-back deploy. Asking again would be punishing somebody for our own release.
    const raw = stored(decide({ kind: 'all' }, TODAY, 5))
    expect(readState(raw, config(TODAY, 4)).status).toBe('decided')
  })

  it('ignores a key in the record that is no longer configured (FR-041)', () => {
    const raw = stored(decide({ kind: 'all' }, LATER, 1))
    // Analytics has since been removed. The stale key is not an error and not a reason to re-ask.
    expect(readState(raw, config(TODAY)).status).toBe('decided')
  })
})

/**
 * FR-027a — the guard on the owner's decision that the banner always shows three buttons.
 *
 * With one category configured, *Agree* and *Allow Technical Cookies* have identical effect. That is
 * accepted. What must never be true is that the identical effect becomes identical MEANING later: a
 * visitor who agreed when only necessary cookies existed has not agreed to analytics, and the day
 * analytics is added they must be asked again.
 *
 * If any assertion in this block starts failing, stop — the failure mode is silent consent to
 * tracking nobody was ever shown.
 */
describe('a category added after the decision is never inherited', () => {
  it('re-asks a visitor who pressed Agree before the category existed', () => {
    const raw = stored(decide({ kind: 'all' }, TODAY, 1))

    const state = readState(raw, { consentVersion: 1, categories: LATER })

    expect(state.status).toBe('ask-with-previous')
  })

  it('does not treat the old Agree as consent to the new category', () => {
    const raw = stored(decide({ kind: 'all' }, TODAY, 1))
    const state = readState(raw, { consentVersion: 1, categories: LATER })

    expect(isAllowed('analytics', LATER, state)).toBe(false)
  })

  it('pre-fills the chooser with what they did agree to, and nothing more', () => {
    const raw = stored(decide({ kind: 'all' }, TODAY, 1))
    const state = readState(raw, { consentVersion: 1, categories: LATER })

    expect(startingSelection(state, LATER)).toEqual(['necessary'])
  })

  it('re-asks a visitor who pressed Allow Technical Cookies too', () => {
    const raw = stored(decide({ kind: 'necessary-only' }, TODAY, 1))
    expect(readState(raw, { consentVersion: 1, categories: LATER }).status).toBe('ask-with-previous')
  })
})

describe('isAllowed', () => {
  it('allows a necessary category under every state', () => {
    const states: ConsentState[] = [
      { status: 'ask' },
      { status: 'ask-with-previous', previous: [] },
      readState(stored(decide({ kind: 'necessary-only' }, TODAY, 1)), {
        consentVersion: 1,
        categories: TODAY,
      }),
    ]

    for (const state of states) {
      expect(isAllowed('necessary', TODAY, state)).toBe(true)
    }
  })

  it('refuses an optional category until it is agreed to', () => {
    expect(isAllowed('analytics', LATER, { status: 'ask' })).toBe(false)
  })

  it('allows an optional category once it is agreed to', () => {
    const state = readState(stored(decide({ kind: 'all' }, LATER, 1)), {
      consentVersion: 1,
      categories: LATER,
    })
    expect(isAllowed('analytics', LATER, state)).toBe(true)
  })

  it('refuses it again after a withdrawal', () => {
    const state = readState(stored(decide({ kind: 'chosen', keys: [] }, LATER, 1)), {
      consentVersion: 1,
      categories: LATER,
    })
    expect(isAllowed('analytics', LATER, state)).toBe(false)
  })

  it('refuses a category that is not configured at all', () => {
    expect(isAllowed('marketing', LATER, { status: 'ask' })).toBe(false)
  })
})

describe('startingSelection', () => {
  it('starts a first-time visitor with necessary only, everything optional off (FR-030)', () => {
    expect(startingSelection({ status: 'ask' }, LATER)).toEqual(['necessary'])
  })

  it('starts a decided visitor from what they chose', () => {
    const state = readState(stored(decide({ kind: 'all' }, LATER, 1)), {
      consentVersion: 1,
      categories: LATER,
    })
    expect(startingSelection(state, LATER)).toEqual(['analytics', 'necessary'])
  })
})
