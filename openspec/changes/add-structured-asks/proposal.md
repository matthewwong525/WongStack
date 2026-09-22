# Ask in choices, and always offer the next step

**Status:** ready-to-ship
**Branch:** plan/choice-input-prompts-recommended
**Open questions:** none

## Why

`/explore` asks well — structured questions, two or three options, the recommended one first — and every other skill asks in plain prose. `/ship` "stops and asks" whether to fix or merge, `/wong-cloudflare` reads out an account list, `/verify` shows ambiguous evidence, `/apply` asks which candidate it meant: all free text, no recommendation, no visible options. The good format sits inside one skill's clarification section, written around the explore-to-plan transition, so a runbook cannot cite it without inheriting a budget it does not want. Replies have the same gap at the other end — a finished plan or a green checkpoint stops without saying what would move the work forward, so the reader has to invent the next verb.

## What Changes

- **One shared convention owns how WongStack asks.** A new `.claude/skills/explore/references/asking-the-user.md` holds the anatomy of an ask: two or three real options, the recommended one first and labelled `(Recommended)`, a short tradeoff on each, and the host's own free-text path left open. Every skill links to it instead of restating it. `/explore` keeps its clarification budget — the 80/20 test, the small groups, the one exit round, the four-question ceiling stay there, because they govern clarification before planning, not a runbook's fork. (review.html#/anatomy/budget)
- **The host tool order moves into that reference.** Codex `request_user_input` when callable, else Claude `AskUserQuestion`, else another host's equivalent structured tool, else the same group as numbered chat; only a session where nobody can answer takes recommended defaults and labels them `assumed`. `/explore` stops owning this text and links down to it. (review.html#/mechanism)
- **Confirmations and offers are asks too, but the form never decides whether to ask.** A yes/no confirmation becomes a two-option question with the recommended option first — the Cloudflare pack offer, the teardown delete confirmation, `/ship`'s fix-or-merge fork on a failed walk, `/verify`'s ambiguous-evidence stop, `/continue`'s dirty-tree and ambiguous-handle stops, `/apply`'s unresolved candidate, `/ship`'s two-active-changes stop, and `/wong-cloudflare`'s account pick. A standing authorization stays standing: `/save`'s runbook actions, `/ship`'s archive-and-merge chain, and the Cloudflare token widen are still taken without a prompt. (review.html#/sites/authorized)
- **Every reply that hands control back ends with the next step.** Before finishing, each skill answers *what does the user need to decide for this to continue?* and puts that to them as the same kind of question — recommended first. A finished plan offers apply, revise, or stop; a blocked task offers the unblock paths; an audit offers the fix worth taking. (review.html#/next-step)
- **Each asking skill cites the convention at its ask site.** `/explore`, `/continue`, `/improve`, `/apply`, `/save`, `/ship`, `/verify`, `/wong-setup`, `/wong-sync`, and `/wong-cloudflare` replace their local instructions with a link and the specifics of that one question.
- **The release ritual runs:** a `VERSION` bump, a newest-first `CHANGELOG.md` entry, a line in [`.claude/rules/payload.md`](../../../.claude/rules/payload.md) naming the convention, and the payload link check.

**Non-goals:** no new checker script — "is this ask a real multiple choice?" reads intent from prose, which is judgment, not a deterministic test. No change to what any skill is authorized to do without asking. No change to `/explore`'s question budget.

## Capabilities

### New Capabilities
- `structured-asks`: how every WongStack skill puts a question to the user — the choice format, the recommended option, the host tool order and its fallbacks, the treatment of confirmations and offers, and the next-step question that ends a reply.

### Modified Capabilities
- `explore-clarification`: the choice format and the host question mechanism move out to `structured-asks`; `/explore` follows the shared convention and keeps only its clarification budget.
- `repository-improvement`: `/improve`'s selection round and its report follow the shared convention, including the closing next-step question.

## Impact

- **Skills:** a new `explore/references/asking-the-user.md`, plus edits at the ask sites of `explore`, `continue`, `improve`, `apply`, `save`, `ship`, `verify`, `wong-setup`, `wong-sync`, and `wong-cloudflare`.
- **Payload:** the reference ships inside the `explore` skill directory, which `payload-files.json` already copies whole — no manifest entry needed. `VERSION`, `CHANGELOG.md`, and `.claude/rules/payload.md` change with it.
- **Specs:** one new capability, two modified.
- **Runtime:** none. No new tool, script, or dependency.

## Decision log

- **2026-09-22** — Asked where the convention lives → chose a new shared reference under the `explore` skill, matching the existing shared-reference pattern of [`openspec-cli.md`](../../../.claude/skills/plan/references/openspec-cli.md). Kept it out of the wiki because skills load conventions from their own references at the point of need.
- **2026-09-22** — Asked which asks it covers → chose every user-facing ask, confirmations and offers included, so no skill has to judge which kind of ask it is making.
- **2026-09-22** — Asked when a reply offers the next step → chose every stop that hands control back, so the reader never invents the next verb.
- **2026-09-22** — Asked whether a checker enforces it → chose the written rule alone. A test for "is this ask a real multiple choice?" reads intent from prose, which is judgment, not a deterministic check. The [payload rule](../../../.claude/rules/payload.md) carries the reminder instead.
- **2026-09-22** — Assumed the convention governs form only, never which actions need a prompt, because the alternative would convert standing authorizations into questions and slow every runbook.
- **2026-09-22** — Assumed `/explore` keeps its clarification budget — the 80/20 test, small groups, one exit round, four questions — because those bound pre-plan clarification, not a runbook's fork.
- **2026-09-22** — Assumed no `payload-files.json` entry is needed: `explore` is a `skillDirs` entry, copied whole with its `references/`.
- **2026-09-22** — The bounded explore exit round is complete. Remaining details use the supported assumptions recorded here and in the design.
- **2026-09-22** — Implementation checkpoint: version 16.5.0. The convention landed at `.claude/skills/explore/references/asking-the-user.md` (58 lines); `/explore` kept its budget and lost the duplicated format and tool order; `/continue` and `/improve` stopped restating them. Ask sites in `/continue`, `/apply`, `/plan`, `/save`, `/ship`, `/verify`, `/improve`, `/wong-setup`, `/wong-sync`, and `/wong-cloudflare` now cite the convention and name their options. The payload link check passes in all four install shapes and the OpenSpec config check passes. CI is the remaining task.
- **2026-09-22** — CI green on PR #96 (`SAVE_GATE_RESULT=SUCCESS`); every task is complete and the change is ready to ship.
