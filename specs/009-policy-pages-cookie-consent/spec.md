# Feature Specification: Policy Pages and Cookie Consent — What the Site Says About Itself

**Feature Branch**: `009-policy-pages-cookie-consent`

**Created**: 2026-09-11

**Status**: Draft

**Input**: User description: "check [five Figma nodes]. Thats the politics pages + cookie banner. We don't have any google analytics etc but I think in the future that might be, so what can be in the cookie politics? Only use of cookie? I think the cookie banner should be managable from the admin panel. All politics also should be writtable from the admin panel"

---

## Design Inventory

### Frames

| Node | What it is | Breakpoints drawn |
| --- | --- | --- |
| `312:8734` | Privacy Policy page | desktop, tablet, mobile |
| `312:8735` | Terms of Use page | desktop, tablet, mobile |
| `312:8736` | Cookie Policy page | desktop, tablet, mobile |
| `312:9999` | Shipping & Returns page | desktop, tablet, mobile |
| `255:3381` | Cookie consent banner | desktop `255:3354`, tablet `544:16179`, mobile `544:16200` |

### The four pages are the site's last four dead links

The footer has carried all four destinations since spec 001 and every one of them is a 404 in
production today. `src/components/layout/footer/footer.tsx` hardcodes them:

- `Shipping & Returns → /shipping` (under CUSTOMER CARE)
- `Privacy Policy → /privacy`, `Terms & Conditions → /terms`, `Cookie Policy → /cookies` (the legal row)

All four are 404s. This feature serves them under a `/legal/` prefix and repoints the footer — see
FR-001 for why moving the links is free rather than a migration.

Spec 008 closed `/contact` and `/faq` and claimed in its own words that "every navigation item,
footer link and call to action on this site resolves". That claim was true of the *chrome above* the
footer's bottom rail and false of the rail itself. This spec makes it true.

### What each page actually contains

All four pages are the same shape, and that sameness is the single most important fact in this
document:

1. A centred page title in caps — `PRIVACY POLICY`, `TERMS OF USE`, `COOKIE POLICY`,
   `SHIPPING & RETURNS`.
2. A centred subtitle. Three of the four read `Last Updated: August 2026`; `SHIPPING & RETURNS`
   reads `Enjoy complimentary shipping and returns on all orders` — so the line is a free text
   field, not a rendered date.
3. One column of prose: a lede paragraph, then headed sections, then paragraphs, bullet lists,
   bolded run-in terms (`**Exchanges:** …`), and inline links (`hello@unsaid.com`,
   `Google's Privacy & Terms site`).

   **A section heading is bold and darker, not bigger** (`422:10504`): `H3/Bold` — Manrope 700 at
   16px — in `neutral/primary`, against a body of `H3/Medium` 500 in `neutral/secondary`. The
   distinction between them is weight, colour and capitals at one size, never a step up the type
   scale.
4. A signature couplet at the foot of three of them — `Aurum` / `Timeless brilliance. Modern
   responsibility.`
5. The existing site footer.

There is no second column, no sidebar, no contents rail, no accordion, no image, no call-to-action
band. **Nothing on these four pages is a new component.** They are the existing page header band and
the existing `RichText` renderer in the existing `Container`, and that is all.

### What the banner contains

A wide panel over the page, not a full-screen overlay — the hero stays visible and the visitor can
still read the site. Desktop (`196:1452`) centres a 1300px panel on `background/bg` with a gap
beneath; tablet and mobile go full-bleed and sit flush to the bottom edge. Title `COOKIE POLICY` in
the serif H1 at 36px, one block of prose at 16px in `neutral/secondary`, then three buttons of equal
weight and equal width — **all three filled in `primary/default`**, not one primary and two
outlines:

| Button | What it means |
| --- | --- |
| `AGREE` | Consent to every category |
| `CONFIGURE ALL COOKIES` | Open a per-category chooser |
| `ALLOW TECHNICAL COOKIES` | Strictly necessary only — the refusal |

Desktop and tablet lay the three out in a row; mobile stacks them full-width in the same order.

**The three identical buttons are the design being more compliant than the obvious build.** Filling
*Agree* and outlining the other two is the conventional pattern and is exactly what FR-019 forbids:
refusing has to be as easy and as prominent as accepting. Three matching buttons say that visually
rather than merely satisfying it on a stopwatch.

### What is deliberately absent from the drawing

- **The panel behind `CONFIGURE ALL COOKIES` does not exist in Figma.** The button is drawn, its
  destination is not. This spec has to invent it, and says so rather than pretending the design
  settled it.
- **There is no way back to the banner once a choice is made.** No footer "Cookie settings" link, no
  floating re-entry button. A consent mechanism a visitor cannot reopen is not a consent mechanism —
  withdrawal has to be as available as consent was — so this spec adds one.
- **There is no close or dismiss affordance.** Choosing is the only exit, which is the correct
  reading: an ignorable banner records nothing.
- **The drawn banner copy describes a different website than this one.** It says the site "uses
  third-party cookies, pixels, and similar technologies", "various Google services", and sends
  "advertising materials in line with the preferences shown while browsing". None of that is true
  today (see below). The words are placeholder copy from a template, and treating them as a
  requirement would mean publishing a false statement about data processing. They are the *default*
  this feature must replace, not the target.

### What cookies this site actually sets today

Verified against the codebase, not assumed:

| Cookie | Purpose | Category |
| --- | --- | --- |
| Payload session cookie (`payload-token`, prefixed) | Keeps a signed-in customer signed in | Strictly necessary |
| `aurum-cart` | The bearer credential for a guest's own cart — `httpOnly` | Strictly necessary |
| `aurum-cart-count` | The number on the header's cart badge | Functional, no identifier |

There is no analytics, no tag manager, no advertising pixel, no third-party script of any kind
anywhere in `src/`. `src/lib/cart/cookie.ts` already records the conclusion spec 005 reached: both
cart cookies are strictly functional and therefore are **not** gated behind consent.

**So the answer to "what can be in the cookie policy — only use of cookies?" is: yes, today.** The
honest Cookie Policy explains what cookies are, names the three the site sets, says plainly that no
analytics or advertising cookies are used, and explains how to clear them.

**And that truth is the thing this feature has to protect.** Nothing in this spec loads, gates, or
integrates a third-party script — no analytics is planned, and a gate built before the thing it
gates is code with no consumer. What it does instead is make the banner structurally incapable of
claiming consent for a category the site does not actually have, and keep the categories in the
chooser and the text of the Cookie Policy editable from one place so they cannot drift apart or
drift away from what is true.

The banner's paragraph is editable too (FR-025); only its heading and button labels are fixed, and
FR-025c forbids those from asserting anything about the cookie set. A fixed sentence that names what
the site tracks is a sentence that goes stale without anyone noticing.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A visitor reads what the shop promises (Priority: P1)

A visitor about to hand over a name, an address, and a jewellery preference clicks *Privacy Policy*
in the footer. The page opens and reads as a page of this site — same header, same typography, same
footer — and tells them what is collected and why. The same is true of *Terms & Conditions*, *Cookie
Policy*, and *Shipping & Returns*.

**Why this priority**: Four links the site itself publishes currently answer with "not found". That
is the plainest possible failure and it sits on every page of the site. Everything else in this spec
is refinement; this is the hole.

**Independent Test**: Click all four footer destinations on a fresh deploy. Each renders a titled,
readable page with the site chrome. Delivers value with no banner and no admin work beyond seeded
content.

**Acceptance Scenarios**:

1. **Given** a visitor on any page of the site, **When** they click *Privacy Policy* in the footer,
   **Then** a page headed *Privacy Policy* opens with the policy text and the site's header and
   footer.
2. **Given** the same visitor, **When** they click *Terms & Conditions*, *Cookie Policy*, or
   *Shipping & Returns*, **Then** the corresponding page opens the same way.
3. **Given** a visitor on a 390px-wide phone, **When** any policy page opens, **Then** the prose is
   one readable column with no horizontal scrolling and no text narrower than the design's mobile
   frame.
4. **Given** a policy whose text contains a link to another policy or to an email address, **When**
   the visitor taps it, **Then** it resolves.
5. **Given** a page the owner has not yet written any content for, **When** a visitor reaches it,
   **Then** they see the page's title and a short honest placeholder rather than an empty page or a
   404.

---

### User Story 2 - A visitor decides about cookies, and can change their mind (Priority: P2)

On a first visit the banner appears over the page. The visitor can agree to everything, allow only
technical cookies, or open the chooser and decide category by category. Whatever they choose is
remembered, honoured everywhere on the site, and reopenable later from the footer.

**Why this priority**: Constitution VI requires non-essential cookies and trackers to be gated on
explicit consent. Today there are no non-essential cookies to gate, so the banner delivers *legal
posture and future capability* rather than immediate protection — which is exactly why it ranks
below the four missing pages and above everything else.

**Independent Test**: Load the site in a fresh browser profile, make each of the three choices in
turn, and confirm the banner does not return, the decision persists across a reload and a new tab,
and the footer entry point brings it back.

**Acceptance Scenarios**:

1. **Given** a visitor with no prior decision, **When** any page of the site loads, **Then** the
   banner appears without shifting the page content that has already been drawn.
2. **Given** the banner is showing, **When** the visitor chooses *Agree*, **Then** every category is
   enabled, the banner closes, and it does not reappear on later pages or later visits.
3. **Given** the banner is showing, **When** the visitor chooses *Allow Technical Cookies*, **Then**
   every optional category is refused, the banner closes, and nothing outside the strictly necessary
   set is stored or loaded.
4. **Given** the banner is showing, **When** the visitor chooses *Configure All Cookies*, **Then** a
   chooser opens listing each category with its name, its plain-language purpose, and a control —
   strictly necessary shown as permanently on and explained, every other category off until turned
   on — with a single action to save.
5. **Given** a visitor who has decided, **When** they open the cookie settings entry point in the
   footer, **Then** the chooser reopens showing their current choices, and saving a narrower set
   takes effect immediately.
6. **Given** a visitor who refused and later agrees, **When** they save, **Then** the new decision
   replaces the old one immediately and the change is confirmed on screen rather than left to be
   inferred.
7. **Given** a visitor using only a keyboard, **When** the banner appears, **Then** it is reachable
   in the tab order without traversing the whole page first, every control is operable, and focus is
   visible throughout.
8. **Given** a visitor who ignores the banner and browses on, **When** they move between pages,
   **Then** the banner is still there and still un-dismissed, and no optional cookie has been set.

---

### User Story 3 - The owner rewrites any policy without a developer (Priority: P3)

The owner opens the admin, edits the Privacy Policy — a new paragraph, a new headed section, a
bolded term, a link — previews it, sets the effective date, and publishes. The live page changes.
No deploy, no ticket, no engineer.

**Why this priority**: Policies change because the law changes or the business changes, and both
happen on someone else's schedule. Constitution I is explicit that anything an editor should be able
to change without a deploy must be changeable without a deploy; a legal page that requires a release
is the clearest possible violation.

**Independent Test**: In the admin, change a sentence in each of the four policies and publish.
Confirm each live page shows the new sentence on the next view, and that an unpublished draft does
not.

**Acceptance Scenarios**:

1. **Given** an owner in the admin, **When** they open a policy, **Then** they find its title, its
   subtitle line, its body, its effective date, and its search-engine metadata in one form.
2. **Given** the owner editing a body, **When** they use headings, paragraphs, bullet and numbered
   lists, bold, italics, and links, **Then** all of those render on the live page as drawn.
3. **Given** the owner has made changes, **When** they save without publishing, **Then** visitors
   continue to see the previously published version.
4. **Given** the owner publishes, **When** a visitor next loads the page, **Then** they see the new
   text with no deployment having occurred.
5. **Given** a published policy, **When** the owner needs to undo a change, **Then** they can restore
   a previous version from the admin.
6. **Given** the owner fixes a typo, **When** they publish, **Then** the displayed effective date
   does **not** change unless they change it themselves.

---

### User Story 4 - The owner controls what the banner says, and when it asks (Priority: P4)

The owner writes the banner's paragraph, and controls *when it asks*: they can force every visitor
to be asked again after a material change to the Cookie Policy, and they can switch the banner off
entirely. Only the heading and the three button labels are fixed in code.

**Why this priority**: A policy change that materially alters what a visitor agreed to invalidates
the agreement, and re-asking has to be possible on the owner's schedule — the policy text is theirs
to change, so the consequence of changing it must be theirs to trigger. Below the policy pages and
the banner itself because neither depends on it.

**Independent Test**: Advance the consent version in the admin and confirm a visitor who had already
decided is asked again. Switch the banner off and confirm it stops appearing. Neither needs a deploy.

**Acceptance Scenarios**:

1. **Given** the owner changes the consent version because the policy materially changed, **When** a
   visitor who had already decided returns, **Then** the banner appears again with their previous
   choices as the starting point.
2. **Given** a visitor who is asked again, **When** they do not answer, **Then** their previous
   decision does not continue to count as consent for the new version.
3. **Given** the owner turns the banner off, **When** a visitor with no prior decision loads the
   site, **Then** no banner appears and no optional category is treated as consented.
4. **Given** the owner turns the banner back on, **When** a visitor who had decided returns,
   **Then** their existing decision still stands and they are not asked again.
5. **Given** an owner editing the banner's paragraph, **When** they publish, **Then** a visitor with
   no prior decision sees the new wording, with no deploy — and the heading and button labels are
   unchanged.
6. **Given** the owner clears the paragraph entirely, **When** a visitor loads the site, **Then** the
   banner falls back to safe built-in wording rather than rendering a gap.

> **This story has been rewritten twice.** It first made the whole banner editable; the owner then
> fixed all of it in code; the owner has now split the two, and the split is the right one. The body
> is the only part that makes a claim, so it is the only part that has to be correctable without a
> release. See FR-025.

---

### User Story 5 - The chooser and the Cookie Policy tell the same story (Priority: P5)

The owner edits the Cookie Policy to explain the three cookies the site sets. The chooser lists the
same set, in the owner's words, from the same place in the admin. Neither can drift from the other,
and neither can drift from the truth.

**Why this priority**: A consent mechanism whose categories and whose published policy disagree is
worse than no consent mechanism — it is a documented false statement. It is last because the site is
honest on day one whether or not this is enforced, and the risk only accumulates over time.

**Independent Test**: Change a category's name and purpose in the admin. Confirm the chooser shows
the new wording immediately, and that nothing else was needed to keep the policy page consistent.

**Acceptance Scenarios**:

1. **Given** a site with only the strictly necessary category configured, **When** a visitor opens
   the chooser, **Then** they see that category explained, shown as permanently on, and are told
   plainly that no optional cookies are in use.
2. **Given** the owner edits a category's name or purpose, **When** a visitor opens the chooser,
   **Then** they see the new wording, with no deployment.
3. **Given** the owner adds an optional category, **When** a visitor with no prior decision arrives,
   **Then** the banner and the chooser both offer it, off by default, and a visitor who already
   decided is asked again rather than inherited.
4. **Given** the owner removes a category, **When** any visitor loads the site, **Then** it is gone
   from the chooser and stored decisions about it are ignored.
5. **Given** any consent state at all, **When** a visitor browses the whole site, **Then** nothing
   outside the strictly necessary set is set, loaded, or contacted — because nothing else exists.

> **Note on what this story no longer contains.** An earlier draft made this "analytics arrives later
> and nothing is deployed", with admin-managed providers and consent-gated script loading. That was
> cut deliberately: the site has no analytics and none is planned, and building the gate before the
> thing it gates is code with no consumer, which Constitution II and the complexity rule both refuse.
> What it will take to add analytics later is recorded under **Out of Scope** so the cost is known
> rather than discovered.

---

### User Story 6 - The policies are found, shared, and indexed correctly (Priority: P6)

Someone searching for the shop's returns terms finds the page in a search engine. Someone pasting
the Privacy Policy link into a chat gets a title and a description rather than a bare URL.

**Why this priority**: Real value, entirely additive, and nothing else depends on it.

**Independent Test**: Inspect each of the four pages for its title, description, canonical address
and social preview, and confirm all four appear in the site's machine-readable list of addresses.

**Acceptance Scenarios**:

1. **Given** a published policy, **When** a search engine reads it, **Then** it finds a title and
   description the owner controls, falling back to the page's own title when unset.
2. **Given** any of the four pages, **When** it is requested, **Then** it declares one canonical
   address, and that address is the one the footer links to.
3. **Given** the four pages, **When** the site's list of addresses is fetched, **Then** all four
   appear in it.
4. **Given** a policy link shared in a messenger, **When** the preview is generated, **Then** it
   carries the page's title and description.
5. **Given** the whole content of the page is written by the owner, **When** it is requested,
   **Then** the text is present in the first response rather than assembled afterwards in the
   browser.

---

### Edge Cases

- **A visitor who blocks all cookies outright.** The decision cannot be stored, so the banner
  reappears on every page. It must still be usable and must never break the page; the site behaves
  as though everything optional was refused.
- **A visitor with an old decision after a category is added.** Their stored decision says nothing
  about the new category. It must be treated as refused, and the banner must ask again — silently
  inheriting consent to something nobody was asked about is the exact failure consent exists to
  prevent.
- **A visitor with a stored decision referring to a category that no longer exists.** Ignored
  without error.
- **A tampered or corrupt stored decision.** Treated as no decision at all: ask again, refuse
  everything until answered.
- **The banner is on, but the policy it links to is unpublished or deleted.** The banner must still
  render and the link must not be a dead end.
- **The owner publishes a policy with an empty body.** The page renders its title and an honest
  placeholder, not a blank column.
- **The owner writes a heading level the design has no style for.** The renderer handles it rather
  than dropping the text.
- **Two pages given the same address.** Rejected at save time with a message that says which other
  page holds it.
- **A screen reader user arrives.** The banner must be announced without stealing focus mid-sentence
  from whatever the visitor was already reading, and must be findable and operable afterwards.
- **The banner and a page that already has a modal open.** They must not stack into a trap where
  neither can be dismissed.
- **Reduced-motion preference.** Whatever entrance the banner has, it respects it.
- **A very long policy on a phone.** Readable, with no reliance on a contents rail the design does
  not have.

---

## Requirements *(mandatory)*

### The four policy pages

- **FR-001**: The site MUST serve four policy pages under a `/legal/` prefix — `/legal/privacy`,
  `/legal/terms`, `/legal/cookies`, and `/legal/shipping` — and the footer's four destinations MUST
  be updated to point at them.

  > An earlier draft required the four bare addresses the footer publishes today, on the grounds
  > that no footer link should move to accommodate an easier address. The owner chose the prefix
  > instead, and it is the better call: those four addresses have never resolved — they are 404s in
  > production — so nothing is being migrated, no external link is being broken, and no redirect is
  > owed. What the prefix buys is recorded in the plan: the site's single root-level dynamic segment
  > belongs to the catalogue, and sharing it would have meant re-routing the catalogue as a side
  > effect of shipping legal pages.
- **FR-002**: Each page MUST render a centred title, a centred subtitle line, and one column of the
  owner's prose, matching the drawn frames at desktop, tablet, and mobile widths.
- **FR-003**: The body MUST support headed sections, paragraphs, bullet and numbered lists, bold and
  italic runs, and inline links, because the drawn copy uses every one of them.
- **FR-004**: Each page MUST carry the site's existing header, contact strip, and footer without
  variation.
- **FR-005**: Each page MUST be rendered with meaningful content in the first response.
- **FR-006**: A page whose body is empty or unpublished MUST render its title and a short honest
  message. It MUST NOT return "not found" — the site links to it from every page it serves.
- **FR-007**: The subtitle MUST be free text rather than a formatted date, because `SHIPPING &
  RETURNS` uses it for a sentence rather than a date.
- **FR-008**: Each page MUST show an effective date the owner sets explicitly. Saving an unrelated
  correction MUST NOT change it.
- **FR-009**: The optional signature couplet at the foot of a policy MUST be part of the owner's
  content, not a hardcoded flourish.

### Writing them in the admin

- **FR-010**: All four policies MUST be editable in the admin — title, subtitle, effective date,
  body, and search metadata — with no developer involvement and no deployment.
- **FR-011**: Policies MUST support drafts, so an unpublished revision is invisible to visitors, and
  versions, so a published mistake can be reverted from the admin.
- **FR-012**: Every field MUST carry a label and, where its purpose is not self-evident, a
  description written for the owner rather than for an engineer.
- **FR-013**: The four policies MUST be modelled once and reused, not defined four times. A fifth
  policy MUST NOT require a new schema.
- **FR-014**: Only an administrator may edit a policy. Anyone may read a published one.
- **FR-015**: Policies MUST be an extensible list. The owner MUST be able to create a new policy —
  an accessibility statement, a repairs policy — give it its own address, and publish it without a
  developer. The four drawn pages are the four the list ships with, not the four it can hold.
- **FR-015a**: A policy MUST carry its own address under `/legal/`, chosen by the owner and unique
  across the list. An address already held by another policy MUST be rejected when it is saved, with
  a message naming the policy that holds it.
- **FR-015b**: The footer's legal row MUST follow what is published rather than a hardcoded list:
  publishing a new policy adds it, unpublishing one removes it, and renaming one renames the link.
  The owner MUST be able to control the order in which they appear and whether a given policy is
  listed there at all — Shipping & Returns is drawn under Customer Care, not in the legal row.
- **FR-015c**: Unpublishing or deleting a policy MUST NOT leave a link to it anywhere in the site
  chrome.
- **FR-016**: The default content shipped with this feature MUST describe *this* site truthfully: the
  three cookies named in the Design Inventory, and an explicit statement that no analytics,
  advertising, or third-party tracking cookies are in use. The drawn placeholder copy claiming
  Google services and advertising MUST NOT be shipped as the default.

### The cookie banner

- **FR-017**: A visitor with no recorded decision MUST be shown the banner on any page of the site,
  anchored to the bottom of the viewport and leaving the page behind it readable.
- **FR-018**: The banner MUST offer exactly the three drawn actions — accept all, open the chooser,
  and accept strictly necessary only — laid out in a row on desktop and tablet and stacked
  full-width on mobile.
- **FR-019**: Refusing MUST be exactly as easy as accepting: one action, equal prominence, equal
  size, no extra step, no hidden control.
- **FR-020**: The banner MUST NOT be dismissable without a choice. There is no close control.
- **FR-021**: The banner MUST NOT shift page content that has already been drawn.
- **FR-022**: The banner MUST link to the Cookie Policy, and MUST remain usable if that policy is
  missing.
- **FR-023**: The banner MUST be announced to assistive technology on appearance without moving focus
  away from what the visitor was reading, MUST be reachable early in the keyboard order, and MUST
  keep every control operable by keyboard with visible focus.
- **FR-024**: The banner MUST NOT trap focus, since the page behind it stays usable; but it MUST NOT
  coexist with a modal dialog in a way that leaves either one unescapable.
- **FR-025**: The banner's **body paragraph MUST be editable in the admin**, with no deploy. Its
  heading and its three button labels are fixed in code.

  > This reverses an earlier decision and is the better arrangement. The spec first made the whole
  > banner editable; the owner then fixed all of it in code; the owner has now separated the two.
  > What is left hardcoded — *Cookie Policy*, *Agree*, *Configure All Cookies*, *Allow Technical
  > Cookies* — names what a control does rather than saying anything, which sits inside Constitution
  > I's own carve-out for "non-content UI affordances" rather than needing an exception to it. The
  > sentence that actually makes a claim about data processing is the owner's.

- **FR-025a**: The **default** body shipped with the feature MUST be category-agnostic: it MUST NOT
  enumerate cookie categories, name providers, or state what the site does or does not track. The
  categories and the Cookie Policy are both editable, so a default asserting anything about the
  cookie set can be silently contradicted by an edit nobody reviews. It says what the banner is for
  and points at the policy; the policy carries the facts. An owner who edits the body takes that
  judgement on themselves, which is as it should be.
- **FR-025b**: An empty body MUST fall back to that built-in default rather than rendering a gap.
- **FR-025c**: The fixed heading and button labels MUST remain free of any claim about the cookie
  set, for the same reason as FR-025a and permanently — they cannot be corrected without a release.
- **FR-025d**: Line breaks the owner types in the body MUST be preserved when the banner is drawn.
- **FR-026**: The owner MUST be able to switch the banner off entirely. With it off, no optional
  category may be treated as consented.
- **FR-027**: The banner MUST show all three drawn actions at all times, including on the day it
  ships when no optional category is configured and *Agree* and *Allow Technical Cookies* therefore
  have the same effect. This is a deliberate decision to match the design; see Assumptions for what
  it costs and what it must not be allowed to cost.
- **FR-027a**: Because the two acceptances are indistinguishable in effect today, they MUST remain
  distinguishable in the record. A visitor who chose *Agree* MUST be recorded as having agreed to
  the categories that existed at that moment and to nothing else, so that adding a category later
  asks them again rather than inheriting their click (FR-040).

### The chooser

- **FR-028**: Opening the chooser MUST list every configured category with its name and a
  plain-language explanation of what it is for.
- **FR-029**: The strictly necessary category MUST always be listed, MUST be shown as permanently
  enabled, and MUST explain why it cannot be switched off.
- **FR-030**: Every optional category MUST default to off and MUST require a deliberate action to
  enable.
- **FR-031**: The chooser MUST have one explicit save action, and MUST make clear what will happen
  when it is used.
- **FR-032**: The chooser MUST be reachable from a persistent entry point in the site footer after a
  decision has been made, so consent can be reviewed and withdrawn as easily as it was given.
- **FR-033**: The chooser MUST be operable by keyboard and screen reader, and MUST manage focus
  correctly on open and on close.

### Consent: recording and honouring it

- **FR-034**: A visitor's decision MUST be recorded per category, together with the date it was made
  and the version of the notice it was made against.
- **FR-035**: The record MUST persist across page loads, tabs, and sessions for a bounded period, and
  MUST be re-requested when that period lapses.
- **FR-036**: The storage carrying the record is itself strictly necessary and MUST NOT be gated on
  consent — there is nowhere else to keep the answer to the question.
- **FR-037**: The site MUST NOT set, read, or transmit anything outside the strictly necessary set
  before a decision is recorded.
- **FR-038**: The decision MUST be honoured on every page and every route, including pages served
  from cache.
- **FR-039**: An absent, unreadable, or tampered record MUST be treated as no decision: ask again,
  allow nothing optional.
- **FR-040**: A record that predates a category MUST NOT be read as consent to it. Adding a category
  MUST cause the banner to ask again.
- **FR-041**: A record referring to a category that no longer exists MUST be ignored without error.
- **FR-042**: The owner MUST be able to invalidate every stored decision by advancing a version, so a
  material policy change can be re-consented to.
- **FR-043**: Withdrawal MUST take effect immediately and MUST be reflected in the record before the
  visitor navigates again. Today no optional cookie exists to remove; the requirement is that the
  recorded decision is never stale, not that a cleanup routine is written for cookies that do not
  exist.
- **FR-044**: The three cookies the site sets today — the customer session, the cart credential, and
  the cart count — MUST remain strictly necessary and ungated, as spec 005 already determined and
  recorded.

### Categories

The site runs no analytics, no tag manager, and no third-party script, and none is being added here.
**No script-loading, script-gating, or provider-integration machinery is built by this feature.**
Categories exist as *content* — the words the chooser lists and the Cookie Policy describes — and
consent is recorded against them. Nothing is loaded or blocked, because there is nothing to load.

- **FR-045**: Cookie categories MUST be defined in the admin, each with a name, a plain-language
  purpose, and whether it is strictly necessary or optional. They are content, and adding or editing
  one MUST require no deployment.
- **FR-046**: The banner, the chooser, and the consent record MUST all be driven by the configured
  categories. The site MUST NOT claim consent for, or offer, a category that is not configured.
- **FR-047**: The site MUST ship with exactly one category configured — strictly necessary, covering
  the three cookies named in the Design Inventory — because that is the truth about this site.
- **FR-048**: This feature MUST NOT introduce any mechanism for storing, injecting, or conditionally
  executing third-party scripts, and MUST NOT add a provider integration of any kind. An admin field
  that accepts a script snippet or a measurement ID is explicitly out of scope.
- **FR-049**: The consent record MUST nevertheless be structured per category rather than as a single
  yes-or-no, so that the day an optional category is introduced, the existing records correctly read
  as "not asked" rather than as consent.
- **FR-050**: The Cookie Policy page and the configured categories MUST be maintainable from the same
  place in the admin, so the page cannot describe a set of cookies the chooser does not offer.
- **FR-051**: The site MUST NOT set, load, or contact anything outside the strictly necessary set,
  under any consent state. Today this is trivially true and it MUST be verified rather than assumed
  — it is the assertion that stops a future dependency quietly introducing a tracker.

### Found and shared

- **FR-052**: Each policy page MUST emit a title and description the owner controls, falling back to
  the page's own title when unset.
- **FR-053**: Each policy page MUST declare a canonical address matching the one the footer links to.
- **FR-054**: Each policy page MUST emit social preview metadata.
- **FR-055**: All four policy pages MUST appear in the site's machine-readable list of addresses.
- **FR-056**: Publishing a policy MUST make the change visible to the next visitor without a
  deployment and without a stale cache serving the previous text.

### How it is built

- **FR-057**: The pages MUST be composed from existing components — the page header band, the
  container, and the rich-text renderer. No page-level component may be created that duplicates one
  of these.
- **FR-058**: The banner and the chooser MUST be assembled from the existing UI kit's primitives.
  Anything genuinely new MUST be added to the kit with its states documented, not dropped into a
  feature folder.
- **FR-059**: All spacing, colour, type, and radii MUST come from design tokens.
- **FR-060**: Every interactive element MUST implement default, hover, focus-visible, active,
  disabled, and loading states.
- **FR-061**: The banner MUST NOT push any route past the site's JavaScript budget, and MUST NOT
  delay the largest content paint past the site's budget.
- **FR-062**: All five surfaces MUST meet WCAG 2.2 Level AA.
- **FR-063**: The footer's four policy destinations MUST resolve to the pages this spec creates, and
  its legal row MUST be built from published content per FR-015b rather than from the hardcoded list
  it holds today.

### Key Entities

- **Policy page**: One legal or informational document the owner writes. Carries a title, a subtitle
  line, an effective date, a rich body, search metadata, its own address, whether and where it is
  listed in the footer, and a publication state with version history. The four drawn pages are four
  entries in this list, and the list is open.
- **Cookie banner settings**: The switches behind the banner — whether it is shown at all, and the
  consent version that invalidates old decisions. No copy: the banner's wording is fixed in code
  (FR-025). Small on purpose, and the smallness is the record of that decision.
- **Cookie category**: A named group of cookies with a plain-language purpose and a flag for strictly
  necessary versus optional. Content, not machinery — it drives what the chooser lists and what the
  consent record is keyed on, and it loads nothing. One exists on day one.
- **Consent decision**: What one visitor chose — a per-category answer, the date, and the notice
  version it was made against. Held on the visitor's device; the site keeps no personal record of it.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every link in the site footer resolves. The count of 404s reachable from site chrome is
  zero.
- **SC-002**: A first-time visitor on a 390px-wide phone can read the banner's purpose and complete
  any of its three choices without scrolling the banner and in a single tap.
- **SC-003**: A recorded decision survives a page reload, a new tab, and a return visit within its
  retention period, on 100% of attempts.
- **SC-004**: On a fresh browser profile with no decision recorded, the only cookies present after
  browsing the catalogue, opening a product, and adding to the cart are the three strictly necessary
  ones plus the consent record — verified by inspection, not by assertion.
- **SC-005**: The owner can change any word on any of the four policy pages and see it live to
  visitors in under 5 minutes, with zero deployments.
- **SC-006**: The owner can cause every visitor who has already decided to be asked again, in under
  5 minutes and with zero deployments.
- **SC-007**: The owner can add or reword a cookie category in under 10 minutes with zero
  deployments; the chooser shows the change immediately, an optional one arrives switched off, and
  every visitor who had already decided is asked again rather than assumed to have agreed.
- **SC-008**: A visitor who withdraws consent has the narrower decision recorded before they
  navigate again, on 100% of attempts.
- **SC-008a**: Across the whole site and under every consent state, the number of third-party
  requests made and third-party cookies set is zero — measured, not asserted.
- **SC-009**: All five surfaces — four pages and the banner with its chooser — pass an automated
  accessibility scan with zero violations and are fully operable by keyboard alone.
- **SC-010**: Each of the four pages emits a canonical address, an owner-controlled title and
  description, and appears in the site's list of addresses.
- **SC-011**: Adding the banner leaves every route inside the site's JavaScript budget and leaves the
  largest content paint inside its budget on mobile.
- **SC-012**: The published Cookie Policy and the categories the chooser offers describe the same set
  of cookies, with no category described on the page that the chooser does not offer and none offered
  that the page does not describe.

---

## Assumptions

- **`Agree` and `Allow Technical Cookies` do the same thing on the day this ships, and that is an
  accepted cost.** With one strictly necessary category configured and nothing optional, the two
  acceptances are indistinguishable in effect. The design draws three buttons and the three buttons
  ship. Two things make this defensible rather than sloppy: neither button grants anything, so
  nobody is misled into a worse outcome than they chose; and FR-027a requires the record to remember
  *which categories existed when they clicked*, so the day an optional category appears, an old
  *Agree* is not read as consent to it. The alternative — a one-button notice that grows into three
  — was considered and rejected in favour of matching the design.
- **The banner's paragraph is the owner's; its heading and button labels are not.** Settled after
  two reversals, and the line is drawn where the meaning is: the paragraph is the only part that
  says anything about data processing, so it is the only part that must be correctable without a
  release. *Cookie Policy*, *Agree*, *Configure All Cookies* and *Allow Technical Cookies* name
  controls, which Constitution I already exempts as "non-content UI affordances" — so what remains
  hardcoded no longer needs an exception to the principle, only a note that it was considered.
- **A banner is shown even though this site does not legally require one.** A site setting only
  strictly necessary cookies needs no consent banner under GDPR or ePrivacy. It ships anyway because
  it is designed, because it is the honest place to publish what the site does store, and because
  the machinery to ask is easier to have before it is needed than to retrofit under a deadline.
- **The banner is shown to every visitor regardless of where they are.** The shop trades in the UAE
  and Kazakhstan and ships internationally. Detecting a jurisdiction to decide whether to ask is more
  machinery, more failure modes, and a worse answer than asking everyone.
- **The consent record lives on the visitor's device and nowhere else.** A server-side consent log
  for anonymous visitors would mean creating a record about somebody who has not agreed to a record
  being created. The stored decision, carrying its date and notice version, is the evidence. If a
  regulator's demand for a server-side audit trail arrives later, it is additive.
- **Six months is the retention period for a decision** before the visitor is asked again, matching
  common practice. It is a configured value, not a constant in code.
- **The cookie chooser is a dialog, built from the existing modal on desktop and the existing drawer
  on mobile.** The design does not draw it; these are the kit's existing patterns for exactly this.
- **The footer gains one cookie-settings entry point** in the legal row, alongside the three policy
  links. FR-032 requires re-entry and the footer is where the other three live.
- **Shipping & Returns is a policy page like the other three** even though the footer files it under
  Customer Care rather than in the legal row. Its shape in Figma is identical; modelling it
  separately would be a second copy of the same thing.
- **The signature couplet is content.** Three of the four pages end with it and one does not, which
  makes it text rather than a template element.
- **Nothing here is translated.** The header draws a language switcher and the site has no content
  localisation; that stays true of these pages, and remains a site-wide decision rather than one this
  spec should take.
- **The existing rich-text renderer covers everything the drawn copy needs.** Verified against all
  four frames: headings, paragraphs, lists, bold, italic, links — no tables, no images, no embeds.
- **Structured data is not emitted for these pages.** There is no schema.org type that fits a policy
  document usefully, unlike the FAQ page's `FAQPage`.
- **The pages are indexed rather than hidden from search.** Shipping and returns terms are a genuine
  search destination for a buyer comparing shops.
- **Drafts and versions come from the existing platform behaviour** already used by the story, blog,
  contact, and FAQ pages.

---

## Dependencies

- The existing site header, contact strip, and footer.
- The existing page header band and rich-text renderer.
- The existing UI kit: button, modal, drawer, switch or checkbox, container, link.
- The existing search-metadata field group and the site's list of addresses.
- The cookie decisions recorded in spec 005 for the two cart cookies, which this spec preserves
  rather than revisits.

---

## Out of Scope

- **Analytics, tag management, advertising, and the machinery that would gate them.** Not the
  provider, and not the gate either. The site runs no third-party script and none is planned, so a
  consent-gated script loader would be code with no consumer.

  Recorded here so the later cost is known rather than discovered: when analytics *is* wanted, the
  work is (1) add an optional category in the admin — no code; (2) advance the consent version so
  everyone is asked again — no code; (3) a developer adds the provider once, loaded only when that
  category is consented to, and removes its cookies on withdrawal — a small, contained change. Steps
  1 and 2 are already built by this feature. Step 3 is the part deliberately not built, and it is
  the part that should be written against a real provider rather than an imagined one.
- **Admin fields that accept a script snippet or a measurement ID.** Explicitly refused, not merely
  deferred: admin-authored code executing in every visitor's browser is a stored-XSS vector by
  design, on a site with customer accounts and addresses.
- Content localisation of the policies or the banner.
- A server-side consent audit log.
- Legal review or authorship of the policy text. This ships a truthful default describing the site as
  it is; the words a lawyer approves are content, entered the same way any other edit is.
- Scanning the site to discover cookies automatically.
- Do Not Track or Global Privacy Control signal handling.
- Age gating, regional variants of the notice, or jurisdiction detection.
- **Making the footer's Customer Care and About groups editable.** Only the legal row follows
  published policies (FR-015b). Shipping & Returns keeps its place under Customer Care, as drawn — its
  page becomes a published policy like the others and its address gains the `/legal/` prefix, but its
  position in the footer does not move.
- Any change to how the cart or session cookies behave.
