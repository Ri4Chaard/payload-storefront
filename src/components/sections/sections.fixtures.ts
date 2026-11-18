/**
 * Specimen content for the four home-page bands' stories (spec 010).
 *
 * **This is what `src/mocks/home.ts` became.** That file was the last of the fixture content spec
 * 002 staged as a deviation from Constitution I, and the home page read it for real — the hero, the
 * two band headings and the About copy were served to visitors from a TypeScript constant, which
 * is also why they stayed English on `/ru`. The page reads the `home-page` global now, and what was
 * left is this: sample props, so a bench can draw a band without a database.
 *
 * It sits beside the components rather than under `src/mocks/` for the reason
 * `filter-toolbar.fixtures.ts` already established — a fixture next to its stories is obviously a
 * fixture, and cannot be mistaken for content the application serves.
 */

export interface FixtureImage {
  src: string
  width: number
  height: number
  alt?: string
}

export const heroFixture = {
  headline: 'A headline about your store',
  lede: 'A short sentence under the headline that says what your store offers.',
  cta: { label: 'Shop now', href: '/all-products' },
  // Decorative: a backdrop for the headline that sits on top of it, not a picture of anything the
  // headline does not already say.
  image: { src: '/photography/hero.webp', width: 1699, height: 926 } as FixtureImage,
}

export const categoryBandFixture = {
  heading: 'Shop by category',
  items: [
    {
      title: 'Category 1',
      href: '/category-1',
      cta: 'View collection',
      image: { src: '/photography/category-1.webp', width: 960, height: 1040 } as FixtureImage,
    },
    {
      title: 'Category 2',
      href: '/category-2',
      cta: 'View collection',
      image: {
        src: '/photography/category-2.webp',
        width: 960,
        height: 1038,
      } as FixtureImage,
    },
    {
      title: 'Category 3',
      href: '/category-3',
      cta: 'View collection',
      image: {
        src: '/photography/category-3.webp',
        width: 960,
        height: 1280,
      } as FixtureImage,
    },
    {
      title: 'Category 4',
      href: '/category-4',
      cta: 'View collection',
      image: {
        src: '/photography/category-4.webp',
        width: 960,
        height: 960,
      } as FixtureImage,
    },
  ],
}

/**
 * Four products, which is what the design draws — and the reason its desktop frame parks the
 * "scroll right" control at `hidden`. Four cards fill the 1720px content width exactly, so there is
 * nowhere to page and the control correctly disappears. It reappears the moment a fifth product
 * exists, and it is already earning its keep at 1024 and 390, where four cards overflow.
 */
export const featuredFixture = {
  heading: 'All products',
  cta: { label: 'View all', href: '/all-products' },
  items: [
    {
      name: 'Product 3',
      price: '$ 24,900',
      href: '/all-products/product-3',
      images: [{ src: '/photography/product-3.webp', width: 830, height: 830 }],
    },
    {
      name: 'Product 2',
      price: '$ 37,400',
      href: '/all-products/product-2',
      images: [{ src: '/photography/product-2.webp', width: 830, height: 830 }],
    },
    {
      name: 'Product 4',
      price: '$ 38,000',
      href: '/all-products/product-4',
      images: [{ src: '/photography/product-4.webp', width: 830, height: 830 }],
    },
    {
      name: 'Product 5',
      price: '$ 19,000',
      href: '/all-products/product-5',
      images: [{ src: '/photography/product-5.webp', width: 830, height: 830 }],
    },
  ],
}

export const aboutFixture = {
  heading: { lead: 'About', emphasis: 'Aurum' },
  body: [
    'A short paragraph about your store.',
    'A second paragraph about what you sell and why it is worth a look.',
  ],
  cta: { label: 'Discover our story', href: '/about' },
  image: {
    src: '/photography/about.webp',
    width: 1254,
    height: 1254,
    // Not decoration: this one stands beside the copy rather than behind it, and the copy never
    // describes it.
    alt: 'A placeholder photograph for the About band',
  } as FixtureImage,
}
