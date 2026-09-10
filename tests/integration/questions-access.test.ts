import config from '@payload-config'
import { getPayload, type RequiredDataFromCollectionSlug } from 'payload'
import { afterAll, describe, expect, it } from 'vitest'

/**
 * The FAQ collection's access rules and its refusals (006/T058, FR-030, FR-033, FR-036).
 *
 * **These are claims about what CANNOT happen**, so they are tested by attempting the forbidden
 * thing and asserting the refusal — not by checking that the permitted thing works. A draft that is
 * merely *filtered* from the page would pass a rendering test and still be readable over the API;
 * what FR-033 needs is that it is unreachable, which is a property of the query rather than of the
 * consumer.
 *
 * Every read passes `overrideAccess: false`, exactly as `src/lib/story/queries.ts` does, so the
 * collection's own access functions run the way they run in production.
 */

const payload = await getPayload({ config })

const answer = (text: string) => ({
  root: {
    type: 'root',
    format: '' as const,
    indent: 0,
    version: 1,
    direction: 'ltr' as const,
    children: [
      {
        type: 'paragraph',
        format: '' as const,
        indent: 0,
        version: 1,
        direction: 'ltr' as const,
        children: [{ type: 'text', detail: 0, format: 0, mode: 'normal', style: '', text, version: 1 }],
      },
    ],
  },
})

const created: number[] = []

/**
 * Payload's own data type for this collection.
 *
 * `Partial<...>` because half these tests exist to submit a document with a REQUIRED field missing
 * and assert the refusal — a fully-typed literal could not express the case under test.
 */
type QuestionData = RequiredDataFromCollectionSlug<'questions'>

async function write(data: Partial<QuestionData>) {
  const doc = await payload.create({
    collection: 'questions',
    data: data as QuestionData,
    overrideAccess: true,
  })
  created.push(doc.id)
  return doc
}

afterAll(async () => {
  for (const id of created) {
    await payload.delete({ collection: 'questions', id, overrideAccess: true }).catch(() => undefined)
  }
})

describe('what the collection refuses to store (FR-030)', () => {
  it('will not save a question with no question', async () => {
    await expect(
      write({ answer: answer('Yes, worldwide.'), _status: 'published' }),
    ).rejects.toThrow()
  })

  it('will not save a question with no answer', async () => {
    await expect(write({ question: 'Do you ship abroad?', _status: 'published' })).rejects.toThrow()
  })
})

describe('drafts are unreachable, not merely hidden (FR-033)', () => {
  it('does not return an unpublished question to an anonymous read', async () => {
    const draft = await write({
      question: 'Is this draft visible?',
      answer: answer('It must not be.'),
      _status: 'draft',
    })

    // The same call the loader makes. A draft filtered out downstream would still be readable here.
    const found = await payload.find({
      collection: 'questions',
      where: { id: { equals: draft.id } },
      overrideAccess: false,
    })

    expect(found.docs).toHaveLength(0)
  })

  it('returns it once published, with no other change', async () => {
    const doc = await write({
      question: 'Do you ship internationally?',
      answer: answer('Yes, we ship all over the world.'),
      _status: 'draft',
    })

    await payload.update({
      collection: 'questions',
      id: doc.id,
      data: { _status: 'published' },
      overrideAccess: true,
    })

    const found = await payload.find({
      collection: 'questions',
      where: { id: { equals: doc.id } },
      overrideAccess: false,
    })

    expect(found.docs).toHaveLength(1)
    expect(found.docs[0]?.question).toBe('Do you ship internationally?')
  })
})

describe('only staff may write (FR-036)', () => {
  it('refuses a create from an anonymous caller', async () => {
    await expect(
      payload.create({
        collection: 'questions',
        data: {
          question: 'Can anybody write this?',
          answer: answer('They must not be able to.'),
        },
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })

  it('refuses an update from an anonymous caller', async () => {
    const doc = await write({
      question: 'Who may edit me?',
      answer: answer('Staff only.'),
      _status: 'published',
    })

    await expect(
      payload.update({
        collection: 'questions',
        id: doc.id,
        data: { question: 'Edited by nobody' },
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })
})
