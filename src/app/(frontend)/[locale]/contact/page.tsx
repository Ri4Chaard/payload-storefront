import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import React from 'react'

import { localeAlternates } from '@/lib/i18n/alternates'
import { currentLocale } from '@/i18n/locale'
import { PageHeaderBlock } from '@/components/blocks/page-header'
import { FaqBandBlock } from '@/components/blocks/faq-band'
import { ChannelGrid, type ChannelGridItem } from '@/components/contact/channel-grid'
import { MessageBand } from '@/components/contact/message-band'
import { getContactPage } from '@/lib/contact/queries'
import { getContactDetails, getSocialLinks } from '@/lib/messengers/settings'

/**
 * The contact page (008/T034), from Figma section `312:7498`.
 *
 * **This route closes three of the site's four dead links.** The header's "Contact us", the
 * footer's "Contact Us" and the CONTACT US button spec 006 shipped at the foot of `/about` have all
 * pointed here since spec 001, and until now every one of them was a 404 in production.
 *
 * **Rendered per request, deliberately — the same trade `/`, `/about` and `/blog` all made.** A
 * page with no dynamic segment is prerendered at build if Next can, and the production image is
 * built with no database: `src/lib/catalog/prerender.ts` records the whole chicken-and-egg. A
 * prerendered `/contact` would bake with no channel cards on a first deploy and stay that way until
 * somebody happened to edit something in the admin. A contact page that shows no way to make
 * contact, and never heals, is worse than three small queries.
 *
 * It also avoids a staleness bug rather than solving one: `src/lib/revalidate.ts` invalidates by
 * walking every product slug, so hooking this page into it would evict the entire catalogue because
 * somebody fixed a typo in the form's footnote. Nothing is cached here, so a publish is visible to
 * the next visitor with no invalidation at all (FR-044).
 *
 * **The three reads are cheaper than they look**, and two are shared with the chrome: the root
 * layout already calls `getContactDetails()` and `getSocialLinks()`, and both are `cache()`-wrapped,
 * so the layout, the footer and this page pay for them once between them.
 */
export const dynamic = 'force-dynamic'

/** The address this page is canonically at. One constant, used by the tag and the preview alike. */
const HREF = '/contact'

/**
 * Editor-controlled metadata, falling back to what the page itself says (FR-048, FR-049).
 *
 * Constitution V requires the owner rather than a developer to decide how this appears in a search
 * result, and requires a canonical URL. Every SEO field is optional, so the fallbacks are what an
 * owner who fills in nothing still gets — and they are computed in the mapper from the page's own
 * headline, intro and photograph, so they cannot name a heading the editor has since emptied.
 *
 * This calls `getContactPage(locale)` a second time and pays nothing for it: the loader is
 * `cache()`-wrapped, so the render and the metadata share one read.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t_meta = await getTranslations('meta')
  const locale = await currentLocale()
  const page = await getContactPage(locale)

  // No database — a container build. Emit the bare title rather than nothing; the first real
  // request replaces it.
  if (!page) return { title: t_meta('contactUs') }

  const title = page.seo.title ?? page.fallbacks.title ?? t_meta('contactUs')
  const description = page.seo.description ?? page.fallbacks.description
  const image = page.seo.image ?? page.fallbacks.image

  return {
    title,
    ...(description ? { description } : {}),
    // Canonical plus every language this page exists in, filtered to what is on offer.
    alternates: await localeAlternates(HREF, locale),
    openGraph: {
      type: 'website',
      title,
      ...(description ? { description } : {}),
      url: HREF,
      ...(image
        ? {
            images: [
              {
                url: image.src,
                width: image.width,
                height: image.height,
                ...(image.alt ? { alt: image.alt } : {}),
              },
            ],
          }
        : {}),
    },
  }
}

export default async function ContactPage() {
  const locale = await currentLocale()
  const [page, socials, details, t_common] = await Promise.all([
    getContactPage(locale),
    getSocialLinks(),
    getContactDetails(),
    getTranslations('common'),
  ])

  /*
    `null` means the database was unreachable — a container build, and nothing else. The chrome
    still renders and this returns nothing between it, which is not a 404: three places on this site
    link here, and answering a link the site itself publishes with "not found" is worse than a thin
    page. `/about` reaches the same conclusion for the same reason.
  */
  if (!page) return null

  /*
    The messengers first, in the admin's arrangement, then the email — always last, and always
    present, because the shop always has an address even when the field is empty (FR-011).

    `getSocialLinks()` has already dropped rows with no usable destination (FR-013) and has already
    decided that a messenger not offered at checkout still belongs here (FR-012). Neither rule is
    restated here: both live in that reader, which is where the footer gets them too.
  */
  const channels: ChannelGridItem[] = [
    ...socials.map((social) => ({
      icon: social.icon,
      label: social.label,
      value: social.handle,
      href: social.href,
    })),
    {
      icon: 'mail' as const,
      label: t_common('emailUsLabel'),
      value: details.email,
      href: `mailto:${details.email}`,
    },
  ]

  /*
    A fragment, NOT a `<main>`. `src/app/(frontend)/layout.tsx` already wraps every route in
    `<main id="main">` — the landmark the skip link targets — so a second one nests two `main`
    elements, which is invalid HTML and gives a screen reader two identical landmarks to choose
    between. Every other route in this app returns a fragment for the same reason.
  */
  return (
    <>
      <PageHeaderBlock
        {...(page.eyebrow ? { eyebrow: page.eyebrow } : {})}
        heading={page.heading}
        {...(page.intro ? { body: page.intro } : {})}
        headingLevel={1}
      />
      <ChannelGrid items={channels} />
      <MessageBand
        heading={page.form.heading}
        {...(page.form.body ? { body: page.form.body } : {})}
        form={page.form}
      />
      {/*
        The centred variant of the band `/about` already uses (FR-034) — a heading over a single
        column, no intro and no button, exactly as `312:8689` draws it. One band with two
        arrangements, never a second component.

        **Absent entirely when the editor has chosen no questions**, or when every question they
        chose has been unpublished. That decision is the mapper's: `ContactPage.faq` is `undefined`
        rather than an empty list, so this component cannot forget it and the rule is testable
        without rendering anything (FR-032).
      */}
      {page.faq ? (
        <FaqBandBlock
          variant="centred"
          heading={page.faq.heading}
          questions={page.faq.questions}
          headingLevel={2}
        />
      ) : null}
    </>
  )
}
