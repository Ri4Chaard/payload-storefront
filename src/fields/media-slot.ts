import type { Field } from 'payload'

/**
 * A photograph or a video, in the same frame (spec 006, FR-018 – FR-025).
 *
 * One definition, used by every block that shows imagery — the media plate, the closer-look panel,
 * the banner's backdrop and each process step. The drawn page uses seven of them. Constitution II
 * is explicit that repeated field groups become a reusable config, and seven near-identical copies
 * is exactly the shape it forbids.
 *
 * **`kind` decides, never presence.** An editor who switches to video and back leaves both a
 * photograph and a video behind, and "whichever is filled in" would then render whichever the last
 * person happened to touch. The stored kind is the answer (FR-020).
 *
 * **Video comes from the media library and nowhere else.** Both branches are `upload` relationships
 * to `media`. There is no text field in this config, which is the structural form of FR-021: an
 * address cannot be pasted into a slot because there is nothing to paste it into. The requester
 * asked for exactly this after first asking for pasted links, and the constraint bought a great
 * deal — no third-party player against the JavaScript budget, no consent gating, and muted-autoplay
 * background video that actually behaves.
 *
 * **The poster is required for a video, and it is doing four jobs.** It holds the slot's box before
 * anything loads (FR-024b), it is what a reduced-motion visitor sees instead of playback (FR-024),
 * it is what shows while the file is still being withheld below the fold (FR-024a), and it is what
 * survives a video deleted from the library. Requiring it is what lets one render path serve both
 * kinds — see `src/components/ui/media/`.
 *
 * **Why `validate` and not `required`.** `required` is static; `admin.condition` only HIDES a field.
 * A statically-required field that is conditionally hidden cannot be saved at all when hidden, which
 * would make a photograph slot unsavable because it has no video. Conditional obligation has to be
 * a validator, and the message it returns is FR-027's "tell the editor which slot is at fault" —
 * Payload renders it against the field, inside the block, in the admin.
 *
 * Alternative text is deliberately NOT a field here. It lives on the `media` document, where it is
 * already required, so one asset carries one description wherever it is used (FR-025). A copy per
 * slot would be seven chances to describe the same photograph differently.
 */

/** `siblingData` is the slot's own group, whatever block it is nested in. */
type Slot = { kind?: 'photo' | 'video' }

const isVideo = (siblingData: unknown): boolean => (siblingData as Slot | undefined)?.kind === 'video'

export const mediaSlot = ({
  name = 'media',
  label = 'Media',
  description = 'A photograph, or a video from the media library.',
}: { name?: string; label?: string; description?: string } = {}): Field => ({
  /**
   * Overridable since 007/T010, where the article's slot is `hero` rather than `media`.
   *
   * A block that holds exactly one piece of imagery calls it `media` and always will. A document
   * that could hold several — an article has a hero today and might have an author portrait
   * tomorrow — needs the field to say which one it is. Extending the shared config with a parameter
   * is what Constitution II asks for; a second near-identical field config is what it forbids.
   */
  name,
  type: 'group',
  label,
  admin: { description },
  fields: [
    {
      name: 'kind',
      type: 'radio',
      required: true,
      defaultValue: 'photo',
      label: 'Show',
      options: [
        { label: 'A photograph', value: 'photo' },
        { label: 'A video', value: 'video' },
      ],
      admin: {
        description: 'Decides what this slot renders, even if both are filled in below.',
      },
    },
    {
      name: 'photo',
      type: 'upload',
      relationTo: 'media',
      label: 'Photograph',
      admin: {
        condition: (_data, siblingData) => !isVideo(siblingData),
      },
    },
    {
      name: 'video',
      type: 'upload',
      relationTo: 'media',
      label: 'Video',
      admin: {
        condition: (_data, siblingData) => isVideo(siblingData),
        description: 'Upload the video to the media library first, then choose it here.',
      },
      validate: (value: unknown, { siblingData }: { siblingData: unknown }) => {
        if (!isVideo(siblingData)) return true
        return value ? true : 'This slot is set to video — choose a video from the media library.'
      },
    },
    {
      name: 'poster',
      type: 'upload',
      relationTo: 'media',
      label: 'Still image',
      admin: {
        condition: (_data, siblingData) => isVideo(siblingData),
        description:
          'Shown before the video plays, and instead of it for visitors who ask for reduced motion. Required for a video.',
      },
      validate: (value: unknown, { siblingData }: { siblingData: unknown }) => {
        if (!isVideo(siblingData)) return true
        return value ? true : 'A video slot needs a still image, or the band cannot hold its space.'
      },
    },
  ],
})
