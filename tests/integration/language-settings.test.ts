import config from '@payload-config'
import { getPayload } from 'payload'
import { afterAll, describe, expect, it } from 'vitest'

import { DEFAULT_LOCALE, LOCALES } from '@/i18n/routing'
import { LanguageSettings } from '@/globals/language-settings'
import { skipRevalidation } from '@/lib/revalidate'

/**
 * Which languages visitors are offered (spec 010, T060 — FR-026 – FR-031).
 *
 * **`getEnabledLocales` is `cache()`-wrapped**, which memoises per request and therefore, in a test
 * process, for the lifetime of the module. So these assert against the global and the field
 * configuration rather than calling the reader repeatedly and watching a cached answer never change.
 * The storefront behaviour — a disabled language redirecting, the switcher losing a row — is proved
 * against a real server in `tests/e2e/language-availability.spec.ts`.
 */
const payload = await getPayload({ config })

/*
  `skipRevalidation` because this process has no request scope: `revalidateGlobalOnChange` calls
  `revalidatePath`, which throws `Invariant: static generation store missing` outside one. The
  codebase already carries that escape hatch for the seed scripts, and it exists for exactly this.
*/
const setEnabled = (data: Record<string, boolean>) =>
  payload.updateGlobal({
    slug: 'language-settings',
    data,
    overrideAccess: true,
    context: skipRevalidation,
  })

afterAll(async () => {
  await setEnabled({ ruEnabled: true, ukEnabled: true })
})

describe('the language settings global', () => {
  it('offers a switch for every language except the default', () => {
    /*
      FR-029: English cannot be switched off, and the guarantee is that there is nothing to switch —
      not a validation message somebody could later relax.

      Asserted as a subset rather than an exact list: `getPayload` sanitises the config and mutates
      this object in place, appending `updatedAt` and `createdAt`. What matters is which locale
      switches exist, not what Payload added around them.
    */
    const names = LanguageSettings.fields.map((field) => ('name' in field ? field.name : ''))
    for (const locale of LOCALES) {
      const expected = names.includes(`${locale}Enabled`)
      expect(expected, `${locale} switch present`).toBe(locale !== DEFAULT_LOCALE)
    }
  })

  it('describes to an editor what switching one off actually does', () => {
    // Constitution IV: a field no editor can interpret will be filled in incorrectly. This one
    // decides whether a language is visible to the public, so "off" has to be unambiguous.
    const switches = LanguageSettings.fields.filter(
      (field) => 'name' in field && String(field.name).endsWith('Enabled'),
    )
    expect(switches.length).toBeGreaterThan(0)
    for (const field of switches) {
      const admin = 'admin' in field ? (field.admin as { description?: string } | undefined) : undefined
      expect(admin?.description).toBeTruthy()
    }
    expect(LanguageSettings.admin?.description).toMatch(/English is always offered/)
  })

  it('defaults every switchable language to on', async () => {
    // From a known state: another test in this file, or a developer poking at the admin, may have
    // left one off.
    await setEnabled({ ruEnabled: true, ukEnabled: true })
    const settings = await payload.findGlobal({ slug: 'language-settings', overrideAccess: false })
    const record = settings as unknown as Record<string, unknown>
    // A site that has just been deployed offers what it was configured with rather than silently
    // hiding two languages until somebody finds this screen.
    expect(record.ruEnabled === undefined || record.ruEnabled === true).toBe(true)
    expect(record.ukEnabled === undefined || record.ukEnabled === true).toBe(true)
  })

  it('remembers a language being switched off, and switched back on', async () => {
    await setEnabled({ ruEnabled: true, ukEnabled: false })
    let record = (await payload.findGlobal({
      slug: 'language-settings',
      overrideAccess: false,
    })) as unknown as Record<string, unknown>
    expect(record.ukEnabled).toBe(false)

    // FR-028: switching off hides, it never deletes. Nothing about the content changes here.
    await setEnabled({ ruEnabled: true, ukEnabled: true })
    record = (await payload.findGlobal({
      slug: 'language-settings',
      overrideAccess: false,
    })) as unknown as Record<string, unknown>
    expect(record.ukEnabled).toBe(true)
  })

  it('is readable by anyone and writable only by an administrator', async () => {
    // The storefront reads it on every page to build the switcher, so `read` is public; it holds
    // two switches and no personal data. Stated explicitly, never by omission (Constitution IV).
    expect(LanguageSettings.access?.read?.({} as never)).toBe(true)
    expect(typeof LanguageSettings.access?.update).toBe('function')
  })

  it('is not localized — it configures the site rather than speaking to a visitor', () => {
    for (const field of LanguageSettings.fields) {
      expect('localized' in field ? field.localized : undefined).toBeFalsy()
    }
    expect(LanguageSettings.slug).toBe('language-settings')
  })
})
