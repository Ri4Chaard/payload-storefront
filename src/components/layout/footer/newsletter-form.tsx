'use client'

import React from 'react'

import { Button } from '@/components/ui/button'
import { TextInput } from '@/components/ui/text-input'

/**
 * The footer's newsletter sign-up (nodes 196:576–196:579).
 *
 * Both halves already existed. The field is `TextInput` in its inverse tone; the button is the
 * `inverse` variant with the `reveal` hover — which IS node 312:9907, the ellipse that sweeps up
 * from below. Nothing new is styled here.
 *
 * **Not wired to anything.** Submission is prevented rather than left to reload the page, which is
 * what an un-wired form otherwise does. T077 connects it, along with the success and unsubscribe
 * states — neither of which appears in this Figma node.
 *
 * The label is hidden, not absent. The design shows a placeholder-only field; a placeholder
 * disappears the moment someone types, so the name lives in the accessibility tree instead.
 */
export function NewsletterForm() {
  return (
    <form
      className="flex w-full flex-col gap-2.5"
      onSubmit={(event) => event.preventDefault()}
      aria-label="Newsletter sign-up"
    >
      <TextInput
        label="Email address"
        hideLabel
        tone="inverse"
        type="email"
        name="email"
        autoComplete="email"
        placeholder="EMAIL"
        required
      />
      <Button type="submit" variant="inverse" hoverEffect="reveal" fullWidth className="uppercase">
        Subscribe
      </Button>
    </form>
  )
}
