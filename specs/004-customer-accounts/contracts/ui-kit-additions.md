# Contract — UI kit additions

**Feature**: [../spec.md](../spec.md) | **Research**: [../research.md](../research.md) R12, R13

Two new kit primitives. Everything else this design needs is already built — the reuse audit is in
R12, and it found that `TextInput` already carries a `trailing` prop whose own doc comment says "the
design puts a 'Forgot password?' link here".

Both components enter `src/components/ui/` and are exported from `src/components/ui/index.ts`, the
kit's single entry point. Both ship with stories, which `pnpm check:stories` enforces.

---

## `Modal`

`src/components/ui/modal/modal.tsx`

Four consumers in this feature alone — Full name, Add address, Change password, and the newsletter
confirmation — which is why it is a kit component and not a feature one (Principle II promotes at
the second consumer).

```ts
export interface ModalProps {
  open: boolean
  onClose: () => void
  /** Rendered as the panel's heading and wired as its accessible name. */
  title: React.ReactNode
  /** Footer actions, right-aligned. The design is always Cancel then a primary. */
  footer?: React.ReactNode
  /** Default 'md' (800px in the design). */
  size?: 'sm' | 'md'
  triggerRef?: React.RefObject<HTMLElement | null>
  initialFocusRef?: React.RefObject<HTMLElement | null>
  children: React.ReactNode
}
```

**Built on the existing `useOverlay`** (`src/components/ui/overlay/use-overlay.ts`), which already
implements the focus trap, initial and restored focus, Escape, scroll lock, and inert backgrounds —
the entirety of the hard part. `Drawer`, `Lightbox` and `MobileNav` are already built on it, and
`Modal` reimplements none of it.

| | |
| --- | --- |
| M1 | `role="dialog"`, `aria-modal="true"`, named by `title` |
| M2 | Focus moves into the panel on open and returns to the trigger on close (FR-046) |
| M3 | Escape and a scrim click both call `onClose`; the caller owns `open` |
| M4 | Background content is inert while open — not merely covered |
| M5 | The panel scrolls internally when it exceeds the viewport; the page behind never scrolls |
| M6 | At small widths the panel goes full-bleed rather than staying an 800px box on a 390px screen (FR-042) |
| M7 | Reduced motion suppresses the entrance transition |

**Not a form.** `Modal` renders children and a footer; the four consumers each own their `<form>` and
their action. A modal that knew about submission would be a different component four times.

---

## `OtpInput`

`src/components/ui/otp-input/otp-input.tsx`

The six-digit code control, from `428:11924` and `429:12404`. **One component, one size** — the
design draws 60px boxes for registration and 56px for reset, and that is a drafting artefact, not two
components (FR-048).

```ts
export interface OtpInputProps {
  /** Required. The group's accessible name — a control without a label is a defect. */
  label: React.ReactNode
  length?: number          // default 6
  name: string             // the assembled value posts under this name
  value?: string
  onChange?: (value: string) => void
  onComplete?: (value: string) => void
  error?: React.ReactNode
  disabled?: boolean
  autoFocus?: boolean
}
```

### Paste is handled at the group

The requirement that shaped this component: **Ctrl+V (or ⌘V) anywhere in the group fills the whole
code.**

| | |
| --- | --- |
| O1 | The `paste` handler is on the **group**, not per box. Clipboard text is stripped to digits and distributed from the first box regardless of which box received the event. Per-box handlers are the common bug — they give box two a one-character code. |
| O2 | A paste longer than `length` is truncated; a paste containing spaces, dashes or a `Your code is 482913` sentence still yields `482913`. |
| O3 | A complete paste fires `onComplete`, so the customer does not also have to find the button. |

### Autofill

| | |
| --- | --- |
| O4 | `autocomplete="one-time-code"` on the **first** box only. On more than one box, the platform fills every box with the whole code. |
| O5 | `inputmode="numeric"` and `pattern="[0-9]*"` so phones show a number pad. |
| O6 | An autofilled value flows through the same distribute path as a paste — one code path, not two. |

### Keyboard

| | |
| --- | --- |
| O7 | Typing a digit fills the box and advances. Typing into a filled box replaces and advances. |
| O8 | Backspace in an empty box moves back and clears; in a filled box it clears in place. |
| O9 | Left/Right move without editing. Home/End jump to the ends. |
| O10 | Tab leaves the group as a whole — six tab stops to escape a code field is a trap. |

### Accessibility

| | |
| --- | --- |
| O11 | The group is one labelled control via `role="group"` and `aria-labelledby`; each box carries its position ("Digit 3 of 6"). |
| O12 | `error` is wired through `aria-describedby` and announced, not merely drawn — this is FR-046 for the invalid-code message at `429:12685`. |
| O13 | Boxes are `<input>` elements, not contenteditable divs. Password managers, autofill and assistive technology all expect an input. |

### States

Default, focus-visible, filled, error, disabled — the full set Constitution III requires of every
interactive element. Tokens only; no raw hex, no arbitrary pixel spacing.

---

## Feature components

These have one consumer each and live in `src/components/account/`, not the kit — the kit is for what
a second feature will want.

| Component | Renders |
| --- | --- |
| `AuthCard` | The centred 500px column every auth screen shares: heading, subheading, form slot, footer link. Responsive rather than fixed (FR-042). |
| `ProfileRow` | The labelled read-with-edit row — value, optional pencil or `+`, optional empty state. Six instances on one page. |
| `AddressList` | The Addresses row's filled and empty states. |
| `MarketingToggle` | `Switch` bound to `setMarketingEmail`, with optimistic state and revert on failure (US6 scenario 3). |
| `NameModal`, `AddressModal`, `ChangePasswordModal` | `Modal` + a form + an action. |

`ProfileRow` is the one to watch: if a second feature grows a row like it, it is promoted to the kit
rather than copied.
