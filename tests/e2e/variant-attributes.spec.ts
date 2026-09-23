import config from '@payload-config'
import { expect, test, type Page } from '@playwright/test'
import { getPayload } from 'payload'

/**
 * Properties that differ per stone (spec 011, US2, FR-010 – FR-013).
 *
 * **The claim only a browser can check is that the list CHANGES under the customer.** That a stone
 * can carry a value is the collection's business, and that two lists merge correctly is
 * `tests/unit/catalog-attribute-merge.test.ts`. What is left is the seam: the selection is made in
 * one component and the details are drawn by its sibling, and nothing but a real page proves the
 * message gets across without a reload.
 *
 * It also guards FR-009a from the other side — the piece's PROSE must not move when the selection
 * does, which is the easiest thing to widen by accident while wiring the two together.
 */
const context = { disableRevalidate: true }

const made: number[] = []

const DESCRIPTION = 'A setting made once, in our atelier.'

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

  const metal = await attribute('metal', 'Metal')
  const carat = await attribute('carat-weight', 'Carat weight')
  const certificate = await attribute(`certificate-${Date.now()}`, 'Certificate')

  const product = await payload.create({
    collection: 'products',
    context,
    data: {
      availability: 'made-to-order',
      // The piece speaks for itself until a stone is chosen (FR-012).
      attributes: [
        { attribute: metal.id, value: '18k gold' },
        { attribute: carat.id, value: '1.0 ct' },
      ],
      category: category!.id,
      description: DESCRIPTION,
      enableVariants: true,
      gallery: [image!.id],
      priceInUSD: 250_000,
      slug,
      title: 'Attribute Fixture Ring',
      _status: 'published',
    } as never,
    overrideAccess: true,
  })

  made.push(product.id)

  // Stone A replaces the carat and adds a certificate. Stone B says nothing of its own.
  await payload.create({
    collection: 'variants',
    context,
    data: {
      attributes: [
        { attribute: carat.id, value: '1.5 ct' },
        { attribute: certificate.id, value: 'GIA 22' },
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

async function chooseStone(page: Page, index: number) {
  await page.getByRole('combobox', { name: /diamond/i }).click()
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

test('the details follow the selected stone, and the prose does not', async ({ page }) => {
  const slug = await build()
  await page.goto(`/products/${slug}`)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

  await openDetails(page)

  // FR-012 — before any choice, the piece's own values.
  await expect(details(page)).toContainText('18k gold')
  await expect(details(page)).toContainText('1.0 ct')
  await expect(details(page)).not.toContainText('GIA 22')

  // FR-010, FR-011 — the stone replaces one row and adds another, with no reload.
  await chooseStone(page, 0)
  await expect(details(page)).toContainText('1.5 ct')
  await expect(details(page)).toContainText('GIA 22')
  await expect(details(page)).toContainText('18k gold')
  await expect(details(page)).not.toContainText('1.0 ct')

  /*
    FR-009a — the piece's prose is the piece's, whichever stone is selected. This is the assertion
    that fails if the wrapper is ever widened from "pick the attribute list" to "pick the content".
  */
  await expect(page.getByText(DESCRIPTION)).toBeVisible()

  // A stone that says nothing of its own falls back to the piece (US2 scenario 4).
  await chooseStone(page, 1)
  await expect(details(page)).toContainText('1.0 ct')
  await expect(details(page)).not.toContainText('GIA 22')
  await expect(page.getByText(DESCRIPTION)).toBeVisible()
})
