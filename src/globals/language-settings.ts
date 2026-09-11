import type { GlobalConfig } from 'payload'

import { DEFAULT_LOCALE, LOCALE_LABELS, SECONDARY_LOCALES } from '@/i18n/routing'
import { isAdmin } from '@/lib/access'
import { revalidateGlobalOnChange } from '@/lib/revalidate'

/**
 * Which languages visitors are offered (spec 010, FR-026 – FR-032).
 *
 * **This is not the list of languages the site has.** Payload always knows all three, and that
 * separation is the feature: Ukrainian can be translated in the admin for weeks before anybody can
 * read it, and switching it off later hides it without touching a word of it (FR-030, FR-028).
 *
 * **English has no field, and that is deliberate.** FR-029 says disabling the default language must
 * be refused with an explanation; a control that does not exist is a stronger guarantee than a
 * validation message, because there is nothing to attempt. The description below is the explanation.
 *
 * **Not localized.** It configures the site rather than saying anything to a visitor, so there is
 * nothing here to translate.
 *
 * The fields are generated from `SECONDARY_LOCALES` rather than written out, so adding a fourth
 * language to `src/i18n/routing.ts` brings its switch with it instead of leaving a language the
 * admin cannot reach.
 */
export const LanguageSettings: GlobalConfig = {
  slug: 'language-settings',
  label: 'Languages',
  admin: {
    group: 'Settings',
    description:
      'Which languages the website offers visitors. English is always offered — it is the language everything falls back to when a translation is missing, so the site cannot be without it. Switching a language off hides it from visitors; nothing you have written in it is lost, and you can keep translating it while it is off.',
  },
  access: {
    // Read is public because the storefront reads it on every page to build the language switcher.
    // It holds two switches and no personal data.
    read: () => true,
    update: isAdmin,
  },
  /**
   * A toggle has to reach prerendered pages, or switching Ukrainian off would leave it live on every
   * cached route until the next deployment — which is the deploy FR-031 says must not be needed.
   */
  hooks: {
    afterChange: [revalidateGlobalOnChange],
  },
  fields: SECONDARY_LOCALES.map((locale) => ({
    name: `${locale}Enabled` as const,
    type: 'checkbox' as const,
    label: `Offer ${LOCALE_LABELS[locale].label} to visitors`,
    defaultValue: true,
    admin: {
      description: `When this is off, ${LOCALE_LABELS[locale].label} disappears from the language switcher and its pages stop being served. Your ${LOCALE_LABELS[locale].label} content stays exactly as you left it.`,
    },
  })),
}

/** Named so `getEnabledLocales` and the admin agree about the field names. */
export const enabledFieldFor = (locale: string): string => `${locale}Enabled`

export { DEFAULT_LOCALE }
