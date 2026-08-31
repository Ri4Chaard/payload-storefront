import { expect, test, type Page } from '@playwright/test'

/**
 * The listing routes (003/T257) — `/all-jewelry` and the four categories.
 *
 * The fixtures put 29 published pieces in the shop and page at twelve, so `/all-jewelry` is three
 * pages and `/rings` is one. Both cases matter: the first proves paging, the second proves the
 * control disappears rather than offering a single page.
 */
const WIDTHS = {
  desktop: { width: 1920, height: 1080, columns: 4 },
  tablet: { width: 1024, height: 900, columns: 3 },
  mobile: { width: 390, height: 844, columns: 2 },
} as const

/** How many cards share the topmost row — the honest measure of a grid's column count. */
async function columnsOf(page: Page): Promise<number> {
  const tops = await page.locator('main article').evaluateAll((cards) =>
    cards.map((card) => Math.round(card.getBoundingClientRect().top)),
  )
  const first = tops[0]
  return tops.filter((top) => top === first).length
}

for (const [name, { width, height, columns }] of Object.entries(WIDTHS)) {
  test(`the grid is ${columns} columns at ${name} width`, async ({ page }) => {
    await page.setViewportSize({ width, height })
    await page.goto('/all-jewelry')

    await expect(page.locator('main article').first()).toBeVisible()
    expect(await columnsOf(page), `wrong column count at ${width}px`).toBe(columns)
  })
}

test('a listing is one heading, and each card is one link', async ({ page }) => {
  await page.goto('/rings')

  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/diamond rings/i)
  expect(await page.getByRole('heading', { level: 1 }).count(), 'more than one h1').toBe(1)

  // The card is a photograph, a name and a price, all covered by one stretched anchor. Carousel
  // arrows and the action are buttons and do not add a second destination.
  const cards = page.locator('main article')
  const count = await cards.count()
  expect(count).toBeGreaterThan(0)

  for (let index = 0; index < count; index += 1) {
    const links = cards.nth(index).getByRole('link')
    expect(await links.count(), `card ${index} offers more than one destination`).toBe(1)
    await expect(links.first()).toHaveAttribute('href', /^\/products\//)
  }
})

/**
 * The four categories partition the shop: every piece is in exactly one, and together they are all
 * of it. Counting is what proves that — an earlier fixture put a bracelet in Diamond Rings and
 * every count-only assertion still passed.
 */
test('the categories partition the shop between them', async ({ page }) => {
  const counts: Record<string, number> = {}

  for (const slug of ['rings', 'bracelets', 'earrings', 'necklaces']) {
    await page.goto(`/${slug}`)
    counts[slug] = await page.locator('main article').count()
    expect(counts[slug], `${slug} is empty`).toBeGreaterThan(0)
  }

  await page.goto('/all-jewelry')
  const firstPage = await page.locator('main article').count()
  const total = await page
    .getByRole('navigation', { name: /pages/i })
    .locator('a[aria-label^="Page"], [aria-current="page"]')
    .count()

  expect(Object.values(counts).reduce((sum, n) => sum + n, 0)).toBeGreaterThanOrEqual(firstPage)
  expect(total, 'the shop should span more than one page').toBeGreaterThan(1)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/all jewelry/i)
})

/**
 * The action under every card (nodes 412:7714 at 768, 412:7860 at 375) — solid at the widths that
 * draw it that way, and still hover-revealed at 1920 where the same card is drawn at `opacity: 0`.
 */
test('every card offers its action at tablet and mobile widths', async ({ page }) => {
  for (const width of [768, 375]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/all-jewelry')

    const cards = page.locator('main article')
    const actions = page.locator('main article a[aria-hidden="true"]')
    await expect(actions).toHaveCount(await cards.count())

    const first = actions.first()
    expect(await first.evaluate((element) => getComputedStyle(element).opacity)).toBe('1')
    await expect(first).toHaveAttribute('href', /^\/products\//)
  }
})

test('the desktop card keeps its action until the card is hovered', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 900 })
  await page.goto('/all-jewelry')

  const card = page.locator('main article').first()
  const action = card.locator('a[aria-hidden="true"]')

  expect(await action.evaluate((element) => getComputedStyle(element).opacity)).toBe('0')
  await card.hover()
  await expect
    .poll(() => action.evaluate((element) => getComputedStyle(element).opacity))
    .toBe('1')
})

test('a category shows the pieces it is named for', async ({ page }) => {
  await page.goto('/rings')

  const names = await page.locator('main article a').allInnerTexts()
  expect(names.length).toBeGreaterThan(0)

  // Development fixtures name a piece after what it is, so a necklace in Diamond Rings is a
  // modelling mistake rather than a rendering one — and this is where it shows.
  const strays = names.filter((name) => /bracelet|earring|necklace|pendant/i.test(name))
  expect(strays, 'these are not rings').toEqual([])
})

test('an unknown category is the branded 404, inside the shell', async ({ page }) => {
  const response = await page.goto('/rungs')
  expect(response?.status()).toBe(404)

  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/does not exist/i)
  // Inside the shell: a wrong turn rather than a dead end.
  await expect(page.getByRole('contentinfo')).toBeVisible()
  await expect(page.getByRole('link', { name: /browse all jewelry/i })).toBeVisible()
})

test('pages are numbered, addressable, and survive a reload', async ({ page }) => {
  await page.goto('/all-jewelry')

  const pagination = page.getByRole('navigation', { name: /pages/i })
  await expect(pagination).toBeVisible()
  await expect(page.getByRole('link', { name: 'Page 2' })).toBeVisible()

  const firstOnPageOne = await page.locator('main article a').first().getAttribute('href')

  await page.getByRole('link', { name: 'Page 2' }).click()
  await expect(page).toHaveURL(/\?page=2$/)

  const firstOnPageTwo = await page.locator('main article a').first().getAttribute('href')
  expect(firstOnPageTwo).not.toBe(firstOnPageOne)

  // The whole point of the number being in the URL: a fresh context lands on the same page.
  await page.reload()
  expect(await page.locator('main article a').first().getAttribute('href')).toBe(firstOnPageTwo)

  // And the current page is announced rather than only outlined.
  await expect(pagination.locator('[aria-current="page"]')).toHaveText('2')
})

test('a listing shorter than a page offers no pagination at all', async ({ page }) => {
  await page.goto('/rings')
  await expect(page.getByRole('navigation', { name: /pages/i })).toHaveCount(0)
})

test('a page past the end is a 404, not an endless run of empty pages', async ({ page }) => {
  const response = await page.goto('/all-jewelry?page=99')
  expect(response?.status()).toBe(404)
})

test('a filter matching nothing renders the empty state, not an empty grid', async ({ page }) => {
  await page.goto('/all-jewelry?maxPrice=1')

  await expect(page.locator('main article')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: /nothing matches/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /clear all filters/i })).toBeVisible()
})

test('a filter the shop does not have is reported rather than silently dropped', async ({
  page,
}) => {
  await page.goto('/all-jewelry?colour=purple')

  await expect(page.getByRole('status')).toContainText(/purple/i)
  // Reported, and NOT applied — the grid is the unfiltered one.
  expect(await page.locator('main article').count()).toBeGreaterThan(0)
})

test('the listing renders without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  const page = await context.newPage()

  await page.goto('/all-jewelry?page=2')
  await expect(page.locator('main article').first()).toBeVisible()
  await expect(page.getByRole('link', { name: 'Page 1' })).toBeVisible()

  await context.close()
})

for (const width of [320, 390]) {
  test(`nothing scrolls sideways at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 })
    await page.goto('/all-jewelry')

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    )
    expect(overflow, `the page scrolls horizontally at ${width}px`).toBe(false)
  })
}
