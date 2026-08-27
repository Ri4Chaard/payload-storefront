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
  'UI/Accordion',
  'UI/Breadcrumbs',
  'UI/Button',
  'UI/CategoryCard',
  'UI/Checkbox',
  'UI/Chip',
  'UI/FeatureCard',
  'UI/Field',
  'UI/Icon',
  'UI/IconButton',
  'UI/ImageCarousel',
  'UI/Link',
  'UI/Menu',
  'UI/MenuOption',
  'UI/NavLink',
  'UI/QuantityStepper',
  'UI/ScrollArea',
  'UI/SearchField',
  'UI/Switch',
  'UI/TextInput',
  'Commerce/CartItem',
  'Commerce/ProductCard',
  'Sections/AboutBand',
  'Sections/Hero',
  'Sections/SectionHeading',
  'Layout/ContactBanner',
  'Layout/Footer',
  'Layout/Header',
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
/**
 * Rules that describe a DOCUMENT, not a component. A story is a fragment rendered into a bare
 * iframe: it has no `<main>`, no page heading, and its `<title>` belongs to Storybook rather than to
 * anything under review. Asserting these here measures the harness.
 *
 * They are not being waived — `routes.spec.ts` runs the complete rule set over the real routes,
 * which is the only place they mean anything.
 *
 * Until spec 002 they all passed by accident, because Storybook's own shell happens to satisfy
 * them. `Hero` is what exposed that: `next/image` with `priority` calls `ReactDOM.preload`, React 19
 * takes ownership of the iframe's `<head>` to hoist the preload, and Storybook's `<title>` goes with
 * it. A green result that depended on the harness not being disturbed was never worth anything.
 */
const DOCUMENT_LEVEL_RULES = [
  'bypass',
  'document-title',
  'html-has-lang',
  'html-lang-valid',
  'landmark-one-main',
  'page-has-heading-one',
  'region',
]

async function analyze(page: Page) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      return await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .disableRules(DOCUMENT_LEVEL_RULES)
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

test('the component list covers every component with stories', async ({ request }) => {
  const titles = new Set(
    (await storyIndex(request))
      .filter((entry) => !entry.title.startsWith('Foundations/'))
      .map((entry) => entry.title),
  )

  expect(
    [...titles].sort(),
    'Storybook and the COMPONENTS list disagree — a component here has no accessibility coverage',
  ).toEqual([...COMPONENTS].sort())
})

for (const component of COMPONENTS) {
  test(`${component} has no accessibility violations`, async ({ page, request }) => {
    test.setTimeout(120_000)

    const ids = (await storyIndex(request))
      .filter((entry) => entry.title === component)
      .map((entry) => entry.id)

    expect(ids.length, `no stories found for ${component}`).toBeGreaterThan(0)

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

    expect(failures, `${failures.length} violation(s) in ${component}`).toEqual([])
  })
}

/**
 * The header and footer are each three layouts in one component, and the sweep above only ever sees
 * the widest one: a story opened by URL renders at the browser's width, whatever viewport global it
 * declares. These check the narrow layouts at the widths that actually trigger them.
 */
const NARROW_WIDTHS = {
  mobile: 390,
  tablet: 1024,
} as const

/**
 * `widths` is per story rather than global because not every component has three layouts. The
 * contact banner has two and a deliberate absence — below `md` it is `display: none`, so a mobile
 * run has nothing to audit and would only ever time out waiting for something that is not coming.
 */
const RESPONSIVE_STORIES: {
  title: string
  id: string
  widths: (keyof typeof NARROW_WIDTHS)[]
}[] = [
  { title: 'Layout/ContactBanner', id: 'layout-contactbanner--desktop', widths: ['tablet'] },
  {
    title: 'Layout/Header',
    id: 'layout-header--with-breadcrumbs',
    widths: ['mobile', 'tablet'],
  },
  { title: 'Layout/Footer', id: 'layout-footer--desktop', widths: ['mobile', 'tablet'] },
  { title: 'Sections/Hero', id: 'sections-hero--desktop', widths: ['mobile', 'tablet'] },
  { title: 'Sections/AboutBand', id: 'sections-aboutband--desktop', widths: ['mobile', 'tablet'] },
]

for (const story of RESPONSIVE_STORIES) {
  for (const name of story.widths) {
    const width = NARROW_WIDTHS[name]

    test(`${story.title} has no accessibility violations at ${name} width`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto(`${STORYBOOK}/iframe.html?id=${story.id}&viewMode=story`, {
        waitUntil: 'domcontentloaded',
      })
      await page.locator('#storybook-root > *').first().waitFor({ timeout: 15_000 })

      const results = await analyze(page)
      const failures = results.violations.map(
        (violation) =>
          `${violation.id} — ${violation.help} [${violation.nodes.map((node) => node.target.join(' ')).join(', ')}]`,
      )

      expect(failures, `${failures.length} violation(s) at ${name} width`).toEqual([])
    })
  }
}
