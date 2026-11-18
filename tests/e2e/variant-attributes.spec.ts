import config from '@payload-config'
import { expect, test, type Page } from '@playwright/test'
import { getPayload } from 'payload'

/**
 * Properties that differ per option (spec 011, US2, FR-010 – FR-013).
 *
 * **The claim only a browser can check is that the list CHANGES under the customer.** That an option
 * can carry a value is the collection's business, and that two lists merge correctly is
 * `tests/unit/catalog-attribute-merge.test.ts`. What is left is the seam: the selection is made in
 * one component and the details are drawn by its sibling, and nothing but a real page proves the
 * message gets across without a reload.
 *
 * It also guards FR-009a from the other side — the product's PROSE must not move when the selection
 * does, which is the easiest thing to widen by accident while wiring the two together.
 */
const context = { disableRevalidate: true }

const made: number[] = []

const DESCRIPTION = 'A product described once, in its own words.'

async function build() {
  const payload = await getPayload({ config })
  const slug = `e2e-attrs-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

  const [category] = (await payload.find({ collection: 'categories', limit: 1, overrideAccess: true }))
    .docs
  const [image] = (await payload.find({ collection: 'media', limit: 1, overrideAccess: true })).docs
  const options = (
    await payload.find({ collection: 'variantOptions', limit: 10, overrideAccess: true, sort: 'id' })
  ).docs

  const attribute = async (name: string, label: string) => {
    const found = await payload.find({
      collection: 'attributes',
      limit: 1,
      overrideAccess: true,
      where: { name: { equals: name } },
    })
    if (found.docs[0]) return found.docs[0]
    return payload.create({
      collection: 'attributes',
      context,
      data: { label, name, type: 'text' },
      overrideAccess: true,
    })
  }

  const material = await attribute('material', 'Material')
  const weight = await attribute('weight', 'Weight')
  const certificate = await attribute(`certificate-${Date.now()}`, 'Certificate')

  const product = await payload.create({
    collection: 'products',
    context,
    data: {
      availability: 'made-to-order',
      // The product speaks for itself until an option is chosen (FR-012).
      attributes: [
        { attribute: material.id, value: 'Material A' },
        { attribute: weight.id, value: '1.0 kg' },
      ],
      category: category!.id,
      description: DESCRIPTION,
      enableVariants: true,
      gallery: [image!.id],
      priceInUSD: 250_000,
      slug,
      title: 'Attribute Fixture Product',
      _status: 'published',
    } as never,
    overrideAccess: true,
  })

  made.push(product.id)

  // Option A replaces the weight and adds a certificate. Option B says nothing of its own.
  await payload.create({
    collection: 'variants',
    context,
    data: {
      attributes: [
        { attribute: weight.id, value: '1.5 kg' },
        { attribute: certificate.id, value: 'CERT-22' },
      ],
      inventory: 0,
      options: [options[0]!.id],
      priceInUSD: 250_000,
      product: product.id,
      _status: 'published',
    } as never,
    overrideAccess: true,
  })

  await payload.create({
    collection: 'variants',
    context,
    data: {
      inventory: 0,
      options: [options[1]!.id],
      priceInUSD: 260_000,
      product: product.id,
      _status: 'published',
    } as never,
    overrideAccess: true,
  })

  return slug
}

/**
 * The attribute rows, inside the PRODUCT DETAILS accordion.
 *
 * The accordion starts collapsed, so the panel has to be opened before anything can be read from
 * it — and it stays open across a selection change, which is what makes the later assertions a
 * check on the list rather than on the accordion.
 */
const details = (page: Page) => page.locator('dl').first()

async function openDetails(page: Page) {
  await page.getByRole('button', { name: /product details/i }).click()
  await expect(details(page)).toBeVisible()
}

async function chooseOption(page: Page, index: number) {
  await page.getByRole('combobox', { name: /choose an option/i }).click()
  await page.getByRole('option').nth(index).click()
}

test.afterAll(async () => {
  if (made.length === 0) return
  const payload = await getPayload({ config })
  await payload.delete({
    collection: 'products',
    context,
    overrideAccess: true,
    where: { id: { in: made } },
  })
})

test('the details follow the selected option, and the prose does not', async ({ page }) => {
  const slug = await build()
  await page.goto(`/products/${slug}`)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

  await openDetails(page)

  // FR-012 — before any choice, the product's own values.
  await expect(details(page)).toContainText('Material A')
  await expect(details(page)).toContainText('1.0 kg')
  await expect(details(page)).not.toContainText('CERT-22')

  // FR-010, FR-011 — the option replaces one row and adds another, with no reload.
  await chooseOption(page, 0)
  await expect(details(page)).toContainText('1.5 kg')
  await expect(details(page)).toContainText('CERT-22')
  await expect(details(page)).toContainText('Material A')
  await expect(details(page)).not.toContainText('1.0 kg')

  /*
    FR-009a — the product's prose is the product's, whichever option is selected. This is the assertion
    that fails if the wrapper is ever widened from "pick the attribute list" to "pick the content".
  */
  await expect(page.getByText(DESCRIPTION)).toBeVisible()

  // An option that says nothing of its own falls back to the product (US2 scenario 4).
  await chooseOption(page, 1)
  await expect(details(page)).toContainText('1.0 kg')
  await expect(details(page)).not.toContainText('CERT-22')
  await expect(page.getByText(DESCRIPTION)).toBeVisible()
})
