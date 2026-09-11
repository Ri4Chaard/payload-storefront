import config from '@payload-config'
import { expect, test } from '@playwright/test'
import { getPayload } from 'payload'

import { skipRevalidation } from '@/lib/revalidate'

/**
 * Both pages as their owner sees them (008/T075 – T079, T091).
 *
 * **Constitution I is what this file exists to enforce.** Every visible word on `/contact` and
 * `/faq` has to be changeable without a deployment, and the way that requirement fails is quietly:
 * one string gets hardcoded in a component and nobody notices until an owner asks for it to change.
 * So each assertion below writes a value no developer would choose and looks for it on the page.
 *
 * The content is driven through the Local API rather than the admin UI. Filling Payload's forms in
 * a browser would test Payload rather than this feature — the exception is the enquiry list at the
 * foot of this file, where what an administrator can *see without opening a record* is the
 * requirement (FR-029c).
 */

test.describe.configure({ mode: 'serial' })

const payload = await getPayload({ config })

const answer = (text: string) =>
  ({
    root: {
      type: 'root',
      format: '',
      indent: 0,
      version: 1,
      direction: 'ltr',
      children: [
        {
          type: 'paragraph',
          format: '',
          indent: 0,
          version: 1,
          direction: 'ltr',
          children: [
            { type: 'text', format: 0, style: '', text, version: 1, detail: 0, mode: 'normal' },
          ],
        },
      ],
    },
  }) as never

const MARK = 'e2e-contact-admin'

const setContactPage = async (data: Record<string, unknown>) =>
  payload.updateGlobal({ slug: 'contact-page', data: data as never, context: skipRevalidation })

const writeQuestion = async (question: string, order: number) =>
  payload.create({
    collection: 'questions',
    data: {
      question: `${question} [${MARK}]`,
      answer: answer(`Answer to ${question}.`),
      order,
      _status: 'published',
    },
    context: skipRevalidation,
    overrideAccess: true,
  })

/** The shipped defaults, restored after each test so one failure cannot cascade. */
const DEFAULTS = {
  eyebrow: 'CONTACT US',
  heading: 'WE’RE HERE TO HELP',
  intro: 'Questions, custom requests, or styling advice — our team is here for you',
  form: {
    heading: 'SEND US A MESSAGE',
    body: 'To make an enquiry, please use the contact form below. Our Aurum team will be happy to assist you with diamonds, orders, delivery, or any other questions.',
    nameLabel: 'Name',
    emailLabel: 'E-mail',
    messageLabel: 'Message',
    submitLabel: 'SEND MESSAGE',
    footnote: 'We’ll get back to you as soon as possible.',
    successMessage: 'Thank you — your message has reached us. We’ll be in touch as soon as we can.',
    errorMessage:
      'We couldn’t receive your message just now. Please try again, or reach us on WhatsApp, Telegram or Instagram.',
  },
  faq: { heading: 'Frequently Asked Questions', questions: [] },
}

test.afterEach(async () => {
  await setContactPage(DEFAULTS)
  await payload.delete({
    collection: 'questions',
    where: { question: { contains: MARK } },
    context: skipRevalidation,
    overrideAccess: true,
  })
})

/**
 * SC-005. Every string on the page, changed at once and found on the page — the check that would
 * fail the day any one of them is written into a component instead.
 */
test('every visible word on /contact is the owner’s', async ({ page }) => {
  await setContactPage({
    eyebrow: 'REACH US',
    heading: 'TALK TO AURUM',
    intro: 'However you would rather do it.',
    form: {
      heading: 'WRITE TO US',
      body: 'Tell us what you are looking for.',
      nameLabel: 'Your name',
      emailLabel: 'Your email',
      messageLabel: 'What would you like to ask?',
      submitLabel: 'SEND IT',
      footnote: 'We answer within a day.',
      successMessage: 'Got it — thank you.',
      errorMessage: 'That did not work.',
    },
  })

  await page.goto('/contact')

  await expect(page.getByText('REACH US')).toBeVisible()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('TALK TO AURUM')
  await expect(page.getByText('However you would rather do it.')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'WRITE TO US' })).toBeVisible()
  await expect(page.getByText('Tell us what you are looking for.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'SEND IT' })).toBeVisible()
  await expect(page.getByText('We answer within a day.')).toBeVisible()

  // The three field labels are visually hidden, so they are asserted through the accessible name —
  // which is the only way they reach a visitor and therefore the only way worth checking.
  await expect(page.getByLabel('Your name')).toBeVisible()
  await expect(page.getByLabel('Your email')).toBeVisible()
  await expect(page.getByLabel('What would you like to ask?')).toBeVisible()
})

test('the confirmation is the owner’s wording too', async ({ page }) => {
  await setContactPage({ ...DEFAULTS, form: { ...DEFAULTS.form, successMessage: 'Got it — thank you.' } })

  await page.goto('/contact')
  await page.getByPlaceholder('Name', { exact: true }).fill('Yara')
  await page
    .getByPlaceholder('E-mail', { exact: true })
    .fill(`admin-${Date.now()}@aurum-testing.dev`)
  await page.getByPlaceholder('Message', { exact: true }).fill('Testing the confirmation.')
  await page.getByRole('button', { name: /send message/i }).click()

  await expect(page.getByRole('status')).toHaveText('Got it — thank you.')

  await payload.delete({
    collection: 'enquiries',
    where: { email: { contains: 'aurum-testing.dev' } },
    overrideAccess: true,
    context: skipRevalidation,
  })
})

/**
 * FR-031. The editor's own selection, in the editor's own order — which is deliberately **not** the
 * collection's `order`, the one `/faq` uses. That difference is the whole reason both exist.
 */
test('the FAQ band shows the chosen questions, in the chosen order', async ({ page }) => {
  const first = await writeQuestion('Alpha', 30)
  const second = await writeQuestion('Beta', 10)
  const third = await writeQuestion('Gamma', 20)

  await setContactPage({
    ...DEFAULTS,
    faq: { heading: 'ASKED OFTEN', questions: [third.id, first.id, second.id] },
  })

  await page.goto('/contact')

  await expect(page.getByRole('heading', { name: 'ASKED OFTEN' })).toBeVisible()

  const rows = page.getByTestId('question-list').getByRole('heading', { level: 3 })
  await expect(rows).toHaveCount(3)
  await expect(rows.nth(0)).toContainText('Gamma')
  await expect(rows.nth(1)).toContainText('Alpha')
  await expect(rows.nth(2)).toContainText('Beta')
})

/**
 * FR-032. A heading over an empty column is worse than one band fewer, so the band goes entirely.
 */
test('choosing no questions removes the whole band', async ({ page }) => {
  await setContactPage({ ...DEFAULTS, faq: { heading: 'ASKED OFTEN', questions: [] } })

  await page.goto('/contact')

  await expect(page.getByText('ASKED OFTEN')).toHaveCount(0)
  await expect(page.getByTestId('question-list')).toHaveCount(0)
  // The rest of the page is unaffected — a missing band is not a broken page.
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
})

/**
 * FR-033. Unpublishing is an edit to the question, not to this page — and if it empties the
 * selection, the band goes with it.
 */
test('an unpublished question leaves the page with no edit here', async ({ page }) => {
  const kept = await writeQuestion('Kept', 10)
  const pulled = await writeQuestion('Pulled', 20)

  await setContactPage({
    ...DEFAULTS,
    faq: { heading: 'ASKED OFTEN', questions: [kept.id, pulled.id] },
  })

  await page.goto('/contact')
  await expect(page.getByTestId('question-list').getByRole('heading', { level: 3 })).toHaveCount(2)

  await payload.update({
    collection: 'questions',
    id: pulled.id,
    data: { _status: 'draft' },
    context: skipRevalidation,
    overrideAccess: true,
  })

  await page.goto('/contact')
  const rows = page.getByTestId('question-list').getByRole('heading', { level: 3 })
  await expect(rows).toHaveCount(1)
  await expect(rows.nth(0)).toContainText('Kept')
})

test('unpublishing the last chosen question removes the band', async ({ page }) => {
  const only = await writeQuestion('Only', 10)
  await setContactPage({ ...DEFAULTS, faq: { heading: 'ASKED OFTEN', questions: [only.id] } })

  await page.goto('/contact')
  await expect(page.getByTestId('question-list')).toBeVisible()

  await payload.update({
    collection: 'questions',
    id: only.id,
    data: { _status: 'draft' },
    context: skipRevalidation,
    overrideAccess: true,
  })

  await page.goto('/contact')
  await expect(page.getByTestId('question-list')).toHaveCount(0)
})

/** FR-045. Reading is public; changing is administrators only. */
test('a customer cannot change either page', async () => {
  const asCustomer = { id: 1, collection: 'customers' } as never

  await expect(
    payload.updateGlobal({
      slug: 'contact-page',
      data: { heading: 'HACKED' } as never,
      overrideAccess: false,
      user: asCustomer,
    }),
  ).rejects.toThrow()

  await expect(
    payload.updateGlobal({
      slug: 'faq-page',
      data: { heading: 'HACKED' } as never,
      overrideAccess: false,
      user: asCustomer,
    }),
  ).rejects.toThrow()
})

/**
 * FR-043. A draft is visible to its editor and not to a visitor — the whole point of having
 * versions on these globals.
 */
test('a draft is not what a visitor sees', async ({ page }) => {
  await payload.updateGlobal({
    slug: 'contact-page',
    data: { ...DEFAULTS, heading: 'DRAFTED, NOT PUBLISHED', _status: 'draft' } as never,
    draft: true,
    context: skipRevalidation,
  })

  await page.goto('/contact')
  await expect(page.getByRole('heading', { level: 1 })).not.toHaveText('DRAFTED, NOT PUBLISHED')
})

/**
 * The enquiry list as an administrator meets it (008/T091, FR-029c).
 *
 * **This is the one place in this file that drives the real admin panel**, and it has to be: the
 * requirement is about what an owner can see *without opening a record*. Asserting the collection's
 * `defaultColumns` from the config would check that the setting exists, not that it does its job.
 *
 * The generous timeout is for `next dev`, which compiles the admin panel on first request.
 */
test.describe('the enquiry list', () => {
  const PASSWORD = 'a-long-enough-password'
  let adminEmail: string

  test.beforeAll(async () => {
    adminEmail = `e2e-enquiries-${Date.now()}@admin.aurum-testing.dev`
    await payload.create({
      collection: 'admins',
      data: { email: adminEmail, name: 'Enquiry list check', password: PASSWORD },
      overrideAccess: true,
    })
  })

  test.afterEach(async () => {
    await payload.delete({
      collection: 'enquiries',
      where: { email: { contains: 'aurum-testing.dev' } },
      overrideAccess: true,
      context: skipRevalidation,
    })
  })

  test('shows who wrote and whether we told anyone, without opening a record', async ({ page }) => {
    const sent = `sent-${Date.now()}@aurum-testing.dev`
    const failed = `failed-${Date.now()}@aurum-testing.dev`

    await payload.create({
      collection: 'enquiries',
      data: { name: 'Notified Visitor', email: sent, message: 'x', notification: 'sent' },
      overrideAccess: true,
    })
    await payload.create({
      collection: 'enquiries',
      data: {
        name: 'Silent Visitor',
        email: failed,
        message: 'x',
        notification: 'failed',
        notificationError: 'Resend is unreachable',
      },
      overrideAccess: true,
    })

    test.setTimeout(240_000)
    await page.goto('/admin/login')
    await page.locator('#field-email').fill(adminEmail)
    await page.locator('#field-password').fill(PASSWORD)
    await page.getByRole('button', { name: 'Login', exact: true }).click()
    await page.waitForURL((url) => !url.pathname.includes('/admin/login'), { timeout: 120_000 })

    await page.goto('/admin/collections/enquiries')

    const table = page.locator('table')
    await expect(table).toBeVisible({ timeout: 120_000 })

    // Who wrote, their address, and — the column that earns its place — whether the email went out.
    await expect(table).toContainText('Notified Visitor')
    await expect(table).toContainText(sent)
    await expect(table).toContainText('Silent Visitor')

    /*
      The two outcomes are distinguishable at a glance (FR-029c). This is what lets an owner find
      the enquiries they were never emailed about, which is the whole reason the outcome is stored
      rather than only logged.
    */
    const silentRow = page.locator('tr', { hasText: 'Silent Visitor' })
    await expect(silentRow).toContainText(/failed/i)
    const notifiedRow = page.locator('tr', { hasText: 'Notified Visitor' })
    await expect(notifiedRow).toContainText(/sent/i)
  })
})
