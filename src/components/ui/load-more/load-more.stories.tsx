import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { LoadMore } from './load-more'

/**
 * Undrawn (spec inconsistency 7, Open Question 1). A count of what is on screen against what there
 * is, and one control that adds twelve more — the pattern every jeweller of this size uses.
 *
 * The control is a link to `?page=N`, not a fetch: the listing already lives in its URL, so the
 * server renders the longer grid and the whole thing works with scripting off.
 *
 * Promoted out of `commerce/` by 007/T006 — the blog is its second consumer, and its props never
 * knew about products in the first place (`noun` is why).
 */
const meta = {
  title: 'UI/LoadMore',
  component: LoadMore,
  parameters: { layout: 'padded', nextjs: { appDirectory: true } },
  args: { shown: 12, total: 29, moreHref: '/all-products?page=2' },
} satisfies Meta<typeof LoadMore>

export default meta
type Story = StoryObj<typeof meta>

/** The first set of a longer listing. */
export const Default: Story = {}

/** Partway through. The count is the only thing that says the last press worked. */
export const PartWayThrough: Story = {
  args: { shown: 24, total: 29 },
}

/** Everything is on screen, so there is nothing left to press — the count stays. */
export const Complete: Story = {
  args: { shown: 29, total: 29, moreHref: null },
}

/** A listing that never needed a second set at all. */
export const ShorterThanOneSet: Story = {
  args: { shown: 8, total: 8, moreHref: null },
}
