import React from 'react'

import { Icon } from '@/components/ui/icon'
import type { IconName } from '@/lib/icon-registry'
import { cn } from '@/lib/cn'

/**
 * One way to reach the seller (spec 005, T058). Nodes `590:13188` (1920), `590:13879` (390).
 *
 * A circular platform mark, the platform name over its handle, and a chevron — drawn as a row the
 * whole of which is the target, which is why this renders an `<a>` rather than a card containing
 * one. A link inside a clickable box gives a keyboard two stops for one destination and a screen
 * reader two things to read.
 *
 * **`external` is not a style.** These leave the site for a messenger, so they open in a new tab
 * with `rel="noopener noreferrer"` — the same rule `Link` and `IconButton` already follow.
 *
 * **`note` is how a row admits it cannot carry the message.** Instagram has no documented way to
 * pre-fill a direct message, so its row says so and the modal puts the text on the clipboard
 * instead (FR-021). Saying nothing would let a customer arrive at an empty chat believing their
 * selection travelled with them, which is a failure of the interface rather than of Instagram.
 */
export interface MessengerRowProps extends Omit<React.ComponentProps<'a'>, 'children'> {
  icon: IconName
  /** 'WhatsApp'. */
  label: string
  /** '@aurum'. */
  handle: string
  /** Shown beneath the handle, for a row that behaves differently from the others. */
  note?: string
}

export function MessengerRow({
  icon,
  label,
  handle,
  note,
  className,
  ...props
}: MessengerRowProps) {
  return (
    <a
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        // `background-bg` is the page ground — a tint against the white modal, which is what the
        // frames draw. There is no hover background token, so the row answers the pointer through
        // its chevron instead.
        'group bg-background-bg flex items-center gap-4 p-4 sm:gap-5 sm:px-5',
        'ease-standard transition-colors duration-[var(--duration-fast)]',
        'focus-visible:outline-primary-default focus-visible:outline-2 focus-visible:outline-offset-2',
        className,
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        className="bg-primary-default text-background-container flex size-12.5 shrink-0 items-center justify-center rounded-full"
      >
        <Icon name={icon} size="md" />
      </span>

      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-body-strong text-neutral-primary">{label}</span>
        <span className="text-body-small text-neutral-secondary truncate">{handle}</span>
        {note ? <span className="text-body-small text-neutral-secondary mt-1">{note}</span> : null}
      </span>

      <span
        aria-hidden="true"
        className={cn(
          'text-neutral-primary flex size-12.5 shrink-0 items-center justify-center',
          'ease-standard transition-colors duration-[var(--duration-fast)]',
          'group-hover:text-primary-default',
        )}
      >
        <Icon name="chevron-right" size="sm" />
      </span>
    </a>
  )
}
