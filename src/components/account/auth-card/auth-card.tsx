import React from 'react'

import { Container } from '@/components/ui/container'
import { cn } from '@/lib/cn'

/**
 * The centred column every authentication screen is built on — nodes `408:7416` (sign in),
 * `428:11646` (create account), `428:11921` (verify), `429:12139` (forgot) and `429:12936` (reset).
 *
 * All five are the same object: a heading, a line of explanation, a stack of controls, and one line
 * of onward text underneath. Drawn at 500px wide in a 1920 frame.
 *
 * **`max-w`, not `w`.** The design has no frames below 1920 — unlike spec 003, which drew all three
 * breakpoints — so the smaller widths are derived rather than transcribed (FR-042). A fixed 500px
 * column is a horizontal scrollbar on a 390px phone, and the only thing the drawn width actually
 * says is "do not let this line get longer than this".
 *
 * **Not a `<form>`.** Each screen owns its own form and its own server action; a shell that also
 * submitted would be five slightly different shells by the end of the feature.
 *
 * Feature-local rather than kit: one consumer shape, five instances of it. It moves to the kit the
 * day something outside the accounts flow wants it (Principle II).
 */
export interface AuthCardProps {
  /** The screen's heading. Rendered as the page's `h1` — these routes have no other title. */
  title: string
  /** The line beneath it. Every drawn screen has one. */
  subtitle?: string
  /** The onward line: "Don't have an account? Create one", "Back to sign in", and so on. */
  footer?: React.ReactNode
  children: React.ReactNode
  className?: string
}

export function AuthCard({ title, subtitle, footer, children, className }: AuthCardProps) {
  return (
    <Container>
      <div className={cn('mx-auto flex w-full max-w-125 flex-col py-12 md:py-20', className)}>
        <div className="flex flex-col items-center gap-3.5 text-center">
          <h1 className="text-heading-1 text-neutral-primary">{title}</h1>
          {subtitle ? <p className="text-body-base text-neutral-primary">{subtitle}</p> : null}
        </div>

        <div className="mt-7.5 flex flex-col gap-7.5">{children}</div>

        {footer ? (
          <div className="text-body-base text-neutral-primary mt-7.5 text-center">{footer}</div>
        ) : null}
      </div>
    </Container>
  )
}
