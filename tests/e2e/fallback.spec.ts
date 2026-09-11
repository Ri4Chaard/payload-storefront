import { expect, test } from '@playwright/test'

import { LOCALES } from '@/i18n/routing'

/**
 * A half-translated page renders whole (spec 010, T101 — FR-047, SC-009).
 *
 * **The integration suite proves the DATA falls back; this proves the PAGE does.** They are not the
 * same claim. `fallback: true` guarantees a field returns the English value, and a component that
 * renders `{subtitle && <p>{subtitle}</p>}` would still be correct with it — but a component that
 * measured emptiness some other way, or a layout that collapses without a child, would leave a hole
 * that no data-level test can see.
 */
const PAGES = ['/legal/privacy', '/products/layered-chain-necklace', '/blog']

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
        measurements.push(text.length)
      }

      /*
        The three renderings are within a reasonable distance of one another. A page that fell back
        correctly is roughly as long in every language; one that dropped an untranslated band would
        be conspicuously shorter, and neither the status code nor an emptiness check would notice.
        Russian runs longer than English, so the tolerance is generous rather than tight.
      */
      const shortest = Math.min(...measurements)
      const longest = Math.max(...measurements)
      expect(shortest / longest, `${path} lengths: ${measurements.join(' / ')}`).toBeGreaterThan(0.6)
    })
  }

  test('a policy translated in one language only keeps its structure in the others', async ({ page }) => {
    // `/legal/privacy` has a Russian title and no Russian body, which is exactly the state this
    // requirement is about.
    await page.goto('/ru/legal/privacy')
    await expect(page.locator('h1')).toHaveText(/ПОЛИТИКА/)

    const body = await page.locator('main').innerText()
    expect(body.length).toBeGreaterThan(200)
    await expect(page.locator('h1:empty')).toHaveCount(0)
  })
})
