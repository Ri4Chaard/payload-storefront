'use client'

import { useTranslations } from 'next-intl'
import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Field } from '@/components/ui/field'
import { Modal } from '@/components/ui/modal'
import { Select } from '@/components/ui/select'
import { TextInput } from '@/components/ui/text-input'
import type { CustomerAddress } from '@/lib/addresses/types'
import { saveAddress } from '@/lib/auth/actions'
import { applyActionErrors, errorText } from '@/lib/auth/form-errors'
import { addressSchema, type AddressValues } from '@/lib/auth/schemas'
import type { CountryCode, CountryOption } from '@/lib/countries'

/**
 * Add address — node `583:12968`, its error state `525:12889` (spec 004, US5, FR-027 – FR-031).
 *
 * **Controlled, unlike `NameRow`.** That component owns its own trigger, and says why: keeping
 * the two together means `triggerRef` never leaves the file. It cannot work here — a customer with
 * four addresses has five triggers (a pencil each, and the `+`) and one modal between them, so
 * `AddressList` owns the open state and hands back the element focus should return to. Rendering
 * one modal per address instead would put four dialogs in the tree to open at most one.
 *
 * **Labels are hidden and the placeholders carry the wording**, as the frame draws it and as the
 * rest of the account forms do. The Change password modal is the exception in the other direction
 * and explains itself there: three password boxes that differ only by placeholder is a form people
 * fill in the wrong order. Six boxes that say `City`, `Postcode` and `Apartment, suite, etc` are
 * not that.
 *
 * **Save is disabled until the four required fields have something in them** (FR-030), which is a
 * courtesy on top of the schema rather than instead of it — `saveAddress` re-validates, because a
 * disabled button is not a check.
 */

export interface AddressModalProps {
  /** The row being edited, or `null` to create a new one. */
  address: CustomerAddress | null
  /** How many the customer already has — the first one is always the default (FR-031). */
  addressCount: number
  countries: CountryOption[]
  /** Pre-selected on a new address, from Account settings (FR-030). */
  defaultCountry: CountryCode
  onClose: () => void
  open: boolean
  /** Focus returns to whichever control opened this. */
  triggerRef: React.RefObject<HTMLElement | null>
}

export function AddressModal({
  address,
  addressCount,
  countries,
  defaultCountry,
  onClose,
  open,
  triggerRef,
}: AddressModalProps) {
  const t_account = useTranslations('account')
  const t_errors = useTranslations('errors')
  const t_common = useTranslations('common')

  const ERRORS: Record<string, string> = {
    addressCityRequired: t_errors('addressCity'),
    addressCountryRequired: t_errors('addressCountry'),
    addressLine1Required: t_errors('addressStreet'),
    addressNotFound: t_errors('addressGone'),
    addressPostcodeRequired: t_errors('addressPostcode'),
    addressTooLong: t_errors('addressTooLong'),
  }

  const fieldId = React.useId()

  const editing = address !== null

  /**
   * The default box is checked and disabled in the two cases where the answer is not the
   * customer's to give: their first address becomes the default whatever they tick, and the
   * current default cannot be un-ticked — only handed to another address. `keepOneDefault` in
   * `src/fields/address-hooks.ts` is what actually enforces both; this is the modal declining to
   * offer a click that would be reverted.
   */
  const lockedDefault = editing ? address.isDefault : addressCount === 0
  const lockNote = editing ? t_account('defaultElsewhere') : t_account('firstAddressDefault')

  const emptyValues = React.useCallback(
    (): AddressValues => ({
      addressLine1: '',
      addressLine2: '',
      apartment: '',
      city: '',
      country: defaultCountry,
      isDefault: addressCount === 0,
      postalCode: '',
    }),
    [addressCount, defaultCountry],
  )

  /**
   * **Mounted fresh for each opening, so these are the only values it ever loads.**
   *
   * The obvious alternative — one long-lived instance that `reset()`s itself in an effect when
   * `open` flips — is what this component did first, and it lost edits. Saving an address
   * revalidates `/account`, and applying that server tree while the modal is open replaces the
   * inputs underneath the customer: the next keystroke reaches a DOM node React is no longer
   * listening to, the form still holds what was there before, and Save writes it back unchanged.
   * `AddressList` gives this component a key that changes on every open, so the instance is always
   * newer than the last tree swap and there is no state to carry across one.
   */
  const form = useForm<AddressValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: address
      ? {
          addressLine1: address.addressLine1,
          addressLine2: address.addressLine2 ?? '',
          apartment: address.apartment ?? '',
          city: address.city,
          country: address.country,
          isDefault: address.isDefault,
          postalCode: address.postalCode,
        }
      : emptyValues(),
    mode: 'onTouched',
  })

  const { errors, isSubmitting } = form.formState
  const resolve = (key: string | undefined) => errorText(ERRORS, key)

  const values = form.watch()
  const incomplete =
    !values.country ||
    values.addressLine1.trim() === '' ||
    values.city.trim() === '' ||
    values.postalCode.trim() === ''

  const onSubmit = form.handleSubmit(async (submitted) => {
    const result = await saveAddress(address ? { ...submitted, id: address.id } : { ...submitted })

    if (result.status === 'success') {
      onClose()
      return
    }

    applyActionErrors(form, result)
  })

  return (
    <Modal
      open={open}
      onClose={onClose}
      // The design draws one frame, for adding. A modal that says ADD ADDRESS over an address that
      // already exists is worse than a title the frame does not have.
      title={editing ? 'EDIT ADDRESS' : 'ADD ADDRESS'}
      closeLabel={editing ? 'Close edit address' : 'Close add address'}
      triggerRef={triggerRef}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>
            {t_common('cancel')}
          </Button>
          {/* Outside the `<form>` and wired by `form=`, as every modal in this feature is: the
              design puts the actions in the footer and the fields in the body. */}
          <Button
            type="submit"
            form="address-form"
            variant="primary"
            disabled={incomplete || isSubmitting}
          >
            {t_common('save')}
          </Button>
        </>
      }
    >
      <form id="address-form" onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
        <Field
          id={`${fieldId}-country`}
          label={t_account('country')}
          hideLabel
          error={resolve(errors.country?.message)}
        >
          <Select
            id={`${fieldId}-country`}
            options={countries}
            value={values.country}
            onChange={(value) =>
              form.setValue('country', value as CountryCode, { shouldValidate: true })
            }
            placeholder={t_account('country')}
            invalid={Boolean(errors.country)}
          />
        </Field>

        <TextInput
          {...form.register('addressLine1')}
          label={t_account('addressLine1')}
          placeholder={t_account('addressLine1')}
          hideLabel
          autoComplete="address-line1"
          error={resolve(errors.addressLine1?.message)}
        />

        <TextInput
          {...form.register('addressLine2')}
          label={t_account('addressLine2')}
          placeholder={t_account('addressLine2Optional')}
          hideLabel
          autoComplete="address-line2"
          error={resolve(errors.addressLine2?.message)}
        />

        <TextInput
          {...form.register('apartment')}
          label={t_account('apartment')}
          placeholder={t_account('apartmentOptional')}
          hideLabel
          // No `autoComplete` token fits: `address-line3` is not one, and the browser's own
          // apartment data lives inside line 2. An empty box is better than a wrong autofill.
          error={resolve(errors.apartment?.message)}
        />

        <div className="flex flex-col gap-5 sm:flex-row">
          <TextInput
            {...form.register('city')}
            label={t_account('city')}
            placeholder={t_account('city')}
            hideLabel
            autoComplete="address-level2"
            error={resolve(errors.city?.message)}
            className="flex-1"
          />
          <TextInput
            {...form.register('postalCode')}
            label={t_account('postcode')}
            placeholder={t_account('postcode')}
            hideLabel
            autoComplete="postal-code"
            error={resolve(errors.postalCode?.message)}
            className="flex-1"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Checkbox
            {...form.register('isDefault')}
            label={t_account('defaultAddress')}
            disabled={lockedDefault}
          />
          {lockedDefault ? (
            <p className="text-body-small text-neutral-secondary">{lockNote}</p>
          ) : null}
        </div>

        {errors.root ? (
          <p role="alert" className="text-body-small text-status-error-text">
            {resolve(errors.root.message)}
          </p>
        ) : null}
      </form>
    </Modal>
  )
}
