import { expect, test } from '@playwright/test'

import { acquireSharedContentLock } from '../shared-content-lock'

/**
 * No English left on a translated page (spec 010, T073 — FR-033, SC-002).
 *
 * **What this file can and cannot assert.** It checks the interface — the chrome, the buttons, the
 * accessible names — because those come from the message files and are translated for all three
 * languages today. It does NOT assert that a product title is Russian: titles are Payload content,
 * and an untranslated one correctly falls back to English (FR-046). A test that failed on that
 * would be failing on an editor's to-do list rather than on the code.
 *
 * The check is therefore a list of known chrome strings that must NOT appear, rather than a blanket
 * "no Latin characters" — which would fail on "Aurum", "WhatsApp" and every product name.
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
const ENGLISH_CHROME = [
  'Add to cart',
  'Buy now',
  'Select size',
  'All jewelry',
  'Contact us',
  'About us',
  'Applied filters',
  'Load more',
]

/*
  The home page is deliberately absent.

  Its hero, about band and featured row still read from `src/mocks` — the last of the deviation spec
  002 opened, and the one file `eslint-rules/catalog-boundary.mjs` still exempts by name. Those
  strings are CONTENT that has not been modelled in Payload yet, not interface chrome, so they are
  not this feature's to translate and a test that failed on them would be failing on another spec's
  backlog.
*/
const PAGES = ['/all-jewelry', '/cart', '/sign-in', '/contact']

for (const locale of ['ru', 'uk'] as const) {
  test.describe(`the interface in ${locale}`, () => {
    for (const path of PAGES) {
      test(`/${locale}${path} carries no English chrome`, async ({ page }) => {
        await page.goto(`/${locale}${path}`)
        const body = (await page.locator('body').innerText()).toLowerCase()

        for (const phrase of ENGLISH_CHROME) {
          expect(body, `"${phrase}" is still English on /${locale}${path}`).not.toContain(
            phrase.toLowerCase(),
          )
        }
      })
    }

    test(`/${locale} announces the cart in ${locale}`, async ({ page }) => {
      await page.goto(`/${locale}/all-jewelry`)
      const cart = page.getByRole('link', { name: /Корзина|Кошик/ })
      await expect(cart).toBeVisible()
    })
  })
}

test('the same pages are English at the unprefixed address', async ({ page }) => {
  // The mirror of the above: this is what proves the assertions mean something. If the chrome were
  // missing rather than translated, every test in this file would pass and this one would fail.
  await page.goto('/all-jewelry')
  // Lower-cased on both sides: the heading carries a `uppercase` class, so `innerText` reports
  // "ALL JEWELRY" — the same trap the assertions above avoid.
  const body = (await page.locator('body').innerText()).toLowerCase()
  expect(body).toContain('all jewelry')
})
