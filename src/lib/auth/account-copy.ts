import type { Account } from '@/payload-types'

/**
 * The account copy as the screens see it, and the one function that reads a key out of it.
 *
 * **Separate from `copy.ts` because this half has to reach the client.** `copy.ts` imports the
 * Payload config to fetch the global, which must never end up in a browser bundle; the forms need
 * `message` to turn an action's message key into words. Splitting the pure part out is what lets
 * both be true. The alternative — passing a resolver down as a prop — is not merely worse, it is
 * rejected outright: functions cannot cross into a Client Component.
 */
export type AccountCopy = Account

/**
 * Resolve a message key returned by a server action into the words an editor wrote.
 *
 * Takes `object` rather than the full global on purpose: every screen is handed a `Pick` of the
 * copy it renders, and typing this to the whole document would force a cast at each of them.
 *
 * Actions return keys, never sentences — the alternative is English hardcoded in the place it is
 * least visible. The fallback is deliberately the key itself: a missing string should look wrong in
 * review rather than render as an empty space nobody notices.
 */
export function message(copy: object, key: string | undefined): string | undefined {
  if (!key) return undefined
  const value = (copy as unknown as Record<string, unknown>)[key]
  return typeof value === 'string' && value.length > 0 ? value : key
}
