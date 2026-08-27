import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import React from 'react'

import { breakpoints, motion, radii, shadows, spacing } from '@tokens/mapping'

/**
 * FR-029 — spacing, radii, shadows, breakpoints, and motion, each labelled with its token name.
 *
 * The spacing scale is Tailwind's 4px base rather than the export's, because the export's `spacing`
 * block was two zero-valued Figma artefacts and two isolated values — not a scale. The two
 * meaningful brand values survive as named exceptions.
 */
const STEPS = [1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24]

function Scales() {
  return (
    <div className="p-8">
      <h1 className="text-heading-1 mb-8">Scales</h1>

      <section className="mb-12">
        <h2 className="text-eyebrow mb-3">Spacing</h2>
        <p className="text-body-small text-neutral-secondary mb-4 max-w-prose">
          4px base. Arbitrary spacing values fail lint.
        </p>
        <div className="space-y-2">
          {STEPS.map((step) => (
            <div key={step} className="flex items-center gap-4">
              <code className="text-caption w-16 shrink-0">p-{step}</code>
              <div
                className="h-4 rounded-sm bg-primary-default"
                style={{ width: `calc(var(--spacing) * ${step})` }}
              />
              <span className="text-caption text-neutral-secondary">{step * 4}px</span>
            </div>
          ))}
        </div>
        <h3 className="text-label mt-6 mb-2">Brand exceptions</h3>
        <ul className="text-body-small space-y-1">
          {Object.entries(spacing.brand).map(([name, value]) => (
            <li key={name}>
              <code>--spacing-{name}</code> — {value}
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-12">
        <h2 className="text-eyebrow mb-3">Radii</h2>
        <div className="flex flex-wrap gap-6">
          {Object.entries(radii).map(([name, value]) => (
            <div key={name}>
              <div
                className="size-20 border border-black/10 bg-background-subtle"
                style={{ borderRadius: `var(--radius-${name})` }}
              />
              <div className="text-caption mt-2">
                <code>rounded-{name}</code>
                <div className="text-neutral-secondary">{value}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-eyebrow mb-3">Elevation</h2>
        <p className="text-body-small text-neutral-secondary mb-4 max-w-prose">
          Deliberately subtle — the palette is warm and low-contrast, and heavy shadows read as
          foreign against it.
        </p>
        <div className="flex flex-wrap gap-8">
          {Object.keys(shadows).map((name) => (
            <div key={name}>
              <div
                className="size-24 rounded-lg bg-background-container"
                style={{ boxShadow: `var(--shadow-${name})` }}
              />
              <code className="text-caption mt-3 block">shadow-{name}</code>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-eyebrow mb-3">Breakpoints</h2>
        <ul className="text-body-small space-y-1">
          {Object.entries(breakpoints).map(([name, value]) => (
            <li key={name}>
              <code>{name}</code> — {value}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-eyebrow mb-3">Motion</h2>
        <p className="text-body-small text-neutral-secondary mb-4 max-w-prose">
          All motion is suppressed globally under <code>prefers-reduced-motion: reduce</code>, so a
          component author cannot forget it.
        </p>
        <ul className="text-body-small space-y-1">
          {Object.entries(motion.duration).map(([name, value]) => (
            <li key={name}>
              <code>duration-{name}</code> — {value}
            </li>
          ))}
          {Object.entries(motion.ease).map(([name, value]) => (
            <li key={name}>
              <code>ease-{name}</code> — {value}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

const meta = {
  title: 'Foundations/Scales',
  component: Scales,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof Scales>

export default meta

export const SpacingAndShape: StoryObj<typeof meta> = {}
