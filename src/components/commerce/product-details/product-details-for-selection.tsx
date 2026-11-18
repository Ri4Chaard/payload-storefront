'use client'

import React from 'react'

import { ProductDetails, type ProductDetailsProps } from './product-details'
import { useSelectedVariant } from '@/components/commerce/selected-variant'
import { mergeAttributes } from '@/lib/catalog/mappers'
import type { VariantOption } from '@/lib/catalog/types'

/**
 * `ProductDetails`, showing the selected option's properties (spec 011, US2, FR-010 – FR-013).
 *
 * **A wrapper rather than a change to `ProductDetails` itself.** That component takes an attribute
 * list and draws it; it has stories, it renders in a Storybook with no Payload behind it, and it
 * knows nothing about options. Teaching it to subscribe to a selection would cost all three for a
 * decision that is not its to make. This picks the list; it still draws it.
 *
 * **The rich text is untouched, deliberately.** `detailsHtml` and the short description stay the
 * product's however the selection moves — FR-009a, decided with the owner on 2026-09-23. A variant
 * differs from its siblings in properties such as weight or finish, which are rows; prose that
 * changed underneath somebody comparing two options would make them harder to compare rather than easier.
 * It travels through here as an untouched prop, which is what keeps that true.
 */
export interface ProductDetailsForSelectionProps extends ProductDetailsProps {
  /** The options this product offers, each with whatever it says about itself. */
  variantChoices: VariantOption[]
}

export function ProductDetailsForSelection({
  attributes,
  variantChoices,
  ...props
}: ProductDetailsForSelectionProps) {
  const selected = useSelectedVariant()

  const shown = React.useMemo(() => {
    // Before an option is chosen — the page's initial state — the product speaks for itself (FR-012).
    if (selected === null) return attributes

    const choice = variantChoices.find((option) => option.id === selected)
    if (!choice) return attributes

    return mergeAttributes(attributes, choice.attributes)
  }, [attributes, variantChoices, selected])

  return <ProductDetails {...props} attributes={shown} />
}
