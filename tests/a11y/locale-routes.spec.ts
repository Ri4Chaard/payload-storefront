import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { LOCALES } from '@/i18n/routing'

/**
 * The same pages, in the other two languages (spec 010, T105 — FR-054, SC-008).
 *
 * **A separate file from `routes.spec.ts` rather than a third dimension on it.** That suite already
 * multiplies its routes by three breakpoints, and multiplying again by three languages would turn a
 * two-minute gate into a twenty-minute one for very little: most violations are structural and do
 * not vary by language. What DOES vary is named here.
 *
 * Three things a translated page can break that an English one cannot:
 *
 * 1. **`<html lang>`** — a wrong or missing one makes a screen reader pronounce Russian with English
 *    phonetics, which is unintelligible rather than merely wrong. `axe` catches it as
 *    `html-has-lang` and `valid-lang`; the explicit assertion below says which value it should be.
 * 2. **An accessible name that lost its visible text.** WCAG 2.5.3 requires the name to contain what
 *    is on screen, and a half-translated control — Russian label, English `aria-label` — breaks voice
 *    control for the people who depend on it.
 * 3. **Contrast and truncation from longer text.** Russian runs roughly 15% longer than English, and
 *    this site draws several controls to fixed widths.
 */
const ROUTES = ['/', '/all-products', '/products/butterfly-diamond-pendant', '/sign-in', '/legal/privacy']

const SECONDARY = LOCALES.filter((locale) => locale !== 'en')

for (const locale of SECONDARY) {
  test.describe(`${locale}`, () => {
    for (const route of ROUTES) {
      test(`/${locale}${route} has no accessibility violations`, async ({ page }) => {
        await page.goto(`/${locale}${route === '/' ? '' : route}`)

        const results = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
          .analyze()

        expect(results.violations, JSON.stringify(results.violations.map((v) => v.id))).toEqual([])
      })
    }

    test(`declares ${locale} as the document language`, async ({ page }) => {
      // The assertion axe cannot make: it checks that `lang` is present and valid, not that it is
      // the language the words are actually in.
      await page.goto(`/${locale}`)
      await expect(page.locator('html')).toHaveAttribute('lang', locale)
    })

    test(`every accessible name contains its visible text`, async ({ page }) => {
      /*
        WCAG 2.5.3. The failure this guards is specific to a translated site: a control whose visible
        label came from the message files and whose `aria-label` did not, or the reverse. Somebody
        using voice control says what they can see, and a name that no longer contains it leaves the
        control unreachable.
      */
      await page.goto(`/${locale}/all-products`)

      const controls = page.locator('button:visible, a:visible').filter({ hasNotText: /^\s*$/ })
      const count = Math.min(await controls.count(), 25)

      for (let index = 0; index < count; index += 1) {
        const control = controls.nth(index)

        /*
          `innerText` includes `sr-only` text, which is visually hidden but not display:none — so an
          icon-only social link reports "(opens in a new tab)" as its visible text and fails a check
          it should never have been subject to. Stripping those nodes is what makes "visible" mean
          what WCAG 2.5.3 means by it.
        */
        const visible = (
          await control.evaluate((node) => {
            const clone = node.cloneNode(true) as HTMLElement
            clone.querySelectorAll('.sr-only').forEach((hidden) => hidden.remove())
            return clone.innerText ?? clone.textContent ?? ''
          })
        ).trim()
        if (visible.length === 0) continue

        const name = (await control.getAttribute('aria-label')) ?? visible
        expect(
          name.toLowerCase().includes(visible.toLowerCase()) || name === visible,
          `"${visible}" is not contained in its accessible name "${name}"`,
        ).toBe(true)
      }
    })
  })
}
