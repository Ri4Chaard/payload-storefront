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
