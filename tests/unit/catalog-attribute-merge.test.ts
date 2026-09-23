import { describe, expect, it } from 'vitest'

import { mergeAttributes } from '@/lib/catalog/mappers'
import type { ProductAttribute } from '@/lib/catalog/types'

/**
 * The piece's rows with the selected stone's laid over them (spec 011, US2, FR-010, FR-011,
 * FR-016).
 *
 * **What is actually at risk here is not whether a value appears — it is whether TWO appear.** Two
 * stones in one ring differ in carat weight and certificate, and a merge that appended rather than
 * replaced would show a customer two carat weights for the stone in front of them, which is worse
 * than showing neither. Every assertion below is really about that.
 */

const row = (name: string, value: string): ProductAttribute => ({
  name,
  label: name.charAt(0).toUpperCase() + name.slice(1),
  value,
})

const PIECE = [row('metal', '18k gold'), row('carat', '1.0 ct'), row('setting', 'prong')]

describe('a stone laid over its piece', () => {
  it('replaces the piece’s value for the same attribute (FR-010)', () => {
    const merged = mergeAttributes(PIECE, [row('carat', '1.5 ct')])

    expect(merged.map((entry) => entry.value)).toEqual(['18k gold', '1.5 ct', 'prong'])
    expect(merged.filter((entry) => entry.name === 'carat')).toHaveLength(1)
  })

  it('appends an attribute the piece does not carry (FR-011)', () => {
    const merged = mergeAttributes(PIECE, [row('certificate', 'GIA 22')])

    expect(merged.map((entry) => entry.name)).toEqual(['metal', 'carat', 'setting', 'certificate'])
  })

  it('does both at once, which is the ordinary case', () => {
    const merged = mergeAttributes(PIECE, [row('carat', '1.5 ct'), row('certificate', 'GIA 22')])

    expect(merged).toEqual([
      row('metal', '18k gold'),
      row('carat', '1.5 ct'),
      row('setting', 'prong'),
      row('certificate', 'GIA 22'),
    ])
  })

  /**
   * FR-016 — a replaced value keeps the piece's position.
   *
   * The customer is comparing two stones. A list that reshuffles as they switch is a list they have
   * to re-read rather than scan, and the one row that moved is the one they were looking at.
   */
  it('never moves a row because of where its value came from', () => {
    const merged = mergeAttributes(PIECE, [row('metal', 'platinum')])

    expect(merged.map((entry) => entry.name)).toEqual(['metal', 'carat', 'setting'])
    expect(merged[0]!.value).toBe('platinum')
  })

  it('leaves the piece untouched when the stone carries nothing', () => {
    expect(mergeAttributes(PIECE, [])).toEqual(PIECE)
  })

  it('shows a stone’s rows when the piece has none of its own', () => {
    expect(mergeAttributes([], [row('carat', '1.5 ct')])).toEqual([row('carat', '1.5 ct')])
  })

  it('mutates neither input', () => {
    const piece = [...PIECE]
    const stone = [row('carat', '1.5 ct')]
    mergeAttributes(piece, stone)

    expect(piece).toEqual(PIECE)
    expect(stone).toEqual([row('carat', '1.5 ct')])
  })
})
