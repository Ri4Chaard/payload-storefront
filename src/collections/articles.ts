import { lexicalEditor } from '@payloadcms/richtext-lexical'
import type { CollectionConfig } from 'payload'

import { mediaSlot } from '@/fields/media-slot'
import { seoTab } from '@/fields/seo'
import { slugField } from '@/fields/slug'
import { adminOrPublishedStatus, isAdmin } from '@/lib/access'
import { revalidateArticleOnChange, revalidateArticleOnDelete } from '@/lib/revalidate'

/**
 * The blog (spec 007, FR-021 – FR-038).
 *
 * **The admin tab says "Blog"; the slug says `articles`.** The requester asked for "blogs and blog
 * page", and Payload renders a collection's plural label in its navigation — so the word an editor
 * sees is the word they used. The slug stays plural-and-literal because Constitution IV requires
 * plural collection slugs and because `/api/articles` reads like an address while `/api/blog` reads
 * like a page. `src/collections/questions.ts` makes exactly the same split for the same two reasons.
 *
 * **This is the first collection on this site whose documents are pages.** Products have pages, but
 * a product is a thing that happens to be shown; an article is nothing except its page. Two
 * consequences follow and both are visible below: the slug is a permanent address rather than a
 * convenience (FR-035), and the draft state has to be *unreachable* rather than hidden (FR-037),
 * because a page nobody has published must not be readable through the API either.
 *
 * **Chapters are an array, not blocks.** The drawn chapters are prose, a bold summary line, and
 * bulleted lists — everything a rich-text field already renders through the kit's `RichText`.
 * Composing them from blocks would build a second block registry for content with no blocks in it.
 * 007/research.md R3 records what that decision displaced.
 *
 * **Its own revalidation hooks, and NOT the shared pair.** `revalidateOnChange` walks every product
 * slug, so attaching it here would evict the entire catalogue because somebody fixed a typo in a
 * paragraph — the precise failure `questions.ts` refused to introduce. `revalidateArticleOnChange`
 * marks this article's page and the address a renamed article has just left, and nothing else.
 */
export const Articles: CollectionConfig = {
  slug: 'articles',
  // Newest first, everywhere — the admin list, and the default the blog's own query restates.
  defaultSort: '-publishedOn',
  labels: { singular: 'Article', plural: 'Blog' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'category', 'publishedOn', '_status'],
    group: 'Content',
    description: 'Articles on the blog. Newest first, by the date each was published.',
  },
  versions: { drafts: true },
  access: {
    /*
      A draft is unreachable rather than hidden: the constraint is part of the query, so a direct
      API request for an unpublished article finds nothing (FR-037). A route-level `notFound()`
      cannot give this — `/api/articles` never reaches the route.
    */
    read: adminOrPublishedStatus,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  hooks: {
    afterChange: [revalidateArticleOnChange],
    afterDelete: [revalidateArticleOnDelete],
  },
  fields: [
    slugField({ from: 'title' }),
    {
      name: 'publishedOn',
      type: 'date',
      required: true,
      label: 'Published on',
      admin: {
        position: 'sidebar',
        date: { pickerAppearance: 'dayOnly', displayFormat: 'MMMM dd, yyyy' },
        description:
          'Sorts the blog and appears under the title. This is a date you choose, not a schedule — publishing is the toggle above.',
      },
    },
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Article',
          description: 'What a visitor reads, in the order they read it.',
          fields: [
            {
              name: 'title',
              type: 'text',
              required: true,
              label: 'Title',
              admin: {
                description: 'The headline. Also the card’s title on the blog.',
              },
            },
            {
              name: 'standfirst',
              type: 'textarea',
              required: true,
              label: 'Standfirst',
              admin: {
                description:
                  'The sentence under the title. Also the description used in search results and link previews when the SEO tab is left empty.',
              },
            },
            {
              name: 'category',
              type: 'relationship',
              relationTo: 'article-categories',
              hasMany: false,
              required: true,
              label: 'Category',
              admin: {
                description: 'The badge on the card, and the tab this article appears under.',
              },
            },
            mediaSlot({
              name: 'hero',
              label: 'Hero media',
              description:
                'The wide photograph or video under the standfirst. Leave both empty to open on the first chapter.',
            }),
            {
              name: 'chapters',
              type: 'array',
              label: 'Chapters',
              labels: { singular: 'Chapter', plural: 'Chapters' },
              admin: {
                initCollapsed: true,
                components: {
                  RowLabel:
                    '@/components/admin/article-chapter-row-label#ArticleChapterRowLabel',
                },
                description:
                  'The article itself. Drag to reorder — this is the reading order and the order of the contents list. The contents list appears from two chapters upward.',
              },
              fields: [
                {
                  name: 'heading',
                  type: 'text',
                  required: true,
                  label: 'Heading',
                  admin: {
                    description:
                      'The chapter’s heading, and what the contents list links to. Renaming it changes the link to this chapter.',
                  },
                },
                {
                  name: 'tocLabel',
                  type: 'text',
                  label: 'Contents label',
                  admin: {
                    description:
                      'Optional. A shorter version for the contents list, when the heading is too long to sit in the rail.',
                  },
                },
                {
                  name: 'lede',
                  type: 'text',
                  label: 'Lede',
                  admin: {
                    description:
                      'Optional. The chapter’s one summary line, e.g. “What defines a diamond”. Any further emphasis belongs in the body as bold text.',
                  },
                },
                {
                  name: 'body',
                  type: 'richText',
                  required: true,
                  label: 'Body',
                  /**
                   * **Headings are removed on purpose, and it is a structural rule rather than a
                   * stylistic one.** The article's outline is a contract: `h1` is the title and
                   * `h2` is a chapter heading, which is what makes the contents list complete by
                   * construction — every heading in the article is a chapter, and every chapter is
                   * in the list. A heading typed inside a body would create a section the rail
                   * cannot see and an outline a screen reader reads as broken.
                   *
                   * Constitution IV asks for validation at the field level so invalid content
                   * cannot be published in the first place. This is that rule applied to structure
                   * instead of to values: the toolbar simply does not offer the thing.
                   */
                  editor: lexicalEditor({
                    features: ({ defaultFeatures }) =>
                      defaultFeatures.filter((feature) => feature.key !== 'heading'),
                  }),
                  admin: {
                    description:
                      'Paragraphs, bold, links and lists. Headings are not offered — each chapter already has one above.',
                  },
                },
                {
                  name: 'pullQuote',
                  type: 'textarea',
                  label: 'Pull quote',
                  admin: {
                    description:
                      'Optional. A line set apart from the surrounding text, with a rule beside it.',
                  },
                },
              ],
            },
          ],
        },
        seoTab(),
      ],
    },
  ],
}
