'use client'

import React from 'react'

import { AddressModal } from '@/components/account/address-modal'
import { ProfileRow } from '@/components/account/profile-row'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Modal } from '@/components/ui/modal'
import { formatAddress, type CustomerAddress } from '@/lib/addresses/types'
import { deleteAddress } from '@/lib/auth/actions'
import { cn } from '@/lib/cn'
import type { CountryCode, CountryOption } from '@/lib/countries'

/**
 * The profile's Addresses row — node `266:5096`, empty state in `266:5259` (spec 004, US5).
 *
 * **One row, however many addresses.** The design draws a customer with exactly one, and a pencil
 * at the right edge of the box. That does not survive a second address: a single pencil beside a
 * list of three edits nothing in particular. So the row-level control becomes the `+` the empty
 * state already draws — which is the affordance that still means one thing when the list grows —
 * and the pencil moves onto the address it belongs to, beside the bin that removes it.
 *
 * **The target is the whole thing, not the icon.** With no addresses the entire box is one control
 * that opens the Add address modal; with addresses, each line is a control that opens that address.
 * The icons are still drawn, because they are what says the row can be edited — they are just no
 * longer the only place a click lands. `ProfileRow`'s `onActivate` records the reasoning.
 *
 * **The list is bounded.** `getCustomerAddresses` caps the query at fifty; this caps the height, so
 * a customer who has collected a dozen addresses still has a Marketing row visible below them
 * rather than one screen of delivery addresses. The scroller holds buttons, so it is reachable from
 * the keyboard without a `tabIndex` of its own.
 *
 * **One modal, not one per row.** `AddressModal` is controlled from here for that reason, and
 * `triggerRef` is written at click time so focus returns to the exact line that opened it rather
 * than to the row above.
 */
const DELETE_ERROR = 'That address could not be removed. Reload the page and try again.'

/** Shared by the two icon buttons that survive as buttons: the `+` and each line's bin. */
const ICON_BUTTON = [
  'flex size-8 cursor-pointer items-center justify-center transition-colors',
  'focus-visible:outline-primary-default focus-visible:outline-2 focus-visible:outline-offset-2',
].join(' ')

export interface AddressListProps {
  addresses: CustomerAddress[]
  countries: CountryOption[]
  defaultCountry: CountryCode
}

export function AddressList({ addresses, countries, defaultCountry }: AddressListProps) {
  const [editing, setEditing] = React.useState<CustomerAddress | null>(null)
  const [formOpen, setFormOpen] = React.useState(false)
  /**
   * Bumped on every opening, and used as the modal's `key`.
   *
   * It is what makes the form a fresh instance each time rather than one that has to remember to
   * clear itself — see the note on `useForm` in `AddressModal`. It also gives Cancel its promised
   * behaviour for free: an abandoned draft cannot survive, because the component that held it does
   * not.
   */
  const [openSeq, setOpenSeq] = React.useState(0)
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
    setOpenSeq((seq) => seq + 1)
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
  }

  const dialogs = (
    <>
      <AddressModal
        key={openSeq}
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

  /**
   * Nothing saved yet: the box has no content of its own to click, so all of it is the `+`.
   *
   * The `+` is then an icon rather than a button. Two nested controls named "Add address" would be
   * two tab stops onto the same action, and a button inside a button is invalid either way.
   */
  if (addresses.length === 0) {
    return (
      <ProfileRow
        label="Addresses"
        // FR-025 — the state a customer with no addresses sees, in the words the design writes.
        empty="No addresses added"
        onActivate={(event) => openForm(null, event)}
        activateLabel="Add address"
        action={<Icon name="plus" className="text-neutral-secondary size-5" />}
        dialog={dialogs}
      />
    )
  }

  return (
    <ProfileRow
      label="Addresses"
      align="start"
      action={
        <button
          type="button"
          onClick={(event) => openForm(null, event)}
          aria-label="Add address"
          className={cn(ICON_BUTTON, 'text-neutral-secondary hover:text-neutral-primary active:text-primary-default')}
        >
          <Icon name="plus" className="size-5" />
        </button>
      }
      dialog={dialogs}
    >
      <ul className="max-h-56 overflow-y-auto">
        {addresses.map((address) => {
          const summary = formatAddress(address)

          return (
            <li
              key={address.id}
              className="flex items-center gap-1 border-b border-black/5 py-1 first:pt-0 last:border-b-0 last:pb-0"
            >
              <button
                type="button"
                onClick={(event) => openForm(address, event)}
                // Named for the address, not the action. A page with four pencils all called "Edit
                // address" tells a screen-reader user how many there are and nothing about which
                // one they want.
                aria-label={`Edit address: ${summary}`}
                className={cn(
                  'ease-standard flex min-w-0 flex-1 cursor-pointer items-center gap-3 px-1 py-1.5',
                  'text-left transition-colors duration-[var(--duration-fast)] hover:bg-black/5',
                  'focus-visible:outline-primary-default focus-visible:outline-2 focus-visible:-outline-offset-2',
                )}
              >
                <span className="min-w-0 flex-1 break-words">
                  {summary}
                  {address.isDefault ? (
                    /* The role, said once, where the address is. A separate "default" column would
                       be a column that is empty on every row but one. */
                    <span className="text-body-small text-neutral-secondary ml-2 whitespace-nowrap">
                      · Default
                    </span>
                  ) : null}
                </span>
                <Icon name="edit" className="text-neutral-secondary size-5 shrink-0" />
              </button>

              <button
                type="button"
                onClick={(event) => openConfirm(address, event)}
                aria-label={`Delete address: ${summary}`}
                className={cn(ICON_BUTTON, 'text-neutral-secondary hover:text-status-error-text active:text-status-error-default')}
              >
                <Icon name="trash" className="size-5" />
              </button>
            </li>
          )
        })}
      </ul>
    </ProfileRow>
  )
}
