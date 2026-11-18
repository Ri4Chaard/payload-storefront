'use client'

import { useTranslations } from 'next-intl'
import React from 'react'

import { Field } from '@/components/ui/field'
import { Select, type SelectOption } from '@/components/ui/select'
import type { VariantOption } from '@/lib/catalog/types'
import { cn } from '@/lib/cn'

/**
 * The two choices a product can offer. Nodes `301:5008` (1920), `410:7314` (1024),
 * `410:7647` (390).
 *
 * Two `Select`s in two `Field`s, side by side at 1920 and stacked below it, exactly as drawn. What
 * this component adds is the catalogue's rules about what may be chosen:
 *
 * - **An option carries its price**. The whole reason to choose one is that it changes what
 *   the product costs, and a list of names that all look the same is a list that has to be tried one
 *   at a time to find out.
 * - **An unavailable option is drawn and not selectable**, and says so where its price
 *   would be. Hiding it would turn a temporary shortage into a catalogue that looks smaller than
 *   it is, and the visitor would never learn the product comes in that option at all.
 * - **A group with nothing in it is not drawn.** A product with no options offers no choice, so it
 *   gets no controls — an empty select is a control that cannot be used.
 *
 * **Sizes were the other selector here until spec 011 deprecated them.** They never moved the price
 * and the shop stopped selling by them, so the column is one control shorter and a product can be
 * added to a cart in a single action.
 */
export interface ProductOptionsProps extends Omit<React.ComponentProps<'div'>, 'onChange'> {
  variantChoices: VariantOption[]
  /** The chosen option's id. `null` is "not chosen yet". */
  variantChoice: number | null
  onVariantChange: (id: number) => void
  /** Ids, so the page can keep them unique when more than one of these is ever on a page. */
  idPrefix?: string
  variantLabel?: string
  disabled?: boolean
}

export function ProductOptions({
  variantChoices,
  variantChoice,
  onVariantChange,
  idPrefix = 'product',
  variantLabel: variantLabelProp,
  disabled = false,
  className,
  ...props
}: ProductOptionsProps) {
  const t_product = useTranslations('product')
  // Resolved in the body, not as default parameters: `useTranslations` is a hook.
  const variantLabel = variantLabelProp ?? t_product('chooseVariantHeading')
  if (variantChoices.length === 0) return null

  const variantFieldId = `${idPrefix}-variant`

  const selectOptions: SelectOption[] = variantChoices.map((option) => ({
    value: String(option.id),
    label: option.label,
    // The price where it can be bought, the reason it cannot where it cannot. A price beside a
    // option nobody can order is the less useful of the two.
    meta: option.available ? option.price : t_product('outOfStock'),
    disabled: !option.available,
  }))

  return (
    <div className={cn('flex flex-col gap-3 md:gap-4 xl:flex-row xl:gap-5', className)} {...props}>
      {variantChoices.length > 0 ? (
        <Field id={variantFieldId} label={variantLabel} disabled={disabled} className="min-w-0 flex-1">
          <Select
            id={variantFieldId}
            options={selectOptions}
            value={variantChoice === null ? null : String(variantChoice)}
            onChange={(value) => onVariantChange(Number(value))}
            placeholder={t_product('chooseVariant')}
            disabled={disabled}
          />
        </Field>
      ) : null}
    </div>
  )
}
