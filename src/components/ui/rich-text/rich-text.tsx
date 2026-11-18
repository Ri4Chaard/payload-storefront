import React from 'react'

import { cn } from '@/lib/cn'

/**
 * Rich text an owner wrote in the admin.
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
 * That rule has teeth: headings were missing from this list until spec 009, and the symptom was
 * exactly what the paragraph above predicts — an `h2` an owner wrote in the admin came out looking
 * like a `p`. Nothing was wrong with the content model or the serialiser; the style simply was not
 * here. Anything a future editor can type needs a line below, or it arrives invisible.
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
  /*
    A paragraph that FOLLOWS a list needs the same gap a paragraph following a paragraph gets.
    `[&_p+p]` alone does not give it one, and the result is a sentence welded to the last bullet —
    visible the moment the policy pages arrived, because they are the first content here to put
    prose after a list.
  */
  '[&_ul+p]:mt-4 [&_ol+p]:mt-4',
  '[&_li]:text-body-medium [&_li]:text-neutral-primary/80 [&_li]:mt-1',
  '[&_strong]:font-bold [&_a]:underline [&_a]:underline-offset-2',
  /*
    Headings. The policy pages are the FIRST consumer to have any: the product
    accordions and FAQ answers have none, and `articles` removes headings from its toolbar
    altogether so a chapter cannot hide a section from the contents rail. So until now nothing
    restored them after the reset, and an `h2` an owner wrote rendered identically to a `p` —
    the admin's structure vanished on the way to the page.

    **Bold and darker, not bigger**, which is what the design specifies: node `422:10504` sets the
    section heading to `H3/Bold` — body face 700 at 16px — in `neutral/primary`, against a body of
    `H3/Medium` 500 in `neutral/secondary`. The contrast between them is weight and colour at one
    size, not a step up the scale.

    **Uppercased here rather than typed in the admin.** Every heading in the four drawn pages is
    capitalised, and leaving that to whoever is typing guarantees a page that is half shouting.
    `PageHeaderBlock` treats the page title the same way.

    The top margin is what actually makes these scannable: 16px separates a heading from its own
    paragraph, so a larger gap has to open above it or a dozen sections read as one wall.
  */
  '[&_h2]:text-body-medium [&_h2]:text-neutral-primary [&_h2]:font-bold [&_h2]:uppercase',
  '[&_h2]:mt-10 [&_h2:first-child]:mt-0',
  /*
    `h3` exists because the toolbar offers it, not because the design uses one. It is the same
    treatment without the capitals, so a sub-section is distinguishable from the section above it
    and from the prose below it — and cannot be mistaken for either.
  */
  '[&_h3]:text-body-medium [&_h3]:text-neutral-primary [&_h3]:font-bold',
  '[&_h3]:mt-7.5 [&_h3:first-child]:mt-0',
)

export function RichText({ html, className, ...props }: RichTextProps) {
  return (
    <div className={cn(PROSE, className)} dangerouslySetInnerHTML={{ __html: html }} {...props} />
  )
}
