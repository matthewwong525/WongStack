## 1. The ship runbook

- [x] 1.1 Add **Step 6 — sync the durable checkout** to `.claude/skills/ship/SKILL.md`, after the merge step and before the report, carrying the fetch/prune, the `git worktree list --porcelain` scan, the clean-tree precondition, the `merge --ff-only origin/main` branch and the `git fetch origin main:main` branch, per design.md — Decisions.
- [x] 1.2 State in that step that any obstacle skips with a one-line reason and never fails the ship, and that nothing is checked out, switched, stashed, reset, or deleted.
- [x] 1.3 Renumber the report step to **Step 7** and add its **Synced** bullet — the checkout that advanced, or the reason it was skipped.
- [x] 1.4 Add the matching hard rule: the post-merge sync is fast-forward only, never a gate, and never deletes a local branch.
- [x] 1.5 Update the `/ship` description in the skill frontmatter so it names the post-merge sync.
- [x] 1.6 Re-read the whole edited runbook for coherence — no step number, cross-reference, or "Step N" mention left pointing at the old numbering.

## 2. Release ritual

- [x] 2.1 Bump `VERSION` to `12.5.0`.
- [x] 2.2 Add the newest-first `CHANGELOG.md` entry for 12.5.0.
- [x] 2.3 Run `node scripts/check-payload-links.mjs` and confirm it reports no dead links.
