import React from 'react'

import { cn } from '@/lib/cn'
import { iconRegistry, type IconName } from '@/lib/icon-registry'

/**
 * FR-022 (T057) — the icon primitive. `name` is a fixed set: the union comes from the generated
 * registry, so a typo is a type error rather than a blank square in production.
 *
 * Colour is never a prop. Every glyph paints with `currentColor`, so an icon takes the colour of
 * the text around it and there is no way to hardcode a fill (contracts/ui-kit.md).
 *
 * Accessibility follows the label: without one the icon is decoration and is hidden from assistive
 * tech; with one it becomes a graphic with an accessible name. That default matters, because the
 * overwhelmingly common case — an icon beside its own label — is one where announcing the icon
 * would make a screen reader say everything twice.
 *
 * The set is NOT optically uniform: viewBoxes are 14, 20, 24 and — since the feature cards at node
 * 440:12774 — 50, across seven source libraries, so two icons at the same `size` will not read at
 * the same weight. The wrapper is the thing that normalises the box; matching the strokes needs a
 * designer.
 *
 * `size` stops at 24 because that is where the drawings stopped. The four 50-viewBox glyphs are
 * display-sized and change per breakpoint (30px on a phone, 50px above), which a prop cannot
 * express — they set their box with a class, as the header's icons do.
 */
export type IconSize = 'xs' | 'sm' | 'md' | 'lg'

const sizeClasses: Record<IconSize, string> = {
  // 12px. Added for the header's language caret (node 196:784), which is smaller than anything the
  // icon set was previously asked for.
  xs: 'size-3',
  sm: 'size-4',
  md: 'size-5',
  lg: 'size-6',
}

export interface IconProps extends Omit<React.ComponentProps<'svg'>, 'children'> {
  name: IconName
  size?: IconSize
  /** Supply only when the icon carries meaning no adjacent text already conveys. */
  label?: string
}

export function Icon({ name, size = 'md', label, className, ...props }: IconProps) {
  const { viewBox, body } = iconRegistry[name]

  return (
    <svg
      viewBox={viewBox}
      fill="none"
      focusable="false"
      aria-hidden={label ? undefined : true}
      role={label ? 'img' : undefined}
      aria-label={label}
      className={cn('shrink-0', sizeClasses[size], className)}
      // Build-time content from our own asset directory, validated by scripts/build-icons.ts to
      // contain no colour literals. Nothing user-supplied reaches this.
      dangerouslySetInnerHTML={{ __html: body }}
      {...props}
    />
  )
}
