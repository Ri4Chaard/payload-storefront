import path from 'path'
import { fileURLToPath } from 'url'

import { postgresAdapter } from '@payloadcms/db-postgres'
import { resendAdapter } from '@payloadcms/email-resend'
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
import { VerificationCodes } from './collections/verification-codes'
import { variantsCollectionOverride } from './collections/variants'
import { emailFromName, emailOverrideRecipient, env } from './env'
import { logEmailAdapter } from './lib/email/log-adapter'
import { addressFields } from './fields/address-fields'
import {
  assignFirstAddressAsDefault,
  clearOtherDefaults,
  keepOneDefault,
  promoteDefaultAfterDelete,
} from './fields/address-hooks'
import { AccountSettings } from './globals/account-settings'
import { ContactSettings } from './globals/contact-settings'
import { Shop } from './globals/shop'
import { purgeAccountsTask } from './jobs/purge-accounts'
import {
  adminOnlyFieldAccess,
  adminOrPublishedStatus,
  isAdmin,
  isAuthenticated,
  isCustomer,
  isDocumentOwner,
  publicAccess,
} from './lib/access'
import { countryOptions } from './lib/countries'
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

  collections: [
    Admins,
    Customers,
    Media,
    Categories,
    Collections,
    Sizes,
    Attributes,
    VerificationCodes,
  ],

  globals: [Shop, AccountSettings, ContactSettings],

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
          // The addresses collection asks for this by name. Omitted until 004, which left its
          // `create` resolving to undefined and falling through to Payload's default — the access
          // by omission Constitution IV forbids (R7).
          isAuthenticated,
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
        /**
         * Saved delivery addresses land in spec 004.
         *
         * This was `addresses: false`, with a note that the value was ignored. The note was right,
         * and its consequence was larger than it read: `sanitizePluginConfig` rewrites any
         * non-`true` value into an object of address fields, so the collection has existed —
         * modelled, access-controlled and migrated — since 003. The profile page does not create
         * it, it configures it (004/research.md R5).
         *
         * `supportedCountries` is replaced because the plugin's default list has forty entries and
         * contains neither Kazakhstan nor the UAE — the shop's own market, and the country in the
         * sample address the design draws (R6).
         */
        addresses: {
          addressFields,
          supportedCountries: countryOptions(),
          // Fields go through `addressFields` above; only the FR-031 invariant needs the
          // collection itself. Appended to the plugin's hooks, never replacing them — its own
          // `beforeChange` assigns ownership and must still run, and must still run first.
          addressesCollectionOverride: ({ defaultCollection }) => ({
            ...defaultCollection,
            hooks: {
              ...defaultCollection.hooks,
              afterChange: [...(defaultCollection.hooks?.afterChange ?? []), clearOtherDefaults],
              afterDelete: [
                ...(defaultCollection.hooks?.afterDelete ?? []),
                promoteDefaultAfterDelete,
              ],
              beforeChange: [
                ...(defaultCollection.hooks?.beforeChange ?? []),
                assignFirstAddressAsDefault,
                keepOneDefault,
              ],
            },
          }),
        },
        // `payments` omitted entirely — no adapter, no Stripe. The site takes no money.
      }),
    ),
  ],

  editor: lexicalEditor(),
  secret: env.PAYLOAD_SECRET,
  serverURL: env.NEXT_PUBLIC_SERVER_URL,

  /**
   * Transactional mail (spec 004, research R1).
   *
   * Payload's own auth operations send through whatever adapter is configured here — so without
   * one, `verify` and `forgotPassword` cannot send at all, and registration has no way to finish.
   * That is why this is an adapter rather than a call to Resend from our own code.
   *
   * **This is the transactional path only.** Marketing mail never comes through here; it is Resend
   * audience membership, sent from Resend. The split is what makes "unsubscribing from offers must
   * not stop your password-reset code" a property of the architecture instead of a conditional
   * somebody has to remember to write. See `src/lib/email/`.
   */
  email:
    process.env.EMAIL_TRANSPORT === 'log'
      ? /**
         * The test runners set this, and nothing else does — see `src/lib/email/log-adapter.ts`.
         * Read from `process.env` rather than through `./env.ts` because it is not a deployment
         * setting: it exists so `pnpm test:integration` and `pnpm test:e2e` stop spending a real
         * Resend quota, and an absent value must mean "send the mail".
         */
        logEmailAdapter({
          defaultFromAddress: env.EMAIL_FROM_ADDRESS,
          defaultFromName: emailFromName,
        })
      : resendAdapter({
          apiKey: env.RESEND_API_KEY,
          defaultFromAddress: env.EMAIL_FROM_ADDRESS,
          defaultFromName: emailFromName,
          // Unset in production. Present so a staging environment holding restored customer data
          // cannot mail those customers. See src/env.ts.
          ...(emailOverrideRecipient ? { overrideRecipientAddress: emailOverrideRecipient } : {}),
        }),

  /**
   * The nightly cleanup (spec 004, FR-040, FR-041, research R15).
   *
   * **`autoRun` makes this process the scheduler**, which is the whole reason no cron container is
   * needed — and the reason the `@remark` on `autoRun` in Payload's own types matters here: it says
   * not to use it on serverless platforms, because a function that only exists during a request
   * cannot hold a timer. This deploys as a long-running container (`docker-compose.yml`), so it
   * can. Moving to a serverless host means moving this to an external scheduler hitting the jobs
   * endpoint, and it will fail silently rather than loudly if that is forgotten — the jobs simply
   * never run.
   *
   * The cron here is the RUNNER — it drains the queue every fifteen minutes. What decides when a
   * purge is enqueued is the `schedule` on the task itself. Two different clocks on purpose: the
   * task wants to run nightly, and the runner wants to be frequent enough that a job queued by
   * anything else is not left sitting until tomorrow.
   *
   * Scoped to the `nightly` queue rather than `allQueues`, so this stays the schedule for cleanup
   * work and does not silently become the runner for every job a later feature adds.
   */
  jobs: {
    tasks: [purgeAccountsTask],
    autoRun: [{ cron: '0 0/15 * * * *', queue: 'nightly' }],
    // Nothing reads a completed purge back. Keeping every run forever would make the jobs table the
    // one thing in this system that grows without bound, which is a poor look on a cleanup job.
    deleteJobOnComplete: true,
  },

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
