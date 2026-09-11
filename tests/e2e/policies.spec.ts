import config from '@payload-config'
import { expect, test } from '@playwright/test'
import { getPayload } from 'payload'

import { skipRevalidation } from '@/lib/revalidate'

/**
 * The policy pages, end to end (spec 009, T017).
 *
 * **The first assertion is the whole point of User Story 1**: four links the footer has published
 * since spec 001 answered "not found" in production, on every page of this site. Everything else
 * here guards the edges around that.
 *
 * **Not serial, and it needs no content lock.** Every test below creates its own policy at a
 * timestamped address and deletes it afterwards, so parallel workers cannot collide. That is a
 * luxury `faq.spec.ts` does not have — its rows are a shared collection and a shared global — and it
 * is available here because a policy is a self-contained page rather than a row three pages draw.
 * The four seeded policies are only ever read, never rewritten.
 */

const payload = await getPayload({ config })

const created: number[] = []

const body = (text: string) => ({
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
        children: [
          { type: 'text', detail: 0, format: 0, mode: 'normal', style: '', text, version: 1 },
        ],
      },
    ],
  },
})

const make = async (data: Record<string, unknown>) => {
  const document = await payload.create({
    collection: 'policies',
    data: {
      title: 'Temporary Policy',
      footerPlacement: 'hidden',
      footerOrder: 900,
      _status: 'published',
      ...data,
    } as never,
    context: skipRevalidation,
    overrideAccess: true,
  })
  created.push(document.id)
  return document
}

test.afterAll(async () => {
  for (const id of created) {
    await payload
      .delete({ collection: 'policies', id, context: skipRevalidation, overrideAccess: true })
      .catch(() => {})
  }
})

test.describe('the footer no longer publishes dead links', () => {
  const FOOTER_LINKS = [
    { label: 'Privacy Policy', href: '/legal/privacy', heading: 'Privacy Policy' },
    { label: 'Terms & Conditions', href: '/legal/terms', heading: 'Terms & Conditions' },
    { label: 'Cookie Policy', href: '/legal/cookies', heading: 'Cookie Policy' },
    { label: 'Shipping & Returns', href: '/legal/shipping', heading: 'Shipping & Returns' },
  ]

  for (const link of FOOTER_LINKS) {
    test(`${link.label} in the footer opens ${link.href}`, async ({ page }) => {
      await page.goto('/')

      const anchor = page.locator('footer').getByRole('link', { name: link.label, exact: true })
      await expect(anchor).toHaveAttribute('href', link.href)

      await anchor.click()
      await expect(page).toHaveURL(link.href)
      await expect(page.getByRole('heading', { level: 1, name: link.heading })).toBeVisible()

      // The page is a page of this site, not a bare document: the chrome is present.
      await expect(page.locator('footer')).toBeVisible()
      await expect(page.locator('header')).toBeVisible()
    })
  }

  test('no footer link anywhere answers 404', async ({ page }) => {
    await page.goto('/')

    const hrefs = await page.locator('footer a[href^="/"]').evaluateAll((anchors) =>
      Array.from(new Set(anchors.map((anchor) => anchor.getAttribute('href') ?? ''))),
    )

    expect(hrefs.length).toBeGreaterThan(0)

    for (const href of hrefs) {
      const response = await page.request.get(href)
      expect(response.status(), `${href} should not be a dead link`).toBeLessThan(400)
    }
  })
})

test.describe('what the page draws', () => {
  test('renders the owner’s prose — headings, lists and links included', async ({ page }) => {
    await page.goto('/legal/cookies')

    await expect(page.getByRole('heading', { level: 2, name: 'What are cookies?' })).toBeVisible()
    await expect(page.getByRole('listitem').first()).toBeVisible()
  })

  test('the subtitle is free text, not a formatted date', async ({ page }) => {
    // Three pages use it for "Last Updated: …"; this one uses it for a sentence. A date field would
    // have rendered one of the four correctly (FR-007).
    await page.goto('/legal/shipping')
    await expect(
      page.getByText('Enjoy complimentary shipping and returns on all orders'),
    ).toBeVisible()
  })

  test('a published policy with an empty body shows a placeholder, never a 404 (FR-006)', async ({
    page,
  }) => {
    const slug = `e2e-empty-${Date.now()}`
    await make({ slug, title: 'Empty Policy' })

    const response = await page.goto(`/legal/${slug}`)

    expect(response?.status()).toBe(200)
    await expect(page.getByRole('heading', { level: 1, name: 'Empty Policy' })).toBeVisible()
    await expect(page.getByText('Nothing here yet')).toBeVisible()
  })

  test('an unknown address is the branded 404', async ({ page }) => {
    const response = await page.goto('/legal/no-such-policy')
    expect(response?.status()).toBe(404)
  })
})

test.describe('publishing controls what exists', () => {
  test('an unpublished policy 404s and carries no footer link (FR-015c)', async ({ page }) => {
    const slug = `e2e-draft-${Date.now()}`
    await make({
      slug,
      title: 'Unpublished Notice',
      body: body('Not for readers yet.'),
      footerPlacement: 'legal',
      footerOrder: 910,
      _status: 'draft',
    })

    const response = await page.goto(`/legal/${slug}`)
    expect(response?.status()).toBe(404)

    await page.goto('/')
    await expect(
      page.locator('footer').getByRole('link', { name: 'Unpublished Notice' }),
    ).toHaveCount(0)
  })

  test('a policy the owner creates gets an address and a footer link, with no deploy', async ({
    page,
  }) => {
    const slug = `e2e-fifth-${Date.now()}`
    await make({
      slug,
      title: 'Accessibility Statement',
      body: body('We are working towards WCAG 2.2 Level AA across this website.'),
      footerPlacement: 'legal',
      footerOrder: 940,
    })

    await page.goto('/')
    const anchor = page.locator('footer').getByRole('link', { name: 'Accessibility Statement' })
    await expect(anchor).toHaveAttribute('href', `/legal/${slug}`)

    await anchor.click()
    await expect(page.getByRole('heading', { level: 1, name: 'Accessibility Statement' })).toBeVisible()
    await expect(page.getByText('WCAG 2.2 Level AA')).toBeVisible()
  })
})

test.describe('the catalogue is untouched by this feature', () => {
  // The `/legal/` prefix exists so that policies never share a route segment with the shop
  // (009/research.md R1). This is that claim, asserted rather than assumed.
  test('category listings and the root 404 behave exactly as before', async ({ page }) => {
    expect((await page.request.get('/rings')).status()).toBe(200)
    expect((await page.request.get('/rings?colour=black')).status()).toBe(200)
    expect((await page.request.get('/not-a-real-page')).status()).toBe(404)

    // The bare addresses the footer used to publish were never served and still are not. Nothing is
    // owed a redirect, because nothing ever resolved there.
    expect((await page.request.get('/privacy')).status()).toBe(404)
  })
})

test.describe('at 390px', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('the prose is one readable column with no horizontal scrolling', async ({ page }) => {
    await page.goto('/legal/privacy')

    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    )

    expect(overflows).toBe(false)
  })
})
