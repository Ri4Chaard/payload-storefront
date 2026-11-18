'use client'

import { useTranslations } from 'next-intl'
import React from 'react'

import { Icon } from '@/components/ui/icon'
import { MenuOption } from '@/components/ui/menu-option'
import { cn } from '@/lib/cn'

/**
 * The value picker the product page draws twice — closed at node `301:4990`, open at
 * `301:5845`, its rows at `301:5920`.
 *
 * **Why this is not `Menu`.** `Menu`'s docblock names this list as its next consumer, and the
 * popup mechanics are genuinely the same. The ARIA is not, and the difference is not cosmetic:
 *
 *   a menu button   chooses an ACTION. Its trigger is named for what it opens, and it has no value
 *   a select        chooses a VALUE. Its trigger must expose the current one, so its name comes
 *                   from the field label and its content is the chosen option
 *
 * Announcing "Size, menu" while the visitor is looking at a box that says "6" is the failure, and
 * it is not reachable by passing `Menu` a different role — the name and value exposure differ
 * throughout. So the ROWS are reused, which is the part the design actually draws, and the pattern
 * around them is the listbox one.
 *
 * `MenuOption` anticipated exactly this: it asserts no role of its own, precisely so that the
 * owning container can decide whether its rows are `menuitem` or `option`.
 *
 * **Focus moves into the list**, which is the listbox variant that suits a roving-focus row that is
 * already a button. `aria-activedescendant` is the alternative and would mean keeping the rows
 * unfocusable and tracking a virtual cursor, for no gain here.
 *
 * **A disabled option is rendered and skipped, never hidden**. An option that cannot be
 * bought is information — it tells the visitor the product exists in that option — and removing it
 * turns a temporary shortage into a catalogue that looks smaller than it is.
 *
 * **Nothing here works without scripting**, and that is the accepted cost of the drawn panel. The
 * product page stays fully readable without it: the price, the description and the
 * accordions are all server-rendered, and only the choosing needs JavaScript.
 */
export interface SelectOption {
  value: string
  label: string
  /** Trailing metadata, as the design draws it — "In stock", "Made to order", a price. */
  meta?: React.ReactNode
  /** Drawn, announced, and not selectable. */
  disabled?: boolean
}

export interface SelectProps extends Omit<React.ComponentProps<'div'>, 'onChange'> {
  /** The trigger's id, so a `Field` label can point at it — a button is a labelable element. */
  id: string
  options: SelectOption[]
  value: string | null
  onChange: (value: string) => void
  /** Shown when nothing is chosen yet. */
  placeholder?: string
  disabled?: boolean
  describedBy?: string
  invalid?: boolean
}

export function Select({
  id,
  options,
  value,
  onChange,
  placeholder: placeholderProp,
  disabled = false,
  describedBy,
  invalid = false,
  className,
  ...props
}: SelectProps) {
  /*
    Resolved in the body, not as a default parameter: `useTranslations` is a hook. The
    prop stays overridable, so a caller with its own words still wins — what changed is that the
    fallback is translated instead of being an English literal.
  */
  const t_forms = useTranslations('forms')
  const placeholder = placeholderProp ?? t_forms('select')

  const [open, setOpen] = React.useState(false)
  const rootRef = React.useRef<HTMLDivElement>(null)
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const listRef = React.useRef<HTMLDivElement>(null)
  const listId = `${id}-listbox`

  const selected = options.find((option) => option.value === value) ?? null

  /** The rows a keyboard can reach. A disabled row is drawn, and stepped over. */
  const reachable = React.useCallback(
    () =>
      Array.from(listRef.current?.querySelectorAll<HTMLElement>('[role="option"]') ?? []).filter(
        (row) => !row.hasAttribute('disabled'),
      ),
    [],
  )

  const close = React.useCallback((returnFocus: boolean) => {
    setOpen(false)
    if (returnFocus) triggerRef.current?.focus()
  }, [])

  React.useEffect(() => {
    if (!open) return

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      // Stopped, so a select inside a drawer closes itself rather than the drawer around it.
      event.stopPropagation()
      close(true)
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, close])

  // Opening lands on the chosen row, or the first one that can be chosen. A panel that opens with
  // focus nowhere is a panel a keyboard cannot use.
  React.useEffect(() => {
    if (!open) return
    const rows = reachable()
    const current = rows.find((row) => row.dataset.value === value)
    ;(current ?? rows[0])?.focus()
  }, [open, value, reachable])

  function moveFocus(delta: number) {
    const rows = reachable()
    if (rows.length === 0) return
    const current = rows.indexOf(document.activeElement as HTMLElement)
    rows[(current + delta + rows.length) % rows.length]?.focus()
  }

  function choose(option: SelectOption) {
    onChange(option.value)
    close(true)
  }

  return (
    <div ref={rootRef} className={cn('relative', className)} {...props}>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-haspopup="listbox"
        {...(describedBy ? { 'aria-describedby': describedBy } : {})}
        {...(invalid ? { 'aria-invalid': true } : {})}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault()
            setOpen(true)
          }
        }}
        className={cn(
          'text-body-medium text-neutral-primary flex h-13 w-full items-center gap-2.5 px-5 text-left',
          'ease-standard border transition-colors duration-[var(--duration-fast)]',
          invalid ? 'border-status-error-default' : 'border-black/10 hover:border-neutral-primary',
          'focus-visible:outline-primary-default focus-visible:outline-2 focus-visible:outline-offset-2',
          'disabled:text-neutral-secondary disabled:cursor-not-allowed disabled:hover:border-black/10',
        )}
      >
        {/*
          The trigger's CONTENT is the chosen value, which is what makes a screen reader say
          "Size, 6" rather than "Size, button". The name comes from the Field label pointing at
          this id, so there is deliberately no `aria-label` here to override it.
        */}
        <span className={cn('min-w-0 flex-1 truncate', !selected && 'text-neutral-secondary')}>
          {selected ? selected.label : placeholder}
        </span>
        <Icon
          name="chevron-down"
          size="md"
          className={cn(
            'ease-standard shrink-0 transition-transform duration-[var(--duration-fast)]',
            open && 'rotate-180',
          )}
        />
      </button>

      {open ? (
        <div
          ref={listRef}
          id={listId}
          role="listbox"
          aria-labelledby={id}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault()
              moveFocus(1)
            } else if (event.key === 'ArrowUp') {
              event.preventDefault()
              moveFocus(-1)
            } else if (event.key === 'Home') {
              event.preventDefault()
              reachable()[0]?.focus()
            } else if (event.key === 'End') {
              event.preventDefault()
              reachable().at(-1)?.focus()
            } else if (event.key === 'Tab') {
              // Closes rather than trapping. This is a listbox, not a dialog.
              close(false)
            }
          }}
          className={cn(
            'bg-background-container absolute top-full right-0 left-0 z-20',
            'max-h-62.5 overflow-y-auto border border-black/10',
          )}
        >
          {options.map((option) => (
            <MenuOption
              key={option.value}
              role="option"
              // Written on every row, not only the chosen one: `aria-selected` is how a listbox
              // says "this is the one", and a row that simply omits it says nothing at all.
              aria-selected={option.value === value}
              data-value={option.value}
              disabled={option.disabled}
              selected={option.value === value}
              meta={option.meta}
              tabIndex={-1}
              onClick={() => choose(option)}
            >
              {option.label}
            </MenuOption>
          ))}
        </div>
      ) : null}
    </div>
  )
}
