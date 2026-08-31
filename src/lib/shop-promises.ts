import type { IconName } from '@/lib/icon-registry'

/**
 * The four promises the strip beneath every page repeats — home (node `355:7775`), product page
 * (`355:7775` again at 1920, `553:16588` at 1024, `553:16619` at 390).
 *
 * Static until an editor needs them. These are fixed statements about how the shop operates rather
 * than content that changes, so they stay in code instead of inflating the content model; they live
 * HERE rather than beside one page because two pages now draw them, and a second copy is how the
 * two quietly drift apart.
 */
export const SHOP_PROMISES: { icon: IconName; title: string; description: string }[] = [
  {
    icon: 'shipping',
    title: 'Free shipping',
    description: 'Carefully packaged and delivered with guaranteed protection',
  },
  {
    icon: 'seal-check',
    title: 'Quality guarantee',
    description:
      'If your piece doesn’t meet your expectations, we’ll assist you with a return or exchange',
  },
  {
    icon: 'customer-support',
    title: 'Personal support',
    description: 'Our specialists will help you choose the perfect piece and answer any questions',
  },
  {
    icon: 'secure-payment',
    title: 'Secure payments',
    description: 'Your information is protected with modern encryption technology',
  },
]
