import { expect, test } from '@playwright/test'

/**
 * Every UI-kit story must actually RENDER — the same gate the Foundations stories get, for the same
 * reason: `storybook build` has already succeeded here once while every story was a blank spinner.
 *
 * Each entry asserts on text the story can only produce if the component mounted and its variant
 * classes resolved, so a story that renders an empty box still fails.
 */
const STORYBOOK = process.env.STORYBOOK_URL ?? 'http://localhost:6006'

const STORIES = [
  { name: 'Button/AllVariants', id: 'ui-button--all-variants', expect: /Text/ },
  { name: 'Button/Loading', id: 'ui-button--loading', expect: /Text/ },
  { name: 'Button/WithIcons', id: 'ui-button--with-icons', expect: /Text/ },
  { name: 'Checkbox/AllStates', id: 'ui-checkbox--all-states', expect: /Square, on/ },
  { name: 'Switch/AllStates', id: 'ui-switch--all-states', expect: /Disabled, off/ },
]

for (const story of STORIES) {
  test(`${story.name} renders`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text())
    })

    await page.goto(`${STORYBOOK}/iframe.html?id=${story.id}&viewMode=story`, {
      waitUntil: 'networkidle',
    })

    await expect(page.locator('body')).toContainText(story.expect)
    expect(errors, `console errors in ${story.name}: ${errors.join(' | ')}`).toEqual([])
  })
}

/**
 * The interaction the design does not draw: the switch knob has to actually move, and the checkbox
 * has to actually check. Both are driven by `peer-checked`, which is exactly the kind of CSS that
 * compiles fine and silently matches nothing.
 */
test('Switch toggles by pointer and by keyboard', async ({ page }) => {
  await page.goto(`${STORYBOOK}/iframe.html?id=ui-switch--off&viewMode=story`, {
    waitUntil: 'networkidle',
  })
  const control = page.getByRole('switch', { name: 'Label' })
  await expect(control).not.toBeChecked()

  // Clicking the input itself is not a real interaction — it is 1px and clipped, and the track sits
  // over it. A person clicks the label, which is what the <label> wrapper exists to forward.
  await page.getByText('Label').click()
  await expect(control).toBeChecked()

  // The keyboard path is the one that actually has to work: Space on a focused switch.
  await control.focus()
  await page.keyboard.press('Space')
  await expect(control).not.toBeChecked()
})

test('Checkbox toggles by clicking its label', async ({ page }) => {
  await page.goto(`${STORYBOOK}/iframe.html?id=ui-checkbox--square&viewMode=story`, {
    waitUntil: 'networkidle',
  })
  const control = page.getByRole('checkbox', { name: 'Label' })
  await expect(control).toBeChecked()
  await page.getByText('Label').click()
  await expect(control).not.toBeChecked()
})
