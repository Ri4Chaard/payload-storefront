import config from '@payload-config'
import { expect, test } from '@playwright/test'
import { getPayload } from 'payload'

import { skipRevalidation } from '@/lib/revalidate'

import { acquireSharedContentLock } from '../shared-content-lock'

/**
 * The FAQ page, end to end.
 *
 * **What this file is really testing is that the collection is shared.** `/faq` shows every
 * published question in the collection's own `order`; `/about` and `/contact` each show a subset in
 * an order they chose. One row, edited once, three pages — and the way that breaks is by somebody
 * giving this page a selection field of its own, at which point publishing stops being enough.
 */

/**
 * **Serial.** `questions` is shared content and `faq-page` is a global, so parallel workers would
 * publish and unpublish the same rows underneath each other. `tests/e2e/about.spec.ts` records the
 * same decision.
 */
test.describe.configure({ mode: 'serial' })

const payload = await getPayload({ config })

/**
 * **Serialised against the other suites that rewrite the same rows** — see
 * `tests/shared-content-lock.ts`. `mode: 'serial'` above only orders this file; the lock is what
 * keeps `contact.spec.ts`, `contact-admin.spec.ts` and `faq.spec.ts` out of each other's way when
 * Playwright runs them in parallel workers.
 */
let releaseSharedContent: () => Promise<void>

test.beforeAll(async () => {
  releaseSharedContent = await acquireSharedContentLock()
})

test.afterAll(async () => {
  await releaseSharedContent?.()
})

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

/** Marked so the cleanup can find them without touching whatever the seed wrote. */
const MARK = 'e2e-faq'

const writeQuestion = async (question: string, order: number, published = true) =>
  payload.create({
    collection: 'questions',
    data: {
      question: `${question} [${MARK}]`,
      answer: answer(`Answer to ${question}.`),
      order,
      _status: published ? 'published' : 'draft',
    },
    context: skipRevalidation,
    overrideAccess: true,
  })

/**
 * Every question this suite did not write is unpublished for its duration, so "every published
 * question" is a set the test controls. They are restored afterwards — the seed's questions belong
 * to `/about`, and leaving them unpublished would break that suite.
 */
let hidden: (number | string)[] = []

test.beforeAll(async () => {
  const existing = await payload.find({
    collection: 'questions',
    limit: 0,
    overrideAccess: true,
    where: { _status: { equals: 'published' } },
  })
  hidden = existing.docs.map((doc) => doc.id)

  for (const id of hidden) {
    await payload.update({
      collection: 'questions',
      id,
      data: { _status: 'draft' },
      context: skipRevalidation,
      overrideAccess: true,
    })
  }
})

test.afterAll(async () => {
  await payload.delete({
    collection: 'questions',
    where: { question: { contains: MARK } },
    context: skipRevalidation,
    overrideAccess: true,
  })

  for (const id of hidden) {
    await payload.update({
      collection: 'questions',
      id,
      data: { _status: 'published' },
      context: skipRevalidation,
      overrideAccess: true,
    })
  }
})

test.afterEach(async () => {
  await payload.delete({
    collection: 'questions',
    where: { question: { contains: MARK } },
    context: skipRevalidation,
    overrideAccess: true,
  })
})

/**
 * FR-037. The collection's own `order`, not a relationship's row order — the distinction the
 * `order` field's admin description has promised since spec 006.
 */
test('every published question appears, in the admin’s Order', async ({ page }) => {
  await writeQuestion('Third', 30)
  await writeQuestion('First', 10)
  await writeQuestion('Second', 20)

  await page.goto('/faq')

  // Scoped to the list: the footer chrome carries level-2 headings of its own.
  const rows = page.getByTestId('question-list').getByRole('heading', { level: 2 })
  await expect(rows).toHaveCount(3)
  await expect(rows.nth(0)).toContainText('First')
  await expect(rows.nth(1)).toContainText('Second')
  await expect(rows.nth(2)).toContainText('Third')
})

test('publishing is the only action a question needs to appear', async ({ page }) => {
  await writeQuestion('Published', 10)
  await writeQuestion('Drafted', 20, false)

  await page.goto('/faq')

  const list = page.getByTestId('question-list')
  await expect(list.getByRole('heading', { level: 2, name: /Published/ })).toBeVisible()
  await expect(list.getByRole('heading', { level: 2, name: /Drafted/ })).toHaveCount(0)
})

/** FR-035. A visitor comparing two answers should not have to hold one of them in their head. */
test('opening a second question leaves the first open', async ({ page }) => {
  await writeQuestion('First', 10)
  await writeQuestion('Second', 20)

  await page.goto('/faq')

  // The drawing opens the first question, so a visitor can see the rows expand at all.
  const first = page.getByRole('button', { name: /First/ })
  const second = page.getByRole('button', { name: /Second/ })
  await expect(first).toHaveAttribute('aria-expanded', 'true')

  await second.click()
  await expect(second).toHaveAttribute('aria-expanded', 'true')
  await expect(first).toHaveAttribute('aria-expanded', 'true')
})

/**
 * FR-039. Every page on this site links here, so answering with "not found" would be worse than a
 * thin page.
 */
test('with nothing published it renders a message, not a 404', async ({ page }) => {
  const response = await page.goto('/faq')

  expect(response?.status()).toBe(200)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByText(/nothing here yet/i)).toBeVisible()
})

/** FR-040. The heading and the empty message are the owner's. */
test('the heading and the empty message come from the admin', async ({ page }) => {
  await payload.updateGlobal({
    slug: 'faq-page',
    data: {
      heading: 'ANSWERS',
      emptyTitle: 'Still writing',
      emptyDescription: 'Ask us anything in the meantime.',
    } as never,
    context: skipRevalidation,
  })

  await page.goto('/faq')

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('ANSWERS')
  await expect(page.getByText('Still writing')).toBeVisible()
  await expect(page.getByText('Ask us anything in the meantime.')).toBeVisible()

  await payload.updateGlobal({
    slug: 'faq-page',
    data: {
      heading: 'Frequently Asked Questions',
      emptyTitle: 'Nothing here yet',
      emptyDescription:
        'We’re writing the answers to the questions we’re asked most. In the meantime, our team is a message away.',
    } as never,
    context: skipRevalidation,
  })
})

/**
 * FR-052. Built from the view models rather than the documents, so it cannot describe a question
 * the page does not draw.
 */
test('emits FAQPage structured data for what it shows', async ({ page }) => {
  await writeQuestion('Do you ship overseas', 10)

  await page.goto('/faq')

  const json = await page.locator('script[type="application/ld+json"]').first().textContent()
  const data = JSON.parse(json ?? '{}')

  expect(data['@type']).toBe('FAQPage')
  expect(data.mainEntity).toHaveLength(1)
  expect(data.mainEntity[0].name).toContain('Do you ship overseas')
  expect(data.mainEntity[0].acceptedAnswer.text).toContain('Answer to Do you ship overseas')
})

test('emits no structured data when there is nothing to describe', async ({ page }) => {
  await page.goto('/faq')
  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(0)
})

test('emits a canonical URL', async ({ page }) => {
  await page.goto('/faq')
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/faq$/)
})
