import { resolve } from 'node:path'

import config from '@payload-config'
import { expect, test } from '@playwright/test'
import { getPayload } from 'payload'

import { skipRevalidation } from '@/lib/revalidate'

/**
 * The story page, end to end.
 *
 * **Almost everything here is a consequence of the page being COMPOSED rather than fixed.** When
 * the bands were going to be seven named fields in a known order, most of these assertions were not
 * expressible: there was no reorder to survive, no second banner to add, no arrangement in which
 * the `h1` could go missing. The composition model is what created the failure modes, so it is what
 * these tests are about.
 *
 * The page's content is driven through the Local API rather than the admin UI. Dragging blocks in
 * a real browser would test Payload's drag-and-drop rather than this feature, and would be the
 * flakiest thing in the suite.
 */

/**
 * **Serial, and it has to be.** The suite runs `fullyParallel` across three workers, and every test
 * below rewrites the SAME record — `story-page` is a global, so there is exactly one of it and no
 * per-test fixture to isolate. Run in parallel, three workers compose three different pages into
 * one row and then each assert against whatever the last writer left; the first run of this file
 * failed five tests that way, none of which was a real defect.
 *
 * Serial mode keeps the file in one worker, in order. It is the cost of testing a singleton, and it
 * is cheaper than inventing a second story page that production would never have.
 */
test.describe.configure({ mode: 'serial' })

const payload = await getPayload({ config })

type Body = Parameters<typeof payload.updateGlobal>[0]['data']

const answer = (text: string) => ({
  root: {
    type: 'root',
    format: '' as const,
    indent: 0,
    version: 1,
    direction: 'ltr' as const,
    children: [
      {
        type: 'paragraph',
        format: '' as const,
        indent: 0,
        version: 1,
        direction: 'ltr' as const,
        children: [
          { type: 'text', detail: 0, format: 0, mode: 'normal', style: '', text, version: 1 },
        ],
      },
    ],
  },
})

const PAGE_HEADER = { blockType: 'page-header', eyebrow: 'OUR STORY', heading: 'OUR STORY, TOLD' }
const BANNER = {
  blockType: 'banner',
  heading: 'SELECTED FOR BRILLIANCE',
  body: 'Every product is carefully considered.',
  media: { kind: 'photo' },
  textSide: 'left',
}
const STEPS = {
  blockType: 'process-steps',
  heading: 'FROM IDEA TO PRODUCT',
  steps: [
    { title: 'SELECT', caption: 'Carefully chosen', media: { kind: 'photo' } },
    { title: 'CRAFT', caption: 'Every detail', media: { kind: 'photo' } },
  ],
}

async function compose(body: unknown[]) {
  await payload.updateGlobal({
    slug: 'story-page',
    data: { body, _status: 'published' } as Body,
    overrideAccess: true,
  })
}

let original: unknown
const questionIds: number[] = []

test.beforeAll(async () => {
  original = (await payload.findGlobal({ slug: 'story-page', overrideAccess: true, depth: 0 })).body
})

test.afterAll(async () => {
  await payload
    .updateGlobal({ slug: 'story-page', data: { body: original } as Body, overrideAccess: true })
    .catch(() => undefined)
  for (const id of questionIds) {
    await payload.delete({ collection: 'questions', id, overrideAccess: true }).catch(() => undefined)
  }
})

/** Every heading level on the page, in document order. */
async function outline(page: import('@playwright/test').Page): Promise<string[]> {
  return page.locator('main :is(h1,h2,h3,h4,h5,h6)').evaluateAll((nodes) =>
    nodes.map((node) => node.tagName.toLowerCase()),
  )
}

test.describe('the page a visitor reads', () => {
  test('is reachable from all three links that already pointed at it', async ({ page }) => {
    await compose([PAGE_HEADER, BANNER])

    // The header's primary navigation.
    await page.goto('/')
    await page.getByRole('navigation').getByRole('link', { name: /about us/i }).first().click()
    await expect(page).toHaveURL(/\/about$/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('OUR STORY, TOLD')

    // The footer, which calls the same page "Our Story".
    await page.goto('/')
    await page.getByRole('contentinfo').getByRole('link', { name: /our story/i }).first().click()
    await expect(page).toHaveURL(/\/about$/)
  })

  test('renders every band the editor composed, in their order', async ({ page }) => {
    await compose([PAGE_HEADER, BANNER, STEPS])
    await page.goto('/about')

    const headings = page.locator('main :is(h1,h2)')
    await expect(headings).toHaveText([
      'OUR STORY, TOLD',
      'SELECTED FOR BRILLIANCE',
      'FROM IDEA TO PRODUCT',
    ])
  })

  test('shows the detail band’s picture whole rather than cropping it', async ({ page }) => {
    // A real upload, because the assertion is about how an image is fitted — an empty slot is
    // dropped by the mapper and there would be nothing to measure.
    const { docs } = await payload.find({
      collection: 'media',
      where: { mimeType: { contains: 'image' } },
      limit: 1,
      overrideAccess: true,
    })
    const photo = docs[0]?.id
    expect(photo, 'the seed must have run — this test needs one image in the library').toBeTruthy()

    await compose([
      PAGE_HEADER,
      {
        blockType: 'closer-look',
        body: 'Exceptional products begin with exceptional standards.',
        chips: [{ label: 'Feature 1' }],
        figures: [{ word: 'CERTIFIED', caption: 'selected materials' }],
        media: { kind: 'photo', photo },
      },
    ])
    await page.goto('/about')

    // The one slot on the page whose media is a subject rather than a backdrop: covering it crops
    // the edges off the product.
    const fit = await page
      .locator('main img')
      .last()
      .evaluate((el) => getComputedStyle(el).objectFit)
    expect(fit).toBe('contain')
  })

  test('numbers the steps by position rather than by a stored field', async ({ page }) => {
    await compose([PAGE_HEADER, STEPS])
    await page.goto('/about')

    await expect(page.getByText('01', { exact: true })).toBeVisible()
    await expect(page.getByText('02', { exact: true })).toBeVisible()
    // Two steps were composed, so there is no third ordinal to find.
    await expect(page.getByText('03', { exact: true })).toHaveCount(0)
  })
})

test.describe('the page an owner composes', () => {
  test('follows a reorder with no code change', async ({ page }) => {
    await compose([PAGE_HEADER, BANNER, STEPS])
    await page.goto('/about')
    await expect(page.locator('main :is(h1,h2)')).toHaveText([
      'OUR STORY, TOLD',
      'SELECTED FOR BRILLIANCE',
      'FROM IDEA TO PRODUCT',
    ])

    await compose([PAGE_HEADER, STEPS, BANNER])
    await page.goto('/about')
    await expect(page.locator('main :is(h1,h2)')).toHaveText([
      'OUR STORY, TOLD',
      'FROM IDEA TO PRODUCT',
      'SELECTED FOR BRILLIANCE',
    ])
  })

  test('renders a second banner as a banner, not as a new kind of band', async ({ page }) => {
    await compose([
      PAGE_HEADER,
      BANNER,
      { ...BANNER, heading: 'CRAFTED TO LAST', textSide: 'right' },
    ])
    await page.goto('/about')

    await expect(page.locator('main h2')).toHaveText([
      'SELECTED FOR BRILLIANCE',
      'CRAFTED TO LAST',
    ])
  })

  test('omits a band the editor added but never filled', async ({ page }) => {
    await compose([PAGE_HEADER, { blockType: 'media-plate', media: { kind: 'photo' } }, BANNER])
    await page.goto('/about')

    // The plate has no photograph, so it collapses rather than reserving 530px of nothing.
    await expect(page.locator('main img')).toHaveCount(0)
    await expect(page.locator('main :is(h1,h2)')).toHaveText([
      'OUR STORY, TOLD',
      'SELECTED FOR BRILLIANCE',
    ])
  })

  test('cannot be emptied — deleting every band restores the drawn page', async ({ page }) => {
    /*
      Payload treats an empty blocks array as no value and re-applies the field's `defaultValue`, so
      an editor who deletes every band gets the drawn seven back. Documented on the global as a
      deliberate trade: `/about` is linked from three places, and a page that cannot go blank is
      worth more than the ability to blank it.

      The genuinely-empty rendering path (a global never saved) is covered in
      `tests/unit/story-mappers.test.ts`, where it can be reached.
    */
    await compose([])
    const response = await page.goto('/about')

    expect(response?.status()).toBe(200)
    await expect(page.getByRole('contentinfo')).toBeVisible()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/A HEADLINE ABOUT YOUR STORE/)
  })
})

test.describe('the heading outline survives any arrangement', () => {
  test('keeps one h1 when a banner is dragged above the page header', async ({ page }) => {
    await compose([BANNER, PAGE_HEADER, STEPS])
    await page.goto('/about')

    const levels = await outline(page)
    expect(levels.filter((level) => level === 'h1')).toHaveLength(1)
    // The page header still owns it wherever it sits — it is the page's title.
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('OUR STORY, TOLD')
  })

  test('promotes the first band when the page header is deleted', async ({ page }) => {
    await compose([BANNER, STEPS])
    await page.goto('/about')

    const levels = await outline(page)
    expect(levels.filter((level) => level === 'h1')).toHaveLength(1)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('SELECTED FOR BRILLIANCE')
  })

  test('emits one h1, not two, when the editor adds a second page header', async ({ page }) => {
    await compose([PAGE_HEADER, { ...PAGE_HEADER, heading: 'A SECOND TITLE' }, BANNER])
    await page.goto('/about')

    const levels = await outline(page)
    expect(levels.filter((level) => level === 'h1')).toHaveLength(1)
  })

  test('never skips a level', async ({ page }) => {
    await compose([PAGE_HEADER, STEPS, BANNER])
    await page.goto('/about')

    const levels = (await outline(page)).map((tag) => Number(tag.slice(1)))
    for (let i = 1; i < levels.length; i += 1) {
      const step = (levels[i] ?? 0) - (levels[i - 1] ?? 0)
      expect(step).toBeLessThanOrEqual(1)
    }
  })
})

test.describe('the questions band', () => {
  async function question(text: string, body: string, status: 'draft' | 'published' = 'published') {
    const doc = await payload.create({
      collection: 'questions',
      data: { question: text, answer: answer(body), _status: status },
      overrideAccess: true,
    })
    questionIds.push(doc.id)
    return doc.id
  }

  /**
   * Take a published question back off the page.
   *
   * **No `draft: true` here, and that distinction cost a failing test to find.** `draft: true` saves
   * a NEW draft version and leaves the published one live — which is what "Save draft" does in the
   * admin, and is right when editing. Unpublishing is a change to the document's own status, so it
   * is a plain update. With the flag, the question stayed on the page and the test read as an
   * access-control failure.
   */
  async function unpublish(id: number) {
    await payload.update({
      collection: 'questions',
      id,
      data: { _status: 'draft' },
      overrideAccess: true,
    })
  }

  const band = (questions: number[]) => ({
    blockType: 'faq',
    heading: 'EVERY DETAIL, ANSWERED',
    body: 'We are here to help.',
    questions,
  })

  test('shows the chosen questions in the chosen order, and opens more than one at a time', async ({
    page,
  }) => {
    const first = await question('Do you ship internationally?', 'Yes, worldwide.')
    const second = await question('How long will my order take?', 'Five to seven days.')

    await compose([PAGE_HEADER, band([second, first])])
    await page.goto('/about')

    await expect(page.locator('main h3')).toHaveText([
      'How long will my order take?',
      'Do you ship internationally?',
    ])

    // FR-035: opening one must not close another.
    const buttons = page.locator('main h3 button')
    await buttons.nth(0).click()
    await buttons.nth(1).click()
    await expect(buttons.nth(0)).toHaveAttribute('aria-expanded', 'true')
    await expect(buttons.nth(1)).toHaveAttribute('aria-expanded', 'true')
  })

  test('carries no leading glyph, and its rows do not jump when they collapse', async ({ page }) => {
    const id = await question('Does this row jump?', 'It must not.')
    await compose([PAGE_HEADER, band([id])])
    await page.goto('/about')

    const header = page.locator('main h3 button').first()

    /*
      One icon, the trailing plus/minus. `Accordion` defaults to a leading dash it was drawn with on
      the product page; the questions band drops it with `icon={null}`.
    */
    await expect(header.locator('svg')).toHaveCount(1)

    /*
      The row is 10px shorter below its header when open, and that 10px used to be applied in a
      single frame while the panel animated — so every toggle began with the copy below jerking and
      then sliding the rest of the way. Asserting the transition rather than sampling mid-animation:
      the property list is the thing that regressed, and it is stable to check.
    */
    const transition = await header.evaluate((el) => {
      const style = getComputedStyle(el)
      const index = style.transitionProperty.split(', ').indexOf('padding-block-end')
      return { index, duration: style.transitionDuration.split(', ')[index] ?? null }
    })

    /*
      Asserted on the declaration rather than by sampling mid-animation. A first version read the
      padding 40ms into the collapse and expected a value between the two ends — which is the more
      direct evidence and is a race: under three parallel workers the sample can land after the
      transition has already finished, and the test fails without anything being wrong. The
      property being present with a non-zero duration is the thing that actually regressed.
    */
    expect(transition.index).toBeGreaterThanOrEqual(0)
    expect(transition.duration).not.toBe('0s')
  })

  test('shows a question picked twice only once', async ({ page }) => {
    const id = await question('Are your products certified?', 'Every one of them.')

    await compose([PAGE_HEADER, band([id, id])])
    await page.goto('/about')

    await expect(page.locator('main h3')).toHaveCount(1)
  })

  test('drops an unpublished question with no edit to the page', async ({ page }) => {
    const kept = await question('Do you offer resizing?', 'Yes, once free of charge.')
    const pulled = await question('Is this one going away?', 'It is.')

    await compose([PAGE_HEADER, band([kept, pulled])])
    await page.goto('/about')
    await expect(page.locator('main h3')).toHaveCount(2)

    // Only the question changes. The story page is not touched.
    await unpublish(pulled)

    await page.goto('/about')
    await expect(page.locator('main h3')).toHaveText(['Do you offer resizing?'])
  })

  test('removes the whole band when nothing it would show is published', async ({ page }) => {
    const only = await question('Will this band survive?', 'It will not.')

    await compose([PAGE_HEADER, band([only])])
    await page.goto('/about')
    await expect(page.getByRole('heading', { name: 'EVERY DETAIL, ANSWERED' })).toBeVisible()

    await unpublish(only)

    await page.goto('/about')
    // A heading over nothing is worse than one band fewer.
    await expect(page.getByRole('heading', { name: 'EVERY DETAIL, ANSWERED' })).toHaveCount(0)
  })
})

test.describe('how the page presents itself', () => {
  test('falls back to what the page says when the editor sets no metadata', async ({ page }) => {
    await compose([PAGE_HEADER, BANNER])
    await page.goto('/about')

    // The title comes from whichever band owns the h1, so it follows a reorder rather than naming
    // a band that may have moved.
    await expect(page).toHaveTitle(/OUR STORY, TOLD/)
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/about$/)
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      'content',
      'OUR STORY, TOLD',
    )
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      'content',
      /Every product is carefully considered/,
    )
  })

  test('prefers what the editor set over the fallbacks', async ({ page }) => {
    await payload.updateGlobal({
      slug: 'story-page',
      data: {
        body: [PAGE_HEADER, BANNER],
        seo: { title: 'The Aurum Story', description: 'How we make what we make.' },
        _status: 'published',
      } as Body,
      overrideAccess: true,
    })

    await page.goto('/about')
    await expect(page).toHaveTitle(/The Aurum Story/)
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      'content',
      'How we make what we make.',
    )

    await payload.updateGlobal({
      slug: 'story-page',
      data: { seo: { title: null, description: null } } as Body,
      overrideAccess: true,
    })
  })
})

test.describe('a video where a photograph was drawn', () => {
  const FIXTURES = resolve(import.meta.dirname, '../fixtures')
  const uploaded: number[] = []

  /** Upload once, reuse across the tests below — and prove FR-021a on the way. */
  let videoId: number
  let posterId: number

  test.beforeAll(async () => {
    /*
      `skipRevalidation`, for the reason `src/lib/revalidate.ts` documents: a media write fires
      `revalidateOnChange`, which imports `next/cache`, and this process is Playwright rather than a
      Next server — there is no static generation store for it to reach. The seed script passes the
      same context for the same reason.
    */
    const video = await payload.create({
      collection: 'media',
      data: { alt: 'A slow pan across a product' },
      filePath: resolve(FIXTURES, 'slot.mp4'),
      context: skipRevalidation,
      overrideAccess: true,
    })
    const poster = await payload.create({
      collection: 'media',
      data: { alt: 'A product on a plain backdrop' },
      filePath: resolve(FIXTURES, 'poster.png'),
      context: skipRevalidation,
      overrideAccess: true,
    })
    videoId = video.id
    posterId = poster.id
    uploaded.push(video.id, poster.id)
  })

  test.afterAll(async () => {
    for (const id of uploaded) {
      await payload
        .delete({ collection: 'media', id, context: skipRevalidation, overrideAccess: true })
        .catch(() => undefined)
    }
  })

  const withVideo = () => ({
    blockType: 'media-plate',
    media: { kind: 'video', video: videoId, poster: posterId },
  })

  test('a video document stores no image sizes, and the page copes', async () => {
    const doc = await payload.findByID({ collection: 'media', id: videoId, overrideAccess: true })

    // Payload gates resizing on mimetype, so a video has no `sizes`. Anything reaching for
    // `sizes.md.url` would break here — which is why exactly one place branches on this.
    expect(doc.mimeType).toBe('video/mp4')
    expect(doc.sizes?.md?.url ?? null).toBeNull()
  })

  test('renders the poster, and does not fetch the video until its band is in view', async ({
    page,
  }) => {
    await compose([
      PAGE_HEADER,
      BANNER,
      STEPS,
      { ...BANNER, heading: 'A LONG WAY DOWN' },
      withVideo(),
    ])

    const requested: string[] = []
    page.on('request', (request) => {
      if (/\.mp4/.test(request.url())) requested.push(request.url())
    })

    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto('/about')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    // FR-024a: the plate is the last band, well below the fold.
    expect(requested).toHaveLength(0)

    await page.locator('video, img').last().scrollIntoViewIfNeeded()
    await expect.poll(() => requested.length, { timeout: 10_000 }).toBeGreaterThan(0)
  })

  test('never fetches the video, and never plays it, under reduced motion', async ({
    browser,
  }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' })
    const page = await context.newPage()

    const requested: string[] = []
    page.on('request', (request) => {
      if (/\.mp4/.test(request.url())) requested.push(request.url())
    })

    await compose([PAGE_HEADER, withVideo()])
    await page.goto('/about')
    await page.locator('img').last().scrollIntoViewIfNeeded()
    await page.waitForTimeout(1500)

    // The poster is not a fallback here — it is the whole rendering, permanently, for this visitor.
    await expect(page.locator('main video')).toHaveCount(0)
    expect(requested).toHaveLength(0)

    await context.close()
  })

  test('never shows player chrome, in a step tile or anywhere else', async ({ page }) => {
    /*
      A step tile is where controls looked worst — a scrub bar and a play button across a
      photograph of a workbench — but the rule is not about that band. Every slot on this
      page is imagery, so no video in any of them is something a visitor operates.
    */
    await compose([
      PAGE_HEADER,
      withVideo(),
      {
        blockType: 'process-steps',
        heading: 'FROM IDEA TO PRODUCT',
        steps: [
          { title: 'SELECT', caption: 'Carefully chosen', media: { kind: 'video', video: videoId, poster: posterId } },
        ],
      },
    ])

    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto('/about')

    const videos = page.locator('main video')
    await expect(videos.first()).toBeAttached({ timeout: 15_000 })

    const withControls = await videos.evaluateAll((els) =>
      els.filter((el) => (el as HTMLVideoElement).controls).length,
    )
    expect(withControls, 'no slot may render native player controls').toBe(0)

    // And it is still a muted, looping, inline clip — a moving photograph.
    const flags = await videos.first().evaluate((el) => {
      const v = el as HTMLVideoElement
      return { muted: v.muted, loop: v.loop, inline: v.playsInline }
    })
    expect(flags).toEqual({ muted: true, loop: true, inline: true })
  })

  test('keeps the band the same size whether it holds a photograph or a video', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })

    await compose([PAGE_HEADER, { blockType: 'media-plate', media: { kind: 'photo', photo: posterId } }])
    await page.goto('/about')
    const asPhoto = await page.locator('main img').last().boundingBox()

    await compose([PAGE_HEADER, withVideo()])
    await page.goto('/about')
    const asVideo = await page.locator('main img').last().boundingBox()

    // A band changes what fills it, never how big it is.
    expect(asVideo?.width).toBe(asPhoto?.width)
    expect(asVideo?.height).toBe(asPhoto?.height)
  })
})
