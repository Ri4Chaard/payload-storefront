/**
 * The kit's single entry point (T066).
 *
 * Spec 002 onward composes from here. An import that reaches past this file into a component's
 * folder is a signal that something is being used in a way the kit does not support — which is the
 * conversation Constitution II wants to happen before a duplicate gets written.
 */
export {
  Button,
  type ButtonHoverEffect,
  type ButtonProps,
  type ButtonSize,
  type ButtonVariant,
} from './button'
export { Checkbox, type CheckboxProps, type CheckboxShape } from './checkbox'
export { Chip, type ChipProps } from './chip'
export { Field, type FieldProps } from './field'
export { Icon, iconNames, type IconName, type IconProps, type IconSize } from './icon'
export {
  IconButton,
  type IconButtonProps,
  type IconButtonSize,
  type IconButtonVariant,
} from './icon-button'
export { Link, type LinkProps, type LinkVariant } from './link'
export { MenuOption, type MenuOptionProps } from './menu-option'
export { NavLink, type NavLinkProps } from './nav-link'
export { ScrollArea, type ScrollAreaProps } from './scroll-area'
export { Switch, type SwitchProps } from './switch'
export { TextInput, type TextInputProps } from './text-input'
