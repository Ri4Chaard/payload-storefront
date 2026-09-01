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
const ROUTES = [
  '/',
  // A category listing and the whole shop: the same frame, but only one of them pages, and
  // pagination is a set of controls nothing else on the site has (003/T257).
  '/rings',
  '/all-jewelry?page=2',
  // The empty state and the branded 404 are both pages a visitor reaches by accident, which is
  // exactly when they can least afford to be unusable.
  '/all-jewelry?maxPrice=1',
  '/rungs',
  // A piece with stones and sizes, and one with neither: the selectors, the quantity stepper and
  // the two actions only exist on the first, and the second is what proves the column closes over
  // them rather than leaving labelled controls behind (003/T296).
  '/products/paragon-emerald-cut-diamond-engagement-ring',
  '/products/butterfly-diamond-pendant',
  // The account flow (004/T459). A form is where a keyboard or a screen reader has the most to
  // lose — an unlabelled field or an error nobody announces is the difference between registering
  // and giving up — and these two are the only pages on the site a visitor MUST complete.
  '/create-account',
  '/verify-email?email=a11y%40aurum-testing.dev',
]

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

/**
 * The menu is a whole screen, and it is the one part of the storefront the component sweep can
 * never see: it has no story of its own, and it only exists once something has been clicked.
 *
 * Run with the complete rule set, like the routes above — an overlay that covers the page inherits
 * every document-level obligation the page had.
 */
for (const { name, width, height } of [
  { name: 'tablet', width: 1024, height: 1366 },
  { name: 'mobile', width: 390, height: 844 },
]) {
  test(`the open menu has no accessibility violations at ${name} width`, async ({ page }) => {
    await page.setViewportSize({ width, height })
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    await page.getByRole('button', { name: 'Open menu' }).click()
    await expect(page.getByRole('button', { name: 'Close menu' })).toBeVisible()

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze()

    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([])
  })
}

/**
 * The filter drawer, open (003/T296).
 *
 * Like the menu below it, this is a state no component sweep can reach: `FilterDrawer` has stories,
 * but a story renders the panel beside a page rather than OVER one, and the obligations that come
 * with covering a document — the trap, the labelled dialog, what is left reachable behind it — only
 * exist once it does.
 *
 * At every width, including 1920. The panel is the same overlay at all three; only what is drawn
 * behind it changes, and "the desktop has room" is not a reason to check it less.
 */
for (const { name, width, height } of [
  { name: 'desktop', width: 1920, height: 1080 },
  { name: 'tablet', width: 1024, height: 1366 },
  { name: 'mobile', width: 390, height: 844 },
]) {
  test(`the open filter drawer has no accessibility violations at ${name} width`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height })
    await page.goto('/all-jewelry')
    await page.waitForLoadState('networkidle')

    await page.getByRole('link', { name: /^Filters/ }).click()
    await expect(page.locator('#filters')).toBeVisible()

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze()

    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([])
  })
}

/**
 * The lightbox, open (003/T296).
 *
 * The fourth state, and the one furthest from anything a story can show: PhotoSwipe builds its own
 * dialog outside the React tree, so what axe audits here is markup this repository does not write.
 * That is precisely why it is worth auditing — a third-party viewer that covers the page inherits
 * every obligation the page had, and the only way to know it meets them is to open it.
 */
for (const { name, width, height } of [
  { name: 'desktop', width: 1920, height: 1080 },
  { name: 'tablet', width: 1024, height: 1366 },
  { name: 'mobile', width: 390, height: 844 },
]) {
  test(`the open lightbox has no accessibility violations at ${name} width`, async ({ page }) => {
    await page.setViewportSize({ width, height })
    await page.goto('/products/paragon-emerald-cut-diamond-engagement-ring')
    await page.waitForLoadState('networkidle')

    await page.getByRole('button', { name: /open full screen$/ }).first().click()
    await expect(page.getByRole('dialog')).toBeVisible()

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze()

    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([])
  })
}
