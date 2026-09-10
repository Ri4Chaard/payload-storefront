import config from '@payload-config'
import { expect, test } from '@playwright/test'
import { getPayload } from 'payload'

/**
 * Editorial verification for the story page, as a test rather than an afternoon in the panel
 * (006/T044, T053).
 *
 * The Constitution makes this a merge gate: "Any change to a block or content model MUST be
 * verified in the Payload admin by actually creating and previewing content before merge. Shipping
 * a block that is unusable in the admin is a defect regardless of how well it renders." Spec 004
 * established that the checkable half of that belongs in a test, because a note saying somebody
 * looked once is worth less than an assertion that runs every time.
 *
 * Four claims, each of which would be a defect if false and none of which the storefront tests can
 * see:
 *
 *   1. The FAQ has its own tab, labelled FAQ — the thing the brief actually asked for.
 *   2. The story page is composed, with a control for adding bands and one row per band.
 *   3. A media slot offers photograph or video, and NO field into which an address can be pasted.
 *      This is FR-021's structural form and the only place it can be checked.
 *
 * **The poster requirement is deliberately NOT asserted here.** It belongs to this checklist, and a
 * draft of this file tried it — but driving Payload's own radio widget from the outside proved
 * unreliable (its styled span swallows the pointer event, and the underlying input is not
 * addressable by value), and the assertion is a duplicate: the same validator, reached through the
 * same access path the panel uses, is proven in
 * `tests/integration/story-page.test.ts` — "will not publish a slot set to video without a poster".
 * A flaky second copy of a passing test is worth less than the note saying where the first one is.
 *
 * The generous timeouts are for `next dev`, which compiles the admin panel on first request.
 */

const payload = await getPayload({ config })
const PASSWORD = 'a-long-enough-password'

test.describe.configure({ mode: 'serial' })

let email: string

test.beforeAll(async () => {
  email = `e2e-story-${Date.now()}@admin.aurum-testing.dev`
  await payload.create({
    collection: 'admins',
    data: { email, name: 'Story page editorial check', password: PASSWORD },
    overrideAccess: true,
  })
})

async function signIn(page: import('@playwright/test').Page) {
  await page.goto('/admin/login')
  await page.locator('#field-email').fill(email)
  await page.locator('#field-password').fill(PASSWORD)
  await page.getByRole('button', { name: 'Login', exact: true }).click()
  await page.waitForURL((url) => !url.pathname.includes('/admin/login'), { timeout: 120_000 })
}

test('the FAQ is its own tab, and the story page is composed of bands', async ({ page }) => {
  await signIn(page)

  // 1. The brief's actual request: "we should make faq as separate tab in the admin panel".
  await expect(page.getByRole('link', { name: 'FAQ', exact: true })).toBeVisible({
    timeout: 120_000,
  })
  await expect(page.getByRole('link', { name: 'Story page', exact: true })).toBeVisible()

  await page.goto('/admin/globals/story-page')

  // 2. Composed, not fixed: a control for adding a band, and the drawn seven already there.
  await expect(page.getByText('Bands', { exact: true }).first()).toBeVisible({ timeout: 120_000 })
  // "Add Band", not "Add Body": the control an editor presses has to say what it adds.
  await expect(page.getByRole('button', { name: /add band/i })).toBeVisible()

  for (const band of ['Page header', 'Full-width media', 'Detail band', 'Banner', 'Numbered steps', 'FAQ band']) {
    await expect(page.getByText(band, { exact: true }).first()).toBeVisible()
  }
})

test('a media slot offers a photograph or a video, and nowhere to paste an address', async ({
  page,
}) => {
  await signIn(page)
  await page.goto('/admin/globals/story-page')
  await expect(page.getByText('Bands', { exact: true }).first()).toBeVisible({ timeout: 120_000 })

  // 3. The kind switch an editor actually sees.
  await expect(page.getByText('A photograph', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('A video', { exact: true }).first()).toBeVisible()

  /*
   * FR-021, structurally. The requester asked for video "from media, not from the links", and the
   * strongest form of that is a form with nowhere to type one. Every media control is an upload
   * relationship; if a text input ever appears inside a slot, this fails.
   */
  const slotTextInputs = page.locator(
    '.field-type.group:has-text("Show") input[type="text"], .field-type.group:has-text("Show") input[type="url"]',
  )
  await expect(slotTextInputs).toHaveCount(0)
})
