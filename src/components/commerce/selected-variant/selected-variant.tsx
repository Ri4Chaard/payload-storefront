'use client'

import React from 'react'

/**
 * Which stone the customer is looking at (spec 011, US2, FR-013; research R8).
 *
 * **It exists because two siblings need one answer.** `ProductPurchase` already owns the selection —
 * FR-039 makes the price follow the chosen stone — and `ProductDetails` renders beside it in the
 * server-rendered page. The details have to change when the selection does, without a reload, and
 * neither component can reach the other.
 *
 * Three ways to do that, and the cheapest is not the obvious one. Moving `ProductDetails` inside
 * `ProductPurchase` is the smallest diff and the wrong shape: it puts the warranty and delivery
 * accordions — which have nothing to do with a stone — inside the purchase client component, and
 * pushes server-rendered rich text across the boundary for no reason. Lifting both into one client
 * component is the same mistake, larger. This leaves both where they are.
 *
 * **It carries an id and nothing else.** A context on a page is an invitation to become that page's
 * state container, and the quantity, the handoff modal and the add-to-cart status all have exactly
 * one consumer each. They stay where they are.
 *
 * Safe to read outside a provider: a page with no stones renders no provider, and
 * `useSelectedVariant` returning `null` is the correct answer there rather than an error.
 */
const SelectedVariantContext = React.createContext<number | null>(null)

const SetSelectedVariantContext = React.createContext<(id: number | null) => void>(() => {})

export interface SelectedVariantProviderProps {
  children: React.ReactNode
}

export function SelectedVariantProvider({ children }: SelectedVariantProviderProps) {
  const [selected, setSelected] = React.useState<number | null>(null)

  /*
    Two contexts rather than one object, so a consumer that only publishes does not re-render every
    time the value changes. `ProductPurchase` is the publisher and is the larger tree of the two.
  */
  return (
    <SetSelectedVariantContext.Provider value={setSelected}>
      <SelectedVariantContext.Provider value={selected}>{children}</SelectedVariantContext.Provider>
    </SetSelectedVariantContext.Provider>
  )
}

/** The selected stone's id, or `null` before one is chosen — which is the page's initial state. */
export function useSelectedVariant(): number | null {
  return React.useContext(SelectedVariantContext)
}

/** Publish the selection. A no-op outside a provider, which is what a page with no stones wants. */
export function usePublishSelectedVariant(): (id: number | null) => void {
  return React.useContext(SetSelectedVariantContext)
}
