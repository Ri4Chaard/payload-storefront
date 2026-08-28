import type { Field, Tab } from 'payload'

/**
 * Editor-controlled page metadata.
 *
 * Constitution V requires that product, category and article pages emit editor-controlled metadata
 * rather than metadata a developer chose. Every field is optional on purpose: the route falls back
 * to the document's own title, description and first photograph, so an editor who fills in nothing
 * still gets a correctly-tagged page.
 *
 * Two shapes are exported because two kinds of form need it, and **they store identically** — a
 * named tab and a group both nest their contents under `seo`. Choosing between them is presentation,
 * with no schema consequence and no migration.
 */
const seoFields = (): Field[] => [
  {
    name: 'title',
    type: 'text',
    label: 'Meta title',
    admin: { description: 'Shown in search results and the browser tab. Around 60 characters.' },
  },
  {
    name: 'description',
    type: 'textarea',
    label: 'Meta description',
    admin: {
      description: 'The sentence beneath the title in search results. Around 155 characters.',
    },
  },
  {
    name: 'image',
    type: 'upload',
    relationTo: 'media',
    label: 'Social image',
    admin: { description: 'Used when the page is shared. Falls back to the first photograph.' },
  },
]

const DESCRIPTION =
  'Overrides for search engines and social previews. Leave empty to use the title, description and first photograph.'

/** For short forms, where a tab strip would be worse than the mess it replaced. */
export const seoField = (): Field => ({
  name: 'seo',
  type: 'group',
  label: 'SEO',
  admin: { description: DESCRIPTION },
  fields: seoFields(),
})

/** For tabbed forms. Same stored shape as `seoField()`. */
export const seoTab = (): Tab => ({
  name: 'seo',
  label: 'SEO',
  description: DESCRIPTION,
  fields: seoFields(),
})
