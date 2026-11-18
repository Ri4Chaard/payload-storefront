'use client'

import React from 'react'

import { cn } from '@/lib/cn'

/**
 * The two-handled price control from the filter drawer (node 225:1369) — 304 × 24, drawn as a 2px
 * rail with a 2px tick at each end, a heavier bar across the selected span, and two 24px rings.
 *
 * **Two overlaid native `<input type="range">`, and no dependency.** Every range-slider library
 * arrives with its own opinions about focus, labelling and touch, and each one has to be argued
 * back into agreement with the rest of the kit. The native element already brings what is expensive
 * to write: arrow and Home/End keys, page steps, touch, `aria-valuenow` maintained by the browser,
 * and a control a screen reader recognises without being told what it is. What it does NOT bring is
 * a second handle — so there are two of them, stacked, each owning one end.
 *
 * **The inputs are transparent; everything visible is drawn underneath them.** A native range's
 * track cannot be styled to this drawing across browsers, so the rail, the ticks and the selected
 * span are three absolutely positioned elements and the inputs contribute only their thumbs.
 *
 * **Stacking order is the whole trick.** Both inputs cover the full width, so whichever is on top
 * swallows every press — including presses meant for the other handle. Two handles collapsed onto
 * the same value would then be stuck together permanently, because only one of them could ever be
 * grabbed again. So the input whose handle is NEARER the pointer is raised above the other, on
 * `pointermove`, before the press lands.
 *
 * Making the inputs `pointer-events: none` and giving them back only on the thumbs is the other
 * published answer to this, and it costs more than it looks: a native range jumps to a press on its
 * track, and inert tracks lose that. Pressing the rail to move the nearer handle is most of how a
 * slider is actually used.
 *
 * The choice is frozen while a drag is in progress. The pointer crosses the other handle's
 * territory all the time during a drag, and re-stacking underneath a live drag is how a slider ends
 * up handing the drag to the wrong handle halfway across.
 *
 * **The re-stack is written straight to the DOM rather than held in state.** The browser hit-tests
 * the press against whatever the stacking order is at that instant, so going through React puts a
 * render between the `pointermove` that decides and the `pointerdown` that needs the answer. It
 * works on an idle machine and misses under load — a click that follows the movement closely enough
 * lands on the handle that was on top a moment ago. This is the rare case where touching the node
 * is the correct implementation and not a shortcut around one.
 *
 * **It submits without JavaScript.** Give it `nameMin` and `nameMax` and the two inputs are ordinary
 * form controls, so the drawer's `<form method="GET">` produces the same URL the interactive path
 * produces. That is the reason this is two real inputs rather than two divs and a
 * `pointerdown` handler.
 *
 * **The value is the model's, not the browser's** — amounts here are integer minor units, which is
 * also why `formatValue` exists. A screen reader reading `aria-valuenow` would otherwise announce
 * "seven hundred and thirty thousand" for a $7,300 product.
 */
export interface RangeSliderProps extends Omit<React.ComponentProps<'div'>, 'onChange' | 'defaultValue'> {
  min: number
  max: number
  step?: number
  value: readonly [number, number]
  onChange: (value: [number, number]) => void
  /** Names the pair. Each handle takes its own name from this — "Minimum price", "Maximum price". */
  label: string
  /**
   * Turns a raw value into what a screen reader should say. Without it the announcement is the
   * stored integer, which for money is off by two decimal places and unreadable.
   */
  formatValue?: (value: number) => string
  /** Set both to make the pair submit inside a plain form. */
  nameMin?: string
  nameMax?: string
  disabled?: boolean
}

/**
 * The thumb is the only part of the input that is painted, and it needs the same declaration three
 * times because the pseudo-elements cannot be grouped in a selector list — a browser that does not
 * recognise one member drops the whole rule.
 */
const THUMB = [
  'appearance-none bg-transparent',
  'disabled:cursor-not-allowed',

  '[&::-webkit-slider-thumb]:appearance-none',
  '[&::-webkit-slider-thumb]:size-6 [&::-webkit-slider-thumb]:rounded-full',
  '[&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-neutral-primary',
  '[&::-webkit-slider-thumb]:bg-background-container [&::-webkit-slider-thumb]:cursor-grab',
  '[&::-webkit-slider-thumb]:active:cursor-grabbing',

  '[&::-moz-range-thumb]:appearance-none',
  '[&::-moz-range-thumb]:size-6 [&::-moz-range-thumb]:rounded-full',
  '[&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-neutral-primary',
  '[&::-moz-range-thumb]:bg-background-container [&::-moz-range-thumb]:cursor-grab',

  // The focus ring belongs on the handle, not on the full-width invisible input — a ring around a
  // 304px transparent box tells a keyboard user nothing about which end they are moving.
  'focus-visible:outline-none',
  '[&:focus-visible::-webkit-slider-thumb]:outline [&:focus-visible::-webkit-slider-thumb]:outline-2',
  '[&:focus-visible::-webkit-slider-thumb]:outline-offset-2',
  '[&:focus-visible::-webkit-slider-thumb]:outline-primary-default',
  '[&:focus-visible::-moz-range-thumb]:outline [&:focus-visible::-moz-range-thumb]:outline-2',
  '[&:focus-visible::-moz-range-thumb]:outline-offset-2',
  '[&:focus-visible::-moz-range-thumb]:outline-primary-default',
].join(' ')

const TICK = 'absolute top-1/2 h-1.5 w-0.5 -translate-y-1/2 rounded-xs bg-neutral-primary/20'

export function RangeSlider({
  min,
  max,
  step = 1,
  value,
  onChange,
  label,
  formatValue,
  nameMin,
  nameMax,
  disabled = false,
  className,
  ...props
}: RangeSliderProps) {
  const trackRef = React.useRef<HTMLDivElement>(null)
  const minRef = React.useRef<HTMLInputElement>(null)
  const maxRef = React.useRef<HTMLInputElement>(null)
  const dragging = React.useRef(false)

  const [lower, upper] = value
  const span = max - min || 1
  const percent = (amount: number) => ((amount - min) / span) * 100

  const announce = (amount: number) => formatValue?.(amount) ?? String(amount)

  // Handles may meet but never cross. Clamping here rather than swapping keeps each handle the one
  // the visitor grabbed — a pair that swaps identity mid-drag jumps under the pointer.
  const setLower = (next: number) => onChange([Math.min(next, upper), upper])
  const setUpper = (next: number) => onChange([lower, Math.max(next, lower)])

  const raise = (which: 'min' | 'max') => {
    if (minRef.current) minRef.current.style.zIndex = which === 'min' ? '20' : '10'
    if (maxRef.current) maxRef.current.style.zIndex = which === 'max' ? '20' : '10'
  }

  /**
   * Which handle a press is meant for. Outside the pair it is unambiguous, and that is the case
   * that matters: it is what lets a visitor pull the two apart again after collapsing them onto the
   * same value.
   */
  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (dragging.current) return
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect || rect.width === 0) return

    const at = min + ((event.clientX - rect.left) / rect.width) * span
    if (at < lower) raise('min')
    else if (at > upper) raise('max')
    else raise(at - lower < upper - at ? 'min' : 'max')
  }

  const INPUT = cn('absolute inset-x-0 top-1/2 h-6 w-full -translate-y-1/2', THUMB)

  return (
    <div
      role="group"
      aria-label={label}
      aria-disabled={disabled || undefined}
      onPointerMove={disabled ? undefined : onPointerMove}
      onPointerDown={() => {
        dragging.current = true
      }}
      onPointerUp={() => {
        dragging.current = false
      }}
      onPointerCancel={() => {
        dragging.current = false
      }}
      className={cn('relative h-6 w-full touch-none', className)}
      {...props}
    >
      <div ref={trackRef} className="absolute inset-x-3 top-1/2 h-6 -translate-y-1/2">
        {/* The unselected rail, and the two ticks that close it off at each end. */}
        <div className="bg-neutral-primary/10 absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 rounded-xs" />
        <div className={cn(TICK, 'left-0')} />
        <div className={cn(TICK, 'right-0')} />

        {/* The selected span. `right` rather than a width so both ends stay tied to their handle. */}
        <div
          className="bg-neutral-primary absolute top-1/2 h-0.5 -translate-y-1/2 rounded-xs"
          style={{ left: `${percent(lower)}%`, right: `${100 - percent(upper)}%` }}
        />
      </div>

      <input
        ref={minRef}
        type="range"
        min={min}
        max={max}
        step={step}
        value={lower}
        name={nameMin}
        disabled={disabled}
        aria-label={`Minimum ${label.toLowerCase()}`}
        aria-valuetext={announce(lower)}
        onChange={(event) => setLower(Number(event.target.value))}
        className={cn(INPUT, 'z-10')}
      />
      <input
        ref={maxRef}
        type="range"
        min={min}
        max={max}
        step={step}
        value={upper}
        name={nameMax}
        disabled={disabled}
        aria-label={`Maximum ${label.toLowerCase()}`}
        aria-valuetext={announce(upper)}
        onChange={(event) => setUpper(Number(event.target.value))}
        // The upper handle starts on top, so a fresh slider whose handles are already collapsed at
        // the maximum can still be pulled apart from the left.
        className={cn(INPUT, 'z-20')}
      />
    </div>
  )
}
