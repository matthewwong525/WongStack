# Prose-only save

Load only when every changed path is under `notes/` or `wiki/`, or the session produced only context to capture. An archive or any other changed path takes the normal route. Routing is by exact path prefix, never extension; do not split a mixed save. The [change loop](../../../../wiki/development/the-change-loop.md#the-prose-allowlist) owns this exception.

A conversation alone gets a topic-named note, not an empty OpenSpec change. Wiki-only work needs no note unless it adds context beyond the diff. If nothing was learned, decided, or changed, report that and stop. Follow the main save procedure's capture and credential-exclusion rules before committing.

Stage only the specific prose paths this save changed. Recheck every staged path before commit. Anything outside the allowlist returns the whole save to the normal route. Commit with `notes: <topic>` for notes alone or `docs: <topic>` for wiki or mixed prose, using the usual commit trailer. Push to the default branch:

```bash
git status --porcelain
git commit -F "$COMMIT_MESSAGE_FILE"
git push origin HEAD:main
```

Substitute the resolved default branch. Ensure the commits being pushed contain only this allowed prose; a feature branch with other commits cannot use the direct route. Do not switch a dirty checkout or overwrite another worktree to make the route fit.

If the push is rejected by protection, required review, or non-fast-forward state, do not force or retry that push. Report the actual error, retain the work, create a feature branch for the prose topic when needed, and use save's normal PR/gate procedure. The body describes the prose; no empty OpenSpec change is required and the change-body renderer does not apply. A branch containing unrelated work requires selection before staging or publication.

After a successful direct push, skip PR, preview, and CI waiting. Report the named paths and commit on the default branch in two lines. Do not report absent PR/CI/preview sections or suggest /ship. Save never merges the fallback PR.
