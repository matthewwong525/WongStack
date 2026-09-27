# Prose-only save

Load only when every changed path, rename sources included, is under `wiki/`, or the session produced only context to capture. Any other path, an archive included, returns the whole save to the normal route. Route by exact path prefix, never extension, and never split a mixed save ([the prose allowlist](../../../../wiki/development/the-change-loop.md#the-prose-allowlist)).

A conversation alone gets facts under a topic slug, not an empty OpenSpec change. A to-do that changed no repo file gets one `thread` fact — what is done, what is next, any blocker — so `/continue` can resume it. A facts-only save makes no commit: report the facts in one line and stop. Save's capture rules and [credential exclusion](../SKILL.md#1-protect-credentials-and-select-the-route) apply before committing.

Stage only the prose paths this save changed; recheck each before commit. Commit with `docs: <topic>` and the usual trailer, then push to the default branch:

```bash
git status --porcelain
git commit -F "$COMMIT_MESSAGE_FILE"
git push origin HEAD:main
```

Substitute the resolved default branch. The pushed commits must hold only this prose; a feature branch with other commits cannot go direct. Never switch a dirty checkout or overwrite another worktree to make the route fit.

A push rejected by protection, required review, or non-fast-forward is never forced or retried: report the error, keep the work, branch for the prose topic when needed, and take save's normal PR and gate. Its body describes the prose; no OpenSpec change or change-body renderer applies. A branch holding unrelated work needs selection before staging or publication.

After a direct push, skip PR, preview, and CI. Report the paths and the default-branch commit in two lines, omitting PR/CI/preview sections and any /ship suggestion. Save never merges the fallback PR.
