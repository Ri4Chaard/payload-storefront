import tsconfigPaths from 'vite-tsconfig-paths'

import type { StorybookConfig } from '@storybook/nextjs-vite'

/**
 * Storybook is the living style guide (FR-029 – FR-033).
 *
 * It replaces the /style-guide route an earlier revision of the plan chose. The deciding factor is
 * the workflow: components arrive one at a time and are built in isolation before anything consumes
 * them. A route renders finished components on a page; Storybook is a bench for an unfinished one.
 *
 * It is NEVER deployed to the production domain — stronger than the route's env-flag, which still
 * shipped code.
 */
const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-a11y'],
  framework: {
    name: '@storybook/nextjs-vite',
    options: {},
  },
  staticDirs: ['../public'],

  // Aliases come from tsconfig.json, so `@/` and `@tokens/` mean the same thing in a story as they
  // do in the app.
  viteFinal: async (config) => {
    config.plugins = [...(config.plugins ?? []), tsconfigPaths()]
    return config
  },
}

export default config
