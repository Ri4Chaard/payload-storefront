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
 * whose title is longer than the card is wide — and that predates this feature by
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
const PAGES = ['/all-products', '/products/product-3', '/sign-in', '/cart']
const WIDTHS = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'desktop', width: 1440, height: 900 },
]

/**
 * Which controls cannot show their own label, on one page in one language.
 *
 * **Each one is named by WHERE it is, never by what it says**, and that correction is the whole
 * reason this helper is more than three lines. The first version keyed the set on the control's
 * text, which is the one property that changes between the two pages being compared: an element
 * that clips in BOTH languages appeared under two different names, so the Russian one looked new
 * and the test failed on a control English clips just as badly. It only passed before because the
 * label in question was still untranslated on the Russian page, which is precisely the bug this
 * feature was fixing. A DOM path is stable across languages and says nothing about the words.
 *
 * **Visually hidden controls are skipped.** An `sr-only` element is deliberately one pixel with its
 * overflow hidden, so `scrollWidth > clientWidth` is true of every one of them in every language.
 * That is the class working as designed, not a layout that cannot hold its text.
 */
const clippedOn = async (page: import('@playwright/test').Page, href: string): Promise<string[]> => {
  await page.goto(href)
  return page.evaluate(() => {
    /** `main > div:nth-of-type(2) > button:nth-of-type(1)` — position, not prose. */
    const pathOf = (node: Element): string => {
      const steps: string[] = []
      for (let at: Element | null = node; at && at !== document.body; at = at.parentElement) {
        const tag = at.tagName.toLowerCase()
        const siblings = Array.from(at.parentElement?.children ?? []).filter(
          (child) => child.tagName === at!.tagName,
        )
        steps.unshift(siblings.length > 1 ? `${tag}:nth-of-type(${siblings.indexOf(at) + 1})` : tag)
      }
      return steps.join('>')
    }

    return Array.from(document.querySelectorAll<HTMLElement>('button, a[href]'))
      .filter((node) => {
        const style = getComputedStyle(node)
        // A deliberate scroller is not an overflow, and a hidden control has no width to measure.
        if (style.overflowX === 'auto' || style.overflowX === 'scroll') return false
        if (style.display === 'none' || style.visibility === 'hidden') return false
        // Visually hidden: one-pixel boxes and the `clip-path` half of the `sr-only` recipe.
        const box = node.getBoundingClientRect()
        if (box.width <= 1 || box.height <= 1) return false
        if (style.clipPath.startsWith('inset(50%')) return false
        /*
          A designed truncation is not a clip. `ProductCard`'s title carries `xl:truncate`, which is
          `text-overflow: ellipsis` — the design's own decision that one line is enough at that
          width, with the ellipsis as the affordance saying so. Russian titles run long enough to
          reach it where English ones do not, and that is the truncation working rather than a box
          that cannot hold its text. What this test is for is the other kind: text cut off flush,
          with nothing to tell the reader anything is missing.
        */
        if (style.textOverflow === 'ellipsis') return false
        return node.scrollWidth > node.clientWidth + 2
      })
      .map(pathOf)
  })
}

for (const viewport of WIDTHS) {
  test(`no language clips more than English at ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })

    for (const path of PAGES) {
      const english = new Set(await clippedOn(page, path))

      for (const locale of LOCALES.filter((code) => code !== 'en')) {
        const translated = await clippedOn(page, `/${locale}${path}`)
        const newlyClipped = translated.filter((where) => !english.has(where))

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
