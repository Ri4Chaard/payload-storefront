import React from 'react'

import { Container } from '@/components/ui/container'
import { Icon } from '@/components/ui/icon'
import { IconButton } from '@/components/ui/icon-button'
import { Link } from '@/components/ui/link'
import { cn } from '@/lib/cn'
import { CONTACT } from '@/lib/contact'
import { type IconName } from '@/lib/icon-registry'

/**
 * The contact strip above the header (node 367:6428) — email and phone on the left, social marks on
 * the right, on `background-base`.
 *
 * The node draws two variants and no third: Default (node 196:868) at 70px tall with a 100px gutter
 * and 32px glyphs, and Планшет (node 440:12226) at 60px with a 24px gutter and 24px glyphs. There
 * is no phone variant because the strip does not exist on a phone — 16px of gutter cannot hold an
 * address, a number and three marks, and every item here is repeated in the footer. So it is
 * `hidden` below `md`, which takes it out of the accessibility tree as well as off the screen.
 * Nothing is lost by that: the footer carries the same email, the same number and the same links.
 *
 * The two drawn widths land exactly on the header's own breakpoints — 60px/24px from `md`, 70px/
 * 100px from `xl` — so the strip and the header agree at every width rather than stepping at
 * different ones.
 *
 * The design sets the email and the number as plain text. They are links here for the reason the
 * footer's are: a number a visitor cannot tap and an address they cannot click, on a shop's site,
 * is a lost enquiry. `inverse` keeps them looking as drawn — no underline until hover, and then the
 * white rule the owner asked for, because a maroon one on this surface measures 1.3:1.
 *
 * Pure white rather than the footer's 80%: this is the topmost element on the page and the drawing
 * sets it at #FFFFFF. The hover affordance is the rule, not a shift in opacity.
 *
 * The address, the number and the three marks come from `@/lib/contact` — the footer and the menu
 * show the same three facts, and a number updated in two places out of three is worse than one that
 * was never split. The design's address reads `hello@aurum.exampIe`, a capital I where "gmail" has an
 * l; it is corrected there, once.
 */
export interface ContactBannerProps {
  email?: string
  /** Display form of the number; `phoneHref` is what actually dials. */
  phone?: string
  phoneHref?: string
  /**
   * The shop's accounts, from the `contact-settings` global via the layout (spec 005, FR-052).
   *
   * Empty by default rather than falling back to a hardcoded list: a placeholder that renders
   * looks like a working link, and the one this replaced pointed at a bare `wa.me/` on every page
   * of the site. Nothing is drawn when there is nothing configured.
   */
  social?: { icon: IconName; label: string; href: string }[]
  className?: string
}

/**
 * Icon sizes are classes rather than the `size` prop because they change per breakpoint, which a
 * prop cannot express. 32px is off the icon scale entirely (it stops at 24), which is the other
 * reason this is not `size="lg"`.
 */
const CONTACT_LINK = 'inline-flex items-center gap-2.5 text-body-medium text-neutral-white'
const CONTACT_ICON = 'size-6 xl:size-8'

export function ContactBanner({
  email = CONTACT.email,
  phone = CONTACT.phone,
  phoneHref,
  social = [],
  className,
}: ContactBannerProps) {
  // `tel:` will not accept the spaces and brackets the number is displayed with.
  const dial = phoneHref ?? `tel:${phone.replace(/[^+\d]/g, '')}`

  return (
    <Container
      className={cn(
        'bg-background-base text-neutral-white hidden items-center justify-between',
        'h-15 xl:h-17.5',
        'md:flex',
        className,
      )}
    >
      <div className="flex items-center gap-5">
        <Link href={`mailto:${email}`} variant="inverse" className={CONTACT_LINK}>
          <Icon name="mail" className={CONTACT_ICON} />
          {email}
        </Link>
        {/*
          The WhatsApp glyph is what the design draws beside the number, so it is kept — but the
          link dials rather than opening WhatsApp, because the number is written as a phone number.
          Pass `phoneHref` to point it at wa.me if that is what it is meant to be.
        */}
        <Link href={dial} variant="inverse" className={CONTACT_LINK}>
          <Icon name="whatsapp" className={CONTACT_ICON} />
          {phone}
        </Link>
      </div>

      <ul className="flex items-center gap-5">
        {social.map((item) => (
          <li key={item.href}>
            <IconButton
              variant="bare"
              icon={item.icon}
              label={item.label}
              href={item.href}
              className={cn(
                'text-neutral-white hover:text-neutral-white/70',
                'focus-visible:outline-neutral-white',
                // 24px at tablet is exactly the WCAG 2.2 minimum target (2.5.8), which is why the
                // glyph is the target here and there is no padding to trim it.
                '[&_svg]:size-6 xl:[&_svg]:size-7.5',
              )}
            />
          </li>
        ))}
      </ul>
    </Container>
  )
}
