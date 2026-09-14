import type { GlobalConfig } from 'payload'

import { seoField } from '@/fields/seo'
import { isAdmin } from '@/lib/access'

/**
 * The home page's own copy (spec 010, closing spec 002's last deviation).
 *
 * **This global exists to delete a file.** Until now the hero, the two band headings and the about
 * band read `src/mocks/home.ts` — the last of the fixture content spec 002 opened and every spec
 * since has narrowed. `payload.config.ts`, `story-page.ts` and `eslint-rules/catalog-boundary.mjs`
 * each name it as the outstanding one. Spec 010 is what forced the issue: a string in a mocks file
 * is not merely unowned, it is untranslatable — there is no locale for a TypeScript constant, so
 * the drawn headline stayed English on `/ru` no matter how much of the interface moved.
 *
 * **Flat fields, not blocks.** The same judgement `blog-page` records: the home page is a fixed
 * sequence the design fixes — hero, categories, featured, about, promises — and the two bands in
 * the middle draw from the catalogue rather than from here. Offering an editor a reorderable block
 * list would let them move a heading away from the band it heads, or delete a band the page still
 * renders. What is genuinely theirs is the words, and the words are what this holds.
 *
 * **The defaults are the drawn copy**, so a fresh install renders the designed page rather than a
 * blank one, and every string stays changeable without a deploy. The mechanism `story-page` and
 * `blog-page` already use.
 *
 * **No revalidation hook.** `/` is `force-dynamic` — its own file explains why — so there is
 * nothing cached to invalidate, and the shared `invalidate()` would evict every product page in the
 * shop over a headline edit.
 */
export const HomePage: GlobalConfig = {
  slug: 'home-page',
  label: 'Home page',
  admin: {
    group: 'Content',
    description: 'The headline, the two band headings, and the About band beneath them.',
  },
  versions: { drafts: true },
  access: {
    read: () => true,
    update: isAdmin,
  },
  fields: [
    {
      name: 'hero',
      type: 'group',
      label: 'Hero',
      admin: { description: 'The first screen — a photograph with the headline over its lower edge.' },
      fields: [
        {
          name: 'headline',
          type: 'textarea',
          localized: true,
          required: true,
          defaultValue: 'The beauty of lab-grown diamonds',
          label: 'Headline',
          admin: { description: 'The page’s `h1`. Real text over the photograph, never part of it.' },
        },
        {
          name: 'lede',
          type: 'textarea',
          localized: true,
          required: true,
          defaultValue:
            'Each diamond is created with care for the future, without compromising on quality or brilliance. Modern luxury that combines flawless craftsmanship, sustainability, and affordability',
          label: 'Lede',
          admin: { description: 'The sentence under the headline.' },
        },
        {
          name: 'ctaLabel',
          type: 'text',
          localized: true,
          required: true,
          defaultValue: 'Shop now',
          label: 'Button',
          admin: { description: 'The one way in from the hero. It goes to the full catalogue.' },
        },
        {
          name: 'photo',
          type: 'upload',
          relationTo: 'media',
          label: 'Photograph',
          admin: {
            description:
              'The full-bleed backdrop. Decorative — the headline over it already says what it shows — so it needs no alternative text.',
          },
        },
      ],
    },
    {
      name: 'categoriesHeading',
      type: 'text',
      localized: true,
      required: true,
      defaultValue: 'Shop by category',
      label: 'Categories heading',
      admin: {
        description:
          'Above the four category tiles. The tiles themselves are the categories in Catalogue → Categories.',
      },
    },
    {
      name: 'featuredHeading',
      type: 'text',
      localized: true,
      required: true,
      defaultValue: 'All jewelry',
      label: 'Featured heading',
      admin: {
        description:
          'Above the featured row. The pieces are whichever are marked Featured in Catalogue → Products.',
      },
    },
    {
      name: 'featuredCtaLabel',
      type: 'text',
      localized: true,
      required: true,
      defaultValue: 'View all',
      label: 'Featured link',
      admin: { description: 'The link beside that heading, to the full catalogue.' },
    },
    {
      name: 'about',
      type: 'group',
      label: 'About band',
      admin: { description: 'The band above the service promises, with a photograph beside it.' },
      fields: [
        {
          /*
            Two fields for one heading, because the design draws it in two tones — the first word in
            ink and the name in the brand colour. A single field with markup in it would put styling
            in an editor's text box; two fields keep the split structural, and `AboutBand` is what
            knows which half is which.
          */
          name: 'headingLead',
          type: 'text',
          localized: true,
          required: true,
          defaultValue: 'About',
          label: 'Heading, first part',
          admin: { description: 'Drawn in the text colour, e.g. “About”.' },
        },
        {
          name: 'headingEmphasis',
          type: 'text',
          localized: true,
          required: true,
          defaultValue: 'Aurum',
          label: 'Heading, highlighted part',
          admin: { description: 'Drawn in the brand colour, e.g. “Aurum”.' },
        },
        {
          /*
            An array of paragraphs rather than rich text. The band draws each one as its own `<p>`
            at a fixed measure and nothing else — no headings, no lists, no links — so a rich-text
            editor would offer six affordances the band cannot render. `closerLook`'s chips took the
            same shape for the same reason.
          */
          name: 'body',
          type: 'array',
          label: 'Paragraphs',
          minRows: 1,
          defaultValue: [
            {
              text: 'Discover our collection of lab-grown diamond rings, where timeless beauty meets a responsible approach.',
            },
            {
              text: 'Perfect for engagements, weddings, or special occasions, each piece combines exceptional brilliance, refined luxury, and timeless elegance',
            },
          ],
          admin: { description: 'One box per paragraph. The band draws two.' },
          fields: [
            {
              name: 'text',
              type: 'textarea',
              localized: true,
              label: 'Paragraph',
            },
          ],
        },
        {
          name: 'ctaLabel',
          type: 'text',
          localized: true,
          required: true,
          defaultValue: 'Discover our story',
          label: 'Button',
          admin: { description: 'Goes to the Our Story page.' },
        },
        {
          name: 'photo',
          type: 'upload',
          relationTo: 'media',
          label: 'Photograph',
          admin: {
            description:
              'Stands beside the copy, so it is not decoration — its alternative text comes from the media library.',
          },
        },
      ],
    },
    seoField(),
  ],
}
