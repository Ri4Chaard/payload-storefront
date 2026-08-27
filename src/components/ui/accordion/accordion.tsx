'use client'

import React from 'react'

import { Icon } from '@/components/ui/icon'
import { cn } from '@/lib/cn'

/**
 * The expandable detail row Figma calls "item info" (node 242:2382) — a dash, a bold label, a
 * plus/minus on the right, and a description that appears beneath. It is the product page's
 * description, delivery and warranty stack.
 *
 * Named `Accordion` rather than after the Figma frame because that is what it is, and a kit
 * component filed under a name nobody searches for gets rebuilt by the next person who needs one
 * (Constitution II). The Figma name is recorded here so a designer can still find it.
 *
 * Figma draws three variants and they are two states plus a hover:
 *
 *   off        node 242:2380   collapsed — trailing plus, hairline rule
 *   on         node 242:2381   expanded — trailing minus, description below
 *   Variant3   node 301:5400   identical to `off` except the rule is `primary-default`
 *
 * Variant3 differs from `off` in one property, so it is the hover, not a third kind of row. It is
 * applied to focus as well: a keyboard visitor gets the same signal a pointer does.
 *
 * **The description is NOT inside the button.** Figma exports the whole row as one `<button>`, which
 * would put a paragraph of copy inside the control's accessible name and make every word of it part
 * of what a screen reader announces before saying "collapsed". The header is the button; the panel
 * is a region the button owns through `aria-controls`.
 *
 * The panel stays in the DOM when closed and is collapsed with a `0fr → 1fr` grid row. Height
 * cannot be transitioned from `auto`, and the alternatives — measuring in an effect, or a fixed
 * max-height — either need JavaScript to be correct or clip long copy. `hidden` on the inner
 * wrapper keeps the closed copy out of the accessibility tree and out of tab order.
 *
 * The leading dash is the `minus` glyph in every state, exactly as drawn — decoration, not the
 * expand control. It is `aria-hidden` by virtue of carrying no label.
 */
export interface AccordionItemProps extends Omit<
  React.ComponentProps<'div'>,
  'title' | 'onToggle'
> {
  title: React.ReactNode
  /** Uncontrolled initial state. Ignored when `open` is supplied. */
  defaultOpen?: boolean
  /** Supply with `onToggle` to control the row from outside — that is how `Accordion` runs `single`. */
  open?: boolean
  onToggle?: (open: boolean) => void
  headingLevel?: 2 | 3 | 4
  disabled?: boolean
}

export function AccordionItem({
  title,
  defaultOpen = false,
  open,
  onToggle,
  headingLevel = 3,
  disabled = false,
  className,
  children,
  ...props
}: AccordionItemProps) {
  const [uncontrolled, setUncontrolled] = React.useState(defaultOpen)
  const isControlled = open !== undefined
  const isOpen = isControlled ? open : uncontrolled

  const id = React.useId()
  const Heading = `h${headingLevel}` as const

  function toggle() {
    if (!isControlled) setUncontrolled(!isOpen)
    onToggle?.(!isOpen)
  }

  return (
    <div
      className={cn(
        // Figma's Variant3 (node 301:5400) differs from the collapsed row in exactly one property:
        // the rule is `primary-default`. One property is a state, not a third kind of row, so it is
        // the hover — extended to focus, so a keyboard visitor gets the same signal a pointer does.
        'ease-standard border-b border-black/10 transition-colors duration-[var(--duration-fast)]',
        'hover:border-primary-default focus-within:border-primary-default',
        className,
      )}
      {...props}
    >
      <Heading>
        <button
          type="button"
          id={`${id}-header`}
          aria-expanded={isOpen}
          aria-controls={`${id}-panel`}
          disabled={disabled}
          onClick={toggle}
          className={cn(
            'text-body-strong text-neutral-primary flex w-full items-center gap-2.5 text-left',
            // The row is `py-[30px]` with a `gap-[20px]` between the header and the description
            // (node 242:2381), so the header's own bottom padding is 20px once there is something
            // under it and 30px when there is not.
            isOpen ? 'pt-7.5 pb-5' : 'py-7.5',
            'ease-standard transition-colors duration-[var(--duration-fast)]',
            // The label does NOT change colour on hover: Variant3 keeps it at `neutral-primary`
            // and moves only the rule.
            'disabled:text-neutral-secondary disabled:cursor-not-allowed',
          )}
        >
          <Icon name="minus" />
          <span className="min-w-0 flex-1">{title}</span>
          {/*
            The trailing glyph carries no label. "Expanded"/"collapsed" already reaches assistive
            tech through `aria-expanded`, and naming the icon on top of that makes a screen reader
            say the state twice in two different vocabularies.
          */}
          <Icon name={isOpen ? 'minus' : 'plus'} />
        </button>
      </Heading>

      <div
        id={`${id}-panel`}
        role="region"
        aria-labelledby={`${id}-header`}
        className={cn(
          'ease-standard grid transition-[grid-template-rows] duration-[var(--duration-base)]',
          isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <div className="overflow-hidden" hidden={!isOpen}>
          <div className="text-body-medium text-neutral-primary pb-7.5">{children}</div>
        </div>
      </div>
    </div>
  )
}

/**
 * A stack of rows. `single` closes the others when one opens — an accordion in the strict sense,
 * which suits a short spec list; leaving it off lets a visitor compare two sections side by side,
 * which suits long copy.
 *
 * The rule under the last row is removed rather than drawn, because the drawing shows a rule
 * BETWEEN rows and Figma has no way to say "except the last one".
 */
export interface AccordionProps extends React.ComponentProps<'div'> {
  items: { id: string; title: React.ReactNode; content: React.ReactNode; disabled?: boolean }[]
  single?: boolean
  /** Ids open on first render. With `single`, only the first of them is used. */
  defaultOpen?: string[]
  headingLevel?: 2 | 3 | 4
}

export function Accordion({
  items,
  single = false,
  defaultOpen = [],
  headingLevel = 3,
  className,
  ...props
}: AccordionProps) {
  const [openIds, setOpenIds] = React.useState<string[]>(() =>
    single ? defaultOpen.slice(0, 1) : defaultOpen,
  )

  function setOpen(id: string, next: boolean) {
    setOpenIds((current) => {
      if (!next) return current.filter((entry) => entry !== id)
      return single ? [id] : [...current, id]
    })
  }

  return (
    <div className={cn('w-full', className)} {...props}>
      {items.map((item) => (
        <AccordionItem
          key={item.id}
          title={item.title}
          disabled={item.disabled}
          headingLevel={headingLevel}
          open={openIds.includes(item.id)}
          onToggle={(next) => setOpen(item.id, next)}
          className="last:border-b-0"
        >
          {item.content}
        </AccordionItem>
      ))}
    </div>
  )
}
