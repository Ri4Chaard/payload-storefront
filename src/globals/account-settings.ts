import type { GlobalConfig } from 'payload'

import { isAdmin } from '@/lib/access'
import { DEFAULT_COUNTRY, countryOptions } from '@/lib/countries'

/**
 * How the accounts feature behaves — not what it says (spec 004, R11).
 *
 * The distinction is the whole point of this file. An `Account` global holding every heading and
 * button label shipped once and was removed: authentication copy is functional UI whose wording is
 * load-bearing for security, and it belongs in the components that render it, where it gets code
 * review.
 * What was genuinely missing afterwards is this — the handful of values that are decisions about
 * the shop rather than sentences about the screen, and that a shop owner should be able to change
 * without a deployment.
 *
 * **The test for whether a value belongs here**: could the owner get it wrong and only inconvenience
 * themselves? Which country the address form starts on passes. Timings and limits do not, which is
 * why `src/lib/auth/config.ts` still owns them — see the note there. An editor who shortens the code
 * lifetime to thirty seconds has not made an editorial decision, they have broken registration for
 * anyone whose mail is slow.
 *
 * **A `marketingEnabled` switch was here and has been removed.** It decided whether the registration
 * form drew a consent checkbox at all, and it failed the test above in a way that took a second look
 * to see: the owner turning it off does not inconvenience themselves, it silently stops asking
 * customers a question they can then never be asked again for that registration. Consent is now
 * always requested and always unticked, which is the only setting of that switch that is correct —
 * so it is not a setting. FR-036 is unchanged; FR-036a is what makes an unticked box harmless.
 *
 * **Both remaining fields are read by screens that land in US5.** They are here now because the
 * settings page was asked for as a whole, and a half-populated one would be edited twice.
 *
 * Grouped in `Shop` alongside **Shop settings**, so the two configuration surfaces sit together
 * rather than one hiding under System.
 *
 * **Flat rather than tabbed.** It was two tabs; with Marketing gone, a lone "Addresses" tab is a
 * click that reveals the whole page. Tabs come back the day there is a second group.
 */
export const AccountSettings: GlobalConfig = {
  slug: 'account-settings',
  label: 'Account settings',
  admin: { group: 'Shop' },
  access: {
    read: () => true,
    update: isAdmin,
  },
  fields: [
    {
      name: 'defaultCountry',
      type: 'select',
      options: countryOptions(),
      defaultValue: DEFAULT_COUNTRY,
      required: true,
      label: 'Default country',
      admin: {
        description:
          'Pre-selected when a customer adds an address (FR-030). The design draws “United Kingdom”, which is placeholder content. Consumed by the address form in US5.',
      },
    },
    {
      name: 'shippingCountries',
      type: 'select',
      options: countryOptions(),
      hasMany: true,
      label: 'Countries offered',
      admin: {
        description:
          'Leave empty to offer every country. Narrowing this changes only what the form OFFERS — the column still accepts any ISO code, so an address already saved in a country you later remove stays valid rather than becoming unsaveable. Consumed by the address form in US5.',
      },
    },
  ],
}
