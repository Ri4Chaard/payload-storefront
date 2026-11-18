import config from '@payload-config'
import { expect, test } from '@playwright/test'
import { getPayload } from 'payload'

/**
 * Owner-defined attributes and header categories, on the live storefront.
 *
 * **The first test is the one that matters, and it is not about the new capability.** It is about
 * the links that already exist: `?colour=black` and `?collection=collection-a` are now an
 * attribute's name and one of its values, and every bookmark, every share and every indexed page
 * rests on those strings surviving the move. Adding a shape is the feature; not breaking the old
 * links is the promise.
 *
 * Every test makes its OWN values rather than renaming seeded ones: the suite runs fully parallel,
 * and another worker asserting "Remove Black" must never see a label this file changed.
 */
const context = { disableRevalidate: true }

const made: number[] = []

test.afterAll(async () => {
  if (made.length === 0) return
  const payload = await getPayload({ config })
  await payload.delete({
    collection: 'attribute-values',
    context,
    overrideAccess: true,
    where: { id: { in: made } },
  })
})

async function colourAttribute() {
  const payload = await getPayload({ config })
  const [colour] = (
    await payload.find({
      collection: 'attributes',
      limit: 1,
      overrideAccess: true,
      where: { name: { equals: 'colour' } },
    })
  ).docs
  if (!colour) throw new Error('the seed has no colour attribute')
  return colour
}

const ids = (values: (number | { id: number })[] | null | undefined): number[] =>
  (values ?? []).map((entry) => (typeof entry === 'number' ? entry : entry.id))

/** The regression that would be most expensive to find in production. */
test('links saved before attributes return the same products', async ({ page }) => {
  await page.goto('/all-products?colour=black&colour=green&collection=collection-a')

  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

  // Every value is honoured, not silently dropped: each shows as a chip the visitor can undo.
  await expect(page.getByRole('link', { name: /Remove Black/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /Remove Green/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /Remove Collection A/i })).toBeVisible()

  // And nothing was reported as unrecognised, which is what a broken model would produce.
  await expect(page.getByText(/^Ignored /)).toHaveCount(0)
})

test('a value the owner adds filters the live site', async ({ page }) => {
  const payload = await getPayload({ config })
  const colour = await colourAttribute()
  const value = `rose-gold-${Date.now()}`

  const added = await payload.create({
    collection: 'attribute-values',
    context,
    data: { attribute: colour.id, label: 'Rose gold', order: 50, value },
    overrideAccess: true,
  })
  made.push(added.id)

  const [product] = (
    await payload.find({
      collection: 'products',
      limit: 1,
      overrideAccess: true,
      where: { slug: { equals: 'product-30' } },
    })
  ).docs

  const before = ids(product!.values)
  await payload.update({
    collection: 'products',
    context,
    data: { values: [...before, added.id] },
    id: product!.id,
    overrideAccess: true,
  })

  try {
    await page.goto(`/all-products?colour=${value}`)

    // The owner's new value filters, and names itself in the chip from its own label.
    await expect(page.getByRole('link', { name: /Remove Rose gold/i })).toBeVisible()
    // Exactly the one product it was applied to — the filter doing its job rather than being
    // ignored, which is stronger than asserting the grid is merely non-empty.
    await expect(page.getByRole('article')).toHaveCount(1)
  } finally {
    await payload.update({
      collection: 'products',
      context,
      data: { values: before },
      id: product!.id,
      overrideAccess: true,
    })
  }
})

/** Renaming what customers read never moves the link. */
test('renaming a label leaves its link working', async ({ page }) => {
  const payload = await getPayload({ config })
  const colour = await colourAttribute()
  const value = `renamed-${Date.now()}`

  const added = await payload.create({
    collection: 'attribute-values',
    context,
    data: { attribute: colour.id, label: 'Before', order: 51, value },
    overrideAccess: true,
  })
  made.push(added.id)

  await page.goto(`/all-products?colour=${value}`)
  await expect(page.getByRole('link', { name: /Remove Before/i })).toBeVisible()

  await payload.update({
    collection: 'attribute-values',
    context,
    data: { label: 'After' },
    id: added.id,
    overrideAccess: true,
  })

  // Same URL, new word.
  await page.goto(`/all-products?colour=${value}`)
  await expect(page.getByRole('link', { name: /Remove After/i })).toBeVisible()
})

/** An unrecognised value or attribute is reported rather than silently narrowing the grid. */
test('an unknown value or attribute is reported and changes nothing', async ({ page }) => {
  await page.goto('/all-products')
  const all = await page.getByRole('link', { name: /^View / }).count()

  await page.goto('/all-products?colour=definitely-not-a-colour&shape=round')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByRole('status').filter({ hasText: /^Ignored 2 filters/ })).toBeVisible()

  expect(await page.getByRole('link', { name: /^View / }).count()).toBe(all)
})

test('the product details list a list attribute’s values beside the typed rows', async ({
  page,
}) => {
  await page.goto('/products/product-1')
  // The accordion starts collapsed.
  await page.getByRole('button', { name: /product details/i }).click()
  const list = page.locator('dl').first()
  await expect(list).toBeVisible()

  const terms = list.locator('dt')
  await expect(terms.first()).toHaveText('Colour')
  await expect(list.locator('dd').first()).toHaveText('Clear')
  // The collection is a filter and relates products, but the owner keeps it out of the details.
  await expect(terms.filter({ hasText: /^Collection$/ })).toHaveCount(0)
})

/**
 * The header's categories are the ones the owner ticked, in their order and in the visitor's
 * language. Read from the seeded state rather than changed here — the suite is parallel and the
 * header is on every page; `tests/integration/attribute-filters.test.ts` toggles and reorders them.
 */
test('the header carries the categories marked for it, in the visitor’s language', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })

  await page.goto('/about')
  const english = page.locator('header nav[aria-label]').filter({ visible: true }).first()
  await expect(english.getByRole('link')).toHaveText([
    'All products',
    'Category 1',
    'Category 2',
    'Category 3',
    'Category 4',
    'About us',
    'Contact us',
  ])

  await page.goto('/ru/about')
  const russian = page.locator('header nav[aria-label]').filter({ visible: true }).first()
  await expect(russian.getByRole('link')).toHaveText([
    'Все товары',
    'Категория 1',
    'Категория 2',
    'Категория 3',
    'Категория 4',
    /.+/,
    /.+/,
  ])
})
