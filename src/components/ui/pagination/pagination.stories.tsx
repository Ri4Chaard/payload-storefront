import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { Pagination } from './pagination'

/**
 * Nothing is drawn for pagination (spec inconsistency 7), so this is assembled from the kit: the
 * same 50px outline square the carousels and the full-screen viewer use for previous and next.
 *
 * Every page is a real address, which is what the back button and a crawler both need.
 */
const meta = {
  title: 'UI/Pagination',
  component: Pagination,
  parameters: { layout: 'centered' },
  args: {
    page: 1,
    totalPages: 5,
    hrefFor: (page: number) => (page === 1 ? '/rings' : `/rings?page=${page}`),
  },
} satisfies Meta<typeof Pagination>

export default meta
type Story = StoryObj<typeof meta>

/** The first page: the previous control is present but inert, so the row does not reflow. */
export const FirstPage: Story = {}

export const MiddlePage: Story = { args: { page: 3 } }

export const LastPage: Story = { args: { page: 5 } }

/** Seven or fewer are all shown — a gap that hides one number is worse than the number. */
export const SevenPages: Story = { args: { page: 4, totalPages: 7 } }

/** Beyond that, the two ends and the current page's neighbours, with the dropped range marked. */
export const ManyPages: Story = { args: { page: 12, totalPages: 40 } }

/** Near the start of a long listing: only one gap is needed. */
export const ManyPagesNearTheStart: Story = { args: { page: 2, totalPages: 40 } }

/**
 * One page is not a choice, so the component renders nothing at all — a control offering no
 * destinations is noise at the foot of every short listing in the shop.
 *
 * The caption is the story's, not the component's. A story that renders literally nothing fails
 * `tests/stories/ui-kit.spec.ts`, and rightly so: "renders nothing" and "is broken" look identical
 * from outside, which is the bug that gate was written for.
 */
export const SinglePage: Story = {
  args: { totalPages: 1 },
  render: (args) => (
    <div className="flex flex-col items-center gap-2.5">
      <p className="text-body-small text-neutral-secondary">
        One page — the component below renders nothing.
      </p>
      <Pagination {...args} />
    </div>
  ),
}
