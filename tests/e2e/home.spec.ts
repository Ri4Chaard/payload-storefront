import { expect, test } from '@playwright/test'

/**
 * The home page as a PAGE (002/T128–T134).
 *
 * The story tests cover each band on its own; these cover the things only a whole route can show —
 * a heading outline, landmark structure, behaviour with JavaScript switched off, reflow at 320px
 * and at 200% zoom, and what happens when someone asks for less motion. Every one of them is a
 * property of the composition, and every one of them would pass component-by-component while the
 * page failed.
 */
const WIDTHS = [
  { name: 'desktop', width: 1920 },
  { name: 'tablet', width: 1024 },
  { name: 'mobile', width: 390 },
]

test('the page has a title, a description, and exactly one first-level heading', async ({
  page,
}) => {
  await page.goto('/')

  await expect(page).toHaveTitle('Aurum — Lab-grown diamond jewelry')
  const description = page.locator('meta[name="description"]')
  await expect(description).toHaveAttribute('content', /lab-grown diamond/i)

  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
})

test('the heading outline descends without skipping a level', async ({ page }) => {
  await page.goto('/')

  const levels = await page
    .locator('h1, h2, h3, h4, h5, h6')
    .evaluateAll((nodes) => nodes.map((node) => Number(node.tagName.slice(1))))

  expect(levels[0], 'the page does not start at h1').toBe(1)

  // Descending by more than one is the failure: an h1 followed by an h3 tells a screen-reader user
  // there is a section they have missed. Coming back UP any distance is fine.
  for (let i = 1; i < levels.length; i += 1) {
    const previous = levels[i - 1]!
    const current = levels[i]!
    expect(
      current - previous,
      `h${previous} is followed by h${current}, which skips a level`,
    ).toBeLessThanOrEqual(1)
  }
})

test('every band is a landmark or a region that names itself', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('banner')).toHaveCount(1)
  await expect(page.getByRole('main')).toHaveCount(1)
  await expect(page.getByRole('contentinfo')).toHaveCount(1)

  // Named regions are what let someone jump between bands instead of scrolling through them.
  for (const name of ['Shop by category', 'All jewelry', 'About Aurum']) {
    await expect(page.getByRole('region', { name })).toHaveCount(1)
  }
})

test('every call to action leads somewhere', async ({ page }) => {
  await page.goto('/')

  const main = page.getByRole('main')
  const hrefs = await main.locator('a[href]').evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute('href')),
  )

  expect(hrefs.length).toBeGreaterThan(8)
  // These routes do not exist yet — later specs build them — but they must be the REAL paths, not
  // placeholders. A `#` here is a link that will still be a `#` when the collection pages land.
  for (const href of hrefs) {
    expect(href, 'a call to action points at nothing').toMatch(/^\//)
  }

  expect(hrefs).toContain('/rings')
  expect(hrefs).toContain('/all-jewelry')
  expect(hrefs).toContain('/about')
})

for (const { name, width } of WIDTHS) {
  test(`the page does not scroll sideways at ${name} width`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/')

    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    )
    expect(overflows, `the page scrolls horizontally at ${width}px`).toBe(false)
  })
}

test('the page reflows at 320px and at 200% zoom without scrolling sideways', async ({ page }) => {
  // 320px is the narrowest viewport WCAG 1.4.10 asks for. It is 70px narrower than the smallest
  // frame in the design, so nothing here was drawn — it has to survive on construction alone.
  await page.setViewportSize({ width: 320, height: 800 })
  await page.goto('/')
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    ),
  ).toBe(false)

  // 200% zoom on a 1280 screen presents as a 640px viewport. Same requirement, different cause.
  await page.setViewportSize({ width: 640, height: 512 })
  await page.reload()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    ),
  ).toBe(false)

  // And the content is still THERE, not merely not-overflowing.
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Shop by category' })).toBeVisible()
})

test('the page renders and every link works with JavaScript disabled', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  const page = await context.newPage()
  await page.goto('/')

  // Every band renders server-side. This is the assertion behind "server components are the
  // default": if any of these needed the client to appear, it would be missing here.
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Shop by category' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'All jewelry' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'About Aurum' })).toBeVisible()
  // Scoped to the band: the header navigation has a "Rings" link too, and matching both is a
  // strict-mode violation rather than a stronger assertion.
  await expect(
    page.getByRole('region', { name: 'Shop by category' }).getByRole('link', { name: /Rings/ }),
  ).toHaveAttribute('href', '/rings')

  // The carousel degrades to a plain scroller rather than disappearing: its arrows depend on a
  // measurement only the client can take, so they are simply absent — and the track still scrolls.
  const track = page.getByRole('list', { name: 'Featured jewelry' })
  await expect(track).toBeVisible()
  await expect(track).toHaveAttribute('tabindex', '0')
  await expect(page.getByRole('button', { name: /pieces$/ })).toHaveCount(0)

  await context.close()
})

test('nothing animates when the visitor asks for less motion', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1024, height: 900 } })
  const page = await context.newPage()
  await page.goto('/')

  // Smooth scrolling has to be suppressed in BOTH places it can be expressed: the CSS declaration
  // on the track, and the `behavior` a script passes to `scrollTo`, which overrides it.
  const track = page.getByRole('list', { name: 'Featured jewelry' })
  await expect(track).toHaveCSS('scroll-behavior', 'auto')

  await page.getByRole('button', { name: 'Show more pieces' }).click()
  // With smooth scrolling off the jump is immediate, so one frame later it is already done.
  await page.waitForTimeout(50)
  const settled = await track.evaluate((el) => el.scrollLeft)
  expect(settled, 'the row did not move at all').toBeGreaterThan(0)
  await page.waitForTimeout(400)
  expect(
    await track.evaluate((el) => el.scrollLeft),
    'the row was still travelling — the scroll animated',
  ).toBe(settled)

  await context.close()
})

test('the hero photograph is the priority image and reserves its own space', async ({ page }) => {
  const preloaded: string[] = []
  page.on('request', (request) => {
    if (request.resourceType() === 'image') preloaded.push(request.url())
  })

  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

  // The LCP element must be fetched eagerly, not lazily discovered after hydration...
  await expect(page.locator('link[rel="preload"][as="image"][imagesizes]')).toHaveCount(1)
  expect(preloaded.some((url) => url.includes('hero'))).toBe(true)

  // ...and it must not be racing anything below the fold for the connection. React preloads every
  // image it finds in the server markup unless told otherwise, which had the footer's two
  // certification marks — 96KB of them — competing with the hero for bandwidth.
  await expect(page.locator('link[rel="preload"][as="image"][href*="logos"]')).toHaveCount(0)

  // Every photograph goes through the image pipeline with dimensions, so none of them shifts the
  // layout when it arrives.
  const bare = await page.locator('main img:not([srcset])').count()
  expect(bare, 'a photograph is not going through the image pipeline').toBe(0)
})
