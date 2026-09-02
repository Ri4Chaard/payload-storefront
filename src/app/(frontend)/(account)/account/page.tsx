import type { Metadata } from 'next'
import React from 'react'

import { AddressList } from '@/components/account/address-list'
import { ChangePasswordModal } from '@/components/account/change-password-modal'
import { NameRow } from '@/components/account/name-row'
import { ProfileRow } from '@/components/account/profile-row'
import { SignOutButton } from '@/components/account/sign-out-button'
import { Container } from '@/components/ui/container'
import { Icon } from '@/components/ui/icon'
import { Switch } from '@/components/ui/switch'
import { getCustomerAddresses } from '@/lib/addresses/queries'
import { requireCustomer } from '@/lib/auth/dal'
import { getAccountSettings, offeredCountries } from '@/lib/auth/settings'

/**
 * The profile — node `261:4066`, card `266:5096` (spec 004, US4).
 *
 * Six rows in the order FR-022 fixes: email, full name, addresses, marketing preference, security,
 * and the sign-out control. The order is a requirement rather than a layout choice, so the rows are
 * written out here rather than mapped from an array that could be reordered without anyone noticing.
 *
 * **`requireCustomer` is the guard, and it is here rather than in a layout.** `src/lib/auth/dal.ts`
 * explains why at length; the short version is that a layout does not decide whether its children
 * render. `src/proxy.ts` sends anonymous visitors away before this runs, but that is a courtesy — a
 * forged cookie passes the proxy and is refused on this line (FR-015).
 *
 * **The page keeps a visible heading the design does not draw.** `261:4066` starts straight in on
 * the Email row, which leaves the one page reached from the header's account icon with no title at
 * all — and no `h1` for the document to be named by. The same frame set mislabels this card's
 * Security row as `safety` and omits the Full name row entirely from the empty state, so it is not
 * authoritative on structure. Recorded as an addition, like the registration form's consent box.
 *
 * **One row is drawn but not yet operable, and says so below**: the marketing switch is US6. It is
 * here now because FR-022 fixes the order and a card that grows a row in the middle later is a card
 * that gets re-reviewed three times.
 */
export const metadata: Metadata = {
  title: 'My account',
  robots: { follow: false, index: false },
}

export default async function AccountPage() {
  const customer = await requireCustomer('/account')

  /**
   * The address form's two settings, resolved on the server (FR-028, FR-030).
   *
   * `offeredCountries` turns the shop's list into the options the modal renders, so the client
   * never sees the narrowing rule — only its result. `getAccountSettings` and
   * `getCustomerAddresses` are both `cache`d, so asking here costs one query each.
   */
  const settings = await getAccountSettings()

  return (
    <Container>
      <div className="py-12 md:py-20">
        <h1 className="text-heading-1 text-neutral-primary mb-7.5">My account</h1>

        <div className="bg-neutral-white p-6 md:p-12">
          <dl className="flex flex-col gap-6">
            {/* FR-023 — read-only, and deliberately without an affordance. Changing the address a
                customer signs in with is out of scope, and a pencil that opens nothing is worse
                than no pencil. */}
            <ProfileRow label="Email">{customer.email}</ProfileRow>

            {/* The row and its modal travel together: the open state is client-side, so the
                control that opens it cannot live out here. Same for `AddressList` below. */}
            <NameRow firstName={customer.firstName} lastName={customer.lastName} />

            <AddressList
              addresses={await getCustomerAddresses()}
              countries={offeredCountries(settings)}
              defaultCountry={settings.defaultCountry}
            />

            <ProfileRow
              label="Marketing preferences"
              action={
                /*
                  **Disabled on purpose until US6.** The row must show the customer's current
                  preference (FR-022) and the action that changes it does not exist yet — so the
                  switch reports and does not pretend to accept. A live-looking control that
                  silently discards a click is the one outcome worse than a dull one.
                */
                <Switch
                  label="Email me occasional news and offers"
                  hideLabel
                  checked={customer.marketingEmail}
                  disabled
                  readOnly
                />
              }
            >
              <span className="flex items-center gap-2.5">
                <Icon name="mail" className="text-neutral-secondary size-5" />
                Email
              </span>
            </ProfileRow>

            {/* FR-049 — `Security`, once, everywhere. The composed frames say `safety`; the card
                itself says `Security`, and one label site-wide is the requirement. */}
            <ProfileRow label="Security">
              <ChangePasswordModal />
            </ProfileRow>
          </dl>

          <div className="mt-7.5">
            <SignOutButton />
          </div>
        </div>
      </div>
    </Container>
  )
}
