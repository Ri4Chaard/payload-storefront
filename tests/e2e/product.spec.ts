import { expect, test, type Page } from '@playwright/test'

/**
 * The product route (003/T269) — `/products/[slug]`.
 *
 * The fixtures give Product 1 five photographs and Product 3 one, which is the split
 * every assertion about controls turns on: a control that pages a set of one is a lie, and the
 * only way to catch it is to render a product that has one.
 */
const PRODUCT = '/products/product-1'
const SINGLE_PHOTO = '/products/product-3'

const WIDTHS = {
  desktop: { width: 1920, height: 1080 },
  tablet: { width: 1024, height: 900 },
  mobile: { width: 390, height: 844 },
} as const

/** The thumbnail rail, which is drawn at 1024 and 1920 and absent at 390. */
const rail = (page: Page) => page.getByRole('button', { name: /^Show photograph \d+ of \d+$/ })

test('the name is the page’s only first-level heading', async ({ page }) => {
  await page.goto(PRODUCT)

  const h1 = page.getByRole('heading', { level: 1 })
  await expect(h1).toHaveText(/^product 1$/i)
  expect(await h1.count(), 'more than one h1').toBe(1)
})

/**
 * The outline may not skip a level. The accordions and _Complete the Collection_ are both `h2`
 * under the name, and the promises strip's cards are `h3` under those.
 */
test('the heading outline descends one level at a time', async ({ page }) => {
  await page.goto(PRODUCT)

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
    await page.goto(PRODUCT)

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
  await page.goto(PRODUCT)

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
  await page.goto(PRODUCT)

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
 * monitor into a 1200px picture of a product. 990px is the rail, the gap and the drawn 850px.
 */
test('the gallery stops growing past the width it is drawn at', async ({ page }) => {
  await page.setViewportSize({ width: 2560, height: 1080 })
  await page.goto(PRODUCT)

  const photograph = page.getByRole('button', { name: /open full screen$/ }).first()

  /**
   * Polled, because the track's children are REPLACED shortly after mount: the loop's copies are
   * added then, deliberately, so the first paint cannot show the last photograph. A plain
   * `boundingBox()` measures whatever it finds, and between the copies arriving and React
   * reconciling it can find a node that has just detached — which returns null, not a width.
   *
   * 850px exactly: the 990px the gallery is capped at, less the 140px the rail and its gap
   * occupy. Asserting the number rather than a ceiling also catches the opposite failure, a
   * collapsed box measuring zero.
   */
  await expect
    .poll(async () => {
      const box = await photograph.boundingBox()
      return box ? Math.round(box.width) : 0
    }, { message: 'the photograph is not the drawn 850px at a 2560px viewport' })
    .toBe(850)
})

/**
 * The gallery takes its height from the photograph, not from what it is laid out beside.
 *
 * It is a grid item, so it stretches to the row by default — and the row is as tall as the
 * information column. Opening an accordion therefore grew the gallery's box, and since the rail is
 * `inset-y-0` of it, the arrows walked down the page with the copy while the photograph stayed
 * where it was. Measured against the gallery's own top so that a page scroll cannot be mistaken
 * for the failure.
 */
test('opening an accordion does not move the gallery’s controls', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1400 })
  await page.goto(PRODUCT)

  const geometry = () =>
    page.evaluate(() => {
      const arrows = document.querySelector('[aria-label="Show the next photograph"]')!.parentElement!
      const root = arrows.parentElement!.parentElement!
      const photograph = root.querySelector('[aria-label$="open full screen"]')!
      return {
        root: Math.round(root.getBoundingClientRect().height),
        photograph: Math.round(photograph.getBoundingClientRect().height),
        arrows: Math.round(
          arrows.getBoundingClientRect().top - root.getBoundingClientRect().top,
        ),
      }
    })

  await expect(page.getByRole('button', { name: 'Show the next photograph' })).toBeVisible()
  const before = await geometry()
  expect(before.root, 'the gallery is not the height of its photograph').toBe(before.photograph)

  const details = page.getByRole('button', { name: 'PRODUCT DETAILS' })
  await details.click()
  await expect(details).toHaveAttribute('aria-expanded', 'true')

  expect(await geometry(), 'the accordion moved the gallery').toEqual(before)
})

/**
 * The case that decides whether the controls are affordances. One photograph means no rail, no
 * dots and no rail paging — but the photograph still opens.
 */
test('a single-photograph product offers no dead controls', async ({ page }) => {
  await page.goto(SINGLE_PHOTO)

  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  expect(await rail(page).count(), 'a rail for one photograph').toBe(0)
  expect(
    await page.getByRole('button', { name: /Show (earlier|later) photographs/ }).count(),
    'rail paging with nothing to page',
  ).toBe(0)

  await expect(page.getByRole('button', { name: /open full screen$/ })).toHaveCount(1)
})

test('the accordions open one at a time and their copy comes from the catalogue', async ({ page }) => {
  await page.goto(PRODUCT)

  const details = page.getByRole('button', { name: 'PRODUCT DETAILS' })
  await expect(details).toHaveAttribute('aria-expanded', 'false')

  await details.click()
  await expect(details).toHaveAttribute('aria-expanded', 'true')

  const panel = page.getByRole('region', { name: 'PRODUCT DETAILS' })
  await expect(panel).toContainText(/Material A/)

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

/** FR-037 — the band is the home page's, populated from the product's own collection. */
test('Complete the Collection shows other products and never the product itself', async ({ page }) => {
  await page.goto(PRODUCT)

  const band = page.getByRole('region', { name: 'Complete the Collection' })
  const links = band.getByRole('link')
  const count = await links.count()
  expect(count, 'an empty collection band was drawn').toBeGreaterThan(0)

  for (let index = 0; index < count; index += 1) {
    await expect(links.nth(index)).not.toHaveAttribute('href', PRODUCT)
  }
})

/** A slug that names nothing is the branded 404, not a crash and not an empty page. */
test('an unknown slug is the branded 404', async ({ page }) => {
  const response = await page.goto('/products/no-such-product')
  expect(response?.status()).toBe(404)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
})

/** A draft is indistinguishable from a slug that does not exist (FR-009). */
test('a draft is unreachable by its own URL', async ({ page }) => {
  const response = await page.goto('/products/unreleased-product')
  expect(response?.status()).toBe(404)
})

/**
 * Constitution V. The `Offer` has to carry a machine-readable amount and its currency — a crawler
 * quoting a parsed `"$38,320"` is how a shop advertises a price it does not charge.
 */
test('the page emits Product, Offer and a breadcrumb trail', async ({ page }) => {
  await page.goto(PRODUCT)

  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents()
  const documents = blocks.flatMap((block) => {
    const parsed: unknown = JSON.parse(block)
    return Array.isArray(parsed) ? parsed : [parsed]
  }) as Record<string, unknown>[]

  const product = documents.find((entry) => entry['@type'] === 'Product')
  expect(product, 'no Product in the structured data').toBeDefined()
  expect(product!.name).toBe('Product 1')

  const offers = product!.offers as Record<string, unknown>
  expect(offers.priceCurrency).toBe('USD')
  const amount = (offers.price ?? offers.lowPrice) as string
  expect(amount, 'the offer amount is not a plain number').toMatch(/^\d+\.\d{2}$/)

  const trail = documents.find((entry) => entry['@type'] === 'BreadcrumbList')
  expect(trail, 'no BreadcrumbList').toBeDefined()
  expect((trail!.itemListElement as unknown[]).length).toBe(3)
})

/**
 * FR-039 — the price follows the chosen option. Until one is chosen the product has a range and says
 * "From"; afterwards it has a price, and continuing to say "from" would quote a range the visitor
 * has already resolved.
 */
test('choosing an option changes the price', async ({ page }) => {
  await page.goto(PRODUCT)

  const price = page.getByText(/^From \$|^\$/).first()
  await expect(price).toHaveText(/^From \$/)

  const picker = page.getByRole('combobox', { name: /choose an option/i })
  await picker.click()

  const options = page.getByRole('option')
  const chosen = await options.first().textContent()
  await options.first().click()

  // The trigger now carries the value, which is what makes a screen reader say "Choose an option, Option A"
  // rather than "Choose an option, button".
  await expect(picker).toContainText(chosen!.split('$')[0]!.trim())
  await expect(page.getByText(/^From \$/)).toHaveCount(0)
})

/** FR-040 — an unavailable option is drawn, announced as unavailable, and cannot be chosen. */
test('an unavailable option is shown and cannot be selected', async ({ page }) => {
  await page.goto(PRODUCT)

  await page.getByRole('combobox', { name: /choose an option/i }).click()
  const options = page.getByRole('option')
  expect(await options.count(), 'no options offered').toBeGreaterThan(0)

  const unavailable = options.filter({ hasText: /out of stock/i })
  if ((await unavailable.count()) > 0) {
    await expect(unavailable.first()).toBeDisabled()
  }
})

/**
 * **This asserted the opposite until spec 011, and had been stale for two specs.**
 *
 * It was written in 003 to say the actions were "disabled until spec 004 builds the seam behind
 * them", so that wiring them up would be a deliberate change with a failing test to notice. Spec 005
 * built the seam and this was not revisited; what kept it green afterwards was the size selector
 * refusing to let anything be ordered before a size was picked, which is not what it claims to
 * measure. Removing sizes took that prop away and the staleness surfaced.
 */
test('the two actions are live on a product that can be ordered', async ({ page }) => {
  await page.goto(PRODUCT)

  await expect(page.getByRole('button', { name: 'Add to cart' })).toBeEnabled()
  await expect(page.getByRole('button', { name: 'Buy now' })).toBeEnabled()

  // The stepper beside them is real, and stops at one.
  const decrease = page.getByRole('button', { name: /decrease/i })
  await expect(decrease).toBeDisabled()
})

/**
 * The picker is a listbox, not a menu: it has a value, and it says so.
 *
 * Asserted on the OPTION picker since spec 011 removed sizes. The claim is about the kit's `Select`
 * — expanded state, value on the trigger, focus returning — and the option selector is the one that
 * remains to make it against.
 */
test('the option picker exposes its value and its state', async ({ page }) => {
  await page.goto(PRODUCT)

  const picker = page.getByRole('combobox', { name: /choose an option/i })
  await expect(picker).toHaveAttribute('aria-expanded', 'false')

  await picker.click()
  await expect(picker).toHaveAttribute('aria-expanded', 'true')
  await expect(page.getByRole('listbox')).toBeVisible()

  const first = page.getByRole('option').first()
  const label = (await first.textContent())!.trim()
  await first.click()

  await expect(picker).toHaveAttribute('aria-expanded', 'false')
  await expect(picker).toContainText(label.split('$')[0]!.trim())
  // Focus comes back to the trigger rather than being stranded in a panel that has gone.
  await expect(picker).toBeFocused()
})

/** FR-025 — a product adds to the cart in one action now that no size is demanded first. */
test('a product can be added to the cart without choosing a size', async ({ page }) => {
  await page.goto(PRODUCT)

  await expect(page.getByRole('combobox', { name: /size/i })).toHaveCount(0)

  await page.getByRole('combobox', { name: /choose an option/i }).click()
  await page.getByRole('option').first().click()
  await expect(page.getByRole('button', { name: /add to cart/i })).toBeEnabled()
})

/**
 * A product with counted stock cannot be ordered past it (owner, 2026-09-01).
 *
 * Product 10 is stock-tracked with two in the shop and offers no options, so its ceiling is the
 * product's own. Pressing past the ceiling must not merely clamp the number — the control has to
 * say it has stopped, which for a stepper means the plus goes disabled.
 */
test('the quantity stepper stops at the stock a product actually has', async ({ page }) => {
  await page.goto('/products/product-10')

  const increase = page.getByRole('button', { name: /increase/i })
  const decrease = page.getByRole('button', { name: /decrease/i })
  const count = page.locator('[role="group"] span[aria-live="polite"]')

  await expect(count).toHaveText('1')
  await expect(decrease, 'the minimum is one, so this starts disabled').toBeDisabled()

  await increase.click()
  await expect(count).toHaveText('2')
  await expect(increase, 'the stepper went past the stock').toBeDisabled()
})

/** A made-to-order product has no ceiling to reach, so the control never stops. */
test('a made-to-order product counts past any stock number', async ({ page }) => {
  await page.goto(PRODUCT)

  const increase = page.getByRole('button', { name: /increase/i })
  const count = page.locator('[role="group"] span[aria-live="polite"]')

  for (let press = 0; press < 5; press += 1) await increase.click()
  await expect(count).toHaveText('6')
  await expect(increase).toBeEnabled()
})

/**
 * The ceiling belongs to the chosen option — **on a stock-tracked product**.
 *
 * This used to be asserted against Product 1, which is MADE TO ORDER. That passed only
 * because of the defect spec 011/US1 fixes: a made-to-order option was gated on a count it has no
 * business having, so picking the scarcest one clamped the quantity to 1. A made-to-order product has
 * nothing to run out of and now has no ceiling at all (011/FR-003) — which the test above this one
 * has always said, and the two contradicted each other.
 *
 * The claim itself still holds and still matters, so it moves to a product where a count means
 * something. The quantity is stored as what was ASKED FOR and capped at the moment of use, so moving
 * to a scarcer option lowers it rather than leaving the visitor stuck at the low mark.
 */
test('a made-to-order product keeps no ceiling whichever option is chosen', async ({ page }) => {
  await page.goto(PRODUCT)

  const count = page.locator('[role="group"] span[aria-live="polite"]')
  const increase = page.getByRole('button', { name: /increase/i })
  for (let press = 0; press < 3; press += 1) await increase.click()
  await expect(count).toHaveText('4')

  // The option with the smallest count in the shop. It changes nothing: nothing is being counted.
  await page.getByRole('combobox', { name: /choose an option/i }).click()
  const scarce = page.getByRole('option').filter({ hasText: /Option C/ })
  await scarce.first().click()

  await expect(count, 'a made-to-order option has no count to be capped by').toHaveText('4')
  await expect(increase).toBeEnabled()
})

// ---------------------------------------------------------------------------------------------
// However a visitor arrives — US7 (003/T297–T299)
// ---------------------------------------------------------------------------------------------

/**
 * SC-004 asks for a product page that is FULLY READABLE with JavaScript switched off, which is a
 * stronger claim than "it renders": two of the three accordions are collapsed at first paint, and
 * the button that would open them is a click handler that will never run.
 *
 * `accordion.css` answers that with `@media (scripting: none)`, and this is the test that says the
 * answer works. Collapsed is not merely invisible — the panel sits at `visibility: hidden` inside a
 * zero-height grid row, which takes it out of the accessibility tree too, so without the rule a
 * third of the details would be unreadable rather than merely out of sight.
 */
test('the page is fully readable with JavaScript disabled', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  const page = await context.newPage()
  await page.goto(PRODUCT)

  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByText('$38,320').first()).toBeVisible()
  await expect(page.locator('main img').first()).toBeVisible()

  // Every section, not just the one that happens to start open.
  for (const name of [/PRODUCT DETAILS/, /WARRANTY/, /DELIVERY/]) {
    const panel = page.getByRole('region', { name })
    await expect(panel, `${name} is not readable without scripting`).toBeVisible()
    expect((await panel.innerText()).trim().length, `${name} is empty`).toBeGreaterThan(0)
  }

  await context.close()
})

/**
 * And the one thing that IS unavailable, stated rather than left to be discovered. The viewer is a
 * script; the photograph underneath it is not, so the page loses a way to look closer and nothing
 * else.
 */
test('without JavaScript the full-screen viewer is the only thing missing', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  const page = await context.newPage()
  await page.goto(PRODUCT)

  await page.getByRole('button', { name: /open full screen$/ }).first().click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  // The photograph it would have opened is still on the page, at the size the layout gives it.
  await expect(page.locator('main img').first()).toBeVisible()

  await context.close()
})

/** SC-007, on the route with the widest single element on the site. */
test('the page reflows at 320px and at 200% zoom without scrolling sideways', async ({ page }) => {
  const scrollsSideways = () =>
    page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    )

  await page.setViewportSize({ width: 320, height: 800 })
  await page.goto(PRODUCT)
  expect(await scrollsSideways(), 'the page scrolls horizontally at 320px').toBe(false)

  // 200% zoom on a 1280 screen presents as a 640px viewport — the width at which the gallery is
  // still full-bleed but the information column has come out from beside it.
  await page.setViewportSize({ width: 640, height: 512 })
  await page.reload()
  expect(await scrollsSideways(), 'the page scrolls horizontally at 200% zoom').toBe(false)

  // Present, not merely not-overflowing.
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByRole('button', { name: 'PRODUCT DETAILS' })).toBeVisible()
})

/**
 * The gallery under `prefers-reduced-motion` (003/T299).
 *
 * Two different mechanisms have to hold at once, which is why this is one test and not two: the
 * page carries a five-second auto-advance, and paging by hand scrolls the track. A visitor who
 * asked for less motion should get neither — nothing that moves on its own, and nothing that
 * travels when they press a control.
 */
test('the gallery neither advances by itself nor travels when asked for less motion', async ({
  browser,
}) => {
  const context = await browser.newContext({
    reducedMotion: 'reduce',
    viewport: { width: 1024, height: 900 },
  })
  const page = await context.newPage()
  await page.goto(PRODUCT)

  const first = rail(page).first()
  await expect(first).toHaveAttribute('aria-current', 'true')

  // Longer than the 5s the page asks for. The timer never starts under this preference.
  await page.waitForTimeout(6000)
  await expect(first, 'the gallery advanced on its own').toHaveAttribute('aria-current', 'true')

  // And the visitor's own press lands immediately rather than gliding. `.first()` because
  // _Complete the Collection_ puts a gallery on every card beneath this one.
  const track = page.getByRole('list', { name: /^Photographs of / }).first()
  await expect(track).toHaveCSS('scroll-behavior', 'auto')

  await context.close()
})

/**
 * The viewer under `prefers-reduced-motion` (003/T299).
 *
 * This is the one animation on the site a stylesheet cannot reach. The global rule in `styles.css`
 * collapses every CSS transition, which covers the drawer and the gallery — but PhotoSwipe drives
 * its open frame by frame in JavaScript, so it has to be told, and `lightbox.tsx` tells it.
 *
 * The assertion is the PHOTOGRAPH'S OWN BOX, not the ground behind it. The ground fades through a
 * CSS transition, which the global rule already collapses whether or not the library was told
 * anything — so it would pass with the option removed. The zoom is the part PhotoSwipe drives
 * itself: measured here, it grows 471×591 → 717×900 over about four hundred milliseconds when the
 * preference is absent, and is at its final size in the first frame when it is not.
 */
test('the full-screen viewer opens without animating when asked for less motion', async ({
  browser,
}) => {
  const context = await browser.newContext({
    reducedMotion: 'reduce',
    viewport: { width: 1280, height: 900 },
  })
  const page = await context.newPage()
  await page.goto(PRODUCT)

  await page.getByRole('button', { name: /open full screen$/ }).first().click()
  await expect(page.getByRole('dialog')).toBeVisible()

  const photograph = page.locator('.pswp__img').first()
  const box = () => photograph.evaluate((node) => JSON.stringify(node.getBoundingClientRect()))

  const first = await box()
  await page.waitForTimeout(500)
  expect(await box(), 'the photograph was still growing — the open was animated').toBe(first)

  await context.close()
})
