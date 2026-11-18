<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project guidance (for Codex, and for Claude Code via CLAUDE.md)

This is a **domain-neutral store template** (Next.js App Router + Payload CMS 3 + PostgreSQL,
pnpm). The rules live in `.specify/memory/constitution.md` — read it before planning any change.
The short version:

- **Payload owns content.** Copy an editor would change is a localized Payload field, never a string
  in a component. Interface chrome lives in `src/i18n/messages/{en,ru,uk}.json` — add every key to
  all three files.
- **Keep the core neutral.** No shop-specific vocabulary, fields or logic (sizes, stones, ISBNs…) in
  the core; model differences as data — categories, attributes and their values (colour,
  collection, shape…), variant types and options. Seeds, stories and fixtures use placeholders ("Product 1", "Option A").
- **Reuse before creating.** Search `src/components/ui` and the other component folders first;
  extend with props or variants rather than copying. Every UI-kit component ships with a story.
- **Tokens, not magic values.** Colours, spacing, type come from `src/styles/tokens.css`, generated
  from `design/tokens/` by `pnpm build:tokens`. Never edit `tokens.css` by hand.
- **Money** is integer minor units with a currency. **Paths** are kebab-case.
- **Schema changes** ship with `pnpm generate:types` and a migration (`pnpm payload migrate:create`).
- **The shop's name** comes from `SITE_NAME` (`src/lib/site.ts`), never a literal.

Before finishing: `pnpm typecheck && pnpm lint && pnpm test`, plus `pnpm test:integration` when the
data layer changed (needs the local Postgres: `docker compose --profile local up -d`).

## Spec Kit

New features go through Spec Kit. Commands are skills: `$speckit-specify`, `$speckit-clarify`,
`$speckit-plan`, `$speckit-tasks`, `$speckit-analyze`, `$speckit-implement` in Codex
(`.agents/skills/`), and the same names with `/` in Claude Code (`.claude/skills/`). See
`docs/spec-kit.md`.

## Docs

`docs/overview.md` (architecture and domain model), `docs/customizing.md` (turning the template into
a specific shop), `docs/deployment.md`, `docs/spec-kit.md`.
