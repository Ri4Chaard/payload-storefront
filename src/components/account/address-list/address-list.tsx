'use client'

import { useRouter } from 'next/navigation'
import React from 'react'

import { ProfileRow } from '@/components/account/profile-row'
import { AddressModal } from '@/components/account/address-modal'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Modal } from '@/components/ui/modal'
import { deleteAddress } from '@/lib/auth/actions'
import { formatAddress, type CustomerAddress } from '@/lib/addresses/types'
import type { CountryCode, CountryOption } from '@/lib/countries'
import { cn } from '@/lib/cn'

/**
 * The profile's Addresses row — node `266:5096`, empty state in `266:5259` (spec 004, US5).
 *
 * **One row, however many addresses.** The design draws a customer with exactly one, and a pencil
 * at the right edge of the box. That does not survive a second address: a single pencil beside a
 * list of three edits nothing in particular. So the row-level control becomes the `+` the empty
 * state already draws — which is the affordance that still means one thing when the list grows —
 * and the pencil moves onto the address it belongs to, beside the bin that removes it.
 *
 * **The list is bounded.** `getCustomerAddresses` caps the query at fifty; this caps the height, so
 * a customer who has collected a dozen addresses still has a Marketing row visible below them
 * rather than one screen of delivery addresses. The scroller holds buttons, so it is reachable from
 * the keyboard without a `tabIndex` of its own.
 *
 * **One modal, not one per row.** `AddressModal` is controlled from here for that reason, and
 * `triggerRef` is written at click time so focus returns to the exact pencil that opened it rather
 * than to the row above.
 */
const DELETE_ERROR = 'That address could not be removed. Reload the page and try again.'

export interface AddressListProps {
  addresses: CustomerAddress[]
  countries: CountryOption[]
  defaultCountry: CountryCode
}

export function AddressList({ addresses, countries, defaultCountry }: AddressListProps) {
  const router = useRouter()

  const [editing, setEditing] = React.useState<CustomerAddress | null>(null)
  const [formOpen, setFormOpen] = React.useState(false)
  const [confirming, setConfirming] = React.useState<CustomerAddress | null>(null)
  const [removing, setRemoving] = React.useState(false)
  const [removeError, setRemoveError] = React.useState<null | string>(null)

  /**
   * Written on the way in rather than held per row. Every trigger is a button that already exists
   * in the DOM when it is clicked, so `currentTarget` is the honest answer to "where should focus
   * go back to" — and it stays correct when the list is re-rendered underneath it.
   */
  const triggerRef = React.useRef<HTMLElement | null>(null)

  const openForm = (address: CustomerAddress | null, event: React.MouseEvent<HTMLElement>) => {
    triggerRef.current = event.currentTarget
    setEditing(address)
    setFormOpen(true)
  }

  const openConfirm = (address: CustomerAddress, event: React.MouseEvent<HTMLElement>) => {
    triggerRef.current = event.currentTarget
    setRemoveError(null)
    setConfirming(address)
  }

  const confirmRemove = async () => {
    if (!confirming) return

    setRemoving(true)
    const result = await deleteAddress({ id: confirming.id })
    setRemoving(false)

    if (result.status !== 'success') {
      setRemoveError(DELETE_ERROR)
      return
    }

    setConfirming(null)
    // The action revalidated `/account`; this is what asks for the tree without the deleted row.
    router.refresh()
  }

  /**
   * Both dialogs are part of the row's `action`, beside the `+`, rather than siblings of the row.
   *
   * That is not cosmetic. The profile card is a `<dl>`, and a `<dl>` may only directly contain
   * `dt`/`dd` groups plus `div`, `script` and `template` — a `[role=dialog]` dropped in beside the
   * rows is a serious axe violation (WCAG 1.3.1), which is how this arrangement was found. Inside
   * the `<dd>` they are flow content like any other, and `NameModal` has been doing the same thing
   * from its own `action` slot since US4.
   */
  const controls = (
    <>
      <button
        type="button"
        onClick={(event) => openForm(null, event)}
        aria-label="Add address"
        className={cn(
          'text-neutral-secondary hover:text-neutral-primary flex size-8 items-center',
          'justify-center transition-colors',
          'focus-visible:outline-primary-default focus-visible:outline-2 focus-visible:outline-offset-2',
        )}
      >
        <Icon name="plus" className="size-5" />
      </button>

      <AddressModal
        address={editing}
        addressCount={addresses.length}
        countries={countries}
        defaultCountry={defaultCountry}
        onClose={() => setFormOpen(false)}
        open={formOpen}
        triggerRef={triggerRef}
      />

      {/*
        FR-029 — deletion is confirmed, and the confirmation names the address. "Delete this
        address?" over a list of four is a question the customer cannot answer.
      */}
      <Modal
        open={confirming !== null}
        onClose={() => setConfirming(null)}
        title="DELETE ADDRESS"
        closeLabel="Close delete address"
        size="sm"
        triggerRef={triggerRef}
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setConfirming(null)}>
              Cancel
            </Button>
            <Button type="button" variant="primary" onClick={confirmRemove} disabled={removing}>
              Delete
            </Button>
          </>
        }
      >
        <p className="text-body-base text-neutral-primary">
          {confirming ? `Remove ${formatAddress(confirming)} from your account?` : null}
        </p>

        {removeError ? (
          <p role="alert" className="text-body-small text-status-error-text mt-3">
            {removeError}
          </p>
        ) : null}
      </Modal>
    </>
  )

  return (
    <ProfileRow
      label="Addresses"
      // FR-025 — the state a customer with no addresses sees, in the words the design writes.
      empty="No addresses added"
      align="start"
      action={controls}
    >
      {addresses.length > 0 ? (
        <ul className="max-h-56 overflow-y-auto">
          {addresses.map((address) => {
            const summary = formatAddress(address)

            return (
              <li
                key={address.id}
                className="flex items-center gap-3 border-b border-black/5 py-2 first:pt-0 last:border-b-0 last:pb-0"
              >
                <span className="min-w-0 flex-1 break-words">
                  {summary}
                  {address.isDefault ? (
                    /* The role, said once, where the address is. A separate "default" column
                         would be a column that is empty on every row but one. */
                    <span className="text-body-small text-neutral-secondary ml-2 whitespace-nowrap">
                      · Default
                    </span>
                  ) : null}
                </span>

                <span className="flex shrink-0 items-center">
                  <button
                    type="button"
                    onClick={(event) => openForm(address, event)}
                    // Named for the address, not the action. A page with four pencils all called
                    // "Edit address" tells a screen-reader user how many there are and nothing
                    // about which one they want.
                    aria-label={`Edit address: ${summary}`}
                    className={cn(
                      'text-neutral-secondary hover:text-neutral-primary flex size-8 items-center',
                      'justify-center transition-colors',
                      'focus-visible:outline-primary-default focus-visible:outline-2 focus-visible:outline-offset-2',
                    )}
                  >
                    <Icon name="edit" className="size-5" />
                  </button>
                  <button
                    type="button"
                    onClick={(event) => openConfirm(address, event)}
                    aria-label={`Delete address: ${summary}`}
                    className={cn(
                      'text-neutral-secondary hover:text-status-error-text flex size-8 items-center',
                      'justify-center transition-colors',
                      'focus-visible:outline-primary-default focus-visible:outline-2 focus-visible:outline-offset-2',
                    )}
                  >
                    <Icon name="trash" className="size-5" />
                  </button>
                </span>
              </li>
            )
          })}
        </ul>
      ) : null}
    </ProfileRow>
  )
}
