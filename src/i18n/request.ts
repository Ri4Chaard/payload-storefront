import { getRequestConfig } from 'next-intl/server'

import { asLocale, currentLocale } from './locale'
import { loadMessages } from './messages'

/**
 * `requestLocale` is deliberately unused: next-intl 4.14 marks it
 * `@deprecated Please migrate to next/root-params`, and `AGENTS.md` says to heed deprecations. The
 * `locale` argument is still read, because it is how `getTranslations({ locale })` overrides the
 * segment — which is what the transactional mail in FR-042 depends on.
 */
export default getRequestConfig(async ({ locale }) => {
  const resolved = asLocale(locale) ?? (await currentLocale())
  return { locale: resolved, messages: loadMessages(resolved) as Record<string, unknown> }
})
