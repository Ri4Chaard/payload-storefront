import config from '@payload-config'
import { getPayload } from 'payload'
import { afterAll, describe, expect, it } from 'vitest'

import { skipRevalidation } from '@/lib/revalidate'

/**
 * Publishing one language does not publish another's draft (spec 010, T034 — FR-023).
 *
 * **`defaultLocalePublishOption: 'active'` is NOT Payload's default**, and that is the whole point
 * of this file. The shipped value is `'all'`, where pressing Publish while editing Russian pushes
 * every locale's draft live — including a half-finished Ukrainian one nobody meant to show. Nothing
 * in a diff would reveal that being switched back, and no page would look wrong until an editor
 * found their unfinished words on the site.
 */
const payload = await getPayload({ config })
const created: number[] = []

afterAll(async () => {
  for (const id of created) {
    await payload.delete({ collection: 'policies', id, overrideAccess: true }).catch(() => undefined)
  }
})

describe('the publish option', () => {
  it('is set to publish only the locale being edited', () => {
    // Asserted on the config rather than only through behaviour: this is a one-word setting whose
    // absence is invisible, and the failure it prevents is an editor's unfinished text going live.
    expect(payload.config.localization).toBeTruthy()
    const localization = payload.config.localization as { defaultLocalePublishOption?: string }
    expect(localization.defaultLocalePublishOption).toBe('active')
  })

  it('keeps all three languages configured whatever the storefront offers', () => {
    // FR-030: a language hidden from visitors stays editable in the admin. Payload's list and
    // `language-settings` are deliberately different lists.
    const localization = payload.config.localization as { localeCodes?: string[] }
    expect(localization.localeCodes).toEqual(['en', 'ru', 'uk'])
  })
})

describe('a draft in one language', () => {
  it('does not reach visitors when another language is published', async () => {
    const doc = await payload.create({
      collection: 'policies',
      overrideAccess: true,
      context: skipRevalidation,
      data: {
        title: 'Publish Test',
        footerPlacement: 'legal',
        footerOrder: 99,
        slug: `publish-test-${Date.now()}`,
        _status: 'published',
      },
    })
    created.push(doc.id as number)

    // A Ukrainian draft, never published.
    await payload.update({
      collection: 'policies',
      id: doc.id,
      locale: 'uk',
      draft: true,
      overrideAccess: true,
      context: skipRevalidation,
      data: { title: 'Чернетка, яку ніхто не публікував' },
    })

    // Read the way the storefront reads: published only, no drafts.
    const published = await payload.findByID({
      collection: 'policies',
      id: doc.id,
      locale: 'uk',
      draft: false,
      overrideAccess: false,
    })

    expect(published.title).not.toBe('Чернетка, яку ніхто не публікував')
    // …and it falls back to the published English rather than to nothing.
    expect(published.title).toBe('Publish Test')
  })
})
