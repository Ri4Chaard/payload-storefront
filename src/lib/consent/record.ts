import type { CookieCategory } from '@/lib/policies/types'

import type { ConsentRecord, ConsentState } from './types'

/**
 * The consent record: writing it, reading it, and deciding whether it still counts (spec 009, T028;
 * contract `consent-record.md` §2–§4).
 *
 * **Pure functions over plain values.** Nothing here touches `document`, and nothing here may import
 * `next/headers` — `cookies()` is a request-time API and the banner lives in the root layout, so a
 * server read would opt every route on this site into dynamic rendering. `eslint.config.mjs`
 * enforces that rather than leaving it to memory. `./cookie.ts` is the only file that talks to the
 * browser.
 */

/** Sorted, so two equal decisions serialise identically and can be compared as strings. */
const sorted = (keys: string[]): string[] => [...new Set(keys)].sort()

const necessaryKeys = (categories: CookieCategory[]): string[] =>
  sorted(categories.filter((category) => category.necessary).map((category) => category.key))

const allKeys = (categories: CookieCategory[]): string[] =>
  sorted(categories.map((category) => category.key))

export const serialise = (record: ConsentRecord): string =>
  encodeURIComponent(JSON.stringify(record))

/**
 * A stored value to a record, or `null` for anything that is not one.
 *
 * Every rejection here means "ask again" (FR-039). Being strict is the point: a half-understood
 * record is worse than no record, because it would be treated as an answer nobody gave.
 */
export const parse = (raw: string | undefined | null): ConsentRecord | null => {
  if (!raw) return null

  try {
    const value: unknown = JSON.parse(decodeURIComponent(raw))
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return null

    const { v, t, o, a } = value as Record<string, unknown>

    if (typeof v !== 'number' || !Number.isFinite(v)) return null
    if (typeof t !== 'number' || !Number.isFinite(t)) return null
    if (!Array.isArray(o) || !o.every((key) => typeof key === 'string')) return null
    if (!Array.isArray(a) || !a.every((key) => typeof key === 'string')) return null

    // `a ⊆ o` — an invariant of every record this code writes, so a violation means the value was
    // tampered with or corrupted. Contract §2.
    const offered = new Set(o as string[])
    if (!(a as string[]).every((key) => offered.has(key))) return null

    return { v, t, o: o as string[], a: a as string[] }
  } catch {
    // Not decodable, or not JSON. Same conclusion.
    return null
  }
}

/** What the three banner actions and the chooser's save mean. */
export type Decision =
  | { kind: 'all' }
  | { kind: 'necessary-only' }
  | { kind: 'chosen'; keys: string[] }

/**
 * Build the record for a decision the visitor just made (contract §3).
 *
 * `o` is always the full set of configured keys at this moment, never carried forward from a
 * previous record — a stale `o` is precisely the bug this design exists to prevent. Necessary keys
 * are always accepted, whatever was chosen: refusing a strictly necessary category is not an option
 * that exists.
 */
export const decide = (
  decision: Decision,
  categories: CookieCategory[],
  consentVersion: number,
  now: number = Date.now(),
): ConsentRecord => {
  const offered = allKeys(categories)
  const necessary = necessaryKeys(categories)

  const accepted =
    decision.kind === 'all'
      ? offered
      : decision.kind === 'necessary-only'
        ? necessary
        : sorted([...necessary, ...decision.keys.filter((key) => offered.includes(key))])

  return { v: consentVersion, t: Math.floor(now / 1000), o: offered, a: accepted }
}

/**
 * Does this record still count? (contract §4.)
 *
 * Three outcomes, and the distinction between the last two is load-bearing: `ask` and
 * `ask-with-previous` differ only in what the chooser starts from, which is the difference between
 * respecting somebody's earlier answers and making them do the work again. A corrupt record has no
 * trustworthy answers to pre-fill from; a superseded one does.
 */
export const readState = (
  raw: string | undefined | null,
  { consentVersion, categories }: { consentVersion: number; categories: CookieCategory[] },
): ConsentState => {
  const record = parse(raw)
  if (!record) return { status: 'ask' }

  // The notice materially changed and the owner said so (FR-042).
  if (record.v < consentVersion) return { status: 'ask-with-previous', previous: record.a }

  /*
    A category exists that this visitor was never offered (FR-040).

    **This is the guard on the owner's "always three buttons" decision.** With one category
    configured, *Agree* and *Allow Technical Cookies* have identical effect — accepted, and recorded
    in the spec's Assumptions. What stops that from becoming a real failure is this comparison: the
    day an analytics category is added, a stored "yes to everything" does NOT silently become
    consent to it, because `o` remembers what "everything" meant at the time.
  */
  const offered = new Set(record.o)
  const unasked = categories.some((category) => !offered.has(category.key))
  if (unasked) return { status: 'ask-with-previous', previous: record.a }

  /*
    A key in the record that is no longer configured is IGNORED (FR-041) — not an error, and not a
    reason to ask again. A removed category is not a question anybody still needs answered.
  */
  return { status: 'decided', record }
}

/**
 * The effective permission for one category.
 *
 * **This is the only place the question is answered.** FR-038 requires the decision honoured on
 * every page and every route; two implementations of this expression would be two chances to
 * disagree, and the one nobody looks at is where it drifts.
 *
 * Anything other than a settled decision allows only what is strictly necessary — which covers the
 * visitor who has not answered, the one whose record went stale, and the one whose browser refuses
 * to store anything at all.
 */
export const isAllowed = (
  key: string,
  categories: CookieCategory[],
  state: ConsentState,
): boolean => {
  const category = categories.find((entry) => entry.key === key)
  if (!category) return false
  if (category.necessary) return true

  return state.status === 'decided' && state.record.a.includes(key)
}

/** What the chooser's switches should start from, given the current state. */
export const startingSelection = (
  state: ConsentState,
  categories: CookieCategory[],
): string[] => {
  const necessary = necessaryKeys(categories)

  if (state.status === 'decided') return sorted([...necessary, ...state.record.a])
  if (state.status === 'ask-with-previous') return sorted([...necessary, ...state.previous])

  // Nothing trustworthy to start from: everything optional is off, which is what FR-030 requires of
  // a first visit anyway.
  return necessary
}
