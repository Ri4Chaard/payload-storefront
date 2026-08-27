import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import React from 'react'

import { borderGuidance, colors } from '@tokens/mapping'

/**
 * FR-029 — the complete palette, labelled with token names and provenance.
 *
 * Provenance is shown deliberately: `colors.json` turned out to be stale on the one token that
 * could be compared against Figma, so "where did this value come from" is a question this page
 * should answer rather than leave to archaeology.
 */
const PROVENANCE_LABEL: Record<string, string> = {
  figma: 'read from Figma',
  supplied: 'from colors.json',
  remapped: 'renamed',
  derived: 'invented to fill a gap',
  unverified: '⚠ never verified against Figma',
}

function Swatch({ name }: { name: string }) {
  const token = colors.find((c) => c.name === name)!
  return (
    <div className="flex items-start gap-4 border-b border-black/5 py-3">
      <div
        className="size-14 shrink-0 rounded-md border border-black/10"
        style={{ backgroundColor: `var(--color-${token.name})` }}
      />
      <div className="min-w-0">
        <div className="text-body-medium">--color-{token.name}</div>
        <div className="text-body-small text-neutral-secondary">
          <code>{token.value}</code> · {PROVENANCE_LABEL[token.provenance]}
        </div>
        {token.reason ? (
          <p className="text-caption text-neutral-secondary mt-1 max-w-prose">{token.reason}</p>
        ) : null}
      </div>
    </div>
  )
}

function Palette() {
  const groups = [
    { title: 'Brand', prefix: 'primary-' },
    { title: 'Neutral', prefix: 'neutral-' },
    { title: 'Surfaces', prefix: 'background-' },
    { title: 'Status', prefix: 'status-' },
  ]

  return (
    <div className="p-8">
      <h1 className="text-heading-1 mb-2">Colour</h1>
      <p className="text-body-base text-neutral-secondary mb-8 max-w-prose">
        Every colour in the interface refers to one of these tokens. Raw hex values fail lint. The
        permitted combinations — and the ones that are forbidden — are on the Contrast page.
      </p>

      {groups.map((group) => {
        const members = colors.filter((c) => c.name.startsWith(group.prefix))
        if (members.length === 0) return null
        return (
          <section key={group.title} className="mb-10">
            <h2 className="text-eyebrow mb-3">{group.title}</h2>
            {members.map((c) => (
              <Swatch key={c.name} name={c.name} />
            ))}
          </section>
        )
      })}

      <section className="mb-10">
        <h2 className="text-eyebrow mb-3">Borders — not tokens</h2>
        <p className="text-body-small text-neutral-secondary mb-4 max-w-prose">
          Figma stores borders as raw colours with opacity applied at the use site, which is exactly
          how Tailwind&rsquo;s opacity modifiers work. Defining tokens would duplicate built-ins.
        </p>
        <ul className="text-body-small space-y-2">
          {Object.entries(borderGuidance).map(([role, utility]) => (
            <li key={role} className="flex items-center gap-3">
              <span className={`inline-block h-6 w-16 rounded-sm border-2 ${utility}`} />
              <code>{utility}</code>
              <span className="text-neutral-secondary">{role}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

const meta = {
  title: 'Foundations/Colour',
  component: Palette,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof Palette>

export default meta

export const AllColours: StoryObj<typeof meta> = {}
