/**
 * The kit's single entry point (T066).
 *
 * Spec 002 onward composes from here. An import that reaches past this file into a component's
 * folder is a signal that something is being used in a way the kit does not support — which is the
 * conversation Constitution II wants to happen before a duplicate gets written.
 */
export { Button, type ButtonProps, type ButtonSize, type ButtonVariant } from './button'
export { Checkbox, type CheckboxProps, type CheckboxShape } from './checkbox'
export { Switch, type SwitchProps } from './switch'
