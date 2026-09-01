import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  // Aliases come from tsconfig.json rather than being restated here — one definition, so the
  // editor, the type checker, Vitest, and Storybook can never disagree about what `@tokens` means.
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      // See tests/stubs/server-only.ts — the real package throws outside a bundler context.
      'server-only': new URL('./tests/stubs/server-only.ts', import.meta.url).pathname,
    },
  },
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
    reporters: 'default',
  },
})
