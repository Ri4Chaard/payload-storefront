import path from 'path'
import { fileURLToPath } from 'url'

import { postgresAdapter } from '@payloadcms/db-postgres'
import { USD, ecommercePlugin } from '@payloadcms/plugin-ecommerce'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { buildConfig } from 'payload'
import sharp from 'sharp'

import { Admins } from './collections/admins'
import { Attributes } from './collections/attributes'
import { Categories } from './collections/categories'
import { cartItemMatcher, cartsCollectionOverride } from './collections/carts'
import { Collections } from './collections/collections'
import { Customers } from './collections/customers'
import { Media } from './collections/media'
import { productsCollectionOverride } from './collections/products'
import { Sizes } from './collections/sizes'
import { variantsCollectionOverride } from './collections/variants'
import { env } from './env'
import { Shop } from './globals/shop'
import {
  adminOnlyFieldAccess,
  adminOrPublishedStatus,
  isAdmin,
  isCustomer,
  isDocumentOwner,
  publicAccess,
} from './lib/access'
import { withPrunedEcommerceTypes } from './lib/ecommerce-schema'

const dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * The catalogue lands here in spec 003.
 *
 * Spec 001 shipped Payload deliberately empty — `admins` and `media`, nothing more — so that the
 * catalogue's shape would be decided with real screens to judge it against rather than guessed at
 * from a brief (001/research.md R9). This is that decision.
 *
 * Seven collections are ours: the four above plus `categories`, `collections`, `sizes`,
 * `attributes`, and the minimal `customers` the plugin requires. Four more arrive from
 * `@payloadcms/plugin-ecommerce`: `products`, `variants`, `variantTypes`, `variantOptions`, and
 * `carts`.
 *
 * The storefront still renders from `src/mocks/` at this point. That is the last remaining part of
 * the deviation spec 002 opened, and it closes in this spec's final phase, in one file.
 */
export default buildConfig({
  admin: {
    user: Admins.slug,
    importMap: { baseDir: path.resolve(dirname) },
    meta: {
      titleSuffix: '— Aurum',
    },
    // Admin CSS is applied by the import in src/app/(payload)/layout.tsx — Payload 3 has no
    // config key for it. That stylesheet loads Tailwind WITHOUT preflight; see it for why.
  },

  collections: [Admins, Customers, Media, Categories, Collections, Sizes, Attributes],

  globals: [Shop],

  plugins: [
    withPrunedEcommerceTypes(
      ecommercePlugin({
        // Every function stated explicitly. Constitution IV forbids taking Payload's defaults by
        // omission — a collection relying on them must say so on purpose.
        access: {
          isAdmin,
          adminOrPublishedStatus,
          isDocumentOwner,
          adminOnlyFieldAccess,
          isCustomer,
          publicAccess,
        },

        // Required, and the reason `customers` exists this early: the carts collection builds a
        // relationship field against it, so Payload will not boot without it.
        customers: { slug: Customers.slug },

        // One currency. A second would generate a second price field on every priced collection and
        // force a choice in every formatter — a schema change to make on purpose, not by default.
        currencies: { defaultCurrency: 'USD', supportedCurrencies: [USD] },

        inventory: true,

        products: {
          productsCollectionOverride,
          variants: { variantsCollectionOverride },
        },

        carts: {
          allowGuestCarts: true,
          cartItemMatcher,
          cartsCollectionOverride,
        },

        // Off until spec 004. The plugin's orders are created when a TRANSACTION succeeds and its
        // transactions are payment records; an Aurum order is a request handed to WhatsApp or
        // Telegram, with no payment anywhere. Landing a model we already know is wrong is worse than
        // a second migration, and enabling these later is purely additive (001/research.md R9).
        orders: false,
        transactions: false,
        // `addresses: false` is IGNORED at 3.88.0 — `sanitizePluginConfig` rewrites any non-`true`
        // value into an object of address fields, so the collection is created regardless. Verified
        // in `dist/utilities/sanitizePluginConfig.js`. The value is left here to record the intent;
        // the extra table is accepted rather than fought, because stripping the collection back out
        // would risk the relationships the plugin builds against it.
        addresses: false,
        // `payments` omitted entirely — no adapter, no Stripe. The site takes no money.
      }),
    ),
  ],

  editor: lexicalEditor(),
  secret: env.PAYLOAD_SECRET,
  serverURL: env.NEXT_PUBLIC_SERVER_URL,

  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },

  db: postgresAdapter({
    pool: { connectionString: env.DATABASE_URI },
    // Migrations are generated and committed, never auto-pushed. Constitution IV requires a tested
    // rollback path for every schema change.
    push: false,
    migrationDir: path.resolve(dirname, '../migrations'),
  }),

  sharp,
})
