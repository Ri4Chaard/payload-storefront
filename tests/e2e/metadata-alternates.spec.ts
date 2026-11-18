import { expect, test } from '@playwright/test'

import { LOCALES } from '@/i18n/routing'

import { acquireSharedContentLock } from '../shared-content-lock'

/**
 * Three indexable pages, not one page with two duplicates.
 *
 * **The assertion that carries this file is "each page names ITSELF canonical".** Pointing all three
 * at the English address is the easy mistake and it is invisible to a human tester — the pages look
 * right, and Google quietly drops two of them. That would undo the reason the locale is in the URL
 * at all.
 */

/*
  **Takes the shared-content lock, as a READER.**

  `language-availability.spec.ts` switches Ukrainian off and on again, and every assertion in this
  file depends on all three languages being offered. `test.describe.configure({ mode: 'serial' })`
  only orders one file; the lock is what keeps two files out of each other's way, and
  `tests/shared-content-lock.ts` documents the same failure this had: `<html lang="en">` where `uk`
  was expected, because the other suite had it switched off at that moment.
*/
let releaseSharedContent: (() => Promise<void>) | undefined

test.beforeAll(async () => {
  releaseSharedContent = await acquireSharedContentLock()
})

test.afterAll(async () => {
  await releaseSharedContent?.()
})
const PAGES = ['/legal/privacy', '/blog', '/faq']

const linkFor = (html: string, rel: string, hreflang?: string) => {
  const attr = hreflang ? `hrefLang="${hreflang}"` : ''
  const match = html.match(
    new RegExp(`<link rel="${rel}"[^>]*${attr}[^>]*href="([^"]+)"[^>]*>`, 'i'),
  )
  return match?.[1]
}

test.describe('cross-language metadata', () => {
  for (const path of PAGES) {
    test(`${path} names itself canonical in every language`, async ({ request }) => {
      for (const locale of LOCALES) {
        const prefixed = locale === 'en' ? path : `/${locale}${path}`
        const html = await (await request.get(prefixed)).text()
        const canonical = linkFor(html, 'canonical')
        expect(canonical, `${prefixed} canonical`).toBeTruthy()
        expect(new URL(canonical!).pathname).toBe(prefixed)
      }
    })

    test(`${path} names its siblings, reciprocally`, async ({ request }) => {
      for (const locale of LOCALES) {
        const prefixed = locale === 'en' ? path : `/${locale}${path}`
        const html = await (await request.get(prefixed)).text()

        for (const sibling of LOCALES) {
          const expected = sibling === 'en' ? path : `/${sibling}${path}`
          const alternate = linkFor(html, 'alternate', sibling)
          expect(alternate, `${prefixed} → hreflang=${sibling}`).toBeTruthy()
          expect(new URL(alternate!).pathname).toBe(expected)
        }

        // A crawler serving a visitor whose language matches none of ours needs somewhere to send
        // them, and English is where everything else falls back to.
        const fallback = linkFor(html, 'alternate', 'x-default')
        expect(new URL(fallback!).pathname).toBe(path)
      }
    })
  }

  test('the sitemap lists every page in every language, each naming the others', async ({ request }) => {
    const xml = await (await request.get('/sitemap.xml')).text()

    expect(xml).toContain('xmlns:xhtml')
    for (const locale of LOCALES) {
      expect(xml, `sitemap names ${locale}`).toContain(`hreflang="${locale}"`)
    }

    // One entry per document per language — a sitemap listing only English would leave the other
    // two to be discovered by luck.
    const entries = xml.match(/<url>/g)?.length ?? 0
    expect(entries).toBeGreaterThan(LOCALES.length)
    expect(entries % LOCALES.length, 'entries divide evenly across the languages').toBe(0)
  })
})
