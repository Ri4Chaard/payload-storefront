# Contract: The block registry and the render contract

**Feature**: `006-our-story-faq`

Two halves that must agree: the Payload definitions an editor composes with, and the components that
render what they composed. The discriminated union in `src/lib/story/types.ts` is the joint.

---

## §1 The registry — `src/blocks/index.ts`

```ts
export const blocks: Block[] = [pageHeader, mediaPlate, closerLook, banner, processSteps, faq]
```

Registered once on the root config (`config.blocks`), referenced by slug from the story global:

```ts
{ type: 'blocks', name: 'body',
  blockReferences: ['page-header', 'media-plate', 'closer-look', 'banner', 'process-steps', 'faq'],
  blocks: [] }
```

**`blocks: []` is required, not an oversight.** Payload 3.88 types `blocks: Block[]` as mandatory on
the field even when `blockReferences` carries the definitions; passing the definitions in both places
would defeat the purpose of referencing them.

**Registering at config level is what makes FR-050 true.** A block defined inline on the story
global's field is scoped to that field; a block on `config.blocks` is available to the `/faq` page and
the blog by slug, with no redefinition and no second copy to drift.

---

## §2 Adding a block type

Six steps, in order. A block that stops after step 4 renders but cannot be composed; one that stops
after step 5 compiles but crashes the dispatcher.

1. Define it in `src/blocks/<name>.ts` — slug kebab-case, labelled for what an editor sees, every
   field with a label and, where its purpose is not self-evident, an admin description.
2. Add it to `src/blocks/index.ts`.
3. Add its slug to the story global's `blockReferences`.
4. Add its variant to the `StoryBlock` union in `src/lib/story/types.ts`.
5. Add its case to `src/lib/story/mappers.ts` — including what "empty" means for it, since an empty
   block is dropped (FR-004).
6. Add its case to `src/components/blocks/block-renderer.tsx` and its component directory.

Then `pnpm generate:types` and a migration, because a new block is new tables.

---

## §3 The render contract

```tsx
<BlockRenderer blocks={page.blocks} />
```

- **The dispatcher is an exhaustive `switch` over `block.type`** with a `never` check in the default
  branch, so adding a union member without a renderer is a compile error rather than a blank band.
- **A block renderer is a server component** unless it needs interactivity. Two leaves are client
  today: `Accordion` (already `'use client'`, used by the FAQ band) and `VideoMedia`. Nothing else
  may become client without justification against the JS budget.
- **A renderer never decides whether to render itself.** The mapper dropped the empty ones; a
  renderer that also checks is a second place for the rule to live.
- **A renderer never chooses its heading level.** It receives `headingLevel` and uses it. This is
  what makes FR-051 hold in arrangements nobody drew.
- **A renderer never reads Payload.** It receives view models. The lint rule enforces it.

---

## §4 Unknown block types

A composition may contain a block whose type the code no longer defines — content outlives a
deployment. The mapper **drops** unknown types rather than throwing, and the union's exhaustiveness
check protects the other direction (a defined type with no renderer). A page must not fail to render
because of content it no longer understands.

---

## §5 Heading levels, concretely

Assigned by the mapper (research R7), consumed by renderers:

| Situation | Level |
|-----------|-------|
| First `page-header` in the composition | `h1` |
| No `page-header` present → first block with a heading | `h1` |
| Every other block heading | `h2` |
| Headings nested inside a block — a step title, a question | `h3` |

`Accordion` already accepts `headingLevel?: 2 \| 3 \| 4`, so the FAQ band passes `3` and needs no
change to the component.

---

## §6 Repeat use

Every block type may appear more than once (FR-049), and two must be expected to:

- **`banner`** — the drawn page uses it twice, with different `textSide`, `eyebrow` and `cta`
  (research R10). A third is composition, not code.
- **`media-plate`** — trivially repeatable; that is the point of it.

`faq` and `page-header` are not *capped* at one — capping would need a `filterOptions` rule and would
surprise an editor — but the heading rule in §5 makes a second `page-header` harmless, and a second
`faq` block simply shows a second selection.
