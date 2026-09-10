# Contract: The shared question tier and `QuestionList`

**Tier**: `src/lib/questions/` (promoted out of `src/lib/story/`) ·
**Component**: `src/components/ui/question-list/`

Three pages now draw the same questions — `/about`, `/contact`, `/faq`. This contract is what stops
that being three implementations of one behaviour.

---

## §1 Why this is a promotion, not a new thing

`src/lib/story/queries.ts:19` predicted this page and guessed the wrong home for it: "When `/faq` is
built it adds its own function to this file, reading the same collection." That was right when
questions had one consumer. With three, a `/faq` page reading its content out of a module named
`story` is the coupling spec 007 had to undo on `PageHeaderBlock` — recorded in that component's own
doc comment.

Constitution II: a component belongs in the shared kit the moment it has a second consumer. This is
the third. The same rule applies to the data tier (R4, R9).

## §2 The tier

```ts
// src/lib/questions/types.ts
interface Question { id: string; question: string; answerHtml: string }

// src/lib/questions/queries.ts
getSelectedQuestions(ids: (number | string)[]): Promise<Question[]>  // /about, /contact
getAllPublishedQuestions(): Promise<Question[]>                      // /faq
getFaqPage(): Promise<FaqPage | null>                                // /faq's own copy
```

**Two loaders, and the difference between them is the whole point.**

| | `getSelectedQuestions` | `getAllPublishedQuestions` |
| --- | --- | --- |
| Membership | the editor's relationship picks | every published question |
| Order | the relationship's row order | the collection's `order`, ascending |
| Consumers | the `faq` block, `/contact` | `/faq` |

`order`'s admin description already reads "Lowest first, in this list and on the FAQ page. A page
that picks its own questions uses its own order instead." The two loaders are that sentence made
executable (FR-031, FR-037).

`getFaqPage()` lives here rather than in a two-field tier of its own because the FAQ page **is** the
questions; a separate module for a heading and an empty message would be ceremony.

### Rules every loader keeps

- **No status filter anywhere.** `adminOrPublishedStatus` on the collection makes a draft
  unreachable rather than filtered (FR-033). A second place to enforce publication is a second place
  to get it wrong.
- **`answerHtml` is converted once, in the mapper.** The lexical→HTML conversion moves out of
  `src/lib/story/mappers.ts` with the rest; it is not re-implemented.
- **`cache()`-wrapped**, per-request deduplication only. Both routes are `force-dynamic` (R8).
- **Database-unreachable tolerant**: `[]` / `null` rather than a failed container build.

## §3 The component

```tsx
interface QuestionListProps {
  questions: Question[]
  /** The heading level of the rows. Decided by the page, never here. */
  headingLevel: 2 | 3
  /** Ids open on first render. The design draws one open. */
  defaultOpen?: string[]
}
```

Everything it fixes is a rule that currently lives inside `FaqBandBlock` with reasoning attached,
and none of it should be re-derived by a second caller:

| Behaviour | Requirement | Why it is not a caller's choice |
| --- | --- | --- |
| `single` off — opening one never closes another | FR-035 | A visitor comparing delivery against returns should not have to hold one in their head |
| `icon={null}` | — | The questions are the only thing in their column and each is a sentence; a dash before every row is decoration to skip past, not a cue |
| `headingLevel` passed down | FR-004 | "Am I the page's title?" is a question about the page, answered once per page |
| `aria-expanded` / `aria-controls` | FR-035 | `Accordion` already provides them; nothing about the state is invented here |
| Answers through `RichText` | — | Owner-written rich text, rendered by the kit component spec 006 promoted rather than copied |

It enters the UI kit, so `pnpm check:stories` requires `question-list.stories.tsx`.

## §4 `FaqBandBlock` — variant and decoupling

```tsx
interface FaqBandBlockProps {
  heading: string
  body?: string
  cta?: { label: string; href: string }
  questions: Question[]
  headingLevel: 1 | 2 | 3
  variant?: 'split' | 'centred'   // default 'split'
}
```

Two changes, both required by the spec:

1. **`variant`** (FR-034). `split` is `/about` — copy and a `CONTACT US` button in a left column
   beside the questions (`310:6776`). `centred` is `/contact` — a centred heading over an 850-wide
   column, no body, no button (`312:8689`). One band, two arrangements, exactly as the `banner`
   block already establishes for the same reason (spec 006, FR-048). **Not** a second component.
2. **Props decoupled from `StoryBlock`.** They are currently
   `Extract<StoryBlock, { type: 'faq' }>`, so rendering the band from `/contact` would drag
   `src/lib/story` into a route with nothing to do with the story page. `PageHeaderBlock` hit this
   exact problem in spec 007 and its doc comment records the fix; this applies it to the second
   block that needs it. `src/lib/story`'s renderer keeps passing the same fields.

## §5 Who composes what

| Route | Composition |
| --- | --- |
| `/about` | `FaqBandBlock variant="split"` ← `getSelectedQuestions` (block's relationship) |
| `/contact` | `FaqBandBlock variant="centred"` ← `getSelectedQuestions` (global's relationship) |
| `/faq` | `PageHeaderBlock` (h1) + `QuestionList headingLevel={2}` ← `getAllPublishedQuestions` |

`/faq` composes the two directly rather than passing a heading-only band, because its title sits in
its own band with its own spacing (`266:4471` above `266:4474`), and because the page's `h1` is a
page header rather than a band heading.

## §6 Structured data

`/faq` emits `schema.org/FAQPage` built from these view models (FR-052) — never from documents, so
it cannot disagree with what is drawn and cannot leak a draft.

`/contact` does **not**. Its questions are an editor-chosen subset in the page's fourth band, and
claiming the page is an FAQ would overstate what it is (R12).

## §7 Test obligations

- Unit (`tests/unit/questions-mappers.test.ts`): a question document maps to `{ id, question,
  answerHtml }`; the two loaders' ordering differs as §2 states; an empty set is `[]`.
- Story (`question-list.stories.tsx`): collapsed, one open, several open, a long answer, and a
  single-question list.
- The `/about` e2e suite must still pass unchanged — the promotion is a refactor, and its regression
  test is that spec 006's tests do not move.
