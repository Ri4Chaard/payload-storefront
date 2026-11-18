import config from '@payload-config'
import { expect, test } from '@playwright/test'
import { getPayload } from 'payload'

import { skipRevalidation } from '@/lib/revalidate'

/**
 * The editorial lifecycle.
 *
 * The Constitution's *Editorial verification* gate says a block or content model that is unusable
 * in the admin is a defect regardless of how well it renders. Most of that gate is a human creating
 * and previewing content in the admin; what is automated here is the part a human would get bored
 * of repeating.
 *
 * **Two halves, split by what each can actually prove.**
 *
 * The first test drives the real admin panel, because the claims are about the panel: that the tab
 * is called Blog, that the chapters array is drag-orderable, and that a collapsed chapter row shows
 * its heading rather than `Chapter 01`. None of that is visible to the Local API, and all of it is
 * what an editor's day is made of.
 *
 * The second asserts against the storefront, because the claim is about a CACHED page: an article
 * page is prerendered or kept after its first render, so an edit that does not invalidate looks
 * exactly like an edit that did not save. That is the only end-to-end proof that
 * `revalidateArticleOnChange` is wired, and it is the reason this feature has its own hook rather
 * than the shared one.
 *
 * **Its writes go through Payload's REST API, not the Local API, and that is not a style choice.**
 * `revalidatePath` needs a Next request scope; a Playwright worker is not a Next server, so a Local
 * API write from here dies on `Cannot find module 'next/cache'` before it can invalidate anything.
 * The REST API is served by `src/app/(payload)/api/[...slug]` — inside the Next server — so a write
 * through it runs the hook exactly the way the admin panel does. Driving the panel's own form
 * widgets instead would test Payload's React rather than this feature's invalidation.
 *
 * The generous timeouts are for `next dev`, which compiles the admin panel on first request.
 */

const payload = await getPayload({ config })
const PASSWORD = 'a-long-enough-password'

test.describe.configure({ mode: 'serial' })

const suffix = Date.now()
let email: string
let categoryId: number

test.beforeAll(async () => {
  email = `e2e-blog-${suffix}@admin.aurum-testing.dev`
  await payload.create({
    collection: 'admins',
    data: { email, name: 'Blog editorial check', password: PASSWORD },
    overrideAccess: true,
  })

  const category = await payload.create({
    collection: 'article-categories',
    data: { title: `Lifecycle ${suffix}`, slug: `lifecycle-${suffix}` },
    overrideAccess: true,
    context: skipRevalidation,
  })
  categoryId = category.id
})

test.afterAll(async () => {
  const { docs } = await payload.find({
    collection: 'articles',
    where: { slug: { contains: `lifecycle-${suffix}` } },
    overrideAccess: true,
    limit: 0,
  })
  for (const doc of docs) {
    await payload
      .delete({ collection: 'articles', id: doc.id, overrideAccess: true, context: skipRevalidation })
      .catch(() => undefined)
  }
  await payload
    .delete({
      collection: 'article-categories',
      id: categoryId,
      overrideAccess: true,
      context: skipRevalidation,
    })
    .catch(() => undefined)
})

async function signIn(page: import('@playwright/test').Page) {
  await page.goto('/admin/login')
  await page.locator('#field-email').fill(email)
  await page.locator('#field-password').fill(PASSWORD)
  await page.getByRole('button', { name: 'Login', exact: true }).click()
  await page.waitForURL((url) => !url.pathname.includes('/admin/login'), { timeout: 120_000 })
}

test('the blog has its own tab, and a chapter row is labelled by its heading', async ({ page }) => {
  test.setTimeout(240_000)
  await signIn(page)

  // The word the requester used. Payload renders a collection's plural label in its navigation, so
  // `plural: 'Blog'` is literally the tab that was asked for.
  await expect(page.getByRole('link', { name: 'Blog', exact: true })).toBeVisible({
    timeout: 120_000,
  })
  await expect(page.getByRole('link', { name: 'Article categories', exact: true })).toBeVisible({
    timeout: 120_000,
  })

  /*
    A chapter row's label. Payload numbers array rows by position, which is unreadable the moment an
    article has eight of them and the whole point of the list is dragging them into a different
    order — so `article-chapter-row-label.tsx` exists, and this is what proves it is wired through
    the import map rather than silently ignored.
  */
  const article = await payload.create({
    collection: 'articles',
    data: {
      title: `Row label check ${suffix}`,
      slug: `lifecycle-rows-${suffix}`,
      standfirst: 'A standfirst.',
      category: categoryId,
      publishedOn: '2026-08-08T00:00:00.000Z',
      chapters: [
        { heading: 'The first chapter', body: paragraph('One.') },
        { heading: 'The second chapter', body: paragraph('Two.') },
      ],
      _status: 'published',
    } as never,
    overrideAccess: true,
    context: skipRevalidation,
  })

  await page.goto(`/admin/collections/articles/${article.id}`)
  await expect(page.getByText('Chapters', { exact: true }).first()).toBeVisible({ timeout: 120_000 })
  await expect(page.getByText('The first chapter', { exact: true }).first()).toBeVisible({
    timeout: 60_000,
  })
  await expect(page.getByText('The second chapter', { exact: true }).first()).toBeVisible({
    timeout: 60_000,
  })
})

test('a draft is invisible, publishing shows it, and an edit reaches the cached page', async ({
  page,
  request,
}) => {
  test.setTimeout(240_000)

  const slug = `lifecycle-draft-${suffix}`
  const href = `/blog/${slug}`

  // 1. A draft. Absent from the index and unreachable at its own address.
  const draft = await payload.create({
    collection: 'articles',
    data: {
      title: `Unpublished ${suffix}`,
      slug,
      standfirst: 'Not ready yet.',
      category: categoryId,
      publishedOn: '2026-08-20T00:00:00.000Z',
      _status: 'draft',
    } as never,
    overrideAccess: true,
    context: skipRevalidation,
  })

  expect((await page.goto(href))?.status()).toBe(404)

  await page.goto(`/blog?category=lifecycle-${suffix}`)
  await expect(page.getByText(`Unpublished ${suffix}`)).toHaveCount(0)

  /*
    Authenticate against the REST API. Every write below goes through it rather than the Local API
    so that `revalidateArticleOnChange` runs inside the Next server — see the note at the top.

    The token travels in an `Authorization` header rather than on the cookie Payload also sets.
    Playwright's request context does keep cookies, but the login cookie is `httpOnly` and scoped in
    a way that did not survive the hop here — the writes came back 403 while the login came back
    200, which is a confusing way to spend twenty minutes. The header is Payload's own documented
    alternative and it is unambiguous.
  */
  const login = await request.post('/api/admins/login', {
    data: { email, password: PASSWORD },
  })
  expect(login.ok()).toBe(true)
  const { token } = (await login.json()) as { token: string }
  const authorized = { Authorization: `JWT ${token}` }

  // 2. Published. Both change, with no deploy and no restart — and the cached 404 has to go too.
  const published = await request.patch(`/api/articles/${draft.id}`, {
    headers: authorized,
    data: { _status: 'published' },
  })
  expect(published.ok()).toBe(true)

  expect((await page.goto(href))?.status()).toBe(200)
  await expect(page.getByRole('heading', { level: 1 })).toContainText(`Unpublished ${suffix}`)

  /*
    3. An edit reaches a page that has now been rendered and cached.

    This is the assertion the whole file exists for. Everything before it would still pass with
    `revalidateArticleOnChange` deleted; this would not.
  */
  const renamed = await request.patch(`/api/articles/${draft.id}`, {
    headers: authorized,
    data: { title: `Renamed ${suffix}` },
  })
  expect(renamed.ok()).toBe(true)

  await page.goto(href)
  await expect(page.getByRole('heading', { level: 1 })).toContainText(`Renamed ${suffix}`)

  // The address did not move with the title, so every link ever shared still works.
  expect(page.url()).toContain(href)
})

/** Lexical's document shape, one paragraph. */
function paragraph(text: string) {
  return {
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
  }
}
