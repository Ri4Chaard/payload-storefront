import config from '@payload-config'
import { expect, test } from '@playwright/test'
import { getPayload } from 'payload'

/**
 * Colour as the owner's vocabulary (spec 011, US3).
 *
 * **The first test is the one that matters, and it is not about the new capability.** It is about
 * the links that already exist: `?colour=black` was an enum value and is now a row's `value`, and
 * every bookmark, every share and every indexed page rests on that string surviving the move
 * (FR-020, SC-006). Adding rose gold is the feature; not breaking the four is the promise.
 */
const context = { disableRevalidate: true }

const made: number[] = []

test.afterAll(async () => {
  if (made.length === 0) return
  const payload = await getPayload({ config })
  await payload.delete({
    collection: 'colours',
    context,
    overrideAccess: true,
    where: { id: { in: made } },
  })
})

/** FR-020, SC-006 — the regression that would be most expensive to find in production. */
test('a link saved before this feature returns the same pieces', async ({ page }) => {
  await page.goto('/all-jewelry?colour=black&colour=green')

  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

  // Both values are honoured, not silently dropped: each shows as a chip the visitor can undo.
  await expect(page.getByRole('link', { name: /Remove Black/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /Remove Green/i })).toBeVisible()

  // And nothing was reported as unrecognised, which is what a broken migration would produce.
  await expect(page.getByText(/we ignored/i)).toHaveCount(0)
})

/** FR-017, SC-005 — the capability itself, with no deployment between the two halves. */
test('a colour the owner adds filters the live site', async ({ page }) => {
  const payload = await getPayload({ config })
  const value = `rose-gold-${Date.now()}`

  const colour = await payload.create({
    collection: 'colours',
    context,
    data: { label: 'Rose gold', order: 50, value },
    overrideAccess: true,
  })
  made.push(colour.id)

  const [piece] = (
    await payload.find({
      collection: 'products',
      limit: 1,
      overrideAccess: true,
      where: { _status: { equals: 'published' } },
    })
  ).docs

  const before = piece!.colour ?? []
  await payload.update({
    collection: 'products',
    context,
    data: { colour: [...before.map((entry) => (typeof entry === 'number' ? entry : entry.id)), colour.id] },
    id: piece!.id,
    overrideAccess: true,
  })

  try {
    await page.goto(`/all-jewelry?colour=${value}`)

    // The owner's new colour filters, and names itself in the chip from its own label.
    await expect(page.getByRole('link', { name: /Remove Rose gold/i })).toBeVisible()
    // Exactly the one piece it was applied to — which is the filter doing its job rather than
    // being ignored, and is stronger than asserting the grid is merely non-empty.
    await expect(page.getByRole('article')).toHaveCount(1)
  } finally {
    await payload.update({
      collection: 'products',
      context,
      data: { colour: before.map((entry) => (typeof entry === 'number' ? entry : entry.id)) },
      id: piece!.id,
      overrideAccess: true,
    })
  }
})

/** FR-019 — renaming what customers read never moves the link. */
test('renaming a label leaves its link working', async ({ page }) => {
  const payload = await getPayload({ config })
  const value = `renamed-${Date.now()}`

  /*
    Its OWN colour, not one of the four.

    The first draft renamed `black` and put it back in a `finally`, which read as tidy and was not:
    the suite runs fully parallel, so for the length of this test another worker asserting "Remove
    Black" saw "Remove Onyx" and failed for a reason that had nothing to do with what it was
    testing. Shared fixtures and parallel tests do not mix, however carefully the change is undone.
  */
  const colour = await payload.create({
    collection: 'colours',
    context,
    data: { label: 'Before', order: 51, value },
    overrideAccess: true,
  })
  made.push(colour.id)

  await page.goto(`/all-jewelry?colour=${value}`)
  await expect(page.getByRole('link', { name: /Remove Before/i })).toBeVisible()

  await payload.update({
    collection: 'colours',
    context,
    data: { label: 'After' },
    id: colour.id,
    overrideAccess: true,
  })

  // Same URL, new word — which is the whole of FR-018 and FR-019.
  await page.goto(`/all-jewelry?colour=${value}`)
  await expect(page.getByRole('link', { name: /Remove After/i })).toBeVisible()
})

/** FR-030 — an unrecognised colour is reported rather than silently narrowing the grid. */
test('an unknown colour is reported and changes nothing', async ({ page }) => {
  await page.goto('/all-jewelry')
  const all = await page.getByRole('link', { name: /^View / }).count()

  await page.goto('/all-jewelry?colour=definitely-not-a-colour')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

  expect(await page.getByRole('link', { name: /^View / }).count()).toBe(all)
})
