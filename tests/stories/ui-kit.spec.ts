import { expect, test } from '@playwright/test'

/**
 * Every UI-kit story must actually RENDER — the same gate the Foundations stories get, for the same
 * reason: `storybook build` has already succeeded here once while every story was a blank spinner.
 *
 * The list is read from Storybook's own index rather than hand-maintained. A hardcoded list only
 * covers the stories someone remembered to add to it, which means the gate quietly stops covering
 * the newest component — exactly the one most likely to be broken.
 */
const STORYBOOK = process.env.STORYBOOK_URL ?? 'http://localhost:6006'

interface StoryIndex {
  entries: Record<string, { id: string; title: string; name: string; type: string }>
}

async function kitStoryIds(request: {
  get: (url: string) => Promise<{ json: () => Promise<StoryIndex> }>
}) {
  const response = await request.get(`${STORYBOOK}/index.json`)
  const index = await response.json()
  return Object.values(index.entries)
    .filter((entry) => entry.type === 'story' && !entry.title.startsWith('Foundations/'))
    .map((entry) => entry.id)
    .sort()
}

test('every UI-kit story renders without console errors', async ({ page, request }) => {
  // One test walking the whole index needs a budget matched to the index, not to a single page.
  test.setTimeout(180_000)

  const ids = await kitStoryIds(request)
  expect(ids.length, 'Storybook reported no component stories at all').toBeGreaterThan(20)

  const broken: string[] = []

  for (const id of ids) {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text())
    })

    await page.goto(`${STORYBOOK}/iframe.html?id=${id}&viewMode=story`, { waitUntil: 'load' })

    // #storybook-root stays empty when a story throws during render — the failure mode the infinite
    // spinner hid. Waiting for a child catches it where a status code never would, and is far
    // cheaper than networkidle across fifty stories.
    try {
      await page.locator('#storybook-root > *').first().waitFor({ timeout: 5_000 })
    } catch {
      broken.push(`${id}: rendered nothing`)
    }
    if (errors.length > 0) broken.push(`${id}: ${errors.join(' | ')}`)

    page.removeAllListeners('pageerror')
    page.removeAllListeners('console')
  }

  expect(broken, `${broken.length} of ${ids.length} stories are broken`).toEqual([])
})

/**
 * The interactions the design does not draw. Both are driven by `peer-checked`, which is exactly
 * the kind of CSS that compiles fine and silently matches nothing.
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

test('Chip reports its selected state to assistive tech', async ({ page }) => {
  await page.goto(`${STORYBOOK}/iframe.html?id=ui-chip--all-states&viewMode=story`, {
    waitUntil: 'networkidle',
  })
  await expect(page.getByRole('button', { name: 'selected', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(page.getByRole('button', { name: 'unselected' })).toHaveAttribute(
    'aria-pressed',
    'false',
  )
})

test('TextInput wires its error message to the control', async ({ page }) => {
  await page.goto(`${STORYBOOK}/iframe.html?id=ui-textinput--with-error&viewMode=story`, {
    waitUntil: 'networkidle',
  })
  const input = page.getByRole('textbox', { name: 'Email' })
  await expect(input).toHaveAttribute('aria-invalid', 'true')

  // The message must be REACHABLE from the input, not merely present on the page.
  const describedBy = await input.getAttribute('aria-describedby')
  expect(describedBy, 'error message is not wired via aria-describedby').toBeTruthy()
  await expect(page.locator(`#${describedBy}`)).toContainText('Enter an email address')
})

test('IconButton exposes an accessible name', async ({ page }) => {
  await page.goto(`${STORYBOOK}/iframe.html?id=ui-iconbutton--filled&viewMode=story`, {
    waitUntil: 'networkidle',
  })
  await expect(page.getByRole('button', { name: 'Add' })).toBeVisible()
})

/**
 * The header's behaviour is the part the design does not draw: every variant shows a closed state.
 * These cover what a keyboard user actually has to be able to do.
 */
test('mobile navigation opens, closes on Escape, and returns focus', async ({ page }) => {
  // The viewport is set here rather than left to Storybook's viewport global, which only applies
  // inside the manager UI — a story opened by URL renders at the browser's width regardless. Left
  // implicit, this test would silently check the DESKTOP header and pass for the wrong reason.
  await page.setViewportSize({ width: 390, height: 800 })
  await page.goto(`${STORYBOOK}/iframe.html?id=layout-header--mobile&viewMode=story`, {
    waitUntil: 'load',
  })

  const trigger = page.getByRole('button', { name: 'Open menu' })
  await expect(trigger).toHaveAttribute('aria-expanded', 'false')

  await trigger.click()
  const nav = page.getByRole('navigation', { name: 'Primary' })
  await expect(nav).toBeVisible()

  // Focus lands inside what was just opened, rather than leaving the user to tab to it.
  await expect(page.getByRole('link', { name: 'All jewelry' })).toBeFocused()

  await page.keyboard.press('Escape')
  await expect(nav).toBeHidden()

  // Focus must come back to the trigger. Without this it is stranded on a removed element and the
  // next Tab restarts from the top of the document.
  await expect(page.getByRole('button', { name: 'Open menu' })).toBeFocused()
})

test('language menu is operable by keyboard', async ({ page }) => {
  await page.goto(`${STORYBOOK}/iframe.html?id=layout-header--desktop&viewMode=story`, {
    waitUntil: 'load',
  })

  const trigger = page.getByRole('button', { name: 'Language: EN' })
  await trigger.click()
  await expect(page.getByRole('menu')).toBeVisible()
  await expect(page.getByRole('menuitem', { name: 'EN' })).toBeFocused()

  await page.keyboard.press('ArrowDown')
  await expect(page.getByRole('menuitem', { name: 'RU' })).toBeFocused()

  // Wrapping, so the arrow keys never dead-end.
  await page.keyboard.press('ArrowDown')
  await expect(page.getByRole('menuitem', { name: 'EN' })).toBeFocused()

  await page.keyboard.press('Escape')
  await expect(page.getByRole('menu')).toBeHidden()
  await expect(trigger).toBeFocused()
})

test('cart count reaches assistive tech, not just the badge', async ({ page }) => {
  await page.goto(`${STORYBOOK}/iframe.html?id=layout-header--with-items-in-cart&viewMode=story`, {
    waitUntil: 'load',
  })

  // The badge itself is aria-hidden, so the count has to be in the button's name or it is lost.
  await expect(page.getByRole('button', { name: 'Cart, 2 items' })).toBeVisible()

  await page.goto(`${STORYBOOK}/iframe.html?id=layout-header--desktop&viewMode=story`, {
    waitUntil: 'load',
  })
  await expect(page.getByRole('button', { name: 'Cart, empty' })).toBeVisible()
})

/** SC-007 — 320px is the narrowest viewport we support, and the header is the first thing to break. */
test('header does not scroll horizontally at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 })
  await page.goto(
    `${STORYBOOK}/iframe.html?id=layout-header--mobile-with-breadcrumbs&viewMode=story`,
    { waitUntil: 'load' },
  )
  await page.locator('#storybook-root > *').first().waitFor()

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow, 'the header overflows a 320px viewport').toBeLessThanOrEqual(0)
})

/**
 * The footer's semantics, which are the part a screenshot cannot show.
 */
test('footer social marks are links, not buttons', async ({ page }) => {
  await page.goto(`${STORYBOOK}/iframe.html?id=layout-footer--desktop&viewMode=story`, {
    waitUntil: 'load',
  })

  // They navigate, so they must announce as links. Rendered as buttons they would tell a
  // screen-reader user the wrong thing about what is about to happen.
  const whatsapp = page.getByRole('link', { name: /WhatsApp/ })
  await expect(whatsapp).toBeVisible()
  await expect(whatsapp).toHaveAttribute('rel', 'noopener noreferrer')
  await expect(whatsapp).toHaveAttribute('target', '_blank')
})

test('footer newsletter field is named despite its hidden label', async ({ page }) => {
  await page.goto(`${STORYBOOK}/iframe.html?id=layout-footer--desktop&viewMode=story`, {
    waitUntil: 'load',
  })

  // The design is placeholder-only. A placeholder is not a name, so this checks the real one.
  await expect(page.getByRole('textbox', { name: 'Email address' })).toBeVisible()
})

test('certification marks carry real alternative text', async ({ page }) => {
  await page.goto(`${STORYBOOK}/iframe.html?id=layout-footer--desktop&viewMode=story`, {
    waitUntil: 'load',
  })

  // "GIA" spoken aloud is three letters, not an institution.
  await expect(page.getByRole('img', { name: 'Gemological Institute of America' })).toBeVisible()
  await expect(page.getByRole('img', { name: 'International Gemological Institute' })).toBeVisible()
})

test('footer does not scroll horizontally at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 })
  await page.goto(`${STORYBOOK}/iframe.html?id=layout-footer--mobile&viewMode=story`, {
    waitUntil: 'load',
  })
  await page.locator('#storybook-root > *').first().waitFor()

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow, 'the footer overflows a 320px viewport').toBeLessThanOrEqual(0)
})

/**
 * The animated button hovers, which shipped broken once and looked correct in the source.
 *
 * The label colour was written with `group-hover:` on the element that carries `group` — a
 * descendant selector applied to the ancestor itself, so it matched nothing. Nothing failed: the
 * rule was emitted, the class was present, and the text simply never changed. Only a computed-style
 * assertion catches that class of bug.
 */
const WHITE = 'rgb(255, 255, 255)'
const INK = 'rgb(5, 3, 1)'

async function labelColour(button: import('@playwright/test').Locator) {
  return button.evaluate((el) => getComputedStyle(el).color)
}

test('slide hover inverts the label colour', async ({ page }) => {
  await page.goto(`${STORYBOOK}/iframe.html?id=ui-button--hover-effects&viewMode=story`, {
    waitUntil: 'load',
  })

  // Light label on the filled button; dark once the fill has travelled away.
  const onLight = page.getByRole('button', { name: 'ВЫБРАТЬ РАЗМЕР' })
  expect(await labelColour(onLight)).toBe(WHITE)
  await onLight.hover()
  await expect.poll(() => labelColour(onLight)).toBe(INK)

  // And the mirror image on the dark surface: dark label, light once the white fill leaves.
  const onDark = page.getByRole('button', { name: 'SHOP NOW' })
  expect(await labelColour(onDark)).toBe(INK)
  await onDark.hover()
  await expect.poll(() => labelColour(onDark)).toBe(WHITE)
})

test('reveal hover inverts the label and the circle covers the button', async ({ page }) => {
  await page.goto(`${STORYBOOK}/iframe.html?id=ui-button--hover-effects&viewMode=story`, {
    waitUntil: 'load',
  })

  const button = page.getByRole('button', { name: 'SUBSCRIBE' })
  expect(await labelColour(button)).toBe(INK)

  await button.hover()
  await expect.poll(() => labelColour(button)).toBe(WHITE)

  await expectDiscToCover(button)
})

/**
 * "Expands to full size" is geometry, not vibes — and it has to be measured as a CIRCLE.
 *
 * An earlier version of this asserted that the disc's bounding BOX contained the button's, which a
 * disc can satisfy while still leaving all four corners bare: a circle inscribed in a box only
 * touches that box at four points. That is exactly how the social marks shipped with their bottom
 * 6px uncovered, passing a green test.
 */
async function expectDiscToCover(control: import('@playwright/test').Locator) {
  const disc = control.locator('span[aria-hidden="true"]').first()
  const [box, discBox] = await Promise.all([control.boundingBox(), disc.boundingBox()])

  expect(box, 'control has no box').not.toBeNull()
  expect(discBox, 'disc has no box').not.toBeNull()

  const centre = { x: discBox!.x + discBox!.width / 2, y: discBox!.y + discBox!.height / 2 }
  const radius = discBox!.width / 2

  const corners = [
    { x: box!.x, y: box!.y },
    { x: box!.x + box!.width, y: box!.y },
    { x: box!.x, y: box!.y + box!.height },
    { x: box!.x + box!.width, y: box!.y + box!.height },
  ]

  for (const corner of corners) {
    const distance = Math.hypot(corner.x - centre.x, corner.y - centre.y)
    expect(
      distance,
      `corner (${corner.x}, ${corner.y}) is ${distance.toFixed(1)}px from the disc centre, outside its ${radius.toFixed(1)}px radius`,
    ).toBeLessThanOrEqual(radius)
  }
}

/**
 * The footer's dark-surface treatment, asserted on COMPUTED values.
 *
 * Every one of these has already been shipped broken once, in the same way: an edit that reformatted
 * before it applied, leaving a prop that was typed, accepted, threaded through — and connected to
 * nothing. The class list looked right. Only the rendered value showed it was not.
 */

/** Works for whatever colour space the browser computes into — `rgb()` or `oklab()`. */
function lightnessOf(colour: string): number {
  const numbers = (colour.match(/[\d.]+/g) ?? []).map(Number)
  if (colour.startsWith('oklab') || colour.startsWith('oklch')) return numbers[0] ?? 0
  const [r = 0, g = 0, b = 0] = numbers
  return (r + g + b) / (3 * 255)
}

test('footer newsletter field uses the inverse tone', async ({ page }) => {
  await page.goto(`${STORYBOOK}/iframe.html?id=layout-footer--desktop&viewMode=story`, {
    waitUntil: 'load',
  })

  const field = page.getByRole('textbox', { name: 'Email address' })
  const border = await field.evaluate(
    (el) => getComputedStyle(el.parentElement as HTMLElement).borderColor,
  )
  const text = await field.evaluate((el) => getComputedStyle(el).color)

  // A dark hairline here means the tone fell back to the light default on a near-black surface,
  // which renders as no border at all.
  expect(lightnessOf(border), `border is dark: ${border}`).toBeGreaterThan(0.5)
  expect(text).toBe('rgb(255, 255, 255)')
})

test('footer social marks carry a ring and invert on hover', async ({ page }) => {
  await page.goto(`${STORYBOOK}/iframe.html?id=layout-footer--desktop&viewMode=story`, {
    waitUntil: 'load',
  })

  const mark = page.getByRole('link', { name: /WhatsApp/ })
  const resting = await mark.evaluate((el) => {
    const s = getComputedStyle(el)
    return { border: s.borderColor, width: s.borderWidth, colour: s.color }
  })

  expect(resting.width, 'social mark has no ring').not.toBe('0px')
  expect(lightnessOf(resting.border), `ring is dark: ${resting.border}`).toBeGreaterThan(0.5)
  expect(resting.colour).toBe('rgb(255, 255, 255)')

  await mark.hover()
  await expect.poll(() => mark.evaluate((el) => getComputedStyle(el).color)).toBe('rgb(5, 3, 1)')
})

test('footer link rules are white, not brand maroon', async ({ page }) => {
  await page.goto(`${STORYBOOK}/iframe.html?id=layout-footer--desktop&viewMode=story`, {
    waitUntil: 'load',
  })

  // Figma draws this rule in primary-default. On background-base that is barely distinguishable
  // from the surface, so a hover affordance nobody can see.
  const rule = await page.getByRole('link', { name: 'Contact Us' }).evaluate((el) => {
    const span = el.querySelector('span[aria-hidden="true"]')
    return span ? getComputedStyle(span).backgroundColor : 'NO RULE ELEMENT'
  })

  expect(rule).toBe('rgb(255, 255, 255)')
})

test('social reveal disc covers the whole mark', async ({ page }) => {
  await page.goto(`${STORYBOOK}/iframe.html?id=layout-footer--desktop&viewMode=story`, {
    waitUntil: 'load',
  })

  const mark = page.getByRole('link', { name: /WhatsApp/ })
  await mark.hover()
  await expect.poll(() => mark.evaluate((el) => getComputedStyle(el).color)).toBe('rgb(5, 3, 1)')

  // The disc must also actually PAINT. It sits at `-z-10`, and without an isolation context on the
  // control it renders behind the footer's own background — present, correctly sized, invisible.
  const disc = mark.locator('span[aria-hidden="true"]').first()
  await expect(disc).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  await expect(mark).toHaveCSS('isolation', 'isolate')

  await expectDiscToCover(mark)
})

test('certification marks stack from tablet up and sit side by side on a phone', async ({
  page,
}) => {
  const marks = async () => {
    const gia = await page
      .getByRole('img', { name: 'Gemological Institute of America' })
      .boundingBox()
    const igi = await page
      .getByRole('img', { name: 'International Gemological Institute' })
      .boundingBox()
    return { gia: gia!, igi: igi! }
  }

  await page.setViewportSize({ width: 1024, height: 1200 })
  await page.goto(`${STORYBOOK}/iframe.html?id=layout-footer--desktop&viewMode=story`, {
    waitUntil: 'load',
  })
  await page.locator('#storybook-root > *').first().waitFor()

  const tablet = await marks()
  expect(tablet.igi.y, 'marks are not stacked at tablet width').toBeGreaterThan(tablet.gia.y)
  expect(tablet.igi.x, 'stacked marks are not aligned').toBeCloseTo(tablet.gia.x, 0)

  // Below the tablet breakpoint they share a row — there is no width for a column there.
  await page.setViewportSize({ width: 390, height: 1400 })
  await page.locator('#storybook-root > *').first().waitFor()

  const phone = await marks()
  expect(phone.igi.x, 'marks are not side by side on a phone').toBeGreaterThan(phone.gia.x)
})

/**
 * The contact strip is drawn at two widths and deliberately absent at a third. "Absent" is the part
 * worth a test: it is the only state with no drawing to compare against, so nothing but an
 * assertion says whether it is hidden on purpose or hidden by accident.
 */
test('contact banner appears at tablet and desktop and is gone on a phone', async ({ page }) => {
  await page.goto(`${STORYBOOK}/iframe.html?id=layout-contactbanner--desktop&viewMode=story`, {
    waitUntil: 'load',
  })

  const email = page.getByRole('link', { name: /hello@aurum\.example/ })

  // Desktop — 70px tall, 100px gutter (node 196:868).
  await page.setViewportSize({ width: 1440, height: 800 })
  await expect(email).toBeVisible()
  const strip = page.locator('#storybook-root > div')
  expect((await strip.boundingBox())!.height).toBe(70)
  expect((await email.boundingBox())!.x).toBeCloseTo(100, 0)

  // Tablet — 60px tall, 24px gutter (node 440:12226).
  await page.setViewportSize({ width: 1024, height: 800 })
  await expect(email).toBeVisible()
  expect((await strip.boundingBox())!.height).toBe(60)
  expect((await email.boundingBox())!.x).toBeCloseTo(24, 0)

  // Phone — not rendered at all. `display: none` takes it out of the accessibility tree too, which
  // is what makes hiding it acceptable: everything on it is repeated in the footer.
  await page.setViewportSize({ width: 390, height: 800 })
  await expect(email).toBeHidden()
})

test('contact banner details are reachable, not just readable', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 800 })
  await page.goto(`${STORYBOOK}/iframe.html?id=layout-contactbanner--desktop&viewMode=story`, {
    waitUntil: 'load',
  })

  await expect(page.getByRole('link', { name: /hello@aurum\.example/ })).toHaveAttribute(
    'href',
    'mailto:hello@aurum.example',
  )
  // The displayed number carries spaces and brackets; `tel:` will not take them.
  await expect(page.getByRole('link', { name: /010 20-30/ })).toHaveAttribute(
    'href',
    'tel:+15550102030',
  )

  for (const name of ['WhatsApp', 'Instagram', 'Telegram']) {
    const mark = page.getByRole('link', { name: new RegExp(name) })
    await expect(mark).toBeVisible()
    // WCAG 2.2 target size (2.5.8): the glyph IS the target here, so it has to clear 24px on its
    // own — there is no padding around it to make up the difference.
    const box = (await mark.boundingBox())!
    expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(24)
  }
})
