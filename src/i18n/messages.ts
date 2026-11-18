import en from './messages/en.json' with { type: 'json' }
import ru from './messages/ru.json' with { type: 'json' }
import uk from './messages/uk.json' with { type: 'json' }
import { DEFAULT_LOCALE, type Locale } from './routing'

/**
 * The messages for one locale.
 *
 * **Split from `request.ts` so it can be imported outside a Next render.** `request.ts` reaches
 * `next/root-params`, which is a compiler placeholder — importing it from a Payload hook or a test
 * throws "This module is a placeholder for 'next/root-params'". Loading messages is pure, so it
 * lives here and both sides import it.
 *
 * **English is merged underneath every locale**, which is the whole of FR-037. next-intl's own
 * default for a key with no translation is to render the key itself — `catalog.filters.applied`
 * appearing on a Russian page, which is worse than the English sentence it replaced. Deep-merging
 * means an untranslated key renders the English words and the call site never has to know.
 *
 * The merge is one pass over a few hundred keys on the server, per request. If that ever shows up in
 * a profile, memoise per locale — it is pure.
 */
type Messages = typeof en

const CATALOGUE: Record<Locale, unknown> = { en, ru, uk }

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** `base` supplies anything `override` has not translated, at any depth. */
function deepMerge(base: unknown, override: unknown): unknown {
  if (!isPlainObject(base) || !isPlainObject(override)) return override ?? base

  const merged: Record<string, unknown> = { ...base }
  for (const [key, value] of Object.entries(override)) {
    merged[key] = key in base ? deepMerge(base[key], value) : value
  }
  return merged
}

export function loadMessages(locale: Locale): Messages {
  if (locale === DEFAULT_LOCALE) return en
  return deepMerge(en, CATALOGUE[locale]) as Messages
}
