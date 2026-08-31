/**
 * Commerce compositions — built FROM the kit, not part of it.
 *
 * The kit contract lists `ProductCard` and `CartLine` as domain-shaped and out of scope for spec
 * 001. They are here rather than in `ui/` for exactly that reason: they know about products,
 * prices and baskets, and the kit does not.
 */
export { CartItem, type CartItemProps } from './cart-item'
export { ListingEmpty, type ListingEmptyProps } from './listing-empty'
export { ProductCard, type ProductCardProps } from './product-card'
export { ProductGrid, type ProductGridProps } from './product-grid'
