import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

/**
 * FR-044 — axe over each UI-kit primitive in isolation, before anything composes it.
 *
 * Composed pages are covered by routes.spec.ts. This catches the failures that belong to the
 * component rather than the page: a variant whose text does not meet contrast on its own surface, a
 * control whose label is decorative rather than programmatic, a disabled state that dims itself
 * below the threshold.
 *
 * `all-variants` is the important one — it is the only story that renders the two inverse variants
 * on the dark ground they are designed for, so it is the only place their contrast is measured
 * honestly.
 */
const STORYBOOK = process.env.STORYBOOK_URL ?? 'http://localhost:6006'

const STORIES = [
  'ui-button--all-variants',
  'ui-button--sizes',
  'ui-button--with-icons',
  'ui-button--loading',
  'ui-button--disabled',
  'ui-button--full-width',
  'ui-button--inverse',
  'ui-button--inverse-outline',
  'ui-checkbox--all-states',
  'ui-checkbox--disabled',
  'ui-checkbox--hidden-label',
  'ui-checkbox--long-label',
  'ui-switch--all-states',
  'ui-switch--hidden-label',
]

for (const id of STORIES) {
  test(`${id} has no accessibility violations`, async ({ page }) => {
    await page.goto(`${STORYBOOK}/iframe.html?id=${id}&viewMode=story`, {
      waitUntil: 'networkidle',
    })

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze()

    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([])
  })
}
