# Spec-driven development with Spec Kit

New features are built with [GitHub Spec Kit](https://github.com/github/spec-kit): a short chain of
agent commands that turns a plain-language request into a reviewed spec, a technical plan, a task
list and finally code — each step checked against the project's
[constitution](../.specify/memory/constitution.md).

The repository is set up for **two agents at once**, sharing the same templates, scripts and
constitution:

| Agent | Commands live in | How you call them |
| --- | --- | --- |
| [Claude Code](https://docs.claude.com/en/docs/claude-code) | `.claude/skills/speckit-*/` | `/speckit-specify …` |
| [Codex CLI](https://github.com/openai/codex) | `.agents/skills/speckit-*/` | `$speckit-specify …` (or pick it from `/skills`) |

Both read the same project guidance: `AGENTS.md` (Codex reads it directly; `CLAUDE.md` imports it).

## The workflow

| Step | Command | Produces |
| --- | --- | --- |
| 0. Principles | `speckit-constitution` | `.specify/memory/constitution.md` — already written; amend it rather than rewrite |
| 1. What and why | `speckit-specify <feature description>` | `specs/NNN-feature/spec.md` (numbered sequentially) |
| 2. Remove ambiguity | `speckit-clarify` | Up to five targeted questions, answers written back into the spec |
| 3. How | `speckit-plan <tech notes>` | `plan.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md` |
| 4. Quality check | `speckit-checklist <topic>` | A requirements checklist ("unit tests for English") for the spec |
| 5. Work breakdown | `speckit-tasks` | `tasks.md`: ordered, dependency-aware, parallel tasks marked `[P]` |
| 6. Consistency | `speckit-analyze` | Read-only report on gaps between spec, plan, tasks and constitution |
| 7. Build | `speckit-implement` | Executes `tasks.md`, ticking tasks off |
| 8. Catch up | `speckit-converge` | Compares the code with the spec/plan and appends what is still missing to `tasks.md` |
| — | `speckit-taskstoissues` | Turns `tasks.md` into GitHub issues |

Prefix each command with `/` in Claude Code and `$` in Codex.

### Example: adding product reviews

```text
/speckit-specify Customers who bought a product can leave a 1–5 star rating and a short review.
Reviews are moderated in the admin before they appear. The product page shows the average rating
and the latest reviews; the listing card shows the average.

/speckit-clarify
/speckit-plan Reviews are a Payload collection related to products and customers; moderation uses
drafts. Rating aggregates are computed server-side. Reuse the existing Accordion and Pagination.
/speckit-tasks
/speckit-analyze
/speckit-implement
```

The same session in Codex uses `$speckit-specify …`, `$speckit-clarify`, and so on.

## What the constitution will ask of a plan

The plan template has a *Constitution Check* gate. For this template that means, among others:

- **Reuse before creation** — name the existing components, blocks and field configs the feature
  uses; justify every new one (II).
- **Payload owns content** — copy an editor would change is a localized Payload field, not a string
  in a component (I).
- **Domain-neutral core** — no shop-specific vocabulary or fields in the core; model differences as
  data (VII).
- **Three languages** — every new message key in `en`, `ru` and `uk`; seeds for all three (VIII).
- **Tokens, budgets, accessibility, money in minor units** (III, V, VI).

## Files

```
.specify/
  memory/constitution.md        the rules every plan is checked against
  templates/                    spec, plan, tasks, checklist, constitution templates
  scripts/bash/                 branch/feature scaffolding used by the commands
  integration.json              installed integrations (claude, codex)
.claude/skills/speckit-*/       Claude Code commands
.agents/skills/speckit-*/       Codex commands
specs/NNN-feature/              created per feature by speckit-specify (none ship with the template)
```

## Maintenance

The `specify` CLI (`uv tool install specify-cli --from git+https://github.com/github/spec-kit.git`)
manages the integrations:

```bash
specify integration list               # what is installed
specify integration status             # current project state
specify integration install codex      # (already done) add Codex alongside Claude
specify integration use codex          # make Codex the default integration
specify integration upgrade --force    # refresh templates/scripts to the CLI's version
```

Upgrading rewrites files the integration manages; review the diff, and keep project-specific edits
in the constitution, not in the generated skill files.
