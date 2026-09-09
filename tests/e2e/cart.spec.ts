import { expect, test } from '@playwright/test'

/**
 * The whole journey, at the three drawn widths — spec 005, US1 to US4.
 *
 * Phase 4 lands the first walk: filling a cart through the product page and reading it back at
 * every width. T079 and T080 extend it in Phase 8 with the handoff, the sign-in-mid-modal case and
 * the messenger reordering.
 *
 * **The width assertion is not decoration.** It caught a real defect: at 390 the photograph, the
 * stepper and the bin together were 6px wider than the viewport and the bin was clipped against the
 * edge. Nothing in lint, typecheck or either test tier would have said so, and it is exactly the
 * kind of thing that survives a screenshot review because the clipped control is still half visible.
 */

/** The cart's own rows — a page carries several lists, and the footer's navigation is one. */
const cartRows = (page: import('@playwright/test').Page) =>
  page.getByRole('list', { name: /items in your cart/i }).getByRole('listitem')

const WIDTHS = [
  { name: 'desktop', width: 1920, height: 1200 },
  { name: 'tablet', width: 768, height: 1400 },
  { name: 'mobile', width: 390, height: 1400 },
] as const

test('a visitor fills a cart and reads it back at every width', async ({ page }) => {
  // Built through the interface rather than seeded, so the cookie, the rows and the badge are all
  // the real ones. A piece with both a stone and a size, then a piece with neither.
  await page.goto('/products/paragon-emerald-cut-diamond-engagement-ring')
  await page.getByRole('combobox', { name: /diamond/i }).click()
  await page.getByRole('option').first().click()
  await page.getByRole('combobox', { name: /size/i }).click()
  await page.getByRole('option').first().click()
  await page.getByRole('button', { name: /add to cart/i }).click()
  await expect(page.getByText(/added to your cart/i)).toBeVisible()

  await page.goto('/products/butterfly-diamond-pendant')
  await page.getByRole('button', { name: /add to cart/i }).click()
  await expect(page.getByText(/added to your cart/i)).toBeVisible()

  // FR-016: the header counts the cart AND opens it.
  await page.getByRole('link', { name: /cart, 2 items/i }).click()
  await expect(page).toHaveURL(/\/cart$/)

  for (const { name, width, height } of WIDTHS) {
    await page.setViewportSize({ width, height })
    await page.reload()

    await expect(page.getByRole('heading', { name: /shopping cart/i })).toBeVisible()
    await expect(cartRows(page)).toHaveCount(2)
    // The chosen stone and size travel onto the line (FR-008).
    await expect(page.getByText(/Size 2/i).first()).toBeVisible()

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow, `${name} scrolls sideways by ${overflow}px`).toBeLessThanOrEqual(0)
  }
})

/** FR-010: the bin asks first, and every way out of the dialog leaves the line alone. */
test('removing a line asks first', async ({ page }) => {
  await page.goto('/products/butterfly-diamond-pendant')
  await page.getByRole('button', { name: /add to cart/i }).click()
  await expect(page.getByText(/added to your cart/i)).toBeVisible()

  await page.goto('/cart')
  await expect(cartRows(page)).toHaveCount(1)

  await page.getByRole('button', { name: /^remove /i }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText(/are you sure/i)).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(cartRows(page)).toHaveCount(1)

  await page.getByRole('button', { name: /^remove /i }).click()
  await page.getByRole('dialog').getByRole('button', { name: /^remove$/i }).click()

  await expect(page.getByRole('heading', { name: /your cart is empty/i })).toBeVisible()
})

/** FR-018: checkout is refused until the agreement is ticked, and the refusal names it. */
test('checkout is refused until the terms are agreed', async ({ page }) => {
  await page.goto('/products/butterfly-diamond-pendant')
  await page.getByRole('button', { name: /add to cart/i }).click()
  await expect(page.getByText(/added to your cart/i)).toBeVisible()

  await page.goto('/cart')
  await page.getByRole('button', { name: /^checkout$/i }).click()
  await expect(page.getByText(/agree to the terms of use/i).last()).toBeVisible()
})
