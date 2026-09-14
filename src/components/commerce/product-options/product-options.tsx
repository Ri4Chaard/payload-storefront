'use client'

import { useTranslations } from 'next-intl'
import React from 'react'

import { Field } from '@/components/ui/field'
import { Select, type SelectOption } from '@/components/ui/select'
import type { DiamondOption, SizeOption } from '@/lib/catalog/types'
import { cn } from '@/lib/cn'

/**
 * The two choices a piece can offer (003/T282). Nodes `301:5008` (1920), `410:7314` (1024),
 * `410:7647` (390).
 *
 * Two `Select`s in two `Field`s, side by side at 1920 and stacked below it, exactly as drawn. What
 * this component adds is the catalogue's rules about what may be chosen:
 *
 * - **A stone carries its price** (T282). The whole reason to choose one is that it changes what
 *   the piece costs, and a list of names that all look the same is a list that has to be tried one
 *   at a time to find out.
 * - **An unavailable stone is drawn and not selectable** (FR-040), and says so where its price
 *   would be. Hiding it would turn a temporary shortage into a catalogue that looks smaller than
 *   it is, and the visitor would never learn the piece exists in that stone at all.
 * - **A group with nothing in it is not drawn.** A piece with one stone and no sizes offers no
 *   choices, so it gets no controls — an empty select is a control that cannot be used.
 *
 * The sizes carry no metadata because the catalogue holds none. The drawing puts "In stock" or
 * "Made to order" beside every size (node `301:5845`); `Size` has no such field, and inventing one
 * here would print a promise the shop has not made. Recorded as a question for the owner rather
 * than filled in.
 */
export interface ProductOptionsProps extends Omit<React.ComponentProps<'div'>, 'onChange'> {
  diamonds: DiamondOption[]
  sizes: SizeOption[]
  /** The chosen stone's id, and the chosen size's value. `null` is "not chosen yet". */
  diamond: number | null
  size: string | null
  onDiamondChange: (id: number) => void
  onSizeChange: (value: string) => void
  /** Ids, so the page can keep them unique when more than one of these is ever on a page. */
  idPrefix?: string
  diamondLabel?: string
  sizeLabel?: string
  disabled?: boolean
}

export function ProductOptions({
  diamonds,
  sizes,
  diamond,
  size,
  onDiamondChange,
  onSizeChange,
  idPrefix = 'product',
  diamondLabel = 'Choose Your Diamond:',
  sizeLabel = 'Size:',
  disabled = false,
  className,
  ...props
}: ProductOptionsProps) {
  const t_product = useTranslations('product')
  if (diamonds.length === 0 && sizes.length === 0) return null

  const diamondId = `${idPrefix}-diamond`
  const sizeId = `${idPrefix}-size`

  const stones: SelectOption[] = diamonds.map((option) => ({
    value: String(option.id),
    label: option.label,
    // The price where it can be bought, the reason it cannot where it cannot. A price beside a
    // stone nobody can order is the less useful of the two.
    meta: option.available ? option.price : 'Out of stock',
    disabled: !option.available,
  }))

  const measurements: SelectOption[] = sizes.map((option) => ({
    value: option.value,
    label: option.label,
  }))

  return (
    <div className={cn('flex flex-col gap-3 md:gap-4 xl:flex-row xl:gap-5', className)} {...props}>
      {diamonds.length > 0 ? (
        <Field id={diamondId} label={diamondLabel} disabled={disabled} className="min-w-0 flex-1">
          <Select
            id={diamondId}
            options={stones}
            value={diamond === null ? null : String(diamond)}
            onChange={(value) => onDiamondChange(Number(value))}
            placeholder={t_product('chooseDiamond')}
            disabled={disabled}
          />
        </Field>
      ) : null}

      {sizes.length > 0 ? (
        <Field id={sizeId} label={sizeLabel} disabled={disabled} className="min-w-0 flex-1">
          <Select
            id={sizeId}
            options={measurements}
            value={size}
            onChange={onSizeChange}
            placeholder={t_product('chooseSize')}
            disabled={disabled}
          />
        </Field>
      ) : null}
    </div>
  )
}
