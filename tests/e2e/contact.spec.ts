import config from '@payload-config'
import { expect, test } from '@playwright/test'
import { getPayload } from 'payload'

import { DEFAULT_CONTACT } from '@/lib/contact/defaults'
import { skipRevalidation } from '@/lib/revalidate'

/**
 * The contact page, end to end (008/T031 – T033).
 *
 * **The channel cards are what this file is mostly about**, and every assertion below exists
 * because those four cards are *derived* rather than written. Nothing on `/contact` names WhatsApp
 * or an email address: the band reads `contact-settings`, the same record the footer and the
 * checkout modal read. That is FR-008 — one place to write the shop's accounts — and the way it
 * fails is silently, by somebody adding a second list. These tests are what notices.
 *
 * Content is driven through the Local API rather than the admin UI. Filling the admin in a real
 * browser would test Payload's forms rather than this feature.
 */

/**
 * **Serial, and it has to be.** `contact-settings` and `contact-page` are globals — there is
 * exactly one of each and no per-test fixture to isolate. Run in parallel, three workers rewrite
 * one row and each asserts against whatever the last writer left. `tests/e2e/about.spec.ts` records
 * the same decision after losing five tests to it.
 */
test.describe.configure({ mode: 'serial' })

const payload = await getPayload({ config })

/** The shop's own accounts, as an owner would have set them. */
const MESSENGERS = [
  { platform: 'whatsapp' as const, destination: '+1 (555) 010 20-30', handle: '+1 (555) 010 20-30', enabled: true },
  { platform: 'telegram' as const, destination: '@aurum', handle: '@aurum', enabled: true },
  { platform: 'instagram' as const, destination: '@aurum', handle: '@aurum', enabled: true },
]

/**
 * `skipRevalidation`, for the reason `src/lib/revalidate.ts` documents: `contact-settings` carries
 * `revalidateGlobalOnChange`, and this test process is not Next — `next/cache` is not importable
 * here, so the hook throws before the write completes. There is no cache in this process to
 * invalidate anyway, and the dev server the browser talks to is a different process whose cache
 * this one could not have reached.
 */
const setContactSettings = async (data: Record<string, unknown>) =>
  payload.updateGlobal({ slug: 'contact-settings', data: data as never, context: skipRevalidation })

test.beforeEach(async () => {
  await setContactSettings({
    email: 'hello@aurum.example',
    messengers: MESSENGERS,
  })
})

test('the four channels come from the admin, in the admin’s order', async ({ page }) => {
  await page.goto('/contact')

  const cards = page.getByTestId('channel-card')
  await expect(cards).toHaveCount(4)

  await expect(cards.nth(0)).toContainText('WhatsApp')
  await expect(cards.nth(0)).toContainText('+1 (555) 010 20-30')
  await expect(cards.nth(1)).toContainText('Telegram')
  await expect(cards.nth(2)).toContainText('Instagram')

  // The email card is last, always — it is the one channel that is not a messenger row (FR-011).
  await expect(cards.nth(3)).toContainText('hello@aurum.example')
  await expect(cards.nth(3).getByRole('link')).toHaveAttribute('href', 'mailto:hello@aurum.example')
})

test('each card leads to the right destination', async ({ page }) => {
  await page.goto('/contact')

  const cards = page.getByTestId('channel-card')

  // Built by `profileHref`, the same function the footer uses — never a link stored in a field.
  await expect(cards.nth(0).getByRole('link')).toHaveAttribute('href', /wa\.me\/15550102030/)
  await expect(cards.nth(1).getByRole('link')).toHaveAttribute('href', /t\.me\/aurum/)
  await expect(cards.nth(2).getByRole('link')).toHaveAttribute('href', /instagram\.com\/aurum/)
})

test('reordering the messengers reorders the cards, with no deployment', async ({ page }) => {
  await setContactSettings({
    email: 'hello@aurum.example',
    messengers: [MESSENGERS[2], MESSENGERS[0], MESSENGERS[1]],
  })

  await page.goto('/contact')

  const cards = page.getByTestId('channel-card')
  await expect(cards.nth(0)).toContainText('Instagram')
  await expect(cards.nth(1)).toContainText('WhatsApp')
  await expect(cards.nth(2)).toContainText('Telegram')
})

test('a fourth messenger becomes a fifth card', async ({ page }) => {
  await setContactSettings({
    email: 'hello@aurum.example',
    messengers: [
      ...MESSENGERS,
      { platform: 'telegram', destination: '@aurum_support', handle: '@aurum_support', enabled: true },
    ],
  })

  await page.goto('/contact')
  await expect(page.getByTestId('channel-card')).toHaveCount(5)
})

/**
 * FR-012, and the check that catches somebody "fixing" this into a filter.
 *
 * `enabled` means "offer this at checkout". Hiding a messenger from the order handoff and refusing
 * to be contacted on it are different decisions, and `getSocialLinks` has drawn that line since
 * spec 005 — its own comment says an owner who hides WhatsApp from checkout "has not asked to be
 * un-followable".
 */
test('a messenger not offered at checkout is still a way to reach the shop', async ({ page }) => {
  await setContactSettings({
    email: 'hello@aurum.example',
    messengers: [{ ...MESSENGERS[0]!, enabled: false }, MESSENGERS[1]!, MESSENGERS[2]!],
  })

  await page.goto('/contact')

  const cards = page.getByTestId('channel-card')
  await expect(cards).toHaveCount(4)
  await expect(cards.nth(0)).toContainText('WhatsApp')
})

/**
 * FR-013. A card that leads nowhere still looks like a working way to reach the shop, which is
 * worse than one card fewer.
 */
test('a messenger with no usable destination is omitted', async ({ page }) => {
  await setContactSettings({
    email: 'hello@aurum.example',
    messengers: [MESSENGERS[0]!, { platform: 'telegram', destination: '', handle: '@aurum', enabled: false }],
  })

  await page.goto('/contact')

  const cards = page.getByTestId('channel-card')
  await expect(cards).toHaveCount(2)
  await expect(cards.nth(0)).toContainText('WhatsApp')
  await expect(cards.nth(1)).toContainText('hello@aurum.example')
})

/**
 * An empty email field falls back to what shipped rather than rendering a dead `mailto:` — the rule
 * `getContactDetails` already applies for the footer, and for the same reason: a page with no way
 * to reach the shop is worse than one showing the details it came with.
 */
test('an empty email address falls back rather than rendering a dead link', async ({ page }) => {
  await setContactSettings({ email: '', messengers: MESSENGERS })

  await page.goto('/contact')

  const email = page.getByTestId('channel-card').last()
  await expect(email).toContainText(DEFAULT_CONTACT.email)
  await expect(email.getByRole('link')).toHaveAttribute('href', `mailto:${DEFAULT_CONTACT.email}`)
})

test('every card’s link is reachable by keyboard', async ({ page }) => {
  await page.goto('/contact')

  const links = page.getByTestId('channel-card').getByRole('link')
  await expect(links).toHaveCount(4)

  // Each announces both the platform and the handle, because the card's heading sits beside the
  // link rather than inside it — the reason the link is the value line and not the whole card.
  for (let i = 0; i < 4; i += 1) {
    await links.nth(i).focus()
    await expect(links.nth(i)).toBeFocused()
  }
})

test('the page header comes from the admin', async ({ page }) => {
  await payload.updateGlobal({
    slug: 'contact-page',
    data: { eyebrow: 'REACH US', heading: 'TALK TO AURUM', intro: 'However you prefer.' } as never,
    context: skipRevalidation,
  })

  await page.goto('/contact')

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('TALK TO AURUM')
  await expect(page.getByText('REACH US')).toBeVisible()
  await expect(page.getByText('However you prefer.')).toBeVisible()

  // Exactly one top-level heading (FR-004).
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
})

/**
 * The message form (008/T047 – T049).
 *
 * Enquiries are cleaned up after each test rather than before, so a failure leaves the row it wrote
 * behind for inspection.
 */
test.describe('the message form', () => {
  test.afterEach(async () => {
    await payload.delete({
      collection: 'enquiries',
      where: { email: { contains: 'aurum-testing.dev' } },
      overrideAccess: true,
      context: skipRevalidation,
    })
  })

  const fill = async (page: import('@playwright/test').Page, email: string) => {
    await page.getByPlaceholder('Name', { exact: true }).fill('Yara')
    await page.getByPlaceholder('E-mail', { exact: true }).fill(email)
    await page.getByPlaceholder('Message', { exact: true }).fill('Do you have this in a 1.5ct emerald cut?')
  }

  test('a completed form is confirmed, and the enquiry is recorded', async ({ page }) => {
    const email = `e2e-${Date.now()}@aurum-testing.dev`

    await page.goto('/contact')
    await fill(page, email)
    await page.getByRole('button', { name: /send message/i }).click()

    // The confirmation replaces the form (FR-021), and it is the editor's wording.
    await expect(page.getByRole('status')).toContainText(/your message has reached us/i)
    await expect(page.getByRole('button', { name: /send message/i })).toBeHidden()

    const found = await payload.count({
      collection: 'enquiries',
      where: { email: { equals: email } },
      overrideAccess: true,
    })
    expect(found.totalDocs).toBe(1)
  })

  /**
   * FR-019. The fields at fault are named, focus moves to the first, and — the part that is easy to
   * ship broken — what the visitor typed is still there.
   */
  test('a validation failure names the fields and keeps what was typed', async ({ page }) => {
    await page.goto('/contact')

    await page.getByPlaceholder('Name', { exact: true }).fill('Yara')
    await page.getByPlaceholder('E-mail', { exact: true }).fill('not-an-email')
    await page.getByPlaceholder('Message', { exact: true }).fill('Keep this text.')
    await page.getByRole('button', { name: /send message/i }).click()

    await expect(page.getByText(/check this email address/i)).toBeVisible()
    await expect(page.getByPlaceholder('E-mail', { exact: true })).toBeFocused()

    await expect(page.getByPlaceholder('Name', { exact: true })).toHaveValue('Yara')
    await expect(page.getByPlaceholder('Message', { exact: true })).toHaveValue('Keep this text.')
  })

  test('an empty form names every required field', async ({ page }) => {
    await page.goto('/contact')
    await page.getByRole('button', { name: /send message/i }).click()

    await expect(page.getByText(/name is required/i)).toBeVisible()
    await expect(page.getByText(/e-mail is required/i)).toBeVisible()
    await expect(page.getByText(/message is required/i)).toBeVisible()
  })
})

/**
 * **The form without JavaScript** (008/T049, FR-018).
 *
 * The requirement most likely to regress silently: with JavaScript on, React preserves the DOM
 * across a failed submit, so the re-population bug this catches is invisible. `javaScriptEnabled`
 * is a context option, so these run in their own context rather than the shared one.
 */
test.describe('with JavaScript disabled', () => {
  test.use({ javaScriptEnabled: false })

  test.afterEach(async () => {
    await payload.delete({
      collection: 'enquiries',
      where: { email: { contains: 'aurum-testing.dev' } },
      overrideAccess: true,
      context: skipRevalidation,
    })
  })

  test('a completed form is still received and confirmed', async ({ page }) => {
    const email = `nojs-${Date.now()}@aurum-testing.dev`

    await page.goto('/contact')
    await page.getByPlaceholder('Name', { exact: true }).fill('Yara')
    await page.getByPlaceholder('E-mail', { exact: true }).fill(email)
    await page.getByPlaceholder('Message', { exact: true }).fill('Sent without JavaScript.')

    await Promise.all([
      page.waitForNavigation(),
      page
        .getByTestId('contact-form')
        .evaluate((form: HTMLFormElement) => form.requestSubmit()),
    ])

    await expect(page.getByText(/your message has reached us/i)).toBeVisible()

    const found = await payload.count({
      collection: 'enquiries',
      where: { email: { equals: email } },
      overrideAccess: true,
    })
    expect(found.totalDocs).toBe(1)
  })

  /*
    The whole reason `EnquiryState.values` exists. Without JavaScript the page is rendered from
    scratch, so the inputs are only re-populated because the action hands back what was submitted.

    **Submitted via `requestSubmit()` rather than a click**, and that is not a shortcut. With no
    JavaScript the submit is a real form POST that replaces the document, so Playwright's click
    auto-waiting races it: the button it is stabilising is detached by the navigation mid-retry,
    which is what the first version of this test kept timing out on. Waiting for the navigation
    explicitly and asking the form to submit itself removes the race without weakening the
    assertion — the browser still runs the same POST, and everything the test checks is about what
    comes back.
  */
  test('a validation failure re-populates the form', async ({ page }) => {
    await page.goto('/contact')

    await page.getByPlaceholder('Name', { exact: true }).fill('Yara')
    await page.getByPlaceholder('E-mail', { exact: true }).fill('not-an-email')
    await page.getByPlaceholder('Message', { exact: true }).fill('Keep this text.')

    await Promise.all([
      page.waitForNavigation(),
      page
        .getByTestId('contact-form')
        .evaluate((form: HTMLFormElement) => form.requestSubmit()),
    ])

    await expect(page.getByText(/check this email address/i)).toBeVisible()
    await expect(page.getByPlaceholder('Name', { exact: true })).toHaveValue('Yara')
    await expect(page.getByPlaceholder('Message', { exact: true })).toHaveValue('Keep this text.')
  })
})
