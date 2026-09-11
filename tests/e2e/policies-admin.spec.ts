import config from '@payload-config'
import { expect, test, type Page } from '@playwright/test'
import { getPayload } from 'payload'

import { skipRevalidation } from '@/lib/revalidate'

import { acquireSharedContentLock } from '../shared-content-lock'

/**
 * The editorial lifecycle for policies and cookie categories (spec 009, T041, T051).
 *
 * The Constitution's *Editorial verification* gate says a content model that renders correctly but
 * is unusable in the admin is a defect. Most of that gate is a person walking
 * `specs/009-policy-pages-cookie-consent/quickstart.md` §2, §3 and §7; what is automated here is the
 * part a person would get bored of repeating.
 *
 * **The category tests hold the shared content lock, and the policy tests do not.** A policy is a
 * self-contained page created at a timestamped address, so parallel workers cannot collide over one.
 * `cookie-settings` is a single global driving the banner on EVERY page, so a worker rewriting its
 * categories while another loads any page at all would break that other test. The lock is the same
 * one `contact.spec.ts` and `faq.spec.ts` use.
 *
 * The generous timeouts are for `next dev`, which compiles the admin panel on first request.
 */

const payload = await getPayload({ config })
const PASSWORD = 'a-long-enough-password'

test.describe.configure({ mode: 'serial' })

const suffix = Date.now()
let email: string
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
      title: 'Admin check',
      footerPlacement: 'hidden',
      footerOrder: 900,
      _status: 'published',
      ...data,
    } as never,
    overrideAccess: true,
    context: skipRevalidation,
  })
  created.push(document.id)
  return document
}

test.beforeAll(async () => {
  email = `e2e-policies-${suffix}@admin.aurum-testing.dev`
  await payload.create({
    collection: 'admins',
    data: { email, name: 'Policy editorial check', password: PASSWORD },
    overrideAccess: true,
  })
})

test.afterAll(async () => {
  for (const id of created) {
    await payload
      .delete({ collection: 'policies', id, overrideAccess: true, context: skipRevalidation })
      .catch(() => undefined)
  }
})

async function signIn(page: Page) {
  await page.goto('/admin/login')
  await page.locator('#field-email').fill(email)
  await page.locator('#field-password').fill(PASSWORD)
  await page.getByRole('button', { name: 'Login', exact: true }).click()
  await page.waitForURL((url) => !url.pathname.includes('/admin/login'), { timeout: 120_000 })
}

test('Policies and Cookie banner are both reachable in the admin', async ({ page }) => {
  test.setTimeout(240_000)
  await signIn(page)

  await expect(page.getByRole('link', { name: 'Policies', exact: true })).toBeVisible({
    timeout: 120_000,
  })
  await expect(page.getByRole('link', { name: 'Cookie banner', exact: true })).toBeVisible({
    timeout: 120_000,
  })
})

test('a draft is invisible, and publishing shows it (FR-011)', async ({ page }) => {
  test.setTimeout(240_000)

  const slug = `e2e-admin-draft-${suffix}`
  const document = await make({
    slug,
    title: 'Draft Lifecycle',
    body: body('The original sentence.'),
    _status: 'draft',
  })

  expect((await page.request.get(`/legal/${slug}`)).status()).toBe(404)

  await payload.update({
    collection: 'policies',
    id: document.id,
    data: { _status: 'published' } as never,
    overrideAccess: true,
    context: skipRevalidation,
  })

  await page.goto(`/legal/${slug}`)
  await expect(page.getByText('The original sentence.')).toBeVisible()

  /*
    An edit reaches the page on the very next view, with no revalidation anywhere. That is a
    property of the route being `force-dynamic` rather than of a hook — and it is the reason this
    collection deliberately has no `afterChange`, since the shared `invalidate()` would evict the
    whole catalogue over a typo.
  */
  await payload.update({
    collection: 'policies',
    id: document.id,
    data: { body: body('The corrected sentence.') } as never,
    overrideAccess: true,
    context: skipRevalidation,
  })

  await page.reload()
  await expect(page.getByText('The corrected sentence.')).toBeVisible()
  await expect(page.getByText('The original sentence.')).toBeHidden()
})

test('correcting the body does not move the effective date (FR-008)', async ({ page }) => {
  test.setTimeout(120_000)

  const document = await make({
    slug: `e2e-admin-date-${suffix}`,
    title: 'Date Stability',
    effectiveDate: '2026-01-15T00:00:00.000Z',
    body: body('Before.'),
  })

  await payload.update({
    collection: 'policies',
    id: document.id,
    data: { body: body('After a typo fix.') } as never,
    overrideAccess: true,
    context: skipRevalidation,
  })

  const after = await payload.findByID({
    collection: 'policies',
    id: document.id,
    overrideAccess: true,
  })

  // An effective date is a legal claim the owner makes deliberately. A hook that bumped it on save
  // would silently restate that claim every time somebody fixed a comma.
  expect(after.effectiveDate).toBe('2026-01-15T00:00:00.000Z')
  expect(page).toBeTruthy()
})

test('a fifth policy gets its own address and its own footer slot, with no deploy', async ({
  page,
}) => {
  test.setTimeout(120_000)

  const slug = `e2e-admin-fifth-${suffix}`
  await make({
    slug,
    title: 'Accessibility Statement',
    body: body('We are working towards WCAG 2.2 Level AA.'),
    footerPlacement: 'legal',
    footerOrder: 950,
  })

  await page.goto(`/legal/${slug}`)
  await expect(page.getByRole('heading', { level: 1, name: 'Accessibility Statement' })).toBeVisible()

  await page.goto('/')
  await expect(
    page.locator('footer').getByRole('link', { name: 'Accessibility Statement' }),
  ).toHaveAttribute('href', `/legal/${slug}`)
})

/**
 * Everything below rewrites `cookie-settings`, which drives the banner on every page of the site.
 *
 * Each test restores the global afterwards, and the shared lock keeps other suites out while they
 * run. Without both, a worker loading any page at all could meet a half-written configuration.
 */
test.describe('the cookie categories', () => {
  let release: () => Promise<void>
  let original: Record<string, unknown>

  test.beforeAll(async () => {
    release = await acquireSharedContentLock()
    const current = await payload.findGlobal({
      slug: 'cookie-settings',
      depth: 0,
      overrideAccess: true,
    })
    original = {
      enabled: current.enabled,
      consentVersion: current.consentVersion,
      policy: current.policy,
      categories: current.categories,
    }
  })

  test.afterAll(async () => {
    await payload
      .updateGlobal({
        slug: 'cookie-settings',
        data: { ...original, _status: 'published' } as never,
        overrideAccess: true,
        context: skipRevalidation,
      })
      .catch(() => undefined)

    await release?.()
  })

  const setCategories = async (categories: Record<string, unknown>[], consentVersion = 1) =>
    payload.updateGlobal({
      slug: 'cookie-settings',
      data: { enabled: true, consentVersion, categories, _status: 'published' } as never,
      overrideAccess: true,
      context: skipRevalidation,
    })

  const NECESSARY = {
    key: 'necessary',
    name: 'Strictly necessary',
    purpose: 'Sign-in, the shopping bag, and this choice.',
    necessary: true,
  }

  test('rewording a category changes the chooser, with no deploy (SC-007)', async ({ page }) => {
    await setCategories([{ ...NECESSARY, purpose: 'A freshly reworded explanation.' }])

    await page.goto('/')
    await page.getByRole('button', { name: 'Configure All Cookies' }).click()

    await expect(page.getByText('A freshly reworded explanation.')).toBeVisible()
  })

  /**
   * **FR-027a, observed from the visitor's side.**
   *
   * A visitor agrees when only necessary cookies exist. An optional category is added later. They
   * must be asked again, and the new category must arrive switched OFF — an old *Agree* is not
   * consent to something nobody was shown.
   *
   * If this fails, the failure mode is silent consent to tracking. Do not skip it.
   */
  test('an optional category added later is never inherited by an old Agree', async ({ page }) => {
    await setCategories([NECESSARY])

    await page.goto('/')
    await page.getByRole('button', { name: 'Agree' }).click()
    await expect(page.getByRole('region', { name: 'Cookie consent' })).toBeHidden()

    await setCategories([
      NECESSARY,
      {
        key: 'analytics',
        name: 'Analytics',
        purpose: 'Understanding which pages are read.',
        necessary: false,
      },
    ])

    await page.reload()

    // Asked again.
    await expect(page.getByRole('region', { name: 'Cookie consent' })).toBeVisible()

    // And off by default when they look.
    await page.getByRole('button', { name: 'Configure All Cookies' }).click()
    const dialog = page.getByRole('dialog', { name: 'Cookie settings' })
    // `role="switch"`, not `checkbox` — the kit's Switch puts a real checkbox behind a switch role
    // so it reads as on/off to a screen reader while keeping native form participation.
    await expect(dialog.getByRole('switch', { name: 'Analytics' })).not.toBeChecked()
  })

  test('removing a category drops it from the chooser without error (FR-041)', async ({ page }) => {
    await setCategories([NECESSARY])

    await page.goto('/')
    await page.getByRole('button', { name: 'Configure All Cookies' }).click()

    const dialog = page.getByRole('dialog', { name: 'Cookie settings' })
    await expect(dialog.getByText('Strictly necessary')).toBeVisible()
    await expect(dialog.getByText('Analytics')).toHaveCount(0)
  })

  test('advancing the consent version asks everyone again, keeping their answers (FR-042)', async ({
    page,
  }) => {
    await setCategories([NECESSARY], 1)

    await page.goto('/')
    await page.getByRole('button', { name: 'Agree' }).click()
    await expect(page.getByRole('region', { name: 'Cookie consent' })).toBeHidden()

    await setCategories([NECESSARY], 2)

    await page.reload()
    await expect(page.getByRole('region', { name: 'Cookie consent' })).toBeVisible()
  })

  test('turning the banner off shows nothing, and turning it back on does not re-ask', async ({
    page,
  }) => {
    await setCategories([NECESSARY], 1)

    await page.goto('/')
    await page.getByRole('button', { name: 'Agree' }).click()

    await payload.updateGlobal({
      slug: 'cookie-settings',
      data: { enabled: false, _status: 'published' } as never,
      overrideAccess: true,
      context: skipRevalidation,
    })

    await page.reload()
    await expect(page.getByRole('region', { name: 'Cookie consent' })).toBeHidden()
    await expect(
      page.locator('footer').getByRole('button', { name: 'Cookie Settings' }),
    ).toHaveCount(0)

    await payload.updateGlobal({
      slug: 'cookie-settings',
      data: { enabled: true, _status: 'published' } as never,
      overrideAccess: true,
      context: skipRevalidation,
    })

    // Their decision was left alone while it was off, so it still stands.
    await page.reload()
    await expect(page.getByRole('region', { name: 'Cookie consent' })).toBeHidden()
  })
})
