**Status:** ready-to-ship
**Open questions:** none

## Why

The payload says the same things in many files, and each restatement is a place the next edit forgets. Three measured instances: `.claude/commands/opsx/*.md` (741 lines) duplicates `.claude/skills/openspec-*/SKILL.md` (745 lines) and has **already drifted into a live bug** — `/opsx:apply` tells the user to "suggest archive" where the skill invokes `/save`, and points at `/opsx:continue`, which does not exist; `/save` and `/ship` independently re-implement the same PR + CI-wait + auto-fix runbook; and the prose allowlist is stated 11 times across 7 files. The archived `widen-save-prose-fast-path` decision log records that its own five-site audit under-counted and missed a sixth site — the failure mode is proven, not hypothetical.

v8.4.0 (#43) added three more instances of the same pattern, so the cost is compounding: `/ship` grew a 140-line embedded runbook (breaking the payload's own `references/` convention), `/wong-sync` now stores every verdict in **two** files with a written rule that only half of one is authoritative, and the walkthrough's gate ladder is stated in seven places.

## What Changes

- **`.claude/commands/opsx/*.md` become one-line pointers** at the vendored `openspec-*` skills — the same "invoke the skill and follow it verbatim" pattern `/explore`, `/plan`, and `/apply` already use. Everything stays vendored in the repo; nothing becomes dependent on `openspec init` regenerating. Removes ~700 lines and makes the drift structurally impossible. **Fixes the live `/opsx:apply` bug** as a side effect.
- **`/ship` Step 4.5 moves to `ship/references/walkthrough.md`**, matching `wong-sync`→`adapt.md`, `improve`→its playbooks, and `wong-cloudflare`→`failure-map.md`. `/ship` returns to ~90 lines and reads as the merge verb again. No behavior changes.
- **The `/save` + `/ship` git runbook is extracted once** to `.claude/skills/save/references/git-gate.md` — PR open/update, the change-mirror body template, `wait-for-checks.sh` result handling, and the capped auto-fix loop. Both skills read it. The one genuine fork (`UNKNOWN` → proceed in `/save`, stop in `/ship`) is documented as an exception in one place instead of re-derived in two.
- **`/wong-sync` verdicts consolidate into `.claude/wong-sync-verdicts.md`.** The `capabilities` ledger leaves `.claude/.wong-stack.json`, which goes back to recording install state (`version`, `commit`, `installedAt`, `updatedAt`, `upstream`, `components`). One store, one authority rule; the split-authority and lazy-migration paragraphs both retire. **BREAKING** for the manifest schema — handled by lazy migration, which the manifest already does.
- **One owner per doctrine sentence.** `wiki/development/the-change-loop.md` becomes canonical for the loop, the gate ladder, and the prose allowlist. `AGENTS.md` keeps a one-line rule plus a link; `/save` states the path test once (Step 1) and its Step 2 table and Hard-rules entries link rather than restate.
- **Two stale-doc fixes:** `wiki/development/adding-a-skill.md` cites the retired `document` skill twice with two dead links; and the `.claude`→`.agents` / `CLAUDE.md`→`AGENTS.md` symlink — which has already silently no-op'd one implementation — is recorded only in `notes/` and gets promoted to `wiki/development/`.

**Non-goals:** deleting the vendored OpenSpec layer (explicitly kept so nothing relies on `openspec init`), changing any user-visible skill behavior beyond fixing the `/opsx:apply` drift, touching `app/`, and the CI `paths-ignore` / double-CI-wait work (a separate change — this one is prose-only).

## Capabilities

### New Capabilities

- `payload-single-source`: every fact in the payload has exactly one owning file; other surfaces link to it rather than restating it. Covers the pointer form for command files that front a skill, the `references/` extraction threshold for long runbooks, shared runbooks between skills, and doctrine ownership.

### Modified Capabilities

- `delivery-gate`: its "CI is optional, not required" requirement currently *mandates* that doctrine text be repeated across `CLAUDE.md`, `README.md`, `the-change-loop.md`, and the `save`/`ship`/`wong-setup` skills, and that each restatement name the allowlist. Rewritten to require one canonical owner plus conforming links — as written today it forbids this change.
- `wong-sync-adapt`: the verdict record becomes the single store of verdicts; the manifest ledger is no longer part of the adapt step's output or its suppression rule.
- `wong-sync`: the manifest schema drops `capabilities`; lazy migration covers manifests that still carry it.
- `apply-completion-handoff`: the requirement binds **every surface that fronts apply**, including the vendored command file — the gap the current drift slipped through.

## Impact

- **Payload (a release):** `.claude/commands/opsx/{explore,propose,apply,sync,archive}.md`; `.claude/skills/ship/SKILL.md` + new `ship/references/walkthrough.md`; new `.claude/skills/save/references/git-gate.md` + edits to `save/SKILL.md` and `ship/SKILL.md`; `.claude/skills/wong-sync/SKILL.md` + `references/adapt.md`; `.claude/skills/wong-sync/references/payload-manifest.md` (the two new `references/` files enter the manifest).
- **Doctrine:** `AGENTS.md`, `wiki/development/the-change-loop.md`, `wiki/development/adding-a-skill.md`, new `wiki/development/repo-layout.md` (the symlink fact).
- **Release:** `VERSION` minor bump, newest-first `CHANGELOG.md` entry.
- **Depends on #43 being merged** — it edits `/ship` Step 4.5 and the `/wong-sync` verdict record, both of which arrive with it. Branch from `main` after the merge.
- **Net:** roughly −950 lines of payload prose, one live bug fixed, no behavior change otherwise. No `app/` code, no build, no runtime surface.

## Decision log

- **2026-08-02 (implementation)** — All 37 tasks landed; `VERSION` 8.4.0 → 8.5.0. Payload prose (`.agents/**.md`) went **4,262 → 3,628 lines, −634 net**, after adding the two new references (202 lines). Three things the plan didn't anticipate. **(1)** The `/opsx:apply` drift had a second head: `openspec-apply-change/SKILL.md` itself pointed at `openspec-continue-change`, a *skill* that doesn't exist either — retargeted to `/continue`, and the `apply-completion-handoff` delta grew a scenario requiring that a surface only name commands that exist. **(2)** Collapsing `/ship` Steps 3 and 4 into one shared-runbook pointer broke the numbering that Step 4.5's recovery text references ("re-run Step 4 then Step 4.5"), so both headings were kept, each pointing at its own section of `git-gate.md` (§ 1 and § 2). **(3)** `adapt.md`'s pipeline diagram already showed only two outputs as of #43, so task 4.6 was a verification with no edit. Two smaller catches: extracting Step 4.5 left `SKILL.md` sub-lettered `4.5a–4.5f` with only the verdict table remaining, renamed to `### Verdicts`; and lifting the allowlist into a `### The prose allowlist` subsection of `the-change-loop.md` orphaned the "Loop back any time" paragraph under it, moved back up under the steps. Verified by sweep: the allowlist prefixes now appear in exactly four places (owner, `/save`'s routing test, and two summarizing lines), and the PR-body template, the cap-of-3, the gate ladder and the loop diagram each appear exactly once.
- **2026-08-02** — Resolved design.md's open question (task 5.7): **`README.md`'s "The workflow" section stays as it is.** It doesn't restate the doctrine — it's a plain-language verb table for a reader who hasn't cloned yet, and its one mention of the fast path ("lands straight in the repo as a note with no branch or PR") is a summarizing line, which `payload-single-source` explicitly allows. Reducing it to a link would cost the only surface a prospective user reads and buy no drift protection. Also decided, not in the plan: the **loop diagram** was duplicated in four thin verb skills (`explore`, `plan`, `apply`, `continue`) in two slightly different forms — task 5.8's sweep caught it, and each is now a one-line loop plus a link to the owner, since a six-line diagram isn't a "summarizing line."
