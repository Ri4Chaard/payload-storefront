import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  // Aliases come from tsconfig.json rather than being restated here — one definition, so the
  // editor, the type checker, Vitest, and Storybook can never disagree about what `@tokens` means.
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
    reporters: 'default',
  },
})
