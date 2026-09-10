import type { CollectionConfig } from 'payload'

import { revalidateOnChange, revalidateOnDelete } from '@/lib/revalidate'

/**
 * Uploads.
 *
 * The image sizes below are not arbitrary — the `Image` primitive's responsive `sizes` contract
 * depends on them, and the performance budget (FR-045) depends on the primitive. Changing a size
 * here without updating `src/components/ui/Image` breaks that contract silently.
 *
 * Widths track the breakpoint set in the token contract: 640 / 768 / 1024 / 1280, plus a thumbnail
 * for admin listings and a 1920 step for full-bleed imagery.
 */
export const Media: CollectionConfig = {
  slug: 'media',
  admin: {
    useAsTitle: 'alt',
    description: 'Images and files. Alternative text is required — an image without it is a defect.',
  },
  access: {
    // Public read: media is served to anonymous visitors. Everything else is admin-only.
    read: () => true,
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  upload: {
    /**
     * Photographs and video, in one library (spec 006, FR-021).
     *
     * **Video was added without a second collection, and the reason is in Payload's own upload
     * code.** `generateFileData.js` gates resizing on `fileSupportsResize || isImage(mimetype)`, so
     * a video upload skips `imageSizes` entirely and simply stores no `sizes`. Nothing below had to
     * change to accommodate it, and an owner has one library rather than two — which is what "paste
     * videos from media" asked for.
     *
     * **The two video types are named rather than `video/*`, deliberately.** A wildcard accepts
     * `.mov` and `.avi`, which the CMS would take happily and no browser would play: the refusal
     * would move from the upload dialog to the live page, where the editor is not looking. MP4 and
     * WebM are what `<video>` plays everywhere, so they are what the picker offers (FR-021b).
     *
     * A video document has no `sizes`, so anything reaching for `sizes.md.url` must branch on
     * mimetype first. That branch lives in `src/lib/story/mappers.ts`, once.
     */
    mimeTypes: ['image/*', 'video/mp4', 'video/webm'],
    focalPoint: true,
    imageSizes: [
      { name: 'thumbnail', width: 320, withoutEnlargement: true },
      { name: 'sm', width: 640, withoutEnlargement: true },
      { name: 'md', width: 768, withoutEnlargement: true },
      { name: 'lg', width: 1024, withoutEnlargement: true },
      { name: 'xl', width: 1280, withoutEnlargement: true },
      { name: 'full', width: 1920, withoutEnlargement: true },
    ],
  },
  // Publishing invalidates the cached routes (003/T294). A photograph is on both cached routes — the featured row and the gallery.
  hooks: {
    afterChange: [revalidateOnChange],
    afterDelete: [revalidateOnDelete],
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
      label: 'Alternative text',
      admin: {
        description:
          'Describes the image for screen readers and when the image fails to load. For a purely decorative image, enter a single space.',
      },
    },
  ],
}
