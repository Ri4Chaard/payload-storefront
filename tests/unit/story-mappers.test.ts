import { describe, expect, it } from 'vitest'

import { toStoryBlocks } from '@/lib/story/mappers'
import type { StoryPage } from '@/payload-types'

/**
 * The story page's mapper (006/T023).
 *
 * Everything here is a rule that exists BECAUSE the page is composed rather than fixed. When the
 * bands were named fields in a known order, "exactly one h1" held by construction and an empty band
 * was not expressible. Reordering made both of them real, and this file is where they are pinned
 * down — over an array, without rendering anything.
 */

type Body = NonNullable<StoryPage['body']>
type Block = Body[number]

/**
 * A media slot's stored shape. It is REQUIRED on every block that has one — `mediaSlot()` is a
 * group, and a group always exists even when every upload inside it is empty. That is why an empty
 * slot has to be expressible: `{ kind: 'photo' }` is what an untouched band actually holds.
 */
type Slot = Extract<Block, { blockType: 'media-plate' }>['media']

const emptySlot: Slot = { kind: 'photo' }

const pageHeader = (heading = 'OUR STORY, TOLD'): Block => ({
  blockType: 'page-header',
  heading,
})

const banner = (heading = 'SELECTED FOR BRILLIANCE'): Block => ({
  blockType: 'banner',
  heading,
  textSide: 'left',
  media: emptySlot,
})

/** A resolved upload, as Payload hands it back at depth. */
const photo = (): Slot =>
  ({
    kind: 'photo',
    photo: {
      id: 1,
      alt: 'A solitaire ring on red silk',
      url: '/media/ring.webp',
      width: 1920,
      height: 530,
      updatedAt: '',
      createdAt: '',
    },
  }) as unknown as Slot

const steps = (): Block => ({
  blockType: 'process-steps',
  heading: 'FROM DIAMOND TO JEWEL',
  steps: [{ title: 'SELECT', caption: 'Exceptional diamonds', media: emptySlot }],
})

/** The level each surviving block renders its own heading at. */
const levels = (body: Body): number[] =>
  toStoryBlocks(body).map((block) => ('headingLevel' in block ? block.headingLevel : 0))

describe('heading ownership (FR-006, FR-051)', () => {
  it('gives the page header the top level and everything else one below', () => {
    expect(levels([pageHeader(), banner(), steps()])).toEqual([1, 2, 2])
  })

  it('keeps exactly one top heading when a banner is dragged above the page header', () => {
    const result = levels([banner(), pageHeader(), steps()])

    expect(result.filter((level) => level === 1)).toHaveLength(1)
    // The page header still owns it, wherever the editor put it — it is the page's title.
    expect(result).toEqual([2, 1, 2])
  })

  it('promotes the first heading block when there is no page header at all', () => {
    expect(levels([banner(), steps()])).toEqual([1, 2])
  })

  it('emits one top heading, not two, when the editor adds a second page header', () => {
    const result = levels([pageHeader('FIRST'), pageHeader('SECOND'), banner()])

    expect(result.filter((level) => level === 1)).toHaveLength(1)
    expect(result).toEqual([1, 2, 2])
  })

  it('never emits a top heading for a composition that has no headings', () => {
    // A page of nothing but pictures has no title to promote. One h1 is the ceiling, not a quota,
    // and inventing one would mean captioning a photograph as the page's subject.
    expect(levels([{ blockType: 'media-plate', media: photo() }])).toEqual([0])
  })

  it('promotes a block that SURVIVES mapping, never one that was dropped', () => {
    // The page header is blank, so it never reaches the DOM. If ownership were decided over what
    // the editor typed rather than over what renders, this page would emit no h1 at all.
    const body: Body = [{ blockType: 'page-header', heading: '   ' }, banner()]

    expect(levels(body)).toEqual([1])
  })
})

describe('empty bands are dropped, not rendered empty (FR-004)', () => {
  it('drops a band whose copy is blank', () => {
    expect(
      toStoryBlocks([{ blockType: 'banner', heading: '  ', textSide: 'left', media: emptySlot }]),
    ).toEqual([])
  })

  it('drops a full-bleed plate with no picture', () => {
    // There is no copy to fall back on, and FR-024b says an empty frame collapses rather than
    // reserving blank space — so the band is absent rather than 530px of nothing.
    expect(toStoryBlocks([{ blockType: 'media-plate', media: emptySlot }])).toEqual([])
  })

  it('keeps a full-bleed plate that has one', () => {
    const blocks = toStoryBlocks([{ blockType: 'media-plate', media: photo() }])

    expect(blocks).toHaveLength(1)
    // Width and height travel with it, so the box is reserved before the file arrives (FR-024b).
    expect(blocks[0]).toMatchObject({ media: { kind: 'photo', width: 1920, height: 530 } })
  })

  it('drops a numbered band with a heading but no steps', () => {
    const body: Body = [{ blockType: 'process-steps', heading: 'FROM DIAMOND TO JEWEL', steps: [] }]
    expect(toStoryBlocks(body)).toEqual([])
  })

  it('drops a FAQ band when nothing it would show is published (FR-034)', () => {
    const body: Body = [{ blockType: 'faq', heading: 'EVERY DETAIL, ANSWERED', questions: [] }]
    expect(toStoryBlocks(body)).toEqual([])
  })

  it('returns an empty composition rather than throwing (FR-053)', () => {
    expect(toStoryBlocks([])).toEqual([])
    expect(toStoryBlocks(null)).toEqual([])
    expect(toStoryBlocks(undefined)).toEqual([])
  })
})

describe('content that outlived its code', () => {
  it('drops a block type the codebase no longer defines instead of throwing', () => {
    // A band removed from `src/blocks/` while a saved page still references it. The page must stay
    // up; taking the whole route down over one stale band would be the worse failure.
    const body = [{ blockType: 'jukebox' }, pageHeader()] as unknown as Body

    expect(toStoryBlocks(body)).toHaveLength(1)
  })
})

describe('calls to action (FR-011, FR-013)', () => {
  const withCta = (cta: { label?: string; href?: string }): Body => [
    { blockType: 'banner', heading: 'CRAFTED TO LAST', textSide: 'left', media: emptySlot, cta },
  ]

  it('renders a button only when it has both a label and a destination', () => {
    const [block] = toStoryBlocks(withCta({ label: 'EXPLORE', href: '/all-jewelry' }))
    expect(block).toMatchObject({ cta: { label: 'EXPLORE', href: '/all-jewelry' } })
  })

  it('omits a label with no destination — a control that lies about being one', () => {
    const [block] = toStoryBlocks(withCta({ label: 'EXPLORE' }))
    expect(block).not.toHaveProperty('cta')
  })

  it('omits a destination with no label, which would be invisible', () => {
    const [block] = toStoryBlocks(withCta({ href: '/all-jewelry' }))
    expect(block).not.toHaveProperty('cta')
  })
})
