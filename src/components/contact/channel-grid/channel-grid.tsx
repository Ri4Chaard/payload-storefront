import { useTranslations } from 'next-intl'
import React from 'react'

import { Container, FeatureCard } from '@/components/ui'
import type { IconName } from '@/lib/icon-registry'

/**
 * The four ways to reach the shop, from nodes `312:8535`, `419:10765`, `419:10847`.
 *
 * **Every value here is derived, and none of it is written on this page.** The messenger cards are
 * the `messengers` rows of `contact-settings`; the email card is that global's `email`. Both arrive
 * through `getSocialLinks()` and `getContactDetails()` — the readers the footer and the checkout
 * modal already use. FR-008 forbids a second place to write the shop's own accounts, and the
 * structural form of that rule is that `contact-page` has no field to write them into.
 *
 * **The card is `FeatureCard`, extended rather than copied**. `get_design_context` on
 * `312:8535` showed the drawn card is the service-promise card: a 50px glyph above a title and a
 * line of copy on a `background/container` panel, 290 tall with 30px padding — measurements the kit
 * component already had. The two differences are props: the value is a link, and the title is not
 * uppercased, because `WhatsApp` is a brand name rather than a shout.
 *
 * **This is NOT `FeatureStrip`, and that is the one deliberate departure.** That component wraps
 * the same cards in a `ScrollArea` because four 250px cards cannot fit a 390px phone and can only
 * be read sideways — its own comment says so. These cards are full-width and stacked at that width,
 * so the arrangement is genuinely different even though the card is the same. Reaching for
 * `FeatureStrip` and adding a "do not scroll" flag would have been the wrong half to reuse.
 *
 * **No separators.** The drawing is four panels in a row with a 20px gap and no borders at all, so
 * the separation is the gutter over the page ground — which is what `bg-background-container`
 * already gives.
 */
export interface ChannelGridItem {
  icon: IconName
  /** The platform's name, or `Email Us`. */
  label: string
  /** What the visitor sees and follows: the displayed handle, or the address. */
  value: string
  href: string
}

export interface ChannelGridProps {
  items: ChannelGridItem[]
}

export function ChannelGrid({ items }: ChannelGridProps) {
  const t_common = useTranslations('common')
  if (items.length === 0) return null

  return (
    <Container as="section" aria-label={t_common('waysToReachUs')} className="pb-10 xl:pb-12.5">
      {/*
        A list, because that is what it is — four alternatives of equal standing. The count is
        announced, which is worth more here than on a decorative row: "four ways to reach us" is
        the band's whole message.

        `grid` rather than `flex`, so the cards share a row height without the drawn 290px becoming
        a floor every card must meet at every width. One column on a phone, two at `md`, four at
        `xl` — the three drawn arrangements, and coherent at any count between one and six because
        `auto-fit` was rejected in favour of stated breakpoints the tokens already define.
      */}
      <ul className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <FeatureCard
            key={`${item.label}-${item.value}`}
            data-testid="channel-card"
            icon={item.icon}
            title={item.label}
            description={item.value}
            href={item.href}
            uppercaseTitle={false}
          />
        ))}
      </ul>
    </Container>
  )
}
