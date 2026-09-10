import React from 'react'

import { cn } from '@/lib/cn'

/**
 * Rich text an owner wrote in the admin (006/T024).
 *
 * **Promoted out of `product-details.tsx` rather than copied.** It lived there as a private helper
 * from spec 003, when the product page's warranty and delivery accordions were the only rich text
 * on the site. The FAQ answers are the second consumer, and Constitution II is explicit that the
 * second usage is the trigger to promote a component, not to duplicate it — two copies of these
 * class lists would drift the first time somebody restyled a list.
 *
 * **Styled where it lands, not at the source.** The lexical serialiser emits bare `<p>`, `<ul>` and
 * `<strong>`, and the reset in `styles.css` strips their margins and list markers — so anything not
 * restored below renders as one undifferentiated block. That is why the selectors look defensive:
 * they are putting back exactly what the reset took away.
 *
 * **On `dangerouslySetInnerHTML`.** The source is Payload, written by an authenticated admin and
 * serialised by lexical. It is not visitor input and it never reaches this component from a URL, a
 * form or a query string. A caller that ever wants to render something a visitor typed needs a
 * different component, not a prop on this one.
 */
export interface RichTextProps extends Omit<React.ComponentProps<'div'>, 'children' | 'dangerouslySetInnerHTML'> {
  /** Serialised lexical, from the data layer. Never visitor input. */
  html: string
}

const PROSE = cn(
  '[&_p]:text-body-medium [&_p]:text-neutral-primary/80 [&_p+p]:mt-4',
  '[&_ul]:mt-4 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:mt-4 [&_ol]:list-decimal [&_ol]:pl-5',
  '[&_li]:text-body-medium [&_li]:text-neutral-primary/80 [&_li]:mt-1',
  '[&_strong]:font-bold [&_a]:underline [&_a]:underline-offset-2',
)

export function RichText({ html, className, ...props }: RichTextProps) {
  return (
    <div className={cn(PROSE, className)} dangerouslySetInnerHTML={{ __html: html }} {...props} />
  )
}
