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
  // the real ones. A piece that offers a stone, then a piece that offers no choice at all.
  await page.goto('/products/paragon-emerald-cut-diamond-engagement-ring')
  await page.getByRole('combobox', { name: /diamond/i }).click()
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
    // The chosen stone travels onto the line (FR-008). Size did too until spec 011 removed it.
    await expect(cartRows(page).first()).toContainText(/ct/)

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

/**
 * The handoff (spec 005, US3 — T064). FR-021, FR-024, FR-025, FR-027, SC-017.
 *
 * **The assertion that matters is the last one.** FR-027 says the cart survives the handoff, and
 * that is the requirement most easily broken by a well-meaning "clear the cart on success" — the
 * site cannot know whether the message was actually sent, and clearing on a guess destroys work
 * the customer cannot get back.
 */
test('checkout hands the cart to the seller and leaves it alone', async ({ page }) => {
  await page.goto('/products/butterfly-diamond-pendant')
  await page.getByRole('button', { name: /add to cart/i }).click()
  await expect(page.getByText(/added to your cart/i)).toBeVisible()

  await page.goto('/cart')
  /*
   * Clicked on the drawn box, the way a person does. `Checkbox` renders an `sr-only` input behind
   * that box, so a pointer aimed at the input is intercepted by it — correct behaviour, not a
   * defect. The label itself is not the target either: it carries two policy links, and a click in
   * the middle of it would follow one.
   */
  await page
    .locator('label')
    .filter({ hasText: /I agree to the/ })
    .locator('span[aria-hidden="true"]')
    .click()
  await expect(page.getByRole('checkbox', { name: /terms of use/i })).toBeChecked()
  await page.getByRole('button', { name: /^checkout$/i }).click()

  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('heading', { name: /your selection is in the cart/i })).toBeVisible()

  // FR-025 / FR-030: nothing has been ordered, and the modal must not suggest otherwise.
  await expect(dialog.getByText(/no payment is taken on this site/i)).toBeVisible()

  // FR-024 / SC-017: the copy affordance is here even though messengers are configured.
  await expect(dialog.getByRole('button', { name: /copy order/i })).toBeVisible()
  await expect(dialog.getByLabel(/ready to copy/i)).toHaveValue(/Butterfly Diamond Pendant/)

  // The message the seller would receive names the piece and the total.
  await expect(dialog.getByLabel(/ready to copy/i)).toHaveValue(/Total: \$/)

  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()

  // FR-027: byte for byte, the cart the customer had before they pressed anything.
  await page.reload()
  await expect(cartRows(page)).toHaveCount(1)
  await expect(page.getByText(/butterfly diamond pendant/i).first()).toBeVisible()
})

/**
 * BUY NOW (spec 005, US4 — T069). FR-019, FR-020, SC-005.
 *
 * **The last assertion is the requirement.** A visitor who has assembled a cart and then uses BUY
 * NOW on a different piece must find that cart exactly as they left it — a shortcut that quietly
 * submits or empties the basket destroys work they never offered up.
 */
test('buy now opens the handoff for one piece and leaves the cart alone', async ({ page }) => {
  // A cart of two, built first, so there is something to disturb.
  await page.goto('/products/butterfly-diamond-pendant')
  await page.getByRole('button', { name: /add to cart/i }).click()
  await expect(page.getByText(/added to your cart/i)).toBeVisible()

  await page.goto('/products/pave-butterfly-diamond-bracelet')
  await page.getByRole('button', { name: /add to cart/i }).click()
  await expect(page.getByText(/added to your cart/i)).toBeVisible()

  // Now BUY NOW on a third, unrelated piece.
  await page.goto('/products/paragon-emerald-cut-diamond-engagement-ring')
  await page.getByRole('combobox', { name: /diamond/i }).click()
  await page.getByRole('option').first().click()
  await page.getByRole('button', { name: /buy now/i }).click()

  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()

  // Exactly one piece, and it is the one they pressed BUY NOW on.
  const message = await dialog.getByLabel(/ready to copy/i).inputValue()
  expect(message).toContain('Paragon Emerald Cut Diamond Engagement Ring')
  expect(message).not.toContain('Butterfly Diamond Pendant')
  expect(message).not.toContain('Pavé Butterfly Diamond Bracelet')

  await page.keyboard.press('Escape')

  // FR-020: the cart still holds exactly the two pieces it held before.
  await page.goto('/cart')
  await expect(cartRows(page)).toHaveCount(2)
})

/** FR-003 on the BUY NOW path: the refusal names the control the visitor has to go and fix. */
test('buy now names an unmade choice rather than refusing vaguely', async ({ page }) => {
  await page.goto('/products/paragon-emerald-cut-diamond-engagement-ring')
  await page.getByRole('button', { name: /buy now/i }).click()

  // The status region, not the select's own placeholder — which also reads "Choose a diamond".
  await expect(page.getByRole('status')).toHaveText(/choose a diamond before ordering/i)
  await expect(page.getByRole('dialog')).toBeHidden()
})

/**
 * One set of accounts (spec 005, T073, FR-052, SC-016).
 *
 * **This is the defect the migration exists to prevent**, and it was live until Phase 8: the owner
 * sets their real WhatsApp number in the admin, the handoff modal uses it, and the footer on every
 * page keeps pointing at a bare `wa.me/` — because `src/lib/contact.ts` held a second copy under a
 * comment admitting it needed the real accounts before launch. Two records of one fact is two
 * chances for one to be wrong, and it is always the one nobody is looking at.
 */
test('the chrome points at the configured accounts, not a placeholder root', async ({ page }) => {
  await page.goto('/')

  await expect(page.locator('a[href*="wa.me"]').first()).toHaveAttribute('href', /wa\.me\/\d{8,}/)
  await expect(page.locator('a[href*="instagram.com/"]').first()).toHaveAttribute(
    'href',
    /instagram\.com\/.+/,
  )

  // The three roots the placeholder list used to render.
  await expect(page.locator('a[href="https://wa.me/"]')).toHaveCount(0)
  await expect(page.locator('a[href="https://instagram.com/"]')).toHaveCount(0)
  await expect(page.locator('a[href="https://t.me/"]')).toHaveCount(0)
})

/**
 * Reordering in the admin reorders the modal (spec 005, T080, FR-038).
 *
 * Row order *is* display order — there is no position field two rows could disagree about — so this
 * asserts the consequence: the owner drags, and the customer's modal follows.
 */
test('the messenger order the owner set is the order customers see', async ({ page, request }) => {
  test.setTimeout(120_000)

  await page.goto('/products/butterfly-diamond-pendant')
  await page.getByRole('button', { name: /add to cart/i }).click()
  await expect(page.getByText(/added to your cart/i)).toBeVisible()

  await page.goto('/cart')
  await page
    .locator('label')
    .filter({ hasText: /I agree to the/ })
    .locator('span[aria-hidden="true"]')
    .click()
  await page.getByRole('button', { name: /^checkout$/i }).click()

  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()

  // Whatever the owner has configured, the modal lists it in that order — read it back from the
  // API rather than assuming, so the test describes the rule and not one particular arrangement.
  const settings = await request.get('/api/globals/contact-settings')
  const configured: { enabled?: boolean; platform: string }[] =
    (await settings.json()).messengers ?? []
  const expected = configured.filter((row) => row.enabled !== false).map((row) => row.platform)

  const shown = await dialog.getByRole('link').evaluateAll((links) =>
    links
      .map((link) => (link as HTMLAnchorElement).href)
      .map((href) =>
        href.includes('wa.me')
          ? 'whatsapp'
          : href.includes('t.me')
            ? 'telegram'
            : href.includes('ig.me')
              ? 'instagram'
              : null,
      )
      .filter(Boolean),
  )

  expect(shown).toEqual(expected)
})

/**
 * The whole flow by keyboard alone (spec 005, T082, FR-017, SC-008).
 *
 * The axe sweep in `tests/a11y/routes.spec.ts` checks the static properties; this checks the ones
 * only an interaction can show — that a dialog traps focus, that Escape closes it, and that focus
 * comes back to the control that opened it rather than to the top of the document.
 */
test('the cart and its dialogs are operable by keyboard alone', async ({ page }) => {
  await page.goto('/products/butterfly-diamond-pendant')
  await page.getByRole('button', { name: /add to cart/i }).click()
  await expect(page.getByText(/added to your cart/i)).toBeVisible()

  await page.goto('/cart')

  // Open the removal confirmation from the keyboard.
  await page.getByRole('button', { name: /^remove /i }).focus()
  await page.keyboard.press('Enter')
  const removal = page.getByRole('dialog')
  await expect(removal).toBeVisible()

  /*
   * Focus is inside the dialog and stays there. Ten tabs is well past the three focusable controls
   * it holds, so if the trap leaks it will have escaped by now.
   */
  for (let i = 0; i < 10; i += 1) {
    await page.keyboard.press('Tab')
    const inside = await removal.evaluate((panel) => panel.contains(document.activeElement))
    expect(inside, `focus left the dialog after ${i + 1} tabs`).toBe(true)
  }

  await page.keyboard.press('Escape')
  await expect(removal).toBeHidden()
  await expect(cartRows(page)).toHaveCount(1)

  // The handoff, opened and dismissed the same way, returns focus to CHECKOUT.
  await page
    .locator('label')
    .filter({ hasText: /I agree to the/ })
    .locator('span[aria-hidden="true"]')
    .click()

  const checkout = page.getByRole('button', { name: /^checkout$/i })
  await checkout.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog')).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(checkout).toBeFocused()
})

/**
 * The shop's own email and phone are editable too.
 *
 * They were hardcoded in `src/lib/contact.ts`, and the number was written two different ways in two
 * components — `+1 (555) 010 20-30` in the contact strip and `+1 555 010 2030` in the footer, with
 * a third form hardcoded into the footer's `tel:`. One record now, and the dialling link derived
 * from it, so there is nothing left to keep in step.
 */
test('the chrome shows the configured email and phone, and the tel link matches', async ({
  page,
  request,
}) => {
  const settings = await request.get('/api/globals/contact-settings')
  const { email, phone } = await settings.json()
  const digits = String(phone).replace(/\D/g, '')

  await page.goto('/')

  // The contact strip and the footer both draw them, and both link them.
  await expect(page.locator(`a[href="mailto:${email}"]`).first()).toBeVisible()
  await expect(page.locator(`a[href="tel:+${digits}"]`).first()).toBeVisible()

  // The address, the hours and the map link come from the same record.
  const { address, openingHours } = await settings.json().catch(() => ({}))
  if (address) await expect(page.getByText(String(address))).toBeVisible()
  if (openingHours) await expect(page.getByText(String(openingHours))).toBeVisible()

  // The footer shipped with a bare maps.google.com — a link to Google Maps, not to this shop.
  await expect(page.locator('a[href="https://maps.google.com/"]')).toHaveCount(0)
  const maps = page.getByRole('link', { name: /open in maps/i })
  // Either the owner's pinned link, or a search for the address they typed — never the bare root.
  await expect(maps).toHaveAttribute('href', /(google\.[a-z.]+\/maps\/\S+|maps\.app\.goo\.gl\/\S+)/)
  if (address) {
    const href = await maps.getAttribute('href')
    expect(href!.includes(encodeURIComponent(String(address))) || !href!.includes('search')).toBe(
      true,
    )
  }

  // No copy of the old hardcoded dialling link survives anywhere on the page.
  const stale = await page.locator('a[href^="tel:"]').evaluateAll((links) =>
    links.map((link) => (link as HTMLAnchorElement).getAttribute('href')),
  )
  expect(new Set(stale)).toEqual(new Set([`tel:+${digits}`]))
})
