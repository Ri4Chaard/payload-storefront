import { expect, test } from '@playwright/test'

import en from '@/i18n/messages/en.json' with { type: 'json' }
import { SECONDARY_LOCALES } from '@/i18n/routing'

import { acquireSharedContentLock } from '../shared-content-lock'

/**
 * No English left on a translated page.
 *
 * **The forbidden list is DERIVED from `en.json`, and that is the whole point of this rewrite.**
 * The first version of this file listed eight phrases by hand and passed for months while the entire
 * account area, the cart, the filter drawer and the footer rendered in English on `/ru` — because a
 * hand-written list can only catch the strings somebody remembered to add to it, and the strings
 * nobody remembered are exactly the ones still untranslated. Reading `en.json` inverts that: every
 * key a developer adds is checked from the moment it exists, and a component that renders the
 * English value instead of calling the translator fails here without anybody editing this file.
 *
 * **What it can and cannot assert.** It checks the INTERFACE — chrome, buttons, accessible names —
 * because those come from the message files and are translated for all three languages today. It
 * does NOT assert that a product title is Russian: titles are Payload content, and an untranslated
 * one correctly falls back to English. A test that failed on that would be failing on an
 * editor's to-do list rather than on the code.
 *
 * That distinction is also why the comparison is against VISIBLE TEXT rather than the HTML source.
 * Class names (`text-neutral-primary` contains "Primary"), URLs and `mailto:` targets are not words
 * anybody reads, and matching them produced a page of false alarms the first time this was run.
 *
 * **And why it compares WHOLE strings rather than searching for substrings.** A chrome string is a
 * complete label: a button's text, a heading, an accessible name. Editorial content that happens to
 * contain the same letters is not the chrome leaking — the article chapter "COLOR: FINDING THE
 * RIGHT BALANCE" once contained a `catalog.colour` key, and both are Payload content correctly
 * falling back. Substring matching reported them as
 * failures; whole-string matching reports none of them and still catches every real leak, because a
 * component that forgets to translate renders the English value *as the entire label*.
 *
 * **The comparison folds case.** `CookieSettingsButton` rendered "Cookie Settings" while the key
 * `common.cookieSettings` held "Cookie settings", and one capital letter was enough for the whole
 * check to walk past it. Nothing about a label's capitalisation makes it more or less translated —
 * several of them are sentence case in the message file and drawn in capitals by CSS — so case is
 * noise here, and treating it as signal only hides leaks.
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

/**
 * Every English chrome string worth looking for, flattened out of the message file.
 *
 * Three exclusions, each for a reason rather than for convenience:
 *
 *   - **ICU and rich-text values** (`{count, plural, …}`, `<terms>…</terms>`) never render as
 *     written, so searching for them proves nothing.
 *   - **Anything under five characters.** "Save", "EN", "Copy" and "Email" appear inside longer
 *     words, inside product names and inside addresses; the noise would swamp the signal.
 *   - **Values that are word-for-word an editorial title.** See the set below: when the words on the
 *     page belong to a Payload document, an English rendering is a fallback working correctly.
 */
const COLLIDES_WITH_EDITORIAL_TITLES = new Set<string>([
  /*
    Both of these are word-for-word the title of a document an editor owns, so the string on the
    page is Payload's and not ours, and an untranslated one is the editor's to-do list rather than a
    bug in the code.

      `common.cookiePolicy`      the banner's link label, and the title of the `policies` document
                                 the footer links to — the footer's link text comes from the
                                 document, so it falls back to English until somebody translates it.
      `blog.ourBlog`, `nav.ourBlog`  the blog index's heading, from the `blog-page` global, and the
                                 footer's link to it.

    They are named here rather than dropped from the message files because the CODE still needs
    them: the cookie banner draws its own heading before any policy is fetched.
  */
  'common.cookiePolicy',
  'blog.ourBlog',
  'nav.ourBlog',
  // `/about` is almost entirely editorial, and three of its own words collide: the page is titled
  // "Our Story", one of its bands is headed "Select", and its closing call to action reads
  // "Contact us" — the same three phrases the footer and the nav use as labels.
  'nav.ourStory',
  'nav.contact',
  'legal.contactUs',
  'forms.select',
  // The same two words again, as the metadata fallbacks used when a CMS page is missing entirely.
  // `meta.contactUs` reaches the footer's link to the contact page, which is a Payload title.
  'meta.ourStory',
  'meta.contactUs',
])

const CHROME = Object.entries(en).flatMap(([namespace, entries]) =>
  Object.entries(entries as Record<string, string>)
    .filter(([key, value]) => {
      if (COLLIDES_WITH_EDITORIAL_TITLES.has(`${namespace}.${key}`)) return false
      if (value.includes('{') || value.includes('<')) return false
      return value.length >= 5
    })
    .map(([key, value]) => ({ id: `${namespace}.${key}`, value })),
)

/*
  The home page is here as of spec 010.

  It was absent for as long as its hero, about band and band headings read `src/mocks/home.ts` —
  content that had not been modelled in Payload, so a test failing on it would have been failing on
  another spec's backlog. That file is gone and the words are the `home-page` global, which makes
  the page ordinary: its chrome is ours and its copy is the owner's.
*/
const PAGES = [
  '/',
  '/all-products',
  '/category-1',
  '/products/product-30',
  '/blog',
  '/blog/article-1',
  '/cart',
  '/sign-in',
  '/create-account',
  '/forgot-password',
  '/contact',
  '/faq',
  '/about',
  '/legal/privacy',
]

/**
 * What a reader actually sees, with the machinery stripped out.
 *
 * `innerText` on `body` already collapses to rendered text, and the `<title>` is read separately
 * because a browser tab is somewhere a visitor sees words too — three of the account pages had an
 * English title long after their headings were translated.
 */
const visibleStrings = async (page: import('@playwright/test').Page): Promise<Set<string>> => {
  const fromDom = await page.evaluate(() => {
    const found: string[] = []

    // Every rendered line. `innerText` is already the collapsed, laid-out text, so a button, a
    // heading and a table cell each arrive as their own entry.
    for (const line of (document.body.innerText ?? '').split('\n')) found.push(line.trim())

    /*
      The accessible names, which `innerText` cannot see and which is where half of this feature's
      real gaps were hiding — a placeholder reading "Email Address" on a Russian sign-in form, a
      close button announcing "Close filters". A visitor using a screen reader is reading these.
    */
    for (const node of Array.from(document.querySelectorAll('[aria-label], [placeholder], [alt], [title]'))) {
      for (const attribute of ['aria-label', 'placeholder', 'alt', 'title']) {
        const value = node.getAttribute(attribute)
        if (value) found.push(value.trim())
      }
    }

    return found
  })

  return new Set([...fromDom, (await page.title()).trim()].map((entry) => entry.toLowerCase()))
}

for (const locale of SECONDARY_LOCALES) {
  test.describe(`the interface in ${locale}`, () => {
    for (const path of PAGES) {
      test(`/${locale}${path} carries no English chrome`, async ({ page }) => {
        await page.goto(`/${locale}${path}`)
        const rendered = await visibleStrings(page)

        const leaked = CHROME.filter((entry) => rendered.has(entry.value.toLowerCase())).map(
          (entry) => `${entry.id} = "${entry.value}"`,
        )

        expect(
          leaked,
          `English chrome is still rendering on /${locale}${path}:\n  ${leaked.join('\n  ')}`,
        ).toEqual([])
      })
    }

    test(`/${locale} announces the cart in ${locale}`, async ({ page }) => {
      await page.goto(`/${locale}/all-products`)
      const cart = page.getByRole('link', { name: /Корзина|Кошик/ })
      await expect(cart).toBeVisible()
    })
  })
}
