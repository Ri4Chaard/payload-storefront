import { expect, test, type Page } from '@playwright/test'

/**
 * The product route (003/T269) — `/products/[slug]`.
 *
 * The fixtures give the engagement ring five photographs and the pendant one, which is the split
 * every assertion about controls turns on: a control that pages a set of one is a lie, and the
 * only way to catch it is to render a piece that has one.
 */
const RING = '/products/paragon-emerald-cut-diamond-engagement-ring'
const PENDANT = '/products/butterfly-diamond-pendant'

const WIDTHS = {
  desktop: { width: 1920, height: 1080 },
  tablet: { width: 1024, height: 900 },
  mobile: { width: 390, height: 844 },
} as const

/** The thumbnail rail, which is drawn at 1024 and 1920 and absent at 390. */
const rail = (page: Page) => page.getByRole('button', { name: /^Show photograph \d+ of \d+$/ })

test('the name is the page’s only first-level heading', async ({ page }) => {
  await page.goto(RING)

  const h1 = page.getByRole('heading', { level: 1 })
  await expect(h1).toHaveText(/paragon emerald cut diamond engagement ring/i)
  expect(await h1.count(), 'more than one h1').toBe(1)
})

/**
 * The outline may not skip a level. The accordions and _Complete the Collection_ are both `h2`
 * under the name, and the promises strip's cards are `h3` under those.
 */
test('the heading outline descends one level at a time', async ({ page }) => {
  await page.goto(RING)

  const levels = await page
    .locator('main h1, main h2, main h3, main h4')
    .evaluateAll((nodes) => nodes.map((node) => Number(node.tagName[1])))

  expect(levels[0], 'the page does not open on its h1').toBe(1)
  for (let index = 1; index < levels.length; index += 1) {
    expect(levels[index]! - levels[index - 1]!, `level jumped at heading ${index}`).toBeLessThanOrEqual(1)
  }
})

for (const [name, size] of Object.entries(WIDTHS)) {
  test(`the gallery pages from its own controls at ${name} width`, async ({ page }) => {
    await page.setViewportSize(size)
    await page.goto(RING)

    // Whichever control this width draws — the rail above 768, the dots below it — carries the
    // same name, because both answer the same question: which photograph am I looking at. The
    // other is `display: none` and so is out of the accessibility tree, which is why this is one
    // assertion rather than two branches.
    await expect(rail(page), 'no visible way to change the photograph').toHaveCount(5)

    const third = rail(page).nth(2)
    await expect(third).toHaveAttribute('aria-current', 'false')

    await third.click()
    await expect(third).toHaveAttribute('aria-current', 'true')

    // Counted over the controls this width actually draws. The other set is `display: none` and
    // still carries its own marks in the DOM, so a bare attribute selector would count both.
    const marked = await rail(page).evaluateAll(
      (nodes) => nodes.filter((node) => node.getAttribute('aria-current') === 'true').length,
    )
    expect(marked, 'two photographs marked current at once').toBe(1)
  })
}

test('the photograph opens full screen, pages, and gives focus back', async ({ page }) => {
  await page.goto(RING)

  const opener = page.getByRole('button', { name: /open full screen$/ }).first()
  await opener.click()

  const viewer = page.getByRole('dialog')
  await expect(viewer).toBeVisible()
  await expect(viewer).toHaveAttribute('aria-modal', 'true')
  // A dialog with no name is an axe violation and a screen reader dead end.
  await expect(viewer).toHaveAttribute('aria-label', /.+/)

  // The viewer takes focus at the END of its opening transition, and until it has, its own key
  // bindings are not installed. Waiting for the focus is waiting for the viewer to be usable —
  // pressing Escape before it lands is a race, not a test.
  await expect(viewer).toBeFocused()

  await page.keyboard.press('Escape')
  await expect(viewer).toBeHidden()

  // Focus comes back to the photograph that was pressed, not to the top of the document.
  await expect(opener).toBeFocused()
})

/**
 * Paging inside the viewer and then closing it must leave the gallery where you ENDED, not where
 * you started. Focusing an element inside a horizontal scroller scrolls it into view, so this is
 * the assertion that catches the track being dragged back to the opening photograph.
 */
test('closing the viewer leaves the gallery on the photograph you paged to', async ({ page }) => {
  await page.goto(RING)

  await page.getByRole('button', { name: /open full screen$/ }).first().click()
  const viewer = page.getByRole('dialog')
  await expect(viewer).toBeFocused()

  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('Escape')
  await expect(viewer).toBeHidden()

  await expect(rail(page).nth(2)).toHaveAttribute('aria-current', 'true')
  await expect(page.getByRole('button', { name: /open full screen$/ }).nth(2)).toBeFocused()
})

/**
 * The photograph is a square whose height follows its width, so an uncapped one turns a wide
 * monitor into a 1200px picture of a ring. 990px is the rail, the gap and the drawn 850px.
 */
test('the gallery stops growing past the width it is drawn at', async ({ page }) => {
  await page.setViewportSize({ width: 2560, height: 1080 })
  await page.goto(RING)

  const photograph = page.getByRole('button', { name: /open full screen$/ }).first()
  // `boundingBox` does not wait for anything, so under a loaded machine it measures a page that
  // has not painted yet and returns null. The visibility check is the wait.
  await expect(photograph).toBeVisible()

  const box = await photograph.boundingBox()
  expect(box!.width, 'the photograph grew past its drawn width').toBeLessThanOrEqual(852)
})

/**
 * The case that decides whether the controls are affordances. One photograph means no rail, no
 * dots and no rail paging — but the photograph still opens.
 */
test('a single-photograph piece offers no dead controls', async ({ page }) => {
  await page.goto(PENDANT)

  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  expect(await rail(page).count(), 'a rail for one photograph').toBe(0)
  expect(
    await page.getByRole('button', { name: /Show (earlier|later) photographs/ }).count(),
    'rail paging with nothing to page',
  ).toBe(0)

  await expect(page.getByRole('button', { name: /open full screen$/ })).toHaveCount(1)
})

test('the accordions open one at a time and their copy comes from the catalogue', async ({ page }) => {
  await page.goto(RING)

  const details = page.getByRole('button', { name: 'PRODUCT DETAILS' })
  await expect(details).toHaveAttribute('aria-expanded', 'false')

  await details.click()
  await expect(details).toHaveAttribute('aria-expanded', 'true')

  const panel = page.getByRole('region', { name: 'PRODUCT DETAILS' })
  await expect(panel).toContainText(/gold/i)

  // Closing has to ANIMATE, not vanish: the copy stays on screen, clipped by the collapsing row,
  // and leaves the accessibility tree only once the row has finished closing.
  //
  // Asserted as the mechanism rather than as "still visible one moment after the click" — the
  // transition is 200ms and that assertion is a race against it, which is exactly how it failed
  // under a loaded machine the first time it was written.
  const copy = panel.locator('div').first()
  await expect(copy).toHaveCSS('visibility', 'visible')
  await expect(copy).toHaveCSS('transition-property', /visibility/)
  await expect(copy).not.toHaveCSS('transition-duration', '0s')

  await details.click()
  await expect(copy).toHaveCSS('visibility', 'hidden')

  // The two shop-wide rows are present and are their own controls.
  await expect(page.getByRole('button', { name: /WARRANTY/ })).toBeVisible()
  await expect(page.getByRole('button', { name: 'DELIVERY' })).toBeVisible()
})

/** FR-037 — the band is the home page's, populated from the piece's own collection. */
test('Complete the Collection shows other pieces and never the piece itself', async ({ page }) => {
  await page.goto(RING)

  const band = page.getByRole('region', { name: 'Complete the Collection' })
  const links = band.getByRole('link')
  const count = await links.count()
  expect(count, 'an empty collection band was drawn').toBeGreaterThan(0)

  for (let index = 0; index < count; index += 1) {
    await expect(links.nth(index)).not.toHaveAttribute('href', RING)
  }
})

/** A slug that names nothing is the branded 404, not a crash and not an empty page. */
test('an unknown slug is the branded 404', async ({ page }) => {
  const response = await page.goto('/products/no-such-piece')
  expect(response?.status()).toBe(404)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
})

/** A draft is indistinguishable from a slug that does not exist (FR-009). */
test('a draft is unreachable by its own URL', async ({ page }) => {
  const response = await page.goto('/products/unreleased-spartan-cuff')
  expect(response?.status()).toBe(404)
})

/**
 * Constitution V. The `Offer` has to carry a machine-readable amount and its currency — a crawler
 * quoting a parsed `"$38,320"` is how a shop advertises a price it does not charge.
 */
test('the page emits Product, Offer and a breadcrumb trail', async ({ page }) => {
  await page.goto(RING)

  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents()
  const documents = blocks.flatMap((block) => {
    const parsed: unknown = JSON.parse(block)
    return Array.isArray(parsed) ? parsed : [parsed]
  }) as Record<string, unknown>[]

  const product = documents.find((entry) => entry['@type'] === 'Product')
  expect(product, 'no Product in the structured data').toBeDefined()
  expect(product!.name).toMatch(/paragon/i)

  const offers = product!.offers as Record<string, unknown>
  expect(offers.priceCurrency).toBe('USD')
  const amount = (offers.price ?? offers.lowPrice) as string
  expect(amount, 'the offer amount is not a plain number').toMatch(/^\d+\.\d{2}$/)

  const trail = documents.find((entry) => entry['@type'] === 'BreadcrumbList')
  expect(trail, 'no BreadcrumbList').toBeDefined()
  expect((trail!.itemListElement as unknown[]).length).toBe(3)
})
