import config from '@payload-config'
import { expect, test } from '@playwright/test'
import { getPayload } from 'payload'

import { skipRevalidation } from '@/lib/revalidate'

import { acquireSharedContentLock } from '../shared-content-lock'

/**
 * US3 — the owner decides which languages the site offers.
 *
 * **The scenario worth the whole file is the last one.** A visitor holding a cookie for a language
 * that has just been switched off would otherwise loop forever: the proxy honours the cookie and
 * sends them to `/uk`, the layout finds Ukrainian disabled and sends them back, and around again.
 * `/language/reset` is the only thing standing between that and an unusable site, and nothing else
 * in the suite touches it.
 */
const payload = await getPayload({ config })

const setUkrainian = (enabled: boolean) =>
  payload.updateGlobal({
    slug: 'language-settings',
    data: { ukEnabled: enabled },
    overrideAccess: true,
    // No request scope in this process; the revalidation hook would throw. Same escape the seed
    // scripts take.
    context: skipRevalidation,
  })

test.afterAll(async () => {
  await setUkrainian(true)
  await releaseSharedContent?.()
})

/*
  Serial, and it matters. Every test here switches the same global on and off, and Playwright's
  default is to run a file's tests in parallel across workers — so run concurrently they race each
  other's writes and fail in whichever order the scheduler chose. This is shared mutable state, not
  three independent fixtures.
*/
test.describe.configure({ mode: 'serial' })

/*
  **And the shared-content lock on top of that**, for the reason `tests/shared-content-lock.ts`
  already documents: `mode: 'serial'` only orders THIS file, and `language-settings` is a singleton
  that other suites read. Without it, `language-switch.spec.ts` ran while this file had Ukrainian
  switched off and saw `<html lang="en">` where it expected `uk` — a cross-file race that looks
  exactly like a product defect.
*/
let releaseSharedContent: (() => Promise<void>) | undefined

test.beforeAll(async () => {
  releaseSharedContent = await acquireSharedContentLock()
})

test.describe('language availability', () => {
  test('a disabled language stops serving, and its content survives', async ({ page }) => {
    await setUkrainian(true)
    expect((await page.goto('/uk'))?.status()).toBe(200)

    await setUkrainian(false)
    // Not a 404: the content exists and the owner may switch it back on tomorrow. The visitor is
    // sent to something real (FR-027, US3 scenario 2).
    await page.goto('/uk')
    await expect(page).toHaveURL(/localhost:\d+\/$/)
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')

    await setUkrainian(true)
    expect((await page.goto('/uk'))?.status()).toBe(200)
  })

  test('the switcher offers only the languages on offer', async ({ page }) => {
    await setUkrainian(false)
    await page.goto('/')
    await page.getByRole('button', { name: /^Language: / }).click()
    await expect(page.getByRole('menuitem', { name: 'RU' })).toBeVisible()
    await expect(page.getByRole('menuitem', { name: 'UK' })).toHaveCount(0)

    await setUkrainian(true)
    await page.goto('/')
    await page.getByRole('button', { name: /^Language: / }).click()
    await expect(page.getByRole('menuitem', { name: 'UK' })).toBeVisible()
  })

  test('a visitor whose remembered language was switched off does not loop', async ({ page, context }) => {
    await setUkrainian(true)
    await page.goto('/')
    await page.getByRole('button', { name: /^Language: / }).click()
    await page.getByRole('menuitem', { name: 'UK' }).click()
    await expect(page).toHaveURL(/\/uk$/)

    await setUkrainian(false)

    // The browser follows the chain on its own: / → /uk → /language/reset → /. Three hops, not
    // infinity, because the reset handler clears the cookie the proxy was acting on.
    await page.goto('/')
    await expect(page).toHaveURL(/localhost:\d+\/$/)
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')

    const cookie = (await context.cookies()).find((c) => c.name === 'NEXT_LOCALE')
    expect(cookie?.value).not.toBe('uk')

    await setUkrainian(true)
  })
})
