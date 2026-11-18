import { expect, test, type Page } from '@playwright/test'

/**
 * The listing routes (003/T257) — `/all-jewelry` and the four categories.
 *
 * The fixtures put 29 published pieces in the shop and page at twelve, so `/all-jewelry` is three
 * pages and `/category-1` is one. Both cases matter: the first proves paging, the second proves the
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
  await page.goto('/category-1')

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
 * of it. Counting is what proves that — an earlier fixture put a bracelet in Category 1 and
 * every count-only assertion still passed.
 */
test('the categories partition the shop between them', async ({ page }) => {
  const counts: Record<string, number> = {}

  for (const slug of ['category-1', 'category-2', 'category-3', 'category-4']) {
    await page.goto(`/${slug}`)
    counts[slug] = await page.locator('main article').count()
    expect(counts[slug], `${slug} is empty`).toBeGreaterThan(0)
  }

  // Everything, in one address, so the sum can be checked against a whole rather than a first set.
  await page.goto('/all-jewelry?page=99')
  const everything = await page.locator('main article').count()

  expect(Object.values(counts).reduce((sum, count) => sum + count, 0)).toBe(everything)
  expect(everything, 'the shop should be longer than one set').toBeGreaterThan(12)
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
  await page.goto('/category-1')

  const names = await page.locator('main article a').allInnerTexts()
  expect(names.length).toBeGreaterThan(0)

  // Development fixtures name a piece after what it is, so a necklace in Category 1 is a
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

const cards = (page: Page) => page.locator('main article')
const loadMore = (page: Page) => page.getByRole('link', { name: 'Load more' })
const counter = (page: Page) => page.getByText(/^Showing \d+ of \d+/)

/**
 * The listing EXTENDS. Pressing LOAD MORE must add to what is on screen rather than replace it —
 * the first card must still be the first card — and the position has to survive a reload, which is
 * the whole reason it travels as `?page=` rather than as client state (FR-018).
 */
test('LOAD MORE extends the grid, counts what is shown, and survives a reload', async ({ page }) => {
  await page.goto('/all-jewelry')

  const first = await cards(page).count()
  const firstCardHref = await cards(page).first().locator('a').first().getAttribute('href')
  await expect(counter(page)).toHaveText(new RegExp(`^Showing ${first} of \\d+ pieces$`))

  await loadMore(page).click()

  await expect(page).toHaveURL(/\?page=2$/)
  await expect(cards(page)).toHaveCount(first * 2)
  await expect(counter(page)).toHaveText(new RegExp(`^Showing ${first * 2} of \\d+ pieces$`))

  // Extended, not replaced: what was on screen is still on screen, and still first.
  expect(await cards(page).first().locator('a').first().getAttribute('href')).toBe(firstCardHref)

  const afterPress = await cards(page).count()
  await page.reload()
  await expect(cards(page)).toHaveCount(afterPress)
})

/** The last press exhausts the listing, and the control goes rather than sitting there inert. */
test('LOAD MORE goes when there is nothing more to load', async ({ page }) => {
  await page.goto('/all-jewelry?page=99')

  const total = await cards(page).count()
  await expect(counter(page)).toHaveText(`Showing ${total} of ${total} pieces`)
  await expect(loadMore(page)).toHaveCount(0)
})

test('a listing shorter than one set offers no control at all', async ({ page }) => {
  await page.goto('/category-1')

  await expect(loadMore(page)).toHaveCount(0)
  // The count stays. "Showing 8 of 8" is the answer to "is that everything?".
  await expect(counter(page)).toBeVisible()
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

  await expect(page.getByRole('status').filter({ hasText: /^Ignored/ })).toContainText(/purple/i)
  // Reported, and NOT applied — the grid is the unfiltered one.
  expect(await page.locator('main article').count()).toBeGreaterThan(0)
})

test('the listing renders without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  const page = await context.newPage()

  await page.goto('/all-jewelry')
  await expect(page.locator('main article').first()).toBeVisible()

  // The control is a link to `?page=2`, so the server renders the longer grid and no scripting is
  // involved anywhere in it.
  const first = await page.locator('main article').count()
  await page.getByRole('link', { name: 'Load more' }).click()
  await expect(page).toHaveURL(/\?page=2$/)
  await expect(page.locator('main article')).toHaveCount(first * 2)

  await context.close()
})

// 320 is the narrowest viewport WCAG 1.4.10 asks for, 390 is the narrowest frame the design draws,
// and 640 is what a 1280 screen presents at 200% zoom — the third is the same requirement reached by
// a different route, and it is the one where the grid changes shape rather than merely narrowing.
for (const width of [320, 390, 640]) {
  test(`nothing scrolls sideways at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 })
    await page.goto('/all-jewelry')

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    )
    expect(overflow, `the page scrolls horizontally at ${width}px`).toBe(false)
  })
}

// ---------------------------------------------------------------------------------------------
// Filtering — US4 (003/T277)
// ---------------------------------------------------------------------------------------------

const drawer = (page: Page) => page.locator('#filters')
const filtersTrigger = (page: Page) => page.getByRole('link', { name: /^Filters/ })

/**
 * A checkbox row by its visible word.
 *
 * The input is `sr-only` — a real control, clipped — so it is the label that gets pressed, which is
 * also what a visitor does. `getByRole('checkbox')` is used for READING state, where visibility
 * does not apply.
 */
const option = (page: Page, name: string) =>
  page.locator('#filters label').filter({ hasText: new RegExp(`^${name}$`) })

test('the toolbar commits immediately, with no APPLY (FR-023)', async ({ page }) => {
  await page.goto('/category-1')

  await page.getByRole('link', { name: 'Oval', exact: true }).click()
  await expect(page).toHaveURL('/category-1?shape=oval')
  await expect(page.getByRole('link', { name: 'Remove Oval filter' })).toBeVisible()

  // …and the same for the in-stock toggle, which is a link for exactly this reason.
  await page.getByRole('link', { name: 'In-stock only' }).click()
  await expect(page).toHaveURL('/category-1?shape=oval&inStock=1')
})

/**
 * The slider is the one quick control that cannot be a link, so it commits on release instead —
 * here through the keyboard, which is the path a pointer drag ends in anyway.
 *
 * Only ONE slider answers to this name: the drawer holds a second pair, and `display: none` keeps
 * them out of the accessibility tree until it opens.
 */
test('the price slider commits when it is moved, with no APPLY', async ({ page }) => {
  await page.goto('/category-1')
  // Waits for the scripts to finish arriving before pressing anything. The poll below can survive
  // a slow hydration, but it should not have to spend its budget on a page that has not finished
  // downloading — which is what a full parallel run against a dev server produces.
  await page.waitForLoadState('networkidle')

  const handle = page.getByRole('slider', { name: 'Maximum price' })

  /*
    Pressed until it answers, rather than once and hoped.

    The slider is a real `<input type="range">`, so it moves under the arrow keys the moment the
    server's HTML arrives — but the commit is a React handler, and pressing before hydration lands
    slides the handle and records nothing. One press is a race the test lost about once in every
    four full runs. Each retry costs one more step of a 244-step range.
  */
  await expect
    .poll(
      async () => {
        await handle.focus()
        await page.keyboard.press('ArrowLeft')
        return page.url()
      },
      {
        message: 'the slider never committed — is the page hydrating?',
        /**
         * The one assertion that genuinely needs more than the 5s default, and the last to be
         * given it — worker count and route warming came first, because both help every test and
         * this helps one.
         *
         * It is a race by construction: the slider is a real `<input type="range">` that moves
         * under the arrow keys as soon as the HTML lands, while the commit is a React handler that
         * arrives later — so it needs more room than the raised global default, not merely the
         * same. Fifteen seconds is measured, not guessed: alone the test takes six to nine.
         */
        timeout: 15_000,
      },
    )
    .toMatch(/maxPrice=/)

  await expect(page.getByRole('link', { name: /^Remove Under \$/ })).toBeVisible()
})

test('a filtered URL renders the same listing in a fresh context, drawer pre-ticked', async ({
  browser,
}) => {
  const context = await browser.newContext()
  const page = await context.newPage()

  await page.goto('/category-1?colour=clear&shape=round')
  expect(await page.locator('main article').count()).toBeGreaterThan(0)

  await expect(page.getByRole('link', { name: 'Remove Clear filter' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Remove Round filter' })).toBeVisible()

  // Scenario 5: the panel opens agreeing with the address that was shared.
  await filtersTrigger(page).click()
  await expect(page.getByRole('checkbox', { name: 'Clear' })).toBeChecked()
  await expect(page.getByRole('checkbox', { name: 'Round' })).toBeChecked()
  await expect(page.getByRole('checkbox', { name: 'Green' })).not.toBeChecked()

  await context.close()
})

test('the drawer edits a draft — dismissing discards it, APPLY commits it', async ({ page }) => {
  await page.goto('/category-1')

  await filtersTrigger(page).click()
  await option(page, 'Green').click()
  await page.keyboard.press('Escape')

  // Scenario 2: ticked, dismissed, and nothing happened.
  await expect(drawer(page)).toBeHidden()
  await expect(page).toHaveURL('/category-1')

  await filtersTrigger(page).click()
  await expect(page.getByRole('checkbox', { name: 'Green' })).not.toBeChecked()

  await option(page, 'Green').click()
  await page.getByRole('button', { name: 'APPLY', exact: true }).click()

  await expect(page).toHaveURL('/category-1?colour=green')
  await expect(drawer(page)).toBeHidden()
  await expect(page.getByRole('link', { name: 'Remove Green filter' })).toBeVisible()
})

test('removing a chip drops that filter and no other', async ({ page }) => {
  await page.goto('/category-1?colour=green&shape=oval')

  await page.getByRole('link', { name: 'Remove Oval filter' }).click()

  await expect(page).toHaveURL('/category-1?colour=green')
  await expect(page.getByRole('link', { name: 'Remove Green filter' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Remove Oval filter' })).toHaveCount(0)
})

/** The route's category is a chip like any other, and dropping it is the whole shop. */
test('removing the category chip widens to all jewelry', async ({ page }) => {
  await page.goto('/category-1?colour=green')

  await page.getByRole('link', { name: 'Remove Category 1 filter' }).click()
  await expect(page).toHaveURL('/all-jewelry?colour=green')
})

test('CLEAR returns to the category it started from', async ({ page }) => {
  await page.goto('/category-1?colour=green&shape=oval&sort=price-asc')

  await filtersTrigger(page).click()
  await page.getByRole('link', { name: 'CLEAR', exact: true }).click()

  await expect(page).toHaveURL('/category-1')
  await expect(page.getByRole('link', { name: /^Remove/ })).toHaveCount(1) // the category itself
})

test('below md the drawer covers the screen, traps focus, and Escape gives it back', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/category-1?colour=green')

  // FR-028: the count is drawn on the phone — the category and the colour.
  await expect(filtersTrigger(page)).toContainText('(2)')

  await filtersTrigger(page).click()
  await expect(drawer(page)).toBeVisible()

  // FR-027, one measurement at a time: it covers the viewport…
  const box = await drawer(page).boundingBox()
  expect(box?.width).toBe(390)

  // …the page behind does not scroll…
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow)).toBe(
    'hidden',
  )

  // …focus is inside it and stays there…
  expect(await page.evaluate(() => document.getElementById('filters')?.contains(document.activeElement))).toBe(true)
  for (let press = 0; press < 12; press += 1) await page.keyboard.press('Tab')
  expect(await page.evaluate(() => document.getElementById('filters')?.contains(document.activeElement))).toBe(true)

  // …and Escape closes it and hands focus back to what opened it.
  await page.keyboard.press('Escape')
  await expect(drawer(page)).toBeHidden()
  await expect(filtersTrigger(page)).toBeFocused()
})

/**
 * FR-029, and the reason the drawer is a `<form method="GET">` rather than a click handler.
 *
 * The panel is opened by the address bar — the trigger is a link to its own id and `:target` is
 * what shows it — and submitted by the browser. The form posts to `/all-jewelry` because a form
 * cannot choose its path; the canonical redirect puts the category back where it belongs, so this
 * visitor ends on exactly the address a scripted one would have.
 */
test('the drawer filters without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  const page = await context.newPage()

  await page.goto('/category-1')
  await expect(drawer(page)).toBeHidden()

  await filtersTrigger(page).click()
  await expect(page).toHaveURL('/category-1#filters')
  await expect(drawer(page)).toBeVisible()

  await option(page, 'Green').click()
  await page.getByRole('button', { name: 'APPLY', exact: true }).click()

  await expect(page).toHaveURL('/category-1?colour=green')
  await expect(page.getByRole('link', { name: 'Remove Green filter' })).toBeVisible()
  // The untouched price slider submits both of its ends. They span the whole catalogue, so they
  // are not a filter and no chip claims they are.
  await expect(page.getByRole('link', { name: /Remove \$/ })).toHaveCount(0)

  await context.close()
})

test('a category in the query is redirected onto its own path', async ({ page }) => {
  await page.goto('/all-jewelry?category=category-1&colour=green')

  await expect(page).toHaveURL('/category-1?colour=green')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/diamond rings/i)
})

/** A stale value has a report to render, and the redirect would rewrite the query that carries it. */
/**
 * **The URL now canonicalises and the report survives it** — spec 011 moved where an unknown colour
 * is judged, and this assertion moved with it.
 *
 * `canonicalListing` refuses to rewrite a query carrying a value the catalogue rejected, because
 * rebuilding the query from the parsed state is how such a report gets lost. That applied to colour
 * while colour was a closed set the PARSER could reject. It is an owner-managed vocabulary now, so
 * `puce` survives parsing, travels through the redirect intact, and is reported by `getListing` on
 * the other side.
 *
 * The outcome is better than what this used to assert: the visitor lands on the canonical path AND
 * is still told what was ignored. What must never happen is the value disappearing silently, which
 * is what the second assertion guards.
 */
test('an unknown colour is still reported after the URL canonicalises', async ({ page }) => {
  await page.goto('/all-jewelry?category=category-1&colour=puce')

  await expect(page).toHaveURL('/category-1?colour=puce')
  await expect(page.getByRole('status').filter({ hasText: /^Ignored/ })).toContainText(/puce/i)
})

// ---------------------------------------------------------------------------------------------
// Sorting — US5 (003/T280, T281)
// ---------------------------------------------------------------------------------------------

const sortTrigger = (page: Page) => page.getByRole('button', { name: 'Sort by' })

test('the sort menu offers the drawn options and marks the current one', async ({ page }) => {
  await page.goto('/category-1?sort=price-asc')

  await sortTrigger(page).click()
  await expect(page.getByRole('menuitem')).toHaveText([
    'Recommended',
    'Price Ascending',
    'Price Descending',
    'Newest',
  ])

  // Marked by a tick with a name, not by a fill alone.
  const current = page.getByRole('menuitem', { name: /Price Ascending/ })
  await expect(current.getByRole('img', { name: 'Current ordering' })).toBeVisible()
})

test('choosing an ordering reorders the grid, records it, and returns focus', async ({ page }) => {
  await page.goto('/all-jewelry')

  const firstUnsorted = await page.locator('main article a').first().getAttribute('href')

  await sortTrigger(page).click()
  await page.getByRole('menuitem', { name: 'Price Descending' }).click()

  await expect(page).toHaveURL('/all-jewelry?sort=price-desc')
  await expect(sortTrigger(page)).toBeFocused()
  await expect(page.getByRole('menu')).toHaveCount(0)

  expect(await page.locator('main article a').first().getAttribute('href')).not.toBe(firstUnsorted)
  await expect(page.getByRole('link', { name: 'Remove Price Descending filter' })).toBeVisible()

  // It survives a reload, because it is in the address rather than in a component.
  await page.reload()
  await expect(page.getByRole('link', { name: 'Remove Price Descending filter' })).toBeVisible()
})

test('sorting and filtering hold together (FR-031)', async ({ page }) => {
  await page.goto('/category-1?colour=clear&sort=price-asc')

  const prices = await page.locator('main article').evaluateAll((cards) =>
    cards.map((card) => Number(card.textContent?.replace(/[^\d]/g, '').slice(0, 8) ?? 0)),
  )
  expect(prices.length).toBeGreaterThan(1)
  expect([...prices].sort((a, b) => a - b)).toEqual(prices)

  await expect(page.getByRole('link', { name: 'Remove Clear filter' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Remove Price Ascending filter' })).toBeVisible()
})

test('the sort menu is driveable from the keyboard, and Escape changes nothing', async ({
  page,
}) => {
  await page.goto('/category-1')

  await sortTrigger(page).focus()
  await page.keyboard.press('ArrowDown')
  await expect(page.getByRole('menuitem').first()).toBeFocused()

  await page.keyboard.press('ArrowDown')
  await expect(page.getByRole('menuitem').nth(1)).toBeFocused()

  await page.keyboard.press('Escape')
  await expect(page.getByRole('menu')).toHaveCount(0)
  await expect(sortTrigger(page)).toBeFocused()
  await expect(page).toHaveURL('/category-1')

  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL('/category-1?sort=price-asc')
})

/**
 * The listing card's name runs to full length below `xl` (`412:7765`), where the home row's card
 * keeps the single truncated line it was drawn with (`440:13594`). Two drawings, two behaviours,
 * one component — so this measures both, because a change to either would otherwise be silent.
 */
test('the listing sets names in full and the home row keeps its one line', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })

  await page.goto('/all-jewelry')
  const listed = page.locator('main article a').first()
  await expect(listed).toHaveCSS('font-size', '14px')
  await expect(listed).toHaveCSS('white-space', 'normal')

  // A long name is REALLY set in full, not clamped at two lines with an ellipsis.
  const tallest = await page
    .locator('main article a')
    .evaluateAll((names) => Math.max(...names.map((name) => name.getBoundingClientRect().height)))
  expect(tallest, 'no name runs past two lines — is something clamping them?').toBeGreaterThan(50)

  await page.goto('/')
  const featured = page.locator('article a').first()
  await expect(featured).toHaveCSS('font-size', '16px')
  await expect(featured).toHaveCSS('white-space', 'nowrap')
})

/** Names of different lengths, actions on one line. The row goes ragged without it. */
test('every card in a row puts its action on the same line', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 1100 })
  await page.goto('/all-jewelry')

  const tops = await page
    .locator('main article a[aria-hidden="true"]')
    .evaluateAll((actions) =>
      actions.slice(0, 2).map((action) => Math.round(action.getBoundingClientRect().top)),
    )

  expect(new Set(tops).size, 'the two cards in the first row disagree about where the action goes').toBe(1)
})

// ---------------------------------------------------------------------------------------------
// The filter bar's own shape (003/T271, nodes 225:1437 · 412:7738 · 412:7873)
// ---------------------------------------------------------------------------------------------

const filterBar = (page: Page) => page.locator('section[aria-label="Filter and sort"]')

/**
 * The regression this exists for: five fixed-width groups in one non-wrapping row.
 *
 * The drawn 1920 toolbar measures about 1570px of content and needs a viewport near 1800. Every
 * desktop narrower than that had the controls running out through the gutter, because nothing in
 * the row could shrink or fold. `scrollWidth` against `clientWidth` is the honest measure of it —
 * the page itself does not scroll sideways either way, because the overflow was inside a flex row.
 */
for (const width of [1280, 1440, 1600, 1920]) {
  test(`the toolbar folds rather than overflowing at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/category-1')

    const fits = await filterBar(page)
      .locator('> div')
      .first()
      .evaluate((row) => row.scrollWidth <= row.clientWidth + 1)

    expect(fits, `the controls run past the gutter at ${width}px`).toBe(true)
  })
}

/** Both narrow frames paint the bar white between two rules; the 1920 frame paints no fill at all. */
test('the filter bar is a white strip on a phone and bare on a desktop', async ({ page }) => {
  const paint = () =>
    filterBar(page).evaluate((element) => {
      const style = getComputedStyle(element)
      return {
        filled: style.backgroundColor !== 'rgba(0, 0, 0, 0)',
        top: style.borderTopWidth,
        bottom: style.borderBottomWidth,
      }
    })

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/category-1')
  expect(await paint()).toEqual({ filled: true, top: '1px', bottom: '1px' })

  await page.setViewportSize({ width: 1920, height: 900 })
  await page.goto('/category-1')
  expect(await paint()).toEqual({ filled: false, top: '0px', bottom: '1px' })
})

/**
 * Two things at once, because they are the same claim measured two ways.
 *
 * The narrow frames set the bar two steps below the desktop row — 12px against 16px — which is what
 * makes it read as a compact strip rather than a shrunken toolbar. And FILTERS and SORT BY are one
 * control: Figma draws them at different weights and different heights on the same phone, which the
 * owner has confirmed is a mistake in the file. Nothing about the two boxes may differ.
 */
for (const [name, width, size] of [
  ['a phone', 390, '12px'],
  ['a tablet', 1024, '12px'],
  ['a desktop', 1920, '16px'],
] as const) {
  test(`the two triggers are one control on ${name}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/category-1')

    const filters = filterBar(page).getByRole('link', { name: /^Filters/ })
    const sort = filterBar(page).getByRole('button', { name: 'Sort by' })

    // Retrying assertions, not a single `evaluate`. Hydration can swap the anchor between the
    // locator resolving and the callback running, and `getComputedStyle` on a node that has just
    // been detached answers with empty strings rather than failing — which reads as a wrong font
    // size once in every few full runs.
    for (const control of [filters, sort]) {
      await expect(control).toHaveCSS('font-size', size)
      await expect(control).toHaveCSS('font-weight', '500')
    }

    const box = async (control: typeof filters) => {
      const measured = await control.boundingBox()
      return `${Math.round(measured?.width ?? 0)}×${Math.round(measured?.height ?? 0)}`
    }
    expect(await box(sort), 'the two triggers are different boxes').toBe(await box(filters))
  })
}

/**
 * SC-008's third clause: the photographs below the fold do not compete with the ones above it.
 *
 * A listing is two dozen photographs on a route whose whole job is the first row, so eager loading
 * here is not a small waste — it is every card in the grid racing the one the visitor is looking at
 * for the same connection. `next/image` lazy-loads by default and `priority` opts out, so what this
 * guards is a `priority` added to the card by someone who meant it for a hero.
 */
test('every photograph below the fold waits its turn', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/all-jewelry')
  await page.waitForLoadState('networkidle')

  const eager = await page.evaluate(() => {
    const fold = window.innerHeight
    return Array.from(document.querySelectorAll('main img'))
      .filter((image) => image.getBoundingClientRect().top > fold)
      .filter((image) => image.getAttribute('loading') !== 'lazy')
      .map((image) => image.getAttribute('src')?.slice(0, 80) ?? '')
  })

  expect(eager, 'these load eagerly below the fold').toEqual([])
})
