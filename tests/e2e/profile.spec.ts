import config from '@payload-config'
import { expect, test } from '@playwright/test'
import { getPayload } from 'payload'

/**
 * US4 end to end (spec 004, FR-022 – FR-026) — the profile card and its one working control.
 *
 * The assertions a browser is genuinely needed for are the three about the modal: that Cancel keeps
 * the stored name AND discards the draft, that Save updates the row without a reload, and that the
 * row shows an empty state rather than a blank box. None of those is visible from the action.
 *
 * Its own subdomain, like every other account spec — Playwright runs spec files in parallel and each
 * one's `afterAll` deletes by a `like` match.
 */
const PASSWORD = 'a-long-enough-password'

/**
 * **Every address this worker made, so the cleanup can delete those and only those.**
 *
 * `test.afterAll` runs once PER WORKER, not once per file — and with `fullyParallel` a file's tests
 * are spread across workers. A cleanup that deletes `%@profile.aurum-testing.dev%` therefore fires
 * while other workers are still mid-test, and takes their customers with it. The session goes with
 * the row, so the next action redirects to sign-in and the assertion fails on a page it never
 * expected to see: not an error about the profile, an error about a name that is not on the screen.
 *
 * This module is instantiated per worker, so the list holds exactly what this worker is responsible
 * for. The wildcard stays as a safety net for a run that died before its cleanup.
 */
const created: string[] = []

const fresh = () => {
  const email = `e2e-profile-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@profile.aurum-testing.dev`
  created.push(email)
  return email
}

async function signedIn(page: import('@playwright/test').Page, named?: [string, string]) {
  const email = fresh()
  const payload = await getPayload({ config })

  await payload.create({
    collection: 'customers',
    data: {
      email,
      marketingEmail: false,
      password: PASSWORD,
      ...(named ? { firstName: named[0], lastName: named[1] } : {}),
    },
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

test.afterAll(async () => {
  if (created.length === 0) return

  const payload = await getPayload({ config })
  await payload.delete({
    collection: 'customers',
    overrideAccess: true,
    where: { email: { in: created } },
  })
})

/** FR-022 — the six rows, in the order the requirement fixes. */
test('the profile shows the customer’s own details in the required order', async ({ page }) => {
  const email = await signedIn(page, ['Ada', 'Lovelace'])

  const labels = await page.locator('dt').allTextContents()
  expect(labels).toEqual([
    'Email',
    'Full name',
    'Addresses',
    'Marketing preferences',
    'Security',
  ])

  await expect(page.getByText(email)).toBeVisible()
  await expect(page.getByText('Ada Lovelace')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible()
})

/**
 * FR-023 and US4 scenario 2. Asserted as the ABSENCE of a control rather than by reading the row:
  * "read-only" is only meaningful if there is no way to edit, and the way this regresses is somebody
 * adding a pencil for symmetry.
 */
test('the email row has no edit affordance', async ({ page }) => {
  await signedIn(page)

  await expect(page.getByRole('button', { name: 'Edit full name' })).toBeVisible()
  await expect(page.getByRole('button', { name: /edit email/i })).toHaveCount(0)
})

/** FR-025 and US4 scenario 5. */
test('a customer with no name sees an empty state, not a blank box', async ({ page }) => {
  await signedIn(page)

  await expect(page.getByText('No name added')).toBeVisible()
  await expect(page.getByText('No addresses added')).toBeVisible()
})

/** FR-024 and US4 scenario 3 — the row updates with no reload. */
test('saving a name updates the row in place', async ({ page }) => {
  await signedIn(page)

  await page.getByRole('button', { name: 'Edit full name' }).click()
  const modal = page.getByRole('dialog')
  await expect(modal).toBeVisible()

  await modal.getByPlaceholder('First name').fill('Ada')
  await modal.getByPlaceholder('Last name').fill('Lovelace')
  await modal.getByRole('button', { name: 'Save' }).click()

  await expect(modal).toBeHidden({ timeout: 15_000 })
  await expect(page.getByText('Ada Lovelace')).toBeVisible()
  await expect(page.getByText('No name added')).toHaveCount(0)

  // …and it is stored, not merely painted. A reload is the only way to tell those apart.
  await page.reload()
  await expect(page.getByText('Ada Lovelace')).toBeVisible()
})

/**
 * US4 scenario 4. Two assertions, and the second is the one that matters: Cancel must discard the
 * draft as well as decline to save it. A modal that reopens holding what you abandoned looks like
 * it saved.
 */
test('cancel keeps the stored name and discards the draft', async ({ page }) => {
  await signedIn(page, ['Ada', 'Lovelace'])

  await page.getByRole('button', { name: 'Edit full name' }).click()
  const modal = page.getByRole('dialog')
  await modal.getByPlaceholder('First name').fill('Augusta')
  await modal.getByRole('button', { name: 'Cancel' }).click()

  await expect(modal).toBeHidden()
  await expect(page.getByText('Ada Lovelace')).toBeVisible()

  await page.getByRole('button', { name: 'Edit full name' }).click()
  await expect(page.getByRole('dialog').getByPlaceholder('First name')).toHaveValue('Ada')
})

/**
 * The regression the Addresses row found (US5), asserted on the row that shares the mechanism.
 *
 * Saving revalidates `/account`, and applying that server tree while a dialog is open replaces the
 * inputs underneath the customer: the next keystroke reaches a DOM node React is no longer
 * listening to, the form still holds what was there before, and Save writes it back unchanged. It
 * only shows when a second edit follows a first closely enough to collide with the revalidation —
 * which is exactly what somebody correcting a typo does.
 */
test('a second edit straight after the first is not discarded', async ({ page }) => {
  await signedIn(page)

  await page.getByRole('button', { name: 'Edit full name' }).click()
  const modal = page.getByRole('dialog')
  await modal.getByPlaceholder('First name').fill('Ada')
  await modal.getByPlaceholder('Last name').fill('Lovelace')
  await modal.getByRole('button', { name: 'Save' }).click()
  await expect(modal).toBeHidden({ timeout: 15_000 })

  // No settling pause — the collision is the point.
  await page.getByRole('button', { name: 'Edit full name' }).click()
  await modal.getByPlaceholder('First name').fill('Augusta')
  await expect(modal.getByPlaceholder('First name')).toHaveValue('Augusta')
  await modal.getByRole('button', { name: 'Save' }).click()
  await expect(modal).toBeHidden({ timeout: 15_000 })

  await expect(page.getByText('Augusta Lovelace')).toBeVisible({ timeout: 15_000 })
  await page.reload()
  await expect(page.getByText('Augusta Lovelace')).toBeVisible()
})

/**
 * The dialog is a keyboard trap by design, and Escape is the way out of it. Checked here rather
 * than trusted from `Modal`'s own stories, because focus returning to the pencil is a property of
 * how this screen wires `triggerRef` (FR-046).
 */
test('escape closes the modal and returns focus to the control that opened it', async ({ page }) => {
  await signedIn(page)

  const pencil = page.getByRole('button', { name: 'Edit full name' })
  await pencil.click()
  await expect(page.getByRole('dialog')).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(pencil).toBeFocused()
})
