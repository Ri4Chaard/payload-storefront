import { expect, test } from '@playwright/test'

test.describe('project runs', () => {
  test('storefront responds', async ({ page }) => {
    const response = await page.goto('/')
    expect(response?.status()).toBe(200)
  })

  test('admin panel responds and is styled', async ({ page }) => {
    const response = await page.goto('/admin')
    expect(response?.status()).toBe(200)

    // Regression guard for two failures that both shipped once during Story 1:
    //   1. Payload's stylesheet was never imported, so the panel rendered as unstyled HTML.
    //   2. Our --font-body token shadowed Payload's, so the panel fell back to Times.
    // Both looked like "the admin is broken" and neither would fail a status-code check.
    const bodyFont = await page.evaluate(() => getComputedStyle(document.body).fontFamily)
    expect(bodyFont.toLowerCase()).not.toContain('times')

    const inputBorder = await page
      .locator('input')
      .first()
      .evaluate((el) => getComputedStyle(el).borderTopWidth)
    expect(inputBorder).not.toBe('0px')
  })
})
