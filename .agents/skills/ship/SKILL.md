---
name: ship
description: Ship the current branch — open or update a PR, wait for all GitHub checks to pass when present (auto-fixing CI failures), walk the change's own OpenSpec scenarios against the deployed staging preview when the repo opted in (Playwright, screenshots and video, evidence as a PR comment), squash-merge to the default branch, then archive the OpenSpec change (/opsx:archive) so the archived spec becomes the record of what shipped. Does NOT build locally — CI is the gate when present, else PR review, and the walkthrough exercises what CI already deployed. Stops after archive. Use when you're done iterating on a branch and want it shipped.
user-invocable: true
---

# /ship

Ship runbook. Invoking it authorizes the push, merge, and archive in Steps 3–5 — don't re-prompt. Confirm anything outside this runbook (force push, hard reset).

`/ship` is the **merge + archive** step of the loop (`/explore → /plan → /apply → /save → /continue → /ship`): it archives the active change, then squash-merges the code. **The archived change is the record of what shipped** — no GitHub summary issue, no docs distillation (use `/dream` for that). CI is the gate when the repo has checks: we push, wait, and on red read-fix-repush until green, then merge. No checks configured → the PR review is the gate; merge once approved. Never build/test locally.

Where a repo has **opted into the staging walkthrough** — by installing `playwright`, nothing else — one more gate sits between green CI and the merge: the change's own OpenSpec scenarios are walked against the deployed preview and graded against what they said would happen ([Step 4.5](#step-45--walk-staging-only-if-this-repo-opted-in)). Repos that haven't opted in never see it. The gate ladder is **CI when present → the walkthrough when adopted → merge**, and a skipped rung is never a failure.

Deeper code review (cleanliness, broad consolidation, downstream breakage) happens **out-of-band** — PR review, or a dedicated code-review pass — not as a `/ship` gate; `/ship` is the merge, not the review.

> `main` stands for the repo's default branch — substitute whatever `git symbolic-ref refs/remotes/origin/HEAD` resolves to.

## Step 1 — preflight

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

## Step 2 — archive the change (/opsx:archive)

The change is named like the current branch. **Invoke the `openspec-archive-change` skill** (via the Skill tool) for `<branch>`. That skill is OpenSpec's `/opsx:archive`: it moves `openspec/changes/<name>/` → `openspec/changes/archive/YYYY-MM-DD-<name>/`, syncing any un-synced delta specs into `openspec/specs/` first. (`/save` normally synced already, so this is usually a no-op check.)

Commit the archive move on the branch so it ships with the code:
```bash
git add openspec/ && git commit -m "$(printf 'chore(openspec): archive <name>\n\nCo-Authored-By: Claude <noreply@anthropic.com>')"
```
No active change on this branch → skip Step 2 with a note (nothing to archive).

## Step 3 — open or update the PR

```bash
gh pr view --json number,state,url 2>/dev/null
```
- OPEN → `git push` (leave the body — `/save` already mirrored the change into it). None → `git push -u origin HEAD` + `gh pr create`; use the same **change-mirror body** `/save` writes (Summary + **Status** + Tasks + Preview + a `/continue` handoff footer) so the PR is a readable handoff even when `/save` was skipped. MERGED/CLOSED → stop and ask.

## Step 4 — wait for CI green if present (auto-fix on failure)

```bash
ROOT="$(git rev-parse --show-toplevel)"
bash "$ROOT/.claude/skills/save/scripts/wait-for-checks.sh" 20
```
- **SUCCESS** / **NONE** (no checks — the PR review is the gate; invoking `/ship` is the approval) → Step 4.5.
- **UNKNOWN** → **do not merge.** gh couldn't be asked, so the gate is unverified, not absent — merging here is exactly how a red branch reaches the default branch. Report the script's message and stop; the user can re-run `/ship` once `gh` works, or merge deliberately after checking the PR themselves.
- **FAILURE** → read the log, fix, re-push, re-wait (**cap 3; never ship red**):
  ```bash
  RUN_ID=$(gh run list --branch "$(git rev-parse --abbrev-ref HEAD)" --limit 1 --json databaseId --jq '.[0].databaseId')
  gh run view "$RUN_ID" --log-failed | tail -120
  ```
- **TIMEOUT** → don't merge; report checks still running and stop.

## Step 4.5 — walk staging (only if this repo opted in)

```bash
ROOT="$(git rev-parse --show-toplevel)"
bash "$ROOT/.claude/skills/ship/scripts/walk-staging.sh" preflight
```

**`RESULT: NONE` → go straight to Step 5.** Say nothing. This repo never opted in, and the promise the opt-in makes is that it costs nothing — not a warning, not a nudge, not a line of output. Most repos land here and the step is over in milliseconds.

Everything below runs only on `RESULT: READY` (which also prints `APP_DIR`, `URL`, `RUN_DIR`, `SHA`).

> **Why here.** CI green is what proves `cf-deploy.sh` published a version for *this* commit, which is what makes `preview-url.sh` return a URL that exists. Walking before Step 4 walks the previous commit, or nothing. Never construct the URL by hand from a worker-name convention — a URL you built yourself can point at a commit that was never deployed and still answer 200.

### 4.5a — scout the scenarios

The journeys come from the change's **own OpenSpec scenarios**, not from reading the app's routes. Read:

- every `#### Scenario:` in `openspec/changes/<name>/specs/**/spec.md` — this change's promise, and
- the scenarios of any capability in `openspec/specs/` whose files this branch's diff touches (`git diff --name-only origin/main..HEAD`), which catches a change that edits behavior an existing spec covers without writing a delta for it.

Do **not** walk the whole `openspec/specs/` surface. `/ship` runs once per change; a delta-scoped walk stays flat while a full-surface walk grows with the app forever. Regression coverage, if it is ever wanted, belongs in CI as saved tests — a different decision, deliberately not this one.

Then **keep only what a browser can see.** A per-commit alias serves HTTP and nothing else, so scenarios about queue consumers, cron triggers, and alarms are excluded — note which and why, so the report says "not walkable" rather than implying they passed.

**Destructive journeys are walked, not skipped.** Staging is a seeded fixture database; deleting things is often the scenario most worth walking, and a gate that must pass creates quiet pressure to shed exactly that coverage. Resist it.

### 4.5b — write the journeys

One `.mjs` file per journey in `$RUN_DIR/journeys/`, numbered in walk order. The scenario's **WHEN** becomes the steps; its **THEN** is carried across **verbatim** — never paraphrased, never "improved":

```js
export const meta = {
  id: 'empty-title-rejected',
  requirement: 'Notes can be created',
  scenario: 'Submitting with no title is rejected',
  then: 'the form shows "Title is required" and nothing is saved',  // ← the spec's words
}
export default async function journey(page, step) {
  await page.goto('/')                 // baseURL is the preview URL
  await step('landing')                // step() screenshots and records
  await page.getByRole('button', { name: 'New note' }).click()
  await step('empty form')
  await page.getByRole('button', { name: 'Save' }).click()
  await step('after submitting empty') // ← the THEN is judged on this screenshot
}
```

Put a `step()` wherever a human would look. Write **no assertions** — the script's job is to produce evidence, not to decide. An assertion here would bake in your guess at correctness and then be deleted with the run.

These files live in the temp run directory and nowhere else. Nothing the walkthrough does ever writes inside the repository.

### 4.5c — run it

```bash
bash "$ROOT/.claude/skills/ship/scripts/walk-staging.sh" run "$RUN_DIR" "$APP_DIR" "$URL"
```

### 4.5d — grade against the written expectation

Read `evidence.json`, then **look at the screenshots** — each journey's `then` is right there beside them. For each journey, decide whether the evidence shows what the `THEN` describes.

- **"No exception was thrown" is not a pass.** A journey whose script completed cleanly but whose screenshot lacks the message the `THEN` requires **fails**. This is the whole reason the verdict is not in the script.
- A thrown step is evidence, not a crash — "the button was never there" is exactly what the walk exists to surface.
- The `consoleErrors` array is context for a screenshot that looks right, never a verdict on its own.
- **Genuinely ambiguous? Stop and ask the user**, showing the screenshot and the `THEN` side by side. Do not resolve it in either direction yourself, and do not merge.

There is no second judging agent by design: the `THEN` was written by `/plan`, before this walk existed, for reasons that had nothing to do with passing it. That provenance is the external check. Honor it by grading against the words that are there.

### 4.5e — verdict

| Verdict | Meaning | What `/ship` does |
|---|---|---|
| **NONE** | not opted in | proceed, silently |
| **NONE** | opted in, nothing browser-observable | proceed, one line saying why |
| **SUCCESS** | every journey satisfied its `THEN` | post the comment (Step 4.5f), then Step 5 |
| **FAILURE** | a journey contradicted its `THEN` | **do not merge** — recovery below |
| **UNKNOWN** | the walk could not run or could not be trusted | **do not merge.** Report and stop |
| **TIMEOUT** | the walk exceeded its budget | **do not merge.** Report and stop |

**`UNKNOWN` is not `NONE`.** Once a repo has opted in, a walk that cannot run is *unverified*, not *absent* — the same distinction this runbook already draws for an unaskable CI check. The Access challenge is the case that matters most: without the check, a walk screenshots a login form and a grader could read "a page rendered" as a pass. The script exits `UNKNOWN` on it by name.

**On FAILURE** — reset staging first, then fix:

```bash
(cd "$APP_DIR" && npm run db:reset:staging)   # only on failure, never on a pass
```

Then fix → `git push` → re-run **Step 4** → re-run **Step 4.5**. These attempts share Step 4's **cap of 3**; they are not a second budget. Never merge on a red walk.

The reset is not tidiness: a retry against the half-mutated database the failed walk left behind produces a *different* failure than the first run, and you end up debugging leftovers. A **passing** walk's data is left exactly where it is — staging is a fixture, not a preserve.

### 4.5f — post the evidence, then clean up

One comment per `/ship` run (not per journey), written so it is complete as prose — a reader with no images still gets the whole story:

```bash
gh pr comment --body-file "$RUN_DIR/comment.md"
bash "$ROOT/.claude/skills/ship/scripts/walk-staging.sh" cleanup "$RUN_DIR"
```

Write `$RUN_DIR/comment.md` in this shape:

```markdown
## Staging walkthrough — <verdict>

Walked <N> scenario(s) against <url> at `<short-sha>`.

### ✅ Submitting with no title is rejected
> **THEN** the form shows "Title is required" and nothing is saved

`landing` → `empty form` → `after submitting empty`
The message appears and the list is unchanged.

![after submitting empty](<url-or-path>)
[video](<url-or-path>)

### ⛔ Not walkable
- *Imports are processed from the queue* — queue consumers don't run on a preview alias (HTTP only).
```

Then the media:

```bash
bash "$ROOT/.claude/skills/ship/scripts/walk-staging.sh" publish "$RUN_DIR"
```

- **`RESULT: WALKED`** → it printed `<local-path>\t<public-url>` per file; substitute them into the comment. Screenshots render inline, video is a link.
- **`RESULT: NONE`** (no `WALK_MEDIA_BUCKET`) → cite the local paths. This is **not** a failure and is not reported as one — the prose is the record; media is corroboration.

**Video is a link at every rung.** GitHub plays video inline only for `user-attachments` URLs, which are produced by dragging a file into the web UI — there is no `gh` or REST path to that endpoint. Don't go looking for one.

Run `cleanup` on every exit path, including when you stop on `UNKNOWN` or ask the user a question.

## Step 5 — merge (worktree-safe)

Merge via the API, then delete the **remote** branch explicitly. **Never `gh pr merge --delete-branch`** — it switches the local checkout to delete the local branch, which fails in a worktree where the default branch is checked out elsewhere.
```bash
BRANCH=$(git rev-parse --abbrev-ref HEAD)
gh pr merge --squash
git push origin --delete "$BRANCH"
```
The squash carries the archived change onto the default branch.

On **conflict**: `git fetch origin main` → `git merge origin/main` (merge, not rebase, unless asked); resolve each file as the **union of intent** from both sides; `git add` → `git commit` → `git push` → re-run Step 4 → retry once green. Other failure (branch protection, draft) → surface the exact `gh` error.

## Step 6 — report

- PR number + URL, **merged (squash)** to the default branch.
- **Archived** — the change is now at `openspec/changes/archive/YYYY-MM-DD-<name>/` on the default branch (`openspec list` no longer shows it; `openspec/specs/` holds the synced result).
- **CI** — green (note N auto-fix pushes if any), and any follow-ups (a flag, a manual step, a secret).
- **Walkthrough** — the verdict and how many journeys were walked, plus the PR comment link. Omit this line entirely when the repo never opted in; say "not walkable (no browser-observable scenarios)" when it opted in and there was nothing to walk.

## Hard rules
- Never ship onto a red default branch (when it has checks). **Never merge on an `UNKNOWN` check result** — unverified is not the same as no checks. Never `--force`/`--no-verify`. Never `git reset --hard` / `checkout .` without confirmation. Never build/test locally — CI is the gate when present, else PR review.
- **The walkthrough is opt-in and detected, never configured.** `playwright` in the app's `devDependencies` *is* the consent — there is no manifest field and no flag. Absent → Step 4.5 is silent and `/ship` behaves exactly as it did before it existed.
- **Never merge on a walkthrough `UNKNOWN` or `TIMEOUT`**, for the same reason as an unknown check: once a repo has opted in, a walk that couldn't run is unverified, not absent.
- **Never install anything** to make the walkthrough run — not playwright, not a browser, not on a prompt. A missing dependency is a statement about what the repo chose, or a condition to report. **Never write inside the repo**: journeys, screenshots and video live in the temp run directory and leave with it, so the working tree is unchanged whatever the verdict.
- **Reset staging only on a failed walk**, and always before the retry. A passing walk leaves its data where it is.
- **Merge worktree-safely:** `gh pr merge --squash` then `git push origin --delete`, never `--delete-branch`.
- No GitHub summary issue and no docs distillation — the archived spec is the record; `/dream` handles the wiki.
