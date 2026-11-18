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

    /*
      Other tests in this file and in `policies-admin.spec.ts` create policies at timestamped
      `e2e-*` addresses, place them in the footer, and then unpublish or delete them. Running in
      parallel, one of those can vanish between this footer being rendered and its link being
      requested — a race in the TEST FIXTURES, not a dead link on the site.

      Filtering them keeps the assertion exactly as strong as it should be: every link the real site
      chrome publishes resolves. Their own appearance and disappearance is asserted where it belongs,
      in the tests that create them.
    */
    const chrome = hrefs.filter((href) => !href.startsWith('/legal/e2e-'))

    expect(chrome.length).toBeGreaterThan(0)

    for (const href of chrome) {
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
    /*
      A unique title, not just a unique slug. Two tests in two files both created an
      "Accessibility Statement"; run in parallel the footer held both, and a by-name locator matched
      two anchors and failed on strict mode. The slug was already timestamped — the title has to be
      too, because that is what the footer renders and what these assertions look for.
    */
    const stamp = Date.now()
    const slug = `e2e-fifth-${stamp}`
    const title = `Accessibility Statement ${stamp}`
    await make({
      slug,
      title,
      body: body('We are working towards WCAG 2.2 Level AA across this website.'),
      footerPlacement: 'legal',
      footerOrder: 940,
    })

    await page.goto('/')
    const anchor = page.locator('footer').getByRole('link', { name: title })
    await expect(anchor).toHaveAttribute('href', `/legal/${slug}`)

    await anchor.click()
    await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible()
    await expect(page.getByText('WCAG 2.2 Level AA')).toBeVisible()
  })
})

test.describe('the catalogue is untouched by this feature', () => {
  // The `/legal/` prefix exists so that policies never share a route segment with the shop
  // (009/research.md R1). This is that claim, asserted rather than assumed.
  test('category listings and the root 404 behave exactly as before', async ({ page }) => {
    expect((await page.request.get('/category-1')).status()).toBe(200)
    expect((await page.request.get('/category-1?colour=black')).status()).toBe(200)
    expect((await page.request.get('/not-a-real-page')).status()).toBe(404)

    // The bare addresses the footer used to publish were never served and still are not. Nothing is
    // owed a redirect, because nothing ever resolved there.
    expect((await page.request.get('/privacy')).status()).toBe(404)
  })
})

test.describe('found and shared (US6)', () => {
  test('each page emits an owner-controllable title, a canonical and social tags', async ({ page }) => {
    await page.goto('/legal/privacy')

    await expect(page).toHaveTitle(/Privacy Policy/)
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      /\/legal\/privacy$/,
    )
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', /\/legal\/privacy$/)
    await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'website')
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      'content',
      'Privacy Policy',
    )
  })

  test('an SEO title set in the admin overrides the page title', async ({ page }) => {
    const slug = `e2e-seo-${Date.now()}`
    await make({
      slug,
      title: 'Plain Title',
      body: body('Something.'),
      seo: { title: 'A Better Title For Search', description: 'A description for search.' },
    })

    await page.goto(`/legal/${slug}`)

    await expect(page).toHaveTitle(/A Better Title For Search/)
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      'content',
      'A description for search.',
    )
    // The heading is still the page's own title — SEO overrides what search engines read, not what
    // a visitor reads.
    await expect(page.getByRole('heading', { level: 1, name: 'Plain Title' })).toBeVisible()
  })

  test('published policies appear in the sitemap, and unpublished ones do not', async ({ page }) => {
    const slug = `e2e-sitemap-${Date.now()}`
    const document = await make({ slug, title: 'Sitemap Check', body: body('Listed.') })

    const listed = await (await page.request.get('/sitemap.xml')).text()
    expect(listed).toContain(`/legal/${slug}`)
    for (const seeded of ['privacy', 'terms', 'cookies', 'shipping']) {
      expect(listed).toContain(`/legal/${seeded}`)
    }

    await payload.update({
      collection: 'policies',
      id: document.id,
      data: { _status: 'draft' } as never,
      context: skipRevalidation,
      overrideAccess: true,
    })

    const after = await (await page.request.get('/sitemap.xml')).text()
    expect(after).not.toContain(`/legal/${slug}`)
  })

  test('no structured data is claimed for a policy page', async ({ page }) => {
    // `/faq` emits FAQPage because the page is nothing but an FAQ. There is no schema.org type that
    // describes a privacy policy honestly, and marking one up as something it is not is a claim to a
    // crawler the page does not support.
    await page.goto('/legal/privacy')
    await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(0)
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
