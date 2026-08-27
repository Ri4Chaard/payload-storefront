import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import React from 'react'

import {
  acceptedExceptions,
  acceptedOpacityExceptions,
  colors,
  permittedPairings,
} from '@tokens/mapping'

/**
 * FR-031 — the measured contrast ratio beside each permitted pairing.
 *
 * This page validates the *declared* pairings, not the cartesian product. A combination absent from
 * the table is not a failure — it is simply not permitted, and using one is a review defect. That
 * distinction is what lets a colour be legitimate on a dark surface and forbidden on a light one.
 *
 * The same list drives `pnpm check:contrast` in CI, so this page cannot drift from the gate.
 */
const byName = new Map(colors.map((c) => [c.name, c.value]))

function channel(value: number) {
  const c = value / 255
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

function luminance(hex: string) {
  const h = hex.replace('#', '').slice(0, 6)
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16))
  return 0.2126 * channel(r!) + 0.7152 * channel(g!) + 0.0722 * channel(b!)
}

function ratio(a: string, b: string) {
  const [la, lb] = [luminance(a), luminance(b)]
  const [hi, lo] = la > lb ? [la, lb] : [lb, la]
  return (hi + 0.05) / (lo + 0.05)
}

function Sample({
  foreground,
  background,
  minimum,
  note,
  exception,
}: {
  foreground: string
  background: string
  minimum: number
  note?: string
  exception?: string
}) {
  const value = ratio(byName.get(foreground)!, byName.get(background)!)
  const passes = value >= minimum

  return (
    <div className="border-b border-black/5 py-3">
      <div className="flex flex-wrap items-center gap-4">
        <div
          className="flex h-14 w-56 shrink-0 items-center justify-center rounded-md border border-black/10"
          style={{
            backgroundColor: `var(--color-${background})`,
            color: `var(--color-${foreground})`,
          }}
        >
          <span className="text-body-medium">Sample text</span>
        </div>
        <div className="min-w-0">
          <div className="text-body-small">
            <code>{foreground}</code> on <code>{background}</code>
          </div>
          <div className="text-body-small">
            <strong>{value.toFixed(2)}:1</strong>{' '}
            <span className="text-neutral-secondary">
              (minimum {minimum}) {exception ? '— accepted exception' : passes ? '✓' : '✗'}
            </span>
          </div>
        </div>
      </div>
      {(note ?? exception) ? (
        <p className="text-caption text-neutral-secondary mt-2 max-w-prose">{note ?? exception}</p>
      ) : null}
    </div>
  )
}

function Contrast() {
  return (
    <div className="p-8">
      <h1 className="text-heading-1 mb-2">Contrast</h1>
      <p className="text-body-base text-neutral-secondary mb-8 max-w-prose">
        Every permitted pairing, measured. 4.5:1 for body text, 3:1 for large text, icons, and
        interface boundaries. <code>pnpm check:contrast</code> validates this same list in CI, so a
        pairing that renders here has already passed the gate.
      </p>

      <h2 className="text-eyebrow mb-3">Permitted</h2>
      {permittedPairings.map((p) => (
        <Sample key={`${p.foreground}-${p.background}`} {...p} />
      ))}

      <h2 className="text-eyebrow mt-10 mb-3">Accepted exceptions</h2>
      <p className="text-body-small text-neutral-secondary mb-4 max-w-prose">
        Below AA, kept as designed by owner decision. These are exceptions of record — allowlisted
        with a written reason so the gate still blocks any <em>new</em> undeclared failure.
      </p>
      {acceptedExceptions.map((p) => (
        <Sample key={`${p.foreground}-${p.background}`} {...p} exception={p.reason} />
      ))}
      {acceptedOpacityExceptions.map((e) => (
        <div key={e.description} className="border-b border-black/5 py-3">
          <div className="text-body-small">{e.description}</div>
          <div className="text-body-small">
            <strong>{e.ratio}:1</strong>{' '}
            <span className="text-neutral-secondary">(minimum 4.5) — accepted exception</span>
          </div>
          <p className="text-caption text-neutral-secondary mt-2 max-w-prose">{e.reason}</p>
        </div>
      ))}
    </div>
  )
}

const meta = {
  title: 'Foundations/Contrast',
  component: Contrast,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof Contrast>

export default meta

export const PermittedPairings: StoryObj<typeof meta> = {}
