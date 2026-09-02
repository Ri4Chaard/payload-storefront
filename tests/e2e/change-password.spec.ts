import config from '@payload-config'
import { expect, test } from '@playwright/test'
import { getPayload } from 'payload'

/**
 * US7 end to end (spec 004, FR-020, FR-021) — the Change password modal.
 *
 * The browser is needed for the things the action cannot show: that the modal is reachable from the
 * Security row, that a wrong current password is refused against the field it concerns rather than
 * in a banner, and that the customer is still signed in afterwards — which is the half of FR-021
 * that is easy to break while implementing the other half.
 */
const CURRENT = 'a-long-enough-password'
const NEXT = 'an-entirely-different-one'

/** Per-worker, so this file's cleanup cannot delete a customer another worker is mid-test with. */
const created: string[] = []

const fresh = () => {
  const email = `e2e-changepw-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@changepw.aurum-testing.dev`
  created.push(email)
  return email
}

async function signedIn(page: import('@playwright/test').Page): Promise<string> {
  const email = fresh()
  const payload = await getPayload({ config })

  await payload.create({
    collection: 'customers',
    data: { email, password: CURRENT },
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
  await page.getByPlaceholder('Password', { exact: true }).fill(CURRENT)
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

test('a customer changes their password and stays signed in', async ({ page }) => {
  const email = await signedIn(page)

  await page.getByRole('button', { name: 'change password' }).click()
  const modal = page.getByRole('dialog')
  await expect(modal).toBeVisible()

  await modal.getByPlaceholder('Enter current password').fill(CURRENT)
  await modal.getByPlaceholder('Enter new password').fill(NEXT)
  await modal.getByPlaceholder('Confirm new password').fill(NEXT)
  await modal.getByRole('button', { name: 'Save' }).click()

  await expect(modal).toBeHidden({ timeout: 15_000 })

  // Still signed in on THIS device — the action replaces the cookie rather than dropping it, which
  // is the half of FR-021 that breaks while the other half is being written.
  await page.reload()
  await expect(page.getByRole('heading', { name: 'My account' })).toBeVisible()

  // …and the change is real: the new password signs in, the old one does not.
  await page.getByRole('button', { name: 'Sign out' }).click()
  await page.goto('/sign-in')
  await page.getByPlaceholder('Email Address').fill(email)
  await page.getByPlaceholder('Password', { exact: true }).fill(CURRENT)
  await page.getByRole('button', { name: 'Log in' }).click()

  const alert = page.locator('form').getByRole('alert')
  await expect(alert).toHaveText('That email address and password do not match.', {
    timeout: 15_000,
  })

  await page.getByPlaceholder('Password', { exact: true }).fill(NEXT)
  await page.getByRole('button', { name: 'Log in' }).click()
  await expect(page.getByRole('heading', { name: 'My account' })).toBeVisible({ timeout: 15_000 })
})

test('a wrong current password is refused against that field', async ({ page }) => {
  await signedIn(page)

  await page.getByRole('button', { name: 'change password' }).click()
  const modal = page.getByRole('dialog')

  await modal.getByPlaceholder('Enter current password').fill('not-the-password')
  await modal.getByPlaceholder('Enter new password').fill(NEXT)
  await modal.getByPlaceholder('Confirm new password').fill(NEXT)
  await modal.getByRole('button', { name: 'Save' }).click()

  await expect(modal.getByText('That is not your current password.')).toBeVisible({
    timeout: 15_000,
  })
  // Still open, so the customer can correct the one field that is wrong.
  await expect(modal).toBeVisible()
})

test('a mismatched confirmation is caught before a request is made', async ({ page }) => {
  await signedIn(page)

  await page.getByRole('button', { name: 'change password' }).click()
  const modal = page.getByRole('dialog')

  await modal.getByPlaceholder('Enter current password').fill(CURRENT)
  await modal.getByPlaceholder('Enter new password').fill(NEXT)
  await modal.getByPlaceholder('Confirm new password').fill('something-else-entirely')
  await modal.getByRole('button', { name: 'Save' }).click()

  await expect(modal.getByText('The two passwords do not match.')).toBeVisible()
})

/**
 * FR-020's route out. Without it the modal is a dead end for exactly the customer most likely to
 * open it — the one who cannot recall the password it is asking them to confirm.
 */
test('the modal offers a way to the reset flow', async ({ page }) => {
  await signedIn(page)

  await page.getByRole('button', { name: 'change password' }).click()
  await page.getByRole('dialog').getByRole('link', { name: 'Forgot password?' }).click()

  await expect(page.getByRole('heading', { name: 'FORGOT PASSWORD' })).toBeVisible({
    timeout: 15_000,
  })

  /**
   * …and the way back out is the one that is true for THIS visitor.
   *
   * The screen's drawn footer says "Back to sign in", which is right for someone locked out and
   * wrong for the customer who arrived here from the modal — they are signed in, so it is both a
   * false statement and a worse destination than the page they came from.
   */
  await expect(page.getByRole('link', { name: 'Back to my account' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Back to sign in' })).toHaveCount(0)

  await page.getByRole('link', { name: 'Back to my account' }).click()
  await expect(page.getByRole('heading', { name: 'My account' })).toBeVisible({ timeout: 15_000 })
})

/** The same line, for the visitor the screen was drawn for. */
test('an anonymous visitor is still offered the sign-in form', async ({ page }) => {
  await page.goto('/forgot-password')

  await expect(page.getByRole('link', { name: 'Back to sign in' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Back to my account' })).toHaveCount(0)
})

/** Cancel discards the three passwords rather than leaving them for whoever opens it next. */
test('cancel clears what was typed', async ({ page }) => {
  await signedIn(page)

  await page.getByRole('button', { name: 'change password' }).click()
  const modal = page.getByRole('dialog')
  await modal.getByPlaceholder('Enter current password').fill(CURRENT)
  await modal.getByRole('button', { name: 'Cancel' }).click()
  await expect(modal).toBeHidden()

  await page.getByRole('button', { name: 'change password' }).click()
  await expect(page.getByRole('dialog').getByPlaceholder('Enter current password')).toHaveValue('')
})
