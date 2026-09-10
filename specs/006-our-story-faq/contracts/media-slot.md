# Contract: The media slot — photograph or video, both tiers

**Feature**: `006-our-story-faq`

One field config, one view-model shape, one renderer, four block types. This is FR-018's "one shared
definition" written down so the seventh use cannot quietly become a variant of the first.

---

## §1 Editing tier — `src/fields/media-slot.ts`

See [data-model.md](../data-model.md) §1.1 for the fields. Three rules matter beyond the shape:

1. **`kind` decides, never presence.** A slot that holds both a photograph and a video — because the
   editor switched back and forth — renders the one `kind` names (FR-020).
2. **`poster` is `required` when `kind === 'video'`.** Field-level, so an invalid slot cannot be
   published (FR-022, FR-027). The admin's own field error is the "report naming the slot" the
   requirement asks for; no bespoke mechanism is needed.
3. **Video comes from the media library and nowhere else.** The field is an `upload` relationship to
   `media`. There is no text field anywhere in this config, which is the structural form of FR-021 —
   an address cannot be pasted into a slot because there is nothing to paste it into.

**Alt text is not here.** It is `media.alt`, already `required: true` on the upload collection, so one
asset carries one description wherever it is used (FR-025).

---

## §2 View-model tier — `StoryMedia`

```
kind: 'photo' | 'video'
src, width, height     photograph, or the video's POSTER
alt?
videoSrc?              only when kind === 'video'
background: boolean
```

**`src`/`width`/`height` are always the still image.** For a video that is the poster. This is the
single most load-bearing decision in the contract: it means every consumer reserves the right box
before anything loads, whatever the slot holds, so CLS is structurally impossible rather than
carefully avoided (FR-024b, SC-006).

**A slot with no still is dropped by the mapper**, not returned half-built. A photograph slot with no
photograph and a video slot with no poster are both nothing to render, and FR-024b requires the
frame to collapse rather than reserve blank space.

---

## §3 Rendering tier — `src/components/ui/media/`

```
media.tsx        server component. Reserves the box, picks the branch.
video-media.tsx  'use client'. The only client code this feature adds.
```

### Photograph branch

`next/image` with explicit `width`/`height` and responsive `sizes`, per Constitution V and the house
pattern. No `<img>`.

### Video branch

Rendered as `<video>` with `poster`, `muted`, `loop`, `playsInline` and **no `controls`** when
`background` is set. `controls` is permitted only on a slot that is the subject of a band rather than
its backdrop (FR-023) — no block in the drawn composition sets that today.

The client leaf exists for two rules that cannot be expressed declaratively:

| Rule | Why it needs script |
|------|---------------------|
| No autoplay under reduced motion (FR-024) | CSS cannot suppress autoplay. Needs `matchMedia('(prefers-reduced-motion: reduce)')` |
| No download before the slot is in view (FR-024a) | `autoPlay` overrides `preload="none"` — the browser fetches immediately |

**Therefore: the `src` is withheld until the slot intersects the viewport *and* motion is allowed.**
Until then the poster is what is on screen — which is also what a reduced-motion visitor keeps
permanently, and what everyone sees if the video fails.

A photograph slot mounts none of this. The client cost is paid per video slot, not per page.

---

## §4 Video documents have no `sizes`

Payload gates image processing on mimetype — `generateFileData.js` resizes only when
`fileSupportsResize || isImage(mimetype)` — so a video upload stores no `sizes` object. Any code
reaching for `sizes.md.url` must branch on mimetype first.

**That branch lives in `src/lib/story/mappers.ts`, once.** A component that branches on mimetype has
been handed a document, which the lint rule forbids for exactly this class of reason.

---

## §5 Where the slot is used

| Block | Slots | Background? |
|-------|-------|-------------|
| `media-plate` | 1 | no — it is the content |
| `closer-look` | 1 | no — it sits beside the copy |
| `banner` | 1 | **yes** — text is laid over it |
| `process-steps` | 1 per step | no |

Seven in the drawn composition. A composition with more blocks has more; the definition does not
change.
