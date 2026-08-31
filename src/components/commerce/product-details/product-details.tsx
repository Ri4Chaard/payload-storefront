import React from 'react'

import { Accordion } from '@/components/ui/accordion'
import type { ProductAttribute } from '@/lib/catalog/types'
import { cn } from '@/lib/cn'

/**
 * The three rows beneath the actions (003/T265). Nodes `242:2478` (1920), `410:7377` (1024),
 * `410:7709` (390).
 *
 * `Accordion` from the kit, consumed unchanged — including its glyphs, which is why 001 gave
 * `AccordionItem` an `icon` in the first place. What this component adds is the one rule FR-036
 * states: **the copy comes from the catalogue or from the shop global, never from here.**
 *
 *   PRODUCT DETAILS   the product's own rich text, plus its owner-defined attributes
 *   warranty          the `shop` global — the same words on every piece
 *   delivery          the `shop` global
 *
 * **A row with nothing in it does not render.** An accordion that opens onto blank space is a
 * control that lies about having something behind it, and the owner leaving `delivery` empty in the
 * admin is an ordinary state, not a broken one.
 *
 * The three titles are the only strings here. `shop.ts` originally modelled the bodies and not the
 * headings, on the reasoning that the headings never move — but "3 YEAR WARRANTY + FREE RETURNS" is
 * a claim about how the shop operates, and the owner has asked for it to be editable. They are
 * already props for exactly that reason; 003/T292a adds the fields to the global and passes them,
 * and nothing in this file changes when it does.
 */
export interface ProductDetailsProps extends Omit<React.ComponentProps<'div'>, 'title'> {
  /** Serialised rich text from the product. `null` where the owner left it empty. */
  detailsHtml: string | null
  /** Owner-defined descriptive properties — metal, carat, setting. Not filters. */
  attributes: ProductAttribute[]
  warrantyHtml: string | null
  deliveryHtml: string | null
  detailsTitle?: string
  warrantyTitle?: string
  deliveryTitle?: string
  headingLevel?: 2 | 3 | 4
}

/**
 * Rich text the owner wrote, styled where it lands rather than at the source. The serialiser emits
 * bare `<p>`, `<ul>` and `<strong>`; the reset in `styles.css` strips their margins and list
 * markers, so anything that is not restored here renders as one undifferentiated block.
 */
const PROSE = cn(
  '[&_p]:text-body-medium [&_p]:text-neutral-primary/80 [&_p+p]:mt-4',
  '[&_ul]:mt-4 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:mt-4 [&_ol]:list-decimal [&_ol]:pl-5',
  '[&_li]:text-body-medium [&_li]:text-neutral-primary/80 [&_li]:mt-1',
  '[&_strong]:font-bold [&_a]:underline [&_a]:underline-offset-2',
)

function RichText({ html }: { html: string }) {
  // The source is Payload, written by the shop owner in the admin and serialised by lexical. It is
  // not visitor input and never reaches this component from a URL or a form.
  return <div className={PROSE} dangerouslySetInnerHTML={{ __html: html }} />
}

/** The owner-defined properties, as a description list — which is what a name/value set is. */
function Attributes({ attributes }: { attributes: ProductAttribute[] }) {
  return (
    <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-5 gap-y-2 first:mt-0">
      {attributes.map((attribute) => (
        <React.Fragment key={attribute.name}>
          <dt className="text-body-small text-neutral-secondary">{attribute.label}</dt>
          <dd className="text-body-small text-neutral-primary">{attribute.value}</dd>
        </React.Fragment>
      ))}
    </dl>
  )
}

export function ProductDetails({
  detailsHtml,
  attributes,
  warrantyHtml,
  deliveryHtml,
  detailsTitle = 'PRODUCT DETAILS',
  warrantyTitle = '3 YEAR WARRANTY + FREE RETURNS',
  deliveryTitle = 'DELIVERY',
  headingLevel = 2,
  className,
  ...props
}: ProductDetailsProps) {
  const rows = [
    detailsHtml || attributes.length > 0
      ? {
          id: 'details',
          title: detailsTitle,
          icon: 'description' as const,
          content: (
            <>
              {detailsHtml ? <RichText html={detailsHtml} /> : null}
              {attributes.length > 0 ? <Attributes attributes={attributes} /> : null}
            </>
          ),
        }
      : null,
    warrantyHtml
      ? {
          id: 'warranty',
          title: warrantyTitle,
          icon: 'warranty' as const,
          content: <RichText html={warrantyHtml} />,
        }
      : null,
    deliveryHtml
      ? {
          id: 'delivery',
          title: deliveryTitle,
          icon: 'delivery' as const,
          content: <RichText html={deliveryHtml} />,
        }
      : null,
  ].filter((row) => row !== null)

  if (rows.length === 0) return null

  return (
    <Accordion
      items={rows}
      headingLevel={headingLevel}
      className={cn('w-full', className)}
      {...props}
    />
  )
}
