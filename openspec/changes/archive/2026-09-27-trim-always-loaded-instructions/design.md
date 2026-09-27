# Design

## Context

See proposal.md — Why. Measured at `1f41711`:

| Surface | Words | When it loads |
|---|---|---|
| `AGENTS.md` (block + meta half) | 905 | every session |
| `wiki/wiki-style.md` + `wiki/voice.md` | 2,050 | every session, `@`-imported by `.agents/rules/wiki.md` (imports expand at launch) |
| 14 skill `description:` lines | 660 | every session |
| memory digest (hook output) | ~800 | every session — out of scope |
| `wiki/development/the-change-loop.md` | 3,447 | on demand; 25 links from skills and `AGENTS.md` |
| authored skill Markdown (all but `agent-browser`) | 27,385 | per verb (`SKILL.md` 10,938; references 16,447) |
| skill scripts | ~45,000 | run, not read — out of scope |

25.17.0 already rewrote every `SKILL.md` and reference in [our voice](../../../wiki/voice.md) (−24% / −14%) with no rule changed. `scripts/measure-context.mjs` still compares against `dec731d`, so its `--check` shows old savings, and it covers only seven verbs plus a fixed owner list; it has no start-up route and does not count descriptions.

## Goals / Non-Goals

**Goals:** start-up load ≤ 2,200 words; `the-change-loop.md` ≤ 2,000; authored skill Markdown ≤ 21,000; every rule accounted for in `rule-map.md`; a CI ceiling that keeps the start-up load down.

**Non-Goals:** removing or changing a rule, flag, command, path, or linked heading; editing scripts or their output; the digest; `agent-browser`.

## Decisions

**Re-baseline first, from the tool.** `measure-context.mjs` gains `--write-baseline`, which records current counts and `HEAD` into `scripts/fixtures/context-baseline.json`. Run once before any text edit, so `--check` reports this change alone. Alternative — hand-editing the JSON — drifts and repeats the PR #97 mistake.

**A `startup` route and a ceiling.** The start-up route is `AGENTS.md`, `wiki/wiki-style.md`, `wiki/voice.md`, and a synthetic `skill-descriptions` entry: the `description:` values of every `.agents/skills/*/SKILL.md` joined. The baseline gains `startupCeiling` (2,200); `--check` adds an issue naming both numbers when the route's `after.words` exceeds it. The inventory widens from seven verbs to every skill folder except `agent-browser`, plus the owner list. Alternative — a separate script — splits one measurement across two tools.

**Trim by ownership, then by wording.** For each file, in this order:

1. A rule stated in more than one place stays with its owner ([one topic, one page](../../../wiki/wiki-style.md#one-topic-one-page)); the others become one link. The biggest repeats: the plan-link rule, the ask format, the gate, "WongStack skills own all git", and publish/preview wording across `the-change-loop.md`, `AGENTS.md`, and each verb.
2. Keep one reason and one example per rule; cut the rest.
3. Rare branches (a failure exit, an unattended run, a one-host quirk) move to a reference the skill reads only when that case happens, as `/save`'s conditional procedures already do.
4. Apply [voice](../../../wiki/voice.md)'s delete-on-sight list and the 20% read-back test.

`wiki-style.md` and `voice.md` stay loaded (Decision log); they trim hardest because they load everywhere. `the-change-loop.md` keeps its role as the doctrine owner; skills link its sections instead of restating them.

**Anchors are frozen.** Before editing, collect every `#anchor` any live file links; after, each must still resolve. `check-payload-links.mjs` already slugs headings for source-only skills (check 3); extend that anchor test to links in shipped payload files, so a trim that renames a linked heading fails CI here instead of in an installed repo.

**`rule-map.md` is written per file, as it is trimmed.** One row per rule: old file and a short quote → new file and heading, or "kept in place". A rule with no row is a defect. It lives in the change folder and archives with it.

## Risks / Trade-offs

- [An agent follows a merged rule less reliably behind a link than inline] → keep in place any rule a verb must act on mid-step without a read (git ownership, the gate, the plan-link line), shortened; link only background.
- [Installed repos with local edits get conflicts in every skill file] → the changelog's Updating note says keep your adaptation and take the new wording around it, as 25.17.0 did; the sibling workspace "Update check for months-behind installs" tests exactly this merge.
- [Word targets tempt dropping a rule] → `rule-map.md` review plus the spec requirement; a missed target is reported, not forced.
- [The digest keeps the start-up total above what people expect] → out of scope, stated in the proposal; the `memory` capability bounds it.

## Migration Plan

Ships as a minor release. Rollback is a revert; no data or config changes.
