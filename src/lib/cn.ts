import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

import { typeScale } from '@tokens/mapping'

/**
 * Class merger for the UI kit — `cn(base, variant, props.className)`.
 *
 * tailwind-merge has to be TAUGHT our type scale. Out of the box its colour validator accepts any
 * unrecognised string, so `text-body-medium` is filed as a text COLOUR. A component setting
 * `text-body-medium text-neutral-white` would then look like two colours in conflict and one would
 * be silently dropped — a bug that shows up as "the button lost its font size" with nothing in the
 * source to explain it. Registering the scale under `font-size` keeps size and colour in separate
 * groups, which is what makes `<Button className="text-caption">` override the size and leave the
 * colour alone.
 *
 * The list comes from the token module rather than a literal, so a new type style cannot be added
 * to the scale and forgotten here.
 */
const textStyles = [...typeScale.map((token) => token.name), 'display-cased']

const merge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: textStyles }],
    },
  },
})

export function cn(...inputs: ClassValue[]): string {
  return merge(clsx(inputs))
}
