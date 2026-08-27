import { expect, test } from '@playwright/test'

/**
 * Every Foundations story must actually RENDER.
 *
 * This exists because `storybook build` succeeded while all four stories were broken in dev. The
 * cause was a JSON import attribute that esbuild downlevels to the removed `assert { type: 'json' }`
 * syntax — fatal in the browser, invisible to the Rollup production path. Storybook's failure mode
 * is an infinite spinner, not an error, so nothing surfaced it.
 *
 * A build that compiles is not a story that renders. This asserts the latter.
 */
const STORYBOOK = process.env.STORYBOOK_URL ?? 'http://localhost:6006'

const STORIES = [
  { name: 'Colour', id: 'foundations-colour--all-colours', expect: /--color-primary-default/ },
  { name: 'Typography', id: 'foundations-typography--type-scale', expect: /text-display/ },
  { name: 'Contrast', id: 'foundations-contrast--permitted-pairings', expect: /minimum 4\.5/ },
  { name: 'Scales', id: 'foundations-scales--spacing-and-shape', expect: /4px base/ },
]

for (const story of STORIES) {
  test(`Foundations/${story.name} renders`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text())
    })

    await page.goto(`${STORYBOOK}/iframe.html?id=${story.id}&viewMode=story`, {
      waitUntil: 'networkidle',
    })

    const body = page.locator('body')
    await expect(body).toContainText(story.expect)
    expect(errors, `console errors in ${story.name}: ${errors.join(' | ')}`).toEqual([])
  })
}
