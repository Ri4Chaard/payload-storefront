import type en from '@/i18n/messages/en.json'

/**
 * English is the type source for every message key.
 *
 * With this declared, `t('catalog.appliedFilters')` is checked at compile time and a key that exists
 * only in `ru.json` is an error rather than a string that renders as itself on two of the three
 * languages. It also means deleting an English key breaks the build wherever it was used, which is
 * the right moment to find out.
 */
declare module 'next-intl' {
  interface AppConfig {
    Messages: typeof en
  }
}
