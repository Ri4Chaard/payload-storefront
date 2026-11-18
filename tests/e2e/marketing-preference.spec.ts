import config from '@payload-config'
import { expect, test, type Page } from '@playwright/test'
import { getPayload } from 'payload'

/**
 * US6 end to end — the one switch on the profile.
 *
 * **What needs a browser here is persistence, not the toggle.** That a boolean can be written is
 * `tests/integration/us6-marketing.test.ts`'s job. What only a browser can show is that the switch
 * the customer left on is the switch they find on their next visit — the optimistic update makes
 * the control move whether or not anything was saved, so a test that clicks and asserts the
 * position immediately would pass against an action that did nothing at all. Every assertion below
 * therefore survives a reload.
 *
 * **The revert-on-failure path is not tested here.** Making the action fail from the browser means
 * either deleting the customer mid-flight — which redirects to sign-in and asserts something else
 * entirely — or stubbing a server action, which Playwright cannot do. It is one `setChecked(!next)`
 * in `MarketingToggle`, sitting next to the reasoning for it.
 *
 * Its own subdomain and a per-worker cleanup list, for the reason `profile.spec.ts` documents at
 * length: `afterAll` runs once per WORKER, so deleting by wildcard takes other workers' customers
 * with it.
 */
const PASSWORD = 'a-long-enough-password'

const created: string[] = []

const fresh = () => {
  const email = `e2e-marketing-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@marketing.aurum-testing.dev`
  created.push(email)
  return email
}

async function signedIn(page: Page, marketingEmail: boolean) {
  const email = fresh()
  const payload = await getPayload({ config })

  await payload.create({
    collection: 'customers',
    data: { email, marketingEmail, password: PASSWORD },
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
  await expect(page.getByRole('heading', { name: 'My account' })).toBeVisible({ timeout: 15_000 })

  return email
}

/**
 * The control, by role.
 *
 * `Switch` renders a real checkbox with `role="switch"` and an `sr-only` class, so the styled track
 * beside it intercepts a direct click. The surrounding `<label>` is what a customer actually hits,
 * and clicking it toggles the input natively.
 */
const toggle = (page: Page) => page.getByRole('switch', { name: /occasional news and offers/ })
const toggleLabel = (page: Page) => page.locator('label').filter({ has: toggle(page) })

/**
 * Click the switch and wait for the SAVE, not for the paint.
 *
 * The paint is optimistic — `MarketingToggle` moves the switch on the click, before the server has
 * been asked — so `toBeChecked()` says nothing about whether anything was written. Reloading on the
 * strength of it aborts the in-flight server action often enough to fail roughly one run in two,
 * and the failure reads as "the preference did not persist", which is a bug report about the
 * feature rather than about the test. Server actions POST to the current URL; waiting for that
 * response is the first moment there is anything to reload INTO.
 */
async function toggleAndSave(page: Page) {
  const saved = page.waitForResponse(
    (response) => response.request().method() === 'POST' && response.url().includes('/account'),
  )
  await toggleLabel(page).click()
  await saved
}

const storedPreference = async (email: string): Promise<boolean> => {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'customers',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    where: { email: { equals: email } },
  })
  return Boolean(docs[0]?.marketingEmail)
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

/** FR-022 — the row reports what is stored, before anybody touches it. */
test('the switch shows the stored preference', async ({ page }) => {
  await signedIn(page, true)

  await expect(toggle(page)).toBeChecked()
})

test('turning marketing on survives a reload', async ({ page }) => {
  const email = await signedIn(page, false)
  await expect(toggle(page)).not.toBeChecked()

  await toggleAndSave(page)
  await expect(toggle(page)).toBeChecked()

  // The assertion that matters. The optimistic update moved the switch on the click; this is the
  // first point at which the position could only have come from the database.
  await page.reload()
  await expect(toggle(page)).toBeChecked()
  expect(await storedPreference(email)).toBe(true)
})

test('turning marketing off survives a reload', async ({ page }) => {
  const email = await signedIn(page, true)
  await expect(toggle(page)).toBeChecked()

  await toggleAndSave(page)
  await expect(toggle(page)).not.toBeChecked()

  await page.reload()
  await expect(toggle(page)).not.toBeChecked()
  expect(await storedPreference(email)).toBe(false)
})

/**
 * FR-034 — consent is evidenced, and the evidence says where the choice was made.
 *
 * Asserted through the browser rather than only in the integration suite because this is the path
 * that produces `profile`: the same hook writes `registration` when the box is ticked at sign-up,
 * and nothing but a real click on this row distinguishes the two.
 */
test('a change made on the profile is recorded as made there', async ({ page }) => {
  const email = await signedIn(page, false)

  await toggleAndSave(page)
  await expect(toggle(page)).toBeChecked()
  await page.reload()

  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'customers',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    where: { email: { equals: email } },
  })

  expect(docs[0]?.marketingEmailSource).toBe('profile')
  expect(docs[0]?.marketingEmailUpdatedAt).toBeTruthy()
})
