---
name: continue
description: Resume an OpenSpec change and implement it. Use whenever you want to continue, resume, or pick up work on a change — by change name (which is also the branch name), PR number, or from the openspec list menu when given no argument. Checks out the branch, loads the change's proposal/specs/tasks as context, then runs /opsx:apply to implement. Accepts an optional instruction after the reference to steer what gets done. Pairs with /save.
user-invocable: true
---

# /continue

Resume a change and build it. The plan lives in `openspec/changes/<name>/` — `/continue` loads it and runs OpenSpec's **apply** step. This is WongStack's `/continue` (resume a change on any machine, then implement), *not* an OpenSpec spec-drafting command.

```
/explore ─▶ /plan ─▶ /continue ─▶ /save ─▶ /ship
```

**Repo is whatever `gh` resolves in the current directory — never hardcode owner/repo.** By convention **branch name = change name**.

### 1. Parse `/continue [handle] [instruction]`

- **First token** = the handle: a **change name**, a **PR number**, or empty.
- **Anything after** = an explicit instruction that steers step 4 (e.g. `/continue add-auth rebase onto main first`), overriding the default "work the tasks". A bare handle is normal.
- **No handle** → run `openspec list` and let the user pick from active changes (use the AskUserQuestion tool). Don't guess.

### 2. Resolve the change + branch

- **Change name** (matches `openspec/changes/<name>/` or an `openspec list` entry) → branch = that name.
- **PR number** → branch = `gh pr view <N> --json headRefName --jq .headRefName`; the change name is that branch.
- **Bare number that matches *both* a PR and an `openspec list` index** → ambiguous; ask which they mean before proceeding.

### 3. Check out the branch

```bash
git rev-parse --abbrev-ref HEAD     # where am I
git status --porcelain              # clean?
git fetch origin                    # a handed-off branch may exist only on the remote
```
- Clean → `git checkout <name>` (git creates a local branch tracking `origin/<name>` when it only exists on the remote — this is the fresh-clone handoff case), or `gh pr checkout <N>` which fetches too.
- In a worktree the same branch can't be checked out twice — if checkout fails because it's active in another worktree, say so and proceed read-only.
- Dirty tree → don't switch; surface it and ask. Branch doesn't exist anywhere (planned but never `/save`d) → stay on the current branch; `/save` will cut it.

### 4. Load context and apply (/opsx:apply)

Give a tight recap first: **the change** (2–4 lines — what it is + where the tasks stand) and **state** (branch + PR as clickable markdown links). Read from `openspec/changes/<name>/` (or `openspec show <name>`) for the recap.

Then:
- **Explicit instruction given** → do that (the change is the backdrop).
- **Otherwise** → **invoke the `openspec-apply-change` skill** (via the Skill tool) for `<name>`. That skill is OpenSpec's `/opsx:apply`: it reads the proposal/specs/design/tasks and works the task list, checking off `- [ ]` → `- [x]` as it goes.

To checkpoint, `/save` (syncs specs + pushes + preview). When every task is done, `/ship` (merges + archives).
