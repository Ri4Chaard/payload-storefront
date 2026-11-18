/**
 * The visitor's cookie decision.
 *
 * **Nothing in this directory may import `next/headers`.** `cookies` is a request-time API, and
 * the banner lives in the root layout — reading the decision on the server would opt every route on
 * this site into dynamic rendering and cost the prerendered catalogue. The codebase already refused
 * that trade once, for the cart badge. A lint rule in `eslint.config.mjs` enforces it so the
 * decision does not depend on anybody remembering it.
 */

/**
 * The stored record. Field names are one character because this rides on every request to the
 * origin; with one category the encoded value is under 100 bytes.
 */
export interface ConsentRecord {
  /** `consentVersion` in force when the decision was made. */
  v: number
  /** Decision time, Unix seconds. */
  t: number
  /**
   * Every category key OFFERED at that moment.
   *
   * **The field this design exists for.** With one category configured, *Agree* and *Allow
   * Technical Cookies* have identical effect — the owner's accepted trade. The only thing standing
   * between that and a real failure is this list: without it, the day an analytics category is
   * added, a stored "yes to everything" would read as consent to a category nobody was ever shown.
   */
  o: string[]
  /** The subset accepted. Always a subset of `o`; always contains every necessary key. */
  a: string[]
}

/**
 * What a read of the cookie concluded.
 *
 * `ask` and `ask-with-previous` differ only in what the chooser starts from, and collapsing them
 * would be the difference between respecting somebody's earlier answers and making them redo the
 * work. A corrupt record has no trustworthy answers to pre-fill from; a superseded one does.
 */
export type ConsentState =
  | { status: 'decided'; record: ConsentRecord }
  | { status: 'ask' }
  | { status: 'ask-with-previous'; previous: string[] }
