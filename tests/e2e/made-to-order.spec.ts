import config from '@payload-config'
import { expect, test, type Page } from '@playwright/test'
import { getPayload } from 'payload'

/**
 * A made-to-order piece is orderable without inventing stock (spec 011, US1).
 *
 * **This is the journey that was broken.** The owner marks a ring always-available, adds the stones
 * a customer chooses between, and types no quantity — because a made-to-order stone has none. Before
 * this feature every one of those stones was offered as unavailable and the piece could not be
 * ordered at all, with nothing on the page explaining why.
 *
 * Fixtures are built here rather than seeded: the whole point is a piece whose stones have never
 * been given a number, and no seeded product is in that state. `disableRevalidate` because
 * `revalidatePath` throws outside a request, which is where a test runner lives.
 */
const context = { disableRevalidate: true }

const made: number[] = []

async function build(availability: 'made-to-order' | 'stock-tracked', quantities: number[]) {
  const payload = await getPayload({ config })
  const slug = `e2e-mto-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

  const [category] = (await payload.find({ collection: 'categories', limit: 1, overrideAccess: true }))
    .docs
  const [image] = (await payload.find({ collection: 'media', limit: 1, overrideAccess: true })).docs
  const options = (
    await payload.find({ collection: 'variantOptions', limit: 10, overrideAccess: true, sort: 'id' })
  ).docs

  const product = await payload.create({
    collection: 'products',
    context,
    data: {
      availability,
      category: category!.id,
      enableVariants: true,
      gallery: [image!.id],
      priceInUSD: 250_000,
      slug,
      title: 'Made To Order Fixture',
      _status: 'published',
    } as never,
    overrideAccess: true,
  })

  made.push(product.id)

  const variants = []
  for (const [index, inventory] of quantities.entries()) {
    variants.push(
      await payload.create({
        collection: 'variants',
        context,
        // A stone's options must be unique within its piece, so each takes its own.
        data: {
          inventory,
          options: [options[index]!.id],
          priceInUSD: 250_000 + index * 1000,
          product: product.id,
          _status: 'published',
        } as never,
        overrideAccess: true,
      }),
    )
  }

  return { slug, variants }
}

/**
 * The stone selector is the kit's `Select` — a `role="combobox"` button over a `role="listbox"`,
 * not a native `<select>`, so the options only exist once it is opened.
 */
const variantTrigger = (page: Page) => page.getByRole('combobox', { name: /diamond/i })

async function stoneOptions(page: Page) {
  await variantTrigger(page).click()
  return page.getByRole('option')
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

/** FR-002, FR-007 — the regression, end to end. */
test('a made-to-order piece sells stones nobody gave a quantity', async ({ page }) => {
  const { slug } = await build('made-to-order', [0, 0])

  await page.goto(`/products/${slug}`)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

  /*
    The piece says how it is made, once, under the price.

    `exact` matters: the shop's own delivery copy in the accordion below says "made to order in our
    atelier", so a loose match finds prose as well as the label and cannot tell a labelled
    page from an unlabelled one.
  */
  await expect(page.getByText('Made to order', { exact: true })).toHaveCount(1)

  // Neither stone is disabled — before this feature both were, and the piece was unsellable.
  const options = await stoneOptions(page)
  await expect(options).toHaveCount(2)
  await expect(options.filter({ hasText: /out of stock/i })).toHaveCount(0)
  expect(
    await options.evaluateAll((nodes) => nodes.filter((node) => node.ariaDisabled === 'true').length),
    'a made-to-order stone must never be offered as unavailable',
  ).toBe(0)
  await page.keyboard.press('Escape')

  await expect(page.getByRole('button', { name: /add to cart/i })).toBeEnabled()
})

/** FR-005 — the other half, unchanged: a stock-tracked piece still follows its counts. */
test('a stock-tracked piece at zero is still refused', async ({ page }) => {
  const { slug } = await build('stock-tracked', [0, 0])

  await page.goto(`/products/${slug}`)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

  await expect(page.getByText('Made to order', { exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /add to cart/i })).toBeDisabled()
})

/** FR-006 — withdrawing one stone, without reintroducing a quantity. */
test('unpublishing a stone removes it while the others still sell', async ({ page }) => {
  const { slug, variants } = await build('made-to-order', [0, 0, 0])
  const payload = await getPayload({ config })

  await page.goto(`/products/${slug}`)
  await expect(await stoneOptions(page)).toHaveCount(3)
  await page.keyboard.press('Escape')

  await payload.update({
    collection: 'variants',
    context,
    data: { _status: 'draft' },
    id: variants[0]!.id,
    overrideAccess: true,
  })

  await page.reload()
  await expect(await stoneOptions(page)).toHaveCount(2)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: /add to cart/i })).toBeEnabled()
})
