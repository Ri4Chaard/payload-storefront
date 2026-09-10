import type { Block } from 'payload'

import { mediaSlot } from '@/fields/media-slot'

/**
 * A full-bleed photograph or video, edge to edge (spec 006, FR-018, FR-049).
 *
 * Drawn at nodes `310:6772` / `413:7679` / `413:7984` — 530px tall at desktop, 400 at tablet, 240
 * on a phone, with nothing over it.
 *
 * The simplest block in the set, and the one that makes "put another photograph here" a composition
 * rather than a code change. It is also the clearest demonstration of what the blocks model bought:
 * before FR-046, adding a second full-bleed image to this page meant editing a component.
 */
export const mediaPlate: Block = {
  slug: 'media-plate',
  labels: { singular: 'Full-width media', plural: 'Full-width media' },
  fields: [mediaSlot({ description: 'Fills the full width of the page.' })],
}
