import { getPayload } from 'payload'
import config from '@payload-config'

const payload = await getPayload({ config })
const ok = (label: string, pass: boolean, detail = '') =>
  console.log(`${pass ? '  PASS' : '  FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`)

// Every read below runs with access enforced and no user: exactly an anonymous storefront request.
const anon = { overrideAccess: false, user: null } as const

console.log('\n1. Anonymous reads see only published products, covering every option path')
const published = await payload.find({ collection: 'products', ...anon, limit: 100, depth: 1 })
ok('the seeded catalogue is visible', published.totalDocs >= 4, `saw ${published.totalDocs}`)

// FR-008 requires all three shapes to exist, or the selectors are never exercised. Asserting the
// coverage rather than a document count means adding a product does not break the check.
type Shape = { title: string; enableVariants?: boolean | null; sizes?: unknown[] | null }
const shapes = published.docs as unknown as Shape[]
const hasBoth = shapes.find((p) => p.enableVariants && (p.sizes?.length ?? 0) > 0)
const sizesOnly = shapes.find((p) => !p.enableVariants && (p.sizes?.length ?? 0) > 0)
const neither = shapes.find((p) => !p.enableVariants && (p.sizes?.length ?? 0) === 0)
ok('a piece with stones AND sizes', Boolean(hasBoth), hasBoth?.title)
ok('a piece with sizes only', Boolean(sizesOnly), sizesOnly?.title)
ok('a piece with neither', Boolean(neither), neither?.title)

console.log('\n2. A draft is unreachable anonymously — including by direct id')
const draft = await payload.create({
  collection: 'products',
  data: {
    title: 'Unpublished Test Ring',
    slug: 'unpublished-test-ring',
    gallery: [(await payload.find({ collection: 'media', limit: 1 })).docs[0]!.id],
    category: (
      await payload.find({
        collection: 'categories',
        where: { slug: { equals: 'category-1' } },
        limit: 1,
      })
    ).docs[0]!.id,
    availability: 'made-to-order',
    priceInUSDEnabled: true,
    priceInUSD: 100000,
    _status: 'draft',
  } as never,
})

const bySlug = await payload.find({
  collection: 'products',
  where: { slug: { equals: 'unpublished-test-ring' } },
  ...anon,
})
ok('draft absent from an anonymous query', bySlug.totalDocs === 0, `saw ${bySlug.totalDocs}`)

let direct: unknown
try {
  // Payload either returns nothing or throws Forbidden here; both mean the same thing.
  direct = await payload.findByID({ collection: 'products', id: draft.id, ...anon })
} catch {
  direct = undefined
}
ok('draft unreachable by direct id', direct == null)

const asAdmin = await payload.findByID({ collection: 'products', id: draft.id, draft: true })
ok('the owner can still see it', Boolean(asAdmin))

console.log('\n3. Availability')
const all = await payload.find({ collection: 'products', ...anon, limit: 100, depth: 0 })
for (const p of all.docs) {
  const record = p as unknown as { title: string; availability: string; inventory?: number | null }
  const available = record.availability === 'made-to-order' ? true : (record.inventory ?? 0) > 0
  console.log(
    `  ${record.title}\n      ${record.availability}, quantity ${record.inventory ?? '—'} → ${available ? 'orderable' : 'UNAVAILABLE'}`,
  )
}
const zero = all.docs.find(
  (p) =>
    (p as never as { availability: string }).availability === 'stock-tracked' &&
    ((p as never as { inventory?: number }).inventory ?? 0) === 0,
)
ok('a stock-tracked zero exists and reads as unavailable', Boolean(zero))
ok(
  'inventory is readable anonymously (the storefront derives availability from it)',
  all.docs.every((p) => 'inventory' in (p as object)),
)

console.log('\n4. Stones carry their own price and availability')
const variants = await payload.find({ collection: 'variants', ...anon, limit: 100, depth: 1 })
ok('four stones offered', variants.totalDocs === 4, `saw ${variants.totalDocs}`)
const taken = variants.docs.filter(
  (v) => ((v as never as { inventory?: number }).inventory ?? 0) === 0,
)
ok('one stone is taken and must not be selectable', taken.length === 1)
const prices = variants.docs.map((v) => (v as never as { priceInUSD?: number }).priceInUSD ?? 0)
ok(
  'stones differ in price',
  new Set(prices).size === 4,
  prices.map((p) => `$${p / 100}`).join(', '),
)

console.log('\n5. A new attribute reaches a product with no deployment')
const attr = await payload.create({
  collection: 'attributes',
  data: { label: 'Chain length', name: 'chain-length', type: 'text', order: 9 } as never,
})
const pendant = (
  await payload.find({
    collection: 'products',
    where: { slug: { equals: 'butterfly-diamond-pendant' } },
    limit: 1,
  })
).docs[0]!
await payload.update({
  collection: 'products',
  id: pendant.id,
  data: { attributes: [{ attribute: attr.id, value: '45 cm' }] } as never,
})
const reread = await payload.findByID({ collection: 'products', id: pendant.id, ...anon, depth: 1 })
const rows =
  (reread as never as { attributes?: { attribute: { label: string }; value: string }[] })
    .attributes ?? []
ok(
  'the new attribute is on the product publicly',
  rows.some((r) => r.attribute?.label === 'Chain length' && r.value === '45 cm'),
)

console.log('\n· cleaning up the two test documents')
await payload.delete({ collection: 'products', id: draft.id })
await payload.update({ collection: 'products', id: pendant.id, data: { attributes: [] } as never })
await payload.delete({ collection: 'attributes', id: attr.id })

process.exit(0)
