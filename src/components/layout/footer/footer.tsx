import React from 'react'

import { IconButton } from '@/components/ui/icon-button'
import { Link } from '@/components/ui/link'
import { type IconName } from '@/lib/icon-registry'
import { cn } from '@/lib/cn'

import { NewsletterForm } from './newsletter-form'

/**
 * The site footer (T075, FR-037), from the three variants at node 440:12864.
 *
 * Like the header, those variants are breakpoints rather than components:
 *
 *   < md    everything stacked and centred, 16px gutter
 *   md–xl   brand column beside a 2x2 grid of the link groups, 24px gutter
 *   xl+     five columns in one row, 100px gutter
 *
 * A three-column grid with the brand spanning two rows produces the tablet layout exactly, and
 * widening to five columns produces the desktop one. One grid, two breakpoints, no duplication.
 *
 * **Almost nothing here is new.** The links are `Link variant="inverse"` — literally node 312:8748,
 * built for the header. SUBSCRIBE is the `inverse` button with the `reveal` hover, node 312:9907.
 * The social marks are `IconButton variant="social"`, node 312:9300. What looked like a large new
 * surface was mostly assembly.
 *
 * Two things reproduced as drawn but worth a designer's eye:
 *
 * 1. The divider above the legal bar is `border-black/10` on a near-black surface, so it renders
 *    invisible. Everything else on this surface uses white-based hairlines (the newsletter field is
 *    white/30), so this is likely meant to be `border-white/8`. Left as drawn — the rendered design
 *    shows no line either, so "fixing" it would ADD something nobody has approved.
 * 2. "CUSTOMER CARE" is set at 16px while the other three headings are 18px. Normalised to the
 *    18px `eyebrow` style so the four columns match.
 *
 * The design's email address reads `hello@aurum.exampIe` — a capital I in place of the l in "example".
 * Corrected here, because shipping a typo'd address means the mail never arrives.
 */
export interface FooterLinkGroup {
  title: string
  links: { label: string; href: string }[]
}

export interface FooterProps {
  groups?: FooterLinkGroup[]
  legalLinks?: { label: string; href: string }[]
  social?: { icon: IconName; label: string; href: string }[]
  /** Defaults to the build year. Wire to the CMS when contact details become editable. */
  year?: number
  className?: string
}

/** Placeholder content (T075). Later specs replace this with Payload-managed navigation. */
const DEFAULT_GROUPS: FooterLinkGroup[] = [
  {
    title: 'Customer care',
    links: [
      { label: 'Contact Us', href: '/contact' },
      { label: 'Shipping & Returns', href: '/shipping' },
      { label: 'FAQ', href: '/faq' },
    ],
  },
  {
    title: 'About',
    links: [
      { label: 'Our Story', href: '/about' },
      { label: 'Our Blog', href: '/blog' },
    ],
  },
]

const DEFAULT_LEGAL = [
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Terms & Conditions', href: '/terms' },
  { label: 'Cookie Policy', href: '/cookies' },
]

/** Placeholder destinations — these need the real accounts before launch. */
const DEFAULT_SOCIAL: { icon: IconName; label: string; href: string }[] = [
  { icon: 'whatsapp', label: 'WhatsApp', href: 'https://wa.me/' },
  { icon: 'instagram', label: 'Instagram', href: 'https://instagram.com/' },
  { icon: 'telegram', label: 'Telegram', href: 'https://t.me/' },
]

const COLUMN = 'flex flex-col items-center gap-2.5 md:items-start md:gap-5'
const HEADING = 'text-eyebrow text-neutral-white'
const LIST = 'flex flex-col items-center gap-2.5 md:items-start md:gap-3.5'

/**
 * The certification marks are third-party trademarks, so they are NOT normalised to currentColor
 * the way our own icons are — their colours are theirs. They are also 96KB of path data between
 * them, far too much to inline, so they stay static files served from /public.
 *
 * Explicit width and height are what stop them shifting the layout as they load, which is the part
 * of FR-027 that actually matters for a fixed-size vector.
 *
 * `next/image` is suppressed rather than used, and should stay that way when `Image` (T056) lands:
 * it has nothing to offer a fixed-size SVG — no format to convert, no density to choose, no size to
 * resample — and routing one through it requires opening `dangerouslyAllowSVG`, which lets
 * arbitrary SVG reach the optimiser. That is a real risk for a gain of zero.
 */
function Certifications() {
  return (
    <div className="flex items-center gap-2.5 xl:flex-col xl:items-start">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logos/gia.svg"
        alt="Gemological Institute of America"
        width={174}
        height={58}
        className="h-10 w-auto xl:h-14.5"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logos/igi.svg"
        alt="International Gemological Institute"
        width={173}
        height={58}
        className="h-10 w-auto xl:h-14.5"
      />
    </div>
  )
}

export function Footer({
  groups = DEFAULT_GROUPS,
  legalLinks = DEFAULT_LEGAL,
  social = DEFAULT_SOCIAL,
  year = new Date().getFullYear(),
  className,
}: FooterProps) {
  return (
    <footer className={cn('bg-background-base text-neutral-white', className)}>
      <div className="px-4 md:px-6 xl:px-25">
        <div className="grid gap-7.5 border-b border-black/10 pt-7.5 pb-5 md:grid-cols-3 xl:grid-cols-5 xl:gap-5 xl:pt-25 xl:pb-12.5">
          {/* Brand. Spans both rows on tablet so the four groups fill the 2x2 beside it. */}
          <div className="flex flex-col items-center gap-2.5 md:row-span-2 md:items-start xl:row-span-1 xl:gap-16">
            <div className="flex flex-col items-center gap-2.5 md:items-start xl:gap-5">
              <p className="text-display">Aurum</p>
              <p className="text-body-small text-neutral-white/80 text-center md:text-left">
                © {year} Aurum. All rights reserved.
              </p>
            </div>
            <Certifications />
          </div>

          {groups.map((group) => (
            <div key={group.title} className={COLUMN}>
              <h2 className={HEADING}>{group.title}</h2>
              <ul className={LIST}>
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} variant="inverse">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className={COLUMN}>
            <h2 className={HEADING}>Contacts</h2>
            <div className="text-body-small text-neutral-white/80 flex flex-col items-center gap-5 text-center md:items-start md:text-left">
              <p>12 Market Street, Old Town, Example City</p>
              <p>Daily · 10:00 AM–9:00 PM</p>
              <div className="flex flex-col items-center gap-2.5 md:items-start">
                <Link href="https://maps.google.com/" variant="inverse-inline">
                  Open in Maps
                </Link>
                {/*
                  The design sets these as plain text. They are links here because a phone number a
                  visitor cannot tap, on a shop's mobile site, is a lost enquiry. `inverse` keeps
                  them looking exactly as drawn — no underline until hover.
                */}
                <Link href="tel:+15550102030" variant="inverse">
                  Call us: +1 555 010 2030
                </Link>
                <Link href="mailto:hello@aurum.example" variant="inverse">
                  Email us: hello@aurum.example
                </Link>
              </div>
            </div>
          </div>

          <div className={COLUMN}>
            <h2 className={HEADING}>Newsletter</h2>
            <p className="text-body-small text-neutral-white/80 text-center md:text-left">
              Subscribe to receive updates and exclusive offers.
            </p>
            <NewsletterForm />
            <ul className="flex items-center gap-5">
              {social.map((item) => (
                <li key={item.href}>
                  <IconButton
                    variant="social"
                    hoverEffect="reveal"
                    icon={item.icon}
                    label={item.label}
                    href={item.href}
                  />
                </li>
              ))}
            </ul>
          </div>
        </div>

        <nav
          aria-label="Legal"
          className="flex flex-wrap items-center justify-center gap-5 pt-5 pb-7.5 xl:py-12.5"
        >
          {legalLinks.map((link) => (
            <Link key={link.href} href={link.href} variant="inverse">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  )
}
