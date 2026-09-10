import type { GlobalConfig } from 'payload'

import { seoField } from '@/fields/seo'
import { isAdmin } from '@/lib/access'

/**
 * The `/about` page (spec 006).
 *
 * **The first page on this site whose COMPOSITION comes out of Payload.** Spec 002 shipped the home
 * page reading `src/mocks/home.ts` for its hero and about band, and named that as the last of the
 * deviation it opened. This page is drawn with seven bands and roughly forty distinct strings, and
 * Constitution I does not permit any of them to live in a component — nor, once the requester asked
 * for it, the arrangement either.
 *
 * **A global, not a collection.** One record, not a list: nothing in the design or the brief
 * suggests a second page of this shape, and a `pages` collection with routing of its own is
 * explicitly out of scope. Globals in Payload 3.88 carry drafts and versions like any collection, so
 * FR-015 costs nothing extra.
 *
 * **`blocks: []` beside `blockReferences` is required, not an oversight.** Payload types `blocks` as
 * mandatory on the field even when the definitions arrive by slug from `config.blocks`. Passing the
 * definitions in both places would defeat the point of referencing them.
 *
 * **The order and the membership are the editor's.** There is no fixed set of bands here — the page
 * is whatever blocks are in `body`, in whatever order they sit. An earlier draft of this spec
 * modelled seven named fields instead, and carried a declared Constitution I exception for it; the
 * requester chose the blocks, and the exception disappeared rather than being justified.
 *
 * **No revalidation hook**, for the reason `src/collections/questions.ts` records at length: the
 * route is `force-dynamic`, so nothing is cached, and the shared `invalidate()` would evict every
 * product page in the shop over a paragraph edit.
 */
/**
 * The page as Figma draws it (006/T039, FR-052).
 *
 * **Copy, but no photographs.** A `defaultValue` applies until the global is first saved, which is
 * exactly what "an untouched install" means — so a fresh database renders the drawn page rather
 * than a blank one, and every string here is content an editor can change rather than a
 * developer's placeholder. Uploads cannot be defaulted: a media slot references a document that
 * has to exist first, so the seven photographs arrive through the seed script and the slots render
 * empty until then.
 *
 * The FAQ band ships with no questions selected, so it does not appear until somebody writes some.
 * That is FR-034 doing its job, not a gap: a heading over nothing is worse than one band fewer.
 *
 * **One consequence, found by testing it: the page cannot be emptied.** Payload treats an empty
 * blocks array as no value and re-applies this default, so an editor who deletes every band and
 * saves gets the drawn page back. That is a real limitation and it is the right side of the trade —
 * `/about` is linked from the header, the footer and the home page, so a page that cannot go blank
 * is worth more than the ability to blank it. An editor who wants less simply keeps fewer bands.
 *
 * The empty composition is still a rendering path the code handles (FR-053) — it is reached by a
 * global that has never been saved, and it is covered in `tests/unit/story-mappers.test.ts`.
 */
const DRAWN_PAGE = [
  {
    blockType: 'page-header',
    eyebrow: 'OUR STORY',
    heading: 'IMMORTALIZING MEMORIES AND EMOTIONS IN EXTRAORDINARY, TIMELESS CREATIONS',
  },
  { blockType: 'media-plate', media: { kind: 'photo' } },
  {
    blockType: 'closer-look',
    body: 'Exceptional diamonds begin with exceptional standards. Aurum combines innovation, timeless design, and uncompromising attention to detail',
    chips: [
      { label: 'Lab-Grown Diamonds' },
      { label: 'Fine Jewelry' },
      { label: 'Exceptional Quality' },
      { label: 'Timeless Design' },
      { label: 'Craftsmanship' },
      { label: 'Certified Diamonds' },
    ],
    figures: [
      { word: 'CERTIFIED', caption: 'selected diamonds' },
      { word: 'EXCEPTIONAL', caption: 'quality standards' },
      { word: 'TIMELESS', caption: 'designed to last' },
    ],
    media: { kind: 'photo' },
  },
  {
    blockType: 'banner',
    eyebrow: 'THE AURUM STANDARD',
    heading: 'SELECTED FOR BRILLIANCE. CRAFTED WITHOUT COMPROMISE.',
    body: 'Every diamond is carefully considered for its beauty, character, and exceptional quality. Because for us, meeting the standard is only the beginning.',
    cta: { label: 'EXPLORE THE COLLECTION', href: '/all-jewelry' },
    media: { kind: 'photo' },
    textSide: 'left',
  },
  {
    blockType: 'process-steps',
    heading: 'FROM DIAMOND TO JEWEL',
    steps: [
      {
        title: 'SELECT',
        caption: 'Exceptional diamonds, carefully chosen',
        media: { kind: 'photo' },
      },
      {
        title: 'CRAFT',
        caption: 'Precision and attention in every detail',
        media: { kind: 'photo' },
      },
      { title: 'CREATE', caption: 'Timeless jewelry made to be yours', media: { kind: 'photo' } },
    ],
  },
  {
    blockType: 'banner',
    heading: 'CRAFTED TO LAST',
    body: 'Jewelry made for the moments that become memories.',
    media: { kind: 'photo' },
    textSide: 'right',
  },
  {
    blockType: 'faq',
    heading: 'EVERY DETAIL, ANSWERED',
    body: 'From choosing the perfect diamond to delivery and jewelry care, we\u2019re here to make every step of your Aurum experience simple and effortless. Have a question you can\u2019t find here? Our team is always ready to help.',
    cta: { label: 'CONTACT US', href: '/contact' },
    questions: [],
  },
]

export const StoryPage: GlobalConfig = {
  slug: 'story-page',
  label: 'Story page',
  admin: {
    group: 'Content',
    description: 'The /about page. Add, remove and reorder the bands below.',
  },
  versions: { drafts: true },
  access: {
    // Public, deliberately, exactly as `shop` and `contact-settings` are. Draft protection is the
    // loader's `draft: false`, not this rule — a global's drafts are a version query, not a row
    // filter, so there is nothing here for a `Where` to constrain.
    read: () => true,
    update: isAdmin,
  },
  fields: [
    {
      name: 'body',
      type: 'blocks',
      label: 'Bands',
      /*
        Without these the admin's add-button reads "Add Body" — Payload falls back to the field's
        NAME, and `body` is a developer's word for the page's contents. Found by the editorial check
        in `tests/e2e/about-admin.spec.ts`, which is what that check is for: the field had a label
        and a description already, and the control an editor actually presses still said the wrong
        thing. The nested arrays got this right by accident, because they were given labels for
        their rows.
      */
      labels: { singular: 'Band', plural: 'Bands' },
      blockReferences: [
        'page-header',
        'media-plate',
        'closer-look',
        'banner',
        'process-steps',
        'faq',
      ],
      blocks: [],
      defaultValue: DRAWN_PAGE,
      admin: {
        description:
          'The page, top to bottom. Drag to reorder. A band left unfilled does not appear on the page.',
      },
    },
    seoField(),
  ],
}
