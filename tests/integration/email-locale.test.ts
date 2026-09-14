import { describe, expect, it } from 'vitest'

import { LOCALES } from '@/i18n/routing'
import { localeContext, localeFromContext } from '@/i18n/locale-context'
import { buildResetEmail, buildVerificationEmail } from '@/lib/email/transactional'

/**
 * Transactional mail in the language the request was made in (spec 010, T093 — FR-042, FR-045).
 *
 * Integration rather than unit, because `getTranslations({ locale })` reaches next-intl's request
 * configuration — the same path a real send takes. A unit test with a stubbed translator would
 * prove the string interpolation and nothing about whether the locale actually arrives.
 */
describe('verification mail', () => {
  it('is written in the language it is asked for', async () => {
    const en = await buildVerificationEmail('123456', 'en')
    const ru = await buildVerificationEmail('123456', 'ru')
    const uk = await buildVerificationEmail('123456', 'uk')

    expect(en.subject).toMatch(/verification code/i)
    expect(ru.subject).toMatch(/код подтверждения/i)
    expect(uk.subject).toMatch(/код підтвердження/i)

    // Three different messages, not one message sent three times.
    expect(new Set([en.subject, ru.subject, uk.subject]).size).toBe(3)
  })

  it('carries the code in every language', async () => {
    // The one thing the mail exists for. A translation that drops `{code}` produces an email with
    // no code in it, which is why `tests/unit/message-keys.test.ts` checks placeholders too.
    for (const locale of LOCALES) {
      const { html } = await buildVerificationEmail('654321', locale)
      expect(html, `${locale} carries the code`).toContain('654321')
    }
  })

  it('never puts the code in the subject', async () => {
    // Subjects appear on lock screens and in notification previews — a wider audience than the
    // person holding the phone. True in every language or it is not true.
    for (const locale of LOCALES) {
      const { subject } = await buildVerificationEmail('654321', locale)
      expect(subject).not.toContain('654321')
    }
  })
})

describe('reset mail', () => {
  it('is written in the language it is asked for', async () => {
    const ru = await buildResetEmail('123456', 'ru')
    const uk = await buildResetEmail('123456', 'uk')
    expect(ru.subject).toMatch(/сброс/i)
    expect(uk.subject).toMatch(/скидання/i)
  })

  it('falls back to English rather than failing to send', async () => {
    /*
      FR-045 — a missing translation may never make a verification code undeliverable.

      It cannot, and not by luck: `src/i18n/request.ts` merges English underneath every locale, so
      an untranslated key resolves to the English sentence. This asserts the property from the
      outside by asking for a locale that has no file of its own.
    */
    const unknown = await buildResetEmail('123456', 'de' as never)
    expect(unknown.subject.length).toBeGreaterThan(0)
    expect(unknown.html).toContain('123456')
  })
})

describe('the request context', () => {
  it('carries a locale to a Payload hook and back', async () => {
    // Registration and reset mail is sent by PAYLOAD, not by this codebase, so the locale travels
    // on `req.context` — the same mechanism `skipRevalidation` uses.
    for (const locale of LOCALES) {
      expect(localeFromContext(localeContext(locale))).toBe(locale)
    }
  })

  it('falls back to English for a hook invoked without one', async () => {
    // A Payload operation triggered from the admin, or a migration, has no locale to give.
    expect(localeFromContext(undefined)).toBe('en')
    expect(localeFromContext({})).toBe('en')
    expect(localeFromContext({ locale: 'de' })).toBe('en')
    expect(localeFromContext({ locale: 42 })).toBe('en')
  })
})
