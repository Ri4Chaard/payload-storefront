import { expect, test, type Page } from '@playwright/test'

/**
 * The cookie consent journey, end to end (spec 009, T026, T046).
 *
 * **Every test starts from a browser that has never decided.** Playwright gives each test its own
 * context, so that is the default rather than something to arrange — which matters, because almost
 * every assertion here is about what happens the FIRST time somebody is asked.
 *
 * Nothing in this file touches Payload. The banner's configuration is read from the seeded
 * `cookie-settings` global as a visitor would find it; the tests that need a different
 * configuration live in `policies-admin.spec.ts`, where changing shared content is already
 * serialised.
 */

const COOKIE = 'aurum-consent'

const banner = (page: Page) => page.getByRole('region', { name: 'Cookie consent' })
const chooser = (page: Page) => page.getByRole('dialog', { name: 'Cookie settings' })

const consentCookie = async (page: Page) => {
  const cookies = await page.context().cookies()
  return cookies.find((cookie) => cookie.name === COOKIE)
}

/** The record as stored, decoded. */
const decoded = async (page: Page) => {
  const cookie = await consentCookie(page)
  return cookie ? JSON.parse(decodeURIComponent(cookie.value)) : null
}

test.describe('the three choices', () => {
  test('the banner appears for a visitor who has not decided', async ({ page }) => {
    await page.goto('/')

    await expect(banner(page)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Agree' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Configure All Cookies' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Allow Technical Cookies' })).toBeVisible()
  })

  test('Agree closes it, and it does not come back', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Agree' }).click()
    await expect(banner(page)).toBeHidden()

    await page.goto('/faq')
    await expect(banner(page)).toBeHidden()

    await page.reload()
    await expect(banner(page)).toBeHidden()
  })

  test('Allow Technical Cookies records a refusal of everything optional', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Allow Technical Cookies' }).click()
    await expect(banner(page)).toBeHidden()

    const record = await decoded(page)
    expect(record.a).toEqual(['necessary'])
    expect(record.o).toEqual(['necessary'])
  })

  test('the decision survives a new tab in the same browser', async ({ page, context }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Agree' }).click()
    await expect(banner(page)).toBeHidden()

    const second = await context.newPage()
    await second.goto('/')
    await expect(banner(second)).toBeHidden()
    await second.close()
  })

  test('ignoring it leaves it there, unanswered, on the next page', async ({ page }) => {
    await page.goto('/')
    await expect(banner(page)).toBeVisible()

    await page.goto('/legal/privacy')
    await expect(banner(page)).toBeVisible()
    expect(await consentCookie(page)).toBeUndefined()
  })
})

test.describe('what gets stored', () => {
  test('the record remembers what was on offer, not just what was accepted', async ({ page }) => {
    // The FR-027a guard, observed end to end: `o` is what makes a later category a new question
    // rather than something an old "Agree" silently covers.
    await page.goto('/')
    await page.getByRole('button', { name: 'Agree' }).click()

    const record = await decoded(page)
    expect(Array.isArray(record.o)).toBe(true)
    expect(record.o.length).toBeGreaterThan(0)
    expect(record.v).toBeGreaterThanOrEqual(1)
    expect(typeof record.t).toBe('number')
  })

  test('the consent cookie is readable by script and lives for 180 days', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Agree' }).click()

    const cookie = await consentCookie(page)

    // Not httpOnly: the banner reads it in the browser, which is what keeps `cookies()` out of the
    // root layout and every route prerenderable.
    expect(cookie?.httpOnly).toBe(false)
    expect(cookie?.sameSite).toBe('Lax')
    expect(cookie?.path).toBe('/')

    const days = ((cookie?.expires ?? 0) * 1000 - Date.now()) / 86_400_000
    expect(days).toBeGreaterThan(179)
    expect(days).toBeLessThan(181)
  })

  test('nothing is stored before a decision is made (FR-037)', async ({ page }) => {
    await page.goto('/')
    await page.goto('/all-products')

    expect(await consentCookie(page)).toBeUndefined()

    const storage = await page.evaluate(() => ({
      local: window.localStorage.length,
      session: window.sessionStorage.length,
    }))

    expect(storage).toEqual({ local: 0, session: 0 })
  })
})

test.describe('the chooser', () => {
  test('Configure All Cookies opens it, explaining the necessary category', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Configure All Cookies' }).click()

    await expect(chooser(page)).toBeVisible()
    await expect(chooser(page).getByText('Strictly necessary')).toBeVisible()
    await expect(chooser(page).getByText('Always on')).toBeVisible()
  })

  test('says plainly that nothing optional is in use (FR-047, T052)', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Configure All Cookies' }).click()

    await expect(chooser(page).getByText(/nothing optional to choose from/i)).toBeVisible()
  })

  test('saving records the decision and closes the banner', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Configure All Cookies' }).click()
    await chooser(page).getByRole('button', { name: 'Save my choices' }).click()

    await expect(chooser(page)).toBeHidden()
    await expect(banner(page)).toBeHidden()
    expect((await decoded(page)).a).toEqual(['necessary'])
  })

  test('Escape closes it without recording anything', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Configure All Cookies' }).click()
    await expect(chooser(page)).toBeVisible()

    await page.keyboard.press('Escape')

    await expect(chooser(page)).toBeHidden()
    await expect(banner(page)).toBeVisible()
    expect(await consentCookie(page)).toBeUndefined()
  })
})

test.describe('changing your mind', () => {
  test('the footer reopens the chooser after a decision (FR-032)', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Agree' }).click()
    await expect(banner(page)).toBeHidden()

    await page.locator('footer').getByRole('button', { name: 'Cookie Settings' }).click()

    await expect(chooser(page)).toBeVisible()
  })

  test('the re-entry point is present on every page', async ({ page }) => {
    for (const route of ['/', '/faq', '/legal/privacy']) {
      await page.goto(route)
      await expect(
        page.locator('footer').getByRole('button', { name: 'Cookie Settings' }),
      ).toBeVisible()
    }
  })
})

test.describe('the page stays usable while the banner is up', () => {
  test('the banner does not trap focus or block the page (FR-024)', async ({ page }) => {
    await page.goto('/')
    await expect(banner(page)).toBeVisible()

    // A link in the page behind the banner is still reachable and still works.
    await page.locator('footer').getByRole('link', { name: 'Privacy Policy' }).click()
    await expect(page).toHaveURL('/legal/privacy')
    await expect(banner(page)).toBeVisible()
  })

  test('every banner control is reachable by keyboard', async ({ page }) => {
    await page.goto('/')
    await expect(banner(page)).toBeVisible()

    for (const name of ['Agree', 'Configure All Cookies', 'Allow Technical Cookies']) {
      await page.getByRole('button', { name }).focus()
      await expect(page.getByRole('button', { name })).toBeFocused()
    }
  })

  test('it stands down while a modal dialog owns the screen (FR-024)', async ({ page }) => {
    /*
      Found by the accessibility sweep on `/account`, not by review. A dialog's scrim is drawn over
      everything behind it, and the banner is `position: fixed` — so it is not covered by the
      `inert` that `useOverlay` applies to `main` and `footer`. It stayed live underneath at 3.23:1
      contrast, with three buttons in the page that a focus trap said were unreachable.
    */
    await page.goto('/')
    await expect(banner(page)).toBeVisible()

    await page.getByRole('button', { name: 'Configure All Cookies' }).click()
    await expect(chooser(page)).toBeVisible()

    // The banner is gone while the dialog is up, and nothing has been recorded.
    await expect(banner(page)).toBeHidden()
    expect(await consentCookie(page)).toBeUndefined()

    // And it returns when the dialog closes without a decision.
    await page.keyboard.press('Escape')
    await expect(chooser(page)).toBeHidden()
    await expect(banner(page)).toBeVisible()
  })

  test('the banner adds no horizontal scrolling at 390px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')
    await expect(banner(page)).toBeVisible()

    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    )

    expect(overflows).toBe(false)
  })
})

/**
 * SC-004 and SC-008a — the central privacy claim of this feature, measured rather than asserted.
 *
 * The site says, in a policy it publishes, that it uses no analytics and no third-party tracking.
 * That sentence is only worth what it can be checked against, so this checks it: browse under each
 * possible decision and confirm that nothing beyond the four necessary cookies is stored and that
 * no request leaves this origin.
 *
 * It is a test rather than a manual step in the quickstart because it is the assertion most likely
 * to be quietly falsified later — by a font, an embed, or a dependency that phones home.
 */
test.describe('nothing optional is stored or contacted', () => {
  const ALLOWED = new Set([
    'aurum-consent',
    'aurum-cart',
    'aurum-cart-count',
    'payload-token',
  ])

  for (const decision of ['no decision', 'Agree', 'Allow Technical Cookies'] as const) {
    test(`with ${decision}, only necessary cookies exist and no third party is contacted`, async ({
      page,
      context,
      baseURL,
    }) => {
      const origin = new URL(baseURL ?? 'http://localhost:3000').origin
      const foreign = new Set<string>()

      page.on('request', (request) => {
        const url = new URL(request.url())
        if (url.protocol.startsWith('http') && url.origin !== origin) foreign.add(url.origin)
      })

      await page.goto('/')
      if (decision !== 'no decision') {
        await page.getByRole('button', { name: decision }).click()
        await expect(banner(page)).toBeHidden()
      }

      for (const route of ['/all-products', '/legal/cookies', '/faq']) {
        await page.goto(route)
      }

      const names = (await context.cookies()).map((cookie) => cookie.name)
      const unexpected = names.filter(
        (name) => ![...ALLOWED].some((allowed) => name.includes(allowed)),
      )

      expect(unexpected, `unexpected cookies: ${unexpected.join(', ')}`).toEqual([])
      expect([...foreign], 'this site contacts no third party').toEqual([])

      const storage = await page.evaluate(() => ({
        local: Object.keys(window.localStorage),
        session: Object.keys(window.sessionStorage),
      }))

      expect(storage.local).toEqual([])
      expect(storage.session).toEqual([])
    })
  }
})

test.describe('a browser that refuses to store anything', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('the banner still works and simply cannot remember (contract §5)', async ({ page }) => {
    await page.goto('/')

    // Every cookie write is rejected, the way a browser set to block storage would.
    await page.evaluate(() => {
      Object.defineProperty(document, 'cookie', {
        get: () => '',
        set: () => {},
        configurable: true,
      })
    })

    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))

    await page.getByRole('button', { name: 'Agree' }).click()

    // It closes for this page — nothing throws, and the visitor is not nagged about their own
    // privacy setting.
    await expect(banner(page)).toBeHidden()
    expect(errors).toEqual([])

    // And it is back on the next page, because there was nowhere to record the answer.
    await page.goto('/faq')
    await expect(banner(page)).toBeVisible()
  })
})
