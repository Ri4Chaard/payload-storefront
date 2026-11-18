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
  alt: 'A placeholder photograph',
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
 * Muted, looping, inline — and with no controls, which is every slot on the page.
 *
 * **Scroll it out of view and reload to see the rule that matters.** The file is not requested
 * until the frame intersects the viewport, so a band a visitor never reaches costs them nothing
 * (FR-024a). The network panel is where this story is actually read.
 */
export const Default: Story = {}

/**
 * The same component behind a step tile, which is where controls looked worst: a scrub bar and a
 * play button laid across a photograph of a workbench.
 *
 * There is no `controls` story to compare it against any more, because there is no longer a slot
 * that would use one — see the component's note on FR-023 and on what removing them costs.
 */
export const StepTile: Story = {
  decorators: [
    (Story) => (
      <div className="relative h-35 w-full overflow-hidden rounded-md md:h-40 xl:h-75">
        <Story />
      </div>
    ),
  ],
}

/**
 * With `prefers-reduced-motion: reduce`, nothing plays and the file is never fetched (FR-024).
 *
 * The poster is not a fallback here — it is the whole rendering, permanently, for that visitor.
 * Toggle the OS setting and reload; the `<video>` element never enters the DOM.
 */
export const ReducedMotion: Story = {
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
  args: { poster: { ...poster, alt: undefined } },
}
