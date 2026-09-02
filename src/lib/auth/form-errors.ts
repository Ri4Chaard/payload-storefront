import type { FieldValues, Path, UseFormReturn } from 'react-hook-form'

import type { ActionResult } from '@/lib/auth/actions'

/**
 * Put a server action's failure back where the customer is looking (spec 004).
 *
 * The forms validate with zod before submitting, so most of what arrives here could not have been
 * caught in the browser: an address that is already taken, a code that expired between the paste
 * and the click, a throttle. Those belong on the control they concern, in the same place a
 * client-side error would have appeared — not in a second, differently-styled banner that only ever
 * shows server problems.
 *
 * A failure with no field goes to `root`, which is RHF's slot for exactly this and which clears on
 * the next submit like any other error.
 *
 * Type-only import from a `'use server'` module: the type is erased, so no server code follows it
 * into the bundle.
 */
export function applyActionErrors<T extends FieldValues>(
  form: UseFormReturn<T>,
  result: Extract<ActionResult, { status: 'error' }>,
): void {
  const entries = Object.entries(result.fieldErrors ?? {})

  if (entries.length === 0) {
    form.setError('root', { message: result.message })
    return
  }

  for (const [field, key] of entries) {
    form.setError(field as Path<T>, { message: key })
  }
}

/**
 * Turn a message key from an action into the sentence a screen shows.
 *
 * The dictionary is passed in rather than imported, because the sentences live in the component
 * that renders them — there is no shared copy module, and there should not be one: these strings
 * are part of the screen, not content somebody edits.
 *
 * The fallback is deliberately the key itself. A key with no sentence should look wrong in review
 * rather than render as an empty space nobody notices.
 */
export function errorText(
  dictionary: Record<string, string>,
  key: string | undefined,
): string | undefined {
  if (!key) return undefined
  return dictionary[key] ?? key
}
