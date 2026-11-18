/**
 * The numbers behind the contact form.
 *
 * **One place, deliberately** — the shape and the reasoning `src/lib/auth/config.ts` established for
 * the account flow. FR-029d requires the retention period to be "defined in one place rather than
 * written into the cleanup's logic", and the same applies to the rest: a limit that appears in both
 * a validator and a schema is a limit that can disagree with itself.
 */

/**
 * Field maxima, enforced twice from here: as `maxLength` on the collection so invalid content
 * cannot be published, and in `enquiry-schema.ts` so the server action refuses it
 * before Payload is ever asked.
 *
 * 254 for the address is the RFC 5321 ceiling. The other two are judgement: a name longer than 100
 * characters is a paste, and 5000 is several screens of writing — enough for anyone with a real
 * question, short enough that a single request cannot be used to fill the table.
 */
export const ENQUIRY_MAX = {
  name: 100,
  email: 254,
  message: 5000,
} as const

/**
 * How many enquiries one sender may have accepted inside the window.
 *
 * Five is generous for a person — nobody with a genuine question sends a sixth within the hour —
 * and tight enough that the enquiry list cannot be filled from one source. Flagged in the spec's
 * Assumptions as the owner's to confirm.
 *
 * **The cap is on rate, not total.** An attacker who hits it may send another five an hour later,
 * which is the intended behaviour and what SC-010 measures.
 */
export const ENQUIRY_RATE_LIMIT = 5

/** The trailing window the limit counts over. */
export const ENQUIRY_RATE_WINDOW_MS = 60 * 60 * 1000

/**
 * How long an enquiry is kept.
 *
 * Twelve months: long enough that an enquiry about a product somebody is still considering survives
 * the decision, short enough to be defensible as a retention period. Stated in days as well as
 * milliseconds because the collection's admin description says it in words to the owner, and one
 * constant feeding both is what stops the policy and the code drifting apart.
 */
export const ENQUIRY_RETENTION_DAYS = 365
export const ENQUIRY_RETENTION_MS = ENQUIRY_RETENTION_DAYS * 24 * 60 * 60 * 1000
