import AxeBuilder from '@axe-core/playwright'
import config from '@payload-config'
import { expect, test } from '@playwright/test'
import { getPayload } from 'payload'

/**
 * Automated accessibility over the storefront routes (FR-044). Storybook's a11y addon covers
 * components in isolation; this covers them composed into real pages, with the COMPLETE rule set —
 * including the document-level rules the component sweep deliberately excludes, because a document
 * is the only place they mean anything.
 *
 * Three widths, because a responsive layout is three layouts (002/T132). A band that reflows into
 * an unreachable scroller, or a control that only overlaps its neighbour on a phone, is invisible
 * to a single-width sweep.
 */
const ROUTES = [
  '/',
  // A category listing and the whole shop: the same frame, but only one of them pages, and
  // pagination is a set of controls nothing else on the site has (003/T257).
  '/category-1',
  '/all-products?page=2',
  // The empty state and the branded 404 are both pages a visitor reaches by accident, which is
  // exactly when they can least afford to be unusable.
  '/all-products?maxPrice=1',
  '/rungs',
  // A piece with stones and sizes, and one with neither: the selectors, the quantity stepper and
  // the two actions only exist on the first, and the second is what proves the column closes over
  // them rather than leaving labelled controls behind (003/T296).
  '/products/product-1',
  '/products/product-3',
  // The account flow (004/T459). A form is where a keyboard or a screen reader has the most to
  // lose — an unlabelled field or an error nobody announces is the difference between registering
  // and giving up — and these two are the only pages on the site a visitor MUST complete.
  '/create-account',
  '/verify-email?email=a11y%40aurum-testing.dev',
  // Sign-in (004/T476). The password reveal is the control most likely to fail here: it is an
  // icon-only button whose accessible name has to change with its state, and getting that wrong
  // leaves a screen-reader user unable to tell whether their password is on screen.
  '/sign-in',
  // The reset flow (004/T492). `/reset-password` renders its code step, which is the second place
  // in the feature where six inputs have to present themselves as one labelled control — FR-046
  // asks for the invalid-code message to be announced, and a group that is not named has nothing to
  // announce it against.
  '/forgot-password',
  '/reset-password?email=a11y%40aurum-testing.dev',
  /**
   * The story page (006/T036). Composed of blocks an editor arranged, which is what makes it worth
   * scanning here rather than only in Storybook: the heading outline is a property of the whole
   * page and of the ORDER somebody put the bands in, and no component sweep can see it. The FAQ
   * band also puts several expandable regions on one page for the first time outside a product.
   */
  '/about',
  /**
   * The blog (007/T036, T049, T069). Three addresses, because each puts something on the page the
   * others do not:
   *
   *   `/blog`                   the mosaic and the tab strip — a set of links where exactly one is
   *                             current, which is the pattern most often got wrong by marking the
   *                             current one with colour alone.
   *   `/blog?category=guides`   the same page narrowed, so the `aria-current` claim is checked in
   *                             the state where it means something.
   *   an article                a document whose heading outline is a property of editor-entered
   *                             content, plus the contents rail — the one region on this site that
   *                             follows the reader, and the only place `aria-current="true"` is set
   *                             by script.
   */
  '/blog',
  '/blog?category=guides',
  '/blog/article-1',
  // Contact and FAQ (008). `/contact` is the only route on this site carrying a form a visitor can
  // submit without an account, so it is the one whose error and pending states an automated scan
  // has never seen before. `/faq` is a column of expandable rows and nothing else.
  '/contact',
  '/faq',
  /**
   * The policy pages (009/T016). Four addresses would be three too many for a scan — they are the
   * same layout with different prose — so two are listed, chosen for what differs:
   *
   *   `/legal/privacy`    the longest body, and the one whose heading outline is entirely
   *                       editor-entered. An `h1` from the page header followed by `h2`s from a
   *                       rich-text field is an outline no component sweep can see, because neither
   *                       half knows about the other.
   *   `/legal/shipping`   the same layout with a SENTENCE in the subtitle rather than a date, and
   *                       filed under Customer Care in the footer rather than the legal row — so it
   *                       is the one that proves the footer's two content-driven slots both render.
   */
  '/legal/privacy',
  '/legal/shipping',
]

const WIDTHS = [
  { name: 'desktop', width: 1920 },
  { name: 'tablet', width: 1024 },
  { name: 'mobile', width: 390 },
]

for (const route of ROUTES) {
  for (const { name, width } of WIDTHS) {
    test(`${route} has no accessibility violations at ${name} width`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto(route)

      // Photographs decide the height of several bands, so a sweep that starts before they land
      // measures a page nobody sees.
      await page.waitForLoadState('networkidle')

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze()

      expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([])
    })
  }
}

/**
 * The menu is a whole screen, and it is the one part of the storefront the component sweep can
 * never see: it has no story of its own, and it only exists once something has been clicked.
 *
 * Run with the complete rule set, like the routes above — an overlay that covers the page inherits
 * every document-level obligation the page had.
 */
for (const { name, width, height } of [
  { name: 'tablet', width: 1024, height: 1366 },
  { name: 'mobile', width: 390, height: 844 },
]) {
  test(`the open menu has no accessibility violations at ${name} width`, async ({ page }) => {
    await page.setViewportSize({ width, height })
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    await page.getByRole('button', { name: 'Open menu' }).click()
    await expect(page.getByRole('button', { name: 'Close menu' })).toBeVisible()

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze()

    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([])
  })
}

/**
 * The filter drawer, open (003/T296).
 *
 * Like the menu below it, this is a state no component sweep can reach: `FilterDrawer` has stories,
 * but a story renders the panel beside a page rather than OVER one, and the obligations that come
 * with covering a document — the trap, the labelled dialog, what is left reachable behind it — only
 * exist once it does.
 *
 * At every width, including 1920. The panel is the same overlay at all three; only what is drawn
 * behind it changes, and "the desktop has room" is not a reason to check it less.
 */
for (const { name, width, height } of [
  { name: 'desktop', width: 1920, height: 1080 },
  { name: 'tablet', width: 1024, height: 1366 },
  { name: 'mobile', width: 390, height: 844 },
]) {
  test(`the open filter drawer has no accessibility violations at ${name} width`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height })
    await page.goto('/all-products')
    await page.waitForLoadState('networkidle')

    await page.getByRole('link', { name: /^Filters/ }).click()
    await expect(page.locator('#filters')).toBeVisible()

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze()

    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([])
  })
}

/**
 * The lightbox, open (003/T296).
 *
 * The fourth state, and the one furthest from anything a story can show: PhotoSwipe builds its own
 * dialog outside the React tree, so what axe audits here is markup this repository does not write.
 * That is precisely why it is worth auditing — a third-party viewer that covers the page inherits
 * every obligation the page had, and the only way to know it meets them is to open it.
 */
for (const { name, width, height } of [
  { name: 'desktop', width: 1920, height: 1080 },
  { name: 'tablet', width: 1024, height: 1366 },
  { name: 'mobile', width: 390, height: 844 },
]) {
  test(`the open lightbox has no accessibility violations at ${name} width`, async ({ page }) => {
    await page.setViewportSize({ width, height })
    await page.goto('/products/product-1')
    await page.waitForLoadState('networkidle')

    await page.getByRole('button', { name: /open full screen$/ }).first().click()
    await expect(page.getByRole('dialog')).toBeVisible()

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze()

    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([])
  })
}


/**
 * The profile, and the modal over it (004/T507).
 *
 * **It cannot go in `ROUTES` above**, because `/account` is the one page on the site that requires a
 * session: an anonymous sweep would audit the sign-in redirect and report a clean profile it never
 * saw. So this signs in first.
 *
 * The card is six labelled rows and the one dialog this feature opens, which makes it the densest
 * concentration of naming obligations in the storefront — a pencil whose accessible name is "Edit"
 * three times over, a switch reporting a state nobody can hear, a dialog that does not say what it
 * is. None of those is visible in a screenshot.
 */
for (const { name, width } of WIDTHS) {
  test(`/account has no accessibility violations at ${name} width`, async ({ page }) => {
    const payload = await getPayload({ config })
    const email = `a11y-${Date.now()}-${name}@a11y.aurum-testing.dev`

    const customer = await payload.create({
      collection: 'customers',
      data: { email, firstName: 'Ada', lastName: 'Lovelace', password: 'a-long-enough-password' },
      disableVerificationEmail: true,
      overrideAccess: true,
    })
    await payload.update({
      collection: 'customers',
      data: { _verified: true },
      overrideAccess: true,
      where: { email: { equals: email } },
    })

    await page.setViewportSize({ width, height: 900 })
    await page.goto('/sign-in')
    await page.getByPlaceholder('Email Address').fill(email)
    await page.getByPlaceholder('Password', { exact: true }).fill('a-long-enough-password')
    await page.getByRole('button', { name: 'Log in' }).click()
    await expect(page.getByRole('heading', { name: 'My account' })).toBeVisible({ timeout: 15_000 })
    /**
     * The heading arrives before the title does — `metadata` is applied by the client router a beat
     * after the segment paints, and a sweep that starts in that gap reports a document with no
     * `<title>`. Real under load, invisible when this file runs alone, and a failure about the wrong
     * thing either way.
     */
    await expect(page).toHaveTitle(/My account/)

    const card = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze()

    expect(card.violations, JSON.stringify(card.violations, null, 2)).toEqual([])

    // …and again with the Full name modal open, which is a different document: a dialog covering
    // the page inherits every obligation the page had, and adds the trap.
    await page.getByRole('button', { name: 'Edit full name' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()

    const modal = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze()

    expect(modal.violations, JSON.stringify(modal.violations, null, 2)).toEqual([])

    // …and the Change password modal, which is the denser of the two: three password fields whose
    // placeholders are nearly identical, a link living inside one of them, and a reveal toggle
    // beside it whose name has to change with its state.
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toBeHidden()
    await page.getByRole('button', { name: 'change password' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()

    const password = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze()

    expect(password.violations, JSON.stringify(password.violations, null, 2)).toEqual([])

    /*
      …and that modal's SECOND state, the confirmation it becomes on save (004/T566, FR-045). A
      dialog that swaps its own contents while open is the shape most likely to strand focus and
      leave the change unannounced, so it is scanned as its own document rather than assumed to
      inherit the pass above.
    */
    await page.getByPlaceholder('Enter current password').fill('a-long-enough-password')
    await page.getByPlaceholder('Enter new password').fill('an-even-longer-password')
    await page.getByPlaceholder('Confirm new password').fill('an-even-longer-password')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByText('Your password has been updated.')).toBeVisible({ timeout: 15_000 })

    const changed = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze()

    expect(changed.violations, JSON.stringify(changed.violations, null, 2)).toEqual([])

    await page.getByRole('button', { name: 'Done' }).click()
    await expect(page.getByRole('dialog')).toBeHidden()

    // …and the Add address modal (004/T523), the largest form on the site behind a dialog: seven
    // controls with no visible labels, a listbox of every country, and a checkbox that is disabled
    // and checked at once — the combination most likely to leave something unnamed.
    await page.getByRole('button', { name: 'Add address' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()

    const address = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze()

    expect(address.violations, JSON.stringify(address.violations, null, 2)).toEqual([])

    /**
     * …and the fourth modal, the delete confirmation (004/T566).
     *
     * It is the smallest of the four and was the one missing from this sweep, which is the usual
     * shape of the gap: a dialog with two buttons and one sentence looks like it cannot be got
     * wrong. It can — it is the only one that names a row's contents in its prose, so it is the one
     * whose accessible name is assembled rather than written.
     *
     * The address has to exist before the row can offer a delete, so it is created here rather than
     * through the form — this is an accessibility sweep, not a test of saving.
     */
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toBeHidden()

    await payload.create({
      collection: 'addresses',
      data: {
        addressLine1: 'Mangilik el 22',
        city: 'Astana',
        country: 'KZ',
        customer: customer.id,
        postalCode: '010042',
      },
      overrideAccess: true,
    })

    await page.reload()
    await expect(page).toHaveTitle(/My account/)
    await page.getByRole('button', { name: /^Delete address:/ }).click()
    await expect(page.getByRole('dialog')).toBeVisible()

    const remove = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze()

    expect(remove.violations, JSON.stringify(remove.violations, null, 2)).toEqual([])

    await payload.delete({
      collection: 'customers',
      overrideAccess: true,
      where: { email: { equals: email } },
    })
  })
}

/**
 * The cart and its two dialogs (spec 005, T081, SC-008).
 *
 * **Not in `ROUTES` above**, because an empty `/cart` is a heading and a link — the page worth
 * sweeping is one with rows in it, a removal confirmation over it, and a handoff modal over that.
 * Each has to be built before it can be measured.
 *
 * A dialog inherits every document-level obligation the page had, so all three run with the
 * complete rule set, at the three drawn widths.
 */
for (const { name, width, height } of [
  { name: 'desktop', width: 1920, height: 1200 },
  { name: 'tablet', width: 1024, height: 1366 },
  { name: 'mobile', width: 390, height: 844 },
]) {
  test(`the cart and its dialogs have no accessibility violations at ${name} width`, async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await page.setViewportSize({ width, height })

    await page.goto('/products/product-1')
    await page.getByRole('combobox', { name: /variantChoice/i }).click()
    await page.getByRole('option').first().click()
    await page.getByRole('button', { name: /add to cart/i }).click()
    await expect(page.getByText(/added to your cart/i)).toBeVisible()

    await page.goto('/cart')
    await page.waitForLoadState('networkidle')

    const sweep = () =>
      new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze()

    const filled = await sweep()
    expect(filled.violations, JSON.stringify(filled.violations, null, 2)).toEqual([])

    // The removal confirmation.
    await page.getByRole('button', { name: /^remove /i }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    const removal = await sweep()
    expect(removal.violations, JSON.stringify(removal.violations, null, 2)).toEqual([])
    await page.keyboard.press('Escape')

    // The handoff.
    await page
      .locator('label')
      .filter({ hasText: /I agree to the/ })
      .locator('span[aria-hidden="true"]')
      .click()
    await page.getByRole('button', { name: /^checkout$/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible()

    const handoff = await sweep()
    expect(handoff.violations, JSON.stringify(handoff.violations, null, 2)).toEqual([])
  })
}
