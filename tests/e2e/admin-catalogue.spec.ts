import config from '@payload-config'
import { expect, test } from '@playwright/test'
import { getPayload } from 'payload'

/**
 * Editorial verification, as a test rather than an afternoon in the panel.
 *
 * The Constitution asks for a person to confirm the editable surface actually behaves. These are the
 * claims from that checklist that can be pinned down, and pinning them down is worth more than a
 * note saying somebody looked once. What it cannot check — whether the admin makes SENSE to the
 * owner — is what the human pass is still for.
 *
 * **The quantity field is the one that matters.** It is hidden by an `admin.condition` reading a
 * column a hook maintains, because a variant cannot reach its parent to ask.
 * Every other test in this feature exercises the storefront, which deliberately reads the parent
 * instead — so this is the only place the mirror is checked at all, and a mirror nothing checks is
 * a mirror that drifts.
 *
 * They share one test because they share a login, and the admin panel's first compile is the
 * expensive part of the run.
 */
const PASSWORD = 'a-long-enough-password'
const context = { disableRevalidate: true }

const staff: string[] = []
const products: number[] = []
const values: number[] = []

test.afterAll(async () => {
  const payload = await getPayload({ config })

  if (products.length > 0) {
    await payload.delete({
      collection: 'products',
      context,
      overrideAccess: true,
      where: { id: { in: products } },
    })
  }
  if (values.length > 0) {
    await payload.delete({
      collection: 'attribute-values',
      context,
      overrideAccess: true,
      where: { id: { in: values } },
    })
  }
  if (staff.length > 0) {
    await payload.delete({
      collection: 'admins',
      overrideAccess: true,
      where: { email: { in: staff } },
    })
  }
})

test('the catalogue’s editable surface behaves as the spec says', async ({ page }) => {
  test.setTimeout(300_000)

  const payload = await getPayload({ config })
  const email = `e2e-cat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@admin.aurum-testing.dev`
  staff.push(email)

  await payload.create({
    collection: 'admins',
    data: { email, name: 'Catalogue Editor', password: PASSWORD },
    overrideAccess: true,
  })

  const [category] = (await payload.find({ collection: 'categories', limit: 1, overrideAccess: true }))
    .docs
  const [image] = (await payload.find({ collection: 'media', limit: 1, overrideAccess: true })).docs
  const [option] = (
    await payload.find({ collection: 'variantOptions', limit: 1, overrideAccess: true, sort: 'id' })
  ).docs

  const build = async (availability: 'made-to-order' | 'stock-tracked') => {
    const product = await payload.create({
      collection: 'products',
      context,
      data: {
        availability,
        category: category!.id,
        enableVariants: true,
        gallery: [image!.id],
        priceInUSD: 100_000,
        slug: `admin-${availability}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: `Admin fixture (${availability})`,
        _status: 'published',
      } as never,
      overrideAccess: true,
    })
    products.push(product.id)

    const variant = await payload.create({
      collection: 'variants',
      context,
      data: {
        inventory: 3,
        options: [option!.id],
        priceInUSD: 100_000,
        product: product.id,
        _status: 'published',
      } as never,
      overrideAccess: true,
    })

    return { product, variant }
  }

  const madeToOrder = await build('made-to-order')
  const stockTracked = await build('stock-tracked')

  await page.goto('/admin/login')
  await page.locator('#field-email').fill(email)
  await page.locator('#field-password').fill(PASSWORD)
  await page.getByRole('button', { name: 'Login', exact: true }).click()
  // Anywhere but the login screen — a URL pattern that `/admin/login` also matches would pass
  // instantly without signing anybody in.
  await page.waitForURL((url) => !url.pathname.includes('/admin/login'), { timeout: 120_000 })

  /** The owner's vocabulary is in the navigation — attributes and their values — and sizes are not. */
  await expect(page.locator('nav').getByText('Attribute values', { exact: true })).toBeVisible({
    timeout: 120_000,
  })
  await expect(page.locator('nav').getByText('Colours', { exact: true })).toHaveCount(0)
  await expect(page.locator('nav').getByText('Sizes', { exact: true })).toHaveCount(0)

  /** FR-027 — no size field survives on a product. */
  await page.goto(`/admin/collections/products/${madeToOrder.product.id}`)
  await expect(page.locator('#field-title')).toHaveValue(/Admin fixture/, { timeout: 120_000 })
  await expect(page.locator('#field-sizes')).toHaveCount(0)

  /**
   * FR-001, and the point of the whole mirror: a variant of a made-to-order product is not asked how
   * many of it exist.
   */
  await page.goto(`/admin/collections/variants/${madeToOrder.variant.id}`)
  await expect(page.locator('#field-availability')).toBeVisible({ timeout: 120_000 })
  await expect(page.locator('#field-inventory')).toHaveCount(0)

  /** FR-005 — and a stock-tracked one still is, unchanged. */
  await page.goto(`/admin/collections/variants/${stockTracked.variant.id}`)
  await expect(page.locator('#field-inventory')).toBeVisible({ timeout: 120_000 })

  /**
   * A value the owner adds to an attribute reaches the storefront with no deployment.
   *
   * Created through the panel rather than the API, because "the owner can do this" is the claim —
   * including picking which attribute it belongs to, where only list attributes are offered.
   */
  const value = `admin-added-${Date.now()}`
  await page.goto('/admin/collections/attribute-values/create')
  await page.locator('#field-attribute').click({ timeout: 120_000 })
  await page.locator('.rs__option', { hasText: /^Colour$/ }).click()
  await page.locator('#field-label').fill('Admin added')
  await page.locator('#field-value').fill(value)
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByText('successfully', { exact: false }).first()).toBeVisible({
    timeout: 60_000,
  })

  const [saved] = (
    await payload.find({
      collection: 'attribute-values',
      depth: 1,
      limit: 1,
      overrideAccess: true,
      where: { value: { equals: value } },
    })
  ).docs
  expect(saved, 'the value the owner just typed is not in the catalogue').toBeDefined()
  values.push(saved!.id)
  expect(saved!.title).toBe('Colour: Admin added')

  await payload.update({
    collection: 'products',
    context,
    data: { values: [saved!.id] },
    id: madeToOrder.product.id,
    overrideAccess: true,
  })

  // …and it filters the live site, which is the half the admin cannot show on its own.
  await page.goto(`/all-products?colour=${value}`)
  await expect(page.getByRole('link', { name: /Remove Admin added/i })).toBeVisible()
  await expect(page.getByRole('article')).toHaveCount(1)
})
