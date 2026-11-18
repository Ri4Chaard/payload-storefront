import { createTranslator } from 'next-intl'
import { describe, expect, it } from 'vitest'

import en from '@/i18n/messages/en.json' with { type: 'json' }
import ru from '@/i18n/messages/ru.json' with { type: 'json' }
import uk from '@/i18n/messages/uk.json' with { type: 'json' }

/**
 * Three plural categories where English has two.
 *
 * **This is the test that would have caught the old cart label.** `count === 1 ? 'item' : 'items'`
 * is correct English and wrong for both other languages: Russian and Ukrainian pick a different
 * form at 1, at 2–4, and at 5–20, and then start again at 21. A translator handed only a singular
 * and a plural cannot express that, and nothing on screen looks broken — it just reads wrong to
 * every Russian speaker.
 *
 * The counts are chosen to hit each category and the wrap-around: 1 → one, 2 → few, 5 → many,
 * 21 → one again.
 *
 * Imported from `next-intl` rather than from `use-intl/core` where `createTranslator` actually
 * lives: `use-intl` is a transitive dependency, so it does not resolve from the repository root.
 * next-intl re-exports it, and depending on the re-export is what keeps this file honest about
 * which package the app itself uses.
 */
/*
  Typed as `typeof en` rather than a loose record: `src/global.d.ts` augments next-intl's
  `AppConfig['Messages']`, so a translator built from an untyped object narrows every key to `never`
  and `t('cart')` stops compiling. The augmentation is doing its job — this is how to satisfy it.
*/
const translator = (locale: string, messages: typeof en) =>
  createTranslator({ locale, messages, namespace: 'header' })

describe('the cart’s spoken name', () => {
  it('reads correctly in English', () => {
    const t = translator('en', en)
    expect(t('cart', { count: 1 })).toBe('Cart, 1 item')
    expect(t('cart', { count: 2 })).toBe('Cart, 2 items')
    expect(t('cart', { count: 21 })).toBe('Cart, 21 items')
  })

  it('picks one, few and many in Russian', () => {
    const t = translator('ru', ru)
    expect(t('cart', { count: 1 })).toBe('Корзина, 1 товар')
    expect(t('cart', { count: 2 })).toBe('Корзина, 2 товара')
    expect(t('cart', { count: 5 })).toBe('Корзина, 5 товаров')
    // 21 returns to the singular form — the case a singular/plural pair gets wrong every time.
    expect(t('cart', { count: 21 })).toBe('Корзина, 21 товар')
  })

  it('picks one, few and many in Ukrainian', () => {
    const t = translator('uk', uk)
    expect(t('cart', { count: 1 })).toBe('Кошик, 1 товар')
    expect(t('cart', { count: 2 })).toBe('Кошик, 2 товари')
    expect(t('cart', { count: 5 })).toBe('Кошик, 5 товарів')
    expect(t('cart', { count: 21 })).toBe('Кошик, 21 товар')
  })

  it('never renders the raw ICU source', () => {
    // A message the runtime failed to parse renders as its own braces, which looks like a template
    // bug rather than a translation one.
    for (const [locale, messages] of [
      ['en', en],
      ['ru', ru],
      ['uk', uk],
    ] as const) {
      const t = translator(locale, messages)
      for (const count of [0, 1, 2, 5, 11, 21, 101]) {
        expect(t('cart', { count })).not.toContain('plural')
        expect(t('cart', { count })).toContain(String(count))
      }
    }
  })
})
