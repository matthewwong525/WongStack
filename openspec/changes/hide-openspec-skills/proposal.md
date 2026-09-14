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
