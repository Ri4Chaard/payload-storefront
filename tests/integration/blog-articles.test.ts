import config from '@payload-config'
import { getPayload, type RequiredDataFromCollectionSlug } from 'payload'
import { afterAll, describe, expect, it } from 'vitest'

import { toArticleCard } from '@/lib/blog/mappers'
import { skipRevalidation } from '@/lib/revalidate'

/**
 * The articles collection: access, drafts, field-level refusals, and what a deleted category does
 * to the articles that referenced it.
 *
 * **These are claims about what CANNOT happen**, so they are tested by attempting the forbidden
 * thing and asserting the refusal — not by checking that the permitted thing works.
 *
 * The draft assertions are the load-bearing ones. FR-037 requires an unpublished article to be
 * unreachable rather than hidden, through the REST API as well as through the page — and a route
 * that calls `notFound()` cannot give that, because `/api/articles` never reaches the route. The
 * constraint lives in `read: adminOrPublishedStatus`, which is part of the query, and this file is
 * what proves it fires for a direct `findByID` and not only for a `find`.
 *
 * Every read passes `overrideAccess: false`, exactly as `src/lib/blog/queries.ts` does, so the
 * collection's own access functions run the way they run in production.
 *
 * **Every WRITE passes `context: skipRevalidation`**, for the reason that context exists at all:
 * `articles` carries `revalidateArticleOnChange`, and `revalidatePath` throws
 * `Invariant: static generation store missing` when there is no Next request scope around it.
 * Vitest is not a Next server. The seed script does the same thing for the same reason, and
 * forgetting it here failed every write in this file before it failed an assertion.
 */

const payload = await getPayload({ config })

const suffix = Date.now()

const articles: number[] = []
const categories: number[] = []

/** A throwaway category, so nothing here depends on what the seed happens to have created. */
async function makeCategory(name: string) {
  const doc = await payload.create({
    collection: 'article-categories',
    data: { title: name, slug: `${name}-${suffix}` },
    overrideAccess: true,
    context: skipRevalidation,
  })
  categories.push(doc.id)
  return doc
}

async function makeArticle(
  overrides: Partial<RequiredDataFromCollectionSlug<'articles'>> & { category: number },
) {
  const doc = await payload.create({
    collection: 'articles',
    data: {
      title: `Test article ${suffix}`,
      slug: `test-article-${suffix}`,
      standfirst: 'A standfirst.',
      publishedOn: '2026-08-08T00:00:00.000Z',
      _status: 'published',
      ...overrides,
    } as RequiredDataFromCollectionSlug<'articles'>,
    overrideAccess: true,
    context: skipRevalidation,
  })
  articles.push(doc.id)
  return doc
}

afterAll(async () => {
  for (const id of articles) {
    await payload
      .delete({ collection: 'articles', id, overrideAccess: true, context: skipRevalidation })
      .catch(() => undefined)
  }
  for (const id of categories) {
    await payload
      .delete({
        collection: 'article-categories',
        id,
        overrideAccess: true,
        context: skipRevalidation,
      })
      .catch(() => undefined)
  }
})

describe('drafts are unreachable, not hidden', () => {
  it('keeps an unpublished article out of a listing', async () => {
    const category = await makeCategory('drafts')
    const draft = await makeArticle({
      category: category.id,
      slug: `draft-${suffix}`,
      _status: 'draft',
    })

    const { docs } = await payload.find({
      collection: 'articles',
      where: { slug: { equals: `draft-${suffix}` } },
      overrideAccess: false,
    })

    expect(docs).toHaveLength(0)
    expect(draft.id).toBeTypeOf('number')
  })

  /**
   * The assertion a route-level `notFound()` cannot make. `/api/articles/<id>` never reaches a
   * route, so if the constraint were a filter in the loader rather than an access rule, this read
   * would return the draft.
   */
  it('refuses a direct read of an unpublished article by id', async () => {
    const category = await makeCategory('direct')
    const draft = await makeArticle({
      category: category.id,
      slug: `direct-draft-${suffix}`,
      _status: 'draft',
    })

    await expect(
      payload.findByID({ collection: 'articles', id: draft.id, overrideAccess: false }),
    ).rejects.toThrow()
  })

  it('serves a published article to anybody', async () => {
    const category = await makeCategory('published')
    await makeArticle({ category: category.id, slug: `published-${suffix}` })

    const { docs } = await payload.find({
      collection: 'articles',
      where: { slug: { equals: `published-${suffix}` } },
      overrideAccess: false,
    })

    expect(docs).toHaveLength(1)
  })
})

describe('the fields refuse invalid content', () => {
  it('refuses an article with no title', async () => {
    const category = await makeCategory('no-title')

    await expect(
      payload.create({
        collection: 'articles',
        data: {
          slug: `no-title-${suffix}`,
          standfirst: 'A standfirst.',
          category: category.id,
          publishedOn: '2026-08-08T00:00:00.000Z',
        } as RequiredDataFromCollectionSlug<'articles'>,
        overrideAccess: true,
        context: skipRevalidation,
      }),
    ).rejects.toThrow()
  })

  it('refuses an article with no standfirst, category or publication date', async () => {
    const category = await makeCategory('missing')

    for (const missing of ['standfirst', 'category', 'publishedOn'] as const) {
      const data: Record<string, unknown> = {
        title: 'A title',
        slug: `missing-${missing}-${suffix}`,
        standfirst: 'A standfirst.',
        category: category.id,
        publishedOn: '2026-08-08T00:00:00.000Z',
      }
      delete data[missing]

      await expect(
        payload.create({
          collection: 'articles',
          data: data as RequiredDataFromCollectionSlug<'articles'>,
          overrideAccess: true,
          context: skipRevalidation,
        }),
      ).rejects.toThrow()
    }
  })

  /** FR-036: refused with an explanation, never silently suffixed. */
  it('refuses a duplicate address', async () => {
    const category = await makeCategory('dupe')
    await makeArticle({ category: category.id, slug: `dupe-${suffix}` })

    await expect(
      payload.create({
        collection: 'articles',
        data: {
          title: 'A different article',
          slug: `dupe-${suffix}`,
          standfirst: 'A standfirst.',
          category: category.id,
          publishedOn: '2026-08-08T00:00:00.000Z',
        } as RequiredDataFromCollectionSlug<'articles'>,
        overrideAccess: true,
        context: skipRevalidation,
      }),
    ).rejects.toThrow()
  })
})

describe('the address is permanent', () => {
  it('derives the slug from the title on create and leaves it alone on rename', async () => {
    const category = await makeCategory('slugs')

    const created = await payload.create({
      collection: 'articles',
      data: {
        title: `Product Care Guide ${suffix}`,
        standfirst: 'A standfirst.',
        category: category.id,
        publishedOn: '2026-08-08T00:00:00.000Z',
        _status: 'published',
      } as RequiredDataFromCollectionSlug<'articles'>,
      overrideAccess: true,
      context: skipRevalidation,
    })
    articles.push(created.id)

    expect(created.slug).toBe(`product-care-guide-${suffix}`)

    const renamed = await payload.update({
      collection: 'articles',
      id: created.id,
      data: { title: 'Renamed Care Guide' },
      overrideAccess: true,
      context: skipRevalidation,
    })

    // A rename that moved the address would break every link ever shared to this article.
    expect(renamed.slug).toBe(`product-care-guide-${suffix}`)
  })
})

describe('a deleted category', () => {
  /**
   * The behaviour most likely to be asserted in a docstring and never checked. Cascading would
   * delete published writing because somebody tidied a taxonomy; blocking the delete would leave an
   * editor unable to remove a category without hunting every article by hand. Neither happens.
   */
  it('leaves its articles published, and the mapper yields no badge', async () => {
    const category = await makeCategory('doomed')
    const created = await makeArticle({ category: category.id, slug: `orphan-${suffix}` })

    await payload.delete({
      collection: 'article-categories',
      id: category.id,
      overrideAccess: true,
      context: skipRevalidation,
    })
    categories.splice(categories.indexOf(category.id), 1)

    const { docs } = await payload.find({
      collection: 'articles',
      where: { slug: { equals: `orphan-${suffix}` } },
      depth: 1,
      overrideAccess: false,
    })

    expect(docs).toHaveLength(1)
    expect(docs[0]?._status).toBe('published')
    expect(created.id).toBe(docs[0]?.id)

    // The relationship no longer resolves, so the card renders without a badge rather than with a
    // dangling one — and the article keeps its page.
    const card = toArticleCard(docs[0]!, 0, 'en')
    expect(card.category).toBeUndefined()
    expect(card.href).toBe(`/blog/orphan-${suffix}`)
  })
})

describe('narrowing by category', () => {
  it('matches on the category’s slug, which is what the route puts in the address', async () => {
    const category = await makeCategory('narrow')
    await makeArticle({ category: category.id, slug: `narrowed-${suffix}` })

    const { docs, totalDocs } = await payload.find({
      collection: 'articles',
      where: { 'category.slug': { equals: `narrow-${suffix}` } },
      depth: 1,
      overrideAccess: false,
    })

    expect(totalDocs).toBe(1)
    expect(docs[0]?.slug).toBe(`narrowed-${suffix}`)
  })
})
