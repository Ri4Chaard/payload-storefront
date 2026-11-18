import { expect, test } from '@playwright/test'

import { acquireSharedContentLock } from '../shared-content-lock'

/**
 * US1 — a visitor switches language and stays switched (spec 010, T022, T023).
 *
 * Everything here is behaviour a unit test cannot reach: the cookie is written by the client router
 * on a soft navigation, the redirect happens in the proxy before the render, and "stays switched"
 * is a property of several requests rather than of one function.
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

/** The header's switcher is a menu button whose accessible name carries the current language. */
function switcher(page: import('@playwright/test').Page, code: string) {
  return page.getByRole('button', { name: `Language: ${code}` })
}

test.describe('switching language', () => {
  test('the selector moves the visitor to the same page in the chosen language', async ({
    page,
  }) => {
    await page.goto('/legal/privacy')
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')

    await switcher(page, 'EN').click()
    await page.getByRole('menuitem', { name: 'RU' }).click()

    // The same document, not the site root — FR-006. Shared slugs are what make this a prefix
    // operation rather than a lookup.
    await expect(page).toHaveURL(/\/ru\/legal\/privacy$/)
    await expect(page.locator('html')).toHaveAttribute('lang', 'ru')
    await expect(switcher(page, 'RU')).toBeVisible()
  })

  test('the choice survives navigation and a reload', async ({ page }) => {
    await page.goto('/')
    await switcher(page, 'EN').click()
    await page.getByRole('menuitem', { name: 'UK' }).click()
    await expect(page).toHaveURL(/\/uk$/)

    await page.goto('/uk/blog')
    await expect(page.locator('html')).toHaveAttribute('lang', 'uk')

    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('lang', 'uk')
  })

  test('a returning visitor lands in their own language at the bare address', async ({
    page,
    context,
  }) => {
    await page.goto('/')
    await switcher(page, 'EN').click()
    await page.getByRole('menuitem', { name: 'RU' }).click()
    await expect(page).toHaveURL(/\/ru$/)

    // FR-008. The cookie is next-intl's to write; acting on it at an unprefixed address is ours.
    const cookie = (await context.cookies()).find((c) => c.name === 'NEXT_LOCALE')
    expect(cookie?.value).toBe('ru')

    await page.goto('/')
    await expect(page).toHaveURL(/\/ru$/)
    await expect(page.locator('html')).toHaveAttribute('lang', 'ru')
  })

  test('a Russian-configured browser still starts in English', async ({ browser }) => {
    // FR-010, and the reason next-intl's own `localeDetection` is off: its single boolean would act
    // on `accept-language` as well as on the cookie. A crawler sees the same English page.
    const context = await browser.newContext({ locale: 'ru-RU' })
    const page = await context.newPage()
    await page.goto('/')
    await expect(page).toHaveURL(/localhost:\d+\/$/)
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await context.close()
  })

  test('a prefixed address wins over a remembered choice', async ({ page, context }) => {
    // A shared link must survive being opened, or an emailed `/uk/faq` silently changes language.
    await context.addCookies([
      {
        name: 'NEXT_LOCALE',
        value: 'ru',
        url: page.url() === 'about:blank' ? 'http://localhost' : page.url(),
      },
    ])
    await page.goto('/uk/faq')
    await expect(page).toHaveURL(/\/uk\/faq$/)
    await expect(page.locator('html')).toHaveAttribute('lang', 'uk')
  })

  test('the mobile panel offers the same choice and closes on selection', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')

    /*
      The consent banner is full-bleed and flush to the bottom edge below `xl` (spec 009), so at
      phone width it sits over the controls this test needs. A visitor answers it before they do
      anything else; so does this.
    */
    await page
      .getByRole('region', { name: 'Cookie consent' })
      .getByRole('button', { name: /agree/i })
      .first()
      .click()

    await page.getByRole('button', { name: /menu/i }).first().click()

    /*
      The panel is a DISCLOSURE, not a dialog — `mobile-nav.tsx` says so and explains why — so there
      is no dialog role to scope to. Its primary nav landmark is what appears and disappears with it.
    */
    const panel = page.getByRole('navigation', { name: 'Primary' })
    await expect(panel).toBeVisible()

    // The header's own switcher is `hidden md:block`, so at this width the visible one is the
    // panel's. Both are the same component with the same props (FR-009).
    await page.getByRole('button', { name: /^Language: / }).click()
    await page.getByRole('menuitem', { name: 'RU' }).click()

    await expect(page).toHaveURL(/\/ru$/)
    await expect(panel).toBeHidden()
  })

  test('switching language keeps the cart', async ({ page }) => {
    // FR-011. The cart lives in its own cookie keyed by session; nothing about a locale change
    // should touch it, and this is the test that says so.
    /*
      A product with no options to choose, chosen on purpose — `cart.spec.ts` uses the same one
      for the same reason. The first product in the grid needs an option selected before
      ADD TO CART is enabled, so clicking it added nothing and the badge stayed empty. The original
      assertion compared the label before and after and passed anyway, because "Cart, empty" equals
      "Cart, empty".
    */
    await page.goto('/products/product-3')
    await page.getByRole('button', { name: /add to cart/i }).click()
    await expect(page.getByText(/added to your cart/i)).toBeVisible()

    /*
      Wait for the COUNT, not merely for the badge.

      The badge is always there — it reads "Cart, empty" until the client provider hears about the
      addition — so `toBeVisible()` alone passes before the cart has anything in it, and the
      comparison afterwards then compares nothing to nothing.
    */
    const badge = page.getByRole('link', { name: /^Cart, \d/ })
    await expect(badge).toBeVisible({ timeout: 15_000 })
    const countBefore = (await badge.getAttribute('aria-label'))?.match(/\d+/)?.[0]
    expect(countBefore).toBeTruthy()

    await switcher(page, 'EN').click()
    await page.getByRole('menuitem', { name: 'RU' }).click()
    await expect(page).toHaveURL(/\/ru\//)

    /*
      The COUNT, not the label. The accessible name is `Cart, 2 items` in English and
      `Корзина, 2 товара` in Russian, so comparing the strings would assert that the switcher had
      FAILED — the opposite of what this test is for. What must survive a language change is the
      cart, and the number is the cart.
    */
    const after = page.getByRole('link', { name: /^Корзина, / })
    await expect(after).toBeVisible()
    expect((await after.getAttribute('aria-label'))?.match(/\d+/)?.[0]).toBe(countBefore)
  })
})
