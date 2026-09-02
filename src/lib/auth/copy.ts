/**
 * Every word the accounts feature shows a customer.
 *
 * **These strings are code, and that is a deliberate reversal.** They lived in an `account` global
 * for one release, on the reasoning that Constitution I keeps customer-visible text out of JSX. The
 * reasoning does not survive contact with what these particular screens are: authentication is
 * functional UI, not shop content. Nobody is going to A/B test “Confirm Password”, and the knob
 * cost a table, a database read on every auth render, two migrations and a prop threaded through
 * every screen to keep the copy out of the client bundle.
 *
 * It was also actively unsafe in one place. `signInFailed` is shown both for a wrong password and
 * for an address with no account, and it MUST NOT distinguish them — an editor helpfully sharpening
 * it to “We don’t know that email” turns the sign-in form into a way to enumerate customers. Two
 * more have the same property: `forgotSent` is shown whether or not the address is registered, and
 * the resend prompt must not reveal a cooldown. Wording that is load-bearing for security belongs
 * where it gets code review, not behind an edit box.
 *
 * Constitution I still holds for the shop — product copy, the accordions, the shop settings. It is
 * about content editors owning content. These are labels on a machine.
 *
 * **The defaults are the design, corrected.** Four defects were catalogued while reading the Figma
 * (004/spec.md, Design Inventory), and none is reproduced here:
 *
 *   - Russian strings on the forgot-password and reset screens, in an otherwise English design
 *   - `Fargot password?` — a typo, twice
 *   - the Security row labelled `Security` in one frame and `safety` in three others
 *   - the same six-digit control drawn at two sizes (a component decision; it lives in `OtpInput`)
 *
 * **Grouped, and exported separately on purpose.** A client component importing `verifyCopy` gets
 * the twelve strings it renders; the profile labels, the modal titles and the three email bodies do
 * not follow it into the bundle. One flat object would ship all of it to every screen.
 */

/** Node `408:7416`. */
export const signInCopy = {
  signInTitle: 'WELCOME BACK',
  signInSubtitle: 'Please fill in the information below:',
  signInEmailLabel: 'Email Address',
  signInPasswordLabel: 'Password',
  /** The design reads “Fargot password?”. That is a typo, and this is the correction. */
  signInForgotLink: 'Forgot password?',
  signInSubmit: 'Log in',
  /** The lead-in only — the design underlines “Create one”, not the whole sentence. */
  signInCreatePrompt: 'Don’t have an account?',
  signInCreateLink: 'Create one',
  /**
   * Shown for a wrong password AND for an address with no account. Do not split these. Saying “no
   * such account” tells an attacker which addresses are registered (FR-011).
   */
  signInFailed: 'That email address and password do not match.',
  signInLocked:
    'Too many attempts. For your security, try again in a few minutes or reset your password.',
} as const

/** Node `428:11594`. */
export const createAccountCopy = {
  createTitle: 'CREATE ACCOUNT',
  createSubtitle: 'Please fill in the information below:',
  signInEmailLabel: signInCopy.signInEmailLabel,
  signInPasswordLabel: signInCopy.signInPasswordLabel,
  createConfirmLabel: 'Confirm Password',
  createSubmit: 'Create Account',
  createSignInPrompt: 'Already have an account?',
  createSignInLink: 'Log in',
  /**
   * The design draws no such control. It is here because marketing email is opt-in, so consent has
   * to be asked for rather than assumed — and it is never a condition of registering (FR-036a).
   */
  createMarketingConsent: 'Email me occasional news and offers.',
  createEmailInvalid: 'That does not look like an email address.',
  createPasswordMismatch: 'The two passwords do not match.',
  createPasswordTooWeak: 'Use at least 8 characters, and avoid a password you use elsewhere.',
} as const

/** Nodes `428:11869` and `429:12404`. */
export const verifyCopy = {
  verifyTitle: 'VERIFY YOUR EMAIL',
  verifySubtitle: 'We’ve sent a verification code to your email address',
  /** The accessible name for the six boxes, read as one control. */
  verifyCodeLabel: 'Verification code',
  verifySubmit: 'Verify',
  verifyResendPrompt: 'Didn’t receive the code? Resend',
  verifyResendSent: 'Resend',
  codeInvalid: 'Invalid code. Please try again.',
  /**
   * Distinct from “invalid” on purpose. Telling someone their code is wrong when it has simply
   * timed out is how they get stuck retyping it.
   */
  codeExpired: 'That code has expired. Request a new one.',
  codeAlreadyUsed: 'That code has already been used. Request a new one.',
  codeSuperseded: 'A newer code was sent. Please use the most recent one.',
  codeTooManyAttempts: 'Too many incorrect attempts. Request a new code.',
} as const

/** Nodes `429:12139` and `429:12936`. */
export const resetCopy = {
  forgotTitle: 'FORGOT PASSWORD',
  forgotSubtitle: 'Enter the email address associated with your account.',
  forgotSubmit: 'Send code',
  /** The design reads “Вернуться к авторизации”. The rest of the design is English. */
  forgotBackLink: 'Back to sign in',
  /**
   * Shown whether or not the address is registered, and it must stay that way. A message that
   * differs turns this form into a way to discover who has an account (FR-018).
   */
  forgotSent: 'If that address has an account, a code is on its way. Check your inbox.',
  resetCodeTitle: 'ENTER THE CODE',
  resetCodeSubtitle: 'We have sent a 6-digit code to your email',
  resetTitle: 'NEW PASSWORD',
  resetSubtitle: 'Create a new password for your account.',
  /** The design reads “Новый пароль”. */
  resetNewLabel: 'New password',
  /** The design reads “Повторите пароль”. */
  resetConfirmLabel: 'Repeat password',
  /** The design reads “СОХРАНИТЬ”. */
  resetSubmit: 'Save',
  resetDone: 'Your password has been changed. You can sign in with it now.',
} as const

/** Node `432:13049`. */
export const successCopy = {
  successTitle: 'Successful registration',
  successBody: 'Your account has been successfully created. Welcome to AURUM!',
  successAction: 'Start shopping',
} as const

/** Node `266:4382`. */
export const profileCopy = {
  profileTitle: 'My account',
  profileEmailLabel: 'Email',
  profileNameLabel: 'Full name',
  profileNameEmpty: 'No name added',
  profileAddressesLabel: 'Addresses',
  profileAddressesEmpty: 'No addresses added',
  profileMarketingLabel: 'Marketing preferences',
  profileMarketingEmailToggle: 'Email',
  /** One label. The design says “Security” in one frame and “safety” in three others. */
  profileSecurityLabel: 'Security',
  profileChangePassword: 'Change password',
  profileSignOut: 'Sign out',
  profileSaveFailed: 'That didn’t save. Please try again.',
} as const

/** The four dialogs the profile page opens. */
export const modalCopy = {
  nameModalTitle: 'FULL NAME',
  nameModalFirst: 'First name',
  nameModalLast: 'Last name',
  addressModalTitle: 'ADD ADDRESS',
  addressModalEditTitle: 'EDIT ADDRESS',
  addressCountryLabel: 'Country',
  addressLine1Label: 'Address line 1',
  addressLine2Label: 'Address line 2 (optional)',
  addressApartmentLabel: 'Apartment, suite, etc (optional)',
  addressCityLabel: 'City',
  addressPostcodeLabel: 'Postcode',
  addressDefaultLabel: 'This is my default address',
  addressDeleteConfirm: 'Delete this address?',
  changePasswordTitle: 'CHANGE PASSWORD',
  changePasswordCurrent: 'Current password',
  changePasswordWrong: 'That is not your current password.',
  modalCancel: 'Cancel',
  modalSave: 'Save',
  modalClose: 'Close',
} as const

/**
 * The three transactional messages. Server-side only — `src/lib/email/` is the sole consumer, and
 * these bodies have no business in a browser bundle.
 */
export const emailCopy = {
  verifyEmailSubject: 'Your Aurum verification code',
  /** The code is inserted beneath this text, never in the subject line. */
  verifyEmailBody:
    'Use this code to confirm your email address. It expires in 10 minutes. If you didn’t create an Aurum account, you can ignore this message.',
  resetEmailSubject: 'Your Aurum password reset code',
  resetEmailBody:
    'Use this code to set a new password. It expires in 10 minutes. If you didn’t ask to reset your password, you can ignore this message — nothing has changed.',
  passwordChangedSubject: 'Your Aurum password was changed',
  /**
   * Transactional, and sent regardless of marketing preferences — it is how someone finds out their
   * account was taken (FR-035).
   */
  passwordChangedBody:
    'The password on your Aurum account has just been changed, and you have been signed out everywhere else. If this wasn’t you, reset your password immediately and contact us.',
} as const

/**
 * Resolve a message key returned by a server action into the words shown on screen.
 *
 * Actions return keys, never sentences. That keeps them assertable — the integration tests compare
 * two responses to each other, and `expect(result.message).toBe('codeExpired')` does not break the
 * day somebody rewords the sentence. Each screen resolves against the group it renders.
 *
 * The fallback is deliberately the key itself: a missing string should look wrong in review rather
 * than render as an empty space nobody notices.
 */
export function message(copy: Record<string, string>, key: string | undefined): string | undefined {
  if (!key) return undefined
  const value = copy[key]
  return typeof value === 'string' && value.length > 0 ? value : key
}
