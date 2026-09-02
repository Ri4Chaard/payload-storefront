import config from '@payload-config'
import { expect, test } from '@playwright/test'
import { getPayload } from 'payload'

/**
 * US2 end to end (spec 004, FR-010 – FR-016).
 *
 * The two assertions a browser is genuinely needed for are the session surviving a **fresh browser
 * context** — a cookie with the right expiry is not the same claim as a customer still being signed
 * in tomorrow — and the back button after signing out, which is about the client router's cache
 * rather than about the cookie at all.
 */
const PASSWORD = 'a-long-enough-password'

/**
 * **Its own subdomain, which was the first half of a fix and not the whole of it.** Cleanups used to
 * delete by `like`, and Playwright runs spec FILES in parallel — so a shared `@aurum-testing.dev`
 * meant `registration.spec.ts` finishing early deleted the account this file was signing into. The
 * namespace made the file-level cleanups disjoint. It did not help WITHIN a file, which is where
 * the rest of the flakiness lived; see the note on `created` below. The namespaces stay, because
 * they still cost nothing and still keep one file's debris out of another's.
 */
/**
 * **Every address this worker made, so the cleanup can delete those and only those.**
 *
 * `test.afterAll` runs once PER WORKER, not once per file, and `fullyParallel` spreads a file's
 * tests across workers. A cleanup matching `%@signin.aurum-testing.dev%` therefore fires while other workers are
 * still mid-test and takes their customers with it — and the session goes with the row, so the next
 * request redirects to sign-in and the failure appears somewhere else entirely, as an assertion
 * about a heading rather than about a deleted account. This module is instantiated per worker, so
 * the list holds exactly what this worker is responsible for.
 */
const created: string[] = []

const fresh = () => {
  const email = `e2e-signin-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@signin.aurum-testing.dev`
  created.push(email)
  return email
}

/**
 * Creates a verified customer through the Local API rather than through `registerCustomer`.
 *
 * Not merely a shortcut — the actions module imports `next/cache`, which only resolves inside
 * Next's bundler, so importing it here breaks the Playwright runner outright. US1's spec already
 * drives the registration screens; this one is about what happens afterwards.
 *
 * `disableVerificationEmail` because the address is verified on the next line: sending a code
 * nobody will type would put a real Resend call in the middle of every run.
 */
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

test('a customer signs in, stays signed in, and signs out', async ({ browser, page }) => {
  const email = await verifiedCustomer()

  await page.goto('/sign-in')
  await expect(page.getByRole('heading', { name: 'WELCOME BACK' })).toBeVisible()

  await page.getByPlaceholder('Email Address').fill(email)
  await page.getByPlaceholder('Password', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Log in' }).click()

  await expect(page.getByRole('heading', { name: 'My account' })).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText(email)).toBeVisible()

  /**
   * FR-012 — a NEW context, sharing only the cookies. A page reload would prove far less: it keeps
   * the in-memory session the browser already had.
   */
  const cookies = await page.context().cookies()
  const returning = await browser.newContext()
  await returning.addCookies(cookies)
  const laterVisit = await returning.newPage()
  await laterVisit.goto('/account')
  await expect(laterVisit.getByRole('heading', { name: 'My account' })).toBeVisible()
  await returning.close()

  // FR-013 — signing out ends it immediately.
  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page).toHaveURL(/\/$/)

  /**
   * …and the profile is not merely unreachable, it is not VISIBLE. The cookie is gone either way;
   * this is the client router's cached segment, which is what a customer signing out on a shared
   * machine would actually be handed by pressing Back.
   */
  await page.goBack()
  await expect(page.getByRole('heading', { name: 'WELCOME BACK' })).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText(email)).toHaveCount(0)
})

/**
 * SC-010 / FR-011 — the messages are compared **to each other**, in the browser, as literal text.
 * The integration suite proves the actions agree; this proves nothing between them and the screen
 * reintroduces a difference.
 */
test('a wrong password and an unknown address say exactly the same thing', async ({ page }) => {
  const email = await verifiedCustomer()

  const messageAfter = async (address: string, password: string): Promise<string> => {
    await page.goto('/sign-in')
    await page.getByPlaceholder('Email Address').fill(address)
    await page.getByPlaceholder('Password', { exact: true }).fill(password)
    await page.getByRole('button', { name: 'Log in' }).click()

    /**
     * Scoped to the form, and that is not tidiness. Next injects its own
     * `<div role="alert" id="__next-route-announcer__">` into every page; a page-level
     * `getByRole('alert')` matches that empty element the instant the click lands, so the assertion
     * passes against nothing and the comparison below silently compares two empty strings. Two
     * differing messages would have sailed through it.
     */
    const alert = page.locator('form').getByRole('alert')
    await expect(alert).toBeVisible({ timeout: 15_000 })
    return ((await alert.textContent()) ?? '').trim()
  }

  const wrongPassword = await messageAfter(email, 'definitely-not-the-password')
  const unknownAddress = await messageAfter(fresh(), 'definitely-not-the-password')

  expect(wrongPassword.length).toBeGreaterThan(0)
  expect(unknownAddress).toBe(wrongPassword)
})

test('the password reveal toggle shows and hides the password', async ({ page }) => {
  await page.goto('/sign-in')

  const field = page.getByPlaceholder('Password', { exact: true })
  await field.fill(PASSWORD)
  await expect(field).toHaveAttribute('type', 'password')

  await page.getByRole('button', { name: 'Show password' }).click()
  await expect(field).toHaveAttribute('type', 'text')

  await page.getByRole('button', { name: 'Hide password' }).click()
  await expect(field).toHaveAttribute('type', 'password')
})

test('an anonymous visitor asking for the profile is sent to sign in, and back again', async ({
  page,
}) => {
  await page.goto('/account')

  await expect(page).toHaveURL(/\/sign-in\?next=%2Faccount/)
  await expect(page.getByRole('heading', { name: 'WELCOME BACK' })).toBeVisible()

  const email = await verifiedCustomer()
  await page.getByPlaceholder('Email Address').fill(email)
  await page.getByPlaceholder('Password', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Log in' }).click()

  // `next` was carried through the proxy and honoured by the action, which validated it first.
  await expect(page.getByRole('heading', { name: 'My account' })).toBeVisible({ timeout: 15_000 })
})
