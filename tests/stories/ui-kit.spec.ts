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

test('accordion rows wire their panel to their header and toggle it', async ({ page }) => {
  await page.goto(`${STORYBOOK}/iframe.html?id=ui-accordion--default&viewMode=story`, {
    waitUntil: 'load',
  })

  const header = page.getByRole('button', { name: 'Description' })
  await expect(header).toHaveAttribute('aria-expanded', 'false')

  // Closed copy must be out of the accessibility tree, not merely clipped — a `0fr` grid row still
  // leaves readable text behind for a screen reader if the inner wrapper is not hidden.
  await expect(page.getByText(/solitaire in 18ct gold/)).toBeHidden()

  await header.click()
  await expect(header).toHaveAttribute('aria-expanded', 'true')

  const region = page.getByRole('region', { name: 'Description' })
  await expect(region).toBeVisible()
  await expect(region).toContainText('solitaire in 18ct gold')

  // The header owns the panel by id, which is what makes "expanded" mean anything.
  const controls = await header.getAttribute('aria-controls')
  await expect(region).toHaveAttribute('id', controls!)

  await header.click()
  await expect(header).toHaveAttribute('aria-expanded', 'false')
})

test('accordion single mode closes the row that was open', async ({ page }) => {
  await page.goto(
    `${STORYBOOK}/iframe.html?id=ui-accordion--only-one-open-at-a-time&viewMode=story`,
    { waitUntil: 'load' },
  )

  const description = page.getByRole('button', { name: 'Description' })
  const delivery = page.getByRole('button', { name: 'Delivery & returns' })

  await expect(description).toHaveAttribute('aria-expanded', 'true')
  await delivery.click()
  await expect(delivery).toHaveAttribute('aria-expanded', 'true')
  await expect(description).toHaveAttribute('aria-expanded', 'false')
})

test('accordion rows take the maroon rule on hover and on keyboard focus', async ({ page }) => {
  await page.goto(`${STORYBOOK}/iframe.html?id=ui-accordion--default&viewMode=story`, {
    waitUntil: 'load',
  })

  const row = page
    .locator('#storybook-root div[class*="border-b"]')
    .filter({ has: page.getByRole('button', { name: 'Warranty' }) })
  // `black/10` computes as an oklab colour in this build, so the resting value is matched loosely
  // and the assertion that matters is the CHANGE to maroon below.
  await expect(row).toHaveCSS('border-bottom-color', /oklab\(0 0 0 \/ 0\.1\)|rgba\(0, 0, 0, 0\.1\)/)

  await row.hover()
  await expect(row).toHaveCSS('border-bottom-color', 'rgb(59, 23, 26)')

  // Figma draws this state for a pointer only. A keyboard visitor gets the same signal, which is
  // the entire reason `focus-within` is on the row rather than `hover` alone.
  await page.mouse.move(0, 0)
  await page.getByRole('button', { name: 'Warranty' }).focus()
  await expect(row).toHaveCSS('border-bottom-color', 'rgb(59, 23, 26)')
})

test('search field clears by pointer and by Escape, keeping focus', async ({ page }) => {
  await page.goto(`${STORYBOOK}/iframe.html?id=ui-searchfield--with-a-value&viewMode=story`, {
    waitUntil: 'load',
  })

  const input = page.getByRole('searchbox', { name: 'Search the catalogue' })
  await expect(input).toHaveValue('Rings')

  await page.getByRole('button', { name: /clear/i }).click()
  await expect(input).toHaveValue('')
  // Clearing and losing focus makes the visitor tab back to where they already were.
  await expect(input).toBeFocused()
  await expect(page.getByRole('button', { name: /clear/i })).toHaveCount(0)

  await input.fill('Bracelets')
  await input.press('Escape')
  await expect(input).toHaveValue('')
  await expect(input).toBeFocused()
})

test('search field rule is the focus indicator', async ({ page }) => {
  await page.goto(`${STORYBOOK}/iframe.html?id=ui-searchfield--default&viewMode=story`, {
    waitUntil: 'load',
  })

  const row = page.locator('#storybook-root input').locator('xpath=..')
  await expect(row).toHaveCSS('border-bottom-color', 'rgb(5, 3, 1)')

  // The input suppresses the global focus ring, so if this rule did not change there would be no
  // focus indicator on the control at all.
  await page.keyboard.press('Tab')
  await expect(page.getByRole('searchbox')).toBeFocused()
  await expect(row).toHaveCSS('border-bottom-color', 'rgb(59, 23, 26)')
})

test('category card is one link covering the whole tile', async ({ page }) => {
  await page.goto(`${STORYBOOK}/iframe.html?id=ui-categorycard--default&viewMode=story`, {
    waitUntil: 'load',
  })

  // Two links would make a screen reader announce the tile twice and give the pointer two targets
  // for one destination. The drawn button is a span for exactly that reason.
  await expect(page.locator('#storybook-root a')).toHaveCount(1)
  await expect(page.locator('#storybook-root button')).toHaveCount(0)

  const link = page.getByRole('link', { name: /Rings/ })
  await expect(link).toHaveAttribute('href', '/rings')
  // The photograph is decorative inside a link that carries its own text — a descriptive alt would
  // be announced ahead of the title.
  await expect(link).toHaveAccessibleName('Rings View the collection')

  // The heading survives being inside the anchor, so a page of these still has an outline.
  await expect(page.getByRole('heading', { level: 3, name: 'Rings' })).toBeVisible()

  // The hit area is the whole card, not the drawn block at the bottom.
  const hit = await page.evaluate(() => {
    const card = document.querySelector('#storybook-root a')!
    const box = card.getBoundingClientRect()
    const corners = [
      [box.x + 4, box.y + 4],
      [box.right - 4, box.y + 4],
      [box.x + 4, box.bottom - 4],
      [box.right - 4, box.bottom - 4],
    ]
    return corners.map(([x, y]) => document.elementFromPoint(x!, y!)?.closest('a') !== null)
  })
  expect(hit, 'some of the card is outside the link').toEqual([true, true, true, true])
})

test('category card CTA slides without the card hover capturing it', async ({ page }) => {
  await page.goto(`${STORYBOOK}/iframe.html?id=ui-categorycard--default&viewMode=story`, {
    waitUntil: 'load',
  })

  const cta = page.locator('#storybook-root a > span').last()
  const fill = cta.locator('span[aria-hidden="true"]').first()
  await expect(fill).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  // Tailwind v4 compiles `translate-x-full` to the `translate` PROPERTY, not to a transform matrix
  // — the same trap `scale-110` sets above. `transform` reads "none" either way.
  const travel = () => fill.evaluate((el) => getComputedStyle(el).translate)

  // The card's group is named so that Button's own unnamed `group` is not captured by it. If it
  // were, the fill would travel on card hover while the label — coloured with plain `hover:` —
  // stayed dark, leaving dark text on a photograph.
  const card = page.locator('#storybook-root a')
  const box = (await card.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + 20)
  await expect.poll(travel).toBe('none')

  await cta.hover()
  await expect.poll(travel).not.toBe('none')
  await expect
    .poll(() => cta.evaluate((el) => getComputedStyle(el).color))
    .toBe('rgb(255, 255, 255)')
})

test('category card zooms its photograph on hover and on focus', async ({ page }) => {
  await page.goto(`${STORYBOOK}/iframe.html?id=ui-categorycard--default&viewMode=story`, {
    waitUntil: 'load',
  })

  // Tailwind v4 compiles `scale-110` to the `scale` PROPERTY, not to a `transform` matrix. Asserting
  // on `transform` reads "none" whether or not the zoom works, which is a test that can only pass.
  const image = page.locator('#storybook-root img')
  const scale = () => image.evaluate((el) => getComputedStyle(el).scale)
  await expect.poll(scale).toBe('none')

  await page.getByRole('link', { name: /Rings/ }).hover()
  await expect.poll(scale).toBe('1.1')

  // Figma draws the zoom for a pointer. A keyboard visitor reaching the CTA should see the same
  // thing happen, or the card looks inert to them.
  await page.mouse.move(0, 0)
  await expect.poll(scale).toBe('none')
  await page.keyboard.press('Tab')
  await expect.poll(scale).toBe('1.1')

  // `transition-transform` has to actually cover the `scale` property, or the zoom snaps.
  await expect(image).toHaveCSS('transition-property', /scale/)
})

test('accordion leading glyph is swappable and removable', async ({ page }) => {
  await page.goto(`${STORYBOOK}/iframe.html?id=ui-accordion--with-its-own-icons&viewMode=story`, {
    waitUntil: 'load',
  })

  const header = page.getByRole('button', { name: 'Delivery & returns' })
  // Two glyphs: the swapped leading one and the expand indicator.
  await expect(header.locator('svg')).toHaveCount(2)
  // Whatever the glyph is, it stays decoration — a named icon beside its own label makes a screen
  // reader say the same thing twice.
  await expect(header).toHaveAccessibleName('Delivery & returns')

  await page.goto(
    `${STORYBOOK}/iframe.html?id=ui-accordion--without-the-leading-glyph&viewMode=story`,
    { waitUntil: 'load' },
  )
  const bare = page.getByRole('button', { name: 'Delivery & returns' })
  await expect(bare.locator('svg')).toHaveCount(1)
})

test('search placeholder keeps the drawn grey', async ({ page }) => {
  await page.goto(`${STORYBOOK}/iframe.html?id=ui-searchfield--default&viewMode=story`, {
    waitUntil: 'load',
  })

  // `neutral-placeholder`, not the corrected `neutral-secondary` the rest of the kit uses. An
  // accepted exception of record — see design/tokens/mapping.ts.
  const colour = await page
    .locator('#storybook-root input')
    .evaluate((el) => getComputedStyle(el, '::placeholder').color)
  expect(colour).toBe('rgb(167, 165, 163)')
})

test('quantity stepper names its buttons per item and stops at both ends', async ({ page }) => {
  await page.goto(`${STORYBOOK}/iframe.html?id=ui-quantitystepper--mid-range&viewMode=story`, {
    waitUntil: 'load',
  })

  const decrease = page.getByRole('button', { name: 'Decrease quantity' })
  const increase = page.getByRole('button', { name: 'Increase quantity' })
  const count = page.locator('#storybook-root span[aria-live]')

  await expect(count).toHaveText('3')
  await increase.click()
  await expect(count).toHaveText('4')
  await decrease.click()
  await decrease.click()
  await expect(count).toHaveText('2')

  // The count is a live region, or pressing a button that changes a number elsewhere announces
  // nothing at all.
  await expect(count).toHaveAttribute('aria-live', 'polite')

  // Both ends are held by disabling the button, not by clamping silently.
  await decrease.click()
  await expect(count).toHaveText('1')
  await expect(decrease).toBeDisabled()

  for (let i = 0; i < 7; i += 1) await increase.click()
  await expect(count).toHaveText('8')
  await expect(increase).toBeDisabled()
})

test('image carousel pages, wraps, and is reachable by keyboard', async ({ page }) => {
  await page.goto(`${STORYBOOK}/iframe.html?id=ui-imagecarousel--default&viewMode=story`, {
    waitUntil: 'load',
  })

  const track = page.locator('#storybook-root ul')
  const offset = () => track.evaluate((el) => Math.round(el.scrollLeft))
  const width = await track.evaluate((el) => el.clientWidth)

  expect(await offset()).toBe(0)

  await page.getByRole('button', { name: /^Next photograph/ }).click()
  await expect.poll(offset).toBe(width)

  // Past the last photograph it wraps rather than stopping dead — the arrows are the only thing
  // saying there is more, so an arrow that does nothing reads as broken.
  await page.getByRole('button', { name: /^Next photograph/ }).click()
  await expect.poll(offset).toBe(width * 2)
  await page.getByRole('button', { name: /^Next photograph/ }).click()
  await expect.poll(offset).toBe(0)

  await page.getByRole('button', { name: /^Previous photograph/ }).click()
  await expect.poll(offset).toBe(width * 2)

  // A scrollable region no keyboard can reach is a WCAG failure, and it is what makes the arrow
  // keys scroll the strip.
  await expect(track).toHaveAttribute('tabindex', '0')
})

test('image carousel drops its arrows for a single photograph', async ({ page }) => {
  await page.goto(`${STORYBOOK}/iframe.html?id=ui-imagecarousel--single-image&viewMode=story`, {
    waitUntil: 'load',
  })
  await expect(page.locator('#storybook-root button')).toHaveCount(0)
})

test('product card CTA is hidden but never trapped', async ({ page }) => {
  await page.goto(`${STORYBOOK}/iframe.html?id=commerce-productcard--default&viewMode=story`, {
    waitUntil: 'load',
  })

  const cta = page.getByRole('button', { name: 'Select size' })
  const opacity = () => cta.evaluate((el) => getComputedStyle(el).opacity)
  await expect.poll(opacity).toBe('0')

  // Pointer: hovering the card reveals it. A pointer over the button is a pointer over the card,
  // so it can never be clicked while invisible.
  const card = page.locator('#storybook-root article')
  await card.hover()
  await expect.poll(opacity).toBe('1')

  // Keyboard: focus has to reveal it, or tabbing lands on something nobody can see.
  await page.mouse.move(0, 0)
  await expect.poll(opacity).toBe('0')
  await cta.focus()
  await expect.poll(opacity).toBe('1')
})

test('product card is one link with the arrows and CTA above it', async ({ page }) => {
  await page.goto(`${STORYBOOK}/iframe.html?id=commerce-productcard--default&viewMode=story`, {
    waitUntil: 'load',
  })

  await expect(page.locator('#storybook-root a')).toHaveCount(1)
  const link = page.getByRole('link')
  await expect(link).toHaveAttribute('href', '/products/pink-heart-earrings')

  // The photograph is part of the link...
  const box = (await page.locator('#storybook-root article').boundingBox())!
  const overPhoto = await page.evaluate(
    ([x, y]) => document.elementFromPoint(x!, y!)?.closest('a') !== null,
    [box.x + box.width / 2, box.y + 40],
  )
  expect(overPhoto, 'the photograph is not part of the product link').toBe(true)

  // ...but the arrows and the CTA are not, or they would be dead controls under the overlay.
  for (const name of [/^Next photograph/, 'Select size']) {
    const control = page.getByRole('button', { name })
    const cb = (await control.boundingBox())!
    const hit = await page.evaluate(
      ([x, y]) => {
        const at = document.elementFromPoint(x!, y!)
        return { isButton: at?.closest('button') !== null, isLink: at?.closest('a') !== null }
      },
      [cb.x + cb.width / 2, cb.y + cb.height / 2],
    )
    expect(hit.isButton, `${name} is buried under the stretched link`).toBe(true)
    expect(hit.isLink).toBe(false)
  }
})

test('cart item controls carry the row they belong to', async ({ page }) => {
  await page.goto(`${STORYBOOK}/iframe.html?id=commerce-cartitem--a-basket&viewMode=story`, {
    waitUntil: 'load',
  })

  // Two rows, and every control names its own. Without this a basket offers identical bins and
  // identical plus buttons — unusable by voice or screen reader, and perfect on screen.
  await expect(page.getByRole('button', { name: 'Remove BUTTERFLY DIAMOND PENDANT' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Remove PINK HEART EARRINGS' })).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Increase quantity of PINK HEART EARRINGS' }),
  ).toBeVisible()

  await expect(page.getByRole('listitem')).toHaveCount(2)
  await page.getByRole('button', { name: 'Remove BUTTERFLY DIAMOND PENDANT' }).click()
  await expect(page.getByRole('listitem')).toHaveCount(1)
})

test('cart item truncates a long name instead of shoving the stepper off the row', async ({
  page,
}) => {
  await page.setViewportSize({ width: 900, height: 600 })
  await page.goto(`${STORYBOOK}/iframe.html?id=commerce-cartitem--long-name&viewMode=story`, {
    waitUntil: 'load',
  })

  const row = page.getByRole('listitem')
  const rowBox = (await row.boundingBox())!
  const stepperBox = (await page.getByRole('group').boundingBox())!
  expect(stepperBox.x + stepperBox.width).toBeLessThanOrEqual(rowBox.x + rowBox.width + 1)

  // `min-w-0` is the whole reason: a flex child defaults to `min-width: auto` and refuses to shrink
  // below its content, so the name would push everything past the edge instead.
  const name = page.getByRole('link')
  const nameBox = (await name.boundingBox())!
  expect(nameBox.width).toBeLessThan(rowBox.width)
})

test('product card reveals its controls at rest on a touch device', async ({ browser }) => {
  // The one case with no hover to give the controls back. Without `pointer-coarse` this ships as
  // "the controls do not exist on touch", and no desktop test would ever say so.
  //
  // The viewport is a large touch screen, not a phone: below `xl` the card has no action at all,
  // as drawn. A tablet held in landscape is exactly this — wide enough for the button, with no
  // pointer to hover it.
  const context = await browser.newContext({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 1366, height: 900 },
  })
  const page = await context.newPage()

  await page.goto(`${STORYBOOK}/iframe.html?id=commerce-productcard--default&viewMode=story`, {
    waitUntil: 'load',
  })
  await page.locator('#storybook-root article').waitFor()

  expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(true)
  await expect
    .poll(() =>
      page
        .getByRole('button', { name: 'Select size' })
        .evaluate((el) => getComputedStyle(el).opacity),
    )
    .toBe('1')
  await expect
    .poll(() =>
      page
        .getByRole('button', { name: /^Next photograph/ })
        .evaluate((el) => getComputedStyle(el).opacity),
    )
    .toBe('1')

  await context.close()
})

test('the phone card drops its action rather than hiding one nobody can reach', async ({
  browser,
}) => {
  const context = await browser.newContext({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 390, height: 800 },
  })
  const page = await context.newPage()

  await page.goto(`${STORYBOOK}/iframe.html?id=commerce-productcard--default&viewMode=story`, {
    waitUntil: 'load',
  })
  await page.locator('#storybook-root article').waitFor()

  // Node 440:13528 draws no action on the phone card, and 174px of width has no room for one.
  // What matters is HOW it is absent: `display: none`, so it is gone from the tab order too. An
  // `opacity-0` button here would be invisible, focusable and 174px wide — the exact trap the
  // three-way reveal exists to prevent, reintroduced by the fix for it.
  await expect(page.getByRole('button', { name: 'Select size' })).toHaveCount(0)

  // The carousel arrows are a different matter — they stay, and stay revealed, because a phone is
  // where swiping through a product's photographs matters most.
  await expect
    .poll(() =>
      page
        .getByRole('button', { name: /^Next photograph/ })
        .evaluate((el) => getComputedStyle(el).opacity),
    )
    .toBe('1')

  await context.close()
})

test('feature strip is a sideways scroller on a phone and a grid above it', async ({ page }) => {
  await page.goto(`${STORYBOOK}/iframe.html?id=ui-featurecard--desktop&viewMode=story`, {
    waitUntil: 'load',
  })

  const region = page.getByRole('region', { name: 'Why shop with us' })
  const card = page.getByRole('listitem').first()

  // Phone (node 440:13717) — 250px cards that do not shrink, which can only be read by scrolling.
  await page.setViewportSize({ width: 390, height: 700 })
  const phone = (await card.boundingBox())!
  expect(Math.round(phone.width)).toBe(250)
  const overflow = await region.evaluate((el) => el.scrollWidth > el.clientWidth)
  expect(overflow, 'the phone layout does not actually overflow').toBe(true)
  // A region that scrolls and cannot be focused is `scrollable-region-focusable`, and these cards
  // hold nothing focusable of their own to rescue it.
  await expect(region).toHaveAttribute('tabindex', '0')

  // Tablet (node 440:12775) — a 2x2 grid, nothing to scroll.
  await page.setViewportSize({ width: 1024, height: 900 })
  await expect.poll(() => region.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true)
  const cards = await page.getByRole('listitem').all()
  const boxes = await Promise.all(cards.map((c) => c.boundingBox()))
  expect(boxes[1]!.y, 'the tablet layout is not two rows').toBeLessThan(boxes[2]!.y)
  expect(boxes[0]!.y).toBeCloseTo(boxes[1]!.y, 0)

  // Desktop (node 355:7774) — one row of four.
  await page.setViewportSize({ width: 1440, height: 700 })
  const wide = await Promise.all(
    (await page.getByRole('listitem').all()).map((c) => c.boundingBox()),
  )
  for (const box of wide) expect(box!.y).toBeCloseTo(wide[0]!.y, 0)
})

test('feature card grows past the drawn height rather than clipping', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`${STORYBOOK}/iframe.html?id=ui-featurecard--with-longer-copy&viewMode=story`, {
    waitUntil: 'load',
  })

  const first = page.getByRole('listitem').first()
  const box = (await first.boundingBox())!
  // The drawn 290px is what four short strings happen to need. `min-h` makes it a floor.
  expect(box.height).toBeGreaterThan(290)

  // And nothing is cut off: the content's own height fits inside the card.
  const clipped = await first.evaluate((el) => el.scrollHeight > el.clientHeight + 1)
  expect(clipped, 'the long copy is clipped').toBe(false)
})

test('feature glyphs are decoration, not a second copy of the heading', async ({ page }) => {
  await page.goto(`${STORYBOOK}/iframe.html?id=ui-featurecard--desktop&viewMode=story`, {
    waitUntil: 'load',
  })

  const svgs = page.locator('#storybook-root svg')
  await expect(svgs).toHaveCount(4)
  for (const svg of await svgs.all()) {
    await expect(svg).toHaveAttribute('aria-hidden', 'true')
  }

  // The headings are what carries the meaning, and they are real headings.
  await expect(page.getByRole('heading', { level: 3, name: 'Free shipping' })).toBeVisible()
})

test('hero holds the drawn height at each breakpoint and keeps its headline as text', async ({
  page,
}) => {
  await page.goto(`${STORYBOOK}/iframe.html?id=sections-hero--desktop&viewMode=story`, {
    waitUntil: 'load',
  })

  const hero = page.locator('#storybook-root section')
  const headline = page.getByRole('heading', { level: 1 })

  // The headline is REAL TEXT, not part of the photograph. If this ever fails it means someone
  // exported the frame as one picture, and the page has lost its h1, its translations and its
  // search result along with it.
  await expect(headline).toHaveText('The beauty of lab-grown diamonds')

  const DRAWN = [
    { width: 390, height: 754 }, // node 440:13458
    { width: 1024, height: 1226 }, // node 440:12503 — deliberately taller than the frame it sits in
    { width: 1440, height: 950 }, // node 138:309
  ]

  for (const { width, height } of DRAWN) {
    await page.setViewportSize({ width, height: 900 })
    await expect
      .poll(async () => Math.round((await hero.boundingBox())!.height), {
        message: `hero is not ${height}px tall at ${width}`,
      })
      .toBe(height)
  }

  // The drawn 508px measure, held as a maximum so a phone gets the column instead of an overflow.
  await page.setViewportSize({ width: 1440, height: 900 })
  expect(Math.round((await headline.boundingBox())!.width)).toBe(508)
  await page.setViewportSize({ width: 390, height: 900 })
  expect((await headline.boundingBox())!.width).toBeLessThan(390)
})

test('hero scrim sits behind the text and can be switched off', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`${STORYBOOK}/iframe.html?id=sections-hero--desktop&viewMode=story`, {
    waitUntil: 'load',
  })

  // A gradient, behind the content and in front of the photograph, and invisible to a reader.
  const scrim = page.locator('#storybook-root section > span[aria-hidden="true"]')
  await expect(scrim).toHaveCount(1)
  await expect(scrim).toHaveCSS('z-index', '-10')
  expect(await scrim.evaluate((el) => getComputedStyle(el).backgroundImage)).toContain('gradient')

  await page.goto(`${STORYBOOK}/iframe.html?id=sections-hero--without-scrim&viewMode=story`, {
    waitUntil: 'load',
  })
  await expect(page.locator('#storybook-root section > span[aria-hidden="true"]')).toHaveCount(0)
})

test('about band turns the drawn column into a stack on a phone', async ({ page }) => {
  await page.goto(`${STORYBOOK}/iframe.html?id=sections-aboutband--desktop&viewMode=story`, {
    waitUntil: 'load',
  })

  const heading = page.getByRole('heading', { name: 'About Aurum' })
  const photo = page.locator('#storybook-root section img')

  // Above `md` the photograph is beside the copy...
  await page.setViewportSize({ width: 1440, height: 900 })
  let photoBox = (await photo.boundingBox())!
  let headingBox = (await heading.boundingBox())!
  expect(photoBox.x + photoBox.width, 'the photograph is not left of the copy').toBeLessThanOrEqual(
    headingBox.x + 1,
  )

  // ...and below it, above.
  await page.setViewportSize({ width: 390, height: 900 })
  photoBox = (await photo.boundingBox())!
  headingBox = (await heading.boundingBox())!
  expect(photoBox.y + photoBox.height, 'the stack did not stack').toBeLessThanOrEqual(
    headingBox.y + 1,
  )
  expect(Math.round(photoBox.height)).toBe(300)
})

test('about heading is two colours but one accessible name', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`${STORYBOOK}/iframe.html?id=sections-aboutband--desktop&viewMode=story`, {
    waitUntil: 'load',
  })

  // One heading, one name — the colour split leaves no trace in what is announced.
  const heading = page.getByRole('heading', { name: 'About Aurum' })
  await expect(heading).toHaveCount(1)

  // ...and it really is two colours, not a single ink heading someone forgot to style.
  const ink = await heading.evaluate((el) => getComputedStyle(el).color)
  const brand = await heading
    .locator('span')
    .evaluate((el: HTMLElement) => getComputedStyle(el).color)
  expect(brand).not.toBe(ink)

  // The band labels itself with that heading, which is what makes it a navigable region.
  const section = page.locator('#storybook-root section')
  const labelledBy = await section.getAttribute('aria-labelledby')
  expect(labelledBy).toBe(await heading.getAttribute('id'))
})

test('about band grows for copy the drawing never showed', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`${STORYBOOK}/iframe.html?id=sections-aboutband--with-longer-copy&viewMode=story`, {
    waitUntil: 'load',
  })

  const section = page.locator('#storybook-root section')
  // The drawn 750px is a floor. A third paragraph must push it down, not spill out of it.
  const clipped = await section.evaluate((el) => el.scrollHeight > el.clientHeight + 1)
  expect(clipped, 'the extra paragraph is clipped').toBe(false)
  await expect(page.getByText('independently graded')).toBeVisible()
})

test('category tiles change proportion, not just size, across the breakpoints', async ({ page }) => {
  await page.goto(`${STORYBOOK}/iframe.html?id=sections-categoryband--desktop&viewMode=story`, {
    waitUntil: 'load',
  })

  const tiles = page.getByRole('listitem')
  await expect(tiles).toHaveCount(4)

  const DRAWN = [
    { width: 390, tile: { w: 174, h: 242 }, rows: 2 }, // node 440:13487 — portrait
    { width: 1024, tile: { w: 478, h: 350 }, rows: 2 }, // node 440:12512 — LANDSCAPE
    { width: 1920, tile: { w: 415, h: 480 }, rows: 1 }, // node 144:835 — portrait again
  ]

  for (const { width, tile, rows } of DRAWN) {
    await page.setViewportSize({ width, height: 900 })
    await expect
      .poll(async () => {
        const box = (await tiles.first().boundingBox())!
        return `${Math.round(box.width)}x${Math.round(box.height)}`
      })
      .toBe(`${tile.w}x${tile.h}`)

    // The tablet frame is the one worth asserting on: a card that stayed portrait there would
    // still be "responsive" and still be wrong.
    const tops = await Promise.all((await tiles.all()).map(async (t) => (await t.boundingBox())!.y))
    expect(new Set(tops.map(Math.round)).size, `not ${rows} row(s) at ${width}`).toBe(rows)
  }
})

test('a category tile is one link named for its collection, not for its photograph', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 900 })
  await page.goto(`${STORYBOOK}/iframe.html?id=sections-categoryband--desktop&viewMode=story`, {
    waitUntil: 'load',
  })

  // Four tiles, four links — not eight, which is what a tile containing its own button would give.
  const links = page.locator('#storybook-root a')
  await expect(links).toHaveCount(4)
  await expect(page.locator('#storybook-root button')).toHaveCount(0)

  const first = links.first()
  await expect(first).toHaveAttribute('href', '/rings')
  // "Rings View collection" — the photograph contributes nothing, which is the point of its empty
  // alt. A description here would be read out in FRONT of the collection name.
  const name = (await first.evaluate((el) => el.textContent))!.trim()
  expect(name.startsWith('Rings')).toBe(true)

  // The band is a labelled region and a real list, so its size is known before it is walked.
  await expect(page.getByRole('region', { name: 'Shop by category' })).toBeVisible()
  await expect(page.getByRole('list')).toHaveCount(1)
})

test('the compact tile keeps its label inside the card', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 })
  await page.goto(`${STORYBOOK}/iframe.html?id=sections-categoryband--desktop&viewMode=story`, {
    waitUntil: 'load',
  })

  // 174px wide, 16px inset — 142px for a label `Button` refuses to wrap. "VIEW COLLECTION" sets to
  // 140px at the drawn 14px in Manrope, so at the drawn size it leaves the card entirely. This is
  // the assertion that caught it, and the reason the compact frame drops a further type step.
  const cta = page.locator('#storybook-root a').first().locator('span.group')
  const box = (await cta.boundingBox())!
  expect(Math.round(box.width)).toBe(142)
  expect(
    await cta.evaluate((el) => el.scrollWidth > el.clientWidth + 1),
    'the compact label overflows its tile',
  ).toBe(false)
})

test('the sliding fill covers a full-width tile CTA at any proportion', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 })
  await page.goto(`${STORYBOOK}/iframe.html?id=sections-categoryband--desktop&viewMode=story`, {
    waitUntil: 'load',
  })

  // `slide` moves a panel pinned to `inset-0`, so unlike `reveal`'s circle it has no geometry that
  // can come up short on a short, wide button. This is the assertion that says so.
  const cta = page.locator('#storybook-root a').first().locator('span.group')
  const panel = cta.locator('span[aria-hidden="true"]')
  const fits = await panel.evaluate((el) => {
    const p = el.getBoundingClientRect()
    const b = (el.parentElement as HTMLElement).getBoundingClientRect()
    // The panel sits inside the 1px border on each side, and must cover everything within it.
    return p.width >= b.width - 2 && p.height >= b.height - 2
  })
  expect(fits, 'the sliding fill does not cover the button it is meant to').toBe(true)

  await cta.hover()
  await expect.poll(() => panel.evaluate((el) => getComputedStyle(el).translate)).toBe('100%')
})

test('the carousel clamps at both ends and drops the arrow that has nowhere to go', async ({
  page,
}) => {
  await page.setViewportSize({ width: 900, height: 700 })
  await page.goto(`${STORYBOOK}/iframe.html?id=ui-carousel--default&viewMode=story`, {
    waitUntil: 'load',
  })

  const track = page.getByRole('list', { name: 'Example panels' })
  const forward = page.getByRole('button', { name: 'Show more panels' })
  const back = page.getByRole('button', { name: 'Show previous panels' })

  // At the start there is nothing behind, so only one arrow exists. Not disabled — absent.
  await expect(forward).toBeVisible()
  await expect(back).toHaveCount(0)

  await forward.click()
  await expect(back).toBeVisible()

  // Page to the end. The forward arrow must leave rather than scroll to nothing.
  //
  // Settling BEFORE each decision rather than waiting a fixed spell after each click: the arrow
  // unmounts the instant the track reaches the end, so a smooth scroll that is still travelling
  // when the next click begins detaches the button mid-action. That is the test racing the
  // component, not the component misbehaving.
  const settle = async () => {
    let previous = -1
    for (let i = 0; i < 20; i += 1) {
      const now = await track.evaluate((el) => el.scrollLeft)
      if (now === previous) return
      previous = now
      await page.waitForTimeout(100)
    }
  }

  for (let i = 0; i < 6; i += 1) {
    await settle()
    if ((await forward.count()) === 0) break
    await forward.click()
  }
  await settle()
  await expect(forward).toHaveCount(0)
  await expect(back).toBeVisible()

  // And it really is at the end, not merely missing its control.
  expect(
    await track.evaluate((el) => el.scrollLeft >= el.scrollWidth - el.clientWidth - 2),
  ).toBe(true)
})

test('a carousel with nothing to page shows no arrows at all', async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 700 })
  await page.goto(`${STORYBOOK}/iframe.html?id=ui-carousel--nothing-to-page&viewMode=story`, {
    waitUntil: 'load',
  })

  await page.getByRole('list', { name: 'Example panels' }).waitFor()
  // This is the drawn desktop state of the jewelry row: four cards, four fit, control hidden.
  await expect(page.getByRole('button', { name: /panels$/ })).toHaveCount(0)
})

test('a wrapping carousel keeps both arrows and comes back round', async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 700 })
  await page.goto(`${STORYBOOK}/iframe.html?id=ui-carousel--wrapping&viewMode=story`, {
    waitUntil: 'load',
  })

  const track = page.getByRole('list', { name: 'Example panels' })
  // Both, always — there is always somewhere to go.
  await expect(page.getByRole('button', { name: 'Show previous panels' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Show more panels' })).toBeVisible()

  // Backwards from the start lands at the end, which is the behaviour a strip of photographs of one
  // product needs and a row of products must not have.
  await page.getByRole('button', { name: 'Show previous panels' }).click()
  await expect
    .poll(() => track.evaluate((el) => el.scrollLeft > 0))
    .toBe(true)
})

test('the jewelry row keeps the drawn card at every width and pages only when it must', async ({
  page,
}) => {
  await page.goto(`${STORYBOOK}/iframe.html?id=sections-jewelrycarousel--desktop&viewMode=story`, {
    waitUntil: 'load',
  })

  const track = page.getByRole('list', { name: 'Featured jewelry' })
  const card = page.locator('#storybook-root li').first()

  const DRAWN = [
    { width: 390, card: 174, overflows: true }, // node 440:13525
    { width: 1024, card: 400, overflows: true }, // node 440:12540
    { width: 1920, card: 415, overflows: false }, // node 144:839 — four fit exactly
  ]

  for (const { width, card: expected, overflows } of DRAWN) {
    await page.setViewportSize({ width, height: 900 })
    await expect
      .poll(async () => Math.round((await card.boundingBox())!.width), {
        message: `card is not ${expected}px wide at ${width}`,
      })
      .toBe(expected)

    await expect
      .poll(() => track.evaluate((el) => el.scrollWidth > el.clientWidth + 1), {
        message: `overflow at ${width} is not ${overflows}`,
      })
      .toBe(overflows)
  }

  // 1920 is the state the drawing shows: four cards, nothing beyond the edge, control hidden.
  await expect(page.getByRole('button', { name: /pieces$/ })).toHaveCount(0)
})

test('the jewelry row is reachable and pageable by keyboard alone', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 900 })
  await page.goto(`${STORYBOOK}/iframe.html?id=sections-jewelrycarousel--desktop&viewMode=story`, {
    waitUntil: 'load',
  })

  const track = page.getByRole('list', { name: 'Featured jewelry' })
  // A scrolling region a keyboard cannot reach is `scrollable-region-focusable`. This is what makes
  // the arrow keys work, and it is the only way to move the row without a pointer or a swipe.
  await expect(track).toHaveAttribute('tabindex', '0')

  await track.focus()
  await page.keyboard.press('ArrowRight')
  await expect.poll(() => track.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0)
})

test('every band grows for copy longer than the drawing showed', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })

  // Every band is drawn with exactly one string. A translation is routinely 30% longer, and the
  // failure mode is silent: the drawn height holds and the overflow is simply invisible.
  const CASES = [
    { id: 'sections-hero--with-longer-copy', root: '#storybook-root section' },
    { id: 'sections-aboutband--with-longer-copy', root: '#storybook-root section' },
    { id: 'sections-categoryband--with-longer-names', root: '#storybook-root section' },
    { id: 'ui-featurecard--with-longer-copy', root: '#storybook-root li' },
  ]

  for (const { id, root } of CASES) {
    await page.goto(`${STORYBOOK}/iframe.html?id=${id}&viewMode=story`, { waitUntil: 'load' })
    const band = page.locator(root).first()
    await band.waitFor()

    expect(
      await band.evaluate((el) => el.scrollHeight > el.clientHeight + 1),
      `${id} clips its own content`,
    ).toBe(false)
    expect(
      await band.evaluate((el) => el.scrollWidth > el.clientWidth + 1),
      `${id} overflows sideways`,
    ).toBe(false)
  }
})

/**
 * The gutter is drawn: 16px on a phone, 24px from tablet, 100px from 1280 up. It is now written
 * down once, in `Container`, which is only worth anything if the number is guarded — an extracted
 * measure that nothing measures is just a shorter way to be wrong everywhere at once.
 */
test('the container steps its gutter at the drawn widths', async ({ page }) => {
  await page.goto(`${STORYBOOK}/iframe.html?id=ui-container--default&viewMode=story`, {
    waitUntil: 'load',
  })

  const content = page.locator('#storybook-root .bg-background-subtle')
  await content.waitFor()

  for (const [width, gutter] of [
    [1920, 100],
    [1280, 100],
    [1024, 24],
    [768, 24],
    [390, 16],
  ] as const) {
    await page.setViewportSize({ width, height: 600 })
    const box = (await content.boundingBox())!
    expect(box.x, `left gutter at ${width}px`).toBeCloseTo(gutter, 0)
    expect(width - (box.x + box.width), `right gutter at ${width}px`).toBeCloseTo(gutter, 0)
  }
})

/**
 * Two containers on a page must agree on where the content edge is. This is the failure the
 * extraction exists to prevent, and it is invisible in a diff: one band updated, its neighbour not.
 */
test('stacked containers share one content edge', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 700 })
  await page.goto(`${STORYBOOK}/iframe.html?id=ui-container--stacked&viewMode=story`, {
    waitUntil: 'load',
  })

  const blocks = page.locator('#storybook-root .bg-background-subtle')
  await expect(blocks).toHaveCount(2)

  const [first, second] = await blocks.all()
  const [a, b] = [(await first!.boundingBox())!, (await second!.boundingBox())!]
  expect(a.x).toBe(b.x)
  expect(a.width).toBe(b.width)
})

/**
 * `as="section"` has to produce a real `<section>`, not a `<div>` wearing the name — a landmark
 * that is not a landmark is the kind of thing that only shows up in a screen reader.
 */
test('the container renders the element it is told to', async ({ page }) => {
  await page.goto(`${STORYBOOK}/iframe.html?id=ui-container--as-section&viewMode=story`, {
    waitUntil: 'load',
  })

  const band = page.getByRole('region', { name: 'A band' })
  await expect(band).toBeVisible()
  expect(await band.evaluate((el) => el.tagName)).toBe('SECTION')
})

/**
 * The menu (002/T139–T144), from nodes 440:13282 and 440:14517.
 *
 * Driven through the header rather than through a story of its own, because the component is
 * defined by where it sits: it measures the header's bottom edge to know where to start, and the
 * cross that closes it belongs to the header row. A story that rendered it alone would be testing
 * something the app never shows.
 */
const MENU_STORY = `${STORYBOOK}/iframe.html?id=layout-header--on-a-page&viewMode=story`

async function openMenu(page: import('@playwright/test').Page, width: number, height: number) {
  await page.setViewportSize({ width, height })
  await page.goto(MENU_STORY, { waitUntil: 'load' })
  await page.getByRole('button', { name: 'Open menu' }).click()

  // Found through the trigger's own `aria-controls` rather than by guessing at the markup, which
  // also checks the wiring: if that attribute ever stops pointing at the panel, every test below
  // fails rather than quietly measuring some other element.
  const controls = await page
    .getByRole('button', { name: 'Close menu' })
    .getAttribute('aria-controls')
  expect(controls, 'the trigger does not name the panel it controls').toBeTruthy()
  const panel = page.locator(`[id="${controls}"]`)
  await expect(panel).toHaveCount(1)

  // The panel's top is measured after mount, so its first frame is at 0. Waiting for the settled
  // value rather than a timeout keeps this honest about what it is waiting for.
  await expect.poll(() => panel.boundingBox().then((box) => box?.y ?? 0)).toBeGreaterThan(0)
  return panel
}

for (const { name, width, height, gutter, disc } of [
  { name: 'tablet', width: 1024, height: 1366, gutter: 24, disc: 70 },
  { name: 'mobile', width: 390, height: 844, gutter: 16, disc: 50 },
]) {
  test(`the ${name} menu covers the page from the header's edge to the bottom`, async ({ page }) => {
    const panel = await openMenu(page, width, height)

    const header = await page.locator('header').boundingBox()
    const box = (await panel.boundingBox())!

    // It starts exactly where the header ends — not at a guessed offset, and not at the top of the
    // document, which is where a `fixed` panel lands if nobody measures.
    expect(box.y, 'the menu does not meet the header').toBeCloseTo(header!.y + header!.height, 0)
    expect(box.x).toBe(0)
    expect(box.width).toBe(width)
    expect(box.y + box.height, 'the menu stops short of the bottom of the screen').toBeCloseTo(
      height,
      0,
    )
  })

  test(`the ${name} menu draws the seven sections on the ${gutter}px gutter`, async ({ page }) => {
    await openMenu(page, width, height)

    const nav = page.getByRole('navigation', { name: 'Primary' })
    const links = nav.getByRole('link')
    await expect(links).toHaveCount(7)

    // The drawn order. Uppercasing is CSS, so the accessible names stay sentence case.
    await expect(links).toHaveText([
      'All jewelry',
      'Rings',
      'Bracelets',
      'Earrings',
      'Necklaces',
      'About us',
      'Contact us',
    ])

    const first = (await links.first().boundingBox())!
    expect(first.x, 'the first section is off the gutter').toBeCloseTo(gutter, 0)
    expect(first.x + first.width, 'the row does not reach the far gutter').toBeCloseTo(
      width - gutter,
      0,
    )

    // Every row ends in the arrow the design draws, and it is decorative — the link is already
    // named by its label, and "Rings, image" would be a worse name than "Rings".
    const arrows = nav.locator('svg')
    await expect(arrows).toHaveCount(7)
    expect(await arrows.first().getAttribute('aria-hidden')).toBe('true')
  })

  test(`the ${name} menu pins the social marks to the bottom at ${disc}px`, async ({ page }) => {
    await openMenu(page, width, height)

    const marks = page.locator('header').getByRole('link', { name: /WhatsApp|Instagram|Telegram/ })
    await expect(marks).toHaveCount(3)

    const boxes = await Promise.all((await marks.all()).map((mark) => mark.boundingBox()))
    for (const box of boxes) {
      expect(box!.width, 'the disc is not the drawn size').toBeCloseTo(disc, 0)
      expect(box!.height).toBeCloseTo(disc, 0)
    }

    // 30px clear of the bottom edge, and centred on the screen — both drawn.
    expect(boxes[2]!.y + boxes[2]!.height).toBeCloseTo(height - 30, 0)
    const centre = (boxes[0]!.x + boxes[2]!.x + boxes[2]!.width) / 2
    expect(centre, 'the marks are not centred').toBeCloseTo(width / 2, 0)
  })
}

/**
 * The phone menu carries the address, the number and the language switch; the tablet menu carries
 * none of them. That is not an oversight in the drawing — above `md` all three are in the contact
 * strip and the header, and repeating them would put the same fact on one screen twice.
 */
test('the phone menu carries what the contact strip cannot', async ({ page }) => {
  await openMenu(page, 390, 844)

  const header = page.locator('header')
  await expect(header.getByRole('link', { name: /hello@aurum\.example/ })).toBeVisible()
  await expect(header.getByRole('link', { name: /010 20-30/ })).toBeVisible()
  await expect(header.getByRole('button', { name: 'Language: EN' })).toBeVisible()

  // Plain text, as drawn — an underline here would be the only one on the screen.
  const email = header.getByRole('link', { name: /hello@aurum\.example/ })
  expect(await email.evaluate((el) => getComputedStyle(el).textDecorationLine)).toBe('none')
})

test('the tablet menu leaves the contact details to the strip above it', async ({ page }) => {
  await openMenu(page, 1024, 1366)

  const header = page.locator('header')
  await expect(header.getByRole('link', { name: /hello@aurum\.example/ })).toHaveCount(0)
  await expect(header.getByRole('link', { name: /010 20-30/ })).toHaveCount(0)
  // The header's own switcher is visible from `md`, so the menu does not draw a second one.
  await expect(header.getByRole('button', { name: 'Language: EN' })).toHaveCount(1)
})

/**
 * The failure a full-screen overlay introduces that a small dropdown does not: the page is
 * invisible but still in the tab order, so a keyboard user walks into content they cannot see.
 */
test('the page behind the menu cannot be reached or scrolled', async ({ page }) => {
  await openMenu(page, 390, 844)

  const state = await page.evaluate(() => ({
    main: document.querySelector('main')?.hasAttribute('inert'),
    overflow: getComputedStyle(document.documentElement).overflow,
  }))
  expect(state.main, 'the covered page is still in the tab order').toBe(true)
  expect(state.overflow, 'the page behind can still be scrolled').toBe('hidden')

  // And both are given back — a menu that leaves the page inert is worse than one that never
  // hid it.
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Open menu' })).toBeFocused()

  const released = await page.evaluate(() => ({
    main: document.querySelector('main')?.hasAttribute('inert'),
    overflow: getComputedStyle(document.documentElement).overflow,
  }))
  expect(released.main).toBe(false)
  expect(released.overflow).not.toBe('hidden')
})

/**
 * The cross and the burger are one control, so the state is announced rather than only drawn.
 */
test('the burger becomes the cross that closes the menu', async ({ page }) => {
  await openMenu(page, 390, 844)

  const close = page.getByRole('button', { name: 'Close menu' })
  await expect(close).toHaveAttribute('aria-expanded', 'true')
  await expect(page.getByRole('button', { name: 'Open menu' })).toHaveCount(0)

  await close.click()
  await expect(page.getByRole('navigation', { name: 'Primary' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Open menu' })).toHaveAttribute(
    'aria-expanded',
    'false',
  )
})

/**
 * The header — and with it the cross — is hidden from `xl` up. A menu left open across that
 * boundary would hold the page's scroll with nothing on screen able to release it.
 */
test('a menu left open when the header goes away closes itself', async ({ page }) => {
  await openMenu(page, 1024, 900)

  await page.setViewportSize({ width: 1440, height: 900 })

  // The menu's social marks are the one thing only the menu draws, so their absence is the
  // unambiguous signal that it closed rather than merely went out of sight.
  await expect(page.locator('header').getByRole('link', { name: 'WhatsApp' })).toHaveCount(0)
  await expect
    .poll(() => page.evaluate(() => getComputedStyle(document.documentElement).overflow))
    .not.toBe('hidden')
  expect(
    await page.evaluate(() => document.querySelector('main')?.hasAttribute('inert')),
    'the page was left inert with no way to release it',
  ).toBe(false)
})

/**
 * The drawer arrives and leaves rather than appearing and vanishing.
 *
 * Asserted as a contract — what is transitioned, for how long — rather than by sampling a frame
 * mid-flight, which is a race against the machine the suite happens to be running on. The one
 * timing-dependent check is the exit, and it is the point: without `display` in the transition and
 * `allow-discrete` behind it, the panel is gone on the frame it is closed and there is nothing to
 * animate.
 */
test('the drawer animates in and out', async ({ page }) => {
  const panel = await openMenu(page, 390, 844)

  const style = await panel.evaluate((el) => {
    const computed = getComputedStyle(el)
    return {
      property: computed.transitionProperty,
      duration: computed.transitionDuration,
      behavior: computed.transitionBehavior,
    }
  })
  expect(style.property).toContain('clip-path')
  expect(style.property).toContain('opacity')
  expect(style.property).toContain('display')
  expect(style.behavior).toContain('allow-discrete')
  expect(style.duration).toContain('0.2s')

  // Once it settles the clip is fully open, so nothing of the panel is cut off at rest. Polled,
  // because `openMenu` returns as soon as the panel has been placed — and a clipped panel has a
  // box from its first frame, so there is nothing in the layout to wait on.
  await expect
    .poll(() => panel.evaluate((el) => getComputedStyle(el).clipPath))
    .toBe('inset(0px)')

  // The exit plays: the panel is still displayed on the far side of the click that closed it.
  await page.getByRole('button', { name: 'Close menu' }).click()
  expect(
    await panel.evaluate((el) => getComputedStyle(el).display),
    'the drawer was removed before it could animate out',
  ).toBe('flex')
  await expect.poll(() => panel.evaluate((el) => getComputedStyle(el).display)).toBe('none')
})

test('the drawer does not animate for a visitor who asks for less motion', async ({ browser }) => {
  const context = await browser.newContext({
    reducedMotion: 'reduce',
    viewport: { width: 390, height: 844 },
  })
  const page = await context.newPage()
  await page.goto(MENU_STORY, { waitUntil: 'load' })
  await page.getByRole('button', { name: 'Open menu' }).click()

  const controls = await page
    .getByRole('button', { name: 'Close menu' })
    .getAttribute('aria-controls')
  const panel = page.locator(`[id="${controls}"]`)
  // `transition-none` removes the properties rather than zeroing the clock, so the property list is
  // what carries the guarantee. The duration is left at its declared value and means nothing when
  // nothing is being transitioned.
  expect(await panel.evaluate((el) => getComputedStyle(el).transitionProperty)).toBe('none')

  // Still opens and closes — suppressed motion is not suppressed function.
  await expect(panel).toBeVisible()
  await page.getByRole('button', { name: 'Close menu' }).click()
  await expect(panel).toBeHidden()

  await context.close()
})

/**
 * The language menu sits 80px from the foot of the drawer. Opening downward there put it past the
 * bottom of a container that scrolls, which grew that container's scroll height — a scrollbar on a
 * drawer that fits.
 */
test('the language menu opens upward when there is no room below it', async ({ page }) => {
  const panel = await openMenu(page, 390, 844)

  const trigger = page.getByRole('button', { name: 'Language: EN' })
  await trigger.click()

  const menu = page.getByRole('menu', { name: 'Language: EN' })
  const [above, below] = [(await menu.boundingBox())!, (await trigger.boundingBox())!]
  expect(
    above.y + above.height,
    'the language menu opened downward off the screen',
  ).toBeLessThanOrEqual(below.y + 1)

  expect(
    await panel.evaluate((el) => el.scrollHeight > el.clientHeight + 1),
    'the open menu gave the drawer a scrollbar',
  ).toBe(false)
})

test('the language menu still opens downward in the header, where there is room', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(MENU_STORY, { waitUntil: 'load' })

  const trigger = page.getByRole('button', { name: 'Language: EN' })
  await trigger.click()

  const menu = page.getByRole('menu', { name: 'Language: EN' })
  const [panel, box] = [(await menu.boundingBox())!, (await trigger.boundingBox())!]
  expect(panel.y, 'the ordinary downward menu flipped for no reason').toBeGreaterThanOrEqual(
    box.y + box.height - 1,
  )
})

/**
 * Escape belongs to the innermost thing that is open. Both layers listen on `document`, and the
 * drawer's listener is registered first because the drawer opened first — so the inner menu cannot
 * stop it by propagation alone.
 */
test('Escape closes the language menu without closing the drawer under it', async ({ page }) => {
  await openMenu(page, 390, 844)

  await page.getByRole('button', { name: 'Language: EN' }).click()
  await expect(page.getByRole('menu', { name: 'Language: EN' })).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(page.getByRole('menu', { name: 'Language: EN' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Close menu' })).toBeVisible()

  // The second one closes the drawer, and focus comes back to the control that opened it.
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Open menu' })).toBeFocused()
})

/**
 * The three primitives spec 003 adds (T241–T243). What is tested here is what the drawing cannot
 * show: a slider whose handles have collapsed onto one another, a dialog's focus, and a viewer
 * driven from the keyboard.
 */
const SLIDER_STORY = `${STORYBOOK}/iframe.html?id=ui-rangeslider--default&viewMode=story`
const COLLAPSED_STORY = `${STORYBOOK}/iframe.html?id=ui-rangeslider--collapsed&viewMode=story`

test('the range handles meet but never cross', async ({ page }) => {
  await page.goto(SLIDER_STORY, { waitUntil: 'networkidle' })

  const lower = page.getByRole('slider', { name: 'Minimum price' })
  const upper = page.getByRole('slider', { name: 'Maximum price' })

  // Drive the lower handle up past the upper one from the keyboard, which is the path that has no
  // pointer geometry to stop it.
  await lower.focus()
  await page.keyboard.press('End')
  expect(Number(await lower.inputValue())).toBe(Number(await upper.inputValue()))

  await upper.focus()
  await page.keyboard.press('Home')
  expect(Number(await lower.inputValue())).toBeGreaterThanOrEqual(Number(await upper.inputValue()))
})

/**
 * Two handles on the same value is the state a stacked-input slider gets permanently stuck in:
 * whichever input is on top swallows every press, and the pair can never be pulled apart.
 */
test('a collapsed pair can be pulled apart from either side', async ({ page }) => {
  await page.goto(COLLAPSED_STORY, { waitUntil: 'networkidle' })

  const group = page.getByRole('group', { name: 'Price' })
  const box = (await group.boundingBox())!
  const lower = page.getByRole('slider', { name: 'Minimum price' })
  const upper = page.getByRole('slider', { name: 'Maximum price' })
  const before = await lower.inputValue()

  // Approach from the left: the lower handle is the nearer one and must be the one that moves.
  await page.mouse.move(box.x + box.width * 0.15, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.up()
  expect(Number(await lower.inputValue()), 'the left press moved neither handle').toBeLessThan(
    Number(before),
  )

  // And from the right, the upper one.
  await page.mouse.move(box.x + box.width * 0.9, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.up()
  expect(Number(await upper.inputValue()), 'the right press moved neither handle').toBeGreaterThan(
    Number(before),
  )
})

test('the slider submits as two ordinary form fields', async ({ page }) => {
  await page.goto(`${STORYBOOK}/iframe.html?id=ui-rangeslider--in-a-form&viewMode=story`, {
    waitUntil: 'networkidle',
  })

  await expect(page.getByRole('slider', { name: 'Minimum price' })).toHaveAttribute(
    'name',
    'minPrice',
  )
  await expect(page.getByRole('slider', { name: 'Maximum price' })).toHaveAttribute(
    'name',
    'maxPrice',
  )
})

const DRAWER_STORY = `${STORYBOOK}/iframe.html?id=ui-drawer--default&viewMode=story`

test('the drawer traps focus and gives it back to the trigger', async ({ page }) => {
  await page.goto(DRAWER_STORY, { waitUntil: 'networkidle' })

  const dialog = page.getByRole('dialog', { name: 'Filters' })
  await expect(dialog).toBeVisible()

  // Tab all the way round. Focus must never leave the panel — the trigger behind it is reachable
  // in the DOM and would be the first thing a leaking trap lands on.
  for (let press = 0; press < 30; press += 1) {
    await page.keyboard.press('Tab')
    expect(
      await dialog.evaluate((panel) => panel.contains(document.activeElement)),
      `focus escaped the drawer after ${press + 1} presses`,
    ).toBe(true)
  }

  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(page.getByRole('button', { name: 'Filters' })).toBeFocused()
})

test('the drawer scrolls its body and keeps the actions in place', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 600 })
  await page.goto(DRAWER_STORY, { waitUntil: 'networkidle' })

  const apply = page.getByRole('button', { name: 'Apply' })
  const before = (await apply.boundingBox())!

  const body = page.getByRole('dialog', { name: 'Filters' }).locator('div.overflow-y-auto')
  expect(
    await body.evaluate((element) => element.scrollHeight > element.clientHeight + 1),
    'the story is not tall enough to prove anything about scrolling',
  ).toBe(true)

  await body.evaluate((element) => element.scrollTo(0, element.scrollHeight))
  expect((await apply.boundingBox())!.y, 'the actions scrolled away with the body').toBeCloseTo(
    before.y,
    0,
  )
})

test('a closed drawer is out of the tab order entirely', async ({ page }) => {
  await page.goto(`${STORYBOOK}/iframe.html?id=ui-drawer--closed&viewMode=story`, {
    waitUntil: 'networkidle',
  })
  await expect(page.getByRole('dialog', { name: 'Filters' })).toBeHidden()
  await expect(page.getByRole('checkbox', { name: 'Rings' })).toBeHidden()
})

const LIGHTBOX_STORY = `${STORYBOOK}/iframe.html?id=ui-lightbox--default&viewMode=story`
const RING = 'Paragon Emerald Cut Diamond Engagement Ring'

test('the viewer moves between photographs with the arrow keys, and wraps', async ({ page }) => {
  await page.goto(LIGHTBOX_STORY, { waitUntil: 'networkidle' })

  const status = page.getByRole('dialog', { name: `Photographs of ${RING}` }).locator('.sr-only')
  await expect(status).toHaveText('Photograph 1 of 5')

  await page.keyboard.press('ArrowRight')
  await expect(status).toHaveText('Photograph 2 of 5')

  // Backwards past the first: a viewer that stops dead there makes the press do nothing, with no
  // visible end marker to explain why.
  await page.keyboard.press('ArrowLeft')
  await page.keyboard.press('ArrowLeft')
  await expect(status).toHaveText('Photograph 5 of 5')
})

test('the viewer draws no arrows for a single photograph', async ({ page }) => {
  await page.goto(`${STORYBOOK}/iframe.html?id=ui-lightbox--single-photograph&viewMode=story`, {
    waitUntil: 'networkidle',
  })
  await expect(page.getByRole('button', { name: `Next photograph of ${RING}` })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Close' })).toBeVisible()
})

test('the viewer closes on Escape and returns focus to what opened it', async ({ page }) => {
  await page.goto(LIGHTBOX_STORY, { waitUntil: 'networkidle' })

  const dialog = page.getByRole('dialog', { name: `Photographs of ${RING}` })
  await expect(dialog).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(page.getByRole('button', { name: 'Open the photograph' })).toBeFocused()
})
