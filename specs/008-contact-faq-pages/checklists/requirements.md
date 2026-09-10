# Specification Quality Checklist: Contact Us and FAQ — The Last Two Dead Links

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-09-10
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

**Iteration 1 (2026-09-10)** — 15/16. One [NEEDS CLARIFICATION] at FR-029: whether an enquiry is
stored as well as emailed.

**Iteration 2 (2026-09-10)** — 16/16, all items pass. The requester chose **store and email**, and
the marker was replaced by FR-029 and FR-029a–FR-029f. That answer changed more than one
requirement, so the ripple is recorded here rather than left to be rediscovered:

- **The receipt moved.** FR-021 and FR-022 previously acknowledged a submission only if the mail was
  accepted. With a durable record, the record is the receipt and the email is a notification, so a
  mail outage no longer retracts a confirmation the shop can honour (US2 scenarios 3–6, FR-024a).
  This is a strictly better failure model and it is only available because of the stored record.
- **A new collection enters the feature**, with the access, immutability, retention and erasure
  obligations Constitution VI attaches to any point that collects personal data (FR-029a–FR-029f,
  SC-012, SC-013). User Story 6 was added to carry that work as its own testable slice.
- **The throttle now also refuses to write** (FR-027), which was not a concern when nothing was
  stored.
- **Out of Scope grew rather than shrank.** Storing enquiries invites a helpdesk; the boundary is
  drawn explicitly at list, read and delete — no replies, status, assignment, threading, export,
  notification retry, or alerting.

**Standing notes**

- Existing-file references (`src/collections/questions.ts`, `src/globals/contact-settings.ts`, the
  header and footer line numbers) are **provenance for claims about what already exists**, not
  implementation direction. The same convention is used by specs 005–007 in this repository.
- "Static texts" in the brief was resolved to an assumption rather than a clarification, because
  Constitution I and the `blog-page` precedent settle it: fixed in structure, editable in content.
- Two figures are proposals for the owner to confirm rather than findings, and both are flagged as
  such in Assumptions: the **twelve-month retention period**, and the **rate limit's** allowance.
