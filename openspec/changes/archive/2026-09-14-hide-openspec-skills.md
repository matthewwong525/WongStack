<!-- openspec-archive v1 2026-09-14-hide-openspec-skills -->
<!-- file proposal.md utf8 8205 -->
# hide-openspec-skills

**Status:** ready-to-ship
**Open questions:** none

## Why

The OpenSpec CLI generates six `openspec-*` skills into every WongStack repo, and all six show up in the user's `/` menu. None of them is a user entry point: WongStack fronts each one with a verb (`/explore`, `/plan`, `/apply`, `/ship`), and the fronting verb owns behavior the generated skill does not — the `/save` handoff, the git boundary, the exit round. A user who types `/openspec-propose` instead of `/plan` gets the bare OpenSpec step with none of that, silently. The menu offers twelve doors to six rooms, and six of them are the wrong door.

`user-invocable: false` closes them while keeping the Skill tool working, so the fronting verbs still hand off. The catch is that `openspec update` rewrites the six files from CLI templates, wiping any hand edit — so the patch has to be re-applied, by script, every time the layer regenerates.

**Non-goals.** Hiding any WongStack verb; using `disable-model-invocation` (a prior spike proved it blocks the Skill tool and would sever every handoff); a `--check` mode or CI job to catch drift; changing what the generated skills *do*.

## What Changes

- **New payload script** `.claude/skills/wong-sync/scripts/hide-openspec-skills.sh` — idempotent, adds `user-invocable: false` to the frontmatter of every `.claude/skills/openspec-*/SKILL.md` it finds, and is safe to re-run when the key is already present.
- **`/wong-setup` calls it** after `openspec init`, so a fresh install never shows the six.
- **`/update-dependencies` calls it** in Stage 3, right after `openspec update` regenerates the layer.
- **`/wong-sync` proposes the run** as a task in the change it writes, so an existing target picks the patch up when it applies that plan. It does not run the script itself — it writes no payload file — except on the fresh-install path, where the copy is the install.
- **The "generated skills stay pristine" rule is narrowed** — in the payload manifest, in `.claude/rules/payload.md`, and in the `context-economy` spec that states it normatively. It currently forbids exactly what this change does. The carve-out is narrow: the frontmatter visibility key, applied by script, is the one permitted edit; the description and the body stay pristine.
- **VERSION and CHANGELOG.md** move, because this edits the payload.

`payload-files.json` needs no edit: `wong-sync` is already a core `skillDir`, and those are copied whole with their `scripts/`. The manifest's prose description of the skill's contents still gains the new file.

## Capabilities

### New Capabilities

- `openspec-skill-visibility`: the generated `openspec-*` skills are hidden from the user's command menu while staying invocable by the fronting WongStack verbs, and the patch survives every regeneration of the layer.

### Modified Capabilities

- `context-economy`: the rule that generated and vendored skills "SHALL stay pristine" is narrowed to the description and body, so a script-applied visibility key is permitted. `agent-browser` stays fully exempt — it already ships `hidden: true` from upstream.

## Impact

- **Payload, so it reaches every target repo.** New script under `.claude/skills/wong-sync/scripts/`, which ships automatically with the whole-directory copy and is described in the payload manifest.
- **Three skills gain a step**: `wong-setup`, `wong-sync`, `update-dependencies`.
- **The six generated files** carry one added frontmatter line each — reapplied, never hand-maintained.
- **Release**: `VERSION` 12.4.0 → 12.5.0 and a newest-first `CHANGELOG.md` entry.
- **The one risk was probed first and cleared**: `user-invocable: false` was documented but never verified here, and the change would have been void if it blocked the Skill tool the way `disable-model-invocation` does. A control-and-flagged probe pair ran before anything was patched; the flagged skill invoked normally, and the user confirmed the six left the `/` menu.

## Decision log

- **asked: how far should the patch reach? → chose: payload, targets too.** Meta-repo-only was the alternative. Targets are where the menu clutter actually costs something — a WongStack user there has no reason to ever want the raw OpenSpec steps, and no context for why two doors exist.
- **asked: what re-applies the patch after a regeneration? → chose: a script the skills call.** A `PostToolUse` hook was rejected because it needs `.claude/settings.json`, which the manifest excludes from the payload — so a hook could never reach a target, defeating the reach decision. A documented manual step was rejected because it spends a model call every run on a mechanical edit.
- **asked: how should drift be caught when the patch is missed? → chose: patch only.** The user explicitly declined both a `--check` mode and a CI job. Drift shows up as the six reappearing in the menu, which is self-evident; the cost of a missed run is cosmetic, not correctness.
- **`disable-model-invocation` was ruled out before the round**, on evidence rather than opinion: the spike recorded in `notes/extract-walk-skill.md` and archived change `2026-08-02-extract-walk-skill` proved it blocks the Skill tool itself (`Skill X cannot be used with Skill tool due to disable-model-invocation`), which would sever `/explore`→`openspec-explore`, `/plan`→`openspec-propose`, `/apply`→`openspec-apply-change`, and `/ship`→`openspec-archive-change`.

- **2026-09-14** — Planned and implemented in one session; all 29 tasks landed. `user-invocable: false` was **probed before anything was built** (flagged skill + control, per the method the `extract-walk-skill` spike established): the flagged probe invoked cleanly through the Skill tool, and the user confirmed the six left the `/` menu. That closed the one risk that could have voided the change — `disable-model-invocation` blocks the Skill tool, and had this flag done the same there would have been no way to hide the skills without severing the verb handoffs.
- **2026-09-14** — Two corrections during implementation, both found by wiring rather than planning. **The key is inserted at the top of the frontmatter, not the bottom:** CLI 1.8.0 frontmatter ends with a nested `metadata:` block, so a key appended before the closing fence parses correctly but reads as though it belongs to `metadata:`. **And the script globs both `.claude/skills/` and `.agents/skills/`, deduped by real path** — `.claude` is a symlink to `.agents` here and `.openspec-target` says the CLI generates into `.agents/`, so globbing one path would miss some layouts and globbing both without deduping would double-count.
- **2026-09-14** — **`/wong-sync` proposes the script run rather than performing it.** The plan had it calling the script like the other two callers; that would have broken the skill's central guarantee that it writes no payload file and opens no PR. A script run is a write. It now adds the run as a task in the change it proposes, so `/apply` performs it after review — except on the fresh-install path, where the copy *is* the install and no plan exists to carry the task.
- **2026-09-14** — Discovered that plain `openspec update` is a **no-op when the CLI is already current** and leaves the key intact; only `openspec update --force` rewrites the six and wipes it. The re-apply loop was proven with `--force`. This is why `already-hidden 6` is the ordinary result in `/update-dependencies` and `patched 6` signals the layer was really rewritten.
- **2026-09-14** — `payload-files.json` needed no edit: `wong-sync` is already a core `skillDir`, and those are copied whole including `scripts/`. Only the manifest's prose description of the skill's contents changed.
- **2026-09-14** — Archived to `openspec/changes/archive/2026-09-14-hide-openspec-skills/` and checkpointed for the merge. Both delta specs were verified already-synced at archive time (the `/save` before this one folded them in), so the archive step applied nothing further: `openspec-skill-visibility` is a new main spec with 3 requirements and 12 scenarios, and `context-economy`'s narrowed pristine rule carries its new scenario with both pre-existing ones intact.

<!-- end proposal.md -->
<!-- file design.md utf8 7601 -->
## Context

See [proposal.md](proposal.md) — Why. The constraints that shape the approach:

- **The six files are generated, not authored.** `openspec init` and `openspec update` rewrite `.claude/skills/openspec-*/SKILL.md` from CLI 1.8.0 templates. Any edit is discarded on the next run, so the patch must be re-applied rather than maintained.
- **The fronting verbs invoke them through the Skill tool.** `/explore`→`openspec-explore`, `/plan`→`openspec-propose`, `/apply`→`openspec-apply-change`, `/ship`→`openspec-archive-change`. Whatever hides them must not break that.
- **`.claude/settings.json` is not payload.** The [manifest](../../../.claude/skills/wong-sync/references/payload-manifest.md) excludes it, which is what rules a hook out of a payload-reaching solution.
- **The payload is prose with no test suite.** Verification is by probe and by reading, not by a runner.
- **Frontmatter shape is fixed and simple**: a leading `---`, flat `key: value` lines, a nested `metadata:` block, a closing `---`.

## Goals / Non-Goals

**Goals:**

- One idempotent script owns the patch; the three regenerating skills call it and report the result.
- Discovery by glob, so a CLI release that adds or renames a generated skill needs no script edit.
- The edit is provably minimal — one inserted line, description and body untouched.

**Non-Goals:**

- Detecting drift. No `--check` mode, no CI job, no hook. Regeneration outside a WongStack skill leaves the menu visible until the next skill run, and that is accepted.
- Hiding any WongStack verb, or touching `agent-browser` (already `hidden: true` upstream).
- Changing what the generated skills do.

## Decisions

**`user-invocable: false`, not `disable-model-invocation: true`.** The second is the obvious-looking lever and it is wrong: a spike recorded in [`notes/extract-walk-skill.md`](../../../notes/extract-walk-skill.md) proved it blocks the Skill tool itself — `Skill spike-flagged cannot be used with Skill tool due to disable-model-invocation` — which would sever all four handoffs. `user-invocable: false` is documented as the opposite lever: hides from the `/` menu, keeps model invocation. **It has not been probed here**, so task 1 probes it before anything else is built.

**Not `hidden: true`.** `agent-browser` ships it, and that skill still appears in the agent's own skill listing, so `hidden` governs something other than model visibility. Its exact semantics are undocumented in this repo. `user-invocable` is the documented name for the behavior wanted, so prefer the lever whose contract is written down. If task 1 shows `user-invocable: false` also blocks the Skill tool, `hidden: true` is the fallback to probe next — and if both fail, the change is void and stops there.

**A bash script, not a node one.** The precedent for a payload skill shipping scripts is [`save/scripts/`](../../../.claude/skills/save/scripts/), both bash. The work is line-oriented text editing over six small files — no dependency, no parsing library, nothing node buys here.

**It lives in `wong-sync/scripts/`, not a new top-level directory.** `/wong-sync` is the skill most associated with keeping a target's payload current, and the manifest already ships whole skill directories including their `scripts/`. A shared `.claude/scripts/` would be a new payload category for one file. The cost is that `/wong-setup` and `/update-dependencies` call a script under another skill's directory — acceptable, and already how `/verify` uses `save/scripts/preview-url.sh`.

**Insert the key rather than rewrite the frontmatter.** The script finds the opening `---`, scans to the closing `---`, and inserts `user-invocable: false` **immediately after the opening fence**, only when no `user-invocable:` key is already in that block. This makes idempotency a property of the algorithm, keeps every other byte identical, and avoids round-tripping YAML through a parser that would reformat `metadata:` or requote strings.

Insertion at the *top* of the block, not the bottom: CLI 1.8.0 frontmatter ends with a nested `metadata:` block, so a key appended before the closing fence sits at column 0 directly under indented children. That parses correctly — column 0 closes the nested block — but it reads as though it belongs to `metadata:`, and the next person to touch it has to re-derive that it doesn't. The top of the block is unambiguous, and it is just as independent of key order.

**Glob both `.claude/skills/` and `.agents/skills/`, then dedupe by real path.** In this repo `.claude` is a symlink to `.agents`, and `.openspec-target` says the CLI generates into `.agents/`. A target may have either layout, or both-as-one like here. Globbing one path would miss a repo using the other; globbing both without deduping would patch the same file twice and miscount the summary. Resolving each hit to its real path and skipping duplicates covers every layout with no configuration.

**`/wong-sync` proposes the run; it does not perform it.** Wiring the script into the sync the way the other two callers take it would break the skill's central guarantee — it writes no payload file and opens no PR, so that a user reviews the gap before anything changes. A script run is a write. So the sync adds *running the script* as a task in the change it proposes, and `/apply` performs it on the ordinary path. The one exception is the fresh-install path (a seed manifest, where every payload file is absent and the sync does copy): there is no plan to carry a task there, so the script runs inline with the copy. This was found while wiring the caller, not while planning it.

**Report, don't just act.** Each caller prints `patched N, already-hidden M`, so a regeneration that silently produced zero generated skills is visible rather than a no-op that reads like success.

## Risks / Trade-offs

- **`user-invocable: false` might also block the Skill tool** → task 1 probes it with a flagged/control pair before any other work. The control proves hot-reload worked, so a failure is attributable to the flag. If it blocks, probe `hidden: true`; if that also blocks, stop and report — the change cannot be built.
- **A future CLI emits frontmatter this script cannot parse** (no `---` fence, or a different format) → the script exits non-zero and names the file rather than writing a corrupted SKILL.md. A loud failure during a regeneration pass is recoverable; a mangled skill is not.
- **A user runs `openspec update` by hand and the six reappear** → accepted by decision, not mitigated. The symptom is self-evident in the `/` menu and the fix is one script run.
- **The menu hides a skill a power user genuinely wanted** → they can still reach every OpenSpec step through its fronting verb, which is strictly more capable. No capability is removed, only a worse door.
- **Three callers can drift apart** → the script owns the behavior and each caller owns one line invoking it, so drift is limited to a caller forgetting the line. The spec's third requirement names all three, which is what a reviewer checks against.

## Migration Plan

Existing targets pick the patch up on their next `/wong-sync`, which proposes the new script as an ordinary payload addition and then runs it. No migration step is needed in a target, and nothing breaks if a target never syncs — it simply keeps the six visible, exactly as today.

Rollback is deleting the script and the three call sites; the next `openspec update` restores the generated skills to upstream state on its own, because the patch was never anything but an overlay.

<!-- end design.md -->
<!-- file tasks.md utf8 7343 -->
## 1. Probe the flag before building anything

- [x] 1.1 Create two probe skills under `.claude/skills/` — `probe-flagged` with `user-invocable: false` and `probe-control` with no visibility key — each with a one-line body that prints a distinct string. Use the flagged/control method from [`notes/extract-walk-skill.md`](../../../notes/extract-walk-skill.md): the control proves hot-reload worked, so a failure on the flagged one is attributable to the flag.
- [x] 1.2 Invoke `probe-control` via the Skill tool and confirm it runs. If it does not, hot-reload is the problem, not the flag — stop and resolve that first.
- [x] 1.3 Invoke `probe-flagged` via the Skill tool. Record the exact result verbatim, including any error string.
- [x] 1.4 Confirm the flagged skill is absent from the `/` menu. **Confirmed by the user** against the six patched generated skills: menu clean, WongStack verbs still present. The agent cannot see this surface itself — its Skill-tool listing still shows a hidden skill, which is the flag working as intended, not a failure.
- [x] 1.5 **Decision gate.** Flagged skill invokes and is hidden → proceed. Flagged skill cannot be invoked → probe `hidden: true` the same way; if that also blocks the Skill tool, **stop the change**, report that neither lever works, and leave the remaining tasks unchecked. Do not fall back to `disable-model-invocation` — it is already proven to block.
- [x] 1.6 Delete both probe skills. Confirm `git status` shows no probe files left behind.

## 2. The patch script

- [x] 2.1 Write `.claude/skills/wong-sync/scripts/hide-openspec-skills.sh`, executable, `#!/usr/bin/env bash`, with a header comment in the style of [`save/scripts/preview-url.sh`](../../../.claude/skills/save/scripts/preview-url.sh) stating what it does and why the patch must be re-applied.
- [x] 2.2 Discover targets by glob — both `.claude/skills/openspec-*/SKILL.md` and `.agents/skills/openspec-*/SKILL.md` under `$(git rev-parse --show-toplevel)`, deduped by real path — never a hard-coded list of the six, per the spec's "CLI adds a seventh" scenario. Both globs are needed because `.claude` may be a symlink to `.agents` (it is in this repo) and the CLI's `.openspec-target` decides which one it writes to.
- [x] 2.3 Implement the insert: locate the opening `---`, scan to the closing `---`, and insert `user-invocable: false` immediately after the opening fence only when no `user-invocable:` key exists in that block. Top of the block, not the bottom — the frontmatter ends with a nested `metadata:` block, per design.md. Leave every other byte untouched.
- [x] 2.4 Make failure loud and safe — exit non-zero naming the file when frontmatter has no `---` fence or cannot be scanned, and never write a partially-rewritten `SKILL.md`. Exit zero when no generated skills are found.
- [x] 2.5 Print a summary line in the form `patched N, already-hidden M` so a caller can report it and a zero-target run is visible rather than silent.
- [x] 2.6 `chmod +x` the script and confirm the executable bit is committed (`git ls-files -s` shows mode `100755`).

## 3. Verify the script against the real files

- [x] 3.1 Run it on this repo's six generated skills. Confirm all six gain the key and the summary reads `patched 6, already-hidden 0`.
- [x] 3.2 Run it again. Confirm `patched 0, already-hidden 6`, exit zero, and `git diff` shows no further change — the idempotency scenario.
- [x] 3.3 Confirm the diff for each of the six is exactly one added line, with description and body untouched (`git diff --stat` shows 6 files, 6 insertions, 0 deletions).
- [x] 3.4 Confirm `/plan`→`openspec-propose` still hands off — **done**: `openspec-explore` was invoked through the Skill tool while hidden and loaded normally. The `/` menu half is **not verifiable from a non-interactive session** (see 1.4); it needs the same single human confirmation.
- [x] 3.5 Run `openspec update` to regenerate, confirm the key is wiped, then run the script and confirm it is restored. This proves the re-apply loop the whole change rests on. **Note:** plain `openspec update` is a no-op when the CLI is already current and leaves the key intact; `openspec update --force` rewrites and wipes it. The loop was proven with `--force`.
- [x] 3.6 Test the no-targets path in a scratch directory with no `openspec-*` skills: confirm it reports none and exits zero.

## 4. Wire the three callers

- [x] 4.1 In [`.claude/skills/wong-setup/SKILL.md`](../../../.claude/skills/wong-setup/SKILL.md), add the script run to the OpenSpec-ready step that runs `openspec init`, and have it report the result. Keep it beside the existing correction of the CLI's `/opsx:propose` parting advice — both are about the user's first impression of the menu.
- [x] 4.2 In [`.claude/skills/update-dependencies/SKILL.md`](../../../.claude/skills/update-dependencies/SKILL.md), add the script run to Stage 3 immediately after `openspec update`, before the ripple check, and include the `patched N, already-hidden M` line in the stage's report.
- [x] 4.3 In [`.claude/skills/wong-sync/SKILL.md`](../../../.claude/skills/wong-sync/SKILL.md), make the sync **propose** the script run as a task in the plan it writes (Step 3), not perform it — the skill writes no payload file, so running it directly would break that guarantee. On the fresh-install path (seed manifest, Step 2 copies everything) run it inline instead, since no plan carries the task. See design.md — `/wong-sync` proposes the run.
- [x] 4.4 Confirm all three call sites name the script by repo-relative path (`$(git rev-parse --show-toplevel)/.claude/skills/wong-sync/scripts/hide-openspec-skills.sh`) — never `${CLAUDE_PLUGIN_ROOT}` or an absolute path, per [`.claude/rules/payload.md`](../../../.claude/rules/payload.md).

## 5. Narrow the "stay pristine" rule

- [x] 5.1 In [`payload-manifest.md`](../../../.claude/skills/wong-sync/references/payload-manifest.md), amend the generated-skills entry so "never edit them" carves out the script-applied visibility key, and add the new script to the `wong-sync` skill's described contents. Keep the reason intact: `openspec update` wipes hand edits, which is *why* the key is applied by script rather than by hand.
- [x] 5.2 In [`.claude/rules/payload.md`](../../../.claude/rules/payload.md), update the "generated `openspec-*` skills and the vendored `agent-browser` skill stay pristine — regenerate, don't hand-edit" line to match. `agent-browser` stays fully exempt.
- [x] 5.3 Confirm no third surface restates the pristine rule — `grep -rn "pristine" .claude/ wiki/` — and that any other hit links to the owner rather than repeating the carve-out, per `payload-single-source`.

## 6. Release

- [x] 6.1 Bump [`VERSION`](../../../VERSION) 12.4.0 → 12.5.0. Minor: new payload capability, no breaking change to an existing one.
- [x] 6.2 Add a newest-first [`CHANGELOG.md`](../../../CHANGELOG.md) entry describing the hidden generated skills and the re-apply script, in the voice of the existing entries.
- [x] 6.3 Run `node scripts/check-payload-links.mjs` and resolve any *dead* link it reports. This is the only detector for a payload link that breaks in a target but resolves here.
- [x] 6.4 Confirm the release is warranted out loud: payload files changed, so this is a release and the bump is due.

<!-- end tasks.md -->
<!-- file specs/context-economy/spec.md utf8 1559 -->
## MODIFIED Requirements

### Requirement: WongStack-authored skill descriptions are triggers, not manuals

The frontmatter `description` of a WongStack-authored skill SHALL state what the skill does and when to invoke it, in at most 600 characters; the how belongs in the skill body, which loads only on invocation.

Generated skills (`openspec-*`) and vendored skills (`agent-browser`) are exempt from the budget, and their `description` and body SHALL stay pristine — they are rewritten from upstream templates, so an edit to either is discarded on the next regeneration.

Pristine is scoped to the `description` and the body. A generated skill's frontmatter MAY carry a visibility key applied by the payload's patch script, per `openspec-skill-visibility`. No other frontmatter edit is permitted, and `agent-browser` takes none — it already ships its visibility setting from upstream.

#### Scenario: A description is trimmed

- **WHEN** a WongStack-authored skill's description exceeds the budget
- **THEN** it is rewritten to its purpose and its invocation triggers
- **AND** every behavior detail it dropped remains stated in the skill body

#### Scenario: A generated skill is left alone

- **WHEN** descriptions are trimmed
- **THEN** no `openspec-*` or `agent-browser` description or body changes

#### Scenario: A generated skill is hidden from the menu

- **WHEN** the patch script adds the visibility key to an `openspec-*` skill
- **THEN** that is permitted despite the pristine rule
- **AND** the skill's description and body are unchanged

<!-- end specs/context-economy/spec.md -->
<!-- file specs/openspec-skill-visibility/spec.md utf8 5893 -->
## Purpose

The OpenSpec CLI generates six `openspec-*` skills into every repo, and WongStack fronts each one with a verb that owns behavior the generated skill lacks. This capability keeps the generated skills out of the user's command menu while leaving them invocable by those fronting verbs, and keeps that state true across every regeneration of the generated layer.

## ADDED Requirements

### Requirement: The generated OpenSpec skills are hidden from the user's command menu

Every `.claude/skills/openspec-*/SKILL.md` SHALL carry `user-invocable: false` in its frontmatter, so the skill does not appear in the `/` menu and cannot be invoked by the user directly.

The skills SHALL remain invocable by the model through the Skill tool. `disable-model-invocation` SHALL NOT be used on any generated skill, because it blocks the Skill tool and would sever the handoffs the WongStack verbs depend on.

The frontmatter `description` and the body of a generated skill SHALL NOT be modified. The visibility key is the only permitted edit.

#### Scenario: A user opens the command menu

- **WHEN** a user types `/` in a repo carrying the WongStack payload
- **THEN** no `openspec-*` skill is offered
- **AND** the fronting verbs `/explore`, `/plan`, `/apply`, and `/ship` are offered

#### Scenario: A fronting verb hands off

- **WHEN** `/explore` invokes `openspec-explore`, `/plan` invokes `openspec-propose`, `/apply` invokes `openspec-apply-change`, or `/ship` invokes `openspec-archive-change`
- **THEN** the Skill tool invokes the hidden skill successfully
- **AND** the resulting behavior is unchanged from before it was hidden

#### Scenario: The generated content is untouched

- **WHEN** the visibility key is applied to a generated skill
- **THEN** the only difference from the CLI's generated output is the added frontmatter key
- **AND** the description and body are byte-identical to what the CLI produced

### Requirement: A script applies the visibility key and is safe to re-run

The payload SHALL ship an executable script that adds `user-invocable: false` to the frontmatter of every `.claude/skills/openspec-*/SKILL.md` in the repository it runs in.

The script SHALL be idempotent: running it when the key is already present SHALL leave the file unchanged and SHALL NOT fail. It SHALL discover the generated skills by pattern rather than from a hard-coded list, so a CLI release that adds or renames a generated skill is covered without editing the script. It SHALL report which files it changed and which it left alone. It SHALL exit non-zero only when it cannot do its job — an unreadable file or frontmatter it cannot parse — and SHALL NOT fail when it finds no generated skills.

The script SHALL reference repository files by repo-relative path so it works from a target repo's own `.claude/skills/`.

#### Scenario: First run after generation

- **WHEN** the script runs against six freshly generated skills with no visibility key
- **THEN** all six gain `user-invocable: false`
- **AND** the script reports six files changed

#### Scenario: Re-run with the key already present

- **WHEN** the script runs again immediately
- **THEN** no file changes
- **AND** the script reports six files already patched and exits zero

#### Scenario: The CLI adds a seventh generated skill

- **WHEN** a CLI release generates a new `openspec-*` skill
- **THEN** the next run patches it without any edit to the script

#### Scenario: No generated skills present

- **WHEN** the script runs in a repo where `openspec init` has not been run
- **THEN** it reports that it found none and exits zero

### Requirement: Every skill that regenerates the layer re-applies the patch

`openspec init` and `openspec update` rewrite the generated skills from CLI templates, discarding the visibility key. Every WongStack skill that runs either command SHALL run the patch script afterwards, in the same pass, so the layer is never left visible.

This SHALL apply to `/wong-setup` after it runs `openspec init` in a target, and to `/update-dependencies` after its regeneration stage. Each SHALL report the patch result as part of its own output.

`/wong-sync` proposes and never implements, so it SHALL NOT run the script during an ordinary run. It SHALL instead add running the script as a **task in the change it proposes**, so the patch is applied through the normal review-then-`/apply` path like every other payload task. On the fresh-install path — the one run that does copy — it SHALL run the script directly, because there is no plan to carry the task.

#### Scenario: A fresh install

- **WHEN** `/wong-setup` runs `openspec init` in a target repo
- **THEN** it runs the patch script before it finishes
- **AND** the user's first `/` menu in that repo shows no `openspec-*` skill

#### Scenario: A dependency update regenerates the layer

- **WHEN** `/update-dependencies` runs `openspec update`
- **THEN** it runs the patch script in the same pass
- **AND** its report states how many generated skills were re-patched

#### Scenario: An existing target syncs

- **WHEN** `/wong-sync` brings a target up to date on an ordinary run
- **THEN** the change it proposes carries a task to run the patch script
- **AND** the script itself does not run during the sync, because the sync writes no payload file

#### Scenario: A target is installed from a seed manifest

- **WHEN** `/wong-sync` runs the fresh-install path, which copies every payload file
- **THEN** it runs the patch script directly as part of that install
- **AND** reports the result, because no plan exists to carry the task

#### Scenario: Regeneration happens outside a WongStack skill

- **WHEN** a user runs `openspec update` by hand
- **THEN** the generated skills reappear in the menu until a skill that owns the patch runs again
- **AND** this is accepted: no hook, check mode, or CI job guards against it

<!-- end specs/openspec-skill-visibility/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-09-14

~~~
<!-- end .openspec.yaml -->
