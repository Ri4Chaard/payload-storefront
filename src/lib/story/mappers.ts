import { convertLexicalToHTML } from '@payloadcms/richtext-lexical/html'
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'

import { toCatalogImage } from '@/lib/catalog/mappers'
import type { Question, StoryPage as StoryPageDocument } from '@/payload-types'

import type {
  Cta,
  Figure,
  HeadingLevel,
  Step,
  StoryBlock,
  StoryMedia,
  StoryPage,
  StoryQuestion,
  StorySeo,
} from './types'

/**
 * Documents to view models for the story page (spec 006, T021).
 *
 * Three rules run through everything below, and each one exists so that no component downstream has
 * to think about it:
 *
 * 1. **An empty band is dropped, not rendered empty** (FR-004). A renderer that also checks would be
 *    a second place for the rule to live, and the two would drift.
 * 2. **A block type the code no longer knows is dropped, not thrown on** (contracts/blocks.md §4).
 *    Content outlives a deployment; a page must not fail to render because of a band somebody
 *    removed from the codebase.
 * 3. **Heading levels are assigned here** (FR-051), so the "exactly one h1" invariant is a property
 *    of one testable function rather than an agreement between six components.
 */

type BlockDocument = NonNullable<StoryPageDocument['body']>[number]

/**
 * The media slot's stored shape, DERIVED rather than restated.
 *
 * Constitution I forbids hand-written interfaces that mirror a collection — the copy compiles
 * happily after the schema moves under it. Pulling it off the generated block type means a change
 * to `mediaSlot()` surfaces here as a type error, which is the whole point.
 */
type SlotDocument = Extract<BlockDocument, { blockType: 'media-plate' }>['media']

/** The step rows, likewise derived. */
type StepDocument = NonNullable<Extract<BlockDocument, { blockType: 'process-steps' }>['steps']>[number]

/** A relationship or upload field is an id until Payload resolves it at depth. */
const resolved = <T>(value: number | T | null | undefined): T | null =>
  value && typeof value === 'object' ? (value as T) : null

/** Trim to `undefined`, so "the editor left it empty" and "the editor typed spaces" agree. */
const text = (value: string | null | undefined): string | undefined => {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

/**
 * A button, or nothing.
 *
 * Both halves are required for a button to exist: a label with no destination is a control that
 * lies about being one, and a destination with no label is invisible. Either alone is an unfinished
 * edit rather than an intention.
 */
const cta = (value: { label?: string | null; href?: string | null } | undefined): Cta | undefined => {
  const label = text(value?.label)
  const href = text(value?.href)
  return label && href ? { label, href } : undefined
}

/**
 * A media slot, or nothing.
 *
 * **The still image is what decides whether the slot exists at all.** For a photograph that is the
 * photograph; for a video it is the poster, which the field config requires. A slot with neither is
 * a frame with nothing to put in it, and FR-024b says such a frame collapses rather than reserving
 * blank space — so it is dropped here and the renderer never has to ask.
 *
 * **A video with no poster, or a poster with no video, is dropped.** The field config requires both
 * (see `src/fields/media-slot.ts`), so reaching this state means the document predates that rule or
 * an asset was deleted from the library underneath it. Rendering a video with nothing to hold its
 * box would reintroduce exactly the layout shift the poster exists to prevent.
 */
const media = (slot: SlotDocument | undefined): StoryMedia | undefined => {
  if (!slot) return undefined

  if (slot.kind === 'photo') {
    const image = toCatalogImage(slot.photo)
    return image ? { ...image, kind: 'photo' } : undefined
  }

  /*
    A video's still is its poster, and the poster is what decides whether the slot exists.

    `toCatalogImage` does the work for both branches because a poster IS an image — same url
    normalisation, same "a single space means decorative" convention. What it cannot supply is the
    file to play, and that is the only thing added here.

    A video document has no `sizes` (Payload skips resizing for non-image mimetypes), so its `url`
    is read directly rather than through the image helper. This is the one place in the codebase
    that needs to know that.
  */
  const poster = toCatalogImage(slot.poster)
  const video = resolved<{ url?: string | null }>(slot.video)
  if (!poster || !video?.url) return undefined

  return { ...poster, kind: 'video', videoSrc: video.url }
}

/** `null` where the answer is empty, matching the catalogue's rich-text convention. */
const html = (value: Question['answer']): string | null => {
  if (!value) return null

  // The generated type describes the same document `SerializedEditorState` does, one field at a
  // time, and the two descriptions are not assignable to each other. The cast is the seam between
  // Payload's generated shape and lexical's own; it is not hiding an unknown.
  const output = convertLexicalToHTML({
    data: value as unknown as SerializedEditorState,
    disableContainer: true,
  }).trim()

  return output === '' ? null : output
}

/**
 * The questions a FAQ band shows.
 *
 * **De-duplicated by id, keeping the first position** (FR-032). Payload will happily let an editor
 * pick the same question twice; the page shows it once, where they first put it.
 *
 * Unpublished questions never arrive here at all — the loader reads with `overrideAccess: false`
 * and `adminOrPublishedStatus` constrains the query, so a draft is absent rather than filtered
 * (FR-033). There is deliberately no status check in this file: the rule lives in the access
 * function, and repeating it here would put it in two places.
 */
const questions = (value: (number | Question)[] | null | undefined): StoryQuestion[] => {
  const seen = new Set<number>()
  const output: StoryQuestion[] = []

  for (const entry of value ?? []) {
    const document = resolved<Question>(entry)
    if (!document || seen.has(document.id)) continue

    const question = text(document.question)
    const answerHtml = html(document.answer)
    if (!question || !answerHtml) continue

    seen.add(document.id)
    output.push({ id: document.id, question, answerHtml })
  }

  return output
}

const figures = (value: { word?: string | null; caption?: string | null }[] | null | undefined): Figure[] =>
  (value ?? []).flatMap((entry) => {
    const word = text(entry.word)
    const caption = text(entry.caption)
    return word && caption ? [{ word, caption }] : []
  })

const chips = (value: { label?: string | null }[] | null | undefined): string[] =>
  (value ?? []).flatMap((entry) => {
    const label = text(entry.label)
    return label ? [label] : []
  })

const steps = (value: StepDocument[] | null | undefined): Step[] =>
  (value ?? []).flatMap((entry) => {
    const title = text(entry?.title)
    if (!title) return []
    return [
      {
        title,
        ...(text(entry?.caption) ? { caption: text(entry?.caption)! } : {}),
        ...(media(entry?.media) ? { media: media(entry?.media)! } : {}),
      },
    ]
  })

/**
 * One block, or `null` where it holds nothing worth rendering.
 *
 * `headingLevel` arrives from the caller because it is a property of position, not of content.
 */
function toBlock(document: BlockDocument, headingLevel: HeadingLevel): StoryBlock | null {
  switch (document.blockType) {
    case 'page-header': {
      const heading = text(document.heading)
      if (!heading) return null
      return {
        type: 'page-header',
        headingLevel,
        heading,
        ...(text(document.eyebrow) ? { eyebrow: text(document.eyebrow)! } : {}),
      }
    }

    case 'media-plate': {
      const plate = media(document.media)
      // A full-bleed plate with no picture is nothing at all — there is no copy to fall back on.
      return plate ? { type: 'media-plate', media: plate } : null
    }

    case 'closer-look': {
      const body = text(document.body)
      const labels = chips(document.chips)
      const words = figures(document.figures)
      const panel = media(document.media)
      if (!body && labels.length === 0 && words.length === 0 && !panel) return null
      return {
        type: 'closer-look',
        headingLevel,
        chips: labels,
        figures: words,
        ...(body ? { body } : {}),
        ...(panel ? { media: panel } : {}),
      }
    }

    case 'banner': {
      const heading = text(document.heading)
      if (!heading) return null
      return {
        type: 'banner',
        headingLevel,
        heading,
        textSide: document.textSide === 'right' ? 'right' : 'left',
        ...(text(document.eyebrow) ? { eyebrow: text(document.eyebrow)! } : {}),
        ...(text(document.body) ? { body: text(document.body)! } : {}),
        ...(cta(document.cta) ? { cta: cta(document.cta)! } : {}),
        ...(media(document.media) ? { media: media(document.media)! } : {}),
      }
    }

    case 'process-steps': {
      const heading = text(document.heading)
      const rows = steps(document.steps)
      // A heading over no steps advertises a sequence the page does not show.
      if (!heading || rows.length === 0) return null
      return { type: 'process-steps', headingLevel, heading, steps: rows }
    }

    case 'faq': {
      const heading = text(document.heading)
      const rows = questions(document.questions)
      // FR-034: absent when nothing it would show is published, rather than a heading over nothing.
      if (!heading || rows.length === 0) return null
      return {
        type: 'faq',
        headingLevel,
        heading,
        questions: rows,
        ...(text(document.body) ? { body: text(document.body)! } : {}),
        ...(cta(document.cta) ? { cta: cta(document.cta)! } : {}),
      }
    }

    default:
      // An unknown block type is content that outlived its code. Dropping it keeps the rest of the
      // page up; throwing would take the whole route down over one stale band.
      return null
  }
}

/** A block type that carries a heading of its own, and could therefore own the page's. */
const CAN_OWN_TOP_HEADING: ReadonlySet<string> = new Set([
  'page-header',
  'banner',
  'process-steps',
  'faq',
])

/**
 * The composition, levelled and filtered (FR-006, FR-051).
 *
 * **The first `page-header` owns the top level.** Failing that — an editor deleted it, or dragged a
 * banner above it — the first block with a heading of any kind owns it instead, so a composition
 * without a page header still has exactly one `h1` rather than none.
 *
 * Ownership is decided over the blocks that SURVIVE mapping, not over what the editor typed. A
 * page header left blank is dropped, and the top level then belongs to whatever renders first —
 * otherwise the page would nominate an owner that never reaches the DOM and emit no `h1` at all.
 */
export function toStoryBlocks(body: StoryPageDocument['body']): StoryBlock[] {
  const mapped = (body ?? []).flatMap((document) => {
    const block = toBlock(document, 2)
    return block ? [{ block, blockType: document.blockType }] : []
  })

  const owner =
    mapped.findIndex((entry) => entry.blockType === 'page-header') !== -1
      ? mapped.findIndex((entry) => entry.blockType === 'page-header')
      : mapped.findIndex((entry) => CAN_OWN_TOP_HEADING.has(entry.blockType))

  return mapped.map((entry, index) =>
    index === owner && 'headingLevel' in entry.block
      ? ({ ...entry.block, headingLevel: 1 } as StoryBlock)
      : entry.block,
  )
}

const seo = (value: StoryPageDocument['seo']): StorySeo => {
  const image = toCatalogImage(value?.image)
  return {
    ...(text(value?.title) ? { title: text(value?.title)! } : {}),
    ...(text(value?.description) ? { description: text(value?.description)! } : {}),
    ...(image ? { image } : {}),
  }
}

export function toStoryPage(document: StoryPageDocument): StoryPage {
  return { blocks: toStoryBlocks(document.body), seo: seo(document.seo) }
}
