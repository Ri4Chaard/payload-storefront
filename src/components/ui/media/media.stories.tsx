import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { Media } from './media'

/**
 * The frame every band on the story page shows its imagery through.
 *
 * The heights below are the drawn ones, and they belong to the CALLER — a band is 240 tall on a
 * phone and 530 at desktop whatever picture is in it. That is why every story sets its own box.
 */
const photo = {
  kind: 'photo' as const,
  src: '/photography/about.webp',
  width: 1920,
  height: 1080,
  alt: 'A hand wearing a solitaire ring',
}

const meta = {
  title: 'UI/Media',
  component: Media,
  parameters: { layout: 'fullscreen' },
  args: { media: photo },
} satisfies Meta<typeof Media>

export default meta
type Story = StoryObj<typeof meta>

/** The full-bleed plate: 240 / 400 / 530 across the three drawn widths. */
export const FullBleed: Story = {
  args: { className: 'h-60 w-full md:h-100 xl:h-132.5' },
}

/** The detail band's side panel, which is rounded and shares its row with the copy. */
export const Panel: Story = {
  args: { className: 'h-50 w-full rounded-md md:h-75 xl:h-123.75' },
}

/**
 * A banner's backdrop. `background` adds the scrim, and the reason it is not a designer's choice is
 * that nobody can measure contrast against a photograph an editor has not uploaded yet.
 */
export const Background: Story = {
  args: { background: true, className: 'h-95 w-full md:h-90 xl:h-132.5' },
  render: (args) => (
    <div className="relative">
      <Media {...args} />
      <p className="text-neutral-white text-display absolute inset-0 flex items-center p-10 uppercase">
        Selected for brilliance
      </p>
    </div>
  ),
}

/**
 * Decoration beside copy that already names it carries no alt text.
 *
 * The single space the admin stores for "decorative" is turned into an absent `alt` by the data
 * layer, so what arrives here is a media object with no `alt` at all.
 */
export const Decorative: Story = {
  args: {
    media: { ...photo, alt: undefined },
    className: 'h-50 w-full rounded-md',
  },
}
