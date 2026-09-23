/**
 * Commerce compositions — built FROM the kit, not part of it.
 *
 * The kit contract lists `ProductCard` and `CartLine` as domain-shaped and out of scope for spec
 * 001. They are here rather than in `ui/` for exactly that reason: they know about products,
 * prices and baskets, and the kit does not.
 */
export { ActiveFilters, type ActiveFiltersProps, type RemovableFilter } from './active-filters'
export { CartEmpty, type CartEmptyProps } from './cart-empty'
export { CartItem, type CartItemProps } from './cart-item'
export { CartLines, type CartLinesProps } from './cart-lines'
export { FILTER_PANEL_ID, FilterDrawer, type FilterDrawerProps } from './filter-drawer'
export { HandoffModal, type HandoffModalProps } from './handoff-modal'
export { FilterToolbar, type FilterToolbarProps } from './filter-toolbar'
export { OrderSummary, type OrderSummaryProps } from './order-summary'
export { ProductCard, type ProductCardProps } from './product-card'
export {
  SelectedVariantProvider,
  type SelectedVariantProviderProps,
  usePublishSelectedVariant,
  useSelectedVariant,
} from './selected-variant'
export {
  ProductDetails,
  type ProductDetailsProps,
  ProductDetailsForSelection,
  type ProductDetailsForSelectionProps,
} from './product-details'
export { ProductGallery, type ProductGalleryProps } from './product-gallery'
export { ProductGrid, type ProductGridProps } from './product-grid'
export { ProductOptions, type ProductOptionsProps } from './product-options'
export { ProductPurchase, type ProductPurchaseProps } from './product-purchase'
