import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import React from 'react'

import { typeScale } from '@tokens/mapping'

/**
 * FR-029 — the type scale, each style labelled with its token name.
 *
 * Two things this page is deliberately explicit about:
 *
 * 1. The display face is Playfair Display, a PLACEHOLDER. The design specifies TT Ramillas, whose
 *    supplied file is a trial licence that cannot ship.
 * 2. The export's names described Figma layers, not typographic roles — `h3-medium` was 16px body
 *    text. Every remapped style shows what it was called before, so a designer reading this page
 *    can find the style they know.
 */
const SPECIMEN = 'Ceylon sapphire, hand-set in eighteen-carat gold'

function Row({ token }: { token: (typeof typeScale)[number] }) {
  const size = Array.isArray(token.size)
    ? `${token.size[0]}→${token.size[1]}px (fluid)`
    : `${token.size}px`

  return (
    <div className="border-b border-black/5 py-5">
      <div className="text-caption text-neutral-secondary mb-2 flex flex-wrap gap-x-4">
        <code>text-{token.name}</code>
        <span>{size}</span>
        <span>{token.lineHeight} line-height</span>
        <span>{token.weight} weight</span>
        <span>{token.family === 'display' ? 'display face' : 'body face'}</span>
        {token.uppercase ? <span>uppercase</span> : null}
      </div>
      <p
        style={{
          fontFamily: `var(--font-brand-${token.family})`,
          fontSize: `var(--text-${token.name})`,
          lineHeight: `var(--text-${token.name}--line-height)`,
          fontWeight: `var(--text-${token.name}--font-weight)`,
          textTransform: token.uppercase ? 'uppercase' : 'none',
        }}
      >
        {SPECIMEN}
      </p>
      {token.reason ? (
        <p className="text-caption text-neutral-secondary mt-2 max-w-prose">{token.reason}</p>
      ) : null}
    </div>
  )
}

function Scale() {
  return (
    <div className="p-8">
      <h1 className="text-heading-1 mb-2">Typography</h1>
      <p className="text-body-base text-neutral-secondary mb-4 max-w-prose">
        All text uses a named style. Arbitrary font sizes fail lint. Display sizes are fluid — they
        interpolate between the mobile and desktop values with <code>clamp()</code>, so no component
        needs a breakpoint override. Resize this panel to watch them move.
      </p>
      <p className="text-body-small mb-8 max-w-prose rounded-md bg-status-error-transparent p-4">
        <strong>The display face is a placeholder.</strong> The design specifies TT Ramillas, and the
        supplied file is a trial licence that prohibits commercial use. Playfair Display stands in
        until the licence is purchased — swapping it is one loader call.
      </p>
      {typeScale.map((token) => (
        <Row key={token.name} token={token} />
      ))}
    </div>
  )
}

const meta = {
  title: 'Foundations/Typography',
  component: Scale,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof Scale>

export default meta

export const TypeScale: StoryObj<typeof meta> = {}
