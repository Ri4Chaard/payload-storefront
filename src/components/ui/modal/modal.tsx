'use client'

import React from 'react'

import { IconButton } from '@/components/ui/icon-button'
import { useOverlay } from '@/components/ui/overlay'
import { cn } from '@/lib/cn'

/**
 * The centred dialog from nodes `583:12968`, `426:11616` and `525:13319` — a heading with a close
 * control, a body, and right-aligned actions.
 *
 * **A kit primitive because this feature alone has four of them**: Full name, Add address, Change
 * password, and the newsletter confirmation. Principle II promotes a component at its second
 * consumer, so four settles it without an argument.
 *
 * **It reimplements nothing.** `useOverlay` already owns the focus trap, the initial and restored
 * focus, Escape, the scroll lock and the inert background — `Drawer`, `Lightbox` and `MobileNav`
 * are all built on it. `Modal` is the same behaviour in a centred box, and the only reason it is a
 * separate component from `Drawer` is the geometry.
 *
 * **It is always in the document and `display` is what changes**, the same decision `Drawer`
 * records: an exit transition needs the element to exist while it plays, which `{open ? … : null}`
 * cannot give it, and `display: none` removes it from the accessibility tree and the tab order as
 * completely as unmounting did.
 *
 * **It is not a form.** Each of the four consumers owns its own `<form>` and its own action. A
 * modal that knew about submission would be four slightly different components within a month.
 *
 * **Full-bleed below `sm`.** An 800px box on a 390px phone is a horizontal scrollbar; the design
 * has no frames below 1920, so the small widths are derived rather than transcribed.
 */
export interface ModalProps extends Omit<React.ComponentProps<'div'>, 'title'> {
  open: boolean
  onClose: () => void
  /** The panel's heading, and the dialog's accessible name. */
  title: string
  /** Right-aligned actions. The design is always Cancel followed by a primary. */
  footer?: React.ReactNode
  /**
   * `md` is the drawn 800px (spec 004's address and password modals). `lg` is the 500px both of
   * spec 005's dialogs are drawn at — the removal confirmation and the messenger handoff. `sm` is
   * 450px, for a confirmation with one sentence in it.
   */
  size?: 'lg' | 'md' | 'sm'
  /**
   * Where the heading sits.
   *
   * `start` is spec 004's arrangement: heading left, close control right, on one line. `center`
   * is what spec 005 draws — a centred heading with the close mark floated over the corner, which
   * only works because these dialogs have no left-aligned form beneath them to align with.
   */
  align?: 'center' | 'start'
  /** Focus returns here on close. Defaults to whatever held it when the modal opened. */
  triggerRef?: React.RefObject<HTMLElement | null>
  /** Where focus lands on open. Defaults to the first focusable control in the panel. */
  initialFocusRef?: React.RefObject<HTMLElement | null>
  /** The accessible name of the close control. Supplied by the screen that opens the modal. */
  closeLabel?: string
}

export function Modal({
  open,
  onClose,
  title,
  footer,
  size = 'md',
  align = 'start',
  triggerRef,
  initialFocusRef,
  closeLabel = 'Close',
  children,
  className,
  id,
  ...props
}: ModalProps) {
  const panelRef = React.useRef<HTMLDivElement>(null)
  const generatedId = React.useId()
  const panelId = id ?? generatedId
  const titleId = `${panelId}-title`

  useOverlay({ open, onClose, panelRef, triggerRef, initialFocusRef })

  return (
    <>
      {/*
        A plain div, not a button — the same reasoning `Drawer` records. Dismissing by clicking away
        is a pointer shortcut; the close control and Escape are the routes a keyboard and a screen
        reader already have, and a focusable full-screen "close" element would be a third.
      */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={cn(
          'bg-neutral-primary/40 fixed inset-0 z-40',
          'transition-[opacity,display] duration-[var(--duration-base)]',
          'transition-discrete ease-[var(--ease-standard)] motion-reduce:transition-none',
          open ? 'opacity-100 starting:opacity-0' : 'hidden opacity-0',
        )}
      />

      <div
        ref={panelRef}
        id={panelId}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          'bg-background-container fixed z-50 flex flex-col',
          // Full-bleed on a phone, a centred box from `sm` up.
          'inset-x-0 top-auto bottom-0 max-h-[90dvh] w-full',
          'sm:inset-auto sm:top-1/2 sm:left-1/2 sm:max-h-[85dvh] sm:-translate-x-1/2 sm:-translate-y-1/2',
          'sm:max-w-[calc(100vw-2.5rem)]',
          size === 'md' ? 'sm:w-200' : size === 'lg' ? 'sm:w-125' : 'sm:w-112.5',
          // Translate only — the panel never fades. `Drawer` makes the same choice, and the reason
          // is not stylistic: a surface at partial opacity genuinely has the contrast of the blend
          // beneath it, so a fading panel spends its entrance below AA. Measured at 0.28 opacity
          // mid-transition, which an automated audit catches and a reader with low vision simply
          // experiences. The scrim still fades, so the entrance still reads as one.
          'transition-[translate,display] duration-[var(--duration-base)]',
          'transition-discrete ease-[var(--ease-emphasized)] motion-reduce:transition-none',
          open
            ? 'starting:translate-y-2 sm:starting:-translate-y-[46%]'
            : 'hidden translate-y-2 sm:-translate-y-[46%]',
          className,
        )}
        {...props}
      >
        <div
          className={cn(
            'gap-5 px-7.5 pt-7.5 pb-5',
            // Centred: the close mark leaves the flow and floats over the corner, so the heading is
            // centred against the panel rather than against whatever is left after the button.
            align === 'center' ? 'relative text-center' : 'flex items-start justify-between',
          )}
        >
          <h2
            id={titleId}
            className={cn(
              'text-heading-1 text-neutral-primary',
              // Room for the close mark, which is out of the flow when the heading is centred —
              // without this a title long enough to wrap runs underneath it.
              align === 'center' && 'px-10',
            )}
          >
            {title}
          </h2>
          <IconButton
            variant="bare"
            icon="close"
            label={closeLabel}
            type="button"
            onClick={onClose}
            className={cn(
              'text-neutral-primary hover:text-primary-default shrink-0 [&_svg]:size-5',
              align === 'center' ? 'absolute top-7.5 right-7.5' : 'mt-1',
            )}
          />
        </div>

        {/* The body is the only thing that scrolls, so the actions stay reachable at any length. */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-7.5">{children}</div>

        {footer ? (
          <div className="flex items-center justify-end gap-5 px-7.5 pt-5 pb-7.5">{footer}</div>
        ) : null}
      </div>
    </>
  )
}
