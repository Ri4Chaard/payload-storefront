import type { GlobalConfig } from 'payload'

import { isAdmin } from '@/lib/access'

/**
 * Every word a customer reads in the accounts feature (spec 004, research R11, FR-047).
 *
 * Nine auth screens, four modals and three emails, and Constitution I says none of their copy may
 * live in a component. "Please fill in the information below:" hardcoded in JSX is a deployment
 * every time marketing wants a different sentence.
 *
 * A separate global rather than more fields on `Shop`, which is labelled "Shop settings" and models
 * product-page copy. Different editor, different concern, and the structure rule asks for one
 * concern per file.
 *
 * **The defaults are the design, corrected.** Four defects were catalogued while reading the Figma
 * (004/spec.md, Design Inventory):
 *
 *   - Russian strings on the forgot-password and reset screens, in an otherwise English design
 *   - `Fargot password?` — a typo, twice
 *   - the Security row labelled `Security` in one frame and `safety` in three others
 *   - the same six-digit control drawn at two sizes
 *
 * None of them is reproduced here and fixed later. The field defaults below are simply right, so an
 * untouched install renders the design as it was meant to read. The fourth is a component decision,
 * not a copy one, and lives in `OtpInput`.
 *
 * No `revalidate` hook: none of these strings appears on a cached route. The account pages are all
 * rendered per request because every one of them depends on the session.
 */
export const Account: GlobalConfig = {
  slug: 'account',
  label: 'Account & auth copy',
  admin: { group: 'Shop' },
  access: {
    read: () => true,
    update: isAdmin,
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Sign in',
          fields: [
            { name: 'signInTitle', type: 'text', defaultValue: 'WELCOME BACK', label: 'Heading' },
            {
              name: 'signInSubtitle',
              type: 'text',
              defaultValue: 'Please fill in the information below:',
              label: 'Subheading',
            },
            {
              name: 'signInEmailLabel',
              type: 'text',
              defaultValue: 'Email Address',
              label: 'Email field label',
            },
            {
              name: 'signInPasswordLabel',
              type: 'text',
              defaultValue: 'Password',
              label: 'Password field label',
            },
            {
              name: 'signInForgotLink',
              type: 'text',
              defaultValue: 'Forgot password?',
              label: 'Forgot-password link',
              admin: {
                description:
                  'The design reads “Fargot password?”. That is a typo, and this is the correction.',
              },
            },
            { name: 'signInSubmit', type: 'text', defaultValue: 'Log in', label: 'Submit button' },
            {
              name: 'signInCreatePrompt',
              type: 'text',
              defaultValue: 'Don’t have an account?',
              label: 'Create-account prompt',
              admin: {
                description:
                  'The lead-in only. The underlined half is the next field — the design links “Create one”, not the whole sentence.',
              },
            },
            {
              name: 'signInCreateLink',
              type: 'text',
              defaultValue: 'Create one',
              label: 'Create-account link text',
            },
            {
              name: 'signInFailed',
              type: 'text',
              defaultValue: 'That email address and password do not match.',
              label: 'Sign-in failure message',
              admin: {
                description:
                  'Shown for a wrong password AND for an address with no account. It must not distinguish between them — saying “no such account” tells an attacker which addresses are registered.',
              },
            },
            {
              name: 'signInLocked',
              type: 'text',
              defaultValue:
                'Too many attempts. For your security, try again in a few minutes or reset your password.',
              label: 'Locked-out message',
            },
          ],
        },
        {
          label: 'Create account',
          fields: [
            {
              name: 'createTitle',
              type: 'text',
              defaultValue: 'CREATE ACCOUNT',
              label: 'Heading',
            },
            {
              name: 'createSubtitle',
              type: 'text',
              defaultValue: 'Please fill in the information below:',
              label: 'Subheading',
            },
            {
              name: 'createConfirmLabel',
              type: 'text',
              defaultValue: 'Confirm Password',
              label: 'Confirm-password label',
            },
            {
              name: 'createSubmit',
              type: 'text',
              defaultValue: 'Create Account',
              label: 'Submit button',
            },
            {
              name: 'createSignInPrompt',
              type: 'text',
              defaultValue: 'Already have an account?',
              label: 'Sign-in prompt',
              admin: { description: 'The lead-in only; the link text is the next field.' },
            },
            {
              name: 'createSignInLink',
              type: 'text',
              defaultValue: 'Log in',
              label: 'Sign-in link text',
            },
            {
              name: 'createMarketingConsent',
              type: 'text',
              defaultValue: 'Email me occasional news and offers.',
              label: 'Marketing consent checkbox',
              admin: {
                description:
                  'The design draws no such control. It is here because marketing email is opt-in, so consent has to be asked for rather than assumed — and it is never a condition of registering.',
              },
            },
            {
              name: 'createEmailInvalid',
              type: 'text',
              defaultValue: 'That does not look like an email address.',
              label: 'Invalid email message',
            },
            {
              name: 'createPasswordMismatch',
              type: 'text',
              defaultValue: 'The two passwords do not match.',
              label: 'Password mismatch message',
            },
            {
              name: 'createPasswordTooWeak',
              type: 'text',
              defaultValue: 'Use at least 8 characters, and avoid a password you use elsewhere.',
              label: 'Weak password message',
            },
          ],
        },
        {
          label: 'Verify email',
          fields: [
            {
              name: 'verifyTitle',
              type: 'text',
              defaultValue: 'VERIFY YOUR EMAIL',
              label: 'Heading',
            },
            {
              name: 'verifySubtitle',
              type: 'text',
              defaultValue: 'We’ve sent a verification code to your email address',
              label: 'Subheading',
            },
            {
              name: 'verifyCodeLabel',
              type: 'text',
              defaultValue: 'Verification code',
              label: 'Code field label',
              admin: { description: 'The accessible name for the six boxes, read as one control.' },
            },
            { name: 'verifySubmit', type: 'text', defaultValue: 'Verify', label: 'Submit button' },
            {
              name: 'verifyResendPrompt',
              type: 'text',
              defaultValue: 'Didn’t receive the code? Resend',
              label: 'Resend prompt',
            },
            {
              name: 'verifyResendSent',
              type: 'text',
              defaultValue: 'A new code is on its way.',
              label: 'Resend confirmation',
            },
            {
              name: 'verifyResendTooSoon',
              type: 'text',
              defaultValue: 'Please wait a moment before requesting another code.',
              label: 'Resend cooldown message',
            },
            {
              name: 'codeInvalid',
              type: 'text',
              defaultValue: 'Invalid code. Please try again.',
              label: 'Wrong code message',
            },
            {
              name: 'codeExpired',
              type: 'text',
              defaultValue: 'That code has expired. Request a new one.',
              label: 'Expired code message',
              admin: {
                description:
                  'Distinct from “invalid” on purpose. Telling someone their code is wrong when it has simply timed out is how they get stuck retyping it.',
              },
            },
            {
              name: 'codeAlreadyUsed',
              type: 'text',
              defaultValue: 'That code has already been used. Request a new one.',
              label: 'Spent code message',
            },
            {
              name: 'codeSuperseded',
              type: 'text',
              defaultValue: 'A newer code was sent. Please use the most recent one.',
              label: 'Superseded code message',
            },
            {
              name: 'codeTooManyAttempts',
              type: 'text',
              defaultValue: 'Too many incorrect attempts. Request a new code.',
              label: 'Attempts exhausted message',
            },
          ],
        },
        {
          label: 'Forgot & reset',
          fields: [
            {
              name: 'forgotTitle',
              type: 'text',
              defaultValue: 'FORGOT PASSWORD',
              label: 'Heading',
            },
            {
              name: 'forgotSubtitle',
              type: 'text',
              defaultValue: 'Enter the email address associated with your account.',
              label: 'Subheading',
            },
            {
              name: 'forgotSubmit',
              type: 'text',
              defaultValue: 'Send code',
              label: 'Submit button',
            },
            {
              name: 'forgotBackLink',
              type: 'text',
              defaultValue: 'Back to sign in',
              label: 'Back link',
              admin: {
                description:
                  'The design reads “Вернуться к авторизации”. The rest of the design is English; this is the translation.',
              },
            },
            {
              name: 'forgotSent',
              type: 'textarea',
              defaultValue:
                'If that address has an account, a code is on its way. Check your inbox.',
              label: 'Confirmation message',
              admin: {
                description:
                  'Shown whether or not the address is registered, and it must stay that way. A message that differs turns this form into a way to discover who has an account.',
              },
            },
            {
              name: 'resetCodeTitle',
              type: 'text',
              defaultValue: 'ENTER THE CODE',
              label: 'Code step heading',
            },
            {
              name: 'resetCodeSubtitle',
              type: 'text',
              defaultValue: 'We have sent a 6-digit code to your email',
              label: 'Code step subheading',
            },
            {
              name: 'resetTitle',
              type: 'text',
              defaultValue: 'NEW PASSWORD',
              label: 'New password heading',
            },
            {
              name: 'resetSubtitle',
              type: 'text',
              defaultValue: 'Create a new password for your account.',
              label: 'New password subheading',
            },
            {
              name: 'resetNewLabel',
              type: 'text',
              defaultValue: 'New password',
              label: 'New password label',
              admin: { description: 'The design reads “Новый пароль”.' },
            },
            {
              name: 'resetConfirmLabel',
              type: 'text',
              defaultValue: 'Repeat password',
              label: 'Repeat password label',
              admin: { description: 'The design reads “Повторите пароль”.' },
            },
            {
              name: 'resetSubmit',
              type: 'text',
              defaultValue: 'Save',
              label: 'Submit button',
              admin: { description: 'The design reads “СОХРАНИТЬ”.' },
            },
            {
              name: 'resetDone',
              type: 'text',
              defaultValue: 'Your password has been changed. You can sign in with it now.',
              label: 'Success message',
            },
          ],
        },
        {
          label: 'Registration success',
          fields: [
            {
              name: 'successTitle',
              type: 'text',
              defaultValue: 'Successful registration',
              label: 'Heading',
            },
            {
              name: 'successBody',
              type: 'textarea',
              defaultValue: 'Your account has been successfully created. Welcome to AURUM!',
              label: 'Body',
            },
            {
              name: 'successAction',
              type: 'text',
              defaultValue: 'Start shopping',
              label: 'Button label',
            },
          ],
        },
        {
          label: 'Profile',
          fields: [
            { name: 'profileTitle', type: 'text', defaultValue: 'My account', label: 'Page title' },
            {
              name: 'profileEmailLabel',
              type: 'text',
              defaultValue: 'Email',
              label: 'Email row',
            },
            {
              name: 'profileNameLabel',
              type: 'text',
              defaultValue: 'Full name',
              label: 'Full name row',
            },
            {
              name: 'profileNameEmpty',
              type: 'text',
              defaultValue: 'No name added',
              label: 'Full name empty state',
            },
            {
              name: 'profileAddressesLabel',
              type: 'text',
              defaultValue: 'Addresses',
              label: 'Addresses row',
            },
            {
              name: 'profileAddressesEmpty',
              type: 'text',
              defaultValue: 'No addresses added',
              label: 'Addresses empty state',
            },
            {
              name: 'profileMarketingLabel',
              type: 'text',
              defaultValue: 'Marketing preferences',
              label: 'Marketing row',
            },
            {
              name: 'profileMarketingEmailToggle',
              type: 'text',
              defaultValue: 'Email',
              label: 'Marketing toggle label',
            },
            {
              name: 'profileSecurityLabel',
              type: 'text',
              defaultValue: 'Security',
              label: 'Security row',
              admin: {
                description:
                  'One label, used everywhere. The design says “Security” in one frame and “safety” in three others; this settles it.',
              },
            },
            {
              name: 'profileChangePassword',
              type: 'text',
              defaultValue: 'Change password',
              label: 'Change-password link',
            },
            {
              name: 'profileSignOut',
              type: 'text',
              defaultValue: 'Sign out',
              label: 'Sign-out button',
            },
            {
              name: 'profileSaveFailed',
              type: 'text',
              defaultValue: 'That didn’t save. Please try again.',
              label: 'Generic save failure',
            },
          ],
        },
        {
          label: 'Modals',
          fields: [
            {
              name: 'nameModalTitle',
              type: 'text',
              defaultValue: 'FULL NAME',
              label: 'Full name modal title',
            },
            {
              name: 'nameModalFirst',
              type: 'text',
              defaultValue: 'First name',
              label: 'First name field',
            },
            {
              name: 'nameModalLast',
              type: 'text',
              defaultValue: 'Last name',
              label: 'Last name field',
            },
            {
              name: 'addressModalTitle',
              type: 'text',
              defaultValue: 'ADD ADDRESS',
              label: 'Address modal title',
            },
            {
              name: 'addressModalEditTitle',
              type: 'text',
              defaultValue: 'EDIT ADDRESS',
              label: 'Address modal title when editing',
            },
            {
              name: 'addressCountryLabel',
              type: 'text',
              defaultValue: 'Country',
              label: 'Country field',
            },
            {
              name: 'addressLine1Label',
              type: 'text',
              defaultValue: 'Address line 1',
              label: 'Address line 1 field',
            },
            {
              name: 'addressLine2Label',
              type: 'text',
              defaultValue: 'Address line 2 (optional)',
              label: 'Address line 2 field',
            },
            {
              name: 'addressApartmentLabel',
              type: 'text',
              defaultValue: 'Apartment, suite, etc (optional)',
              label: 'Apartment field',
            },
            { name: 'addressCityLabel', type: 'text', defaultValue: 'City', label: 'City field' },
            {
              name: 'addressPostcodeLabel',
              type: 'text',
              defaultValue: 'Postcode',
              label: 'Postcode field',
            },
            {
              name: 'addressDefaultLabel',
              type: 'text',
              defaultValue: 'This is my default address',
              label: 'Default address checkbox',
            },
            {
              name: 'addressDeleteConfirm',
              type: 'text',
              defaultValue: 'Delete this address?',
              label: 'Delete confirmation',
            },
            {
              name: 'changePasswordTitle',
              type: 'text',
              defaultValue: 'CHANGE PASSWORD',
              label: 'Change password modal title',
            },
            {
              name: 'changePasswordCurrent',
              type: 'text',
              defaultValue: 'Current password',
              label: 'Current password field',
            },
            {
              name: 'changePasswordWrong',
              type: 'text',
              defaultValue: 'That is not your current password.',
              label: 'Wrong current password message',
            },
            { name: 'modalCancel', type: 'text', defaultValue: 'Cancel', label: 'Cancel button' },
            { name: 'modalSave', type: 'text', defaultValue: 'Save', label: 'Save button' },
            { name: 'modalClose', type: 'text', defaultValue: 'Close', label: 'Close control' },
          ],
        },
        {
          label: 'Emails',
          fields: [
            {
              name: 'verifyEmailSubject',
              type: 'text',
              defaultValue: 'Your Aurum verification code',
              label: 'Verification email subject',
            },
            {
              name: 'verifyEmailBody',
              type: 'textarea',
              defaultValue:
                'Use this code to confirm your email address. It expires in 10 minutes. If you didn’t create an Aurum account, you can ignore this message.',
              label: 'Verification email body',
              admin: { description: 'The code is inserted beneath this text.' },
            },
            {
              name: 'resetEmailSubject',
              type: 'text',
              defaultValue: 'Your Aurum password reset code',
              label: 'Reset email subject',
            },
            {
              name: 'resetEmailBody',
              type: 'textarea',
              defaultValue:
                'Use this code to set a new password. It expires in 10 minutes. If you didn’t ask to reset your password, you can ignore this message — nothing has changed.',
              label: 'Reset email body',
            },
            {
              name: 'passwordChangedSubject',
              type: 'text',
              defaultValue: 'Your Aurum password was changed',
              label: 'Password-changed subject',
            },
            {
              name: 'passwordChangedBody',
              type: 'textarea',
              defaultValue:
                'The password on your Aurum account has just been changed, and you have been signed out everywhere else. If this wasn’t you, reset your password immediately and contact us.',
              label: 'Password-changed body',
              admin: {
                description:
                  'Transactional, and sent regardless of marketing preferences — it is how someone finds out their account was taken.',
              },
            },
          ],
        },
        {
          label: 'Defaults',
          fields: [
            {
              name: 'defaultCountry',
              type: 'text',
              defaultValue: 'AE',
              label: 'Default country (ISO code)',
              admin: {
                description:
                  'Pre-selected in the address form. The design draws “United Kingdom”, which is placeholder content. Two letters, ISO 3166-1 alpha-2.',
              },
            },
          ],
        },
      ],
    },
  ],
}
