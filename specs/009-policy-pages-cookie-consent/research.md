# Phase 0 Research: Policy Pages and Cookie Consent

**Feature**: `specs/009-policy-pages-cookie-consent` | **Date**: 2026-09-11

Every decision below was checked against the codebase or against the Next.js 16.3.3 documentation
shipped in `node_modules/next/dist/docs/`, not against recollection. Where a decision contradicts an
obvious first instinct, the reason is written down.

---

## R1 — Where do policy pages live in the routing tree?

**Decision**: Under a prefix — `src/app/(frontend)/legal/[slug]/page.tsx`, serving `/legal/privacy`,
`/legal/terms`, `/legal/cookies`, `/legal/shipping`, and `/legal/<anything the owner creates>`.

**Rationale**: The owner chose the prefix. It is also the decision that removes the hardest
constraint this feature had, so it is worth recording what it displaced.

Next.js permits exactly one dynamic segment per path position, and the site already spends its
root-level one: `(shop)/[category]/page.tsx` says so in its own docstring —

> This route sits at the root of the site, so `/[category]` matches any single segment. That is
> deliberate: every unrecognised one-segment address should 404, and this is where that happens.

Route groups do not help; they contribute nothing to the URL, so `(policies)/[slug]` would resolve to
the same `/:segment` and conflict at build time. Serving policies at bare root addresses therefore
required *replacing* the catalogue's route with a shared resolver that tried category first and
policy second — re-routing the catalogue as a side effect of shipping legal pages, with the listing's
breadcrumbs, filters, sort, pagination and no-JavaScript form path all needing a non-regression pass.

A prefix costs four `href`s and removes all of it. **`(shop)/[category]/page.tsx` is untouched by
this feature. `listing.tsx` is untouched.** There is no catalogue regression risk to test for,
because there is no catalogue change.

| Option | Verdict |
| --- | --- |
| Four static root routes (`privacy/`, `terms/`, …) | Static siblings do win over `[category]`, so this works — until FR-015a asks for a fifth policy, which becomes a deployment. Rejected. |
| One root resolver: category → policy → 404 | Works, and was the previous plan. Rejected once a prefix was available: it puts the catalogue's routing on this feature's critical path for no benefit. |
| **`/legal/[slug]`** | Chosen. |

`legal` over `policy`: `/policy/privacy` reads redundantly, and *legal* is the conventional grouping.
*Shipping & Returns* sits under it comfortably — it is a contractual terms document whatever the
footer files it under. The param is `[slug]`, not `[category]`; inside `/legal/` the latter would
point at the catalogue's vocabulary and mislead the next reader.

**The footer's four `href`s change** from `/privacy`, `/terms`, `/cookies`, `/shipping` to their
prefixed forms. This is not a migration: those addresses have never resolved — they are 404s in
production today. There is no history to preserve, no external link to honour, no index entry to
move, and therefore **no redirects** (contract §1).

**A consequence the prefix hands back**: caching is now this route's own decision rather than one
inherited from a segment shared with the listing. R1a records how it is spent.

---

## R1a — Are policy pages cached?

**Decision**: No. `export const dynamic = 'force-dynamic'`, and no revalidation hook anywhere.

**Rationale**: Under the rejected root-resolver design this was forced — the listing branch reads
`searchParams` and route segment config applies to the whole segment. With a prefix it became a real
choice, so it needs a real reason, and the codebase already has one that every comparable page cites:

> the production image is built with no database, so a prerendered page would bake empty on a first
> deploy and stay that way until somebody happened to edit something.

`/`, `/about`, `/blog`, `/contact` and `/faq` all take this trade. Two things follow and both are
wanted: **FR-056 is free**, because there is no cache for a publish to leave stale; and no hook means
no temptation to reach for the shared `invalidate()`, which walks every product slug and would evict
the entire catalogue because somebody fixed a typo in a policy — the trap `questions.ts` and
`articles.ts` both document.

**Alternatives considered**: `generateStaticParams` plus a policy-scoped revalidation hook, which
buys a cheaper render on four low-traffic pages and pays for it with a build-time database
dependency and a second hook to get wrong.

---

## R2 — How is a policy address kept unique?

**Decision**: `unique` on the shared `slugField`, plus a `beforeValidate` check that rejects a slug
already held by another policy with a message naming it.

**Rationale**: The prefix makes this nearly trivial. `/legal/` is a namespace this collection owns
outright, so a policy slugged `rings` is simply `/legal/rings` and shadows nothing — the
category-collision and reserved-route checks the root-resolver design needed are **gone**, along
with the maintenance burden of a hardcoded list of reserved top-level routes that would have silently
rotted every time a new page shipped.

What remains is within-collection uniqueness. The `unique` constraint alone would enforce it, but its
error names a database index rather than a page, so the hook exists to say "`privacy` is already used
by Privacy Policy" instead. Constitution IV asks for validation that stops invalid content being
saved; the spec's Edge Cases ask for a message that says which other page holds the address.

**Alternatives considered**: relying on the unique constraint alone (an error an editor cannot act
on); allowing duplicates and resolving by date (two addresses for one page, and a silent winner).

---

## R3 — Where is the visitor's consent decision stored?

**Decision**: A client-readable, **non-`httpOnly`** cookie named `aurum-consent`, written and read
**entirely on the client** via `document.cookie`. `sameSite=Lax`, `path=/`, `secure` in production,
`max-age` of 180 days.

**Rationale**: Two constraints decide this, and the second one is the load-bearing one.

1. **Nothing may read it on the server.** `cookies()` is a request-time API — the Next 16
   documentation for it states plainly that "using it in a layout or page will opt a route into
   dynamic rendering". The banner lives in the root layout, so reading the decision server-side
   would opt **every route on the site** into dynamic rendering. This codebase has already refused
   exactly this once: `src/components/layout/cart-count/cart-count.tsx` exists as a client provider
   specifically so the layout does not read the cart cookie, and the comment there says "a number in
   a badge is not worth the prerendered catalogue." A consent banner is not worth it either.
2. **Given a client-only read, cookie beats `localStorage`.** They are equally reachable from a
   client component, so the tiebreakers are expiry and future-proofing. A cookie's lifetime is
   enforced by the browser, which is FR-035 for free; `localStorage` has no expiry and would need a
   hand-rolled timestamp comparison that silently does nothing if it is ever forgotten. And the day
   a consent-gated script does need to be decided server-side, a cookie is already in the request.

**Writing from the client, not from a Server Action**, is what keeps `cookies()` out of the codebase
entirely for this feature. The Next docs note that `.set` is only legal in a Server Function or
Route Handler anyway — so the server path would have cost an extra round trip to store a value the
client already knows.

**Alternatives considered**: `localStorage` (no enforced expiry); a Server Action writing an
`httpOnly` cookie (a network round-trip per click, plus a request-time read to render it, plus the
dynamic-rendering cost above); and `sessionStorage`, which would re-ask on every visit.

**Consequence**: the banner cannot be in the server-rendered HTML, because the server does not know
whether to draw it. It mounts after hydration. FR-021 is satisfied by construction rather than by
care — the banner is `position: fixed`, so it overlays rather than displaces, and contributes no
layout shift.

---

## R4 — What exactly goes in the consent cookie?

**Decision**: A compact, versioned, URL-encoded JSON object. Shape and parsing rules are specified
in `contracts/consent-record.md`; the rules that matter here are that it records **which categories
existed at the moment of the decision**, and that anything unparseable is treated as no decision.

**Rationale**: FR-027a is the reason this is not a boolean. With one category configured, *Agree*
and *Allow Technical Cookies* have identical effect — the owner's accepted trade — and the only
thing standing between that and a real failure is the record remembering what was on offer. A stored
`{"all": true}` would, the day an analytics category is added, read as consent to a category nobody
was ever shown. Storing the decision per category, plus the set that existed, makes FR-040 a lookup
rather than a promise.

**Alternatives considered**: a single accept/reject boolean (fails FR-027a and FR-040); a hash of
the category set (cheap to compare, useless to debug, and cannot answer "which ones did they
accept?"); a server-side consent log keyed by a visitor id, which the spec put out of scope because
it means creating a record about someone who has not agreed to a record being created.

---

## R5 — Where does the banner get its categories, and does that cost anything?

**Decision**: A new Payload global, `cookie-settings`, read in the root layout through a
`react.cache`-wrapped Local API call and passed to the client banner as props.

**Rationale**: **A Local API global read is not a request-time API**, which is the precise property
that makes this free. `src/lib/messengers/settings.ts` already records it:

> unlike `cookies()`, calling this from the root layout does not opt every route into dynamic
> rendering. That is what makes the chrome migration free rather than a trade against the
> prerendered catalogue.

So the layout gains a third read alongside `getSocialLinks()` and `getContactDetails()`, cached per
request, and the prerendered catalogue is untouched. The same call must tolerate an unreachable
database via `isDatabaseUnreachable` — the production image is built with no database, and spec 005
learned this the hard way when a layout read broke the container build on `/forgot-password`.

**Alternatives considered**: fetching categories from the client on mount, which would add a request
per page view to render a banner that could have been server-rendered into props; and hardcoding the
categories, which FR-045 forbids and which would put the chooser's content back in a deployment.

---

## R6 — One global or two? And how is FR-050 actually honoured?

**Decision**: One global, `cookie-settings`, holding `enabled`, `consentVersion`, a `policy`
relationship to the Cookie Policy document, and a `categories` array. It sits in an admin group
named **Cookies**, and its `policy` relationship is what the banner links to.

**Rationale**: FR-050 requires the Cookie Policy page and the configured categories to be
maintainable "from the same place… so the page cannot describe a set of cookies the chooser does not
offer". The two cannot literally be one document — the policy is a versioned, draftable page in a
collection and the categories are site configuration that must not be gated on a draft — so "the
same place" is honoured by an admin group holding both, by the global's relationship field pointing
at the policy, and by field descriptions on each side naming the other. The relationship is needed
for FR-022 regardless, so it costs nothing extra.

**Alternatives considered**: categories as fields on the Cookie Policy document, which would mean an
unpublished policy draft could not be edited without also holding back a category change, and would
make the banner depend on a document's draft state; and a separate `cookie-categories` collection,
which is a collection whose expected row count is one.

---

## R7 — How does the footer stop hardcoding its policy links?

**Decision**: Each policy carries a `footerPlacement` field — `legal`, `customer-care`, or `hidden`
— and a `footerOrder`. The root layout queries published policies once and hands `<Footer>` the
legal row plus the Customer Care entries it should inject. `DEFAULT_LEGAL` is deleted;
`DEFAULT_GROUPS` keeps Customer Care and About as headings but no longer hardcodes *Shipping &
Returns*.

**Rationale**: FR-015b requires the legal row to follow published content and FR-015c requires that
unpublishing leaves no link anywhere. A `legal | hidden` pair would have satisfied FR-015b and
quietly broken FR-015c, because *Shipping & Returns* is drawn under CUSTOMER CARE rather than in the
legal row — so unpublishing it would have left a hardcoded link to a 404. Three placements fix that
without making the footer's navigation editable, which the spec put out of scope.

**Scope note**: this is marginally more than "only the legal row" as the spec's Out of Scope section
words it. The groups themselves remain fixed — their headings, their order, and their non-policy
links are still code. All that moves is *which named slot a policy link appears in*. Flagged here
rather than done quietly.

**Alternatives considered**: leaving the Customer Care link hardcoded (breaks FR-015c); making the
whole footer navigation a global (a much larger feature the spec explicitly excluded).

---

## R8 — Which rich-text features does a policy body need?

**Decision**: The default lexical feature set, **with headings kept**, rendered through the existing
`RichText` kit component and the existing `convertLexicalToHTML` helper pattern.

**Rationale**: The four drawn pages use headed sections, paragraphs, bullet and numbered lists, bold
run-in terms, italics, and inline links — nothing else. No tables, no images, no embeds. That is the
default feature set exactly.

Note the deliberate difference from `src/collections/articles.ts`, which *strips* headings from a
chapter body (`defaultFeatures.filter((feature) => feature.key !== 'heading')`) so that the contents
rail cannot miss a section. Policies have no contents rail and their entire structure is headed
sections, so the same filter here would remove the one feature the content most needs. Copying that
line without reading why it exists would have been the easy mistake.

**Alternatives considered**: blocks for each section, which would build a block registry for content
that has no blocks in it — the same conclusion spec 007 reached for article chapters.

---

## R9 — How is the chooser built, and what does it cost in JavaScript?

**Decision**: `Modal` at `md` and up, `Drawer` on phones — both already in the kit, both already
`role="dialog" aria-modal="true"` with focus traps — and the chooser is **lazily imported**, so its
code is fetched only when *Configure All Cookies* is pressed.

**Rationale**: Constitution V caps application code at 100KB gzipped above the framework baseline,
and this feature puts a client component into the root layout, i.e. onto every route on the site.
The banner itself is small — some text, three buttons, a cookie read. The chooser is the expensive
half, and the overwhelming majority of visitors will press one of the other two buttons and never
open it. Loading it eagerly would charge every route for a screen most people never see.

`Switch` is the control for an optional category; the strictly necessary row renders as a disabled,
explained state rather than as a switch that refuses to move.

**Alternatives considered**: building a bespoke panel (Constitution II — the kit already has both
dialogs); rendering the chooser inline in the banner, which at mobile widths would make the banner
most of the screen.

---

## R10 — What must the sitemap and metadata do?

**Decision**: `src/app/sitemap.ts` gains published policy addresses, queried through a slugs-only
read alongside the existing `getArticleSlugs()`, inside the same `try` that already tolerates an
unreachable database. Each policy page emits an owner-controlled title and description falling back
to its own title, a canonical, and Open Graph tags, following `/faq`'s `generateMetadata` exactly.

**Rationale**: FR-052 – FR-055, and the existing file already carries the pattern and the warning
about why it is `force-dynamic`. Policies are content-derived rows, so they belong beside articles
and products rather than in `STATIC_ROUTES` — unlike `/contact` and `/faq`, a policy address is not
guaranteed to exist.

**No structured data.** There is no schema.org type that describes a policy document usefully, and
the spec says so. `/faq` emits `FAQPage` because it is nothing but an FAQ; there is no equivalent
honest claim here.

---

## R11 — Seeding the four pages

**Decision**: The four policies ship as seeded content created by an idempotent script, using
`skipRevalidation` as its request context, matching `scripts/seed-catalog.ts`.

**Rationale**: FR-001 requires the four footer addresses to resolve, and FR-016 requires the default
content to describe *this* site truthfully rather than reproducing the Figma placeholder copy about
Google services and advertising. Seeded content is content — the owner can rewrite every word of it
the moment it exists, which is the whole point of FR-010.

`skipRevalidation` is not optional here: `src/lib/revalidate.ts` records that seeding runs in its own
process under `payload run`, where `revalidatePath` throws `Invariant: static generation store
missing` rather than doing nothing.

---

## R12 — Testing approach

**Decision**:

| Layer | What it covers |
| --- | --- |
| `tests/unit` | Consent record serialise/parse, the "category added since the decision" comparison, tampered-input handling, the slug-collision validator. |
| `tests/integration` | `policies` access control (a draft is unreachable through the API, not merely hidden), slug uniqueness within the collection, the layout's footer query. |
| `tests/stories` + `tests/a11y` | Banner and chooser at all three breakpoints; the four policy pages. |
| `tests/e2e` | The three-button journey, persistence across reload and a new tab, re-entry from the footer, and a version bump re-asking. |

**Rationale**: mirrors the existing split, and puts the two things most likely to be got wrong — the
consent comparison (R4) and draft unreachability — under fast tests rather than under a browser.

---

## Resolved unknowns

No `NEEDS CLARIFICATION` items remain. The three the spec carried were answered by the owner before
planning began: policies are an extensible list, no analytics or script-gating machinery is built,
and the banner always shows the three drawn buttons. The fourth decision — that the banner's copy is
fixed in code — arrived after the spec was written and is carried into the plan's Complexity
Tracking as a Constitution I exception, per FR-025.
