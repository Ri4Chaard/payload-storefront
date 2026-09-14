/**
 * The Russian and Ukrainian words the seed writes (spec 010, T110).
 *
 * **Separate from `seed-translations.ts` on purpose.** That file is the mechanism — find each
 * document, write each locale, stay idempotent — and this one is the content. Keeping them apart
 * means a translator can be handed a single file with no code in it, and means the apply loop stays
 * short enough to read in one screen.
 *
 * **Keyed by slug, never by id.** Ids differ between every database this runs against; a slug is the
 * same thing the English seed uses to find a document, so the two files agree by construction.
 *
 * **What is deliberately NOT here: the legal bodies.** `policies` gets its title and subtitle
 * translated and a short, plainly-marked placeholder paragraph for its body. A privacy policy is a
 * legal document, and a seed script inventing 1,600 words of Russian legal prose would produce
 * something that looks authoritative and is not — the worst possible failure for that particular
 * page. The owner writes those, in the admin, like the English ones.
 */

export type Pair = { ru: string; uk: string }

/** `{ en: { ru, uk } }` for a single field. */
export type Translated<T extends string> = Record<string, Record<'ru' | 'uk', Record<T, string>>>

export const CATEGORIES: Translated<'subtitle' | 'title'> = {
  rings: {
    ru: { title: 'Кольца с бриллиантами', subtitle: 'Вечное сияние для любого момента' },
    uk: { title: 'Каблучки з діамантами', subtitle: 'Вічне сяйво для будь-якої миті' },
  },
  bracelets: {
    ru: { title: 'Браслеты с бриллиантами', subtitle: 'Вечное сияние для любого момента' },
    uk: { title: 'Браслети з діамантами', subtitle: 'Вічне сяйво для будь-якої миті' },
  },
  earrings: {
    ru: { title: 'Серьги с бриллиантами', subtitle: 'Вечное сияние для любого момента' },
    uk: { title: 'Сережки з діамантами', subtitle: 'Вічне сяйво для будь-якої миті' },
  },
  necklaces: {
    ru: { title: 'Колье с бриллиантами', subtitle: 'Вечное сияние для любого момента' },
    uk: { title: 'Намиста з діамантами', subtitle: 'Вічне сяйво для будь-якої миті' },
  },
}

/**
 * The four collections keep their names in every language.
 *
 * Deia, Marvel, Molten and Spartan are proper names rather than descriptions — transliterating them
 * would invent four products that do not exist. They are listed so the file is a complete record of
 * what was considered, rather than leaving a reader to wonder whether they were missed.
 */
export const COLLECTIONS: Translated<'title'> = {
  deia: { ru: { title: 'Deia' }, uk: { title: 'Deia' } },
  marvel: { ru: { title: 'Marvel' }, uk: { title: 'Marvel' } },
  molten: { ru: { title: 'Molten' }, uk: { title: 'Molten' } },
  spartan: { ru: { title: 'Spartan' }, uk: { title: 'Spartan' } },
}

export const ARTICLE_CATEGORIES: Translated<'title'> = {
  diamonds: { ru: { title: 'Бриллианты' }, uk: { title: 'Діаманти' } },
  guides: { ru: { title: 'Руководства' }, uk: { title: 'Посібники' } },
  jewelry: { ru: { title: 'Украшения' }, uk: { title: 'Прикраси' } },
  stories: { ru: { title: 'Истории' }, uk: { title: 'Історії' } },
}

/** Keyed by the attribute's `name`, which is what the English seed calls it. */
export const ATTRIBUTES: Translated<'label'> = {
  metal: { ru: { label: 'Металл' }, uk: { label: 'Метал' } },
  'carat-weight': { ru: { label: 'Вес в каратах' }, uk: { label: 'Вага в каратах' } },
  provenance: { ru: { label: 'Происхождение' }, uk: { label: 'Походження' } },
}

/**
 * The catalogue.
 *
 * Twenty-five of these share one English description — "…, made to order in our atelier" — and
 * they share one translated description too. That repetition is the English seed's, not an
 * abbreviation introduced here: a translation that varied where the original does not would make the
 * Russian site look more finished than the English one.
 */
export const PRODUCTS: Translated<'description' | 'title'> = {
  'pave-butterfly-diamond-bracelet': {
    ru: {
      title: 'Браслет «Бабочка» с бриллиантовым паве',
      description: 'Бабочки в бриллиантовом паве на гибком браслете.',
    },
    uk: {
      title: 'Браслет «Метелик» з діамантовим паве',
      description: 'Метелики в діамантовому паве на гнучкому браслеті.',
    },
  },
  'butterfly-diamond-pendant': {
    ru: {
      title: 'Подвеска «Бабочка» с бриллиантами',
      description: 'Одна бабочка в бриллиантовом паве на тонкой цепочке.',
    },
    uk: {
      title: 'Підвіска «Метелик» з діамантами',
      description: 'Один метелик у діамантовому паве на тонкому ланцюжку.',
    },
  },
  'butterfly-ruby-pink-sapphire-diamond-ear-climbers': {
    ru: {
      title: 'Серьги-климберы «Бабочка» с рубинами, розовыми сапфирами и бриллиантами',
      description:
        'Рубины и розовые сапфиры поднимаются вдоль уха в оправе в форме летящей бабочки.',
    },
    uk: {
      title: 'Сережки-кліммери «Метелик» з рубінами, рожевими сапфірами та діамантами',
      description: 'Рубіни та рожеві сапфіри піднімаються вздовж вуха в оправі летючого метелика.',
    },
  },
  'butterfly-ruby-pink-sapphire-diamond-mini-pendant': {
    ru: {
      title: 'Мини-подвеска «Бабочка» с рубинами, розовыми сапфирами и бриллиантами',
      description: 'Бабочка в самом малом размере — рубин и розовый сапфир.',
    },
    uk: {
      title: 'Міні-підвіска «Метелик» з рубінами, рожевими сапфірами та діамантами',
      description: 'Метелик у найменшому розмірі — рубін і рожевий сапфір.',
    },
  },
  'paragon-emerald-cut-diamond-engagement-ring': {
    ru: {
      title: 'Помолвочное кольцо Paragon с бриллиантом изумрудной огранки',
      description:
        'Доступно в разном весе камней; каждый камень закрепляется вручную. Размер, вес в каратах и количество камней слегка отличаются от кольца к кольцу.',
    },
    uk: {
      title: 'Заручинова каблучка Paragon з діамантом смарагдової огранки',
      description:
        'Доступна в різній вазі каменів; кожен камінь закріплюється вручну. Розмір, вага в каратах і кількість каменів дещо відрізняються від каблучки до каблучки.',
    },
  },
  'unreleased-spartan-cuff': {
    ru: { title: 'Неанонсированный браслет Spartan', description: 'Ещё не анонсировано.' },
    uk: { title: 'Неанонсований браслет Spartan', description: 'Ще не анонсовано.' },
  },
  'zolotoe-kolco-s-brilliantom': {
    ru: {
      title: 'Золотое кольцо с бриллиантом',
      description: 'Кольцо из белого золота с бриллиантом огранки «принцесса».',
    },
    uk: {
      title: 'Золота каблучка з діамантом',
      description: 'Каблучка з білого золота з діамантом огранки «принцеса».',
    },
  },
}

/**
 * The twenty-four pieces whose English description is their own title followed by one fixed phrase.
 *
 * Only the titles are written out. The description is composed from the title the same way the
 * English seed composes it — `"${title}, made to order in our atelier."` — because writing the
 * same sentence twenty-four times in two languages is twenty-four chances to let one of them drift.
 */
const MADE_TO_ORDER: Record<string, Pair> = {
  'halo-solitaire-ring': { ru: 'Кольцо-солитер с ореолом', uk: 'Каблучка-солітер з ореолом' },
  'baguette-eternity-band': {
    ru: 'Кольцо вечности с багетами',
    uk: 'Каблучка вічності з багетами',
  },
  'marquise-cluster-ring': {
    ru: 'Кольцо-кластер с маркизами',
    uk: 'Каблучка-кластер з маркізами',
  },
  'princess-cut-signet-ring': {
    ru: 'Перстень с бриллиантом огранки «принцесса»',
    uk: 'Перстень з діамантом огранки «принцеса»',
  },
  'oval-trilogy-ring': {
    ru: 'Кольцо-трилогия с овальными бриллиантами',
    uk: 'Каблучка-трилогія з овальними діамантами',
  },
  'cushion-halo-ring': {
    ru: 'Кольцо с ореолом и бриллиантом огранки «кушон»',
    uk: 'Каблучка з ореолом і діамантом огранки «кушон»',
  },
  'twisted-pave-ring': { ru: 'Витое кольцо с паве', uk: 'Кручена каблучка з паве' },
  'tennis-bracelet': { ru: 'Теннисный браслет', uk: 'Тенісний браслет' },
  'bezel-link-bracelet': {
    ru: 'Браслет со звеньями в глухой закрепке',
    uk: 'Браслет із ланками в глухій закріпці',
  },
  'pear-drop-bracelet': {
    ru: 'Браслет с каплевидными бриллиантами',
    uk: 'Браслет із краплеподібними діамантами',
  },
  'emerald-bar-bracelet': {
    ru: 'Браслет с бриллиантами изумрудной огранки',
    uk: 'Браслет із діамантами смарагдової огранки',
  },
  'open-cuff-bracelet': { ru: 'Открытый браслет-кафф', uk: 'Відкритий браслет-каф' },
  'round-stud-earrings': {
    ru: 'Серьги-пусеты с круглыми бриллиантами',
    uk: 'Сережки-пусети з круглими діамантами',
  },
  'baguette-huggie-earrings': { ru: 'Серьги-хаггис с багетами', uk: 'Сережки-хаггі з багетами' },
  'oval-drop-earrings': {
    ru: 'Серьги-подвески с овальными бриллиантами',
    uk: 'Сережки-підвіски з овальними діамантами',
  },
  'marquise-threader-earrings': {
    ru: 'Серьги-протяжки с маркизами',
    uk: 'Сережки-протяжки з маркізами',
  },
  'princess-halo-earrings': {
    ru: 'Серьги с ореолом и огранкой «принцесса»',
    uk: 'Сережки з ореолом і огранкою «принцеса»',
  },
  'double-hoop-earrings': { ru: 'Двойные серьги-кольца', uk: 'Подвійні сережки-кільця' },
  'solitaire-necklace': { ru: 'Колье-солитер', uk: 'Намисто-солітер' },
  'riviera-necklace': { ru: 'Колье «Ривьера»', uk: 'Намисто «Рив’єра»' },
  'pear-pendant-necklace': {
    ru: 'Колье с каплевидной подвеской',
    uk: 'Намисто з краплеподібною підвіскою',
  },
  'baguette-bar-necklace': {
    ru: 'Колье с планкой из багетов',
    uk: 'Намисто з планкою з багетів',
  },
  'emerald-station-necklace': {
    ru: 'Колье с бриллиантами изумрудной огранки',
    uk: 'Намисто з діамантами смарагдової огранки',
  },
  'layered-chain-necklace': {
    ru: 'Многослойное колье-цепочка',
    uk: 'Багатошарове намисто-ланцюжок',
  },
}

const MADE_TO_ORDER_SUFFIX: Pair = {
  ru: 'изготавливается на заказ в нашей мастерской.',
  uk: 'виготовляється на замовлення в нашій майстерні.',
}

for (const [slug, title] of Object.entries(MADE_TO_ORDER)) {
  PRODUCTS[slug] = {
    ru: { title: title.ru, description: `${title.ru}, ${MADE_TO_ORDER_SUFFIX.ru}` },
    uk: { title: title.uk, description: `${title.uk}, ${MADE_TO_ORDER_SUFFIX.uk}` },
  }
}

/** The blog's seven articles — card and header only; chapter bodies fall back (see below). */
export const ARTICLES: Translated<'standfirst' | 'title'> = {
  'how-to-choose-the-perfect-diamond': {
    ru: {
      title: 'Как выбрать идеальный бриллиант: огранка, чистота, цвет и караты',
      standfirst:
        'Что отличает исключительный бриллиант и как выбрать камень, в котором сходятся красота, игра света и характер.',
    },
    uk: {
      title: 'Як обрати ідеальний діамант: огранка, чистота, колір і карати',
      standfirst:
        'Що вирізняє винятковий діамант і як обрати камінь, у якому сходяться краса, гра світла та характер.',
    },
  },
  'lab-grown-diamonds-beauty-reimagined': {
    ru: {
      title: 'Выращенные бриллианты: красота заново',
      standfirst:
        'Выращены, а не добыты, и одинаковы во всём, что имеет значение. Что такое выращенный камень — и чем он не является.',
    },
    uk: {
      title: 'Вирощені діаманти: краса наново',
      standfirst:
        'Вирощені, а не видобуті, й однакові в усьому, що має значення. Що таке вирощений камінь — і чим він не є.',
    },
  },
  'the-art-of-choosing-the-perfect-diamond': {
    ru: {
      title: 'Искусство выбора идеального бриллианта',
      standfirst:
        'Пропорции, симметрия и свет. Почему два камня одинакового веса могут выглядеть совершенно по-разному.',
    },
    uk: {
      title: 'Мистецтво вибору ідеального діаманта',
      standfirst:
        'Пропорції, симетрія та світло. Чому два камені однакової ваги можуть виглядати зовсім по-різному.',
    },
  },
  'a-guide-to-diamond-shapes': {
    ru: {
      title: 'Путеводитель по формам огранки',
      standfirst:
        'Круг, овал, изумруд, груша. Что каждая форма делает со светом и кому какая идёт.',
    },
    uk: {
      title: 'Путівник формами огранки',
      standfirst: 'Круг, овал, смарагд, груша. Що кожна форма робить зі світлом і кому яка личить.',
    },
  },
  'reading-a-diamond-certificate': {
    ru: {
      title: 'Как читать сертификат на бриллиант',
      standfirst:
        'К каждому камню прилагаются документы. Вот что на самом деле означает каждая их строка.',
    },
    uk: {
      title: 'Як читати сертифікат на діамант',
      standfirst:
        'До кожного каменя додаються документи. Ось що насправді означає кожен їхній рядок.',
    },
  },
  'behind-the-craftsmanship-hand-set-pave': {
    ru: {
      title: 'Изнанка мастерства: паве, закреплённое вручную',
      standfirst:
        'Шестьдесят камней, один закрепщик и неделя работы. Внутри самой медленной части создания кольца.',
    },
    uk: {
      title: 'Виворіт майстерності: паве, закріплене вручну',
      standfirst:
        'Шістдесят каменів, один закріплювач і тиждень роботи. Усередині найповільнішої частини створення каблучки.',
    },
  },
  'the-pieces-that-mark-a-moment': {
    ru: {
      title: 'Украшения, которые отмечают момент',
      standfirst:
        'Помолвки, годовщины и поводы потише. Что люди покупают на самом деле — и почему.',
    },
    uk: {
      title: 'Прикраси, що відзначають мить',
      standfirst:
        'Заручини, річниці та тихіші приводи. Що люди купують насправді — і чому.',
    },
  },
}

/** Photograph descriptions, keyed by filename — the one field on `media` that carries words. */
export const MEDIA: Record<string, Pair> = {
  'product-bracelet.webp': {
    ru: 'Браслет «Бабочка» с бриллиантовым паве',
    uk: 'Браслет «Метелик» з діамантовим паве',
  },
  'product-ear-climbers.webp': {
    ru: 'Серьги-климберы «Бабочка» с рубинами, розовыми сапфирами и бриллиантами',
    uk: 'Сережки-кліммери «Метелик» з рубінами, рожевими сапфірами та діамантами',
  },
  'product-pendant.webp': {
    ru: 'Подвеска «Бабочка» с бриллиантами',
    uk: 'Підвіска «Метелик» з діамантами',
  },
  'product-mini-pendant.webp': {
    ru: 'Мини-подвеска «Бабочка» с рубинами, розовыми сапфирами и бриллиантами',
    uk: 'Міні-підвіска «Метелик» з рубінами, рожевими сапфірами та діамантами',
  },
  'product-ring-packshot.webp': {
    ru: 'Помолвочное кольцо Paragon с бриллиантом изумрудной огранки',
    uk: 'Заручинова каблучка Paragon з діамантом смарагдової огранки',
  },
  'product-ring-jacket.webp': {
    ru: 'Кольцо на руке, на фоне коричневого жакета',
    uk: 'Каблучка на руці, на тлі коричневого жакета',
  },
  'product-ring-arm.webp': {
    ru: 'Кольцо на руке, скрещённой на чёрном верхе',
    uk: 'Каблучка на руці, схрещеній на чорному верху',
  },
  'product-ring-portrait.webp': {
    ru: 'Кольцо на руке, поднятой к лицу',
    uk: 'Каблучка на руці, піднятій до обличчя',
  },
  'product-ring-denim.webp': {
    ru: 'Кольцо в наборе с другими, рука на джинсовой ткани',
    uk: 'Каблучка в наборі з іншими, рука на джинсовій тканині',
  },
  'category-rings.webp': {
    ru: 'Рука с бриллиантовым кольцом',
    uk: 'Рука з діамантовою каблучкою',
  },
  'category-bracelets.webp': {
    ru: 'Бриллиантовый браслет на запястье',
    uk: 'Діамантовий браслет на зап’ясті',
  },
  'category-earrings.webp': { ru: 'Бриллиантовые серьги', uk: 'Діамантові сережки' },
  'category-necklaces.webp': { ru: 'Бриллиантовое колье', uk: 'Діамантове намисто' },
  'story-opening-plate.webp': {
    ru: 'Кольцо-солитер на красном шёлке',
    uk: 'Каблучка-солітер на червоному шовку',
  },
  'story-closer-look.webp': {
    ru: 'Колье-ошейник с бриллиантами и рубинами',
    uk: 'Намисто-чокер з діамантами та рубінами',
  },
  'story-standard-banner.webp': {
    ru: 'Бриллиант круглой огранки в пинцете',
    uk: 'Діамант круглої огранки в пінцеті',
  },
  'story-crafted-to-last.webp': {
    ru: 'Подвеска и кольцо, надетые вместе',
    uk: 'Підвіска й каблучка, вдягнені разом',
  },
  '2026-09-10 14.36.18.mp4': {
    ru: 'Россыпь бриллиантов, разбираемая пинцетом',
    uk: 'Розсип діамантів, що розбирається пінцетом',
  },
  'story-step-2-craft.webp': {
    ru: 'Ювелир закрепляет камень вручную',
    uk: 'Ювелір закріплює камінь вручну',
  },
  'story-step-3-create.webp': {
    ru: 'Готовое кольцо с ореолом на красном шёлке',
    uk: 'Готова каблучка з ореолом на червоному шовку',
  },
  'slot-1.mp4': { ru: 'Ювелир закрепляет камень', uk: 'Ювелір закріплює камінь' },
  'poster.png': { ru: 'Ювелир за верстаком', uk: 'Ювелір за верстатом' },
  'blog-rings-on-linen.webp': {
    ru: 'Пять бриллиантовых колец на льне',
    uk: 'П’ять діамантових каблучок на льоні',
  },
  'blog-rings-on-blocks.webp': {
    ru: 'Три бриллиантовых кольца на бледно-голубых и розовых блоках',
    uk: 'Три діамантові каблучки на блідо-блакитних і рожевих блоках',
  },
  'blog-diamond-under-glass.webp': {
    ru: 'Бриллиант под увеличительным стеклом',
    uk: 'Діамант під збільшувальним склом',
  },
  'blog-halo-ring-in-hand.webp': {
    ru: 'Кольцо с ореолом в кончиках пальцев',
    uk: 'Каблучка з ореолом у кінчиках пальців',
  },
  'blog-coloured-gemstones.webp': {
    ru: 'Цветные драгоценные камни на сером фоне',
    uk: 'Кольорові дорогоцінні камені на сірому тлі',
  },
  'blog-bracelet-worn.webp': {
    ru: 'Бриллиантовый браслет на поднятом запястье',
    uk: 'Діамантовий браслет на піднятому зап’ясті',
  },
  'blog-ring-at-dusk.webp': {
    ru: 'Кольцо-солитер на столе на фоне города в сумерках',
    uk: 'Каблучка-солітер на столі на тлі міста в сутінках',
  },
  'blog-diamond-in-tweezers.webp': {
    ru: 'Овальный бриллиант в пинцете над красным бархатом',
    uk: 'Овальний діамант у пінцеті над червоним оксамитом',
  },
  'contact-send-us-a-message.webp': {
    ru: 'Бриллиантовое колье и серьги в раскрытом футляре',
    uk: 'Діамантове намисто та сережки у розкритому футлярі',
  },
}

/**
 * The FAQ, keyed by the English question — `questions` has no slug, and the English wording is what
 * the seed writes, so it is the only stable handle this file can hold.
 *
 * `answer` is one paragraph everywhere, so it is stored as a plain string and wrapped in Lexical's
 * shape by the apply script rather than being written out as a node tree twelve times.
 */
export const QUESTIONS: Translated<'answer' | 'question'> = {
  'Do you ship internationally?': {
    ru: {
      question: 'Вы доставляете за границу?',
      answer:
        'Да, мы доставляем по всему миру. Стоимость доставки рассчитывается и добавляется при оформлении заказа.',
    },
    uk: {
      question: 'Ви доставляєте за кордон?',
      answer:
        'Так, ми доставляємо по всьому світу. Вартість доставки розраховується й додається під час оформлення замовлення.',
    },
  },
  'How long will my order take?': {
    ru: {
      question: 'Сколько будет идти мой заказ?',
      answer:
        'Готовые изделия отправляются в течение двух рабочих дней. Изделия на заказ занимают от трёх до четырёх недель.',
    },
    uk: {
      question: 'Скільки триватиме моє замовлення?',
      answer:
        'Готові вироби відправляються протягом двох робочих днів. Вироби на замовлення потребують від трьох до чотирьох тижнів.',
    },
  },
  'Are your diamonds certified?': {
    ru: {
      question: 'Ваши бриллианты сертифицированы?',
      answer: 'Каждый камень проходит независимую оценку и поставляется с сертификатом.',
    },
    uk: {
      question: 'Ваші діаманти сертифіковані?',
      answer: 'Кожен камінь проходить незалежну оцінку й постачається із сертифікатом.',
    },
  },
  'What are lab-grown diamonds?': {
    ru: {
      question: 'Что такое выращенные бриллианты?',
      answer:
        'Они химически, физически и оптически идентичны добытым бриллиантам — выращены, а не извлечены из земли.',
    },
    uk: {
      question: 'Що таке вирощені діаманти?',
      answer:
        'Вони хімічно, фізично та оптично ідентичні видобутим діамантам — вирощені, а не видобуті із землі.',
    },
  },
  'Can I return or exchange my order?': {
    ru: {
      question: 'Можно ли вернуть или обменять заказ?',
      answer:
        'Возврат бесплатен в течение тридцати дней — в первоначальном состоянии и с документами, с которыми изделие пришло.',
    },
    uk: {
      question: 'Чи можна повернути або обміняти замовлення?',
      answer:
        'Повернення безкоштовне протягом тридцяти днів — у первісному стані та з документами, з якими виріб надійшов.',
    },
  },
  'How should I care for my jewelry?': {
    ru: {
      question: 'Как ухаживать за украшениями?',
      answer:
        'Тёплая вода, капля мягкого мыла и мягкая щётка. Мы с радостью почистим и проверим любое изделие за вас.',
    },
    uk: {
      question: 'Як доглядати за прикрасами?',
      answer:
        'Тепла вода, крапля м’якого мила та м’яка щітка. Ми з радістю почистимо й перевіримо будь-який виріб для вас.',
    },
  },
}

/**
 * The policies — **title and subtitle only. The bodies fall back to English on purpose.**
 *
 * See this file's header. A placeholder paragraph was tried first and is worse than the fallback in
 * the one place it matters most: it replaces the legal text a visitor came to read with a note about
 * its absence. Falling back leaves them able to read the terms.
 */
export const POLICIES: Translated<'subtitle' | 'title'> = {
  privacy: {
    ru: { title: 'ПОЛИТИКА КОНФИДЕНЦИАЛЬНОСТИ', subtitle: 'Обновлено: август 2026' },
    uk: { title: 'ПОЛІТИКА КОНФІДЕНЦІЙНОСТІ', subtitle: 'Оновлено: серпень 2026' },
  },
  terms: {
    ru: { title: 'УСЛОВИЯ И ПОЛОЖЕНИЯ', subtitle: 'Обновлено: август 2026' },
    uk: { title: 'УМОВИ ТА ПОЛОЖЕННЯ', subtitle: 'Оновлено: серпень 2026' },
  },
  shipping: {
    ru: { title: 'ДОСТАВКА И ВОЗВРАТ', subtitle: 'Застрахованная доставка по всему миру' },
    uk: { title: 'ДОСТАВКА ТА ПОВЕРНЕННЯ', subtitle: 'Застрахована доставка по всьому світу' },
  },
  cookies: {
    ru: { title: 'ПОЛИТИКА COOKIE', subtitle: 'Обновлено: август 2026' },
    uk: { title: 'ПОЛІТИКА COOKIE', subtitle: 'Оновлено: серпень 2026' },
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
    detailsTitle: 'ОПИСАНИЕ ИЗДЕЛИЯ',
    warrantyTitle: 'ГАРАНТИЯ 3 ГОДА + БЕСПЛАТНЫЙ ВОЗВРАТ',
    deliveryTitle: 'ДОСТАВКА',
    listingSubtitle: 'Вечное сияние для любого момента',
    warranty: [
      'На каждое изделие действует трёхлетняя гарантия от производственных дефектов.',
      'Возврат бесплатен в течение тридцати дней, в первоначальном состоянии.',
    ],
    delivery: [
      'Застрахованная доставка по всему миру, отправка в течение двух рабочих дней.',
      'Изделия на заказ отправляются через три-четыре недели.',
    ],
  },
  uk: {
    detailsTitle: 'ОПИС ВИРОБУ',
    warrantyTitle: 'ГАРАНТІЯ 3 РОКИ + БЕЗКОШТОВНЕ ПОВЕРНЕННЯ',
    deliveryTitle: 'ДОСТАВКА',
    listingSubtitle: 'Вічне сяйво для будь-якої миті',
    warranty: [
      'На кожен виріб діє трирічна гарантія від виробничих дефектів.',
      'Повернення безкоштовне протягом тридцяти днів, у первісному стані.',
    ],
    delivery: [
      'Застрахована доставка по всьому світу, відправлення протягом двох робочих днів.',
      'Вироби на замовлення відправляються через три-чотири тижні.',
    ],
  },
}

export const BLOG_PAGE: Record<'ru' | 'uk', Record<string, string>> = {
  ru: {
    eyebrow: 'НАШ БЛОГ',
    heading: 'Истории о бриллиантах, мастерстве и вечной красоте',
    emptyTitle: 'Пока ничего не опубликовано',
    emptyDescription: 'Первые истории уже пишутся. Загляните позже.',
  },
  uk: {
    eyebrow: 'НАШ БЛОГ',
    heading: 'Історії про діаманти, майстерність і вічну красу',
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

export const CONTACT_PAGE: Record<'ru' | 'uk', Record<string, string>> = {
  ru: {
    eyebrow: 'СВЯЖИТЕСЬ С НАМИ',
    heading: 'МЫ ЗДЕСЬ, ЧТОБЫ ПОМОЧЬ',
    intro: 'Вопросы, индивидуальные заказы или совет по подбору — наша команда рядом',
    faqHeading: 'Частые вопросы',
  },
  uk: {
    eyebrow: 'ЗВ’ЯЖІТЬСЯ З НАМИ',
    heading: 'МИ ТУТ, ЩОБ ДОПОМОГТИ',
    intro: 'Запитання, індивідуальні замовлення чи порада щодо добору — наша команда поруч',
    faqHeading: 'Часті запитання',
  },
}

/** The contact form's own words, nested under `form` in the global. */
export const CONTACT_FORM: Record<'ru' | 'uk', Record<string, string>> = {
  ru: {
    heading: 'НАПИШИТЕ НАМ',
    body: 'Чтобы сделать запрос, заполните форму ниже. Команда Aurum с радостью поможет с бриллиантами, заказами, доставкой и любыми другими вопросами.',
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
    body: 'Щоб зробити запит, заповніть форму нижче. Команда Aurum з радістю допоможе з діамантами, замовленнями, доставкою та будь-якими іншими питаннями.',
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
 * wrapped into `{ text }` rows by the apply script, the same way the FAQ's answers are wrapped into
 * Lexical nodes.
 */
export const HOME_PAGE: Record<'ru' | 'uk', Record<string, string | string[]>> = {
  ru: {
    heroHeadline: 'Красота выращенных бриллиантов',
    heroLede:
      'Каждый бриллиант создаётся с заботой о будущем, без компромиссов в качестве и игре света. Современная роскошь, в которой сходятся безупречная работа, ответственность и доступность',
    heroCtaLabel: 'В магазин',
    categoriesHeading: 'Категории',
    featuredHeading: 'Все украшения',
    featuredCtaLabel: 'Смотреть все',
    aboutHeadingLead: 'О бренде',
    aboutHeadingEmphasis: 'Aurum',
    aboutCtaLabel: 'Наша история',
    aboutBody: [
      'Откройте для себя коллекцию колец с выращенными бриллиантами, где вечная красота встречается с ответственным подходом.',
      'Идеальны для помолвки, свадьбы или особого случая: в каждом изделии сходятся исключительная игра света, сдержанная роскошь и вневременная элегантность',
    ],
  },
  uk: {
    heroHeadline: 'Краса вирощених діамантів',
    heroLede:
      'Кожен діамант створюється з турботою про майбутнє, без компромісів у якості та грі світла. Сучасна розкіш, у якій сходяться бездоганна робота, відповідальність і доступність',
    heroCtaLabel: 'До магазину',
    categoriesHeading: 'Категорії',
    featuredHeading: 'Усі прикраси',
    featuredCtaLabel: 'Дивитися все',
    aboutHeadingLead: 'Про бренд',
    aboutHeadingEmphasis: 'Aurum',
    aboutCtaLabel: 'Наша історія',
    aboutBody: [
      'Відкрийте для себе колекцію каблучок з вирощеними діамантами, де вічна краса зустрічається з відповідальним підходом.',
      'Ідеальні для заручин, весілля чи особливої нагоди: у кожному виробі сходяться виняткова гра світла, стримана розкіш і позачасова елегантність',
    ],
  },
}
