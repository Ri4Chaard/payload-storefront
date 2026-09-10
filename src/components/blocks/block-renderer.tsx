import React from 'react'

import type { StoryBlock } from '@/lib/story/types'

import { BannerBlock } from './banner'
import { CloserLookBlock } from './closer-look'
import { FaqBandBlock } from './faq-band'
import { MediaPlateBlock } from './media-plate'
import { PageHeaderBlock } from './page-header'
import { ProcessStepsBlock } from './process-steps'

/**
 * The composed page (006/T033).
 *
 * **An exhaustive switch with a `never` check, not a lookup table.** A `Record<BlockType, FC>`
 * would be shorter and would fail at runtime — as a blank band on a live page — the day somebody
 * adds a block type to `src/blocks/` without a renderer. The `never` assignment below makes that
 * same mistake a type error in the editor, which is where a mistake this cheap to prevent belongs.
 * `contracts/blocks.md` §2 lists the six steps in full; step 6 is this file.
 *
 * **A renderer never decides whether it should exist.** The mapper has already dropped the empty
 * bands and resolved the questions, so there is nothing here that asks "is this worth showing" —
 * the rule lives in one place, and one place is what stops the two copies from disagreeing.
 *
 * **The first band gets `priority`.** Whatever it is, it is the one above the fold, and it is the
 * page's LCP candidate. Deciding it here rather than in a block is the point: an editor can reorder
 * the page, so "which picture is first" is a property of the composition and nothing else.
 */
export interface BlockRendererProps {
  blocks: StoryBlock[]
}

export function BlockRenderer({ blocks }: BlockRendererProps) {
  return (
    <>
      {blocks.map((block, index) => (
        <React.Fragment key={`${block.type}-${index}`}>
          {renderBlock(block, index === 0)}
        </React.Fragment>
      ))}
    </>
  )
}

function renderBlock(block: StoryBlock, first: boolean): React.ReactNode {
  switch (block.type) {
    case 'page-header':
      // Named rather than spread: `PageHeaderBlock` is typed by what it draws since 007/T008, so it
      // does not accept the union's `type` discriminant.
      return (
        <PageHeaderBlock
          eyebrow={block.eyebrow}
          heading={block.heading}
          headingLevel={block.headingLevel}
        />
      )
    case 'media-plate':
      return <MediaPlateBlock {...block} priority={first} />
    case 'closer-look':
      return <CloserLookBlock {...block} />
    case 'banner':
      return <BannerBlock {...block} />
    case 'process-steps':
      return <ProcessStepsBlock {...block} />
    case 'faq':
      return <FaqBandBlock {...block} />
    default: {
      // A block variant with no renderer. If this line stops compiling, the six-step checklist in
      // contracts/blocks.md §2 was stopped at step 5.
      const unreachable: never = block
      return unreachable
    }
  }
}
