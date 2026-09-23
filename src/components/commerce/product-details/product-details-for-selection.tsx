'use client'

import React from 'react'

import { ProductDetails, type ProductDetailsProps } from './product-details'
import { useSelectedVariant } from '@/components/commerce/selected-variant'
import { mergeAttributes } from '@/lib/catalog/mappers'
import type { DiamondOption } from '@/lib/catalog/types'

/**
 * `ProductDetails`, showing the selected stone's properties (spec 011, US2, FR-010 – FR-013).
 *
 * **A wrapper rather than a change to `ProductDetails` itself.** That component takes an attribute
 * list and draws it; it has stories, it renders in a Storybook with no Payload behind it, and it
 * knows nothing about stones. Teaching it to subscribe to a selection would cost all three for a
 * decision that is not its to make. This picks the list; it still draws it.
 *
 * **The rich text is untouched, deliberately.** `detailsHtml` and the short description stay the
 * piece's however the selection moves — FR-009a, decided with the owner on 2026-09-23. A stone
 * differs from its siblings in carat, clarity and certificate, which are rows; prose that changed
 * underneath somebody comparing two stones would make them harder to compare rather than easier.
 * It travels through here as an untouched prop, which is what keeps that true.
 */
export interface ProductDetailsForSelectionProps extends ProductDetailsProps {
  /** The stones this piece offers, each with whatever it says about itself. */
  diamonds: DiamondOption[]
}

export function ProductDetailsForSelection({
  attributes,
  diamonds,
  ...props
}: ProductDetailsForSelectionProps) {
  const selected = useSelectedVariant()

  const shown = React.useMemo(() => {
    // Before a stone is chosen — the page's initial state — the piece speaks for itself (FR-012).
    if (selected === null) return attributes

    const stone = diamonds.find((option) => option.id === selected)
    if (!stone) return attributes

    return mergeAttributes(attributes, stone.attributes)
  }, [attributes, diamonds, selected])

  return <ProductDetails {...props} attributes={shown} />
}
