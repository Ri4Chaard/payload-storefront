import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import React from 'react'

import { Field } from '@/components/ui/field'

import { Select, type SelectOption } from './select'

/**
 * Closed at node `301:4990`, open at `301:5845`, its rows at `301:5920`.
 *
 * Controlled, like every other control in the kit. The wrapper below supplies the state so the
 * stories behave the way the component does in a page rather than refusing to change.
 */
const SIZES: SelectOption[] = [
  { value: '3', label: '3', meta: 'In stock' },
  { value: '3.5', label: '3.5', meta: 'Made to order' },
  { value: '4', label: '4', meta: 'In stock' },
  { value: '4.5', label: '4.5', meta: 'In stock' },
  { value: '5', label: '5', meta: 'In stock' },
  { value: '5.5', label: '5.5', meta: 'In stock' },
  { value: '6', label: '6', meta: 'In stock' },
]

function Demo({ options, ...props }: { options: SelectOption[]; id: string; disabled?: boolean }) {
  const [value, setValue] = React.useState<string | null>(null)
  return (
    <div className="max-w-82.5">
      <Field id={props.id} label="Size:" disabled={props.disabled}>
        <Select {...props} options={options} value={value} onChange={setValue} />
      </Field>
    </div>
  )
}

const meta = {
  title: 'UI/Select',
  component: Select,
  parameters: { layout: 'padded' },
  args: { id: 'size', options: SIZES, value: null, onChange: () => {} },
  render: (args) => <Demo id={args.id} options={args.options} disabled={args.disabled} />,
} satisfies Meta<typeof Select>

export default meta
type Story = StoryObj<typeof meta>

/** Nothing chosen yet, so the trigger carries its placeholder rather than a value. */
export const Default: Story = {}

/**
 * A list longer than the panel, which is what brings out the scroll the drawing shows at
 * `301:5934`. The panel caps at 250px and scrolls; it does not grow off the screen.
 */
export const Scrolling: Story = {
  args: {
    options: Array.from({ length: 20 }, (_, index) => ({
      value: String(index + 1),
      label: `Size ${index + 1}`,
      meta: index % 4 === 1 ? 'Made to order' : 'In stock',
    })),
  },
}

/**
 * Options that cannot be chosen are DRAWN and skipped — by the pointer and by the arrow keys
 * (FR-040). Hiding them would turn a temporary shortage into a shorter catalogue.
 */
export const WithUnavailableOptions: Story = {
  args: {
    options: [
      { value: '3', label: '3', meta: 'In stock' },
      { value: '3.5', label: '3.5', meta: 'Out of stock', disabled: true },
      { value: '4', label: '4', meta: 'In stock' },
      { value: '4.5', label: '4.5', meta: 'Out of stock', disabled: true },
      { value: '5', label: '5', meta: 'In stock' },
    ],
  },
}

/** The whole control off, for a product that cannot be ordered at all. */
export const Disabled: Story = {
  args: { disabled: true },
}
