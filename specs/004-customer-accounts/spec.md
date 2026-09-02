# Feature Specification: Customer Accounts — Authentication and Profile

**Feature Branch**: `004-customer-accounts`

**Created**: 2026-09-01

**Status**: Draft

**Input**: User description: "We should build auth flow and profile page with ability to add address,
name and change marketing mails preferences. All this layouts described here:
[Figma design]
[Figma design] — analyze them"

**Source**: Two Figma sections — `255:3352` ("Авторзиация", nine auth frames) and `266:4382` ("ЛК",
the profile page with its four modals).

This is the spec [docs/mvp-brief.md](../../docs/mvp-brief.md) calls `003-customer-accounts`
(User Story 3, FR-026 – FR-033). It is renumbered `004` because `003` was taken by the shop
catalog. It is also the spec that the `customers` collection was explicitly left waiting for —
[src/collections/customers.ts](../../src/collections/customers.ts) currently documents registration,
verification codes, password reset, and profile screens as "deliberately absent … those are the
customer accounts spec", and keeps `create` admin-only "so nobody can register through an API that
has no flow behind it yet". This spec opens that door.

## Design Inventory

Two sections, seventeen frames, read screen by screen. Most of the input controls already exist in
the kit built in [001-design-system-foundation](../001-design-system-foundation/spec.md); almost all
of the *composition* is new.

### Frames in section `255:3352` — Authentication

| Frame                    | Node        | Size      | Covers                                                     |
| ------------------------ | ----------- | --------- | ---------------------------------------------------------- |
| Welcome Back             | `408:7412`  | 1920×1180 | Sign in — email, password, forgot-password link             |
| register-step-1          | `428:11594` | 1920×1305 | Create account — email, password, confirm password          |
| register-step-2-verify   | `428:11869` | 1920×1186 | Verify your email — six code boxes, resend                  |
| registration-success     | `432:13049` | 1920×1430 | Success card with check emblem and a single continue action |
| ForgotPassword_Screen    | `429:12087` | 1920×1243 | Request a reset code by email                               |
| ForgotPassword_Screen    | `614:13323` | 1920×1231 | Same screen; footer newsletter shown in its error state     |
| VerifyCode_Screen        | `429:12348` | 1920×1248 | Enter the 6-digit reset code                                |
| InvalidCode_Screen       | `429:12615` | 1920×1279 | Same, with "Invalid code. Please try again."                |
| ResetPassword_Screen     | `429:12884` | 1920×1312 | New password and confirmation                               |

### Frames in section `266:4382` — Profile

| Frame                          | Node        | Size      | Covers                                                  |
| ------------------------------ | ----------- | --------- | ------------------------------------------------------- |
| Profile / Profile              | `261:4066`  | 1920×1474 | The profile page in its filled state                    |
| Profile/ (the card itself)     | `266:5096`  | 1718×710  | Five labelled rows plus Sign out                        |
| "Add address" (misnamed)       | `525:13319` | 1920×1227 | The **FULL NAME** modal over an empty-state profile     |
| "Add address"                  | `266:5259`  | 1920×1227 | The ADD ADDRESS modal over an empty-state profile       |
| "Add address"                  | `525:12889` | 1920×1227 | The same modal in its **validation-error** state        |
| Add address (modal alone)      | `583:12968` | 800×555   | The modal as a component, default checkbox hidden       |
| change-password-modal          | `426:11615` | 1920×1080 | CHANGE PASSWORD over a scrim                            |
| Change password (modal alone)  | `426:11616` | 800×529   | Three labelled password fields, Cancel / Save           |
| Frame 96                       | `583:13022` | 450×374   | Newsletter-subscribed confirmation modal                |

Note: three frames in the profile section are all named "Add address" in Figma, but `525:13319`
draws the **Full name** modal, not the address one. The names are treated as unreliable; the
contents govern.

### The profile card, row by row (`266:5096`)

| Row                   | Control                                        | Affordance                        |
| --------------------- | ---------------------------------------------- | --------------------------------- |
| Email                 | Text input showing `email@gmail.com`            | **No edit icon** — read-only      |
| Full name             | Text input showing `Maghzym ayash`              | Pencil → Full name modal          |
| Addresses             | `Kazakhstan, Astana, Mangilik el 22`, or the empty state `No addresses added` | Pencil (filled) / `+` (empty) → Add address modal |
| Marketing preferences | Mail icon, label `Email`, a switch (shown on)   | Toggle in place                   |
| Security              | `change password` link                          | Opens Change password modal       |
| —                     | `Sign out` primary button                       | Ends the session                  |

### Modal contents

- **Full name** (`525:13319`) — `First name`, `Last name`, side by side. Cancel / Save.
- **Add address** (`583:12968`) — Country select (drawn defaulting to `United Kingdom`),
  `Address line 1`, `Address line 2 (optional)`, `Apartment, suite, etc (optional)`, then `City` and
  `Postcode` on one row. A `This is my default address` checkbox sits below, **hidden in the base
  component** and visible in the error frame. Cancel / Save.
- **Add address, error state** (`525:12889`) — `Address line 1`, `Apartment`, and `City` carry red
  borders while `Postcode` holds `010042`; Save is disabled. Note the design marks Apartment as
  *optional* in its placeholder yet flags it as invalid here — treated as a drawing slip, not a
  requirement (see FR-030).
- **Change password** (`426:11616`) — `Current password` with an inline `Fargot password?` link,
  `New password`, `Confirm new password`. Cancel / Save.

### Reuse against the existing kit

| Element                | Status                                                             |
| ---------------------- | ------------------------------------------------------------------ |
| Header, footer, banner | Built — `Header`, `Footer`, `ContactBanner`                        |
| Text inputs            | Built — `TextInput`, `Field`                                       |
| Buttons                | Built — `Button`, `IconButton`                                     |
| Country dropdown       | Built — `Select`                                                   |
| Default-address toggle | Built — `Checkbox`                                                 |
| Marketing toggle       | Built — `Switch`                                                   |
| Modal shell            | Partial — `useOverlay` and `Drawer` exist; a centred **modal** does not |
| Icons                  | Built — `user`, `mail`, `edit`, `close`, `eye` / `eye-off`, `check`, `plus` |
| Six-box code input     | **New** — no equivalent in the kit                                 |
| Auth form layout       | **New** — the 500px-wide centred column shared by every auth screen |
| Profile card rows      | **New** — the labelled read-with-edit row                          |

### Defects observed in the design

Recorded so they are decided rather than copied:

1. **Untranslated strings.** `Вернуться к авторизации` on both forgot-password frames; `Новый
   пароль`, `Повторите пароль`, and `СОХРАНИТЬ` on the reset-password frame; `Такой почты не
   существует` in the footer error state. The rest of the design is English.
2. **`Fargot password?`** — a typo on the sign-in screen and inside the Change password modal.
3. **Label drift** — the profile card labels the row `Security` (`266:5096`) while the composed
   page frames label it `safety` (`525:13319`, `266:5259`, `525:12889`).
4. **Two code screens.** `428:11869` (registration, 60px boxes) and `429:12348` (password reset,
   56px boxes) are the same control drawn twice at different sizes.
5. **No marketing-consent control on the create-account screen** (`428:11594`), which draws only
   email, password, and confirmation — while the profile draws the preference as already on. Marketing
   email is opt-in (FR-036), so the registration form gains an unticked consent control the design
   does not show. This is a deliberate addition, not a drawing to be matched.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create an account and verify the email address (Priority: P1)

A visitor who wants to be known to the shop opens Create account, gives their email address, a
password, and a matching confirmation. The shop emails them a six-digit code. They type it into the
six boxes and the address is confirmed; a success screen tells them the account exists and hands
them onward. If the code never arrives they can ask for another one.

**Why this priority**: Nothing else in this feature exists without an account. It also gates the
request-submission spec that follows, which cannot send an order without knowing who the customer
is.

**Independent Test**: Fully testable on its own — register with a fresh address, read the code from
the delivered email, submit it, and confirm a verified account now exists and the visitor is signed
in. No catalog, cart, or profile involvement.

**Acceptance Scenarios**:

1. **Given** a visitor who has never registered, **When** they submit an email address, a password,
   and a matching confirmation, **Then** an account is created in an unverified state and a
   six-digit code is emailed to that address.
2. **Given** a password and a confirmation that differ, **When** the visitor submits, **Then**
   registration is refused and the mismatch is shown against the confirmation field.
3. **Given** a password below the published minimum strength, **When** the visitor submits, **Then**
   registration is refused and the requirement is stated in full.
4. **Given** an unverified account awaiting its code, **When** the customer enters the correct code,
   **Then** the address is marked verified, the success screen is shown, and they are signed in.
5. **Given** a code that has expired, has already been used, or has been superseded by a newer one,
   **When** it is submitted, **Then** it is refused with a clear message and the option to send a
   new one.
6. **Given** a customer who did not receive the code, **When** they use Resend, **Then** a new code
   is sent, the previous one stops working, and repeat resends are rate-limited.
7. **Given** an email address that is already registered, **When** someone submits it on the create
   form, **Then** the response does not reveal that the address is taken, and no second account is
   created.
8. **Given** the create form, **When** the visitor first sees it, **Then** the marketing-consent
   control is present and unticked, and registration succeeds whether or not they tick it.

---

### User Story 2 - Sign in, stay signed in, and sign out (Priority: P1)

A returning customer opens Sign in, gives the email and password they chose, and is taken to their
profile. They are still signed in on their next visit. Sign out on the profile page ends the session
at once.

**Why this priority**: An account nobody can return to has no value. Sign-in and registration are
the two halves of one door.

**Independent Test**: Sign in with a seeded verified account, close and reopen the browser to
confirm the session survives, then sign out and confirm the profile is no longer reachable.

**Acceptance Scenarios**:

1. **Given** a verified customer, **When** they submit the correct email and password, **Then** they
   are signed into their existing account and taken to the profile page.
2. **Given** a wrong password, **When** they submit, **Then** sign-in is refused with a message that
   does not disclose whether the address is registered.
3. **Given** an account that was never verified, **When** its owner signs in, **Then** they are sent
   to the verification step rather than into the profile.
4. **Given** a signed-in customer, **When** they return to the site in a later browser session,
   **Then** they are still signed in and are not asked for the password again.
5. **Given** a signed-in customer, **When** they choose Sign out, **Then** the session ends
   immediately, the profile becomes unreachable, and going back in the browser does not restore it.
6. **Given** an anonymous visitor, **When** they open the profile URL directly, **Then** they are
   sent to sign-in and, after signing in, land on the profile they asked for.
7. **Given** repeated incorrect passwords for one address, **When** the attempt limit is reached,
   **Then** further attempts are temporarily refused and the customer is told when to try again.

---

### User Story 3 - Recover a forgotten password (Priority: P2)

A customer who cannot remember their password enters their email address on Forgot password,
receives a six-digit code, types it in, and sets a new password. Signing in with the new one works;
the old one no longer does.

**Why this priority**: Without it, every forgotten password is a permanently lost customer and a
message to the seller. It is not P1 only because an account can be created and used before it is
built.

**Independent Test**: From a seeded account, run the three screens end to end and confirm the new
password signs in while the old one is refused.

**Acceptance Scenarios**:

1. **Given** a registered address, **When** it is submitted on Forgot password, **Then** a six-digit
   code is emailed and the code screen is shown.
2. **Given** an address that is **not** registered, **When** it is submitted, **Then** the same
   confirmation is shown and no code is sent, so registration cannot be probed.
3. **Given** a wrong code, **When** it is submitted, **Then** the invalid-code message is shown
   under the boxes and the customer may retry or resend.
4. **Given** a correct code, **When** it is submitted, **Then** the new-password screen is shown.
5. **Given** a new password and a matching confirmation, **When** they are saved, **Then** the
   password is changed, every other active session for that customer ends, and the customer can sign
   in with the new password.
6. **Given** a reset code that has expired or already been spent, **When** it is submitted, **Then**
   it is refused and a fresh one can be requested.

---

### User Story 4 - See and edit the profile (Priority: P2)

A signed-in customer opens the profile page and sees their email address, their full name, their
saved addresses, their marketing preference, and a way to change their password. The pencil beside
Full name opens a small modal with First name and Last name; saving updates the page at once.

**Why this priority**: The profile is the page the whole feature is named for, and the name is what
the seller uses to address the customer in the handoff conversation.

**Independent Test**: Sign in, open the profile, set a first and last name, reload, and confirm the
values persisted and are shown in the Full name row.

**Acceptance Scenarios**:

1. **Given** a signed-in customer, **When** they open the profile page, **Then** they see their own
   email address, name, addresses, marketing preference, and security row — and never another
   customer's.
2. **Given** the profile page, **When** the customer looks at the Email row, **Then** it is shown
   read-only with no edit affordance.
3. **Given** the Full name row, **When** the customer opens it and saves a first and last name,
   **Then** the modal closes and the row shows the new name without a page reload.
4. **Given** the Full name modal, **When** the customer chooses Cancel or the close control, **Then**
   nothing is saved and the previous name remains.
5. **Given** a customer with no name set, **When** they open the profile, **Then** the Full name row
   shows an empty state rather than a blank box.

---

### User Story 5 - Save and manage delivery addresses (Priority: P2)

A customer adds an address so the seller does not have to ask for it in the messenger conversation.
The empty Addresses row says `No addresses added` with a `+`; the modal asks for country, one or two
address lines, an optional apartment, a city, and a postcode, and offers to mark it the default. A
saved address can be edited or removed.

**Why this priority**: Explicitly requested, and drawn in full including its error state. It removes
the most tedious part of the seller's handoff conversation.

**Independent Test**: From a signed-in account with no addresses, add one, reload to confirm it
persisted, edit it, add a second, switch the default, and delete one.

**Acceptance Scenarios**:

1. **Given** a customer with no saved address, **When** they open the profile, **Then** the
   Addresses row shows `No addresses added` and a control to add one.
2. **Given** the Add address modal, **When** the customer supplies country, address line 1, city,
   and postcode and saves, **Then** the address is stored against their account and appears in the
   Addresses row.
3. **Given** a required field left empty, **When** the customer attempts to save, **Then** Save
   stays disabled, the offending fields are marked, and nothing is stored.
4. **Given** a saved address, **When** the customer opens it from the Addresses row, **Then** the
   modal opens pre-filled and saving updates that address rather than creating another.
5. **Given** a customer with more than one address, **When** they mark one as default, **Then**
   exactly one address is the default and the previous default is no longer marked.
6. **Given** the customer's only saved address, **When** they save it, **Then** it becomes the
   default automatically.
7. **Given** a saved address, **When** the customer deletes it, **Then** it is removed after a
   confirmation, and if it was the default another address takes that role.
8. **Given** any address, **When** it is stored, **Then** it belongs to that customer alone and no
   other customer can read or change it.

---

### User Story 6 - Control marketing email preferences (Priority: P3)

A customer decides whether the shop may email them offers and news. One switch on the profile page,
in the Marketing preferences row, turns it on or off, and the change takes effect immediately.

**Why this priority**: Legally required to be revocable and quick to build, but it does not block
anything else in the feature.

**Independent Test**: Toggle the switch, reload the page, and confirm the state persisted; toggle it
back and confirm the same.

**Acceptance Scenarios**:

1. **Given** a signed-in customer, **When** they open the profile, **Then** the Marketing
   preferences row shows their current choice as a switch labelled `Email`.
2. **Given** the switch, **When** the customer changes it, **Then** the new choice is saved without a
   page reload and survives a reload.
3. **Given** the switch, **When** saving fails, **Then** the switch returns to its previous position
   and the failure is stated rather than silently swallowed.
4. **Given** a customer who has turned marketing email off, **When** the shop sends a marketing
   campaign, **Then** that customer is excluded, while transactional email — codes, password
   changes — still reaches them.
5. **Given** any change to the preference, **When** it is saved, **Then** the choice and the moment
   it was made are recorded so consent can be evidenced.

---

### User Story 7 - Change the password while signed in (Priority: P3)

A signed-in customer opens `change password` in the Security row, gives their current password and a
new one twice, and saves. If they cannot remember the current one, a link inside the modal takes
them to the forgot-password flow.

**Why this priority**: A convenience over the reset flow, which already covers the case. Small, and
last.

**Independent Test**: From a signed-in account, change the password and confirm the new one signs in
and the old one does not.

**Acceptance Scenarios**:

1. **Given** the Security row, **When** the customer chooses `change password`, **Then** the modal
   opens with three empty password fields.
2. **Given** a correct current password and a matching new pair, **When** saved, **Then** the
   password is changed and the customer is told so.
3. **Given** an incorrect current password, **When** saved, **Then** the change is refused and the
   error is shown against the current-password field.
4. **Given** a new password that does not match its confirmation, or that fails the strength rule,
   **When** saved, **Then** the change is refused and the reason is stated.
5. **Given** a successful change, **When** it completes, **Then** the customer's other sessions are
   ended while the current one continues.
6. **Given** the modal, **When** the customer follows the forgot-password link inside it, **Then**
   they reach the reset flow without losing their session.

---

### Edge Cases

- **Never-verified accounts.** An address is registered but the code is never entered. The account
  must not block that address forever, and it must not linger as personal data indefinitely.
- **Registering an address that already has an unverified account.** The submission must neither
  create a duplicate nor confirm to the sender that the address is known.
- **Code entered on a different device or browser** than the one that requested it.
- **Paste of a full six-digit code** into the first box, and browser or OS autofill of an emailed
  code.
- **Backspace, arrow keys, and focus movement** across the six boxes, including deleting from the
  middle of a partly typed code.
- **Email delivery fails or is delayed.** The customer must be able to resend without re-registering,
  and must not be told the address does not exist when the mail simply bounced.
- **The session expires while a modal is open** with unsaved edits.
- **Two tabs open on the profile**, one signing out while the other edits.
- **A very long name, a very long address line, or non-Latin characters** in any profile field must
  not break the row layout or the modal.
- **A customer with many saved addresses** — the Addresses row must remain usable rather than growing
  without bound.
- **Deleting the default address** when it is the only one.
- **The browser back button after signing out**, which must not restore a cached profile page.
- **A signed-in customer opening the sign-in or create-account URL** directly.
- **Erasure request while orders exist** — personal data must be removable without destroying the
  seller's commercial record.

## Requirements *(mandatory)*

### Functional Requirements

#### Registration and verification

- **FR-001**: Visitors MUST be able to create an account by submitting an email address, a password,
  and a matching confirmation of that password.
- **FR-002**: The system MUST reject a registration whose confirmation does not match the password,
  and MUST show the mismatch against the confirmation field without clearing the form.
- **FR-003**: The system MUST enforce a published minimum password strength at registration, at
  password reset, and at password change, and MUST state the requirement to the customer before and
  after a failed attempt.
- **FR-004**: On registration the system MUST create the account in an unverified state and email a
  six-digit numeric verification code to the submitted address.
- **FR-005**: Verification codes MUST expire after a bounded period, MUST be single-use, and MUST be
  invalidated when a newer code is issued for the same address.
- **FR-006**: Customers MUST be able to request a new verification code, and the system MUST
  rate-limit those requests per address and per origin.
- **FR-007**: Entering a valid code MUST mark the address verified, sign the customer in, and show
  the registration-success screen with a single onward action.
- **FR-008**: An unverified account MUST NOT be usable for anything beyond completing its own
  verification.
- **FR-009**: Registration with an address that already has an account MUST NOT create a second
  account and MUST NOT disclose that the address is registered.

#### Sign-in, session, and sign-out

- **FR-010**: Returning customers MUST sign in with the email address and password they registered,
  and the flow MUST resolve to their existing account rather than creating a duplicate.
- **FR-011**: The sign-in flow MUST NOT reveal whether an email address is registered, whether the
  password or the address was wrong, or whether the account is verified — beyond routing an
  authenticated-but-unverified customer to the verification step.
- **FR-012**: A signed-in customer MUST remain signed in across browser sessions until they sign out
  or the session expires.
- **FR-013**: Signing out MUST end the session immediately and MUST make the profile unreachable,
  including via the browser's back button.
- **FR-014**: The system MUST rate-limit sign-in attempts per address and per origin and MUST
  temporarily refuse further attempts after a bounded number of consecutive failures, telling the
  customer when they may retry.
- **FR-015**: The profile page MUST be reachable only by a signed-in, verified customer; anonymous
  visitors MUST be redirected to sign-in and returned to the profile afterwards.
- **FR-016**: The account control in the site header MUST lead to sign-in when anonymous and to the
  profile when signed in.

#### Password recovery and change

- **FR-017**: Customers MUST be able to request a password reset by email address, and the system
  MUST respond identically whether or not the address is registered.
- **FR-018**: Password reset MUST be completed by entering an emailed six-digit code — not by
  following a reset link — after which the customer sets a new password and its confirmation.
- **FR-019**: An incorrect reset code MUST be refused in place, beneath the code boxes, leaving the
  customer able to retry or request a new code.
- **FR-020**: Signed-in customers MUST be able to change their password by supplying the current
  password, a new password, and its confirmation, and the modal MUST offer a route to the reset flow
  for customers who cannot recall the current one.
- **FR-021**: A completed password reset or change MUST end all other active sessions for that
  customer.

#### Profile

- **FR-022**: The profile page MUST show the signed-in customer's email address, full name, saved
  addresses, marketing preference, security actions, and a sign-out control, in that order.
- **FR-023**: The email address MUST be shown read-only on the profile; changing it is out of scope
  for this feature.
- **FR-024**: Customers MUST be able to set and change their first and last name through a dedicated
  modal, and the profile MUST reflect the change without a page reload.
- **FR-025**: Every row that has no value yet MUST show an explicit empty state rather than a blank
  control.
- **FR-026**: A customer MUST be able to read and modify only their own profile, addresses, and
  preferences, enforced at the data layer rather than by the interface alone.

#### Addresses

- **FR-027**: Customers MUST be able to save one or more delivery addresses, each capturing country,
  address line 1, an optional address line 2, an optional apartment or suite, city, and postcode.
- **FR-028**: Country MUST be chosen from a list rather than typed freely.
- **FR-029**: Customers MUST be able to edit and delete a saved address; deletion MUST require
  confirmation.
- **FR-030**: Country, address line 1, city, and postcode MUST be required; address line 2 and
  apartment MUST be optional. Save MUST remain disabled while any required field is empty, and
  invalid fields MUST be marked individually.
- **FR-031**: Exactly one saved address MUST be the default at any time. The first address saved
  becomes the default automatically, marking another as default MUST clear the previous one, and
  deleting the default MUST promote another address if one remains.
- **FR-032**: Saved addresses MUST be readable and writable only by the customer who owns them.

#### Marketing preferences

- **FR-033**: Customers MUST be able to turn marketing email on and off from the profile with a
  single control, and the change MUST take effect immediately and persist.
- **FR-034**: The system MUST record the customer's marketing choice together with the moment it was
  made, so consent can be evidenced and withdrawal proven.
- **FR-035**: Customers who have turned marketing email off MUST be excluded from marketing sends
  while continuing to receive transactional email — verification codes, password-change notices, and
  order correspondence.
- **FR-036**: Marketing email MUST be opt-in. New accounts MUST default to off, and the
  create-account screen MUST carry an explicit, unticked consent control alongside the existing
  fields. A registration submitted without it MUST still succeed, with marketing email off.
- **FR-036a**: The consent control MUST NOT be a condition of registering. Bundling marketing
  consent into the terms of creating an account would make the consent unfreely given, and the
  account MUST be creatable with it left unticked.

#### Security and privacy

- **FR-037**: Passwords MUST be stored using a memory-hard hash and MUST never be recoverable,
  logged, or emailed.
- **FR-038**: Verification codes MUST NOT be logged in plain text and MUST NOT appear in analytics or
  error reporting.
- **FR-039**: Customer accounts MUST NOT grant any access to the admin area; store staff MUST
  continue to authenticate separately.
- **FR-040**: Personal data collected here — name, addresses, marketing choice — MUST have a
  documented retention period and a working deletion path that preserves the seller's commercial
  record of past orders.
- **FR-041**: Unverified accounts MUST be purged after a bounded period so an abandoned registration
  neither holds an address hostage nor retains personal data indefinitely.

#### Presentation

- **FR-042**: Every auth screen MUST render inside the existing site chrome — contact banner, header,
  footer — as a centred single-column form, and MUST be responsive at the project's breakpoints
  rather than fixed to the drawn desktop width.
- **FR-043**: The six-digit code control MUST accept typing, pasting a full code into any box,
  backspace across boxes, arrow-key movement, and browser or OS autofill of an emailed code.
- **FR-044**: Password fields MUST offer a show/hide control.
- **FR-045**: Every screen MUST express its loading, disabled, error, and success states; no action
  may leave the customer without feedback while it is in flight.
- **FR-046**: All auth and profile flows MUST be completable by keyboard alone and with a screen
  reader, with errors announced and focus moved into and returned from every modal.
- **FR-047**: All customer-visible copy MUST resolve the defects recorded in the Design Inventory
  rather than reproducing them — the untranslated Russian strings, the `Fargot password?` typo, and
  the `Security` / `safety` drift — and MUST be defined in exactly one place per string.

  > **Amended during implementation.** This originally required the copy to come from Payload. It
  > does not: authentication and profile copy now lives in `src/lib/auth/copy.ts`. These screens are
  > functional UI rather than shop content, and three of their strings are load-bearing for security
  > — `signInFailed` and `forgotSent` are shown identically whether or not the address is registered,
  > and an edit that sharpened either into something more helpful would turn the form into a way to
  > enumerate customers. Wording that carries a security property belongs where it gets code review.
  > Shop content is unaffected and stays in Payload (Constitution I). See research R11.
- **FR-048**: The registration and password-reset code screens MUST be one control, not two — the
  two sizes drawn in Figma are a drafting artefact.
- **FR-049**: The Security row MUST use one label site-wide, resolving the `Security` / `safety`
  drift in the design.

### Key Entities

- **Customer**: A person who shops. Holds email address, verification state, password credential,
  first and last name, marketing choice, and the moment that choice was made. Owns its addresses.
  Already exists as a collection; this feature adds the fields and opens public registration.
- **Verification code**: A short-lived, single-use six-digit value bound to one email address and
  one purpose (verify an address, or authorise a password reset). Carries an issue time, an expiry,
  a spent flag, and an attempt count. Superseded when a newer code is issued for the same address
  and purpose.
- **Address**: A delivery destination belonging to exactly one customer. Holds country, address line
  1, optional address line 2, optional apartment, city, postcode, and whether it is that customer's
  default.
- **Session**: Proof that a customer is signed in, surviving browser restarts until sign-out or
  expiry, and revocable in bulk when a password changes.
- **Marketing consent record**: The customer's current marketing choice and the timestamp it was
  made, sufficient to evidence consent or its withdrawal.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A customer completes account creation — from opening the create form to being signed in
  with a verified address — in under 90 seconds.
- **SC-002**: 90% of first-time customers complete account creation on their first attempt without
  contacting the seller for help.
- **SC-003**: A returning customer signs in and reaches their profile in under 15 seconds.
- **SC-004**: A customer saves their first delivery address in under 60 seconds from opening the
  profile.
- **SC-005**: A customer who has forgotten their password regains access — request, code, new
  password, signed in — in under 3 minutes.
- **SC-006**: 100% of the register, verify, sign in, profile-edit, address, preference, and sign-out
  journeys are completable using a keyboard alone and with a screen reader.
- **SC-007**: Zero customers can read or modify another customer's profile, addresses, or
  preferences, verified by direct request attempts against another account's identifiers.
- **SC-008**: Zero customer accounts can reach the admin area, verified by direct-URL attempts with a
  customer session.
- **SC-009**: Zero duplicate accounts are created across repeated, refreshed, or retried
  registrations of the same email address.
- **SC-010**: Neither the sign-in nor the forgot-password response differs — in wording, in shape, or
  in timing beyond normal variance — between a registered and an unregistered address.
- **SC-011**: 100% of expired, spent, or superseded verification codes are refused, verified across
  all three cases for both registration and password reset.
- **SC-012**: A marketing preference change is reflected in the next campaign send 100% of the time,
  and turning it off never suppresses a verification code or a password-change notice.
- **SC-013**: The profile, sign-in, and create-account pages present usable content within 2.5
  seconds on a mobile connection at the 75th percentile.
- **SC-014**: Zero password values, verification codes, or session tokens appear in application logs,
  analytics, or error reports, verified by inspection of a full journey's output.

## Assumptions

- **The brief governs the flow shape.** `docs/mvp-brief.md` settled that registration is email +
  password + confirmation, that a code verifies the address, and that a code — not a link —
  authorises a password reset. The designs match, and this spec follows both.
- **Saved addresses are pulled forward.** The brief listed saved addresses among Phase 2 concerns
  (SC-016). The design draws them and the request names them explicitly, so they ship here. Nothing
  consumes an address yet; it exists so the seller need not ask for it in the handoff conversation,
  and so checkout has it when it arrives.
- **Phone number and messenger handle are deferred.** Brief FR-032 lists them among editable contact
  details, but neither appears in the profile design. They are left to the request-and-handoff spec,
  which is where a messenger handle is actually used.
- **Email address is not editable.** The Email row carries no edit affordance in the design, and
  changing a verified address requires re-verification and a conflict rule. Out of scope.
- **Social sign-in is out of scope.** A `google.svg` icon exists in the asset set, but no design
  frame offers a social provider.
- **Order history is out of scope.** No design frame shows it, and no orders exist yet.
- **Code format**: six digits, numeric, as drawn in both code screens.
- **Bounded periods**: verification and reset codes expire in 10 minutes; unverified accounts are
  purged after 7 days; sessions persist 30 days. All three are stated so they are testable, and all
  three are configuration rather than constants in code.
- **Minimum password strength**: at least 8 characters, checked against a common-password list. Not
  a composition rule — length and uniqueness are what a memory-hard hash is worth defending.
- **Country list**: full ISO country list. The design's `United Kingdom` default is placeholder
  content; the actual default follows the shop's configured market rather than being hardcoded.
- **Address validation is format-level, not deliverability-level.** No third-party address
  verification service is introduced.
- **The design's desktop-only frames are not the whole story.** Unlike spec 003, this section was
  drawn at 1920 only. Tablet and mobile layouts are derived from the existing breakpoints and the
  kit's responsive behaviour rather than from new frames.
- **Email delivery is a dependency this feature introduces.** No mail transport is configured in the
  project today; registration cannot ship without one. Choosing and wiring it belongs to the plan.
- **The `customers` collection is extended, not replaced.** It already exists with owner-scoped read
  and update access; this feature adds fields, opens `create` to the public, and adds addresses.
- **A centred modal is a new kit component.** `Drawer` and `useOverlay` exist; the four modals here
  are the second, third, fourth, and fifth consumers of a shell that does not exist yet, so it is
  built in the kit rather than in a feature folder (Constitution II).
