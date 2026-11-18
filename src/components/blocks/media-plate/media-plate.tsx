import React from 'react'

import { Media } from '@/components/ui'
import type { StoryBlock } from '@/lib/story/types'

/**
 * A full-bleed photograph or video, from nodes `310:6772`, `413:7679`, `413:7984`.
 *
 * Edge to edge with no gutter — the one band that deliberately ignores `Container`, because the
 * drawing runs it the full width at every breakpoint.
 *
 * The heights are the drawn ones and they are FIXED rather than derived from the picture: 240 on a
 * phone, 400 at tablet, 530 at desktop. A band whose height followed its photograph's aspect ratio
 * would change shape every time an editor uploaded a different crop.
 *
 * `priority` is not set here even though this band is usually near the top. It is the caller's to
 * decide, because "usually near the top" stops being true the moment somebody reorders the page —
 * and a `priority` image below the fold costs a visitor bandwidth for nothing.
 */
export type MediaPlateBlockProps = Extract<StoryBlock, { type: 'media-plate' }> & {
  priority?: boolean
}

export function MediaPlateBlock({ media, priority = false }: MediaPlateBlockProps) {
  return <Media media={media} priority={priority} className="h-60 w-full md:h-100 xl:h-132.5" />
}
