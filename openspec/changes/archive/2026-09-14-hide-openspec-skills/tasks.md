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
