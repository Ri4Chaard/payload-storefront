/**
 * The Russian and Ukrainian words the seed writes.
 *
 * **Separate from `seed-translations.ts` on purpose.** That file is the mechanism — find each
 * document, write each locale, stay idempotent — and this one is the content. Keeping them apart
 * means a translator can be handed a single file with no code in it, and means the apply loop stays
 * short enough to read in one screen.
 *
 * **Keyed by slug, never by id.** Ids differ between every database this runs against; a slug is the
 * same thing the English seed uses to find a document, so the two files agree by construction.
 *
 * **Long-form text is keyed by its English wording** (`TEXT` at the bottom). Story-page bands,
 * article chapters, product details and policy bodies live in arrays, blocks and rich text whose rows
 * have no slug; the apply script reads the English document, swaps every string it finds here, and
 * writes the result into the other language — so the structure stays identical and only the words
 * change. An English string with no entry here stays English, and the script says so.
 *
 * Everything here is placeholder copy for a store template. The owner replaces it in the admin.
 */

export type Pair = { ru: string; uk: string }

/** `{ en: { ru, uk } }` for a single field. */
export type Translated<T extends string> = Record<string, Record<'ru' | 'uk', Record<T, string>>>

/** `n` from 1 to `count`, for the numbered placeholders below. */
const numbered = (count: number) => Array.from({ length: count }, (_, index) => index + 1)

export const CATEGORIES: Translated<'subtitle' | 'title'> = Object.fromEntries(
  numbered(4).map((n) => [
    `category-${n}`,
    {
      ru: { title: `Категория ${n}`, subtitle: 'Краткое описание категории' },
      uk: { title: `Категорія ${n}`, subtitle: 'Короткий опис категорії' },
    },
  ]),
)

export const ARTICLE_CATEGORIES: Translated<'title'> = Object.fromEntries(
  numbered(4).map((n) => [`topic-${n}`, { ru: { title: `Тема ${n}` }, uk: { title: `Тема ${n}` } }]),
)

/** Keyed by the attribute's `name`, which is what the English seed calls it. */
export const ATTRIBUTES: Translated<'label'> = {
  colour: { ru: { label: 'Цвет' }, uk: { label: 'Колір' } },
  collection: { ru: { label: 'Коллекция' }, uk: { label: 'Колекція' } },
  material: { ru: { label: 'Материал' }, uk: { label: 'Матеріал' } },
  weight: { ru: { label: 'Вес' }, uk: { label: 'Вага' } },
  origin: { ru: { label: 'Происхождение' }, uk: { label: 'Походження' } },
}

/**
 * The values of the list attributes, keyed `attribute/value` — a value is unique only within its
 * attribute, so the pair is what finds it.
 */
export const ATTRIBUTE_VALUES: Translated<'label'> = {
  'colour/black': { ru: { label: 'Чёрный' }, uk: { label: 'Чорний' } },
  'colour/clear': { ru: { label: 'Прозрачный' }, uk: { label: 'Прозорий' } },
  'colour/green': { ru: { label: 'Зелёный' }, uk: { label: 'Зелений' } },
  'colour/multicolor': { ru: { label: 'Разноцветный' }, uk: { label: 'Різнокольоровий' } },
  ...Object.fromEntries(
    ['A', 'B', 'C', 'D'].map((letter) => [
      `collection/collection-${letter.toLowerCase()}`,
      { ru: { label: `Коллекция ${letter}` }, uk: { label: `Колекція ${letter}` } },
    ]),
  ),
}

/** Every product's description — the English seed gives them all the same placeholder sentence. */
const DESCRIPTION: Pair = {
  ru: 'Краткое описание товара. Замените его своим текстом.',
  uk: 'Короткий опис товару. Замініть його своїм текстом.',
}

/**
 * The catalogue: `product-1` … `product-30` (there is no `product-6` — the sixth hand-written
 * product is the Cyrillic one), the Cyrillic title, and the draft.
 */
export const PRODUCTS: Translated<'description' | 'title'> = Object.fromEntries(
  numbered(30)
    .filter((n) => n !== 6)
    .map((n) => [
      `product-${n}`,
      {
        ru: { title: `Товар ${n}`, description: DESCRIPTION.ru },
        uk: { title: `Товар ${n}`, description: DESCRIPTION.uk },
      },
    ]),
)

PRODUCTS['tovar-s-kirillicheskim-nazvaniem'] = {
  ru: { title: 'Товар с кириллическим названием', description: DESCRIPTION.ru },
  uk: { title: 'Товар з кириличною назвою', description: DESCRIPTION.uk },
}

PRODUCTS['unreleased-product'] = {
  ru: { title: 'Неанонсированный товар', description: 'Ещё не анонсировано.' },
  uk: { title: 'Неанонсований товар', description: 'Ще не анонсовано.' },
}

/** The blog's seven articles — card and header. Chapters are translated through `TEXT`. */
export const ARTICLES: Translated<'standfirst' | 'title'> = Object.fromEntries(
  numbered(7).map((n) => [
    `article-${n}`,
    {
      ru: {
        title: `Заголовок статьи ${n}`,
        standfirst:
          'Краткий анонс, который представляет статью. Замените его своим текстом в панели администратора.',
      },
      uk: {
        title: `Заголовок статті ${n}`,
        standfirst:
          'Короткий анонс, що представляє статтю. Замініть його своїм текстом у панелі адміністратора.',
      },
    },
  ]),
)

/** Photograph descriptions, keyed by filename — the one field on `media` that carries words. */
export const MEDIA: Record<string, Pair> = {
  ...Object.fromEntries(
    numbered(4).map((n) => [
      `category-${n}.webp`,
      { ru: `Изображение категории ${n}`, uk: `Зображення категорії ${n}` },
    ]),
  ),
  ...Object.fromEntries(
    [
      'product-1-a.webp',
      'product-1-c.webp',
      'product-1-d.webp',
      'product-1-b.webp',
      'product-1-e.webp',
      'product-2.webp',
      'product-4.webp',
      'product-3.webp',
      'product-5.webp',
    ].map((file, index) => [
      file,
      { ru: `Изображение товара ${index + 1}`, uk: `Зображення товару ${index + 1}` },
    ]),
  ),
  ...Object.fromEntries(
    [
      'story-opening-plate.webp',
      'story-closer-look.webp',
      'story-standard-banner.webp',
      'story-crafted-to-last.webp',
      'story-step-1-select.webp',
      'story-step-2-craft.webp',
      'story-step-3-create.webp',
    ].map((file, index) => [
      file,
      { ru: `Изображение для страницы «О нас» ${index + 1}`, uk: `Зображення для сторінки «Про нас» ${index + 1}` },
    ]),
  ),
  ...Object.fromEntries(
    [
      'blog-8.webp',
      'blog-7.webp',
      'blog-4.webp',
      'blog-5.webp',
      'blog-2.webp',
      'blog-1.webp',
      'blog-6.webp',
      'blog-3.webp',
    ].map((file, index) => [
      file,
      { ru: `Изображение для блога ${index + 1}`, uk: `Зображення для блогу ${index + 1}` },
    ]),
  ),
  'hero.webp': { ru: 'Главное изображение', uk: 'Головне зображення' },
  'about.webp': { ru: 'Изображение для раздела «О нас»', uk: 'Зображення для розділу «Про нас»' },
  'contact-send-us-a-message.webp': {
    ru: 'Изображение для страницы контактов',
    uk: 'Зображення для сторінки контактів',
  },
}

/**
 * The FAQ, keyed by the English question — `questions` has no slug, and the English wording is what
 * the seed writes, so it is the only stable handle this file can hold.
 *
 * `answer` is one paragraph everywhere, so it is stored as a plain string and wrapped in Lexical's
 * shape by the apply script rather than being written out as a node tree twelve times.
 */
export const QUESTIONS: Translated<'answer' | 'question'> = Object.fromEntries(
  numbered(6).map((n) => [
    `Question ${n}?`,
    {
      ru: {
        question: `Вопрос ${n}?`,
        answer: `Пример ответа на вопрос ${n}. Замените его своим текстом в панели администратора.`,
      },
      uk: {
        question: `Запитання ${n}?`,
        answer: `Приклад відповіді на запитання ${n}. Замініть його своїм текстом у панелі адміністратора.`,
      },
    },
  ]),
)

/** The policies' titles and subtitles. Their bodies are translated through `TEXT`. */
export const POLICIES: Translated<'subtitle' | 'title'> = {
  privacy: {
    ru: { title: 'Политика конфиденциальности', subtitle: 'Обновлено: сентябрь 2026' },
    uk: { title: 'Політика конфіденційності', subtitle: 'Оновлено: вересень 2026' },
  },
  terms: {
    ru: { title: 'Условия и положения', subtitle: 'Обновлено: сентябрь 2026' },
    uk: { title: 'Умови та положення', subtitle: 'Оновлено: вересень 2026' },
  },
  shipping: {
    ru: { title: 'Доставка и возврат', subtitle: 'Бесплатная доставка и возврат для всех заказов' },
    uk: {
      title: 'Доставка та повернення',
      subtitle: 'Безкоштовна доставка та повернення для всіх замовлень',
    },
  },
  cookies: {
    ru: { title: 'Политика cookie', subtitle: 'Обновлено: сентябрь 2026' },
    uk: { title: 'Політика cookie', subtitle: 'Оновлено: вересень 2026' },
  },
}

/**
 * The globals.
 *
 * `shop.warranty` and `shop.delivery` are rich text of two paragraphs each; they are held here as
 * arrays of plain strings and wrapped by the apply script, like the FAQ answers.
 */
export const SHOP: Record<'ru' | 'uk', Record<string, string | string[]>> = {
  ru: {
    detailsTitle: 'ОПИСАНИЕ ТОВАРА',
    warrantyTitle: 'ГАРАНТИЯ И ВОЗВРАТ',
    deliveryTitle: 'ДОСТАВКА',
    listingSubtitle: 'Короткий подзаголовок для каталога товаров',
    warranty: [
      'Опишите здесь вашу гарантию: что она покрывает и на какой срок.',
      'Опишите здесь условия возврата: сколько дней есть у покупателя и в каком состоянии должен быть товар.',
    ],
    delivery: [
      'Опишите здесь способы доставки: куда вы доставляете и как быстро.',
      'Опишите, сколько времени занимает изготовление товаров на заказ до отправки.',
    ],
  },
  uk: {
    detailsTitle: 'ОПИС ТОВАРУ',
    warrantyTitle: 'ГАРАНТІЯ ТА ПОВЕРНЕННЯ',
    deliveryTitle: 'ДОСТАВКА',
    listingSubtitle: 'Короткий підзаголовок для каталогу товарів',
    warranty: [
      'Опишіть тут вашу гарантію: що вона покриває і на який термін.',
      'Опишіть тут умови повернення: скільки днів має покупець і в якому стані має бути товар.',
    ],
    delivery: [
      'Опишіть тут способи доставки: куди ви доставляєте і як швидко.',
      'Опишіть, скільки часу потрібно на виготовлення товарів на замовлення до відправлення.',
    ],
  },
}

export const BLOG_PAGE: Record<'ru' | 'uk', Record<string, string>> = {
  ru: {
    eyebrow: 'НАШ БЛОГ',
    heading: 'Заголовок для вашего блога',
    emptyTitle: 'Пока ничего не опубликовано',
    emptyDescription: 'Первые истории уже пишутся. Загляните позже.',
  },
  uk: {
    eyebrow: 'НАШ БЛОГ',
    heading: 'Заголовок для вашого блогу',
    emptyTitle: 'Поки що нічого не опубліковано',
    emptyDescription: 'Перші історії вже пишуться. Завітайте пізніше.',
  },
}

export const FAQ_PAGE: Record<'ru' | 'uk', Record<string, string>> = {
  ru: {
    heading: 'Частые вопросы',
    emptyTitle: 'Здесь пока пусто',
    emptyDescription:
      'Мы пишем ответы на вопросы, которые нам задают чаще всего. А пока — напишите нам, мы рядом.',
  },
  uk: {
    heading: 'Часті запитання',
    emptyTitle: 'Тут поки що порожньо',
    emptyDescription:
      'Ми пишемо відповіді на запитання, які нам ставлять найчастіше. А поки — напишіть нам, ми поруч.',
  },
}

/** The contact page's top-level words. `faqHeading` is the `faq.heading` group field. */
export const CONTACT_PAGE: Record<'ru' | 'uk', Record<string, string>> = {
  ru: {
    eyebrow: 'СВЯЖИТЕСЬ С НАМИ',
    heading: 'МЫ ЗДЕСЬ, ЧТОБЫ ПОМОЧЬ',
    intro: 'Короткая строка о том, чем может помочь ваша команда',
    faqHeading: 'Частые вопросы',
  },
  uk: {
    eyebrow: 'ЗВ’ЯЖІТЬСЯ З НАМИ',
    heading: 'МИ ТУТ, ЩОБ ДОПОМОГТИ',
    intro: 'Короткий рядок про те, чим може допомогти ваша команда',
    faqHeading: 'Часті запитання',
  },
}

/** The contact form's own words, nested under `form` in the global. */
export const CONTACT_FORM: Record<'ru' | 'uk', Record<string, string>> = {
  ru: {
    heading: 'НАПИШИТЕ НАМ',
    body: 'Чтобы сделать запрос, заполните форму ниже. Наша команда с радостью поможет с заказами, доставкой и любыми другими вопросами.',
    nameLabel: 'Имя',
    emailLabel: 'Эл. почта',
    messageLabel: 'Сообщение',
    submitLabel: 'ОТПРАВИТЬ СООБЩЕНИЕ',
    footnote: 'Мы ответим так скоро, как сможем.',
    successMessage: 'Спасибо — ваше сообщение получено. Мы свяжемся с вами при первой возможности.',
    errorMessage:
      'Не удалось получить ваше сообщение. Попробуйте ещё раз или напишите нам в WhatsApp, Telegram или Instagram.',
  },
  uk: {
    heading: 'НАПИШІТЬ НАМ',
    body: 'Щоб зробити запит, заповніть форму нижче. Наша команда з радістю допоможе із замовленнями, доставкою та будь-якими іншими питаннями.',
    nameLabel: 'Ім’я',
    emailLabel: 'Ел. пошта',
    messageLabel: 'Повідомлення',
    submitLabel: 'НАДІСЛАТИ ПОВІДОМЛЕННЯ',
    footnote: 'Ми відповімо якнайшвидше.',
    successMessage:
      'Дякуємо — ваше повідомлення отримано. Ми зв’яжемося з вами за першої нагоди.',
    errorMessage:
      'Не вдалося отримати ваше повідомлення. Спробуйте ще раз або напишіть нам у WhatsApp, Telegram чи Instagram.',
  },
}

/**
 * The home page, which stopped being a fixture file in spec 010.
 *
 * `about.body` is an array of paragraphs in the global; it is held here as an array of strings and
 * written into the English rows by the apply script, the same way the FAQ's answers are wrapped
 * into Lexical nodes.
 */
export const HOME_PAGE: Record<'ru' | 'uk', Record<string, string | string[]>> = {
  ru: {
    heroHeadline: 'Заголовок о вашем магазине',
    heroLede: 'Короткое предложение под заголовком о том, что предлагает ваш магазин.',
    heroCtaLabel: 'В магазин',
    categoriesHeading: 'Категории',
    featuredHeading: 'Все товары',
    featuredCtaLabel: 'Смотреть все',
    aboutHeadingLead: 'О',
    aboutHeadingEmphasis: 'нас',
    aboutCtaLabel: 'Наша история',
    aboutBody: [
      'Короткий абзац о вашем магазине.',
      'Второй абзац о том, что вы продаёте и почему на это стоит взглянуть.',
    ],
  },
  uk: {
    heroHeadline: 'Заголовок про ваш магазин',
    heroLede: 'Коротке речення під заголовком про те, що пропонує ваш магазин.',
    heroCtaLabel: 'До магазину',
    categoriesHeading: 'Категорії',
    featuredHeading: 'Усі товари',
    featuredCtaLabel: 'Дивитися все',
    aboutHeadingLead: 'Про',
    aboutHeadingEmphasis: 'нас',
    aboutCtaLabel: 'Наша історія',
    aboutBody: [
      'Короткий абзац про ваш магазин.',
      'Другий абзац про те, що ви продаєте і чому на це варто поглянути.',
    ],
  },
}

/**
 * Long-form text, keyed by the exact English the seeds write: the Story page's bands, the feature
 * article's chapters, product details and attribute values, and the policy bodies.
 */
export const TEXT: Record<string, Pair> = {
  // ---- products ----------------------------------------------------------------------------------
  'Short product description. Replace it with your own text.': DESCRIPTION,
  'Краткое описание товара. Замените его своим текстом.': DESCRIPTION,
  'Not yet announced.': { ru: 'Ещё не анонсировано.', uk: 'Ще не анонсовано.' },
  'Add product details, specifications and care instructions here.': {
    ru: 'Добавьте здесь подробности о товаре, характеристики и инструкции по уходу.',
    uk: 'Додайте тут подробиці про товар, характеристики та інструкції з догляду.',
  },
  'Material A': { ru: 'Материал A', uk: 'Матеріал A' },
  'Material B': { ru: 'Материал B', uk: 'Матеріал B' },
  'Material C': { ru: 'Материал C', uk: 'Матеріал C' },
  '1.0 kg': { ru: '1,0 кг', uk: '1,0 кг' },
  '2.5 kg': { ru: '2,5 кг', uk: '2,5 кг' },
  'Sample origin': { ru: 'Пример происхождения', uk: 'Приклад походження' },

  // ---- the Story page ------------------------------------------------------------------------------
  'OUR STORY': { ru: 'НАША ИСТОРИЯ', uk: 'НАША ІСТОРІЯ' },
  'A HEADLINE ABOUT YOUR STORE': { ru: 'ЗАГОЛОВОК О ВАШЕМ МАГАЗИНЕ', uk: 'ЗАГОЛОВОК ПРО ВАШ МАГАЗИН' },
  'A short paragraph about what your store offers and what sets it apart.': {
    ru: 'Короткий абзац о том, что предлагает ваш магазин и чем он отличается от других.',
    uk: 'Короткий абзац про те, що пропонує ваш магазин і чим він відрізняється від інших.',
  },
  ...Object.fromEntries(
    numbered(6).map((n) => [`Feature ${n}`, { ru: `Особенность ${n}`, uk: `Особливість ${n}` }]),
  ),
  ...Object.fromEntries(
    numbered(3).map((n) => [`WORD ${n}`, { ru: `СЛОВО ${n}`, uk: `СЛОВО ${n}` }]),
  ),
  'a short caption': { ru: 'короткая подпись', uk: 'короткий підпис' },
  'SECTION LABEL': { ru: 'МЕТКА РАЗДЕЛА', uk: 'МІТКА РОЗДІЛУ' },
  'A HEADLINE FOR THIS BAND': { ru: 'ЗАГОЛОВОК ЭТОГО БЛОКА', uk: 'ЗАГОЛОВОК ЦЬОГО БЛОКУ' },
  'A short paragraph that supports the headline above.': {
    ru: 'Короткий абзац, который поддерживает заголовок выше.',
    uk: 'Короткий абзац, що підтримує заголовок вище.',
  },
  'VIEW ALL PRODUCTS': { ru: 'СМОТРЕТЬ ВСЕ ТОВАРЫ', uk: 'ДИВИТИСЯ ВСІ ТОВАРИ' },
  'HOW IT WORKS': { ru: 'КАК ЭТО РАБОТАЕТ', uk: 'ЯК ЦЕ ПРАЦЮЄ' },
  ...Object.fromEntries(
    numbered(3).map((n) => [`STEP ${n}`, { ru: `ШАГ ${n}`, uk: `КРОК ${n}` }]),
  ),
  'A short caption for this step': {
    ru: 'Короткая подпись к этому шагу',
    uk: 'Короткий підпис до цього кроку',
  },
  'A SECOND HEADLINE': { ru: 'ВТОРОЙ ЗАГОЛОВОК', uk: 'ДРУГИЙ ЗАГОЛОВОК' },
  'A short sentence for this band.': {
    ru: 'Короткое предложение для этого блока.',
    uk: 'Коротке речення для цього блоку.',
  },
  'EVERY DETAIL, ANSWERED': { ru: 'ОТВЕТЫ НА ВСЕ ВОПРОСЫ', uk: 'ВІДПОВІДІ НА ВСІ ЗАПИТАННЯ' },
  'A short paragraph introducing the questions below. Have a question you can’t find here? Our team is always ready to help.':
    {
      ru: 'Короткий абзац, который представляет вопросы ниже. Не нашли ответа на свой вопрос? Наша команда всегда готова помочь.',
      uk: 'Короткий абзац, що представляє запитання нижче. Не знайшли відповіді на своє запитання? Наша команда завжди готова допомогти.',
    },
  'CONTACT US': { ru: 'СВЯЖИТЕСЬ С НАМИ', uk: 'ЗВ’ЯЖІТЬСЯ З НАМИ' },

  // ---- the feature article -------------------------------------------------------------------------
  ...Object.fromEntries(
    numbered(4).flatMap((n) => [
      [`Chapter heading ${n}`, { ru: `Заголовок главы ${n}`, uk: `Заголовок розділу ${n}` }],
      [`Chapter ${n}`, { ru: `Глава ${n}`, uk: `Розділ ${n}` }],
    ]),
  ),
  'A short lede for this chapter': {
    ru: 'Короткий подзаголовок этой главы',
    uk: 'Короткий підзаголовок цього розділу',
  },
  'Another short lede for this chapter.': {
    ru: 'Ещё один короткий подзаголовок этой главы.',
    uk: 'Ще один короткий підзаголовок цього розділу.',
  },
  'This is placeholder text for an article section. Replace it with your own content in the admin panel.':
    {
      ru: 'Это текст-заполнитель для раздела статьи. Замените его своим содержимым в панели администратора.',
      uk: 'Це текст-заповнювач для розділу статті. Замініть його своїм вмістом у панелі адміністратора.',
    },
  'Use this paragraph to expand on the topic: add details, examples or anything your readers need to know.':
    {
      ru: 'Используйте этот абзац, чтобы раскрыть тему: добавьте подробности, примеры или всё, что нужно знать читателям.',
      uk: 'Використайте цей абзац, щоб розкрити тему: додайте подробиці, приклади або все, що потрібно знати читачам.',
    },
  'A short pull quote that stands out from the rest of the text.': {
    ru: 'Короткая цитата, которая выделяется на фоне остального текста.',
    uk: 'Коротка цитата, що вирізняється на тлі решти тексту.',
  },
  'A second paragraph can list the key points of the section, one after another.': {
    ru: 'Второй абзац может перечислить ключевые моменты раздела один за другим.',
    uk: 'Другий абзац може перелічити ключові моменти розділу один за одним.',
  },
  'A closing paragraph can sum up the article and point the reader to what to do next.': {
    ru: 'Заключительный абзац может подвести итог статьи и подсказать читателю, что делать дальше.',
    uk: 'Завершальний абзац може підсумувати статтю й підказати читачеві, що робити далі.',
  },

  // ---- policies: shared ----------------------------------------------------------------------------
  'This is a sample policy. Review it, adapt it to your business and replace it with your own text before the store opens.':
    {
      ru: 'Это пример политики. Проверьте его, адаптируйте под свой бизнес и замените своим текстом до открытия магазина.',
      uk: 'Це приклад політики. Перевірте його, адаптуйте до свого бізнесу та замініть своїм текстом до відкриття магазину.',
    },
  'Contact us': { ru: 'Свяжитесь с нами', uk: 'Зв’яжіться з нами' },

  // ---- policies: privacy ---------------------------------------------------------------------------
  'We respect your privacy and are committed to protecting the personal information you share with us. This policy explains what we collect, why we collect it, and what you can ask us to do with it.':
    {
      ru: 'Мы уважаем вашу конфиденциальность и стремимся защищать персональные данные, которыми вы с нами делитесь. Эта политика объясняет, что мы собираем, зачем и что вы можете попросить нас с этим сделать.',
      uk: 'Ми поважаємо вашу конфіденційність і прагнемо захищати персональні дані, якими ви з нами ділитеся. Ця політика пояснює, що ми збираємо, навіщо і що ви можете попросити нас із цим зробити.',
    },
  'Information we collect': { ru: 'Какие данные мы собираем', uk: 'Які дані ми збираємо' },
  'When you interact with our store, we may collect:': {
    ru: 'Когда вы взаимодействуете с нашим магазином, мы можем собирать:',
    uk: 'Коли ви взаємодієте з нашим магазином, ми можемо збирати:',
  },
  'Your name and contact details': {
    ru: 'Ваше имя и контактные данные',
    uk: 'Ваше ім’я та контактні дані',
  },
  'Your delivery and billing address': {
    ru: 'Ваш адрес доставки и платёжный адрес',
    uk: 'Вашу адресу доставки та платіжну адресу',
  },
  'Your order and enquiry history': {
    ru: 'Историю ваших заказов и запросов',
    uk: 'Історію ваших замовлень і запитів',
  },
  'Your account details, if you create an account': {
    ru: 'Данные вашей учётной записи, если вы её создадите',
    uk: 'Дані вашого облікового запису, якщо ви його створите',
  },
  'Messages you send us through the website or a messaging app': {
    ru: 'Сообщения, которые вы отправляете нам через сайт или мессенджер',
    uk: 'Повідомлення, які ви надсилаєте нам через сайт або месенджер',
  },
  'We only collect information that is necessary to answer you and to fulfil your order.': {
    ru: 'Мы собираем только те данные, которые нужны, чтобы ответить вам и выполнить ваш заказ.',
    uk: 'Ми збираємо лише ті дані, які потрібні, щоб відповісти вам і виконати ваше замовлення.',
  },
  'How we use your information': {
    ru: 'Как мы используем ваши данные',
    uk: 'Як ми використовуємо ваші дані',
  },
  'To process and fulfil your order': {
    ru: 'Чтобы обработать и выполнить ваш заказ',
    uk: 'Щоб обробити та виконати ваше замовлення',
  },
  'To answer your enquiries and provide customer support': {
    ru: 'Чтобы отвечать на ваши запросы и поддерживать вас',
    uk: 'Щоб відповідати на ваші запити та підтримувати вас',
  },
  'To manage your account, if you have one': {
    ru: 'Чтобы вести вашу учётную запись, если она у вас есть',
    uk: 'Щоб вести ваш обліковий запис, якщо він у вас є',
  },
  'To send you the offers you have asked to receive, and no others': {
    ru: 'Чтобы присылать вам только те предложения, которые вы просили получать',
    uk: 'Щоб надсилати вам лише ті пропозиції, які ви просили отримувати',
  },
  'To meet our legal and accounting obligations': {
    ru: 'Чтобы выполнять наши юридические и бухгалтерские обязательства',
    uk: 'Щоб виконувати наші юридичні та бухгалтерські зобов’язання',
  },
  'Payment information': { ru: 'Платёжные данные', uk: 'Платіжні дані' },
  'This website does not take payment. We do not collect, store, or process card details anywhere on this site.':
    {
      ru: 'Этот сайт не принимает оплату. Мы нигде на сайте не собираем, не храним и не обрабатываем данные карт.',
      uk: 'Цей сайт не приймає оплату. Ми ніде на сайті не збираємо, не зберігаємо й не обробляємо дані карток.',
    },
  'How we share your information': {
    ru: 'Кому мы передаём ваши данные',
    uk: 'Кому ми передаємо ваші дані',
  },
  'We do not sell your personal information. We share it only with the delivery and service providers needed to complete your order, and where the law requires it.':
    {
      ru: 'Мы не продаём ваши персональные данные. Мы передаём их только службам доставки и поставщикам услуг, без которых нельзя выполнить заказ, и там, где этого требует закон.',
      uk: 'Ми не продаємо ваші персональні дані. Ми передаємо їх лише службам доставки та постачальникам послуг, без яких не можна виконати замовлення, і там, де цього вимагає закон.',
    },
  'Your privacy rights': { ru: 'Ваши права', uk: 'Ваші права' },
  'You can ask us for a copy of the information we hold about you, ask us to correct it, or ask us to delete it. Contact us and we will act on your request.':
    {
      ru: 'Вы можете запросить копию данных, которые мы о вас храним, попросить исправить или удалить их. Свяжитесь с нами, и мы выполним ваш запрос.',
      uk: 'Ви можете запросити копію даних, які ми про вас зберігаємо, попросити виправити або видалити їх. Зв’яжіться з нами, і ми виконаємо ваш запит.',
    },
  Cookies: { ru: 'Файлы cookie', uk: 'Файли cookie' },
  'This website uses a small number of cookies that are necessary for it to work. Our Cookie Policy explains each one.':
    {
      ru: 'Этот сайт использует небольшое число файлов cookie, без которых он не работает. Каждый из них описан в нашей Политике cookie.',
      uk: 'Цей сайт використовує невелику кількість файлів cookie, без яких він не працює. Кожен із них описано в нашій Політиці cookie.',
    },
  'Changes to this policy': { ru: 'Изменения этой политики', uk: 'Зміни цієї політики' },
  'We may update this Privacy Policy from time to time. The latest version is always published on this page.':
    {
      ru: 'Мы можем время от времени обновлять эту Политику конфиденциальности. Актуальная версия всегда опубликована на этой странице.',
      uk: 'Ми можемо час від часу оновлювати цю Політику конфіденційності. Актуальна версія завжди опублікована на цій сторінці.',
    },
  'If you have questions about this Privacy Policy, or want to make a request about your information, please contact us using the details on our contact page.':
    {
      ru: 'Если у вас есть вопросы об этой Политике конфиденциальности или запрос о ваших данных, свяжитесь с нами по контактам на странице контактов.',
      uk: 'Якщо у вас є запитання щодо цієї Політики конфіденційності або запит щодо ваших даних, зв’яжіться з нами за контактами на сторінці контактів.',
    },

  // ---- policies: terms -----------------------------------------------------------------------------
  'These terms govern your access to and use of our website, our online services, our products, and their related features. By using our website, you agree to these terms.':
    {
      ru: 'Эти условия регулируют доступ к нашему сайту, онлайн-сервисам, товарам и связанным с ними функциям, а также их использование. Пользуясь сайтом, вы соглашаетесь с этими условиями.',
      uk: 'Ці умови регулюють доступ до нашого сайту, онлайн-сервісів, товарів і пов’язаних із ними функцій, а також їх використання. Користуючись сайтом, ви погоджуєтеся з цими умовами.',
    },
  'Use of our website': { ru: 'Использование сайта', uk: 'Використання сайту' },
  'You may use this website for lawful, personal, and non-commercial purposes. You agree not to misuse the website, interfere with its operation, or attempt unauthorised access.':
    {
      ru: 'Вы можете пользоваться сайтом в законных, личных и некоммерческих целях. Вы обязуетесь не злоупотреблять сайтом, не мешать его работе и не пытаться получить несанкционированный доступ.',
      uk: 'Ви можете користуватися сайтом у законних, особистих і некомерційних цілях. Ви зобов’язуєтеся не зловживати сайтом, не заважати його роботі й не намагатися отримати несанкціонований доступ.',
    },
  'Products and availability': { ru: 'Товары и наличие', uk: 'Товари та наявність' },
  'We make reasonable efforts to display our products accurately. Colours, proportions, dimensions, and appearance may vary slightly depending on your screen. All products are subject to availability, and we reserve the right to limit quantities.':
    {
      ru: 'Мы стараемся показывать наши товары точно. Цвета, пропорции, размеры и внешний вид могут немного отличаться в зависимости от экрана. Все товары предлагаются при наличии, и мы оставляем за собой право ограничивать количество.',
      uk: 'Ми намагаємося показувати наші товари точно. Кольори, пропорції, розміри та зовнішній вигляд можуть дещо відрізнятися залежно від екрана. Усі товари пропонуються за наявності, і ми залишаємо за собою право обмежувати кількість.',
    },
  Pricing: { ru: 'Цены', uk: 'Ціни' },
  'Prices are displayed on our website and may change without prior notice. We make reasonable efforts to ensure pricing and product information are accurate. If an error occurs, we reserve the right to correct it and to cancel any affected order.':
    {
      ru: 'Цены указаны на сайте и могут меняться без предварительного уведомления. Мы стараемся, чтобы цены и сведения о товарах были точными. Если произойдёт ошибка, мы оставляем за собой право исправить её и отменить затронутый заказ.',
      uk: 'Ціни вказано на сайті, і вони можуть змінюватися без попереднього повідомлення. Ми намагаємося, щоб ціни та відомості про товари були точними. Якщо станеться помилка, ми залишаємо за собою право виправити її та скасувати відповідне замовлення.',
    },
  'Enquiries and orders': { ru: 'Запросы и заказы', uk: 'Запити та замовлення' },
  'This website does not take payment. Enquiries and orders are completed with our team directly, and the terms of each order are confirmed with you before anything is agreed.':
    {
      ru: 'Этот сайт не принимает оплату. Запросы и заказы оформляются напрямую с нашей командой, и условия каждого заказа согласуются с вами заранее.',
      uk: 'Цей сайт не приймає оплату. Запити та замовлення оформлюються безпосередньо з нашою командою, і умови кожного замовлення погоджуються з вами заздалегідь.',
    },
  'Shipping and returns': { ru: 'Доставка и возврат', uk: 'Доставка та повернення' },
  'Delivery, exchanges, and returns are covered by our Shipping & Returns policy, which forms part of these terms.':
    {
      ru: 'Доставка, обмен и возврат регулируются нашей политикой «Доставка и возврат», которая является частью этих условий.',
      uk: 'Доставку, обмін і повернення регулює наша політика «Доставка та повернення», яка є частиною цих умов.',
    },
  'Intellectual property': { ru: 'Интеллектуальная собственность', uk: 'Інтелектуальна власність' },
  'All content on this website — including our name, branding, photographs, graphics, text, layouts, and other materials — is owned by or licensed to us and is protected by law.':
    {
      ru: 'Все материалы сайта — включая название, фирменный стиль, фотографии, графику, тексты, макеты и прочее — принадлежат нам или используются по лицензии и охраняются законом.',
      uk: 'Усі матеріали сайту — зокрема назва, фірмовий стиль, фотографії, графіка, тексти, макети тощо — належать нам або використовуються за ліцензією та охороняються законом.',
    },
  Accounts: { ru: 'Учётные записи', uk: 'Облікові записи' },
  'If you create an account, you are responsible for keeping your password confidential and for everything done through your account. Please contact us if you believe your account has been accessed without your authorisation.':
    {
      ru: 'Если вы создаёте учётную запись, вы отвечаете за сохранность пароля и за всё, что делается через вашу учётную запись. Свяжитесь с нами, если считаете, что в неё вошли без вашего разрешения.',
      uk: 'Якщо ви створюєте обліковий запис, ви відповідаєте за збереження пароля та за все, що робиться через ваш обліковий запис. Зв’яжіться з нами, якщо вважаєте, що до нього увійшли без вашого дозволу.',
    },
  'Limitation of liability': { ru: 'Ограничение ответственности', uk: 'Обмеження відповідальності' },
  'To the fullest extent permitted by applicable law, we are not liable for indirect, incidental, special, or consequential losses arising from the use of, or inability to use, our website or our products.':
    {
      ru: 'В максимальной степени, допустимой применимым правом, мы не несём ответственности за косвенные, случайные, особые или последующие убытки, связанные с использованием или невозможностью использования сайта или товаров.',
      uk: 'Наскільки це дозволяє чинне право, ми не несемо відповідальності за непрямі, випадкові, особливі чи подальші збитки, пов’язані з використанням або неможливістю використання сайту чи товарів.',
    },
  'Changes to these terms': { ru: 'Изменения условий', uk: 'Зміни умов' },
  'We may update these terms from time to time. Changes take effect when the revised version is published on our website, and your continued use of the website means you accept them.':
    {
      ru: 'Мы можем время от времени обновлять эти условия. Изменения вступают в силу с публикацией новой версии на сайте, а продолжение пользования сайтом означает ваше согласие с ними.',
      uk: 'Ми можемо час від часу оновлювати ці умови. Зміни набувають чинності з публікацією нової версії на сайті, а подальше користування сайтом означає вашу згоду з ними.',
    },
  'If you have questions about these terms, please contact us using the details on our contact page.':
    {
      ru: 'Если у вас есть вопросы об этих условиях, свяжитесь с нами по контактам на странице контактов.',
      uk: 'Якщо у вас є запитання щодо цих умов, зв’яжіться з нами за контактами на сторінці контактів.',
    },

  // ---- policies: cookies ---------------------------------------------------------------------------
  'This Cookie Policy explains how we use cookies when you visit our website. It is short because our use of cookies is small.':
    {
      ru: 'Эта Политика cookie объясняет, как мы используем файлы cookie, когда вы посещаете наш сайт. Она короткая, потому что cookie у нас мало.',
      uk: 'Ця Політика cookie пояснює, як ми використовуємо файли cookie, коли ви відвідуєте наш сайт. Вона коротка, бо cookie у нас мало.',
    },
  'What are cookies?': { ru: 'Что такое cookie?', uk: 'Що таке cookie?' },
  'Cookies are small text files stored on your device when you visit a website. They allow a website to remember things about your visit, such as what you have put in your bag or that you are signed in.':
    {
      ru: 'Cookie — это небольшие текстовые файлы, которые сохраняются на вашем устройстве при посещении сайта. Они позволяют сайту запомнить что-то о вашем визите — например, что лежит в корзине или что вы вошли в систему.',
      uk: 'Cookie — це невеликі текстові файли, що зберігаються на вашому пристрої під час відвідування сайту. Вони дозволяють сайту запам’ятати щось про ваш візит — наприклад, що лежить у кошику або що ви увійшли в систему.',
    },
  'We do not use analytics or advertising cookies': {
    ru: 'Мы не используем аналитические и рекламные cookie',
    uk: 'Ми не використовуємо аналітичні та рекламні cookie',
  },
  'This website does not use Google Analytics or any other analytics service. We do not use advertising cookies, tracking pixels, or social media trackers, and we do not share your browsing behaviour with any third party. No third-party script runs on this website.':
    {
      ru: 'Этот сайт не использует Google Analytics или другие сервисы аналитики. Мы не используем рекламные cookie, пиксели отслеживания или трекеры соцсетей и не передаём данные о ваших действиях третьим лицам. На сайте не работает ни один сторонний скрипт.',
      uk: 'Цей сайт не використовує Google Analytics чи інші сервіси аналітики. Ми не використовуємо рекламні cookie, пікселі відстеження чи трекери соцмереж і не передаємо дані про ваші дії третім особам. На сайті не працює жоден сторонній скрипт.',
    },
  'The cookies we do use': { ru: 'Какие cookie мы используем', uk: 'Які cookie ми використовуємо' },
  'Every cookie this website sets is strictly necessary — the site cannot do what you asked of it without them:':
    {
      ru: 'Каждый cookie, который устанавливает этот сайт, строго необходим — без них сайт не сможет сделать то, о чём вы его просите:',
      uk: 'Кожен cookie, який встановлює цей сайт, суворо необхідний — без них сайт не зможе зробити те, про що ви його просите:',
    },
  'A session cookie, set when you sign in, which keeps you signed in as you move between pages. It is removed when you sign out.':
    {
      ru: 'Cookie сеанса: устанавливается при входе и сохраняет вход при переходе между страницами. Удаляется при выходе.',
      uk: 'Cookie сеансу: встановлюється під час входу та зберігає вхід під час переходу між сторінками. Видаляється під час виходу.',
    },
  'A shopping bag cookie, which is how the website knows which bag is yours so you can come back to it later. It expires after 30 days.':
    {
      ru: 'Cookie корзины: по нему сайт узнаёт вашу корзину, чтобы вы могли вернуться к ней позже. Срок действия — 30 дней.',
      uk: 'Cookie кошика: за ним сайт впізнає ваш кошик, щоб ви могли повернутися до нього пізніше. Термін дії — 30 днів.',
    },
  'A shopping bag count, which is the number shown on the bag icon in the header. It holds no personal information.':
    {
      ru: 'Счётчик корзины: число на значке корзины в шапке сайта. Не содержит персональных данных.',
      uk: 'Лічильник кошика: число на значку кошика в шапці сайту. Не містить персональних даних.',
    },
  'A consent cookie, which records the choice you made about cookies so that you are not asked again. It expires after 180 days.':
    {
      ru: 'Cookie согласия: запоминает ваш выбор относительно cookie, чтобы не спрашивать снова. Срок действия — 180 дней.',
      uk: 'Cookie згоди: запам’ятовує ваш вибір щодо cookie, щоб не питати знову. Термін дії — 180 днів.',
    },
  'Managing cookies': { ru: 'Управление cookie', uk: 'Керування cookie' },
  'You can review or change your choice at any time using the cookie settings link in the footer of every page. You can also delete cookies through your browser settings — though if you remove the ones above, the website may not remember your bag or keep you signed in.':
    {
      ru: 'Вы можете в любой момент проверить или изменить свой выбор по ссылке настроек cookie в подвале каждой страницы. Также cookie можно удалить в настройках браузера — но без перечисленных выше сайт может не запомнить корзину или вход.',
      uk: 'Ви можете будь-коли переглянути або змінити свій вибір за посиланням налаштувань cookie в підвалі кожної сторінки. Також cookie можна видалити в налаштуваннях браузера — але без перелічених вище сайт може не запам’ятати кошик або вхід.',
    },
  'If this changes': { ru: 'Если что-то изменится', uk: 'Якщо щось зміниться' },
  'If we ever introduce analytics or any other optional cookie, it will appear in the cookie chooser switched off, this page will describe it, and we will ask you again before it is used.':
    {
      ru: 'Если мы когда-нибудь добавим аналитику или другой необязательный cookie, он появится в настройках выключенным, эта страница его опишет, и мы снова спросим вас перед его использованием.',
      uk: 'Якщо ми колись додамо аналітику чи інший необов’язковий cookie, він з’явиться в налаштуваннях вимкненим, ця сторінка його опише, і ми знову запитаємо вас перед його використанням.',
    },
  'If you have questions about our use of cookies, please contact us using the details on our contact page.':
    {
      ru: 'Если у вас есть вопросы о том, как мы используем cookie, свяжитесь с нами по контактам на странице контактов.',
      uk: 'Якщо у вас є запитання щодо того, як ми використовуємо cookie, зв’яжіться з нами за контактами на сторінці контактів.',
    },

  // ---- policies: shipping --------------------------------------------------------------------------
  'Shipping policy': { ru: 'Условия доставки', uk: 'Умови доставки' },
  'We work with trusted delivery partners to make sure your order arrives safely. Describe your shipping costs and the regions you deliver to here.':
    {
      ru: 'Мы работаем с надёжными службами доставки, чтобы ваш заказ прибыл в целости. Опишите здесь стоимость доставки и регионы, куда вы доставляете.',
      uk: 'Ми працюємо з надійними службами доставки, щоб ваше замовлення прибуло неушкодженим. Опишіть тут вартість доставки та регіони, куди ви доставляєте.',
    },
  'Describe how your parcels are tracked and insured, and whether a signature is required on delivery.':
    {
      ru: 'Опишите, как отслеживаются и страхуются посылки и нужна ли подпись при получении.',
      uk: 'Опишіть, як відстежуються та страхуються посилки і чи потрібен підпис під час отримання.',
    },
  'Products in stock are delivered within 3 to 7 business days. Products made to order are dispatched within 25 business days.':
    {
      ru: 'Товары в наличии доставляются за 3–7 рабочих дней. Товары на заказ отправляются в течение 25 рабочих дней.',
      uk: 'Товари в наявності доставляються за 3–7 робочих днів. Товари на замовлення відправляються протягом 25 робочих днів.',
    },
  'Return policy': { ru: 'Условия возврата', uk: 'Умови повернення' },
  'Exchanges or refunds are offered within 30 days of receiving your order.': {
    ru: 'Обмен или возврат средств возможен в течение 30 дней после получения заказа.',
    uk: 'Обмін або повернення коштів можливі протягом 30 днів після отримання замовлення.',
  },
  Exchanges: { ru: 'Обмен', uk: 'Обмін' },
  'Exchanges are available for an item of equal or greater value. To proceed with an exchange, please contact us.':
    {
      ru: 'Обмен возможен на товар равной или большей стоимости. Чтобы оформить обмен, свяжитесь с нами.',
      uk: 'Обмін можливий на товар рівної або більшої вартості. Щоб оформити обмін, зв’яжіться з нами.',
    },
  Refunds: { ru: 'Возврат средств', uk: 'Повернення коштів' },
  'Refunds are available to the original purchaser and are issued to the payment method used for the initial purchase. Processing may take up to 14 days from receipt of the returned product.':
    {
      ru: 'Средства возвращаются первоначальному покупателю тем же способом, которым была произведена оплата. Обработка может занять до 14 дней с момента получения возвращённого товара.',
      uk: 'Кошти повертаються початковому покупцеві тим самим способом, яким було здійснено оплату. Обробка може тривати до 14 днів з моменту отримання поверненого товару.',
    },
  Conditions: { ru: 'Условия', uk: 'Умови' },
  'Items must be returned in perfect condition, in their original packaging, along with the receipt and all accessories. No exchanges or refunds are accepted for personalised products.':
    {
      ru: 'Товары должны быть возвращены в идеальном состоянии, в оригинальной упаковке, с чеком и всеми комплектующими. Персонализированные товары обмену и возврату не подлежат.',
      uk: 'Товари мають бути повернені в ідеальному стані, в оригінальному пакуванні, з чеком і всіма комплектуючими. Персоналізовані товари обміну та поверненню не підлягають.',
    },
}
