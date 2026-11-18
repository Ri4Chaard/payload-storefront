import { describe, expect, it } from 'vitest'

import { mergeAttributes } from '@/lib/catalog/mappers'
import type { ProductAttribute } from '@/lib/catalog/types'

/**
 * The product's rows with the selected option's laid over them (spec 011, US2, FR-010, FR-011,
 * FR-016).
 *
 * **What is actually at risk here is not whether a value appears — it is whether TWO appear.** Two
 * options of one product differ in weight and warranty, and a merge that appended rather than
 * replaced would show a customer two weights for the option in front of them, which is worse
 * than showing neither. Every assertion below is really about that.
 */

const row = (name: string, value: string): ProductAttribute => ({
  name,
  label: name.charAt(0).toUpperCase() + name.slice(1),
  value,
})

const PRODUCT = [
  row('material', 'Sample material'),
  row('weight', '1.0 kg'),
  row('finish', 'matte'),
]

describe('an option laid over its product', () => {
  it('replaces the product’s value for the same attribute (FR-010)', () => {
    const merged = mergeAttributes(PRODUCT, [row('weight', '1.5 kg')])

    expect(merged.map((entry) => entry.value)).toEqual(['Sample material', '1.5 kg', 'matte'])
    expect(merged.filter((entry) => entry.name === 'weight')).toHaveLength(1)
  })

  it('appends an attribute the product does not carry (FR-011)', () => {
    const merged = mergeAttributes(PRODUCT, [row('warranty', '2 years')])

    expect(merged.map((entry) => entry.name)).toEqual(['material', 'weight', 'finish', 'warranty'])
  })

  it('does both at once, which is the ordinary case', () => {
    const merged = mergeAttributes(PRODUCT, [row('weight', '1.5 kg'), row('warranty', '2 years')])

    expect(merged).toEqual([
      row('material', 'Sample material'),
      row('weight', '1.5 kg'),
      row('finish', 'matte'),
      row('warranty', '2 years'),
    ])
  })

  /**
   * FR-016 — a replaced value keeps the product's position.
   *
   * The customer is comparing two options. A list that reshuffles as they switch is a list they have
   * to re-read rather than scan, and the one row that moved is the one they were looking at.
   */
  it('never moves a row because of where its value came from', () => {
    const merged = mergeAttributes(PRODUCT, [row('material', 'Other material')])

    expect(merged.map((entry) => entry.name)).toEqual(['material', 'weight', 'finish'])
    expect(merged[0]!.value).toBe('Other material')
  })

  it('leaves the product untouched when the option carries nothing', () => {
    expect(mergeAttributes(PRODUCT, [])).toEqual(PRODUCT)
  })

  it('shows an option’s rows when the product has none of its own', () => {
    expect(mergeAttributes([], [row('weight', '1.5 kg')])).toEqual([row('weight', '1.5 kg')])
  })

  it('mutates neither input', () => {
    const product = [...PRODUCT]
    const option = [row('weight', '1.5 kg')]
    mergeAttributes(product, option)

    expect(product).toEqual(PRODUCT)
    expect(option).toEqual([row('weight', '1.5 kg')])
  })
})
