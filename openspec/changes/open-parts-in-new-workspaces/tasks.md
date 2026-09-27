# Tasks

## 1. Open a workspace (payload scripts)

- [x] 1.1 Move `findPaseo`, the `--json` call wrapper, `DAEMON_DOWN`, and the exit codes from `.agents/skills/routine/scripts/routine.mjs` into `.agents/skills/routine/scripts/lib/paseo.mjs`, with the binary override name as a parameter; verify `scripts/tests/routine.test.mjs` passes unchanged
- [x] 1.2 Write `.agents/skills/routine/scripts/workspace.mjs open --title --brief [--checkout] [--agent] [--dry-run]` per the design: copy the caller's settings from `paseo inspect`, fetch the default branch and branch off `origin/<default>` from the primary worktree, strip `PASEO_AGENT_ID` and `PASEO_WORKSPACE_ID` from the child, print one JSON object, and use exit codes 0, 2, 3, 4, and 5 like `routine.mjs`; verify `--help` prints the usage
- [x] 1.3 Add `scripts/tests/workspace.test.mjs` with a fake `paseo` (`WORKSPACE_PASEO_BIN`) and a temp repo with a linked worktree: the branch-off argument list from a linked worktree, checkout mode, settings copied from `inspect`, the `--agent` fallback, the parent id stripped from the child's environment, the parsed workspace id and branch, `setupSkippedReason` passed through, no Paseo (3), daemon down (4), a missing workspace line (a warning), a run result with no agent id (5), a failed fetch, a repo with no `main`, and `--dry-run` running nothing; verify it passes under the c8 wrapper the way `payload.yml` runs it
- [x] 1.4 Open one real workspace on this host with `workspace.mjs open` and a throwaway brief, confirm in `paseo ls --json` that it has no parent agent, the caller's model and mode, and a branch based on `origin/main`, then archive it; record the result in the Decision log

## 2. The rule and the runbook (wiki and skill references)

- [x] 2.1 Add `### Several parts, several workspaces` to `wiki/development/the-change-loop.md`: the rule in a few lines, linking the reference; verify with the payload link checker
- [x] 2.2 Write `.agents/skills/plan/references/new-workspace.md`: what counts as a part and as holding a change, the one ask and its options with and without Paseo, running the script per part, the brief template, the report naming each workspace, the next-work offer, and the unattended and failure fallbacks; in [voice](../../../wiki/voice.md), linked up to the change-loop section
- [x] 2.3 Update `wiki/development/required-tools.md` and `README.md`: Paseo is optional for schedules and for opening new workspaces; verify the links resolve

## 3. The verbs (payload skills)

- [x] 3.1 `.agents/skills/explore/SKILL.md`: the exit round lists the split question, linking the reference; verify the skill's description stays inside the context budget test
- [x] 3.2 `.agents/skills/plan/SKILL.md`: after a yes, open a workspace for each other part before drafting, plan only the kept part, and report the workspaces above the plan link
- [x] 3.3 `.agents/skills/continue/SKILL.md` step 3: when this worktree holds uncommitted work or another active change, recommend opening the change's branch in a new workspace with `/continue <name>`; keep the existing options
- [x] 3.4 `.agents/skills/ship/SKILL.md` Step 6 and `.agents/skills/explore/references/asking-the-user.md`'s next-step list: offer the next queued work in a new workspace, recommended, beside stopping
- [x] 3.5 `.agents/skills/wong-sync/references/payload-manifest.md`: the routine skill ships its scripts; verify `workspace.mjs` and `lib/paseo.mjs` fall under the shipped `scripts/` directory in `payload-files.json` or its rule

## 4. Release

- [x] 4.1 Bump `VERSION` to the next minor above main at the time (25.14.0) and add a newest-first `CHANGELOG.md` entry in plain words; verify the payload checks pass locally
- [ ] 4.2 Run `openspec validate open-parts-in-new-workspaces --strict --no-interactive` and the script tests, then `/save` so CI confirms the whole change
