import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import React from 'react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'

import { Drawer } from './drawer'

/**
 * Node 532:12507 — the filter panel's shell. The content here stands in for what `FilterDrawer`
 * will put inside it; the primitive itself knows nothing about filters.
 *
 * Open by default, because a story of a closed drawer is a story of an empty iframe — and because
 * the sweep in `tests/a11y/ui-kit.spec.ts` has to see the panel to audit it.
 */
const GROUPS = [
  { label: 'CATEGORY:', options: ['All jewelry', 'Category 1', 'Category 2', 'Category 3', 'Category 4'] },
  { label: 'COLOR:', options: ['Black', 'Clear', 'Green', 'Multicolor'] },
  { label: 'SHAPE:', options: ['Round', 'Oval', 'Emerald', 'Pear', 'Marquise'] },
  { label: 'COLLECTION:', options: ['Deia', 'Marvel', 'Molten', 'Spartan'] },
]

function Groups() {
  return (
    <>
      {GROUPS.map((group) => (
        <fieldset key={group.label} className="border-b border-black/10 py-5 last:border-b-0">
          <legend className="text-label text-neutral-primary pt-4">{group.label}</legend>
          <div className="flex flex-col gap-2.5">
            {group.options.map((option) => (
              <Checkbox key={option} label={option} />
            ))}
          </div>
        </fieldset>
      ))}
    </>
  )
}

const meta = {
  title: 'UI/Drawer',
  component: Drawer,
  parameters: { layout: 'fullscreen' },
  args: {
    open: true,
    onClose: () => {},
    title: 'Filters',
    children: <Groups />,
  },
  render: function Render(args) {
    const [open, setOpen] = React.useState(args.open)
    const triggerRef = React.useRef<HTMLButtonElement>(null)

    return (
      <div className="min-h-svh p-10">
        <Button ref={triggerRef} variant="outline" onClick={() => setOpen(true)}>
          Filters
        </Button>
        <Drawer {...args} open={open} onClose={() => setOpen(false)} triggerRef={triggerRef} />
      </div>
    )
  },
} satisfies Meta<typeof Drawer>

export default meta
type Story = StoryObj<typeof meta>

/** As drawn — heading, scrolling groups, and the two actions pinned below them. */
export const Default: Story = {
  args: {
    footer: (
      <>
        <Button variant="outline" fullWidth type="reset">
          Clear
        </Button>
        <Button variant="primary" fullWidth type="submit">
          Apply
        </Button>
      </>
    ),
  },
}

/** Without a footer the body fills the panel. */
export const WithoutActions: Story = {}

/** From the other edge, for a panel that belongs to something on the right. */
export const FromTheRight: Story = { args: { ...Default.args, side: 'right' } }

/**
 * The no-JavaScript path (FR-029). As a form, the panel's controls and its `APPLY` are one
 * submission, so the browser builds the filtered URL without any script running.
 */
export const AsAForm: Story = {
  args: { ...Default.args, asForm: true, formProps: { method: 'get', action: '/all-jewelry' } },
}

/** Closed: `display: none`, so it is out of the tab order and the accessibility tree. */
export const Closed: Story = { args: { ...Default.args, open: false } }
