/**
 * Seeds the four policy pages and the one cookie category this site actually has (spec 009, T014).
 *
 * Run with `pnpm seed:policies`. Through Payload's Local API, so every hook, default and access
 * rule a real editor would hit applies here too.
 *
 * **Idempotent by slug.** Re-running creates nothing new. It also **never overwrites a policy that
 * already exists** — unlike `seed-catalog.ts`, which updates fixture products in place. The
 * difference matters: this is the owner's legal text, and a second run of a seed script must not
 * silently revert a lawyer's edit.
 *
 * **The content here is a truthful starting point, not the Figma copy** (FR-016). The drawn banner
 * and Cookie Policy describe a site using "third-party cookies, pixels", "various Google services"
 * and sending "advertising materials" — none of which is true of this site, and shipping it would
 * be publishing a false statement about data processing. What is seeded below describes the three
 * cookies this codebase actually sets, verified against `src/lib/cart/cookie.ts` and
 * `src/lib/auth/session.ts`. The owner rewrites all of it in the admin; that is the point.
 *
 * **Every write passes `context: skipRevalidation`.** This runs under `payload run`, where
 * `revalidatePath` has no request scope and throws rather than doing nothing. See
 * `src/lib/revalidate.ts`.
 */

import { getPayload } from 'payload'
import config from '@payload-config'

import { skipRevalidation } from '@/lib/revalidate'

/** Lexical's node shape, as Payload's generated type describes it. */
type Node = { [k: string]: unknown; type: string; version: number }

const textNode = (text: string, format = 0): Node => ({
  type: 'text',
  detail: 0,
  format,
  mode: 'normal',
  style: '',
  text,
  version: 1,
})

const paragraph = (text: string): Node => ({
  type: 'paragraph',
  format: '',
  indent: 0,
  version: 1,
  direction: 'ltr',
  textFormat: 0,
  children: [textNode(text)],
})

const heading = (text: string): Node => ({
  type: 'heading',
  tag: 'h2',
  format: '',
  indent: 0,
  version: 1,
  direction: 'ltr',
  children: [textNode(text)],
})

const list = (items: string[]): Node => ({
  type: 'list',
  listType: 'bullet',
  tag: 'ul',
  start: 1,
  format: '',
  indent: 0,
  version: 1,
  direction: 'ltr',
  children: items.map((item, index) => ({
    type: 'listitem',
    value: index + 1,
    format: '',
    indent: 0,
    version: 1,
    direction: 'ltr',
    children: [textNode(item)],
  })),
})

const body = (children: Node[]) => ({
  root: {
    type: 'root',
    format: '' as const,
    indent: 0,
    version: 1,
    direction: 'ltr' as const,
    children,
  },
})

interface Seed {
  slug: string
  title: string
  subtitle: string
  footerPlacement: 'customer-care' | 'legal'
  footerOrder: number
  body: ReturnType<typeof body>
}

const LAST_UPDATED = 'Last Updated: September 2026'

const POLICIES: Seed[] = [
  {
    slug: 'privacy',
    title: 'Privacy Policy',
    subtitle: LAST_UPDATED,
    footerPlacement: 'legal',
    footerOrder: 10,
    body: body([
      paragraph(
        'At Aurum we respect your privacy and are committed to protecting the personal information you share with us. This policy explains what we collect, why we collect it, and what you can ask us to do with it.',
      ),
      heading('Information we collect'),
      paragraph('When you interact with Aurum, we may collect:'),
      list([
        'Your name and contact details',
        'Your delivery and billing address',
        'Your order and enquiry history',
        'Your account details, if you create an account',
        'Messages you send us through the website or a messaging app',
      ]),
      paragraph(
        'We only collect information that is necessary to answer you and to fulfil your order.',
      ),
      heading('How we use your information'),
      list([
        'To process and fulfil your order',
        'To answer your enquiries and provide customer support',
        'To manage your account, if you have one',
        'To send you the offers you have asked to receive, and no others',
        'To meet our legal and accounting obligations',
      ]),
      heading('Payment information'),
      paragraph(
        'Aurum does not take payment through this website. We do not collect, store, or process card details anywhere on this site.',
      ),
      heading('How we share your information'),
      paragraph(
        'We do not sell your personal information. We share it only with the delivery and service providers needed to complete your order, and where the law requires it.',
      ),
      heading('Your privacy rights'),
      paragraph(
        'You can ask us for a copy of the information we hold about you, ask us to correct it, or ask us to delete it. Contact us and we will act on your request.',
      ),
      heading('Cookies'),
      paragraph(
        'This website uses a small number of cookies that are necessary for it to work. Our Cookie Policy explains each one.',
      ),
      heading('Changes to this policy'),
      paragraph(
        'We may update this Privacy Policy from time to time. The latest version is always published on this page.',
      ),
      heading('Contact us'),
      paragraph(
        'If you have questions about this Privacy Policy, or want to make a request about your information, please contact us using the details on our contact page.',
      ),
      paragraph('Aurum'),
      paragraph('Timeless brilliance. Modern responsibility.'),
    ]),
  },
  {
    slug: 'terms',
    title: 'Terms & Conditions',
    subtitle: LAST_UPDATED,
    footerPlacement: 'legal',
    footerOrder: 20,
    body: body([
      paragraph(
        'Welcome to Aurum. These terms govern your access to and use of our website, our online services, our products, and their related features. By using our website, you agree to these terms.',
      ),
      heading('Use of our website'),
      paragraph(
        'You may use the Aurum website for lawful, personal, and non-commercial purposes. You agree not to misuse the website, interfere with its operation, or attempt unauthorised access.',
      ),
      heading('Products and availability'),
      paragraph(
        'We make reasonable efforts to display our jewellery accurately. Colours, proportions, dimensions, and appearance may vary slightly depending on your screen. All products are subject to availability, and we reserve the right to limit quantities.',
      ),
      heading('Pricing'),
      paragraph(
        'Prices are displayed on our website and may change without prior notice. We make reasonable efforts to ensure pricing and product information are accurate. If an error occurs, we reserve the right to correct it and to cancel any affected order.',
      ),
      heading('Enquiries and orders'),
      paragraph(
        'This website does not take payment. Enquiries and orders are completed with our team directly, and the terms of each order are confirmed with you before anything is agreed.',
      ),
      heading('Shipping and returns'),
      paragraph(
        'Delivery, exchanges, and returns are covered by our Shipping & Returns policy, which forms part of these terms.',
      ),
      heading('Intellectual property'),
      paragraph(
        'All content on the Aurum website — including our name, branding, photographs, graphics, product designs, text, layouts, and other materials — is owned by or licensed to Aurum and is protected by law.',
      ),
      heading('Accounts'),
      paragraph(
        'If you create an account, you are responsible for keeping your password confidential and for everything done through your account. Please contact us if you believe your account has been accessed without your authorisation.',
      ),
      heading('Limitation of liability'),
      paragraph(
        'To the fullest extent permitted by applicable law, Aurum is not liable for indirect, incidental, special, or consequential losses arising from the use of, or inability to use, our website or our products.',
      ),
      heading('Changes to these terms'),
      paragraph(
        'We may update these terms from time to time. Changes take effect when the revised version is published on our website, and your continued use of the website means you accept them.',
      ),
      heading('Contact us'),
      paragraph(
        'If you have questions about these terms, please contact us using the details on our contact page.',
      ),
      paragraph('Aurum'),
      paragraph('Timeless brilliance. Modern responsibility.'),
    ]),
  },
  {
    slug: 'cookies',
    title: 'Cookie Policy',
    subtitle: LAST_UPDATED,
    footerPlacement: 'legal',
    footerOrder: 30,
    body: body([
      paragraph(
        'This Cookie Policy explains how Aurum uses cookies when you visit our website. It is short because our use of cookies is small.',
      ),
      heading('What are cookies?'),
      paragraph(
        'Cookies are small text files stored on your device when you visit a website. They allow a website to remember things about your visit, such as what you have put in your bag or that you are signed in.',
      ),
      heading('We do not use analytics or advertising cookies'),
      paragraph(
        'Aurum does not use Google Analytics or any other analytics service. We do not use advertising cookies, tracking pixels, or social media trackers, and we do not share your browsing behaviour with any third party. No third-party script runs on this website.',
      ),
      heading('The cookies we do use'),
      paragraph(
        'Every cookie this website sets is strictly necessary — the site cannot do what you asked of it without them:',
      ),
      list([
        'A session cookie, set when you sign in, which keeps you signed in as you move between pages. It is removed when you sign out.',
        'A shopping bag cookie, which is how the website knows which bag is yours so you can come back to it later. It expires after 30 days.',
        'A shopping bag count, which is the number shown on the bag icon in the header. It holds no personal information.',
        'A consent cookie, which records the choice you made about cookies so that you are not asked again. It expires after 180 days.',
      ]),
      heading('Managing cookies'),
      paragraph(
        'You can review or change your choice at any time using the cookie settings link in the footer of every page. You can also delete cookies through your browser settings — though if you remove the ones above, the website may not remember your bag or keep you signed in.',
      ),
      heading('If this changes'),
      paragraph(
        'If we ever introduce analytics or any other optional cookie, it will appear in the cookie chooser switched off, this page will describe it, and we will ask you again before it is used.',
      ),
      heading('Contact us'),
      paragraph(
        'If you have questions about our use of cookies, please contact us using the details on our contact page.',
      ),
      paragraph('Aurum'),
      paragraph('Timeless brilliance. Modern responsibility.'),
    ]),
  },
  {
    slug: 'shipping',
    title: 'Shipping & Returns',
    subtitle: 'Enjoy complimentary shipping and returns on all orders',
    footerPlacement: 'customer-care',
    footerOrder: 10,
    body: body([
      heading('Shipping policy'),
      paragraph(
        'Aurum partners with DHL, FedEx, Ferrari, and Brinks to ensure your order arrives safely. We offer complimentary shipping on all deliveries.',
      ),
      paragraph(
        'Your shipment is fully insured and requires a signature when it is delivered. Insurance coverage ends once the parcel is delivered and signed for.',
      ),
      paragraph(
        'Jewellery in stock is delivered within 3 to 7 business days. If it is not, our master artisans begin crafting your jewel immediately and will ship directly from our atelier within 25 business days.',
      ),
      heading('Return policy'),
      paragraph('Exchanges or refunds are offered within 30 days of receiving your order.'),
      heading('Exchanges'),
      paragraph(
        'Exchanges are available for an item of equal or greater value. To proceed with an exchange, please contact us.',
      ),
      heading('Refunds'),
      paragraph(
        'Refunds are available to the original purchaser and are issued to the payment method used for the initial purchase. Processing may take up to 14 days from receipt of the returned product.',
      ),
      heading('Conditions'),
      paragraph(
        'Items must be returned in perfect condition, in their original packaging, along with the receipt and all accessories: boxes, booklets, tags, and protective elements. No exchanges or refunds are accepted for personalised products.',
      ),
    ]),
  },
]

const CATEGORY = {
  key: 'necessary',
  name: 'Strictly necessary',
  purpose:
    'These cookies are what let the website do what you asked of it: keep you signed in, remember what is in your shopping bag, and remember this choice. The site cannot work without them, so they cannot be switched off.',
  necessary: true,
}

async function seed() {
  const payload = await getPayload({ config })

  for (const entry of POLICIES) {
    const existing = await payload.find({
      collection: 'policies',
      where: { slug: { equals: entry.slug } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
      draft: true,
    })

    if (existing.docs.length > 0) {
      console.log(`  · /legal/${entry.slug} already exists — left exactly as it is`)
      continue
    }

    await payload.create({
      collection: 'policies',
      data: { ...entry, _status: 'published' },
      context: skipRevalidation,
      overrideAccess: true,
    })

    console.log(`  ✓ /legal/${entry.slug} — ${entry.title}`)
  }

  const settings = await payload.findGlobal({
    slug: 'cookie-settings',
    depth: 0,
    overrideAccess: true,
  })

  if (settings.categories?.length) {
    console.log('  · Cookie categories already configured — left exactly as they are')
  } else {
    const policy = await payload.find({
      collection: 'policies',
      where: { slug: { equals: 'cookies' } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })

    await payload.updateGlobal({
      slug: 'cookie-settings',
      data: {
        enabled: true,
        consentVersion: 1,
        // Left to the field's own `defaultValue` rather than repeated here: two copies of the
        // banner's wording is one more than can stay in step.
        ...(policy.docs[0] ? { policy: policy.docs[0].id } : {}),
        categories: [CATEGORY],
        _status: 'published',
      },
      context: skipRevalidation,
      overrideAccess: true,
    })

    console.log('  ✓ Cookie banner configured with one strictly necessary category')
  }

  console.log('\nDone.')
  process.exit(0)
}

await seed()
