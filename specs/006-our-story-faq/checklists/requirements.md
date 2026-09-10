# Specification Quality Checklist: Our Story — An Editable About Page and a Shared FAQ

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-09-09
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

**Iteration 1 (2026-09-09)** — three open clarifications: the video supply route, the scope of the
standalone `/faq` page, and the shape of the content model.

**Iteration 2 (2026-09-09)** — all three answered; every item passed.

**Iteration 3 (2026-09-09)** — two of those answers revised by the requester. Every item still
passes; nothing became ambiguous.

### Where the spec stands

- **Video — media library only (FR-021 – FR-021b).** Revised down from "uploads *or* pasted links"
  to uploads alone. A video is chosen exactly as a photograph is chosen, and there is no field
  anywhere that accepts an address. This removed the host allowlist and the embed-address handling,
  and simplified three other requirements that existed only to contain a third-party player:
  reduced motion now means "do not download the file" rather than "do not load the player"
  (FR-024), and the below-the-fold rule is about bytes rather than script (FR-024a). The required
  poster still image (FR-022) survived the change on its own merits — it holds the slot's space
  against layout shift, it is the reduced-motion fallback, and it covers a video deleted from the
  library.
- **Standalone `/faq` page — out of scope.** Unchanged from iteration 2. The shared question model
  still has to earn its separateness now (FR-028, FR-031, FR-038) or the later page duplicates it.
  The footer's `/faq` link stays dead, as it is today.
- **Content model — reorderable blocks (FR-046 – FR-055).** Reversed from iteration 2's fixed
  bands. The page's body is an ordered list of blocks the editor composes: add, remove, reorder.
  The drawn order is the shipped default (FR-052), not the structure.

### What the block reversal changed beyond the model section

Reordering is not a free variation on fixed bands — three requirements exist only because the
arrangement is no longer known in advance:

- **FR-051 (heading ownership).** With a fixed order, "exactly one top-level heading" was satisfied
  by construction. With composition, an editor can put a banner first, omit the page header, or add
  two of them. The first block able to claim the top-level heading owns it and the rest step down,
  so no arrangement can produce two or none. FR-006 and SC-012 now test *every* arrangement rather
  than the drawn one.
- **FR-053 (empty composition)** and the new edge cases — a page with no blocks, twenty blocks, two
  page headers, or content whose block type no longer exists in code. None of these were reachable
  when the seven bands were fields.
- **FR-049 / FR-050 (repeat use, shared definitions).** A block usable twice on this page is what
  makes the two banners one definition rather than two, and what lets the later FAQ page and blog
  compose the same blocks instead of redefining them.

### Constitution

**Iteration 2 carried a declared Constitution I deviation; iteration 3 removes it.** The page is now
assembled from Payload blocks as Principle I requires, so `/speckit-plan` has no Complexity Tracking
exception to record for it, and SC-013 verifies that no band ships as a bespoke page component.

Scope did grow: block infrastructure does not exist in this repository today, so this feature builds
it. That is a real cost and the plan should size it honestly — but it is groundwork the `/faq` page
and the blog were going to need regardless, and the alternative was a time-boxed exception that
would have had to be paid off anyway.

No items remain incomplete. Ready for `/speckit-plan`.
