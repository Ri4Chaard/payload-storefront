'use client'

import { useTranslations } from 'next-intl'
import React from 'react'

import { Button } from '@/components/ui/button'
import { Drawer } from '@/components/ui/drawer'
import { Modal } from '@/components/ui/modal'
import { Switch } from '@/components/ui/switch'
import { breakpoints } from '@tokens/mapping'
import type { CookieCategory } from '@/lib/policies/types'

/**
 * The per-category chooser behind *Configure All Cookies*.
 *
 * **Nothing in Figma draws this.** The button is drawn at `255:3381`; its destination is not. The
 * spec says so rather than pretending the design settled it, and this is the invention — built from
 * the kit's existing dialogs rather than as a new surface, so it inherits their focus handling
 * instead of reimplementing it.
 *
 * **A `Drawer` on a phone and a `Modal` above it**, both already `role="dialog" aria-modal="true"`
 * with a focus trap, Escape handling, and focus returned to the trigger on close. Unlike the banner,
 * this one SHOULD trap focus: it is a task with a save action, not an ambient notice.
 *
 * **The switch renders only for optional categories.** A strictly necessary one is drawn as text
 * reading "Always on" with its reason beneath, because a switch that refuses to move is a worse
 * answer than no switch — it invites a press, ignores it, and explains nothing.
 *
 * **Everything optional starts off** unless the visitor previously agreed to it; the
 * starting set is computed by `startingSelection()` in the consent library so that this component
 * never has to know the difference between "never asked", "asked before a category existed" and
 * "already decided".
 *
 * **The one-category case is not an edge case**. It is what every visitor sees on the day
 * this ships, because the site sets nothing optional — so it gets a real message saying exactly
 * that, rather than an empty panel under a heading.
 */

/**
 * The chooser's own labels, fixed in code.
 *
 * UI affordances rather than content — names for what a control does — which is the carve-out
 * Constitution I makes for exactly this. The one sentence a visitor actually reads for meaning is
 * `noOptional`, and it says only what is true of every configuration with nothing optional in it;
 * what the site's cookies ARE is the Cookie Policy's job, and that is the owner's to write.
 */
const labels = (t_common: ReturnType<typeof useTranslations<'common'>>) =>
  ({
    title: t_common('cookieSettings'),
    save: t_common('cookieSave'),
    close: t_common('cookieClose'),
    alwaysOn: t_common('cookieAlwaysOn'),
    /**
     * Shown when nothing optional is configured — the state on the day this ships, and therefore
     * the sentence most visitors will actually read.
     */
    noOptional: t_common('cookieNoOptional'),
  }) as const

export interface CookiePreferencesProps {
  open: boolean
  categories: CookieCategory[]
  /** Which keys start switched on. Necessary ones are included and cannot be turned off. */
  initialSelection: string[]
  onSave: (keys: string[]) => void
  onClose: () => void
  triggerRef?: React.RefObject<HTMLElement | null>
}

export function CookiePreferences({
  open,
  categories,
  initialSelection,
  onSave,
  onClose,
  triggerRef,
}: CookiePreferencesProps) {
  const LABELS = labels(useTranslations('common'))
  const [selected, setSelected] = React.useState<string[]>(initialSelection)

  /*
    Which of the kit's two dialogs to mount. `null` until the browser has been asked, because the
    server cannot know the viewport and guessing would mean rendering one dialog and swapping it for
    the other on hydration.

    The width comes from the design tokens rather than a literal — Constitution III, and it means a
    breakpoint change moves this with everything else.
  */
  const [wide, setWide] = React.useState<boolean | null>(null)

  React.useEffect(() => {
    const query = window.matchMedia(`(min-width: ${breakpoints.md})`)
    setWide(query.matches)

    // Watched rather than asked once: a tablet being rotated while the chooser is open should get
    // the right dialog, not the one that suited the previous orientation.
    const onChange = (event: MediaQueryListEvent) => setWide(event.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  // Reopening after a decision must show the current choices, not whatever was ticked last time the
  // component happened to mount (FR-032, US2 scenario 5).
  React.useEffect(() => {
    if (open) setSelected(initialSelection)
  }, [open, initialSelection])

  const toggle = (key: string) =>
    setSelected((current) =>
      current.includes(key) ? current.filter((entry) => entry !== key) : [...current, key],
    )

  const optional = categories.filter((category) => !category.necessary)

  const body = (
    <div className="flex flex-col gap-7.5">
      {categories.map((category) => (
        <div key={category.key} className="flex flex-col gap-2.5">
          <div className="flex items-start justify-between gap-5">
            <h3 className="text-body-strong text-neutral-primary">{category.name}</h3>

            {category.necessary ? (
              <span className="text-label text-neutral-secondary shrink-0 uppercase">
                {LABELS.alwaysOn}
              </span>
            ) : (
              <Switch
                label={category.name}
                hideLabel
                checked={selected.includes(category.key)}
                onChange={() => toggle(category.key)}
                className="shrink-0"
              />
            )}
          </div>

          <p className="text-body-small text-neutral-primary/80">{category.purpose}</p>
        </div>
      ))}

      {/*
        The day-one state, and therefore the sentence most visitors will actually read. Saying
        nothing here would leave a panel that looks like it failed to load its options.
      */}
      {optional.length === 0 ? (
        <p className="text-body-small text-neutral-secondary border-t border-current/10 pt-5">
          {LABELS.noOptional}
        </p>
      ) : null}
    </div>
  )

  const footer = (
    <Button variant="primary" onClick={() => onSave(selected)}>
      {LABELS.save}
    </Button>
  )

  /*
    Exactly ONE dialog is mounted, and this is why it is a media query rather than two wrappers
    carrying `md:hidden` and `hidden md:block`.

    Those classes hide an element; they do not unmount it. Both dialogs would be in the accessibility
    tree at once — two `role="dialog" aria-modal="true"` nodes, two focus traps fighting over the
    same keystroke, and a screen reader offered two copies of every switch, one of them invisible.
    That is a defect an automated scan would very likely miss and a screen-reader user would meet
    immediately.
  */
  if (wide === null) return null

  return wide ? (
    <Modal
      open={open}
      onClose={onClose}
      title={LABELS.title}
      size="lg"
      footer={footer}
      triggerRef={triggerRef}
      closeLabel={LABELS.close}
    >
      {body}
    </Modal>
  ) : (
    <Drawer
      open={open}
      onClose={onClose}
      title={LABELS.title}
      side="right"
      footer={footer}
      triggerRef={triggerRef}
    >
      {body}
    </Drawer>
  )
}
