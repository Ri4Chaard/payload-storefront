import config from '@payload-config'
import { getPayload } from 'payload'

import { skipRevalidation } from '@/lib/revalidate'

/**
 * Sample Russian and Ukrainian content, so three languages can be SEEN (spec 010, T110).
 *
 * **Not a translation of the site — a demonstration that the machinery works.** A reviewer opening
 * `/ru/legal/privacy` should find Russian words there without first having to write any, and an
 * editor should be able to see what a half-translated document looks like, because that is the state
 * the site will spend months in. It touches one policy, one category, one product and one article per
 * language and leaves everything else to fall back, which is deliberate: a fully translated seed
 * would hide the fallback behaviour this feature depends on.
 *
 * **Every write passes `context: skipRevalidation`.** This runs under `payload run`, where there is
 * no request scope for `revalidatePath` to reach — it throws `Invariant: static generation store
 * missing` rather than doing nothing — and a dev server running alongside is a different process
 * whose cache this one could not invalidate anyway. The same rule every other seed script follows.
 *
 * Idempotent: re-running overwrites the same documents with the same words.
 */

/** Lexical's node shape, as Payload's generated type describes it. */
type Node = { [k: string]: unknown; type: string; version: number }

const paragraph = (text: string): Node => ({
  type: 'paragraph',
  format: '',
  indent: 0,
  version: 1,
  direction: 'ltr',
  textFormat: 0,
  children: [
    { type: 'text', detail: 0, format: 0, mode: 'normal', style: '', text, version: 1 },
  ],
})

/** `direction` is a literal union in the generated type, so it is narrowed rather than inferred. */
const richText = (...paragraphs: string[]) => ({
  root: {
    type: 'root' as const,
    format: '' as const,
    indent: 0,
    version: 1,
    direction: 'ltr' as const,
    children: paragraphs.map(paragraph),
  },
})

const COOKIE_POLICY = {
  ru: { title: 'ПОЛИТИКА COOKIE' },
  uk: { title: 'ПОЛІТИКА COOKIE' },
} as const

const POLICY = {
  ru: {
    title: 'ПОЛИТИКА КОНФИДЕНЦИАЛЬНОСТИ',
    subtitle: 'Обновлено: август 2026',
    body: richText(
      'Мы собираем только те данные, которые нужны, чтобы принять и выполнить ваш заказ: имя, адрес эл. почты и адрес доставки.',
      'Мы не продаём ваши данные. Вы можете в любой момент запросить их копию или удаление, написав нам.',
    ),
  },
  uk: {
    title: 'ПОЛІТИКА КОНФІДЕНЦІЙНОСТІ',
    subtitle: 'Оновлено: серпень 2026',
    body: richText(
      'Ми збираємо лише ті дані, які потрібні, щоб прийняти та виконати ваше замовлення: ім’я, адресу ел. пошти та адресу доставки.',
      'Ми не продаємо ваші дані. Ви можете будь-коли запросити їхню копію або видалення, написавши нам.',
    ),
  },
} as const

/**
 * One product translated, and only its TITLE and DESCRIPTION — not its details.
 *
 * That gap is the point: it is what makes the fallback visible on a real page rather than only in a
 * test, and what an editor will recognise as their own to-do list.
 */
const PRODUCT = {
  ru: { title: 'Многослойное колье-цепочка', description: 'Три цепочки разной длины, носятся вместе или по отдельности.' },
  uk: { title: 'Багатошарове намисто-ланцюжок', description: 'Три ланцюжки різної довжини, носяться разом або окремо.' },
} as const

/**
 * One article, translated only as far as its card goes — title and standfirst.
 *
 * Its chapters stay English on purpose. A reader arriving from `/ru/blog` sees a Russian headline
 * and then an English body, which is exactly the state a real blog passes through and exactly what
 * the per-field fallback is for.
 */
const ARTICLE = {
  ru: {
    title: 'Как выбрать идеальный бриллиант',
    standfirst: 'Четыре характеристики, по которым оценивают камень, и та, что решает больше всех.',
  },
  uk: {
    title: 'Як обрати ідеальний діамант',
    standfirst: 'Чотири характеристики, за якими оцінюють камінь, і та, що вирішує найбільше.',
  },
} as const

const CATEGORY = {
  ru: { title: 'Колье', subtitle: 'Бриллиантовые колье' },
  uk: { title: 'Намиста', subtitle: 'Діамантові намиста' },
} as const

async function seed(): Promise<void> {
  const payload = await getPayload({ config })

  console.log('Seeding Russian and Ukrainian sample content…\n')

  for (const locale of ['ru', 'uk'] as const) {
    const policies = await payload.find({
      collection: 'policies',
      where: { slug: { equals: 'privacy' } },
      limit: 1,
      overrideAccess: true,
    })
    const policy = policies.docs[0]
    if (policy) {
      await payload.update({
        collection: 'policies',
        id: policy.id,
        locale,
        data: { ...POLICY[locale] },
        context: skipRevalidation,
        overrideAccess: true,
      })
      console.log(`  ✓ ${locale}: privacy policy`)
    } else {
      console.log(`  – ${locale}: no privacy policy to translate (run seed:policies first)`)
    }

    /*
      The cookie policy's TITLE only, and only because the footer draws it.

      Every language's footer links to this document by its title, so an untranslated one leaves a
      Latin "Cookie Policy" in a Russian footer — the one place on the site where a fallback is
      conspicuous rather than merely honest. Its body is left to fall back like every other policy's.
    */
    const cookiePolicies = await payload.find({
      collection: 'policies',
      where: { slug: { equals: 'cookies' } },
      limit: 1,
      overrideAccess: true,
    })
    const cookiePolicy = cookiePolicies.docs[0]
    if (cookiePolicy) {
      await payload.update({
        collection: 'policies',
        id: cookiePolicy.id,
        locale,
        data: { ...COOKIE_POLICY[locale] },
        context: skipRevalidation,
        overrideAccess: true,
      })
      console.log(`  ✓ ${locale}: cookie policy title (body falls back)`)
    }

    const products = await payload.find({
      collection: 'products',
      where: { slug: { equals: 'layered-chain-necklace' } },
      limit: 1,
      overrideAccess: true,
    })
    const product = products.docs[0]
    if (product) {
      try {
        await payload.update({
          collection: 'products',
          id: product.id,
          locale,
          data: { ...PRODUCT[locale] },
          context: skipRevalidation,
          overrideAccess: true,
        })
        console.log(`  ✓ ${locale}: one product (title and description only — details fall back)`)
      } catch (error) {
        const detail = (error as { data?: { errors?: { message?: string; path?: string }[] } }).data
        console.log(`  ! ${locale}: product refused —`, JSON.stringify(detail?.errors ?? error))
      }
    }

    const articles = await payload.find({
      collection: 'articles',
      where: { slug: { equals: 'how-to-choose-the-perfect-diamond' } },
      limit: 1,
      overrideAccess: true,
    })
    const article = articles.docs[0]
    if (article) {
      await payload.update({
        collection: 'articles',
        id: article.id,
        locale,
        data: { ...ARTICLE[locale] },
        context: skipRevalidation,
        overrideAccess: true,
      })
      console.log(`  ✓ ${locale}: one article (title and standfirst only — chapters fall back)`)
    } else {
      console.log(`  – ${locale}: no article to translate (run seed:blog first)`)
    }

    const categories = await payload.find({
      collection: 'categories',
      where: { slug: { equals: 'necklaces' } },
      limit: 1,
      overrideAccess: true,
    })
    const category = categories.docs[0]
    if (category) {
      await payload.update({
        collection: 'categories',
        id: category.id,
        locale,
        data: { ...CATEGORY[locale] },
        context: skipRevalidation,
        overrideAccess: true,
      })
      console.log(`  ✓ ${locale}: one category`)
    }
  }

  console.log('\nDone. Everything not listed above falls back to English, on purpose.')
  process.exit(0)
}

await seed()
