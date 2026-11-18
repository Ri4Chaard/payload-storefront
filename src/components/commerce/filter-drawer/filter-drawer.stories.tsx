import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import React from 'react'

import {
  storyCategories,
  storyFacets,
  storyFilters,
} from '@/components/commerce/filter-toolbar/filter-toolbar.fixtures'

import { FilterDrawer } from './filter-drawer'

/**
 * The filter panel (node `532:12507`, footer `231:2322`, in context `225:1431`).
 *
 * Seven groups where Figma draws six: IN-STOCK ONLY is here because the toolbar only carries it at
 * `xl`, and a filter a phone cannot turn off is a filter a phone should not have. It is hidden at
 * `xl`, where the toolbar owns it — widen the preview past 1280 and the last group goes.
 *
 * Ticking a box edits a DRAFT. Nothing commits until APPLY, and closing the panel throws the draft
 * away (FR-022).
 */
const meta = {
  title: 'Commerce/FilterDrawer',
  component: FilterDrawer,
  // `useRouter` needs the App Router mock, which Storybook only mounts when it is told the
  // component belongs to `app/` rather than `pages/`.
  parameters: { layout: 'fullscreen', nextjs: { appDirectory: true } },
  /*
   * Every element this component renders is `position: fixed`, so the story's own root has no box
   * at all — and a root with no box is a story the render gate reads as having rendered nothing.
   * This line is what gives it one. The same fix `Pagination`'s single-page story needed.
   */
  decorators: [
    (Story) => (
      <div className="text-body-small text-neutral-secondary p-6">
        <p>The panel is pinned to the edge of the frame.</p>
        <Story />
      </div>
    ),
  ],
  args: {
    open: true,
    onClose: () => {},
    filters: storyFilters,
    facets: storyFacets,
    categories: storyCategories,
    clearHref: '/all-products',
    currentHref: '/all-products',
  },
} satisfies Meta<typeof FilterDrawer>

export default meta
type Story = StoryObj<typeof meta>

/** Open, with nothing applied — "All products" ticked because no category is. */
export const Default: Story = {}

/** Arrived from a filtered URL: the panel opens pre-ticked to match it (US4, scenario 5). */
export const PreTicked: Story = {
  args: {
    filters: {
      ...storyFilters,
      category: ['category-1'],
      colour: ['clear'],
      minPrice: 120_000,
      maxPrice: 730_000,
      inStock: true,
    },
  },
}

/**
 * Closed. It stays in the document with `display: none` rather than unmounting, because the form
 * inside it has to be server-rendered for a visitor with no scripting (FR-029).
 */
export const Closed: Story = {
  args: { open: false },
}
