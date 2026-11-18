import { expect, test } from '@playwright/test'

import { LOCALES } from '@/i18n/routing'

import { acquireSharedContentLock } from '../shared-content-lock'

/**
 * A half-translated page renders whole (spec 010, T101 — FR-047, SC-009).
 *
 * **The integration suite proves the DATA falls back; this proves the PAGE does.** They are not the
 * same claim. `fallback: true` guarantees a field returns the English value, and a component that
 * renders `{subtitle && <p>{subtitle}</p>}` would still be correct with it — but a component that
 * measured emptiness some other way, or a layout that collapses without a child, would leave a hole
 * that no data-level test can see.
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
/*
  Pages with NO translation at all, which is what this file is about.

  `/legal/privacy` and `/products/layered-chain-necklace` are deliberately absent: `pnpm
  seed:translations` gives them Russian and Ukrainian text, so they are translated content of a
  legitimately different length — the sample Russian policy is two paragraphs where the English one
  is a page. Asserting they match would be asserting that a translation must be the same size as its
  original, which is both false and the opposite of the point.
*/
const PAGES = ['/legal/terms', '/products/emerald-station-necklace', '/blog']

test.describe('a page whose content is not translated', () => {
  for (const path of PAGES) {
    test(`${path} renders whole in every language`, async ({ page }) => {
      const measurements: number[] = []

      for (const locale of LOCALES) {
        const prefixed = locale === 'en' ? path : `/${locale}${path}`
        const response = await page.goto(prefixed)
        expect(response?.status(), prefixed).toBe(200)

        // No empty headings or paragraphs: the shape a missing translation would leave behind.
        const empty = await page.locator('h1:empty, h2:empty, h3:empty, p:empty').count()
        expect(empty, `${prefixed} has empty elements`).toBe(0)

        // The main landmark has real text in it, whatever language that text is in.
        const text = (await page.locator('main').innerText()).trim()
        expect(text.length, `${prefixed} main content`).toBeGreaterThan(100)

        // How many blocks the page is built from — headings, paragraphs, sections, images.
        measurements.push(
          await page.locator('main h1, main h2, main h3, main section, main img').count(),
        )
      }

      /*
        The three renderings have the same STRUCTURE. A dropped band is what this is looking for, and
        structure is what a dropped band changes.

        **Not text length**, which was the first attempt and was wrong: a real translation is
        legitimately a different length — the sample Russian privacy policy is two paragraphs where
        the English one is a page — so a length ratio fails on correctly translated content and would
        have to be loosened until it caught nothing.
      */
      const shortest = Math.min(...measurements)
      const longest = Math.max(...measurements)
      expect(shortest, `${path} block counts: ${measurements.join(' / ')}`).toBe(longest)
    })
  }

  test('a policy translated in one language only keeps its structure in the others', async ({ page }) => {
    // `/legal/privacy` has a Russian title and no Russian body, which is exactly the state this
    // requirement is about.
    await page.goto('/ru/legal/privacy')
    await expect(page.locator('h1')).toHaveText(/Политика/i)

    const body = await page.locator('main').innerText()
    expect(body.length).toBeGreaterThan(200)
    await expect(page.locator('h1:empty')).toHaveCount(0)
  })
})
