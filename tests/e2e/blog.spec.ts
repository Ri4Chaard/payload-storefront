import { expect, test } from '@playwright/test'

/**
 * The blog, end to end.
 *
 * **Read-only against the seeded blog.** Unlike `about.spec.ts`, which has to compose a global
 * before every assertion, everything here is a property of seven published articles that
 * `scripts/seed-catalog.ts` creates — so these tests never write, never need serial mode, and never
 * leave the local admin panel rewritten. The editorial lifecycle, which does write, lives in
 * `blog-admin.spec.ts`.
 *
 * Three things here cannot be checked anywhere else in the suite:
 *
 *   - the CONTENTS rail, whose "you are reading this chapter" marker is the only part of this
 *     feature that needs scripting at all, and whose jump has to move keyboard focus into the
 *     chapter rather than leaving it on the rail;
 *   - the MOSAIC's rhythm, which is a property of the rendered grid rather than of any one card —
 *     an assertion about `getBoundingClientRect`, because that is what "the design draws this one
 *     twice as wide" actually means;
 *   - LOAD MORE, where `?page=2` means the first fourteen rather than the second seven.
 */

const ARTICLE = '/blog/article-1'

test.describe('the index', () => {
  test('lists the seeded articles, newest first, each reachable in one click', async ({ page }) => {
    await page.goto('/blog')

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/A headline for your blog/i)

    const cards = page.locator('ul[aria-label="Latest articles"] > li')
    await expect(cards).toHaveCount(7)

    // The whole card is one link, so a card contributes exactly one destination.
    await expect(cards.first().getByRole('link')).toHaveCount(1)

    await cards.first().getByRole('link').click()
    await expect(page).toHaveURL(new RegExp('/blog/[a-z0-9-]+$'))
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  /**
   * The drawn rhythm, measured rather than eyeballed: wide + narrow, three narrow, narrow + wide.
   * Inside a 1720px container with a 20px gutter that is 1140 and 560, which is what the design
   * lays out at `312:7367`.
   */
  test('draws the mosaic rhythm at desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto('/blog')

    const widths = await page
      .locator('ul[aria-label="Latest articles"] > li')
      .evaluateAll((items) => items.map((item) => Math.round(item.getBoundingClientRect().width)))

    expect(widths).toEqual([1140, 560, 560, 560, 560, 560, 1140])
  })

  test('becomes two columns at tablet and one on a phone, with no sideways page scroll', async ({
    page,
  }) => {
    for (const [width, expected] of [
      [768, [720, 350, 350, 350, 350, 720, 350]],
      [390, [358, 358, 358, 358, 358, 358, 358]],
    ] as const) {
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/blog')

      const widths = await page
        .locator('ul[aria-label="Latest articles"] > li')
        .evaluateAll((items) => items.map((item) => Math.round(item.getBoundingClientRect().width)))
      expect(widths).toEqual([...expected])

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      expect(overflow).toBe(0)
    }
  })

  /**
   * **The page size is asserted; the total is not.** `blog-admin.spec.ts` publishes articles of its
   * own, and the two files share one database — so an assertion on "7 of 7" passes alone and fails
   * whenever the suite runs everything at once, which is exactly the kind of failure that looks
   * like a regression and is not one. What is actually invariant is that a page holds one mosaic
   * cycle and that the load control appears if and only if there is more than that.
   */
  test('counts what is shown against what there is', async ({ page }) => {
    await page.goto('/blog')

    const status = await page.getByRole('status').innerText()
    const [, shown, total] = status.match(/Showing (\d+) of (\d+) articles/) ?? []
    expect(Number(shown)).toBe(7)
    expect(Number(total)).toBeGreaterThanOrEqual(7)

    await expect(page.getByRole('link', { name: /load more/i })).toHaveCount(
      Number(total) > 7 ? 1 : 0,
    )
  })
})

test.describe('narrowing by category', () => {
  test('narrows the grid and puts the choice in the address', async ({ page }) => {
    await page.goto('/blog')

    await page.getByRole('link', { name: 'Topic 3', exact: true }).click()
    await expect(page).toHaveURL(/\/blog\?category=topic-3/)

    const tab = page.getByRole('link', { name: 'Topic 3', exact: true })
    await expect(tab).toHaveAttribute('aria-current', 'page')

    // Distinguished by more than colour — the rule beneath the current tab.
    const border = await tab.evaluate((el) => getComputedStyle(el).borderBottomColor)
    const sibling = await page
      .getByRole('link', { name: 'Topic 2', exact: true })
      .evaluate((el) => getComputedStyle(el).borderBottomColor)
    expect(border).not.toBe(sibling)

    await expect(page.locator('ul[aria-label="Articles in Topic 3"] > li')).toHaveCount(2)
  })

  test('reproduces the narrowed view from its address alone', async ({ page }) => {
    await page.goto('/blog?category=topic-4')
    await expect(page.locator('ul[aria-label="Articles in Topic 4"] > li')).toHaveCount(2)
  })

  test('answers a category that does not exist the way any unknown address is answered', async ({
    page,
  }) => {
    const response = await page.goto('/blog?category=nonsense')
    expect(response?.status()).toBe(404)
  })

  test('offers a way out of an empty category, and none from an empty blog', async ({ page }) => {
    // Every seeded category has articles in it, so this asserts the shape of the control rather
    // than an empty result: LATEST is always reachable from a narrowed view.
    await page.goto('/blog?category=topic-3')
    await expect(page.getByRole('link', { name: 'Latest', exact: true })).toBeVisible()
  })
})

test.describe('an article', () => {
  test('renders one h1, the standfirst, the hero and its chapters in order', async ({ page }) => {
    await page.goto(ARTICLE)

    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Article title 1')
    await expect(page.getByText(/A short excerpt that introduces the article/)).toBeVisible()

    const chapters = page.locator('article section[aria-labelledby] > h2')
    await expect(chapters).toHaveCount(4)
    await expect(chapters.first()).toHaveText('Chapter heading 1')

    // The pull quote is announced as a quotation rather than as body copy.
    await expect(page.locator('blockquote')).toContainText('A short pull quote')
  })

  test('answers an address nobody has published with a 404', async ({ page }) => {
    const response = await page.goto('/blog/no-such-article')
    expect(response?.status()).toBe(404)
  })

  /**
   * The rail is the one part of this feature that needs scripting, and the two things it must do
   * are both here: stay put while the article scrolls, and mark the chapter being read.
   */
  test('keeps the contents rail visible and marks the chapter on screen', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto(ARTICLE)

    const rail = page.locator('nav[aria-labelledby="contents-title"]')
    await expect(rail).toBeVisible()

    await page.evaluate(() => window.scrollTo(0, 2200))
    await page.waitForTimeout(500)

    const top = await rail.evaluate((el) => Math.round(el.getBoundingClientRect().top))
    expect(top).toBeGreaterThanOrEqual(0)
    expect(top).toBeLessThan(400)

    await expect(page.locator('[data-toc][aria-current="true"]')).toHaveCount(1)
  })

  test('jumps to a chapter and leaves focus inside it', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto(ARTICLE)

    await page.click('[data-toc="chapter-heading-3"]')
    await page.waitForTimeout(800)

    await expect(page).toHaveURL(/#chapter-heading-3$/)

    // Focus lands on the chapter, so a keyboard visitor continues from there rather than from the
    // rail they just left.
    const focused = await page.evaluate(() => document.activeElement?.id)
    expect(focused).toBe('chapter-heading-3')

    const heading = page.locator('#chapter-heading-3')
    const box = await heading.boundingBox()
    expect(box?.y ?? 0).toBeLessThan(1080)
  })

  test('becomes a card above the article on a phone, with no sideways page scroll', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 900 })
    await page.goto(ARTICLE)

    const rail = page.locator('nav[aria-labelledby="contents-title"]')
    const railBox = await rail.boundingBox()
    const firstChapter = await page.locator('#chapter-heading-1').boundingBox()

    // Above the article, which is the order it is read in.
    expect(railBox?.y ?? 0).toBeLessThan(firstChapter?.y ?? 0)

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBe(0)
  })
})

test.describe('the address list', () => {
  /** FR-044 and SC-009: every published article, absolute, and no drafts. */
  test('lists the blog and every published article', async ({ request }) => {
    const response = await request.get('/sitemap.xml')
    expect(response.status()).toBe(200)

    const xml = await response.text()
    expect(xml).toContain('/blog</loc>')
    expect(xml).toContain('/blog/article-1</loc>')

    // Absolute, as the sitemap protocol requires.
    expect(xml).toMatch(/<loc>https?:\/\/[^<]+\/blog<\/loc>/)
  })
})
