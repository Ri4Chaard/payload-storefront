/**
 * The kit's single entry point.
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
export { Carousel, type CarouselProps, useAutoAdvance } from './carousel'
export { CategoryCard, type CategoryCardProps } from './category-card'
export { Checkbox, type CheckboxProps, type CheckboxShape } from './checkbox'
export { Chip, type ChipProps } from './chip'
export {
  CookieBanner,
  CookieSettingsButton,
  type CookieBannerProps,
} from './cookie-banner'
/*
  `CookiePreferences` is deliberately NOT re-exported here, and this note is load-bearing.

  It is the banner's lazily-imported half (Constitution V — the banner is charged to every route on
  the site, and most visitors never open the chooser). A static re-export from this barrel undoes
  that completely: anything importing `CookieBanner` from `@/components/ui` pulls the barrel's whole
  module graph, so the chooser lands back in the initial chunk and `React.lazy` splits nothing. That
  was measured, not guessed — both components shared one chunk and it was referenced by every page.

  It has no direct consumer in application code, so there is nothing for the barrel to serve. Import
  it from `@/components/ui/cookie-preferences` if that ever changes, and re-measure.
*/
export { Container, type ContainerProps } from './container'
export { Drawer, type DrawerProps } from './drawer'
export { EmptyState, type EmptyStateProps } from './empty-state'
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
export { LoadMore, type LoadMoreProps } from './load-more'
export { Media, type MediaProps } from './media'
export { Menu, type MenuProps } from './menu'
export { MenuOption, type MenuOptionProps } from './menu-option'
export { MessengerRow, type MessengerRowProps } from './messenger-row'
export { Modal, type ModalProps } from './modal'
export { NavLink, type NavLinkProps } from './nav-link'
// Behaviour rather than markup: `Drawer` and `Lightbox` are built on it, and so is `MobileNav`.
export { useOverlay, type UseOverlayOptions } from './overlay'
export { OtpInput, type OtpInputProps } from './otp-input'
export { RichText, type RichTextProps } from './rich-text'
export { Pagination, type PaginationProps } from './pagination'
export { QuantityStepper, type QuantityStepperProps } from './quantity-stepper'
export {
  QuestionList,
  type QuestionListItem,
  type QuestionListProps,
} from './question-list'
export { RangeSlider, type RangeSliderProps } from './range-slider'
export { ScrollArea, type ScrollAreaProps } from './scroll-area'
export { SearchField, type SearchFieldProps } from './search-field'
export { Select, type SelectOption, type SelectProps } from './select'
export { Switch, type SwitchProps } from './switch'
export { TextArea, type TextAreaProps } from './text-area'
export { TextInput, type TextInputProps } from './text-input'
