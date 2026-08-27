import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

/**
 * Automated accessibility over the storefront routes (FR-044). Storybook's a11y addon covers
 * components in isolation; this covers them composed into real pages, with the COMPLETE rule set —
 * including the document-level rules the component sweep deliberately excludes, because a document
 * is the only place they mean anything.
 *
 * Three widths, because a responsive layout is three layouts (002/T132). A band that reflows into
 * an unreachable scroller, or a control that only overlaps its neighbour on a phone, is invisible
 * to a single-width sweep.
 */
const ROUTES = ['/']

const WIDTHS = [
  { name: 'desktop', width: 1920 },
  { name: 'tablet', width: 1024 },
  { name: 'mobile', width: 390 },
]

for (const route of ROUTES) {
  for (const { name, width } of WIDTHS) {
    test(`${route} has no accessibility violations at ${name} width`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto(route)

      // Photographs decide the height of several bands, so a sweep that starts before they land
      // measures a page nobody sees.
      await page.waitForLoadState('networkidle')

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze()

      expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([])
    })
  }
}
