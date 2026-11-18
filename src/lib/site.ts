/**
 * The shop's name, in one place.
 *
 * Everything that prints the name — the wordmark, the footer, page titles, the admin title, email
 * subjects, structured data — reads it from here, so renaming the shop is one environment variable
 * rather than a search across the codebase.
 *
 * `NEXT_PUBLIC_` because the wordmark renders in client components too: Next inlines the value at
 * build time, so changing it needs a rebuild, like `NEXT_PUBLIC_SERVER_URL`.
 */
export const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME?.trim() || 'Aurum'
