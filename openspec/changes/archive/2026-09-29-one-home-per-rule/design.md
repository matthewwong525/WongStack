# Design

## Context

See proposal.md - Why. Findings came from the 2026-09-29 audit; each was rechecked against `main` at v27.0.0. All still hold except `server/README.md`, which no longer names Node 24. Line numbers moved; edits target the quoted text.

## Goals / Non-Goals

- Each duplicated rule keeps one owner; every other copy becomes a short link to it, never a paraphrase.
- No page is moved, merged, or renamed, and no linked heading is renamed: installed repos link these headings, and `check-payload-links.mjs` only checks anchors on source-only skills.
- No script behavior changes. `build-review.mjs` keeps printing `NEXT_STEP`; the rule decides when to copy it.

## Decisions

### The owners

| Rule | Owner | Surfaces that link instead |
|---|---|---|
| What ships | `wong-sync/references/payload-manifest.md` | `wiki/development/README.md`, `AGENTS.md` (meta half), `wiki/contributing.md` |
| Which verbs own git | `the-change-loop.md`, the "OpenSpec owns the plan" paragraph | `.agents/rules/payload.md` (git-fronting bullet), `required-tools.md` (`git` row), `AGENTS.md` block (drop "only `/save` and `/ship` push") |
| The finished-plan question | `asking-the-user.md#end-every-reply-with-the-next-step` | `the-change-loop.md#just-ask`, `wiki/stack/mini-apps.md`, `AGENTS.md` block |
| The after-ship menu | `new-workspace.md#next-work` | `ship/SKILL.md` Step 6; `asking-the-user.md` keeps its one-line pointer |
| Workspace-split options | `new-workspace.md#ask-once` | `the-change-loop.md#several-parts-several-workspaces` |
| Status values | `the-change-loop.md` living-handoff section | `save/SKILL.md` input line |
| What a failed walk does in `/ship` | `delivery-gate` spec, `ship/SKILL.md` Step 4 | `staging-walkthrough` spec, `staging-walkthrough.md` verdict line |
| Plain words | `asking-the-user` spec | `knowledge-center` spec (requirement removed) |
| Link checks | `payload-checks` spec | `payload-layout`, `open-source-release` (requirements removed) |

A link names the rule in a few words and points at the owner's heading, for example "`/save`, `/continue`, `/ship`, and `/close` own git ([the change loop](…#…))" becomes "[the change loop](…) says which verbs run git".

### The `/apply` line after a plan

`asking-the-user.md#print-the-plans-link` changes from "copy both when the plan waits" to "copy the next-step line only on the *Review the plan* reply, which ends with no question". The `AGENTS.md` block's print-the-link rule and the `build-review.mjs` comment follow. Chosen over dropping the line, because the *Review the plan* reply would otherwise leave no way on. `plan/SKILL.md` already defers to the rule and needs no edit.

### What ships, and `.env.example`

The three pages each get one sentence: "The [payload manifest](…) lists what ships." `AGENTS.md`'s meta line drops "the wiki" and "OpenSpec records" (the manifest says OpenSpec records never copy, and only some wiki pages ship). The manifest's "The agent folder" section gains one line: setup also copies the source's values-blank `.env.example`; it is not in `payload-files.json`, so a sync never updates it.

### The stack pack is not optional

Drop each conditional, keep the fact: `core-stack.md` loses "take it whole, take a piece, or skip it"; `agent-knowledge-center.md` "if you took that stack"; `required-tools.md` "any repo taking (or on)", "pack-gated", "a pack repo"; `staging-walkthrough.md` the two "*(stack-pack repos)*" tags; `stack/README.md` the "installs with the stack pack" callout; `d1-pipeline.md` "in every repo that takes the pack"; `ux-principles.md` "A repo with no UI … can ignore it", since every install gets the starter app.

### Small fixes

- `the-change-loop.md` "`/plan` always invokes `/explore`" gains ", except for review-page notes" with a link to `plan/SKILL.md#review-notes`.
- `ship/SKILL.md` "`/save`'s authoring test" links `save/SKILL.md#1-protect-credentials-and-select-the-route` (the route table); `facts-save.md` "save's capture rules" links `../SKILL.md#2-maintain-the-handoff-and-capture-context`.
- `openspec/config.yaml`: context says the payload is skills under `.agents/skills/`, the wiki, `AGENTS.md`, `VERSION`, `CHANGELOG.md`, without "is markdown"; rules at lines 26, 32, 42, 61 read `.agents/`; line 58's surface list says `AGENTS.md`. `check-openspec-config.mjs` proves it still parses.
- `server/setup.sh`: `Node.js 22` and `setup_22.x`, matching `.nvmrc`.
- `README.md` command table gains `/verify`; `agent-knowledge-center.md`'s skill list gains `/improve` and `/routine`.
- `AGENTS.md` title becomes `# AGENTS.md`, as the installer writes.
- `openspec-cli.md` "CLI 1.13.2 has no `sync` command" becomes "The CLI has no `sync` command", so no unpinned version number is left.
- `required-tools.md`: a `curl` row; "exactly four commands" and "the core four-tool guarantee" become five.
- `adding-a-skill.md` step 1: a one-line `description` that says what the skill does and when to use it, like the others, in place of "trigger-rich".
- `stack/README.md` Getting started entry: "what installing costs, what you do by hand, and what to do when something goes wrong", not "five steps".

### Specs

Deltas carry the requirement changes. Two Purpose lines change directly in `openspec/specs/`, because a delta cannot: `staging-walkthrough` ("gates nothing" → "gates nothing on its own run") and `context-economy` (`CLAUDE.md` → `AGENTS.md`). The two removed link requirements move their scenarios into `payload-checks`; the removed `knowledge-center` requirement's rules move into `asking-the-user`.

## Risks / Trade-offs

- [The "Reshape the wiki" part edits the same `wiki/development/` and `d1-pipeline.md` pages] → whichever publishes second merges by the union of intent and re-runs the link check.
- [A link replacing a restated rule loses context for a reader who skims] → each link keeps a few words naming the rule.
- [Skill word count] → the edits mostly cut text; `measure-context.mjs --check` in CI catches growth.

## Migration Plan

Patch release. Installed repos get the prose through `/wong-sync`; `server/setup.sh` affects only servers built after it ships.
