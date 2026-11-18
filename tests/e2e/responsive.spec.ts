import config from '@payload-config'
import { expect, test, type Page } from '@playwright/test'
import { getPayload } from 'payload'

/**
 * The widths the design never drew, and the motion preference it never considered (spec 004,
 * FR-042, T563; FR-021, T564).
 *
 * **This exists because the design has no frame below 1920.** Every narrow layout in this feature
 * is a derivation from the existing breakpoints rather than a transcription of something drawn, and
 * a derivation is exactly the kind of thing that is right when it is written and wrong three
 * commits later. A manual pass at four widths proves the state of one afternoon; this proves it on
 * every run.
 *
 * **The assertion is horizontal overflow, because that is the failure that actually happens.** Not
 * "does it look right" — no test can hold that — but "does anything stick out past the viewport",
 * which is the specific defect a layout built at 1920 produces at 320 and the one that makes a page
 * unusable rather than merely ugly. It found one: six 56px OTP boxes and five 10px gaps need 386px
 * of a 320px screen, so both code screens ran off the side. Fixed in `otp-input.tsx`.
 *
 * The element-level check matters more than `scrollWidth`. A page whose overflowing child is inside
 * something with `overflow: hidden` has a clean `scrollWidth` and a control the customer cannot
 * reach, so the offenders list is what the failure message prints.
 */
const WIDTHS = [1024, 768, 390, 320]

/** Every route this feature added. The catalogue's own widths are spec 003's problem. */
const ROUTES = [
  // 006/T037. Bands drawn only at 1920, 768 and 390, so 1024 and 320 are both derivations — which
  // is precisely the case this file exists for.
  '/about',
  '/sign-in',
  '/create-account',
  '/forgot-password',
  '/verify-email?email=responsive%40aurum-testing.dev',
  '/reset-password?email=responsive%40aurum-testing.dev',
  /*
    008/T098. Drawn at 1920, 768 and 390, so 1024 and 320 are derivations again — and the contact
    page is the one most exposed to them: a four-across card grid, a form whose two top fields sit
    side by side above `md`, and a band that splits the viewport in half at `xl`. Three arrangements
    that each have to collapse without anything sticking out past the edge.
  */
  '/contact',
  '/faq',
]

const PASSWORD = 'a-long-enough-password'
const created: string[] = []

interface Overflow {
  docWidth: number
  offenders: string[]
  scrollWidth: number
}

async function overflow(page: Page): Promise<Overflow> {
  return page.evaluate(() => {
    const docWidth = document.documentElement.clientWidth
    const offenders: string[] = []

    for (const el of Array.from(document.querySelectorAll('*'))) {
      const rect = el.getBoundingClientRect()
      // A 1px tolerance: sub-pixel layout rounding is not a defect.
      if (rect.width > 0 && (rect.right > docWidth + 1 || rect.left < -1)) {
        const classes = String((el as HTMLElement).className ?? '').slice(0, 60)
        offenders.push(`${el.tagName.toLowerCase()}.${classes} right=${Math.round(rect.right)}`)
      }
    }

    return { docWidth, offenders: offenders.slice(0, 5), scrollWidth: document.documentElement.scrollWidth }
  })
}

async function signedIn(page: Page) {
  const email = `e2e-responsive-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@responsive.aurum-testing.dev`
  created.push(email)

  const payload = await getPayload({ config })
  await payload.create({
    collection: 'customers',
    data: { email, firstName: 'Ada', lastName: 'Lovelace', password: PASSWORD },
    disableVerificationEmail: true,
    overrideAccess: true,
  })
  await payload.update({
    collection: 'customers',
    data: { _verified: true },
    overrideAccess: true,
    where: { email: { equals: email } },
  })

  await page.goto('/sign-in')
  await page.getByPlaceholder('Email Address').fill(email)
  await page.getByPlaceholder('Password', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Log in' }).click()
  await expect(page.getByRole('heading', { name: 'My account' })).toBeVisible({ timeout: 20_000 })
}

test.afterAll(async () => {
  if (created.length === 0) return

  const payload = await getPayload({ config })
  await payload.delete({
    collection: 'customers',
    overrideAccess: true,
    where: { email: { in: created } },
  })
})

for (const width of WIDTHS) {
  for (const route of ROUTES) {
    test(`${route} fits at ${width}`, async ({ page }) => {
      await page.setViewportSize({ height: 900, width })
      await page.goto(route)
      await page.waitForLoadState('networkidle')

      const result = await overflow(page)
      expect(result.offenders, `${route} @${width}`).toEqual([])
      expect(result.scrollWidth).toBeLessThanOrEqual(result.docWidth + 1)
    })
  }

  /** The profile and all three of its modals, which are where this feature's widest content sits. */
  test(`/account and its modals fit at ${width}`, async ({ page }) => {
    await page.setViewportSize({ height: 900, width })
    await signedIn(page)

    expect((await overflow(page)).offenders, `/account @${width}`).toEqual([])

    for (const opener of ['Edit full name', 'Add address']) {
      await page.getByRole('button', { name: opener }).first().click()
      await expect(page.getByRole('dialog')).toBeVisible()
      expect((await overflow(page)).offenders, `${opener} @${width}`).toEqual([])
      await page.keyboard.press('Escape')
      await expect(page.getByRole('dialog')).toBeHidden()
    }

    await page.getByRole('button', { name: 'Change password' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    expect((await overflow(page)).offenders, `Change password @${width}`).toEqual([])
  })
}

/**
 * FR-021 — the global rule in `styles.css` collapses every duration, and this is the check that it
 * reaches the things this feature added.
 *
 * Asserted on computed style rather than by watching an animation: the rule sets 0.01ms, so a test
 * that measured elapsed time would be timing the test runner. What matters is that the declaration
 * wins, including on the modal entrance — the one bit of motion a customer cannot dismiss.
 */
test.describe('reduced motion', () => {
  test('every transition this feature added is collapsed', async ({ page }) => {
    /**
     * `page.emulateMedia`, not `test.use({ reducedMotion })`.
     *
     * The declarative form did not reach the page here — `window.matchMedia` reported `false` and
     * every duration came back at its full value, which reads exactly like the global rule being
     * broken. It is not: the imperative call flips the same switch and the durations collapse to
     * 1e-05s. Worth the note, because the failure it produces accuses the wrong file.
     */
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await signedIn(page)

    const durations = async () =>
      page.evaluate(() =>
        Array.from(document.querySelectorAll('*'))
          .map((el) => getComputedStyle(el).transitionDuration)
          .filter((value) => value && value !== '0s')
          .filter((value) => !value.split(', ').every((part) => parseFloat(part) <= 0.001)),
      )

    expect(await durations()).toEqual([])

    // The modal entrance specifically — it is the only motion here that plays without being asked
    // for, so it is the one worth naming rather than trusting to the wildcard above.
    await page.getByRole('button', { name: 'Edit full name' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    expect(await durations()).toEqual([])
  })
})
