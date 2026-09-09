import type { MessengerLink } from '@/lib/messengers/links'

/**
 * What `beginCheckout` answers with (spec 005, T063).
 *
 * **Here rather than beside the action**, for the reason `./types.ts` records at length: a client
 * component needs this type to describe the action it is handed, and importing it from a
 * `'use server'` module — even as a type — puts the whole Payload config on a `'use client'` file's
 * import graph. `src/lib/messengers/links.ts` is pure, so `MessengerLink` may travel with it.
 */
export type CheckoutResult =
  | { message: string; messengers: MessengerLink[]; ok: true }
  | { ok: false; reason: 'empty' | 'error' | 'issues' }
