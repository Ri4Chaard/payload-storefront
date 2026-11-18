import type { Field } from 'payload'

/**
 * Cyrillic → Latin, so a Russian or Ukrainian title produces an address (spec 010, FR-014, R7).
 *
 * **Without this the field is a trap.** `slugify` strips everything outside `a-z0-9`, so
 * "Зимова куртка" reduced to the empty string — against a field that is `required` AND
 * `unique`. The owner's first attempt at creating a document while the admin is set to Russian was
 * an unexplained save error, and FR-014 exists to say that must not happen.
 *
 * Both alphabets are covered, including the letters they do not share: `ї`, `є`, `і` and `ґ` are
 * Ukrainian, `ы`, `э`, `ъ` and `ё` are Russian. Where the two disagree about a letter's sound the
 * table follows the commoner romanisation rather than trying to detect which language a title is in
 * — a slug is an address, not a transcription.
 *
 * Slugs stay **English by convention** all the same: one address segment per document, reached under
 * each language's prefix. This table exists so the convention cannot produce an unsaveable document,
 * not to encourage Cyrillic slugs.
 */
const TRANSLITERATION: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', ґ: 'g', д: 'd', е: 'e', є: 'ye', ё: 'e', ж: 'zh',
  з: 'z', и: 'i', і: 'i', ї: 'yi', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o',
  п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh',
  щ: 'shch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
}

const transliterate = (value: string): string =>
  Array.from(value)
    .map((character) => TRANSLITERATION[character] ?? character)
    .join('')

const slugify = (value: string): string =>
  transliterate(value.toLowerCase().trim())
    // Typographic quotes and the guillemets a Russian title uses for a name — «Парагон» — are
    // removed rather than turned into separators, so the words either side stay one word.
    .replace(/['’«»„“”]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

/**
 * The URL segment a document is reachable at.
 *
 * Shared rather than repeated. Constitution II names repeated field groups as the thing that must
 * become a reusable config, and four collections need this one.
 *
 * **Derived on create, never after.** Spec FR-013 requires a slug that survives a rename: retitling
 * "Summer Jacket" to "Linen Jacket" must not silently break every link to it. So the title seeds the
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
