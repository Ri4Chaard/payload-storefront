/**
 * The semantic mapping layer.
 *
 * This is the ONLY place a human resolves the gap between what the design tool produced and what
 * the system needs. The exports beside it (colors.json, typography.json) are Figma output and must
 * never be hand-edited; the file this generates (src/styles/tokens.css) is generated and must never
 * be hand-edited either. One writer per stage.
 *
 * Every entry that is not a plain passthrough carries a `reason` naming the requirement that forced
 * it, so the owner can audit exactly what was invented versus supplied.
 *
 * ⚠ Source of truth is the FIGMA FILE (<figma-file-id>), not colors.json. The export is
 * stale — it gives neutral/secondary as #a7a5a3 where the live file says #343231, a near-inverse
 * that flips the whole accessibility analysis. Values marked `unverified` were never read from
 * Figma and should not be trusted until they are.
 */

// No `with { type: 'json' }` import attribute here, deliberately.
//
// esbuild (Vite's dev transform) downlevels it to the older `assert { type: 'json' }` syntax, which
// browsers have removed — the module then fails to parse and Storybook hangs on a spinner forever.
// It survives `storybook build` because the production path uses Rollup, so this is a dev-only
// divergence that a successful build does not catch. `resolveJsonModule` handles both contexts.
import colorsExport from './colors.json'
import typographyExport from './typography.json'

export type Provenance = 'supplied' | 'figma' | 'remapped' | 'derived' | 'unverified'

export interface ColorToken {
  name: string
  value: string
  provenance: Provenance
  reason?: string
  /** Backgrounds this colour may legally sit on. Empty means it is not a text/foreground colour. */
  surfaces?: string[]
}

export interface TypeToken {
  name: string
  family: 'display' | 'body'
  /** Fixed size in px, or a [mobile, desktop] pair rendered as clamp(). */
  size: number | [number, number]
  lineHeight: number
  weight: number
  uppercase?: boolean
  provenance: Provenance
  reason?: string
}

// ---------------------------------------------------------------------------
// Colour
// ---------------------------------------------------------------------------

const raw = colorsExport.colors

export const colors: ColorToken[] = [
  { name: 'primary-default', value: raw['primary-default'], provenance: 'figma' },
  {
    name: 'primary-hover',
    value: raw['primary-hover'],
    provenance: 'unverified',
    reason: 'Absent from every Figma node read so far; carried from the stale export.',
  },
  {
    name: 'primary-transparent',
    value: raw['primary-transparent'],
    provenance: 'unverified',
    reason: 'Absent from every Figma node read so far; carried from the stale export.',
  },

  { name: 'neutral-primary', value: raw['neutral-primary'], provenance: 'figma' },
  {
    name: 'neutral-secondary',
    // NOT raw['neutral-secondary'] — the export says #a7a5a3, which fails WCAG AA at 2.29:1 on the
    // page background. The live Figma file says #343231, which passes at 11.92:1.
    value: '#343231',
    provenance: 'figma',
    reason: 'Read from Figma. colors.json is stale and gives a near-inverse light grey (#a7a5a3).',
  },
  {
    name: 'neutral-placeholder',
    // The light grey the design actually draws placeholder copy in (node 255:3167). It is the
    // value `colors.json` carries for neutral-secondary, kept here under its own name rather than
    // reverting that token — everything else using neutral-secondary depends on the corrected
    // #343231, and a placeholder is the one place the owner has asked for the drawn grey.
    //
    // It is 2.29:1 on the page ground, which fails AA even at the 3:1 large-text threshold. Listed
    // in acceptedExceptions below.
    value: raw['neutral-secondary'],
    provenance: 'supplied',
    reason: 'Owner decision: the placeholder keeps the drawn grey. See acceptedExceptions.',
  },
  { name: 'neutral-white', value: raw['neutral-white'], provenance: 'figma' },

  { name: 'background-bg', value: raw['background-bg'], provenance: 'figma' },
  { name: 'background-container', value: raw['background-container'], provenance: 'figma' },
  {
    name: 'background-subtle',
    value: raw['background-subtle'],
    provenance: 'unverified',
    reason: 'Absent from every Figma node read so far; carried from the stale export.',
  },
  { name: 'background-base', value: raw['background-base'], provenance: 'figma' },

  // Status colours: the live Figma file uses #ff3b30 / #4cd964 with a 20% wash. The owner has
  // elected to keep the export's values. Recorded as a known divergence, not a discrepancy.
  {
    name: 'status-error-default',
    value: raw['status-error-default'],
    provenance: 'supplied',
    reason: 'Owner decision to keep colors.json. Figma uses #ff3b30.',
  },
  {
    name: 'status-error-transparent',
    value: raw['status-error-transparent'],
    provenance: 'supplied',
    reason: 'Owner decision to keep colors.json.',
  },
  {
    name: 'status-error-text',
    // The error red at a lightness that can carry words.
    //
    // `status-error-default` #f75959 is 3.01:1 on our light surfaces — correct for a border or an
    // icon, and an AA failure for body-size text. Error MESSAGES used to render in
    // `neutral-primary` for that reason, which was accessible and read as though nothing had gone
    // wrong: the words that explain the problem looked exactly like the words that do not.
    //
    // Same hue, same family, dropped to 44% lightness: 5.66:1 on `background-bg` and 6.06:1 on
    // `background-container`. The pair is deliberate — the control's border stays #f75959 so the
    // field still reads as wrong at a glance, and the sentence beneath it is legible.
    value: '#bf2222',
    provenance: 'derived',
    reason:
      'Derived from status-error-default so error text can be red and still meet AA (4.5:1) at body size.',
    surfaces: ['background-bg', 'background-container'],
  },
  {
    name: 'status-success-default',
    value: raw['status-success-default'],
    provenance: 'supplied',
    reason: 'Owner decision to keep colors.json. Figma uses #4cd964.',
  },
  {
    name: 'status-success-transparent',
    value: raw['status-success-transparent'],
    provenance: 'supplied',
    reason: 'Owner decision to keep colors.json.',
  },
]

/**
 * Look up a colour token by name.
 *
 * For the few places a colour must be a runtime JS value rather than a CSS variable — the browser
 * theme-colour meta tag, canvas, an email template. Those callers still go through the token system
 * instead of hardcoding, which is what keeps FR-011 true: changing a token propagates everywhere.
 */
export function colorValue(name: string): string {
  const token = colors.find((c) => c.name === name)
  if (!token) throw new Error(`Unknown colour token "${name}".`)
  return token.value
}

/**
 * Borders are deliberately NOT tokens.
 *
 * Figma stores them as raw colours with opacity applied at the use site — exactly how Tailwind's
 * opacity modifiers work. The export baked those opacities into the values, which is what produced
 * the invalid identifier `border-#ffffff`.
 *
 *   border/default  black at 10%  →  border-black/10   (export said #0000001a)
 *   border/subtle   black at  5%  →  border-black/5    (export said #0000000d)
 *   border/#FFFFFF  white at  8%  →  border-white/8    (export said #ffffff14, 7.84%)
 *
 * Defining tokens for these would duplicate built-in utilities.
 */
export const borderGuidance = {
  default: 'border-black/10',
  subtle: 'border-black/5',
  inverse: 'border-white/8',
} as const

// ---------------------------------------------------------------------------
// Typography
// ---------------------------------------------------------------------------

/**
 * Families are indirected through next/font variables, which self-host the files and generate
 * metric-adjusted fallbacks automatically — satisfying FR-014 (readable during load, no layout
 * shift on swap) more reliably than hand-tuned size-adjust values.
 *
 * `--font-display` is a PLACEHOLDER. The design specifies "TT Ramillas Trl" — a TRIAL licence that
 * prohibits commercial use. Playfair Display stands in until the licence is purchased. Swapping is
 * one loader call in src/app/(frontend)/layout.tsx; no component names a family directly.
 */
/**
 * The fallback INSIDE each var() is load-bearing, not belt-and-braces.
 *
 * next/font defines --font-playfair / --font-manrope on the element it is applied to. Anywhere that
 * element does not exist — Storybook before its decorator runs, an email template, a test harness —
 * an undefined variable makes the whole font-family declaration invalid at computed-value time, so
 * it INHERITS rather than falling through to Georgia. The result is a type specimen rendering in
 * whatever the host's default is, authoritatively wrong. The inner fallback keeps the declaration
 * valid no matter where it lands.
 */
export const fontFamilies = {
  display: "var(--font-playfair, 'Playfair Display'), Georgia, serif",
  body: "var(--font-manrope, 'Manrope'), system-ui, -apple-system, sans-serif",
} as const

const exported = Object.fromEntries(
  typographyExport.styles.textStyles.map((s) => [s.token, s]),
) as Record<string, { fontSize: string; lineHeight: number; fontWeight: string }>

const px = (token: string) => Number.parseFloat(exported[token]!.fontSize)
const lh = (token: string) => Number(exported[token]!.lineHeight.toFixed(2))

export const typeScale: TypeToken[] = [
  // Serif display scale. Desktop values are the export's; mobile values are evidenced — the mobile
  // main-page node uses H3/H4 where desktop uses H1/H2, a consistent two-step drop.
  {
    name: 'display',
    family: 'display',
    size: [24, px('h1')],
    lineHeight: lh('h1'),
    weight: 500,
    uppercase: true,
    provenance: 'remapped',
    reason: 'Export token `h1`. Fluid range from the mobile breakpoint two steps down.',
  },
  {
    name: 'heading-1',
    family: 'display',
    size: [20, px('h2')],
    lineHeight: lh('h2'),
    weight: 500,
    uppercase: true,
    provenance: 'remapped',
    reason: 'Export token `h2`.',
  },
  {
    name: 'heading-2',
    family: 'display',
    size: [18, px('h3')],
    lineHeight: lh('h3'),
    weight: 500,
    uppercase: true,
    provenance: 'remapped',
    reason: 'Export token `h3`.',
  },
  {
    name: 'heading-3',
    family: 'display',
    size: [16, px('h4')],
    lineHeight: lh('h4'),
    weight: 500,
    uppercase: true,
    provenance: 'remapped',
    reason: 'Export token `h4`.',
  },
  {
    name: 'heading-4',
    family: 'display',
    size: [15, 18],
    lineHeight: 1.4,
    weight: 500,
    uppercase: true,
    provenance: 'derived',
    reason: 'FR-015 requires four heading levels; the serif scale stops at 20px.',
  },

  // Sans headings, added from real usage in the footer (approved).
  {
    name: 'eyebrow',
    family: 'body',
    size: 18,
    lineHeight: 1.3,
    weight: 700,
    uppercase: true,
    provenance: 'derived',
    reason: 'Footer section title. Approved addition — the scale had no uppercase sans heading.',
  },
  {
    name: 'heading-sans',
    family: 'body',
    size: 22,
    lineHeight: 1.25,
    weight: 700,
    provenance: 'derived',
    reason: 'Footer sans heading. Approved addition.',
  },

  // Body scale.
  {
    name: 'body-base',
    family: 'body',
    size: px('h3-medium'),
    lineHeight: lh('h3-medium'),
    weight: 400,
    provenance: 'derived',
    reason:
      'The export has 500 and 700 at 16px but no regular weight. This is the most-used style on the site; its absence is an export omission.',
  },
  {
    name: 'body-medium',
    family: 'body',
    size: px('h3-medium'),
    lineHeight: lh('h3-medium'),
    weight: 500,
    provenance: 'remapped',
    reason: 'Export token `h3-medium` — 16px body text, not a heading despite the name.',
  },
  {
    name: 'body-strong',
    family: 'body',
    size: px('h3-bold'),
    lineHeight: lh('h3-bold'),
    weight: 700,
    provenance: 'remapped',
    reason: 'Export token `h3-bold`.',
  },
  {
    name: 'body-small',
    family: 'body',
    size: px('h-h'),
    lineHeight: lh('h-h'),
    weight: 400,
    provenance: 'remapped',
    reason: 'Export token `h-h`.',
  },
  {
    name: 'label',
    family: 'body',
    size: px('h-2'),
    lineHeight: lh('h-2'),
    weight: 600,
    provenance: 'remapped',
    reason: 'Export token `h-2`.',
  },
  {
    name: 'caption',
    family: 'body',
    size: 12,
    lineHeight: 1.4,
    weight: 400,
    provenance: 'derived',
    reason: 'FR-015 requires a caption style; absent from the export. Absorbs the 11px and 12px usages.',
  },
]

// ---------------------------------------------------------------------------
// Spacing, breakpoints, shape, motion
// ---------------------------------------------------------------------------

/**
 * The export's `spacing` block is {18, button, default: 0, number: 0} — two zero-valued Figma
 * artefacts and two isolated values. That is not the scale FR-018 requires, so the system scale is
 * Tailwind's 4px base and the two meaningful brand values are carried as named exceptions.
 */
export const spacing = {
  base: '0.25rem',
  brand: {
    'brand-18': '18px',
    button: '16px',
  },
} as const

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
} as const

/** Fluid type interpolates between these viewport widths. */
export const fluidRange = { min: 375, max: 1280 } as const

export const radii = {
  none: '0px',
  sm: '2px',
  md: '4px',
  lg: '8px',
  full: '9999px',
} as const

export const shadows = {
  sm: '0 1px 2px 0 rgb(5 3 1 / 0.04)',
  md: '0 4px 12px -2px rgb(5 3 1 / 0.06)',
  lg: '0 12px 32px -8px rgb(5 3 1 / 0.10)',
} as const

export const motion = {
  duration: { fast: '120ms', base: '200ms', slow: '320ms' },
  ease: {
    standard: 'cubic-bezier(0.2, 0, 0, 1)',
    emphasized: 'cubic-bezier(0.3, 0, 0, 1)',
  },
} as const

// ---------------------------------------------------------------------------
// Permitted pairings — the accessibility contract
// ---------------------------------------------------------------------------

export interface Pairing {
  foreground: string
  background: string
  /** 4.5 for body text, 3 for large text, icons, and interface boundaries. */
  minimum: number
  note?: string
}

/**
 * CI validates THESE pairings, not the cartesian product. A combination absent from this list is
 * not a failure — it is simply not permitted, and using one is a review defect.
 */
export const permittedPairings: Pairing[] = [
  { foreground: 'neutral-primary', background: 'background-bg', minimum: 4.5 },
  { foreground: 'neutral-primary', background: 'background-container', minimum: 4.5 },
  { foreground: 'neutral-primary', background: 'background-subtle', minimum: 4.5 },

  { foreground: 'neutral-secondary', background: 'background-bg', minimum: 4.5 },
  { foreground: 'neutral-secondary', background: 'background-container', minimum: 4.5 },
  { foreground: 'neutral-secondary', background: 'background-subtle', minimum: 4.5 },

  { foreground: 'primary-default', background: 'background-bg', minimum: 4.5 },
  { foreground: 'primary-default', background: 'background-container', minimum: 4.5 },
  { foreground: 'primary-default', background: 'background-subtle', minimum: 4.5 },
  { foreground: 'primary-hover', background: 'background-bg', minimum: 4.5 },
  { foreground: 'primary-hover', background: 'background-container', minimum: 4.5 },

  { foreground: 'neutral-white', background: 'background-base', minimum: 4.5 },
  { foreground: 'neutral-white', background: 'primary-default', minimum: 4.5 },
  { foreground: 'neutral-white', background: 'primary-hover', minimum: 4.5 },

  { foreground: 'status-success-default', background: 'background-bg', minimum: 4.5 },
  { foreground: 'status-success-default', background: 'background-container', minimum: 4.5 },

  {
    foreground: 'status-error-default',
    background: 'background-bg',
    minimum: 3,
    note: 'Icons, borders, and large text only — 3.01:1 fails AA for body text. Error message text uses status-error-text.',
  },
  {
    foreground: 'status-error-default',
    background: 'background-container',
    minimum: 3,
    note: 'Icons, borders, and large text only.',
  },

  // The text-safe sibling. Full AA, because these carry sentences rather than outlines.
  { foreground: 'status-error-text', background: 'background-bg', minimum: 4.5 },
  { foreground: 'status-error-text', background: 'background-container', minimum: 4.5 },
]

/**
 * Accepted exceptions — pairings that fall below AA and are kept as designed by owner decision.
 *
 * These are exceptions of record, not silent violations: the Governance section requires documented
 * deviations. The gate still blocks any NEW undeclared failure.
 */
export const acceptedExceptions: (Pairing & { reason: string })[] = [
  {
    foreground: 'neutral-placeholder',
    background: 'background-bg',
    minimum: 3,
    reason:
      'Search placeholder at 30px, 2.29:1 — below even the 3:1 large-text threshold. Owner elected to keep the drawn grey. The field carries a visually hidden label, so the placeholder is not the only description of the control.',
  },
  {
    foreground: 'status-success-default',
    background: 'background-base',
    minimum: 4.5,
    reason:
      'Footer newsletter success text, 4.15:1. Owner elected to keep the palette and the design as drawn.',
  },
]

/** Opacity-based foregrounds used on the dark footer, kept as designed. */
export const acceptedOpacityExceptions = [
  {
    description: 'neutral-white at 20% on background-base (footer unsubscribe note)',
    ratio: 1.71,
    reason: 'Decorative-weight text. Owner elected to keep the design as drawn.',
  },
] as const
