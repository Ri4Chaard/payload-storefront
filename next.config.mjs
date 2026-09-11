import { withPayload } from '@payloadcms/next/withPayload'
import createNextIntlPlugin from 'next-intl/plugin'

/**
 * next-intl reads its per-request configuration from this file (spec 010, research R1).
 *
 * The path is passed explicitly rather than relying on the plugin's default lookup, because the
 * default searches `./i18n/request.ts` and `./src/i18n/request.ts` — and a silent miss there
 * surfaces much later as "Unable to find next-intl locale" on a route nobody was changing.
 */
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    formats: ['image/avif', 'image/webp'],
  },
}

/**
 * Both plugins transform the config, so the nesting is the order they run in: next-intl first,
 * Payload outermost. Payload's wrapper is the one that takes options, which is the practical reason
 * it stays on the outside.
 */
export default withPayload(withNextIntl(nextConfig), { devBundleServerPackages: false })
