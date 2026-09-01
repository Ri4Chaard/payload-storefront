import config from '@payload-config'
import { expect, test } from '@playwright/test'
import { getPayload } from 'payload'

import { issueCode } from '@/lib/auth/codes'

/**
 * US1 end to end (spec 004) — the journey a first-time customer actually takes.
 *
 * **The code is minted rather than read out of an inbox.** It is stored as a keyed hash, so nothing
 * can read it back; the test does what the resend path does — issues a fresh code against the same
 * Payload token — and types that. The email itself is covered by the transport check, and asserting
 * against a real mailbox would make the suite depend on Resend being up.
 */
const password = 'a-long-enough-password'

const fresh = () =>
  `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@aurum-testing.dev`

async function codeFor(email: string): Promise<string> {
  const payload = await getPayload({ config })
  const found = await payload.find({
    collection: 'customers',
    limit: 1,
    overrideAccess: true,
    showHiddenFields: true,
    where: { email: { equals: email } },
  })

  const token = (found.docs[0] as { _verificationToken?: string } | undefined)?._verificationToken
  if (!token) throw new Error(`no verification token for ${email}`)

  const issued = await issueCode(email, 'verify-email', token, { bypassThrottle: true })
  if (!issued.ok) throw new Error('could not issue a code')
  return issued.code
}

test.afterAll(async () => {
  const payload = await getPayload({ config })
  await payload.delete({
    collection: 'verification-codes',
    overrideAccess: true,
    where: { email: { like: '@aurum-testing.dev' } },
  })
  await payload.delete({
    collection: 'customers',
    overrideAccess: true,
    where: { email: { like: '@aurum-testing.dev' } },
  })
})

test('a visitor registers, pastes the code, and reaches the success screen', async ({ page }) => {
  const email = fresh()

  await page.goto('/create-account')
  await expect(page.getByRole('heading', { name: 'CREATE ACCOUNT' })).toBeVisible()

  await page.getByPlaceholder('Email Address').fill(email)
  await page.getByPlaceholder('Password', { exact: true }).fill(password)
  await page.getByPlaceholder('Confirm Password').fill(password)

  // Unticked, and registration still succeeds (FR-036a).
  await expect(page.getByRole('checkbox')).not.toBeChecked()
  await page.getByRole('button', { name: 'Create Account' }).click()

  await page.waitForURL(/\/verify-email/)
  await expect(page.getByRole('heading', { name: 'VERIFY YOUR EMAIL' })).toBeVisible()

  const code = await codeFor(email)

  // Paste, the way a customer does — into the fourth box, to prove the group handles it.
  const boxes = page.getByRole('textbox')
  await boxes.nth(3).click()
  await boxes.nth(3).evaluate((el, value) => {
    const data = new DataTransfer()
    data.setData('text', value)
    el.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, clipboardData: data }))
  }, code)

  // `onComplete` submits for them, so the success screen arrives without a further click.
  await expect(page.getByRole('heading', { name: 'Successful registration' })).toBeVisible({
    timeout: 15_000,
  })

  const payload = await getPayload({ config })
  const found = await payload.find({
    collection: 'customers',
    overrideAccess: true,
    where: { email: { equals: email } },
  })
  expect(found.docs[0]?._verified).toBe(true)
})

test('a mismatched confirmation is refused against that field', async ({ page }) => {
  await page.goto('/create-account')
  await page.getByPlaceholder('Email Address').fill(fresh())
  await page.getByPlaceholder('Password', { exact: true }).fill(password)
  await page.getByPlaceholder('Confirm Password').fill('something-else-entirely')
  await page.getByRole('button', { name: 'Create Account' }).click()

  await expect(page.getByText('The two passwords do not match.')).toBeVisible()
  await expect(page).toHaveURL(/\/create-account/)
})

test('a wrong code is refused in place, and the customer can try again', async ({ page }) => {
  const email = fresh()

  await page.goto('/create-account')
  await page.getByPlaceholder('Email Address').fill(email)
  await page.getByPlaceholder('Password', { exact: true }).fill(password)
  await page.getByPlaceholder('Confirm Password').fill(password)
  await page.getByRole('button', { name: 'Create Account' }).click()
  await page.waitForURL(/\/verify-email/)

  const code = await codeFor(email)
  const wrong = code === '000000' ? '111111' : '000000'

  const boxes = page.getByRole('textbox')
  await boxes.first().click()
  await page.keyboard.type(wrong)

  await expect(page.getByText('Invalid code. Please try again.')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByRole('heading', { name: 'VERIFY YOUR EMAIL' })).toBeVisible()
})

test('the verification screen cannot be entered without an address', async ({ page }) => {
  await page.goto('/verify-email')
  await expect(page).toHaveURL(/\/create-account/)
})
