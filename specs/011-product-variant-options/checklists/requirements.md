# Specification Quality Checklist: Product Variant Options

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-09-23
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

### Resolved by asking

**FR-009 — what "applied to a specific variant" covers.** Answered 2026-09-23: the property
name/value rows only. The free-form "Product details" text and the short description stay on the
piece, now stated as **FR-009a** and listed in **Out of Scope** so the two declined readings are
visible rather than merely absent. No other requirement moved.

All 16 items pass. The spec is ready for planning.

### Resolved without asking

Four questions that looked open were closed by reading the existing shop rather than by guessing:

- **Does removing sizes destroy customer history?** No. Sizes live on the vocabulary, on pieces, and
  on live cart lines. Enquiries hold a name, an address and a message; the shop keeps no order
  records. Recorded as an assumption and as FR-029.
- **How is one stone withdrawn from a made-to-order piece, once quantity is gone?** Stones already
  have a take-off-sale state. FR-006 leans on it rather than inventing a field.
- **Do existing colour links survive an editable vocabulary?** They must, and can: colour already
  filters on a stable machine value distinct from the label. FR-018 to FR-020 pin it.
- **What happens to quantities already typed against stones?** Kept and ignored, not erased, so
  switching a piece between modes is reversible. FR-004.

### Deliberately not marked

- **US1 is a live defect, not only a convenience.** A made-to-order piece whose stones were never
  given a number is currently unorderable in full. That is why it is P1 rather than grouped with the
  other three.
- **Colour is assumed to stay on the piece** rather than becoming a way to choose between stones.
  "Also editable" is read as making the list the owner's, matching how properties already work. The
  alternative is named in Out of Scope so the reading is visible rather than implied.
