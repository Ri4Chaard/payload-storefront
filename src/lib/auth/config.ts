/**
 * Every duration and limit the accounts feature turns on (spec 004, research R14).
 *
 * These are gathered here rather than written at their call sites for two reasons. The spec states
 * them as testable values — a test that asserts "expired after ten minutes" and an implementation
 * that waits nine are both defensible in isolation and wrong together — and operations may need to
 * move them without hunting through six files.
 *
 * They are NOT in Payload. A global would make them editable, and none of them is content: an
 * editor who shortens the code lifetime to thirty seconds has not made an editorial decision, they
 * have broken registration for anyone whose mail takes a minute to arrive.
 */

/** Milliseconds a verification or reset code stays valid. Spec assumption; FR-005. */
export const CODE_TTL_MS = 10 * 60 * 1000

/**
 * Milliseconds a customer must wait between code sends for one address.
 *
 * Short enough that a customer who genuinely did not receive the first one is not stuck staring at
 * a dead button, long enough that the resend link is not a free mail cannon pointed at any address
 * an attacker names. FR-006.
 */
export const CODE_RESEND_COOLDOWN_MS = 60 * 1000

/** Codes issued per address per hour, across both purposes. FR-006. */
export const CODE_REQUESTS_PER_HOUR = 10

/**
 * Wrong entries before a code is burned and a new one must be requested.
 *
 * Six digits is a million possibilities, so five guesses is not the thing standing between an
 * attacker and an account — the ten-minute expiry is. This stops the cheap version of the attack
 * and, more usefully, stops a customer silently retyping a code that was never going to work.
 * FR-005.
 */
export const CODE_MAX_ATTEMPTS = 5

/** Consecutive failed sign-ins before Payload locks the account. FR-014. */
export const LOGIN_MAX_ATTEMPTS = 10

/** How long that lock lasts, in milliseconds. FR-014. */
export const LOGIN_LOCK_MS = 15 * 60 * 1000

/**
 * How long a session survives without being used, in SECONDS — Payload's `tokenExpiration` is the
 * one value here measured that way, and mixing the units silently is how a thirty-day session
 * becomes a thirty-second one.
 *
 * Payload's own default is 7200 (two hours), which would sign a customer out roughly every visit
 * and fail FR-012 outright. Thirty days is the ordinary shape of "remember me" for a shop.
 */
export const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60

/**
 * How long an account that never completed verification is kept, in milliseconds.
 *
 * Long enough that someone who registered on Friday and read their mail on Monday still has an
 * account; short enough that an address is not held hostage forever by a registration nobody
 * finished, and that the personal data does not sit there indefinitely. FR-041.
 */
export const UNVERIFIED_ACCOUNT_TTL_MS = 7 * 24 * 60 * 60 * 1000

/** How long a spent, expired or superseded code row is kept before the purge deletes it. FR-040. */
export const CODE_RETENTION_MS = 24 * 60 * 60 * 1000

/** Digits in a verification code. Both code screens draw six. FR-043. */
export const CODE_LENGTH = 6

/**
 * Minimum password length. FR-003.
 *
 * Length and uniqueness, not composition rules: a memory-hard hash is what defends a stolen
 * database, and "must contain a symbol" mostly produces `Password1!` and a sticky note.
 */
export const PASSWORD_MIN_LENGTH = 8

/**
 * How long the opaque handle issued by `verifyResetCode` stays good, in milliseconds.
 *
 * It stands between the two halves of the reset flow — the customer has proved they read the code,
 * and has not yet chosen a password. Ten minutes is enough to think of one and not so long that a
 * handle left in a closed tab is still live tomorrow. Payload's own `resetPasswordExpiration`
 * (one hour by default) is the outer bound; this is the tighter one, and it is the one that governs.
 */
export const RESET_HANDLE_TTL_MS = 10 * 60 * 1000
