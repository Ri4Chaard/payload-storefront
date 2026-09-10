import config from '@payload-config'
import { expect, test } from '@playwright/test'
import { getPayload } from 'payload'

/**
 * The story page, end to end (006/T038, T041, T042, T052, T059).
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
  body: 'Every diamond is carefully considered.',
  media: { kind: 'photo' },
  textSide: 'left',
}
const STEPS = {
  blockType: 'process-steps',
  heading: 'FROM DIAMOND TO JEWEL',
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

test.describe('the page a visitor reads (US1)', () => {
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
      'FROM DIAMOND TO JEWEL',
    ])
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

test.describe('the page an owner composes (US2)', () => {
  test('follows a reorder with no code change', async ({ page }) => {
    await compose([PAGE_HEADER, BANNER, STEPS])
    await page.goto('/about')
    await expect(page.locator('main :is(h1,h2)')).toHaveText([
      'OUR STORY, TOLD',
      'SELECTED FOR BRILLIANCE',
      'FROM DIAMOND TO JEWEL',
    ])

    await compose([PAGE_HEADER, STEPS, BANNER])
    await page.goto('/about')
    await expect(page.locator('main :is(h1,h2)')).toHaveText([
      'OUR STORY, TOLD',
      'FROM DIAMOND TO JEWEL',
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
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/IMMORTALIZING/)
  })
})

test.describe('the heading outline survives any arrangement (FR-051)', () => {
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

test.describe('the questions band (US4)', () => {
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

  test('shows a question picked twice only once', async ({ page }) => {
    const id = await question('Are your diamonds certified?', 'Every one of them.')

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
