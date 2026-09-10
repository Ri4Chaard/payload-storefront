import type { EnquiryFieldError } from './enquiry-schema'

/**
 * What `submitEnquiry` answers with (spec 008, T053).
 *
 * **Here rather than beside the action, and Next enforces it.** A `'use server'` module may export
 * **only async functions** — `initialEnquiryState` is an object, so exporting it from `actions.ts`
 * fails at runtime with "A 'use server' file can only export async functions, found object". That
 * is the immediate reason; `src/lib/cart/actions-types.ts` records the deeper one, which applies
 * here too: a client component needs these to describe the action it is handed, and importing them
 * from a `'use server'` module puts the whole Payload config on a `'use client'` file's import
 * graph.
 */

/** What the visitor typed. Handed back on failure so the form can be re-populated. */
export interface EnquiryValues {
  name: string
  email: string
  message: string
}

/**
 * **`message` is a KEY, never a sentence.** The words come from `contact-page.form`, which is the
 * editor's (FR-042), and keys keep the tests assertable — `toBe('throttled')` does not break when
 * somebody rewords the copy. Same convention as `src/lib/auth/actions.ts`.
 */
export type EnquiryState =
  | { status: 'idle' }
  | { status: 'success' }
  | {
      status: 'error'
      message: 'invalid' | 'sendFailed' | 'throttled'
      fieldErrors?: Partial<Record<'email' | 'message' | 'name', EnquiryFieldError>>
      /**
       * **Load-bearing on the no-JavaScript path and invisible on the other one.** With JavaScript,
       * React preserves the DOM across a failed submit and the inputs keep their values by
       * themselves. Without it the browser posts and the page is rendered from scratch — so without
       * this, FR-019 and FR-022's "keep what the visitor wrote" fails silently in exactly the mode
       * nobody tests by hand.
       */
      values: EnquiryValues
    }

export const initialEnquiryState: EnquiryState = { status: 'idle' }
