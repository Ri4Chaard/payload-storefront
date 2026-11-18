import config from '@payload-config'
import { expect, test } from '@playwright/test'
import { getPayload } from 'payload'

/**
 * US5 end to end — saved delivery addresses.
 *
 * **Kazakhstan is the point of the first test.** The e-commerce plugin ships a forty-entry country
 * list containing neither KZ nor AE, and the sample address the profile design draws is in Astana —
 * so with the plugin's default list the design's own example is unsaveable. `supportedCountries` in
 * `payload.config.ts` replaces it, and choosing Kazakhstan through the real dropdown
 * is the regression test for that. It fails loudly if anyone reverts the list.
 *
 * What else needs a browser: that Save stays disabled until the four required fields have something
 * in them, that editing updates the row rather than adding a second (scenario 4), that the
 * default moves when another address is marked (scenario 5), and that deleting asks first
 *. The invariant itself is proved in `tests/integration/us5-addresses.test.ts`, where it
 * belongs — this asserts the screen tells the truth about it.
 *
 * Its own subdomain and its own `created` list, for the reason `profile.spec.ts` sets out at
 * length: `test.afterAll` runs once per WORKER, so a wildcard delete takes other workers' customers
 * with it.
 */
const PASSWORD = 'a-long-enough-password'

const created: string[] = []

const fresh = () => {
  const email = `e2e-address-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@addresses.aurum-testing.dev`
  created.push(email)
  return email
}

async function signedIn(page: import('@playwright/test').Page) {
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

  await page.goto('/sign-in')
  await page.getByPlaceholder('Email Address').fill(email)
  await page.getByPlaceholder('Password', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Log in' }).click()
  await expect(page.getByRole('heading', { name: 'My account' })).toBeVisible({ timeout: 15_000 })

  return email
}

interface AddressInput {
  city: string
  country: string
  line1: string
  postcode: string
}

/** Fill the open modal and save it. The dropdown is driven as a customer drives it. */
async function fillAndSave(
  page: import('@playwright/test').Page,
  { city, country, line1, postcode }: AddressInput,
) {
  const modal = page.getByRole('dialog')
  await expect(modal).toBeVisible()

  await modal.getByRole('combobox', { name: /country/i }).click()
  await page.getByRole('option', { name: country, exact: true }).click()

  await modal.getByPlaceholder('Address line 1').fill(line1)
  await modal.getByPlaceholder('City').fill(city)
  await modal.getByPlaceholder('Postcode').fill(postcode)

  await modal.getByRole('button', { name: 'Save' }).click()
  await expect(modal).toBeHidden({ timeout: 15_000 })
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
})

/** US5 scenarios 1 and 2, FR-030, and the R6 regression. */
test('a customer adds their first address, in a country the plugin would have refused', async ({
  page,
}) => {
  await signedIn(page)

  await expect(page.getByText('No addresses added')).toBeVisible()

  await page.getByRole('button', { name: 'Add address' }).click()
  const modal = page.getByRole('dialog')
  await expect(modal.getByText('ADD ADDRESS')).toBeVisible()

  // FR-030 — nothing can be saved yet, and the button says so rather than the form saying it after.
  await expect(modal.getByRole('button', { name: 'Save' })).toBeDisabled()

  await modal.getByPlaceholder('Address line 1').fill('Mangilik el 22')
  await expect(modal.getByRole('button', { name: 'Save' })).toBeDisabled()

  await fillAndSave(page, {
    city: 'Astana',
    country: 'Kazakhstan',
    line1: 'Mangilik el 22',
    postcode: '010042',
  })

  await expect(page.getByText('Kazakhstan, Astana, Mangilik el 22')).toBeVisible()
  await expect(page.getByText('No addresses added')).toHaveCount(0)

  // Stored, not merely painted.
  await page.reload()
  await expect(page.getByText('Kazakhstan, Astana, Mangilik el 22')).toBeVisible()
})

/** US5 scenario 6 — the only address is the default, and the box does not pretend otherwise. */
test('the first address is the default, and the box is not offered as a choice', async ({
  page,
}) => {
  await signedIn(page)

  await page.getByRole('button', { name: 'Add address' }).click()
  await expect(page.getByLabel('This is my default address')).toBeDisabled()
  await expect(page.getByText('Your first address is always the default.')).toBeVisible()

  await fillAndSave(page, {
    city: 'Dubai',
    country: 'United Arab Emirates',
    line1: 'Sheikh Zayed Rd 1',
    postcode: '00000',
  })

  await expect(page.getByText('· Default')).toBeVisible()

  await page.getByRole('button', { name: /^Edit address:/ }).click()
  await expect(page.getByLabel('This is my default address')).toBeChecked()
  await expect(page.getByLabel('This is my default address')).toBeDisabled()
  await expect(page.getByText('Mark another address as the default to move it.')).toBeVisible()
})

/** US5 scenario 4 — the modal opens pre-filled, and saving updates that row rather than adding one. */
test('editing an address updates it in place', async ({ page }) => {
  await signedIn(page)

  await page.getByRole('button', { name: 'Add address' }).click()
  await fillAndSave(page, {
    city: 'Astana',
    country: 'Kazakhstan',
    line1: 'Mangilik el 22',
    postcode: '010042',
  })

  /*
   * **No settling pause between the two saves, and that is the test.** Saving revalidates
   * `/account`; applying that server tree while this modal is open used to replace the inputs
   * underneath the customer, so the typed city never reached the form and Save wrote the old value
   * back. It reproduced three times out of three against a production build.
   */
  await page.getByRole('button', { name: /^Edit address:/ }).click()
  const modal = page.getByRole('dialog')
  await expect(modal.getByPlaceholder('Address line 1')).toHaveValue('Mangilik el 22')
  await expect(modal.getByPlaceholder('City')).toHaveValue('Astana')

  await modal.getByPlaceholder('City').fill('Almaty')
  await expect(modal.getByPlaceholder('City')).toHaveValue('Almaty')
  await modal.getByRole('button', { name: 'Save' }).click()
  await expect(modal).toBeHidden({ timeout: 15_000 })

  await expect(page.getByText('Kazakhstan, Almaty, Mangilik el 22')).toBeVisible()
  await expect(page.getByRole('button', { name: /^Edit address:/ })).toHaveCount(1)
})

/** US5 scenario 5 — exactly one default, and marking another moves it. */
test('marking a second address as default clears the first', async ({ page }) => {
  await signedIn(page)

  await page.getByRole('button', { name: 'Add address' }).click()
  await fillAndSave(page, {
    city: 'Astana',
    country: 'Kazakhstan',
    line1: 'Mangilik el 22',
    postcode: '010042',
  })

  await page.getByRole('button', { name: 'Add address' }).click()
  await fillAndSave(page, {
    city: 'Dubai',
    country: 'United Arab Emirates',
    line1: 'Sheikh Zayed Rd 1',
    postcode: '00000',
  })

  await expect(page.getByText('· Default')).toHaveCount(1)

  const second = page.getByRole('button', { name: /^Edit address: United Arab Emirates/ })
  await second.click()

  const modal = page.getByRole('dialog')
  // Clicked by its label, the way a customer does. The input itself is `sr-only`, so the styled box
  // beside it intercepts a direct click on the control.
  await modal.getByText('This is my default address').click()
  await expect(modal.getByLabel('This is my default address')).toBeChecked()
  await modal.getByRole('button', { name: 'Save' }).click()
  await expect(modal).toBeHidden({ timeout: 15_000 })

  const rows = page.getByRole('listitem')
  await expect(page.getByText('· Default')).toHaveCount(1)
  await expect(rows.filter({ hasText: 'Sheikh Zayed Rd 1' })).toContainText('Default')
  await expect(rows.filter({ hasText: 'Mangilik el 22' })).not.toContainText('Default')
})

/** FR-029 and US5 scenario 7 — deletion is confirmed, and cancelling keeps the address. */
test('deleting an address asks first', async ({ page }) => {
  await signedIn(page)

  await page.getByRole('button', { name: 'Add address' }).click()
  await fillAndSave(page, {
    city: 'Astana',
    country: 'Kazakhstan',
    line1: 'Mangilik el 22',
    postcode: '010042',
  })

  await page.getByRole('button', { name: /^Delete address:/ }).click()
  const confirm = page.getByRole('dialog')
  await expect(confirm.getByText('DELETE ADDRESS')).toBeVisible()
  // The question names the address. Over a list of four, "this address" is unanswerable.
  await expect(confirm.getByText('Mangilik el 22')).toBeVisible()

  await confirm.getByRole('button', { name: 'Cancel' }).click()
  await expect(confirm).toBeHidden()
  await expect(page.getByText('Kazakhstan, Astana, Mangilik el 22')).toBeVisible()

  await page.getByRole('button', { name: /^Delete address:/ }).click()
  // `exact`, or it also matches the dialog's own "Close delete address" control.
  await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click()

  await expect(page.getByText('No addresses added')).toBeVisible({ timeout: 15_000 })
})
