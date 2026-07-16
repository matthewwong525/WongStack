---
name: ship
description: Ship the current branch — run a parallel quality gate (a doc-finder that captures process-doc changes, a test-runner that runs + writes tests, and an integration-reviewer that checks for downstream breakage), open or update a PR, wait for GitHub checks to pass when present (auto-fixing CI failures), squash-merge to the default branch, then archive the OpenSpec change (/opsx:archive) so the archived spec becomes the record of what shipped. Does NOT build locally — CI is the gate when present, else PR review; the gate agents are the local proof the code is tested and doesn't break callers. Stops after archive. Use when you're done iterating on a branch and want it shipped.
user-invocable: true
---

# /ship

Ship runbook. Invoking it authorizes the push, merge, and archive in Steps 4–6 — don't re-prompt. Confirm anything outside this runbook (force push, hard reset).

`/ship` is the **archive** step of the loop (`/explore → /plan → /apply → /save → /continue → /ship`): it runs a quality gate, archives the active change, then squash-merges the code. **The archived change is the record of what shipped** — no GitHub summary issue, no docs distillation (use `/document` for that).

**The merge gates are two things:** the CI gate when the repo has checks (push, wait, and on red read-fix-repush until green), **and** a parallel **quality gate** — a test-runner and an integration-reviewer that prove the logic is *tested* and *doesn't break callers*, the proof a green compile can't give. No checks configured → the PR review plus the quality gate is the gate; merge once approved. Never build/test locally.

> `main` stands for the repo's default branch — substitute whatever `git symbolic-ref refs/remotes/origin/HEAD` resolves to.

## Step 1 — preflight + launch the gate agents

```bash
git rev-parse --abbrev-ref HEAD
git status
git log origin/main..HEAD --oneline
# the default branch's own CI must be green before we add to it:
gh api repos/:owner/:repo/commits/main/check-runs \
  --jq '[.check_runs[]] | map(.conclusion) | (if (index("failure") or index("cancelled")) then "failure" else "ok" end)'
```
- On the default branch, or 0 commits ahead → **stop** (`/ship` runs on a feature branch with commits).
- Default branch's CI is `failure` → **stop**; fix it first (`ok`/empty = proceed).
- Dirty tree → auto-commit, don't prompt (stage code + `openspec/` by path, never `git add .`; repo-style message + `Co-Authored-By: Claude`).

**Then launch three background subagents** — so they work while you push and CI runs. The branch is final now, so all three see the complete diff. None can see this conversation, so hand each the same short brief: *what this branch did (1–2 lines), any process implication we concluded (or "nothing explicit"), and the changed areas.* Spawn all three in one message (`run_in_background: true`):

1. **doc-finder** — read-only `Explore` subagent (`subagent_type: Explore`): *"Read `.claude/skills/ship/agents/doc-finder.md` and carry out the task it describes."* Judges whether a reusable process changed and finds the existing doc to update. You collect it in **Step 2**.
2. **test-runner** — a default subagent (it *writes* tests, so not `Explore`): *"Read `.claude/skills/ship/agents/test-runner.md` and carry out the task it describes."* Discovers the repo's test command, runs the suite, writes the tests the change should have had, and reports `blockers`. You collect it in **Step 3**.
3. **integration-reviewer** — read-only `Explore` subagent (`subagent_type: Explore`): *"Read `.claude/skills/ship/agents/integration-reviewer.md` and carry out the task it describes."* Reads the diff for `breaking` downstream changes (blockers) and `advisory` duplication/reuse findings. You collect it in **Step 3**.

## Step 2 — capture doc changes (collect doc-finder)

Collect the doc-finder (wait for it if it's still running). The bar: **if this branch changed a reusable process — what the team can do or how they do it — the docs should say so**, usually by extending the page that owns it, not adding one. We do this at `/ship` because it's the one moment with both the full conversation and the finished diff (we don't touch `docs/` mid-task — see `CLAUDE.md`).

- Take the finder's `process_changed` as the default, but you hold the conversation it couldn't see: flip it to *yes* if we concluded a process change the diff alone wouldn't reveal (rarely the reverse). If *no*, note "no docs needed updating" for the Step 6 report and skip ahead.
- Read `docs/wiki-style.md` and the pages the finder named; reconcile against the diff + conversation, then **edit those pages in place**. Match each page's structure and tone; no changelog-style notes. Default hard to updating what exists; a **new page** only if the finder justified one (author + register it per wiki-style). If anything is `ambiguous`, **ask the user** (`AskUserQuestion`) before editing.
- **Commit the doc edits on their own** so they're cleanly attributable (`docs: <what process changed>`, `Co-Authored-By: Claude`). Markdown-only — it lands before the push.

## Step 3 — quality gate: collect the test + integration agents

Collect the two agents (wait for them if still running). They are the gate a green compile can't be. **Anything that lands a new commit means re-push and re-wait for CI (Step 5)** before merging.

**test-runner:**
- **`blockers`** (a real regression, or a test it wrote that found a bug) → **stop. Surface the failing test + the offending line and ask the user.** Do **not** paper over it by editing the test or weakening logic.
- **A `suite_before` failure flagged as likely-stale** (the branch intentionally changed that behaviour) → confirm against the conversation, then update the expectation yourself if it's clearly correct, or ask if unsure. Never silently.
- **`tests_added`** (new test files, green) → the good path: `git add` each by **explicit path**, commit on its own (`test: cover <what> — <case>`), let the re-push carry it.
- **`extractions`** (inline logic pulled into a pure helper) → commit with the tests; behaviour-preserving.
- **`gaps`** (risky logic it couldn't safely test) → collect for the Step 6 report; not a blocker.

**integration-reviewer:**
- **`breaking`** (a named downstream caller that misbehaves) → fix-and-continue **only if** the fix is unambiguous and mechanical (the agent named the line + the one-line fix): apply it, commit (`fix: <what> — <caller it unbreaks>`). **If the fix is a judgment call**, **stop and surface it to the user.** Never silently rewrite logic to satisfy the reviewer.
- **`advisory`** (duplication, missed reuse, divergence) → **do not block, do not fix here.** Collect verbatim for the Step 6 report.

Only proceed to merge once test-runner reports no open blockers **and** integration-reviewer's `breaking` list is resolved (fixed or user-approved).

## Step 4 — archive the change (/opsx:archive)

The change is named like the current branch. **Invoke the `openspec-archive-change` skill** (via the Skill tool) for `<branch>`. That skill is OpenSpec's `/opsx:archive`: it moves `openspec/changes/<name>/` → `openspec/changes/archive/YYYY-MM-DD-<name>/`, syncing any un-synced delta specs into `openspec/specs/` first. (`/save` normally synced already, so this is usually a no-op check.)

Commit the archive move on the branch so it ships with the code:
```bash
git add openspec/ && git commit -m "$(printf 'chore(openspec): archive <name>\n\nCo-Authored-By: Claude <noreply@anthropic.com>')"
```
No active change on this branch → skip Step 4 with a note (nothing to archive).

## Step 5 — open/update the PR + wait for CI green if present (auto-fix on failure)

No local build gate — push and let CI (when present) run.
```bash
gh pr view --json number,state,url 2>/dev/null
```
- OPEN → `git push`. None → `git push -u origin HEAD` + `gh pr create` (Summary + Test plan). MERGED/CLOSED → stop and ask.

```bash
ROOT="$(git rev-parse --show-toplevel)"
bash "$ROOT/.claude/skills/save/scripts/wait-for-checks.sh" 20
```
- **SUCCESS** / **NONE** (no checks — the PR review + the quality gate is the gate; invoking `/ship` is the approval) → Step 6.
- **FAILURE** → read the log, fix, re-push, re-wait (**cap 3; never ship red**):
  ```bash
  RUN_ID=$(gh run list --branch "$(git rev-parse --abbrev-ref HEAD)" --limit 1 --json databaseId --jq '.[0].databaseId')
  gh run view "$RUN_ID" --log-failed | tail -120
  ```
- **TIMEOUT** → don't merge; report checks still running and stop.

If Step 2 or 3 landed a commit after a prior push, that push re-triggers CI — re-run this wait until green before merging. Any *other* red check → stop; never merge red.

## Step 6 — merge (worktree-safe), then report

Merge via the API, then delete the **remote** branch explicitly. **Never `gh pr merge --delete-branch`** — it switches the local checkout to delete the local branch, which fails in a worktree where the default branch is checked out elsewhere.
```bash
BRANCH=$(git rev-parse --abbrev-ref HEAD)
gh pr merge --squash
git push origin --delete "$BRANCH"
```
The squash carries the archived change onto the default branch.

On **conflict**: `git fetch origin main` → `git merge origin/main` (merge, not rebase, unless asked); resolve each file as the **union of intent** from both sides; `git add` → `git commit` → `git push` → re-run Step 5 → retry once green. Other failure (branch protection, draft) → surface the exact `gh` error.

**Report:**
- PR number + URL, **merged (squash)** to the default branch.
- **Archived** — the change is now at `openspec/changes/archive/YYYY-MM-DD-<name>/` (`openspec list` no longer shows it; `openspec/specs/` holds the synced result).
- **Quality gate** — tests run (how, pass count) + any **new tests** added (file + the case each guards) + `gaps`; the integration agent's `breaking` findings (and how each was resolved) + its `advisory` notes for you to weigh later.
- **Docs** — pages updated + the process each reflects; any new page created + registered; or "no docs needed updating".
- **CI** — green (note N auto-fix pushes if any), and any follow-ups (a flag, a manual step, a secret).

## Hard rules
- Never ship onto a red default branch (when it has checks). Never `--force`/`--no-verify`. Never `git reset --hard` / `checkout .` without confirmation. Never build/test locally — CI is the gate when present, else PR review + the quality gate.
- **Merge worktree-safely:** `gh pr merge --squash` then `git push origin --delete`, never `--delete-branch`.
- **The quality gate blocks the merge:** a test-runner blocker or an unresolved integration `breaking` finding **stops the merge** — never paper over either. `advisory` findings are reported, not gated.
- **Archive the change before merging** (Step 4) so the archived spec ships onto the default branch as the record. No GitHub summary issue — the archive is the record; `/document` handles docs.
