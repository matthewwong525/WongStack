# Tasks

## 1. The measurement (meta-only script)

- [x] 1.1 Add a context-by-skill view to `scripts/measure-usage.mjs`: per main-thread request, context = input + cache writes + cache read; per task and skill, the first turn's context and the peak; report median and p90 per skill in `print` and in `--json`. Verify: a new test in `scripts/tests/usage-measurement.test.mjs` feeds one session whose first `apply` turn is 120k and largest is 300k and gets exactly those numbers, and the existing tests still pass with `node --test scripts/tests/usage-measurement.test.mjs`.

## 2. The apply skill

- [x] 2.1 Write `.agents/skills/apply/references/build-helper.md`, the helper's brief: read `openspec instructions apply --change <name> --json` and every `contextFiles` path, proposal first; work pending tasks in order with tests beside the code; tick each checkbox; stop and return on ambiguity, a blocker, or a gate task; never ask, run git, run `/save`, upload a preview, delete caches, or run global installers; return at most about ten lines: tasks done, files changed, stop reason with the exact question or blocker. Link the change loop's exit-versus-implementation section rather than restating it. Verify: the brief reads alone and every doc it names is linked.
- [x] 2.2 In `.agents/skills/apply/SKILL.md`, replace the *Work the pending tasks* paragraph with a *Build in a helper* section: start a fresh helper with the change name and the brief's repo-relative path; loop on its report (question → ask, then a new helper; gate task → `/save`, mark, new helper; blocker → report and stop; all done → finish with a preview); inline fallback when no helper can start or `/apply` already runs inside one; follow-up edits after the preview stay in the parent unless they add tasks. Keep resolution, the preview, loosened checks, the report, the `/ship` return, and the to-do path unchanged. Verify: every scenario in the `apply-plan-handoff` and `apply-completion-handoff` specs still maps to a line in the skill, and the description stays at or under 600 characters.

## 3. The change-loop page

- [x] 3.1 In `wiki/development/the-change-loop.md`, the `/apply` bullet says it builds in a fresh helper and keeps the preview and questions in the conversation, linking the new `SKILL.md` section. Verify: no second copy of the loop's rules.

## 4. Release

- [x] 4.1 Bump `VERSION` 25.10.1 → 25.11.0 and add a newest-first `CHANGELOG.md` entry with an **Updating** line. Verify: the entry names the helper, the inline fallback, and the new brief.
- [x] 4.2 Run `node scripts/check-payload-links.mjs`, `node scripts/check-openspec-config.mjs`, `node scripts/check-retired-names.mjs`, and `openspec validate apply-builds-in-a-helper --strict --no-interactive`. Verify: all pass.
- [ ] 4.3 CI passes on the pull request, checked by `/save`.
