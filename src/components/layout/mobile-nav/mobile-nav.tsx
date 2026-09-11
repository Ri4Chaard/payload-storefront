'use client'

import { Link as NextLink } from '@/i18n/navigation'
import React from 'react'

import { LanguageSelector, type Locale } from '@/components/layout/language-selector'
import { Container } from '@/components/ui/container'
import { Icon } from '@/components/ui/icon'
import { IconButton } from '@/components/ui/icon-button'
import { Link } from '@/components/ui/link'
import { useOverlay } from '@/components/ui/overlay'
import { cn } from '@/lib/cn'
import { type IconName } from '@/lib/icon-registry'

/**
 * The hamburger and the menu it opens (002/T139–T144), from Figma nodes 440:13282 (tablet) and
 * 440:14517 (mobile).
 *
 * **This replaces the plain dropdown spec 001 shipped.** That panel was explicitly a placeholder —
 * every header variant drew the closed state only, so it was built as the plainest thing that
 * worked and marked for replacement the moment there was a drawer to build. These two frames are
 * that drawer.
 *
 * **Both frames draw the whole screen, not a widget.** Each contains an instance of the contact
 * strip and an instance of the header, then the menu below them. That is Figma's way of saying "the
 * page, with the menu open" — so the strip and the header stay exactly as they are, the burger
 * becomes a cross, and this component owns only what is underneath. Reading it the other way would
 * have this painting a second wordmark, a second basket and a second account button.
 *
 * The header row it sits under is already pixel-identical to the one drawn here: 70px and a 24px
 * gutter at tablet, 60px and 16px on a phone. So the menu's own gutter is `Container`'s, and the
 * cross at the top lines up with `ALL JEWELRY` beneath it without either being positioned.
 *
 * **What the phone carries that the tablet does not.** The contact strip is `hidden` below `md`, so
 * on a phone the menu is the only route to the address, the number and the language — which is why
 * the mobile frame draws all three and the tablet frame draws none of them. The social marks are
 * drawn in both, larger and circled, even though the tablet repeats them in the strip above.
 *
 * **It is a disclosure that covers the page, which changes one thing about it.** Focus is still not
 * trapped: the cross, the basket and the account button share the header row and are all drawn
 * live, so trapping inside the panel would put the control that closes it out of reach. What DOES
 * change is everything the panel covers — `main` and `footer` are inert while it is open, because
 * content that is invisible but still in the tab order is the failure a full-screen overlay
 * introduces and a 200px dropdown does not.
 *
 * **It is always in the document, and `display` is what changes.** An exit animation needs the
 * element to still exist while it plays, which a `{open ? … : null}` cannot give it. So the panel
 * stays mounted and steps between `display: none` and `flex` as a discrete transition, with
 * `@starting-style` supplying the frame it enters from. `display: none` takes it out of the
 * accessibility tree and the tab order just as unmounting did — the closed state is as absent as it
 * ever was, to everything except the DOM.
 *
 * The rest of the disclosure pattern is unchanged from the panel it replaces: `aria-expanded` and
 * `aria-controls` on the trigger, `Escape` closes and returns focus, focus moves to the first link
 * on open, a press outside closes.
 *
 * **The labels are `text-heading-1`.** The drawing sets 30px at 1024 and 20px at 390; the fluid step
 * runs 20px → 30px over exactly that range but reaches the top at 1280, so a 1024 viewport gets
 * 27px rather than the drawn 30. That is the same gap `CategoryCard`'s title has, from the same
 * cause, and it is one question for the designer rather than two: does the tablet step want its own
 * size, or is the fluid ramp what was meant? Overriding it here would give the menu type that
 * behaves unlike every other heading in the app.
 */
export interface MobileNavItem {
  label: string
  href: string
}

export interface MobileNavProps {
  items: MobileNavItem[]
  /**
   * Locale is owned by the header, not by this. Both draw a switcher — the header's from `md` up,
   * this one below it — so exactly one renders at a time, and two components each holding their own
   * copy of the state would disagree the moment the viewport crossed the breakpoint.
   */
  locales?: Locale[]
  locale?: string
  onLocaleChange?: (code: string) => void
  /**
   * The shop's own details, from the `contact-settings` global via the layout.
   *
   * Required rather than defaulted: the hardcoded fallback that used to live here made an
   * unconfigured shop look configured, and the number it showed was somebody's guess. The layout
   * always has these, and a story that renders this component has to say what they are.
   */
  email: string
  /** Display form of the number; `phoneHref` is what actually dials. */
  phone: string
  phoneHref: string
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

// `standalone` rather than the default: the design draws these as plain dark text, and an
// underline at rest here would be the only one on the screen. It is the light-surface counterpart
// of the `inverse` the contact strip uses for the same two facts.
const CONTACT_ROW = 'text-body-medium inline-flex items-center gap-2.5'

export function MobileNav({
  items,
  locales,
  locale,
  onLocaleChange,
  email,
  phone,
  phoneHref,
  social = [],
  className,
}: MobileNavProps) {
  const [open, setOpen] = React.useState(false)
  // The panel is fixed, so it needs the header's bottom edge in viewport coordinates. It cannot be
  // `top-full` on an absolute child: the header scrolls, and the panel has to reach the bottom of
  // the screen from wherever the header actually is.
  const [top, setTop] = React.useState(0)
  const panelId = React.useId()
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const panelRef = React.useRef<HTMLDivElement>(null)

  const close = React.useCallback((returnFocus: boolean) => {
    setOpen(false)
    if (returnFocus) triggerRef.current?.focus()
  }, [])

  /**
   * Escape, the scroll lock, the initial focus and the inert regions are all `useOverlay` (003/T240)
   * — this component is where they were written and the hook is where they now live.
   *
   * Two options are what make this a disclosure rather than a dialog, and both were deliberate in
   * 002. `trapFocus: false`, because the cross that closes this shares the header row with the
   * basket and the account button and all three stay live — trapping would put the close control
   * out of reach. `restoreFocus: false`, because focus should return to the burger when Escape
   * dismisses the menu and NOT when a link inside it navigates; `close(returnFocus)` below is that
   * distinction, and the hook cannot see it.
   */
  useOverlay({
    open,
    onClose: () => close(true),
    panelRef,
    trapFocus: false,
    restoreFocus: false,
  })

  React.useEffect(() => {
    if (!open) return

    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) return
      setOpen(false)
    }

    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  React.useEffect(() => {
    if (!open) return

    const anchor = triggerRef.current?.closest('header') ?? triggerRef.current
    if (!anchor) return

    function measure() {
      // The header is hidden from `xl` up, and with it the cross that closes this. A menu left open
      // across that boundary would lock the page's scroll with nothing on screen to unlock it.
      // Asking whether the trigger is still laid out beats hardcoding the breakpoint here, where
      // the component cannot see the class its parent applied.
      if (triggerRef.current?.offsetParent === null) {
        setOpen(false)
        return
      }
      setTop(anchor!.getBoundingClientRect().bottom)
    }

    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [open])

  return (
    <div className={cn('flex items-center', className)}>
      <IconButton
        ref={triggerRef}
        variant="bare"
        icon={open ? 'close' : 'menu'}
        label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="text-neutral-primary hover:text-primary-default [&_svg]:size-5 md:[&_svg]:size-6"
      />

      <div
        ref={panelRef}
        id={panelId}
        style={{ top }}
        className={cn(
          'bg-background-bg fixed inset-x-0 bottom-0 z-20 flex flex-col overflow-y-auto',
          // The panel unrolls downward from the header rather than sliding into place. A slide
          // would have to start off its own box, and this one is `bottom-0` on an opaque
          // full-screen overlay: any offset shows a sliver of the page it is there to cover.
          // Clipping moves nothing, so there is nothing to show through.
          'transition-[opacity,clip-path,display] duration-[var(--duration-base)]',
          'transition-discrete ease-[var(--ease-emphasized)] motion-reduce:transition-none',
          open
            ? 'opacity-100 [clip-path:inset(0)] starting:opacity-0 starting:[clip-path:inset(0_0_100%_0)]'
            : 'hidden opacity-0 [clip-path:inset(0_0_100%_0)]',
        )}
      >
        <Container as="nav" aria-label="Primary" className="border-b border-black/10 py-7.5">
          <ul className="flex flex-col gap-7.5">
            {items.map((item) => (
              <li key={item.href}>
                <NextLink
                  href={item.href}
                  onClick={() => close(false)}
                  className={cn(
                    'text-neutral-primary ease-standard flex items-center justify-between gap-5',
                    'hover:text-primary-default transition-colors duration-[var(--duration-fast)]',
                  )}
                >
                  {/* Uppercasing is the heading utility's own; the label is written in sentence
                        case so that it is spoken as a word rather than an initialism. */}
                  <span className="text-heading-1">{item.label}</span>
                  <Icon name="chevron-right" className="size-5 shrink-0 md:size-6" />
                </NextLink>
              </li>
            ))}
          </ul>
        </Container>

        {/*
            Below `md` only: from tablet up these same two facts are in the strip above the header,
            and repeating them here would be the third copy on one screen.
          */}
        <Container className="flex flex-1 flex-col items-start gap-5 py-7.5 md:hidden">
          <Link href={`mailto:${email}`} variant="standalone" className={CONTACT_ROW}>
            <Icon name="mail" className="size-6 shrink-0" />
            {email}
          </Link>
          <Link href={phoneHref} variant="standalone" className={CONTACT_ROW}>
            <Icon name="whatsapp" className="size-6 shrink-0" />
            {phone}
          </Link>
        </Container>

        {/* The tablet frame has no contact block, so something else has to push the marks down. */}
        <div className="hidden flex-1 md:block" />

        <div className="flex flex-col items-center gap-5 px-4 pb-7.5 md:px-6">
          {locales && locale && onLocaleChange ? (
            <LanguageSelector
              locales={locales}
              value={locale}
              onChange={onLocaleChange}
              className="md:hidden"
            />
          ) : null}

          <ul className="flex items-center gap-5 md:gap-7.5">
            {social.map((item) => (
              <li key={item.href}>
                <IconButton
                  variant="outline"
                  icon={item.icon}
                  label={item.label}
                  href={item.href}
                  // 50px then 70px, which is the drawn pair. `outline` is already the 50px
                  // hairline-and-shadow control from node 144:1045 — this is that one, circled
                  // and larger. The variant is square by default because the card contexts it
                  // was drawn for are; a disc is what the menu draws.
                  className="size-12.5 rounded-full md:size-17.5 [&_svg]:size-6 md:[&_svg]:size-8"
                />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
