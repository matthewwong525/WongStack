# Tasks

## 1. Wiki

- [x] 1.1 In `wiki/agent-knowledge-center.md` § *What each surface owns*, add the cheapest-first order paragraph and narrow the *prefer a rule to a hook* sentence, per design; verify the page links `scripts/measure-context.mjs` and `development/repository-improvement.md#a-check-before-an-instruction`, and the wiki check passes
- [x] 1.2 In `wiki/development/repository-improvement.md` § *A check before an instruction*, add the hook branch: when it fits, the three shapes, both hosts, second attempt allowed; verify the heading text is unchanged, so existing anchors still resolve
- [x] 1.3 Link the order from `wiki/maintaining/adding-a-skill.md` (*Cut a rule before you cut words*) in one clause, with no restated order; verify by reading the paragraph

## 2. Skills

- [x] 2.1 Change `.agents/skills/improve-code/SKILL.md`'s *A mistake a check could catch* line to include a hook when only the chat shows the mistake; cut equal bytes elsewhere in skill text; verify `node scripts/measure-context.mjs --check` passes

## 3. The stop check

- [x] 3.1 Write `.agents/skills/apply/scripts/helper-stop-check.mjs` per design, using the shared `lib/cli.mjs` helpers; it allows on `stop_hook_active`, a non-build agent, a report line, or any error, and blocks once otherwise
- [x] 3.2 Write `scripts/tests/helper-stop-check.test.mjs` with fixtures for: no report → block with the reason; report present → allow; a question return with its report → allow; `stop_hook_active` → allow; main chat → allow; bad JSON and a missing transcript → allow with no output; verify `node --test scripts/tests/helper-stop-check.test.mjs` passes
- [x] 3.3 Add the `SubagentStop` entry to `.agents/settings.json`; run one build helper in Claude Code that stops early and confirm it is sent back once
- [x] 3.4 In Codex, run one sub-agent and record which stop event fires and with which fields; add the matching entry to `.agents/hooks.json`, or leave Codex out and say so in the changelog; extend `scripts/tests/agent-layout.test.mjs` to require the entries added

## 4. Release

- [x] 4.1 Add a `## Next (minor) — Cheapest place first, and a hook for repeat mistakes` entry to `CHANGELOG.md`, with an *Updating* note in plain words that Codex may ask once to trust the new hook; verify `node scripts/check-payload-links.mjs` passes

## 5. Verification

- [x] 5.1 Run `node .github/scripts/checks.mjs --worktree` and confirm it passes, including `measure-context.mjs --check`
- [ ] 5.2 After `/save`, confirm CI passes and record in memory that this change answers struggle note #1687
