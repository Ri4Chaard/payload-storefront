import config from '@payload-config'
import { expect, test } from '@playwright/test'
import { getPayload } from 'payload'

import { issueCode } from '@/lib/auth/codes'

/**
 * US3 end to end (spec 004, FR-017 – FR-021) — the three screens a customer who has forgotten their
 * password actually walks through.
 *
 * **The code is minted rather than read out of an inbox**, exactly as in `registration.spec.ts`: it
 * is stored as a keyed hash so nothing can read it back, and the test does what the resend path
 * does — issues a fresh code against the same Payload token. The suite runs with
 * `EMAIL_TRANSPORT=log` (see `playwright.config.ts`), so no mail leaves the machine either way.
 *
 * **Its own subdomain.** Playwright runs spec files in parallel and every spec's `afterAll` deletes
 * by a `like` match, so a shared namespace means one file deleting the account another is mid-flow
 * with. The symptom is a failure that only appears in a full run.
 */
const PASSWORD = 'a-long-enough-password'
const NEW_PASSWORD = 'an-entirely-different-one'

/**
 * **Every address this worker made, so the cleanup can delete those and only those.**
 *
 * `test.afterAll` runs once PER WORKER, not once per file, and `fullyParallel` spreads a file's
 * tests across workers. A cleanup matching `%@reset.aurum-testing.dev%` therefore fires while other workers are
 * still mid-test and takes their customers with it — and the session goes with the row, so the next
 * request redirects to sign-in and the failure appears somewhere else entirely, as an assertion
 * about a heading rather than about a deleted account. This module is instantiated per worker, so
 * the list holds exactly what this worker is responsible for.
 */
const created: string[] = []

const fresh = () => {
  const email = `e2e-reset-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@reset.aurum-testing.dev`
  created.push(email)
  return email
}

async function verifiedCustomer(): Promise<string> {
  const email = fresh()
  const payload = await getPayload({ config })

  await payload.create({
    collection: 'customers',
    data: { email, marketingEmail: false, password: PASSWORD },
    disableVerificationEmail: true,
    overrideAccess: true,
  })

  await payload.update({
    collection: 'customers',
    data: { _verified: true },
    overrideAccess: true,
    where: { email: { equals: email } },
  })

  return email
}

/**
 * A reset code the customer could have received, minted the way the resend path mints one.
 *
 * **It does not read the code the screen's own request produced, and that is deliberate.** Codes
 * are stored as a keyed hash, so no code can be read back — but more than that, the row only exists
 * if the email actually went out: `forgotPassword` writes the code inside the transaction that
 * sends, so a mail provider that is down, rate-limited, or simply not configured on a reused dev
 * server rolls the code away with it. A test that depended on that would report "no code was
 * issued", which is a sentence about this feature and not about a quota.
 *
 * So it mints its own: rotate the token through the Local API with the send suppressed, then alias
 * six digits to it. Called AFTER the screen has submitted, so whichever token the UI's own attempt
 * left behind, this is the one the code points at.
 */
async function resetCodeFor(email: string): Promise<string> {
  const payload = await getPayload({ config })

  const token = await payload.forgotPassword({
    collection: 'customers',
    data: { email },
    disableEmail: true,
  })

  if (!token) throw new Error(`no reset token for ${email}`)

  // The screen's own request started the cooldown; waiting it out per assertion is not a suite.
  const issued = await issueCode(email, 'reset-password', token, { bypassThrottle: true })
  if (!issued.ok) throw new Error('could not mint a reset code')
  return issued.code
}

test.afterAll(async () => {
  if (created.length === 0) return

  const payload = await getPayload({ config })
  await payload.delete({
    collection: 'verification-codes',
    overrideAccess: true,
    where: { email: { in: created } },
  })
  await payload.delete({
    collection: 'customers',
    overrideAccess: true,
    where: { email: { in: created } },
  })
})

/** SC-005: request, code, new password, back in — in one pass, through the screens. */
test('a customer resets a forgotten password and is signed in with the new one', async ({
  page,
}) => {
  const email = await verifiedCustomer()

  await page.goto('/sign-in')
  await page.getByRole('link', { name: 'Forgot password?' }).click()

  await expect(page.getByRole('heading', { name: 'FORGOT PASSWORD' })).toBeVisible()
  await page.getByPlaceholder('Email Address').fill(email)
  await page.getByRole('button', { name: 'Send Code' }).click()

  await expect(page.getByRole('heading', { name: 'ENTER THE CODE' })).toBeVisible({
    timeout: 15_000,
  })

  const boxes = page.getByRole('textbox')
  await boxes.first().click()
  await page.keyboard.type(await resetCodeFor(email))

  // `onComplete` submits the code, so the password screen arrives without a further click.
  await expect(page.getByRole('heading', { name: 'NEW PASSWORD' })).toBeVisible({ timeout: 15_000 })

  await page.getByPlaceholder('New Password').fill(NEW_PASSWORD)
  await page.getByPlaceholder('Confirm Password').fill(NEW_PASSWORD)
  await page.getByRole('button', { name: 'Save' }).click()

  // The reset mints a session, so this lands on the profile rather than back at the sign-in form.
  await expect(page.getByRole('heading', { name: 'My account' })).toBeVisible({ timeout: 15_000 })

  // …and the old password is genuinely gone, not merely superseded in the happy path.
  await page.getByRole('button', { name: 'Sign out' }).click()
  await page.goto('/sign-in')
  await page.getByPlaceholder('Email Address').fill(email)
  await page.getByPlaceholder('Password', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Log in' }).click()

  const alert = page.locator('form').getByRole('alert')
  await expect(alert).toBeVisible({ timeout: 15_000 })
  await expect(alert).toHaveText('That email address and password do not match.')
})

/**
 * FR-017 and SC-010, in the browser. The integration suite proves the action's two responses are
 * equal; this proves nothing between the action and the screen puts a difference back — an
 * unregistered address must reach the same code screen, with the same words on it.
 */
test('an unregistered address is answered exactly as a registered one', async ({ page }) => {
  const registered = await verifiedCustomer()

  const screenAfter = async (address: string): Promise<string> => {
    await page.goto('/forgot-password')
    await page.getByPlaceholder('Email Address').fill(address)
    await page.getByRole('button', { name: 'Send Code' }).click()

    const heading = page.getByRole('heading', { level: 1 })
    await expect(heading).toHaveText('ENTER THE CODE', { timeout: 15_000 })
    return ((await page.locator('main').textContent()) ?? '').replace(address, '')
  }

  const known = await screenAfter(registered)
  const unknown = await screenAfter(fresh())

  expect(known.length).toBeGreaterThan(0)
  expect(unknown).toBe(known)
})

/** FR-019 — refused under the boxes, with the screen and the customer's place both intact. */
test('a wrong reset code is refused in place', async ({ page }) => {
  const email = await verifiedCustomer()

  await page.goto('/forgot-password')
  await page.getByPlaceholder('Email Address').fill(email)
  await page.getByRole('button', { name: 'Send Code' }).click()
  await expect(page.getByRole('heading', { name: 'ENTER THE CODE' })).toBeVisible({
    timeout: 15_000,
  })

  const code = await resetCodeFor(email)
  const wrong = code === '000000' ? '111111' : '000000'

  const boxes = page.getByRole('textbox')
  await boxes.first().click()
  await page.keyboard.type(wrong)

  await expect(page.getByText('Invalid code. Please try again.')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByRole('heading', { name: 'ENTER THE CODE' })).toBeVisible()
  // Still the code screen, so the customer can retype or ask for another.
  await expect(page.getByRole('button', { name: 'Resend' })).toBeVisible()
})

test('the reset screen cannot be entered without an address', async ({ page }) => {
  await page.goto('/reset-password')
  await expect(page).toHaveURL(/\/forgot-password/)
})

/** The onward line on the new-password step, for the visitor the screen was drawn for. */
test('an anonymous visitor is offered the sign-in form on the way out', async ({ page }) => {
  const email = await verifiedCustomer()

  await page.goto('/forgot-password')
  await page.getByPlaceholder('Email Address').fill(email)
  await page.getByRole('button', { name: 'Send Code' }).click()
  await expect(page.getByRole('heading', { name: 'ENTER THE CODE' })).toBeVisible({
    timeout: 15_000,
  })

  await page.getByRole('textbox').first().click()
  await page.keyboard.type(await resetCodeFor(email))
  await expect(page.getByRole('heading', { name: 'NEW PASSWORD' })).toBeVisible({ timeout: 15_000 })

  await expect(page.getByRole('link', { name: 'Log in' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Back to my account' })).toHaveCount(0)
})
