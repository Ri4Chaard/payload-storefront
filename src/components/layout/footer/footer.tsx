import React from 'react'

import { Container } from '@/components/ui/container'
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
  /**
   * The bottom rail, from published policies (spec 009, FR-015b).
   *
   * **Empty by default rather than falling back to a hardcoded trio.** An unconfigured site showing
   * three legal links that go nowhere is worse than a site showing none — the same reasoning
   * `social` records below. A container build with no database renders this empty and the first
   * real request fills it.
   */
  legalLinks?: { label: string; href: string }[]
  /** Policies the owner filed under Customer Care — *Shipping & Returns* by default (FR-015b). */
  customerCareLinks?: { label: string; href: string }[]
  /** Opens the cookie chooser (spec 009, FR-032). Rendered in the legal row when supplied. */
  cookieSettings?: React.ReactNode
  /**
   * The shop's accounts, from the `contact-settings` global via the layout (spec 005, FR-052).
   *
   * Empty by default rather than falling back to a hardcoded list: a placeholder that renders
   * looks like a working link, and the one this replaced pointed at a bare `wa.me/` on every page
   * of the site. Nothing is drawn when there is nothing configured.
   */
  social?: { icon: IconName; label: string; href: string }[]
  /**
   * The shop's own details, from the `contact-settings` global via the layout.
   *
   * Required for the same reason the contact strip's are: the hardcoded pair that used to sit here
   * made an unconfigured shop look configured. The number was also written a THIRD way here —
   * `+1 555 010 2030` against the strip's `+1 (555) 010 20-30` — which is what two copies of one
   * fact does even inside a single repository.
   */
  email: string
  phone: string
  phoneHref: string
  address: string
  openingHours: string
  /** The owner's pinned map link, or a search for the address. Never a bare `maps.google.com`. */
  mapsHref: string
  /** Defaults to the build year. Wire to the CMS when contact details become editable. */
  year?: number
  className?: string
}

/**
 * The groups' own links (T075). Still code, and deliberately so — spec 009 put the footer's
 * navigation out of scope and moved only the POLICY links into content.
 *
 * *Shipping & Returns* used to be hardcoded here beside these. It is gone: it is a policy now, and
 * it arrives through `customerCareLinks` below. That is not tidying — a hardcoded link to a policy
 * the owner can unpublish is a link to a 404 (spec 009, FR-015c).
 */
const DEFAULT_GROUPS: FooterLinkGroup[] = [
  {
    title: 'Customer care',
    links: [
      { label: 'Contact Us', href: '/contact' },
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

/*
 * `DEFAULT_LEGAL` used to sit here — Privacy Policy, Terms & Conditions and Cookie Policy, written
 * as three constants pointing at three addresses that were 404s in production for eight specs.
 *
 * It is deleted rather than updated. The legal row is built from published policies now (spec 009,
 * FR-015b), which is what makes publishing one add its link, unpublishing one remove it, and
 * renaming one rename it — with nothing here to keep in step.
 */


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
    <div className="flex items-center gap-2.5 md:flex-col md:items-start">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logos/gia.svg"
        alt="Gemological Institute of America"
        width={174}
        height={58}
        // Lazy because they are in the FOOTER. Without it React preloads them from the server
        // markup, and 96KB of certification marks nobody has scrolled to yet compete with the
        // hero photograph — which is the largest contentful paint on every page that has one.
        loading="lazy"
        decoding="async"
        className="h-10 w-auto xl:h-14.5"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logos/igi.svg"
        alt="International Gemological Institute"
        width={173}
        height={58}
        loading="lazy"
        decoding="async"
        className="h-10 w-auto xl:h-14.5"
      />
    </div>
  )
}

export function Footer({
  groups = DEFAULT_GROUPS,
  legalLinks = [],
  customerCareLinks = [],
  cookieSettings,
  social = [],
  email,
  phone,
  phoneHref,
  address,
  openingHours,
  mapsHref,
  year = new Date().getFullYear(),
  className,
}: FooterProps) {
  return (
    <footer className={cn('bg-background-base text-neutral-white', className)}>
      <Container>
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

          {groups.map((group, index) => (
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
                {/*
                  Policies the owner filed under Customer Care land at the end of the first group.
                  Appended rather than interleaved: the group's own links are a fixed navigation and
                  the policies are an editable list, so a shared ordering would need a position field
                  on links that do not have one.
                */}
                {index === 0
                  ? customerCareLinks.map((link) => (
                      <li key={link.href}>
                        <Link href={link.href} variant="inverse">
                          {link.label}
                        </Link>
                      </li>
                    ))
                  : null}
              </ul>
            </div>
          ))}

          <div className={COLUMN}>
            <h2 className={HEADING}>Contacts</h2>
            <div className="text-body-small text-neutral-white/80 flex flex-col items-center gap-5 text-center md:items-start md:text-left">
              <p>{address}</p>
              <p>{openingHours}</p>
              <div className="flex flex-col items-center gap-2.5 md:items-start">
                <Link href={mapsHref} variant="inverse-inline">
                  Open in Maps
                </Link>
                {/*
                  The design sets these as plain text. They are links here because a phone number a
                  visitor cannot tap, on a shop's mobile site, is a lost enquiry. `inverse` keeps
                  them looking exactly as drawn — no underline until hover.
                */}
                <Link href={phoneHref} variant="inverse">
                  Call us: {phone}
                </Link>
                <Link href={`mailto:${email}`} variant="inverse">
                  Email us: {email}
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
          {/*
            The way back to the cookie chooser (spec 009, FR-032). Withdrawal has to be as available
            as consent was, and the design draws no re-entry point anywhere — so it goes here, beside
            the policy it relates to. A node rather than a link: what it opens is a client dialog,
            and the footer stays a server component.
          */}
          {cookieSettings}
        </nav>
      </Container>
    </footer>
  )
}
