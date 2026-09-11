# Specification Quality Checklist: Policy Pages and Cookie Consent

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-09-11
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

**Iteration 1 (2026-09-11)** — one item failed: three `[NEEDS CLARIFICATION]` markers, all at the
high-impact end of the priority order.

**Iteration 2 (2026-09-11)** — all items pass. The three were answered and the spec was rewritten
around the answers rather than patched:

| Marker | Answer | What changed |
| --- | --- | --- |
| FR-015 — fixed set or extensible list? | **Extensible list** | FR-015, FR-015a–c added: policies carry their own addresses, the footer's legal row follows what is published, and unpublishing removes the link. FR-063 and the Key Entities entry follow. |
| FR-049 — how does analytics arrive later? | **Skip it entirely — no analytics planned, don't write unnecessary code** | The whole provider/script-gating section was cut. FR-045–FR-051 rewritten: categories are *content*, nothing loads or gates. FR-048 now explicitly refuses a script-or-ID admin field. US5 rewritten from "analytics arrives without a deploy" to "the chooser and the Cookie Policy tell the same story", carrying a note saying what was cut and why. SC-007/SC-008 rewritten; SC-008a added to measure third-party requests at zero. Out of Scope now records exactly what adding analytics later will cost. |
| FR-027 — day-one banner shape? | **Always the three drawn buttons** | FR-027 resolved to match the design. FR-027a added to stop the known consequence becoming a real one: with nothing optional configured, *Agree* and *Allow Technical Cookies* have identical effect, so the record must remember which categories existed at the moment of the click — otherwise a future optional category would inherit an old *Agree*. Recorded in Assumptions as an accepted cost with the reasoning. |

**Iteration 3 (2026-09-11)** — all items still pass after a scope reduction from the owner: the
banner's wording will never change, so it is no longer editable in the admin.

- FR-025 rewritten — heading, body, and three button labels are fixed in code.
- FR-025a added — the fixed copy MUST be category-agnostic. This is the load-bearing consequence:
  categories and the Cookie Policy stay editable, so a fixed sentence that enumerates them or states
  what the site tracks can be silently contradicted by a later content edit.
- FR-025b added — the fixed copy needs the same sign-off as the policy text, since it is the one
  legally-loaded sentence on the site the owner cannot correct themselves.
- US4 rewritten from "the owner runs the banner from the admin" to "the owner controls *when* it
  asks" — the consent version and the on/off switch, which survive. SC-006 follows.
- Key entity "Cookie banner settings" reduced to two switches and no copy.
- Recorded in Assumptions as a Constitution I exception that **must** appear in the plan's
  Complexity Tracking. The plan is the next place this has to be carried, not the last.

**Design-vs-reality conflicts recorded rather than silently resolved**:

- The drawn banner copy describes Google services and advertising materials; the site has neither.
  Captured as FR-016 — the seeded default must describe this site truthfully.
- The panel behind `CONFIGURE ALL COOKIES` is not drawn anywhere. Captured in the Design Inventory
  as invented by this spec, and specified in FR-028 – FR-033.
- The design offers no way back to the banner after a choice. Captured as FR-032.

**Resolved by informed default rather than by question**, and recorded in Assumptions: the banner's
geographic scope, where the consent record lives, its retention period, the chooser's form, the
footer re-entry point, `/shipping`'s modelling, structured data, indexing, localisation, and the
fact that a site with only essential cookies needs no banner at all yet ships one anyway.

Ready for `/speckit-plan`.
