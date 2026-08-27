/**
 * The home page's content (002/T101).
 *
 * Every string and every photograph the page renders lives here, copied from Figma node 255:3353.
 * Sections receive it as props — see the rule in `./index.ts`.
 */

/**
 * A photograph, shaped like a Payload upload rather than like a URL. `width` and `height` are here
 * because the framework's image pipeline needs intrinsic dimensions to reserve space, and a layout
 * shift on the largest element of the page is the cheapest CLS failure to cause and the most
 * annoying to chase later.
 */
export interface MockImage {
  src: string
  width: number
  height: number
  /**
   * Omitted where the photograph is decoration. A picture inside a link that carries its own text,
   * or behind a heading that already says what it shows, does not need a second copy of that text
   * read aloud in front of it (FR-025).
   */
  alt?: string
}

export interface MockLink {
  label: string
  href: string
}

export interface MockCategory {
  title: string
  href: string
  cta: string
  image: MockImage
}

export interface MockProduct {
  name: string
  /** Already formatted. Currency arithmetic is a commerce concern, not a presentation one (FR-004). */
  price: string
  href: string
  images: MockImage[]
}

export interface HomeContent {
  hero: {
    headline: string
    lede: string
    cta: MockLink
    image: MockImage
  }
  categories: {
    heading: string
    items: MockCategory[]
  }
  featured: {
    heading: string
    cta: MockLink
    items: MockProduct[]
  }
  about: {
    /** The drawn heading is two-tone: the first word in ink, the name in the brand colour. */
    heading: { lead: string; emphasis: string }
    body: string[]
    cta: MockLink
    image: MockImage
  }
}

export const homeContent: HomeContent = {
  hero: {
    headline: 'The beauty of lab-grown diamonds',
    lede: 'Each diamond is created with care for the future, without compromising on quality or brilliance. Modern luxury that combines flawless craftsmanship, sustainability, and affordability',
    cta: { label: 'Shop now', href: '/all-jewelry' },
    // Decorative: a backdrop for the headline that sits on top of it, not a picture of anything the
    // headline does not already say.
    image: { src: '/photography/hero.webp', width: 1699, height: 926 },
  },

  categories: {
    heading: 'Shop by category',
    items: [
      {
        title: 'Rings',
        href: '/rings',
        cta: 'View collection',
        image: { src: '/photography/category-rings.webp', width: 960, height: 1040 },
      },
      {
        title: 'Bracelets',
        href: '/bracelets',
        cta: 'View collection',
        image: { src: '/photography/category-bracelets.webp', width: 960, height: 1038 },
      },
      {
        title: 'Earrings',
        href: '/earrings',
        cta: 'View collection',
        image: { src: '/photography/category-earrings.webp', width: 960, height: 1280 },
      },
      {
        title: 'Necklaces',
        href: '/necklaces',
        cta: 'View collection',
        image: { src: '/photography/category-necklaces.webp', width: 960, height: 960 },
      },
    ],
  },

  /**
   * Four pieces, which is what the design draws — and the reason its desktop frame parks the
   * "scroll right" control at `hidden`. Four cards fill the 1720px content width exactly, so there
   * is nowhere to page and the control correctly disappears. It reappears the moment a fifth piece
   * exists, and it is already earning its keep at 1024 and 390, where four cards overflow.
   *
   * The carousel's paging is proven in stories, where the item count is ours to choose, rather than
   * by padding this list with pieces the design does not show.
   */
  featured: {
    heading: 'All jewelry',
    cta: { label: 'View all', href: '/all-jewelry' },
    items: [
      {
        name: 'Butterfly diamond pendant',
        price: '$ 24,900',
        href: '/all-jewelry/butterfly-diamond-pendant',
        images: [{ src: '/photography/product-pendant.webp', width: 830, height: 830 }],
      },
      {
        name: 'Pavé butterfly diamond bracelet',
        price: '$ 37,400',
        href: '/all-jewelry/pave-butterfly-diamond-bracelet',
        images: [{ src: '/photography/product-bracelet.webp', width: 830, height: 830 }],
      },
      {
        name: 'Butterfly ruby, pink sapphire and diamond ear climbers',
        price: '$ 38,000',
        href: '/all-jewelry/butterfly-ruby-pink-sapphire-diamond-ear-climbers',
        images: [{ src: '/photography/product-ear-climbers.webp', width: 830, height: 830 }],
      },
      {
        name: 'Butterfly ruby, pink sapphire and diamond mini pendant',
        price: '$ 19,000',
        href: '/all-jewelry/butterfly-ruby-pink-sapphire-diamond-mini-pendant',
        images: [{ src: '/photography/product-mini-pendant.webp', width: 830, height: 830 }],
      },
    ],
  },

  about: {
    heading: { lead: 'About', emphasis: 'Aurum' },
    body: [
      'Discover our collection of lab-grown diamond rings, where timeless beauty meets a responsible approach.',
      'Perfect for engagements, weddings, or special occasions, each piece combines exceptional brilliance, refined luxury, and timeless elegance',
    ],
    cta: { label: 'Discover our story', href: '/about' },
    image: {
      src: '/photography/about.webp',
      width: 1254,
      height: 1254,
      // Not decoration: this one stands beside the copy rather than behind it, and the copy never
      // describes it.
      alt: 'A ruby and diamond collar from the Aurum collection',
    },
  },
}
