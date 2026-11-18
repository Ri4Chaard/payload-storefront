import config from '@payload-config'
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

/**
 * The story page global: drafts, versions, access, and the one refusal the media slot exists to
 * make.
 *
 * **The video/poster rule is the important one here.** `mediaSlot()` cannot use `required`, because
 * a statically-required field that is conditionally hidden makes the OTHER branch unsavable — a
 * photograph slot has no video, and would fail validation forever. The obligation is therefore a
 * `validate` function, and a validator is exactly the kind of thing that looks right in review and
 * does nothing at runtime. This is what proves it fires.
 *
 * Every write goes through `overrideAccess: false` with a real admin, so the global's own access
 * and field validation run as they do in the admin panel.
 */

const payload = await getPayload({ config })

const admin = await (async () => {
  const email = `story-${Date.now()}@story.aurum-testing.dev`
  const doc = await payload.create({
    collection: 'admins',
    data: { email, name: 'Story page test admin', password: 'a-long-enough-password' },
    overrideAccess: true,
  })
  return payload.findByID({ collection: 'admins', id: doc.id, overrideAccess: true })
})()

const asAdmin = { ...admin, collection: 'admins' } as Parameters<
  typeof payload.updateGlobal
>[0]['user']

type Body = Parameters<typeof payload.updateGlobal>[0]['data']

const header = (heading: string) => [{ blockType: 'page-header', heading }]

/** Restore whatever was there, so a run does not leave the local admin panel rewritten. */
let original: unknown

beforeAll(async () => {
  const doc = await payload.findGlobal({ slug: 'story-page', overrideAccess: true, depth: 0 })
  original = doc.body
})

afterAll(async () => {
  await payload
    .updateGlobal({
      slug: 'story-page',
      data: { body: original } as Body,
      overrideAccess: true,
    })
    .catch(() => undefined)
  await payload.delete({ collection: 'admins', id: admin.id, overrideAccess: true }).catch(() => undefined)
})

describe('drafts and versions', () => {
  it('leaves the published page untouched when a draft is saved', async () => {
    await payload.updateGlobal({
      slug: 'story-page',
      data: { body: header('PUBLISHED HEADLINE'), _status: 'published' } as Body,
      user: asAdmin,
      overrideAccess: false,
    })

    /*
      `draft: true` is the OPERATION flag, and it is what routes the write to the versions table.
      Putting `_status: 'draft'` in `data` alone does not — the first version of this test did that
      and the "draft" overwrote the live page, which looked like a product bug and was a misuse of
      the API. The admin panel's "Save draft" button sends this flag; so does this.
    */
    await payload.updateGlobal({
      slug: 'story-page',
      data: { body: header('DRAFT HEADLINE') } as Body,
      draft: true,
      user: asAdmin,
      overrideAccess: false,
    })

    // `draft: false` is what the loader passes. The draft must be invisible to it.
    const live = await payload.findGlobal({ slug: 'story-page', draft: false, overrideAccess: false })
    const blocks = live.body ?? []

    expect(blocks[0]).toMatchObject({ heading: 'PUBLISHED HEADLINE' })
  })

  it('keeps the previous version so a change can be reverted without a deploy', async () => {
    const versions = await payload.findGlobalVersions({
      slug: 'story-page',
      limit: 5,
      overrideAccess: true,
    })

    expect(versions.docs.length).toBeGreaterThan(1)
  })
})

describe('the media slot refuses a video with no still', () => {
  it('will not publish a slot set to video without a poster', async () => {
    await expect(
      payload.updateGlobal({
        slug: 'story-page',
        data: {
          body: [{ blockType: 'media-plate', media: { kind: 'video' } }],
          _status: 'published',
        } as Body,
        user: asAdmin,
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })

  it('accepts the same slot set to photograph, which needs neither', async () => {
    const saved = await payload.updateGlobal({
      slug: 'story-page',
      data: {
        body: [{ blockType: 'media-plate', media: { kind: 'photo' } }],
        _status: 'published',
      } as Body,
      user: asAdmin,
      overrideAccess: false,
    })

    // The point of the conditional validator: an empty photograph slot is a legitimate saved state.
    expect(saved.body).toHaveLength(1)
  })
})

describe('who may change the page', () => {
  it('refuses an update from an anonymous caller', async () => {
    await expect(
      payload.updateGlobal({
        slug: 'story-page',
        data: { body: header('WRITTEN BY NOBODY') } as Body,
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })

  it('lets anyone read it', async () => {
    const doc = await payload.findGlobal({ slug: 'story-page', overrideAccess: false })
    expect(doc).toBeTruthy()
  })
})
