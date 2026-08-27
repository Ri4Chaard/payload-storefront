import path from 'path'
import { fileURLToPath } from 'url'

import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { buildConfig } from 'payload'
import sharp from 'sharp'

import { env } from './env'
import { Admins } from './collections/admins'
import { Media } from './collections/media'

const dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Payload ships EMPTY in spec 001.
 *
 * Only `users` and `media` exist — the scaffold, nothing more. No products, carts, orders, or
 * e-commerce plugin: the storefront renders from `src/mocks/` while the design system is built, and
 * the catalog's data model is decided in spec 002 with real screens to judge against
 * (research.md R9).
 *
 * If you are adding a domain collection here, you are probably in the wrong spec.
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

  collections: [Admins, Media],

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
