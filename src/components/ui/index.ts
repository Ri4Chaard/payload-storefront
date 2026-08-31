/**
 * The kit's single entry point (T066).
 *
 * Spec 002 onward composes from here. An import that reaches past this file into a component's
 * folder is a signal that something is being used in a way the kit does not support — which is the
 * conversation Constitution II wants to happen before a duplicate gets written.
 */
export { Accordion, AccordionItem, type AccordionItemProps, type AccordionProps } from './accordion'
export {
  Button,
  type ButtonHoverEffect,
  type ButtonProps,
  type ButtonSize,
  type ButtonVariant,
} from './button'
export { Breadcrumbs, type BreadcrumbItem, type BreadcrumbsProps } from './breadcrumbs'
export { Carousel, type CarouselProps } from './carousel'
export { CategoryCard, type CategoryCardProps } from './category-card'
export { Checkbox, type CheckboxProps, type CheckboxShape } from './checkbox'
export { Chip, type ChipProps } from './chip'
export { Container, type ContainerProps } from './container'
export { Drawer, type DrawerProps } from './drawer'
export {
  FeatureCard,
  FeatureStrip,
  type FeatureCardProps,
  type FeatureStripProps,
} from './feature-card'
export { Field, type FieldProps } from './field'
export { ImageCarousel, type ImageCarouselProps } from './image-carousel'
export { Icon, iconNames, type IconName, type IconProps, type IconSize } from './icon'
export {
  IconButton,
  type IconButtonProps,
  type IconButtonSize,
  type IconButtonVariant,
} from './icon-button'
export { Lightbox, type LightboxImage, type LightboxProps } from './lightbox'
export { Link, type LinkProps, type LinkVariant } from './link'
export { Menu, type MenuProps } from './menu'
export { MenuOption, type MenuOptionProps } from './menu-option'
export { NavLink, type NavLinkProps } from './nav-link'
// Behaviour rather than markup: `Drawer` and `Lightbox` are built on it, and so is `MobileNav`.
export { useOverlay, type UseOverlayOptions } from './overlay'
export { Pagination, type PaginationProps } from './pagination'
export { QuantityStepper, type QuantityStepperProps } from './quantity-stepper'
export { RangeSlider, type RangeSliderProps } from './range-slider'
export { ScrollArea, type ScrollAreaProps } from './scroll-area'
export { SearchField, type SearchFieldProps } from './search-field'
export { Switch, type SwitchProps } from './switch'
export { TextInput, type TextInputProps } from './text-input'
