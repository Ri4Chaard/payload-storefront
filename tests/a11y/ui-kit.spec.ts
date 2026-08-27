import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

/**
 * FR-044 (T068) — axe over every kit story in isolation, before anything composes it.
 *
 * Composed pages are covered by routes.spec.ts. This catches the failures that belong to the
 * component rather than the page: a variant whose text does not meet contrast on its own surface, a
 * control whose label is decorative rather than programmatic, a disabled state dimmed below the
 * threshold.
 *
 * Structured as one test per component rather than one sweep over everything. Axe costs a couple of
 * seconds a story, and fifty stories in a single test is both slow enough to hit a timeout and
 * useless when it fails — "the kit has a violation" does not say where.
 *
 * The component list is static so Playwright can parallelise it, and `covers every kit component`
 * below fails if the list and Storybook ever disagree. That is what stops a new component from
 * silently having no accessibility coverage, which is the failure mode a hand-maintained list
 * usually ends in.
 */
const STORYBOOK = process.env.STORYBOOK_URL ?? 'http://localhost:6006'

const COMPONENTS = [
  'Button',
  'Checkbox',
  'Chip',
  'Field',
  'Icon',
  'IconButton',
  'Link',
  'MenuOption',
  'NavLink',
  'ScrollArea',
  'Switch',
  'TextInput',
]

interface StoryIndex {
  entries: Record<string, { id: string; title: string; type: string }>
}

/**
 * Storybook's own a11y addon runs axe inside the preview iframe when a story renders, and axe-core
 * refuses to run twice at once. Whether we collide with it is a race against how quickly that story
 * settles, so the collision has to be waited out rather than treated as a failure — the alternative
 * is a suite that goes red at random on whichever component happens to be slowest that day.
 */
async function analyze(page: Page) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      return await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze()
    } catch (error) {
      if (!String(error).includes('Axe is already running')) throw error
      await page.waitForTimeout(500)
    }
  }
  throw new Error("axe never became free — the addon's own run never settled")
}

async function storyIndex(request: {
  get: (url: string) => Promise<{ json: () => Promise<StoryIndex> }>
}) {
  const response = await request.get(`${STORYBOOK}/index.json`)
  return Object.values((await response.json()).entries).filter((entry) => entry.type === 'story')
}

test('the component list covers every kit component', async ({ request }) => {
  const titles = new Set(
    (await storyIndex(request))
      .filter((entry) => entry.title.startsWith('UI/'))
      .map((entry) => entry.title.slice('UI/'.length)),
  )

  expect(
    [...titles].sort(),
    'Storybook and the COMPONENTS list disagree — a component here has no accessibility coverage',
  ).toEqual([...COMPONENTS].sort())
})

for (const component of COMPONENTS) {
  test(`UI/${component} has no accessibility violations`, async ({ page, request }) => {
    test.setTimeout(120_000)

    const ids = (await storyIndex(request))
      .filter((entry) => entry.title === `UI/${component}`)
      .map((entry) => entry.id)

    expect(ids.length, `no stories found for UI/${component}`).toBeGreaterThan(0)

    const failures: string[] = []

    for (const id of ids) {
      await page.goto(`${STORYBOOK}/iframe.html?id=${id}&viewMode=story`, {
        waitUntil: 'domcontentloaded',
      })
      await page.locator('#storybook-root > *').first().waitFor({ timeout: 15_000 })

      const results = await analyze(page)

      for (const violation of results.violations) {
        const where = violation.nodes.map((node) => node.target.join(' ')).join(', ')
        failures.push(`${id}: ${violation.id} — ${violation.help} [${where}]`)
      }
    }

    expect(failures, `${failures.length} violation(s) in UI/${component}`).toEqual([])
  })
}
