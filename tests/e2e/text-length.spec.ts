import { expect, test } from '@playwright/test'

import { LOCALES } from '@/i18n/routing'

import { acquireSharedContentLock } from '../shared-content-lock'

/**
 * Longer words in a layout drawn for English (spec 010, T106).
 *
 * Russian runs roughly 15% longer than English and Ukrainian a little more, and this site draws
 * several controls to fixed widths — `product-purchase.tsx` says so in its own comment about the
 * row's minimum width being "the stepper plus the words ADD TO CART laid end to end".
 *
 * **Overflow is measured, not eyeballed.** A screenshot diff would catch it too and would fail on
 * every unrelated content change; comparing `scrollWidth` to `clientWidth` asks the browser the
 * only question that matters — is there text the box cannot show?
 *
 * **Asked as a COMPARISON, not an absolute.** English already clips in one place — a product card
 * whose title is "Paragon Emerald Cut Diamond Engagement Ring" — and that predates this feature by
 * seven specs. A test that failed on it would be failing on somebody else's design decision and
 * would have to be suppressed or ignored, which is how a gate stops being a gate. The question that
 * belongs to spec 010 is narrower and sharper: **does a longer language clip anything English does
 * not?**
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
const PAGES = ['/all-jewelry', '/products/butterfly-diamond-pendant', '/sign-in', '/cart']
const WIDTHS = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'desktop', width: 1440, height: 900 },
]

/** Which controls cannot show their own label, on one page in one language. */
const clippedOn = async (page: import('@playwright/test').Page, href: string): Promise<string[]> => {
  await page.goto(href)
  return page.evaluate(() => {
    const controls = Array.from(document.querySelectorAll<HTMLElement>('button, a[href]'))
    return controls
      .filter((node) => {
        const style = getComputedStyle(node)
        // A deliberate scroller is not an overflow, and a hidden control has no width to measure.
        if (style.overflowX === 'auto' || style.overflowX === 'scroll') return false
        if (style.display === 'none' || style.visibility === 'hidden') return false
        return node.scrollWidth > node.clientWidth + 2
      })
      .map((node) => (node.textContent ?? '').trim().slice(0, 40))
  })
}

for (const viewport of WIDTHS) {
  test(`no language clips more than English at ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })

    for (const path of PAGES) {
      const english = new Set(await clippedOn(page, path))

      for (const locale of LOCALES.filter((code) => code !== 'en')) {
        const translated = await clippedOn(page, `/${locale}${path}`)
        const newlyClipped = translated.filter((label) => !english.has(label))

        expect(
          newlyClipped,
          `${locale}${path} clips text English does not, at ${viewport.name}`,
        ).toEqual([])
      }
    }
  })

  test(`no page scrolls sideways in any language at ${viewport.name}`, async ({ page }) => {
    // This one IS absolute: a page that scrolls horizontally is broken in any language, and none of
    // them does today.
    await page.setViewportSize({ width: viewport.width, height: viewport.height })

    for (const locale of LOCALES) {
      for (const path of PAGES) {
        await page.goto(locale === 'en' ? path : `/${locale}${path}`)
        const horizontal = await page.evaluate(
          () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        )
        expect(horizontal, `/${locale}${path} scrolls sideways at ${viewport.name}`).toBe(false)
      }
    }
  })
}
