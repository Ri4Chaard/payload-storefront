import type { Field } from 'payload'

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

/**
 * The URL segment a document is reachable at.
 *
 * Shared rather than repeated. Constitution II names repeated field groups as the thing that must
 * become a reusable config, and four collections need this one.
 *
 * **Derived on create, never after.** Spec FR-013 requires a slug that survives a rename: retitling
 * "Paragon Ring" to "Polygon Ring" must not silently break every link to it. So the title seeds the
 * slug once, and from then on it is the editor's to change on purpose.
 */
export const slugField = ({ from = 'title' }: { from?: string } = {}): Field => ({
  name: 'slug',
  type: 'text',
  required: true,
  unique: true,
  index: true,
  label: 'Slug',
  admin: {
    position: 'sidebar',
    description:
      'The address this appears at. Filled in from the title when first saved. Changing it later breaks existing links — do it deliberately.',
  },
  hooks: {
    beforeValidate: [
      ({ value, data, operation }) => {
        if (typeof value === 'string' && value.trim().length > 0) return slugify(value)
        const source = data?.[from]
        if (operation === 'create' && typeof source === 'string') return slugify(source)
        return value
      },
    ],
  },
})
