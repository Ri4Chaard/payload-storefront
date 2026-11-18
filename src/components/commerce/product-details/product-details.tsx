import { useTranslations } from 'next-intl'
import React from 'react'

import { Accordion } from '@/components/ui/accordion'
import { RichText } from '@/components/ui/rich-text'
import type { ProductAttribute } from '@/lib/catalog/types'
import { cn } from '@/lib/cn'

/**
 * The three rows beneath the actions. Nodes `242:2478` (1920), `410:7377` (1024),
 * `410:7709` (390).
 *
 * `Accordion` from the kit, consumed unchanged — including its glyphs, which is why 001 gave
 * `AccordionItem` an `icon` in the first place. What this component adds is the one rule FR-036
 * states: **the copy comes from the catalogue or from the shop global, never from here.**
 *
 *   PRODUCT DETAILS   the product's own rich text, plus its owner-defined attributes
 *   warranty          the `shop` global — the same words on every product
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
  /** Owner-defined descriptive properties — material, weight, finish. Not filters. */
  attributes: ProductAttribute[]
  warrantyHtml: string | null
  deliveryHtml: string | null
  detailsTitle?: string
  warrantyTitle?: string
  deliveryTitle?: string
  headingLevel?: 2 | 3 | 4
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
  detailsTitle: detailsTitleProp,
  warrantyTitle: warrantyTitleProp,
  deliveryTitle: deliveryTitleProp,
  headingLevel = 2,
  className,
  ...props
}: ProductDetailsProps) {
  /*
    Resolved in the body, not as default parameters: `useTranslations` is a hook.

    These three are the developer's fallback for headings the SHOP GLOBAL owns — the caller passes
    the owner's words whenever there are any, and only an empty global reaches these. Translating
    them anyway is what stops an unconfigured shop rendering a Russian product page with three
    English headings on it.
  */
  const t_product = useTranslations('product')
  const detailsTitle = detailsTitleProp ?? t_product('detailsTitleFallback')
  const warrantyTitle = warrantyTitleProp ?? t_product('warrantyTitleFallback')
  const deliveryTitle = deliveryTitleProp ?? t_product('deliveryTitleFallback')
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
