import { PLATFORM_LABELS, type Platform } from './normalise'

/**
 * Identifier plus text becomes a URL (spec 005, T044,
 * [messenger-handoff.md §2](../../../specs/005-checkout-handoff/contracts/messenger-handoff.md)).
 * FR-021, FR-022.
 *
 * **Both pre-fill formats are verified against primary sources, not recalled.** Telegram's own API
 * reference documents `t.me/<username>?text=` as "UTF-8 text to pre-enter into the text input bar,
 * if the user can write in the chat", and notes that it trims to the configured message-length
 * maximum. WhatsApp's click-to-chat format takes the number as digits only — no `+`, no spaces, no
 * brackets, no dashes, no leading zero — which is what `./normalise.ts` guarantees before a
 * destination is ever stored.
 *
 *   https://core.telegram.org/api/links
 *   https://help.businesschat.io/en/articles/6517838-how-to-build-a-whatsapp-click-to-chat-url
 *
 * **Instagram has no documented way to pre-fill a direct message**, and `carriesMessage: false` is
 * how that fact travels. FR-021 requires the modal to say what each row will do; a customer who
 * arrives at an empty Instagram chat believing their selection went with them has been misled by
 * the interface, not by Instagram.
 */

export interface MessengerLink {
  platform: Platform
  /** 'WhatsApp' — the platform name as the modal draws it. */
  label: string
  /** '@aurum' — the displayed handle, which is not the destination (FR-037). */
  handle: string
  href: string
  /** Whether the composed message travels with the customer, or has to be pasted. */
  carriesMessage: boolean
}

export interface BuiltLink {
  href: string
  carriesMessage: boolean
}

/**
 * The practical ceiling a URL can be relied on to survive (FR-028).
 *
 * Measured on the **finished, percent-encoded link** rather than on the message. A Cyrillic
 * character costs six characters of budget — two UTF-8 bytes, each becoming a `%XX` escape — so a
 * `message.length` check passes every test written in English and truncates nothing for the
 * customers in this shop's own market. `./message.ts` is what enforces it; the number lives here,
 * beside the links it is a fact about.
 */
export const LINK_BUDGET = 2000

export function buildLink(
  platform: Platform,
  destination: string,
  message: string,
): BuiltLink {
  const text = encodeURIComponent(message)

  switch (platform) {
    case 'whatsapp':
      return { href: `https://wa.me/${destination}?text=${text}`, carriesMessage: true }
    case 'telegram':
      return { href: `https://t.me/${destination}?text=${text}`, carriesMessage: true }
    case 'instagram':
      // `ig.me/m/<username>` opens the direct-message thread where Instagram is installed and the
      // profile where it is not. Neither form accepts text.
      return { href: `https://ig.me/m/${destination}`, carriesMessage: false }
  }
}

/** One row of the handoff modal, ready to render. */
export function messengerLink(
  messenger: { destination: string; handle: string; platform: Platform },
  message: string,
): MessengerLink {
  const { href, carriesMessage } = buildLink(messenger.platform, messenger.destination, message)

  return {
    platform: messenger.platform,
    label: PLATFORM_LABELS[messenger.platform],
    handle: messenger.handle,
    href,
    carriesMessage,
  }
}
