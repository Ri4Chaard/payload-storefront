import type { Block } from 'payload'

import { banner } from './banner'
import { closerLook } from './closer-look'
import { faq } from './faq'
import { mediaPlate } from './media-plate'
import { pageHeader } from './page-header'
import { processSteps } from './process-steps'

/**
 * The block registry (spec 006, FR-047, FR-050).
 *
 * Registered once on `config.blocks` and referenced BY SLUG from the pages that use them —
 * `blockReferences: ['banner', …]` rather than the definitions inline. Payload 3.88 supports this
 * directly, and it is what makes FR-050 true rather than aspirational: a block defined inline on a
 * field is scoped to that field, while a block on the config is available to the `/faq` page and the
 * blog with no redefinition and no second copy to drift.
 *
 * Adding a block type is six steps, and stopping early fails quietly in two different ways — see
 * `specs/006-our-story-faq/contracts/blocks.md` §2 before adding one.
 */
export const blocks: Block[] = [pageHeader, mediaPlate, closerLook, banner, processSteps, faq]

export { banner, closerLook, faq, mediaPlate, pageHeader, processSteps }
