/**
 * Constitution III — "Design Tokens Over Magic Values".
 *
 * Visual consistency is enforced by the system, not by discipline. These rules make a raw hex or a
 * one-off pixel size fail the build rather than depend on a reviewer noticing it.
 *
 * The generated token file is the one place raw values legitimately live; it is excluded in
 * eslint.config.mjs. CSS files are guarded separately by scripts/check-styles.ts, since ESLint does
 * not parse CSS.
 */

const RAW_COLOR = /#[0-9a-fA-F]{3,8}\b|\brgba?\s*\(|\bhsla?\s*\(|\boklch\s*\(/
// Tailwind arbitrary values: text-[13px], text-[0.8rem]
const ARBITRARY_FONT_SIZE = /\btext-\[[^\]]*(?:px|rem|em|pt)\]/
// Tailwind arbitrary spacing on any spacing-ish utility
const ARBITRARY_SPACING =
  /\b(?:p|m|gap|space|inset|top|right|bottom|left|w|h|size|translate)[trblxyse]?-\[[^\]]*(?:px|rem|em)\]/

const STYLE_PROPS_FONT = new Set(['fontSize'])
const STYLE_PROPS_SPACING = new Set([
  'margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
  'padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'gap', 'rowGap', 'columnGap', 'width', 'height', 'top', 'right', 'bottom', 'left',
])
const STYLE_PROPS_COLOR = new Set([
  'color', 'backgroundColor', 'borderColor', 'fill', 'stroke', 'outlineColor',
])

/** Walk every string the source contains — plain literals and template chunks alike. */
function stringVisitor(context, test, message) {
  const report = (node, value) => {
    if (typeof value === 'string' && test.test(value)) {
      context.report({ node, message })
    }
  }
  return {
    Literal(node) {
      report(node, node.value)
    },
    TemplateElement(node) {
      report(node, node.value?.raw)
    },
  }
}

/** Inline style objects bypass class strings entirely, so they need their own check. */
function stylePropVisitor(context, propNames, valueTest, message) {
  return {
    Property(node) {
      const key = node.key?.name ?? node.key?.value
      if (!propNames.has(key)) return
      const value = node.value?.value
      if (typeof value !== 'string') return
      if (valueTest && !valueTest.test(value)) return
      context.report({ node, message })
    },
  }
}

const UNIT = /\d\s*(px|rem|em|pt)\b/

export default {
  rules: {
    'no-raw-color': {
      meta: {
        type: 'problem',
        docs: { description: 'Colours must reference design tokens, never raw values (FR-010).' },
        schema: [],
      },
      create(context) {
        const msg =
          'Raw colour value. Use a design token (e.g. text-primary-default, bg-background-bg) — see contracts/design-tokens.md.'
        return {
          ...stringVisitor(context, RAW_COLOR, msg),
          ...stylePropVisitor(context, STYLE_PROPS_COLOR, RAW_COLOR, msg),
        }
      },
    },

    'no-arbitrary-font-size': {
      meta: {
        type: 'problem',
        docs: { description: 'Text must use a named type style, never an arbitrary size (FR-016).' },
        schema: [],
      },
      create(context) {
        const msg =
          'Arbitrary font size. Use a named type style (display, heading-1…4, body-base, body-small, label, caption, eyebrow, heading-sans).'
        return {
          ...stringVisitor(context, ARBITRARY_FONT_SIZE, msg),
          ...stylePropVisitor(context, STYLE_PROPS_FONT, UNIT, msg),
        }
      },
    },

    'no-arbitrary-spacing': {
      meta: {
        type: 'problem',
        docs: { description: 'Spacing must come from the scale, never arbitrary values (FR-018).' },
        schema: [],
      },
      create(context) {
        const msg =
          'Arbitrary spacing value. Use the spacing scale (p-4, gap-6) or a brand token (spacing-brand-18, spacing-button).'
        return {
          ...stringVisitor(context, ARBITRARY_SPACING, msg),
          ...stylePropVisitor(context, STYLE_PROPS_SPACING, UNIT, msg),
        }
      },
    },
  },
}
