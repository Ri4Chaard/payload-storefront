import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { VideoMedia } from './video-media'

/**
 * The client half of `Media`. Normally reached through it — these stories exercise the leaf on its
 * own, because the two behaviours worth checking are invisible from the outside.
 *
 * `VideoMedia` fills its parent absolutely, so every story supplies the positioned box that `Media`
 * would otherwise provide.
 */
const poster = {
  src: '/photography/about.webp',
  width: 1920,
  height: 1080,
  alt: 'A hand wearing a solitaire ring',
}

const meta = {
  title: 'UI/VideoMedia',
  component: VideoMedia,
  parameters: { layout: 'fullscreen' },
  args: { src: '/media/sample.mp4', poster },
  decorators: [
    (Story) => (
      <div className="relative h-60 w-full overflow-hidden md:h-100 xl:h-132.5">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof VideoMedia>

export default meta
type Story = StoryObj<typeof meta>

/**
 * A backdrop: muted, looping, no controls.
 *
 * **Scroll it out of view and reload to see the rule that matters.** The file is not requested
 * until the frame intersects the viewport, so a band a visitor never reaches costs them nothing
 * (FR-024a). The network panel is where this story is actually read.
 */
export const Background: Story = { args: { background: true } }

/**
 * A video that is the subject of a band rather than its backdrop, so it offers controls.
 *
 * No block in the drawn composition sets this today. It exists because FR-023 permits it, and
 * because the alternative — controls appearing on a backdrop — is the failure worth guarding.
 */
export const WithControls: Story = { args: { background: false } }

/**
 * With `prefers-reduced-motion: reduce`, nothing plays and the file is never fetched (FR-024).
 *
 * The poster is not a fallback here — it is the whole rendering, permanently, for that visitor.
 * Toggle the OS setting and reload; the `<video>` element never enters the DOM.
 */
export const ReducedMotion: Story = {
  args: { background: true },
  parameters: {
    docs: {
      description: {
        story:
          'Enable reduced motion at the OS level and reload. No video element is rendered and no ' +
          'video bytes are requested.',
      },
    },
  },
}

/**
 * A poster that is decoration beside copy naming the same subject carries no alt text.
 */
export const DecorativePoster: Story = {
  args: { background: true, poster: { ...poster, alt: undefined } },
}
