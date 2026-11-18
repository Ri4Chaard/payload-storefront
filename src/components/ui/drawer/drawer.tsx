'use client'

import React from 'react'

import { IconButton } from '@/components/ui/icon-button'
import { useOverlay } from '@/components/ui/overlay'
import { cn } from '@/lib/cn'

/**
 * The sliding panel from node 532:12507 — 350px wide, a heading with a close control, a scrolling
 * body of hairline-separated groups, and a footer that stays put while the body moves under it.
 *
 * Drawn once, for the filter panel, and built as a primitive anyway: it knows nothing about
 * filters. What it owns is the shape and the behaviour — the scrim, the slide, the focus, the
 * scroll boundary — and `FilterDrawer` supplies the content.
 *
 * **It is always in the document, and `display` is what changes.** The same decision `MobileNav`
 * documented in 002, for two reasons that both still hold. An exit animation needs the element to
 * exist while it plays, which `{open ? … : null}` cannot give it. And the filter panel is a
 * `<form method="GET">` that has to work with JavaScript disabled — a panel that is
 * mounted by a click handler is a panel that never renders for that visitor. `display: none` takes
 * it out of the accessibility tree and the tab order exactly as unmounting did.
 *
 * **It traps focus, where `MobileNav` deliberately does not.** This is a dialog: it owns its close
 * button, it owns `CLEAR` and `APPLY`, and nothing behind it is meant to be reachable while it is
 * open. That is the case `role="dialog"` with `aria-modal` describes, and the case the trap in
 * `useOverlay` is written for.
 *
 * **The body is the only thing that scrolls.** Heading and footer are flex items at fixed size and
 * the body is `flex-1 overflow-y-auto`, so `APPLY` is reachable at any content length without the
 * visitor scrolling a page that is already locked behind them.
 */
export interface DrawerProps extends Omit<React.ComponentProps<'div'>, 'title'> {
  open: boolean
  onClose: () => void
  /** Drawn as the panel's heading, and the dialog's accessible name. */
  title: string
  /**
   * The close control's accessible name.
   *
   * **Composed from `title` only as a fallback, and that fallback is English-shaped**.
   * `Close ${title.toLowerCase()}` is a sentence built in code, so a translated title produces half
   * a sentence — "Close фильтры" — and lowercasing is itself a language-specific operation. A caller
   * that has a translator passes the whole phrase instead.
   */
  closeLabel?: string
  /** Which edge it comes from. The filter panel is drawn on the left. */
  side?: 'left' | 'right'
  /** `CLEAR` and `APPLY`. Pinned below the scrolling body; omit it and the body fills the panel. */
  footer?: React.ReactNode
  /** Focus returns here on close — the control that opened the panel. */
  triggerRef?: React.RefObject<HTMLElement | null>
  /** Wraps the whole panel, for the form the no-JavaScript path submits. */
  asForm?: boolean
  formProps?: React.ComponentProps<'form'>
  /**
   * Where the close control points when there is no scripting.
   *
   * A panel opened by the address bar has to be closable by the address bar. `FilterDrawer` makes
   * its trigger a link to this panel's own id so that `:target` can open it without JavaScript
   *; the same visitor then needs a way back, and `onClose` is a handler that will never
   * run for them. Give it the listing's current address — following it re-renders the page with no
   * fragment, which is the panel closed.
   *
   * With scripting the link is never followed: the press is cancelled and `onClose` runs as usual,
   * so nothing navigates and no history entry is added.
   */
  closeHref?: string
}

export function Drawer({
  open,
  onClose,
  title,
  side = 'left',
  footer,
  triggerRef,
  asForm = false,
  formProps,
  closeLabel,
  closeHref,
  children,
  className,
  id,
  ...props
}: DrawerProps) {
  const panelRef = React.useRef<HTMLDivElement>(null)
  const generatedId = React.useId()
  const panelId = id ?? generatedId
  const titleId = `${panelId}-title`

  useOverlay({ open, onClose, panelRef, triggerRef })

  // Heading, body and footer are one unit whether or not a form wraps them. Built once here and
  // wrapped below, rather than a `Body = asForm ? 'form' : 'div'` element type — that reads
  // tighter and gives both branches the same `ref`, which is a form's and a div's are not.
  const LAYOUT = 'flex min-h-0 flex-1 flex-col'
  const content = (
    <>
      <div className="flex items-center justify-between gap-5 border-b border-black/10 px-5 pt-7.5 pb-5">
        <h2 id={titleId} className="text-heading-1 text-neutral-primary">
          {title}
        </h2>
        <IconButton
          variant="bare"
          icon="close"
          label={closeLabel ?? `Close ${title.toLowerCase()}`}
          {...(closeHref ? { href: closeHref } : {})}
          onClick={(event) => {
            // Cancel the navigation the no-JavaScript path depends on. Scripting is here, so the
            // panel closes in place rather than reloading the listing it is sitting on.
            if (closeHref) event.preventDefault()
            onClose()
          }}
          // Not a submit button. Inside a form, a button with no explicit type submits it — which
          // for the filter panel would apply the filters while dismissing them. On the link branch
          // there is nothing to submit and `type` on an `<a>` means something else entirely.
          {...(closeHref ? {} : { type: 'button' as const })}
          className="text-neutral-primary hover:text-primary-default shrink-0 [&_svg]:size-5"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5">{children}</div>

      {footer ? (
        <div className="flex items-center gap-2.5 border-t border-black/10 px-5 pt-5 pb-7.5">
          {footer}
        </div>
      ) : null}
    </>
  )

  return (
    <>
      {/*
        The scrim is a plain div and not a button. It is a shortcut for a pointer, and the close
        control and Escape are the routes that a keyboard and a screen reader already have — a
        focusable, named "close" overlay would be a third one covering the whole screen.
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
          'bg-background-container fixed inset-y-0 z-50 flex w-87.5 max-w-full flex-col',
          side === 'left' ? 'left-0' : 'right-0',
          'transition-[translate,display] duration-[var(--duration-base)]',
          'transition-discrete ease-[var(--ease-emphasized)] motion-reduce:transition-none',
          open
            ? 'translate-x-0'
            : cn('hidden', side === 'left' ? '-translate-x-full' : 'translate-x-full'),
          open && (side === 'left' ? 'starting:-translate-x-full' : 'starting:translate-x-full'),
          className,
        )}
        {...props}
      >
        {asForm ? (
          <form {...formProps} className={LAYOUT}>
            {content}
          </form>
        ) : (
          <div className={LAYOUT}>{content}</div>
        )}
      </div>
    </>
  )
}
