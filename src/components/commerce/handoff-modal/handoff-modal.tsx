'use client'

import { useTranslations } from 'next-intl'
import React from 'react'

import { Button } from '@/components/ui/button'
import { MessengerRow } from '@/components/ui/messenger-row'
import { Modal } from '@/components/ui/modal'
import type { IconName } from '@/lib/icon-registry'
import type { CheckoutContact } from '@/lib/cart/actions-types'
import type { MessengerLink } from '@/lib/messengers/links'
import { cn } from '@/lib/cn'

/**
 * YOUR SELECTION IS IN THE CART (spec 005, T059 – T062). Nodes `590:13108` (1920),
 * `590:13775` (1024), `590:13875` (390).
 *
 * The last screen of the feature, and the one that has to be honest about what just happened.
 *
 * **Nothing has been submitted, and the modal must not imply otherwise** (FR-025, FR-030). No order
 * exists, no reference was issued, nobody is waiting for a reply. The order is completed by the
 * customer sending the message this opens — so the words say that, and say that the site takes no
 * payment and that the seller confirms availability, price and delivery in the conversation.
 *
 * **The copy affordance is always here** (FR-024, SC-017), not only when no messenger can be
 * reached. A web page cannot tell whether tapping `wa.me` lands in WhatsApp or on an error, so a
 * fallback that waits to detect failure never appears for the one customer who needed it — they
 * have already left. Showing it always costs a line of the modal and removes the detection problem.
 *
 * **A row that cannot carry the message says so** (FR-021). Instagram has no documented way to
 * pre-fill a direct message; its row notes that and copying happens on the way out, so nobody
 * arrives at an empty chat believing their selection travelled with them.
 */

const ICONS: Record<MessengerLink['platform'], IconName> = {
  instagram: 'instagram',
  telegram: 'telegram',
  whatsapp: 'whatsapp',
}

export interface HandoffModalProps {
  open: boolean
  onClose: () => void
  /** The composed message. One string for every row — see `beginCheckout`. */
  message: string
  /** Enabled messengers, in the order the owner arranged them. May be empty. */
  messengers: MessengerLink[]
  /** The shop's own details, for the customer who would rather write or call. */
  contact: CheckoutContact
  /** Focus returns here on close. */
  triggerRef?: React.RefObject<HTMLElement | null>
}

export function HandoffModal({
  open,
  onClose,
  message,
  messengers,
  contact,
  triggerRef,
}: HandoffModalProps) {
  const t_cart = useTranslations('cart')
  const [copied, setCopied] = React.useState(false)

  // The confirmation is transient; it must not still be showing the next time the modal opens.
  React.useEffect(() => {
    if (!open) setCopied(false)
  }, [open])

  async function copy() {
    try {
      await navigator.clipboard.writeText(message)
      setCopied(true)
    } catch {
      // A browser that refuses the clipboard (no permission, no secure context) leaves the textarea
      // below, which the customer can select by hand. Nothing here is the only way through.
      setCopied(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t_cart('selectionInCart')}
      size="lg"
      align="center"
      triggerRef={triggerRef}
      closeLabel={t_cart('closeReturn')}
    >
      <p className="text-body-medium text-neutral-primary text-center">
        {t_cart('handoffIntro')}
      </p>

      {/*
        FR-025 and FR-030 in one sentence, and it is load-bearing: nothing has been recorded, so the
        page must not leave anybody believing an order is now in a queue somewhere.
      */}
      <p className="text-body-small text-neutral-secondary mt-2.5 text-center text-balance">
        {t_cart('handoffNote')}
      </p>

      <div className="mt-5 flex flex-col gap-2.5">
        {messengers.map((messenger) => (
          <MessengerRow
            key={messenger.platform}
            href={messenger.href}
            icon={ICONS[messenger.platform]}
            label={messenger.label}
            handle={messenger.handle}
            note={
              messenger.carriesMessage
                ? undefined
                : 'Opens an empty chat — copy your order below first.'
            }
            onClick={() => {
              // Copied on the way out for the row that cannot carry it, so the customer arrives
              // with the message already on the clipboard rather than having to come back for it.
              if (!messenger.carriesMessage) void copy()
            }}
          />
        ))}
      </div>

      {/*
        Always present (FR-024, SC-017) — alongside the rows, not instead of them.
      */}
      <div className="mt-5 border-t border-black/10 pt-5 pb-7.5">
        <p className="text-body-small text-neutral-primary">
          {messengers.length === 0
            ? 'No messenger is set up at the moment. Copy your order and send it to us however suits you.'
            : 'Prefer to send it yourself? Copy your order and paste it anywhere.'}
        </p>

        <label className="sr-only" htmlFor="handoff-message">
          {t_cart('orderReadyToCopy')}
        </label>
        <textarea
          id="handoff-message"
          readOnly
          rows={4}
          value={message}
          onFocus={(event) => event.currentTarget.select()}
          className={cn(
            'text-body-small text-neutral-primary bg-background-bg mt-2.5 w-full resize-none p-2.5',
            'focus-visible:outline-primary-default focus-visible:outline-2 focus-visible:outline-offset-2',
          )}
        />

        <div className="mt-2.5 flex flex-wrap items-center gap-4">
          <Button type="button" variant="secondary" onClick={copy}>
            {copied ? 'Copied' : 'Copy order'}
          </Button>
          {/*
            `aria-live` rather than a toast: the button's own label changes, and a screen reader
            needs to be told that something happened without the focus moving.
          */}
          <p role="status" aria-live="polite" className="text-body-small text-neutral-secondary">
            {copied ? 'Your order is on the clipboard.' : ''}
          </p>
        </div>

        <p className="text-body-small text-neutral-secondary mt-4">
          Or reach us at{' '}
          <a href={`mailto:${contact.email}`} className="underline">
            {contact.email}
          </a>{' '}
          ·{' '}
          <a href={contact.phoneHref} className="underline">
            {contact.phone}
          </a>
        </p>
      </div>
    </Modal>
  )
}
