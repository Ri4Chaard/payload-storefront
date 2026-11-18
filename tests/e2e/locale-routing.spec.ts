import { expect, test } from '@playwright/test'

import { acquireSharedContentLock } from '../shared-content-lock'

/**
 * The locale segment, end to end.
 *
 * **The load-bearing assertion in this file is the one about old addresses.** Every address the site
 * published before this feature is indexed and linked, and `localePrefix: 'as-needed'` exists to
 * keep them working. If someone later switches the routing to prefix every locale, every other test
 * in the repository still passes and this one fails — which is the point.
 */

/*
  **Takes the shared-content lock, as a READER.**

  `language-availability.spec.ts` switches Ukrainian off and on again, and every assertion in this
  file depends on all three languages being offered. `test.describe.configure({ mode: 'serial' })`
  only orders one file; the lock is what keeps two files out of each other's way, and
  `tests/shared-content-lock.ts` documents the same failure this had: `<html lang="en">` where `uk`
  was expected, because the other suite had it switched off at that moment.
*/
let releaseSharedContent: (() => Promise<void>) | undefined

test.beforeAll(async () => {
  releaseSharedContent = await acquireSharedContentLock()
})

test.afterAll(async () => {
  await releaseSharedContent?.()
})

const OLD_ADDRESSES = [
  '/',
  '/all-products',
  '/about',
  '/blog',
  '/contact',
  '/faq',
  '/legal/privacy',
  '/cart',
  '/sign-in',
]

test.describe('locale routing', () => {
  for (const path of OLD_ADDRESSES) {
    test(`${path} still resolves unprefixed and in English`, async ({ page }) => {
      const response = await page.goto(path)
      expect(response?.status(), `${path} must not 404 or redirect away`).toBe(200)
      expect(new URL(page.url()).pathname).toBe(path)
      await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    })
  }

  for (const locale of ['ru', 'uk'] as const) {
    test(`/${locale} serves the home page and declares its language`, async ({ page }) => {
      const response = await page.goto(`/${locale}`)
      expect(response?.status()).toBe(200)
      await expect(page.locator('html')).toHaveAttribute('lang', locale)
    })

    test(`/${locale}/legal/privacy serves the same document under its prefix`, async ({ page }) => {
      const response = await page.goto(`/${locale}/legal/privacy`)
      expect(response?.status()).toBe(200)
      await expect(page.locator('html')).toHaveAttribute('lang', locale)
    })
  }

  test('a segment that is not a language is a 404, not a rendered shell', async ({ page }) => {
    // The segment is effectively a catch-all, so `/de/…` reaches the layout before it reaches
    // nothing. Without the `notFound()` guard it would render the whole chrome around an empty page.
    const response = await page.goto('/de/anything')
    expect(response?.status()).toBe(404)
  })

  test('the admin panel never gains a locale prefix', async ({ page }) => {
    // `/admin` and `/api` are Payload's, excluded by the proxy matcher. A prefix here would break
    // the admin shell and every REST consumer at once.
    const response = await page.goto('/admin')
    expect(response?.status()).toBe(200)
    expect(page.url()).toContain('/admin')
    expect(page.url()).not.toMatch(/\/(ru|uk)\/admin/)
  })
})
