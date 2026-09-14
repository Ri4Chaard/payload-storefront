import type { getTranslations } from 'next-intl/server'

import type { IconName } from '@/lib/icon-registry'

/**
 * The four promises the strip beneath every page repeats — home (node `355:7775`), product page
 * (`355:7775` again at 1920, `553:16588` at 1024, `553:16619` at 390).
 *
 * Static until an editor needs them. These are fixed statements about how the shop operates rather
 * than content that changes, so they stay in code instead of inflating the content model; they live
 * HERE rather than beside one page because two pages now draw them, and a second copy is how the
 * two quietly drift apart.
 *
 * **A function of the translator rather than a constant** (spec 010). The words are interface
 * chrome by the rule in the README — nobody would ask an editor to reword "Free shipping" — so they
 * belong in `src/i18n/messages/`, and a module constant cannot read a translator. The icons stay
 * here: an icon is not language.
 *
 * It takes `getTranslations`' translator rather than `useTranslations`' because both callers are
 * async Server Components, where the hook form is not available.
 */
export const shopPromises = (
  t_product: Awaited<ReturnType<typeof getTranslations<'product'>>>,
): { description: string; icon: IconName; title: string }[] => [
  {
    icon: 'shipping',
    title: t_product('freeShipping'),
    description: t_product('freeShippingBody'),
  },
  {
    icon: 'seal-check',
    title: t_product('qualityGuarantee'),
    description: t_product('qualityGuaranteeBody'),
  },
  {
    icon: 'customer-support',
    title: t_product('personalSupport'),
    description: t_product('personalSupportBody'),
  },
  {
    icon: 'secure-payment',
    title: t_product('securePayments'),
    description: t_product('securePaymentsBody'),
  },
]
