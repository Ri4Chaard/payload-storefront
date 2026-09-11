import config from '@payload-config'
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { getFooterPolicies, getPolicyBySlug } from '@/lib/policies/queries'

/**
 * The policies collection's refusals, and the footer's view of it (spec 009, T015).
 *
 * Most of these are claims about what CANNOT happen, so they are tested by attempting the forbidden
 * thing and asserting the refusal. A draft that is merely *filtered* from a page would pass a
 * rendering test and still be readable over the API; FR-011 needs it unreachable, which is a
 * property of the query rather than of the consumer.
 *
 * Every read below goes through the real data tier with `overrideAccess: false`, so the collection's
 * own access functions run the way they run in production.
 */

const payload = await getPayload({ config })

const created: number[] = []

const make = async (data: Record<string, unknown>) => {
  const document = await payload.create({
    collection: 'policies',
    data: {
      title: 'Test Policy',
      footerPlacement: 'hidden',
      footerOrder: 0,
      _status: 'published',
      ...data,
    } as never,
    overrideAccess: true,
  })
  created.push(document.id)
  return document
}

/**
 * The message an editor actually reads.
 *
 * Payload's `ValidationError` puts a generic "The following field is invalid: slug" on `message`
 * and the useful sentence on the field entry — which is the one the admin renders underneath the
 * field. Asserting on the top-level message would pass against a hook that said nothing helpful, so
 * these tests dig out the field message instead.
 */
const fieldError = async (attempt: Promise<unknown>, field: string): Promise<string> => {
  try {
    await attempt
  } catch (error) {
    const errors = (error as { data?: { errors?: { path: string; message: string }[] } }).data?.errors
    return errors?.find((entry) => entry.path === field)?.message ?? ''
  }

  throw new Error(`Expected the write to be rejected on "${field}", but it succeeded.`)
}

afterAll(async () => {
  for (const id of created) {
    await payload.delete({ collection: 'policies', id, overrideAccess: true }).catch(() => {})
  }
})

describe('draft policies are unreachable, not merely hidden', () => {
  it('a draft is not returned by the data tier', async () => {
    const slug = `t-draft-${Date.now()}`
    await make({ slug, title: 'Draft Policy', _status: 'draft' })

    expect(await getPolicyBySlug(slug, 'en')).toBeNull()
  })

  it('a draft is not readable through the collection API either', async () => {
    const slug = `t-api-${Date.now()}`
    await make({ slug, title: 'API Draft', _status: 'draft' })

    const found = await payload.find({
      collection: 'policies',
      where: { slug: { equals: slug } },
      overrideAccess: false,
      draft: false,
    })

    expect(found.docs).toHaveLength(0)
  })

  it('a published policy is returned, with its address already built', async () => {
    const slug = `t-live-${Date.now()}`
    await make({ slug, title: 'Live Policy', subtitle: 'Last Updated: Today' })

    const policy = await getPolicyBySlug(slug, 'en')

    expect(policy?.title).toBe('Live Policy')
    expect(policy?.href).toBe(`/legal/${slug}`)
    expect(policy?.subtitle).toBe('Last Updated: Today')
  })
})

describe('an address belongs to one policy', () => {
  it('rejects a duplicate slug, naming the policy that holds it', async () => {
    const slug = `t-dupe-${Date.now()}`
    await make({ slug, title: 'The First One' })

    const message = await fieldError(make({ slug, title: 'The Second One' }), 'slug')
    expect(message).toContain('The First One')
    expect(message).toContain(slug)
  })

  it('rejects a duplicate even when the holder is an unpublished draft', async () => {
    const slug = `t-dupe-draft-${Date.now()}`
    await make({ slug, title: 'Unpublished Holder', _status: 'draft' })

    const message = await fieldError(make({ slug, title: 'Late Arrival' }), 'slug')
    expect(message).toContain('Unpublished Holder')
  })

  it('lets a policy keep its own slug when something else is edited', async () => {
    const slug = `t-self-${Date.now()}`
    const document = await make({ slug, title: 'Self Update' })

    const updated = await payload.update({
      collection: 'policies',
      id: document.id,
      data: { subtitle: 'Changed' },
      overrideAccess: true,
    })

    expect(updated.subtitle).toBe('Changed')
  })

  it('accepts a slug that matches a catalogue category — the /legal/ prefix owns its namespace', async () => {
    // The check an earlier design needed, deliberately absent (009/research.md R2). `/legal/rings`
    // shadows nothing, so this must be allowed rather than rejected by a stale reserved-word list.
    const document = await make({ slug: `rings-${Date.now()}`, title: 'Rings Care Guide' })
    expect(document.id).toBeTruthy()
  })
})

describe('the footer follows what is published', () => {
  it('groups published policies by placement, lowest order first', async () => {
    const stamp = Date.now()
    await make({ slug: `t-l2-${stamp}`, title: 'Second Legal', footerPlacement: 'legal', footerOrder: 920 })
    await make({ slug: `t-l1-${stamp}`, title: 'First Legal', footerPlacement: 'legal', footerOrder: 910 })
    await make({ slug: `t-cc-${stamp}`, title: 'A Care Page', footerPlacement: 'customer-care', footerOrder: 900 })

    const { legal, customerCare } = await getFooterPolicies('en')
    const labels = legal.map((link) => link.label)

    expect(labels.indexOf('First Legal')).toBeLessThan(labels.indexOf('Second Legal'))
    expect(customerCare.map((link) => link.label)).toContain('A Care Page')
    expect(labels).not.toContain('A Care Page')
  })

  it('omits a policy placed outside the footer', async () => {
    const stamp = Date.now()
    await make({ slug: `t-hidden-${stamp}`, title: 'Deliberately Unlisted', footerPlacement: 'hidden' })

    const { legal, customerCare } = await getFooterPolicies('en')
    const all = [...legal, ...customerCare].map((link) => link.label)

    expect(all).not.toContain('Deliberately Unlisted')
  })

  it('omits an unpublished policy, so unpublishing removes its link (FR-015c)', async () => {
    const stamp = Date.now()
    await make({
      slug: `t-unpub-${stamp}`,
      title: 'Withdrawn Policy',
      footerPlacement: 'legal',
      footerOrder: 930,
      _status: 'draft',
    })

    const { legal } = await getFooterPolicies('en')
    expect(legal.map((link) => link.label)).not.toContain('Withdrawn Policy')
  })
})

describe('cookie categories cannot describe a site that does not exist', () => {
  const current = async () =>
    payload.findGlobal({ slug: 'cookie-settings', depth: 0, overrideAccess: true })

  /*
    Snapshot and restore, because `cookie-settings` is a single global that drives the banner on
    every page of the site — not a row this file created and can delete.

    Every write below is expected to be REJECTED, so in principle nothing changes and this is
    belt-and-braces. In practice it is not optional: a validator that lets one of these through
    leaves the dev database holding a category nobody typed, and the failure then surfaces somewhere
    unrelated — an e2e test asserting the site offers exactly one category, hours later, with
    nothing pointing back to here. That happened while this suite was being written.
  */
  let original: Record<string, unknown>

  beforeAll(async () => {
    const settings = await current()
    original = {
      enabled: settings.enabled,
      consentVersion: settings.consentVersion,
      policy: settings.policy,
      categories: settings.categories,
    }
  })

  afterAll(async () => {
    await payload
      .updateGlobal({
        slug: 'cookie-settings',
        data: { ...original, _status: 'published' } as never,
        overrideAccess: true,
      })
      .catch(() => undefined)
  })

  it('refuses an empty category list', async () => {
    const before = await current()

    await expect(
      payload.updateGlobal({
        slug: 'cookie-settings',
        data: { categories: [] } as never,
        overrideAccess: true,
      }),
    ).rejects.toThrow()

    // Unchanged.
    expect((await current()).categories).toHaveLength(before.categories.length)
  })

  it('refuses a configuration where nothing is strictly necessary', async () => {
    await expect(
      payload.updateGlobal({
        slug: 'cookie-settings',
        data: {
          categories: [
            { key: 'analytics', name: 'Analytics', purpose: 'Measuring visits.', necessary: false },
          ],
        } as never,
        overrideAccess: true,
      }),
    ).rejects.toThrow()
  })

  it('refuses two categories sharing an identifier', async () => {
    await expect(
      payload.updateGlobal({
        slug: 'cookie-settings',
        data: {
          categories: [
            { key: 'necessary', name: 'Necessary', purpose: 'Required.', necessary: true },
            { key: 'necessary', name: 'Also Necessary', purpose: 'Required.', necessary: true },
          ],
        } as never,
        overrideAccess: true,
      }),
    ).rejects.toThrow()
  })

  it('refuses an identifier that is not lowercase kebab-case', async () => {
    await expect(
      payload.updateGlobal({
        slug: 'cookie-settings',
        data: {
          categories: [
            { key: 'Analytics Cookies', name: 'Analytics', purpose: 'Measuring.', necessary: true },
          ],
        } as never,
        overrideAccess: true,
      }),
    ).rejects.toThrow()
  })
})
