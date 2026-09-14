import type { RequestContext } from 'payload'

import { DEFAULT_LOCALE, LOCALES, type Locale } from './routing'

/**
 * Getting the language into mail that PAYLOAD sends (spec 010, FR-042).
 *
 * Registration and password reset are the two messages this codebase does not send itself: Payload
 * sends them, through `verify.generateEmailHTML` and `forgotPassword.generateEmailHTML`. Those hooks
 * receive a `req` and nothing of the action's own scope, so the locale travels the way anything else
 * reaches a Payload hook — on `req.context`, the same mechanism `skipRevalidation` uses.
 *
 * Reading the `NEXT_LOCALE` cookie off `req` instead would be wrong for the same reason it is wrong
 * everywhere else in this feature: a visitor who arrived on `/ru/create-account` from a link has no
 * cookie, and their verification code would arrive in English.
 *
 * **Its own module, and that is load-bearing.** These two functions started life in
 * `src/lib/email/transactional.ts`, which imports `@tokens/mapping` for the mail's colours — and
 * `verification-email.ts` imports that module **dynamically**, inside the function, so that its
 * graph stays out of anything that merely references the hook. A static import of it pulled the
 * design tokens into every module that touches Payload's config, which surfaced as Playwright
 * refusing to load its whole suite: `colors.json needs an import attribute of "type: json"`. Keeping
 * these here keeps the lazy import lazy.
 */
export const localeContext = (locale: Locale): RequestContext => ({ locale })

/** Read it back inside a hook, falling back to English rather than throwing. */
export const localeFromContext = (context: RequestContext | undefined): Locale => {
  const value = context?.locale
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value)
    ? (value as Locale)
    : DEFAULT_LOCALE
}
