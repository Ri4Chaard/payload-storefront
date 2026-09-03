import config from '@payload-config'
import { expect, test } from '@playwright/test'
import { getPayload } from 'payload'

/**
 * The seller's view of a customer, in the admin panel (spec 004, FR-027).
 *
 * **The only test in this suite that opens `/admin`**, and it earns that on the strength of what it
 * guards. An order at this shop is a conversation on WhatsApp or Telegram, and the person fulfilling
 * it needs the delivery address the customer already typed — that is the entire reason saved
 * addresses exist. The `addresses` collection is created by the e-commerce plugin with
 * `admin.hidden: true`, so the `join` field on `customers` is the ONE route to it from the panel. If
 * that field is dropped, renamed, or has its `on` path broken, nothing else in the suite notices:
 * the storefront keeps working perfectly and the seller quietly cannot see an address again.
 *
 * `tests/integration/us5-addresses.test.ts` proves the join resolves. This proves it is on the
 * screen, which is a different claim — a join can resolve server-side and render nothing.
 *
 * The generous timeout is for `next dev`, which compiles the whole admin panel on its first request
 * and takes far longer over it than any storefront route.
 */
const PASSWORD = 'a-long-enough-password'

const created: string[] = []

const fresh = (role: string) => {
  const email = `e2e-${role}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@admin.aurum-testing.dev`
  created.push(email)
  return email
}

test.afterAll(async () => {
  if (created.length === 0) return

  const payload = await getPayload({ config })
  const customers = await payload.find({
    collection: 'customers',
    limit: 100,
    overrideAccess: true,
    where: { email: { in: created } },
  })

  if (customers.docs.length > 0) {
    await payload.delete({
      collection: 'addresses',
      overrideAccess: true,
      where: { customer: { in: customers.docs.map((doc) => doc.id) } },
    })
  }

  await payload.delete({
    collection: 'customers',
    overrideAccess: true,
    where: { email: { in: created } },
  })
  await payload.delete({
    collection: 'admins',
    overrideAccess: true,
    where: { email: { in: created } },
  })
})

test('a customer’s saved addresses are visible to staff', async ({ page }) => {
  test.setTimeout(300_000)

  const payload = await getPayload({ config })
  const staffEmail = fresh('staff')
  const customerEmail = fresh('cust')

  await payload.create({
    collection: 'admins',
    data: { email: staffEmail, name: 'Test Staff', password: PASSWORD },
    overrideAccess: true,
  })

  const customer = await payload.create({
    collection: 'customers',
    data: { email: customerEmail, password: PASSWORD },
    disableVerificationEmail: true,
    overrideAccess: true,
  })

  await payload.create({
    collection: 'addresses',
    data: {
      addressLine1: 'Mangilik el 22',
      city: 'Astana',
      country: 'KZ',
      customer: customer.id,
      postalCode: '010042',
    },
    overrideAccess: true,
  })

  await page.goto('/admin/login')
  await page.locator('#field-email').fill(staffEmail)
  await page.locator('#field-password').fill(PASSWORD)
  await page.getByRole('button', { name: 'Login', exact: true }).click()

  /*
   * Waiting for "anywhere but the login screen" rather than for a URL that `/admin/login` also
   * matches — which is what the first draft did, and it passed instantly without signing anybody in.
   */
  await page.waitForURL((url) => !url.pathname.includes('/admin/login'), { timeout: 120_000 })

  await page.goto(`/admin/collections/customers/${customer.id}`)

  await expect(page.getByText('Delivery addresses')).toBeVisible({ timeout: 120_000 })
  // The columns a seller actually reads off the screen, not merely that a table exists.
  await expect(page.getByText('Kazakhstan')).toBeVisible()
  await expect(page.getByText('Astana')).toBeVisible()
  await expect(page.getByText('Mangilik el 22')).toBeVisible()
  await expect(page.getByText('010042')).toBeVisible()
})

/**
 * Editorial verification, as a test rather than an afternoon in the panel (spec 004, T570).
 *
 * The Constitution asks for a person to confirm the editable surface actually behaves; the four
 * claims below are the ones from that checklist that can be pinned down, and pinning them down is
 * worth more than a note saying somebody looked once. What it cannot check — whether the admin
 * makes SENSE to a seller — is what the human pass is still for.
 *
 * They share one test because they share a login, and the admin panel's first compile is the
 * expensive part of the run.
 */
test('the editable surface behaves as the spec says', async ({ page }) => {
  test.setTimeout(300_000)

  const payload = await getPayload({ config })
  const staffEmail = fresh('editor')
  const customerEmail = fresh('shown')

  await payload.create({
    collection: 'admins',
    data: { email: staffEmail, name: 'Test Editor', password: PASSWORD },
    overrideAccess: true,
  })

  const customer = await payload.create({
    collection: 'customers',
    data: {
      email: customerEmail,
      firstName: 'Ada',
      lastName: 'Lovelace',
      marketingEmail: true,
      password: PASSWORD,
    },
    disableVerificationEmail: true,
    overrideAccess: true,
  })

  await payload.update({
    collection: 'customers',
    data: { _verified: true },
    id: customer.id,
    overrideAccess: true,
  })

  await page.goto('/admin/login')
  await page.locator('#field-email').fill(staffEmail)
  await page.locator('#field-password').fill(PASSWORD)
  await page.getByRole('button', { name: 'Login', exact: true }).click()
  await page.waitForURL((url) => !url.pathname.includes('/admin/login'), { timeout: 120_000 })

  /**
   * FR-039 — `verification-codes` holds live credentials, so every access function returns false
   * and the collection is hidden. Both halves are asserted: hidden alone is a navigation choice,
   * and access alone leaves a link to a page that then refuses.
   */
  await expect(page.locator('nav').getByText('Verification codes')).toHaveCount(0)

  const codes = await page.request.get('/api/verification-codes')
  expect(codes.status()).toBe(403)

  /**
   * R11 — the `Account` copy global was removed and must not have crept back. Its absence is the
   * decision; a global that reappears silently re-opens the enumeration risks R11 lists.
   */
  const account = await page.request.get('/api/globals/account')
  expect(account.status()).toBe(404)

  /** The customer row shows what a seller needs, with the consent evidence read-only (FR-034). */
  await page.goto(`/admin/collections/customers/${customer.id}`)
  await expect(page.locator('#field-firstName')).toHaveValue('Ada', { timeout: 120_000 })
  await expect(page.locator('#field-lastName')).toHaveValue('Lovelace')
  await expect(page.locator('#field-name')).toHaveValue('Ada Lovelace')
  await expect(page.locator('#field-name')).toBeDisabled()
  await expect(page.locator('#field-marketingEmail')).toBeChecked()
  // A date field renders a wrapper div carrying the id and a picker input inside it, so the
  // read-only claim has to be made against the control rather than the container.
  await expect(page.locator('#field-marketingEmailUpdatedAt input').first()).toBeDisabled()

  /**
   * FR-030 — the shop's default country is configuration, so changing it must reach the storefront
   * without a deploy. Set through the local API rather than by driving the global's form: what is
   * being proved is that the address modal READS it, not that Payload can save a select.
   *
   * **This mutates shared state, which is normally forbidden in a parallel suite.** It is safe
   * here because nothing else in `tests/` reads `account-settings` — every address test picks its
   * country explicitly from the dropdown rather than relying on the pre-selected one — and the
   * previous value goes back in the `finally` regardless of how this ends. If a second test ever
   * starts asserting the default selection, this needs a different approach, not a longer comment.
   */
  const previous = await payload.findGlobal({ slug: 'account-settings', overrideAccess: true })

  try {
    await payload.updateGlobal({
      slug: 'account-settings',
      data: { defaultCountry: 'KZ' },
      overrideAccess: true,
    })

    await page.goto('/sign-in')
    await page.getByPlaceholder('Email Address').fill(customerEmail)
    await page.getByPlaceholder('Password', { exact: true }).fill(PASSWORD)
    await page.getByRole('button', { name: 'Log in' }).click()
    await expect(page.getByRole('heading', { name: 'My account' })).toBeVisible({ timeout: 30_000 })

    await page.getByRole('button', { name: 'Add address' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByRole('dialog').getByText('Kazakhstan')).toBeVisible()
  } finally {
    await payload.updateGlobal({
      slug: 'account-settings',
      data: { defaultCountry: previous.defaultCountry ?? 'AE' },
      overrideAccess: true,
    })
  }
})
