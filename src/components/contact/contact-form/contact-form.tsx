'use client'

import React from 'react'
import { useActionState } from 'react'

import { Button, TextArea, TextInput } from '@/components/ui'
import { submitEnquiry } from '@/lib/contact/actions'
import { initialEnquiryState, type EnquiryState } from '@/lib/contact/actions-types'
import { ENQUIRY_MAX } from '@/lib/contact/config'
import type { ContactForm as ContactFormContent } from '@/lib/contact/types'

/**
 * The message form (008/T058 – T061), drawn at `312:8662` / `419:10796` / `419:10876`.
 *
 * **`useActionState` over a plain `<form action>`, and deliberately NOT react-hook-form.** Every
 * other form on this site is RHF with a typed server action, and `src/lib/auth/actions.ts` explains
 * why that shape was chosen. It cannot progressively enhance: with no JavaScript there is no
 * submit handler to run. FR-018 requires this form to work anyway, so it is built the way Next 16's
 * own guide describes — `<form action={formAction}>`, `FormData` on the server, state back for the
 * errors and the pending flag. 008/research.md R3 records the whole trade. **Do not "fix" this back
 * into the house pattern**: the divergence is the requirement.
 *
 * **What that costs, and what it buys.** The cost is `defaultValue` plumbing below: with JavaScript
 * React preserves the DOM across a failed submit, but without it the page is rendered from scratch,
 * so the action hands back what the visitor typed and the inputs read it. The buy is that somebody
 * on a phone with a blocked script still reaches the shop.
 *
 * **Every string is the editor's** (FR-042) — the labels, the button, the footnote and both
 * outcome messages arrive as props from `contact-page`. Nothing user-visible is written here.
 */
export interface ContactFormProps {
  content: ContactFormContent
}

/** Which sentence a message key stands for. The keys live in the action; the words are content. */
function fieldMessage(key: string | undefined, content: ContactFormContent): string | undefined {
  if (!key) return undefined

  switch (key) {
    case 'emailInvalid':
      return 'Please check this email address.'
    case 'emailRequired':
      return `${content.labels.email} is required.`
    case 'emailTooLong':
      return 'That email address is too long.'
    case 'messageRequired':
      return `${content.labels.message} is required.`
    case 'messageTooLong':
      return 'That message is too long — please shorten it.'
    case 'nameRequired':
      return `${content.labels.name} is required.`
    case 'nameTooLong':
      return 'That name is too long.'
    default:
      // A key with no sentence should look wrong in review rather than render as an empty space
      // nobody notices — the convention `src/lib/auth/form-errors.ts` established.
      return key
  }
}

const errored = (state: EnquiryState) => (state.status === 'error' ? state : undefined)

export function ContactForm({ content }: ContactFormProps) {
  const [state, formAction, pending] = useActionState(submitEnquiry, initialEnquiryState)
  const failure = errored(state)

  /*
    Focus moves to the first control at fault (FR-019) — the ENHANCED path only. Without JavaScript
    the browser lands at the top of the re-rendered page, which is acceptable because the error
    summary is there and each control carries its own message.
  */
  const formRef = React.useRef<HTMLFormElement>(null)
  React.useEffect(() => {
    if (!failure?.fieldErrors) return
    const first = Object.keys(failure.fieldErrors)[0]
    if (!first) return
    formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus()
  }, [failure])

  /*
    The confirmation replaces the form (FR-021). It is a live region so a screen reader is told
    without having to go looking, and it is `role="status"` rather than an alert because a message
    arriving safely is not an emergency.
  */
  if (state.status === 'success') {
    return (
      <p role="status" aria-live="polite" className="text-body-medium text-neutral-primary max-w-160">
        {content.messages.success}
      </p>
    )
  }

  return (
    <form
      ref={formRef}
      data-testid="contact-form"
      action={formAction}
      noValidate
      className="max-w-160"
    >
      {/*
        Announced politely rather than assertively: the visitor has just pressed a button and is
        looking at the form, so an assertive interruption buys nothing and talks over the field
        errors below it.
      */}
      {failure && failure.message !== 'invalid' ? (
        <p
          role="status"
          aria-live="polite"
          className="text-body-medium text-status-error-text mb-5"
        >
          {failure.message === 'throttled'
            ? 'That is a lot of messages in a short time. Please give it an hour, or reach us on WhatsApp, Telegram or Instagram.'
            : content.messages.error}
        </p>
      ) : null}

      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-5 md:flex-row">
          <TextInput
            name="name"
            label={content.labels.name}
            hideLabel
            placeholder={content.labels.name}
            autoComplete="name"
            maxLength={ENQUIRY_MAX.name}
            required
            defaultValue={failure?.values.name ?? ''}
            error={fieldMessage(failure?.fieldErrors?.name, content)}
            className="md:flex-1"
          />
          <TextInput
            name="email"
            type="email"
            label={content.labels.email}
            hideLabel
            placeholder={content.labels.email}
            autoComplete="email"
            maxLength={ENQUIRY_MAX.email}
            required
            defaultValue={failure?.values.email ?? ''}
            error={fieldMessage(failure?.fieldErrors?.email, content)}
            className="md:flex-1"
          />
        </div>

        <TextArea
          name="message"
          label={content.labels.message}
          hideLabel
          placeholder={content.labels.message}
          rows={4}
          maxLength={ENQUIRY_MAX.message}
          required
          defaultValue={failure?.values.message ?? ''}
          error={fieldMessage(failure?.fieldErrors?.message, content)}
        />

        {/*
          The honeypot (FR-027).

          `sr-only` rather than `hidden` or `display: none`: the input stays in the DOM and in the
          submitted form, which is what a naive form-filler finds and completes, and a rule against
          arbitrary spacing rightly rejects the `left-[-9999px]` this was first written with.

          `aria-hidden` and `tabIndex={-1}` take it back out of the accessible tree and the tab
          order, so `sr-only` here means "off-screen", not "for screen readers" — no visitor of any
          kind can reach it. `autoComplete="off"` stops a browser filling it in helpfully, which
          would refuse a real person.
        */}
        <div aria-hidden="true" className="sr-only">
          <label htmlFor="contact-website">Website</label>
          <input id="contact-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
        </div>

        <div>
          <Button type="submit" loading={pending} disabled={pending}>
            {content.submitLabel}
          </Button>
        </div>

        {content.footnote ? (
          <p className="text-body-small text-neutral-secondary">{content.footnote}</p>
        ) : null}
      </div>
    </form>
  )
}
