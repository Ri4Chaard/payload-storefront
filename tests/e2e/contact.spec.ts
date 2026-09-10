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
