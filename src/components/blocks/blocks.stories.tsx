import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import type { StoryBlock, StoryMedia } from '@/lib/story/types'

import { BlockRenderer } from './block-renderer'

/**
 * The bands of the story page, composed (006/T034, T057).
 *
 * **One stories file for all six, rather than six files.** These are not independent kit
 * components — they are variants of one thing, "a band the editor placed", and the questions worth
 * asking about them are about how they sit TOGETHER: does the outline hold when the order changes,
 * do two banners look like one band repeated, does a page of three bands still look like a page.
 * Six isolated files answer none of that.
 *
 * `check:stories` does not reach here — it guards `src/components/ui/` — so this exists because the
 * bands need looking at, not because a script demands it.
 */
const photo: StoryMedia = {
  kind: 'photo',
  src: '/photography/about.webp',
  width: 1920,
  height: 1080,
  alt: 'A placeholder photograph',
}

const pageHeader: StoryBlock = {
  type: 'page-header',
  headingLevel: 1,
  eyebrow: 'OUR STORY',
  heading: 'A HEADLINE ABOUT YOUR STORE',
}

const closerLook: StoryBlock = {
  type: 'closer-look',
  headingLevel: 2,
  body: 'A short paragraph about what your store offers and what sets it apart.',
  chips: [
    'Feature 1',
    'Feature 2',
    'Feature 3',
    'Feature 4',
    'Feature 5',
    'Feature 6',
  ],
  figures: [
    { word: 'WORD 1', caption: 'a short caption' },
    { word: 'WORD 2', caption: 'a short caption' },
    { word: 'WORD 3', caption: 'a short caption' },
  ],
  media: photo,
}

const standard: StoryBlock = {
  type: 'banner',
  headingLevel: 2,
  eyebrow: 'THE AURUM STANDARD',
  heading: 'A HEADLINE FOR THIS BAND',
  body: 'A short paragraph that supports the headline above.',
  cta: { label: 'EXPLORE THE COLLECTION', href: '/all-products' },
  media: photo,
  textSide: 'left',
}

const craftedToLast: StoryBlock = {
  type: 'banner',
  headingLevel: 2,
  heading: 'A SECOND HEADLINE',
  body: 'A short sentence for this band.',
  media: photo,
  textSide: 'right',
}

const steps: StoryBlock = {
  type: 'process-steps',
  headingLevel: 2,
  heading: 'HOW IT WORKS',
  steps: [
    { title: 'STEP 1', caption: 'A short caption for this step', media: photo },
    { title: 'STEP 2', caption: 'A short caption for this step', media: photo },
    { title: 'STEP 3', caption: 'A short caption for this step', media: photo },
  ],
}

const faq: StoryBlock = {
  type: 'faq',
  headingLevel: 2,
  heading: 'EVERY DETAIL, ANSWERED',
  body: 'A short paragraph introducing the questions below.',
  cta: { label: 'CONTACT US', href: '/contact' },
  questions: [
    {
      id: 1,
      question: 'Question 1?',
      answerHtml:
        '<p>A short answer to the first question.</p>',
    },
    { id: 2, question: 'Question 2?', answerHtml: '<p>A short answer.</p>' },
    {
      id: 3,
      question: 'Question 3?',
      answerHtml:
        '<p>An answer with a list:</p><ul><li>Point one</li><li>Point two</li></ul>',
    },
  ],
}

const meta = {
  title: 'Blocks/StoryPage',
  component: BlockRenderer,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof BlockRenderer>

export default meta
type Story = StoryObj<typeof meta>

/** The page as Figma draws it. */
export const DrawnPage: Story = {
  args: {
    blocks: [
      pageHeader,
      { type: 'media-plate', media: photo },
      closerLook,
      standard,
      steps,
      craftedToLast,
      faq,
    ],
  },
}

export const Tablet: Story = { ...DrawnPage, globals: { viewport: { value: 'lg' } } }
export const Mobile: Story = { ...DrawnPage, globals: { viewport: { value: 'mobile' } } }

/**
 * The two banners side by side, which is the case Constitution II is about.
 *
 * If these ever stop looking like one component with two settings, somebody has started building
 * the second block this feature exists to avoid.
 */
export const BothBanners: Story = { args: { blocks: [standard, craftedToLast] } }

/**
 * An arrangement nobody drew — a banner first, the page header gone.
 *
 * The mapper promotes the banner's heading to `h1`, so the outline survives a reorder. This is the
 * story to look at when FR-051 is in question.
 */
export const ReorderedWithoutPageHeader: Story = {
  args: {
    blocks: [
      { ...standard, headingLevel: 1 },
      { type: 'media-plate', media: photo },
      steps,
    ],
  },
}

/** One band. A short page must still look like a page rather than a fragment. */
export const SingleBand: Story = { args: { blocks: [closerLook] } }

/*
 * There is deliberately no `Empty` story for the composition either, and for the same reason: it
 * renders nothing, and the accessibility sweep waits for a visible root element.
 *
 * FR-053's empty page is asserted where it can be — `tests/unit/story-mappers.test.ts` covers the
 * mapper returning an empty list, and `tests/e2e/about.spec.ts` covers what the route serves.
 */

/**
 * Copy far longer than drawn, and a seventh chip.
 *
 * Drawn heights are minima: the bands must grow rather than clip, and the chip row must wrap.
 */
export const OverfilledCopy: Story = {
  args: {
    blocks: [
      {
        ...closerLook,
        body: `${closerLook.type === 'closer-look' ? closerLook.body : ''} A second sentence, much longer than the drawing allows, to prove the band grows rather than clipping its copy.`,
        chips: [...(closerLook.type === 'closer-look' ? closerLook.chips : []), 'Feature 7'],
      } as StoryBlock,
      { ...standard, heading: 'A HEADLINE FOR THIS BAND, MUCH LONGER THAN THE DRAWING ALLOWS, TO PROVE IT WRAPS RATHER THAN CLIPS' } as StoryBlock,
    ],
  },
}

/** A band with no picture yet — the editor saved early. It keeps its height and stays legible. */
export const BannerWithoutMedia: Story = {
  args: { blocks: [{ ...standard, media: undefined } as StoryBlock] },
}
