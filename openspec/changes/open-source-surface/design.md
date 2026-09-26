## Context

See [proposal.md](proposal.md) for why. The [README wireframe](review.html#/readme) shows the new first screen, and [the settings table](review.html#/settings) shows each GitHub setting, today and after. The facts that shape the approach:

- GitHub's web view returns 404 for `blob/main/.claude/...` and 200 for `blob/main/.agents/...`. `wiki/development/repo-layout.md:21-22` says the docs cite `.claude/` on purpose, because that was the target path. Since 18.0.0, targets also have a real `.agents/` folder, so that reason no longer holds.
- `scripts/check-payload-links.mjs` resolves links on the file system, where the symlink works. It needs the git tree (`git ls-tree`, mode `120000`) to see a link.
- The three workflows run their jobs on `push`, and on `pull_request` only from forks. Their check names are `test`, `payload`, and `build`. The `build` job on a fork falls back to a check-only build with no secret.
- `gh api repos/:owner/:repo/private-vulnerability-reporting` returns `enabled: false`. There are no rulesets, no branch protection, and no tags or releases.

## Goals / Non-Goals

**Goals:**
- Every claim in the README, `SECURITY.md`, and `AGENTS.md` is true of the live repository.
- Every new rule has a check, so it cannot regress unnoticed: the symlink link check, the private-name grep test, and the ruleset.

**Non-Goals:**
- No docs site or GitHub Pages. The README and wiki render on github.com.
- No change to the workflow logic beyond pins, timeouts, the Node file, and the production environment.

## Decisions

### Links name `.agents/`; commands keep `.claude/`

Markdown links (`[text](path)`) point at `.agents/...`. Code spans and shell commands keep `.claude/...`, because Claude Code resolves that path in every install and the hooks use it. The link checker walks `git ls-tree -r HEAD`, records each symlink path, and fails on a link whose resolved path starts with one. It prints the real path to use. `repo-layout.md` states the new rule and its reason.

*Alternative:* replace the `.claude` link with a real folder. Rejected: 18.0.0 chose one real `.agents/` folder so that Codex and Claude read the same files.

### Settings are applied by one reviewed script run, not by hand clicks

The apply task runs a sequence of `gh api` calls. It first prints each current value and the new value, and waits for the user's approval before it applies anything. The ruleset requires the `test` and `payload` checks. It adds a `pull_request` rule and a `RepositoryRole` admin bypass, so prose can still go straight to `main`. `build` is not required, because a fork PR's `build` is only a check-only build.

*Alternative:* commit a settings file (for example, Probot settings). Rejected: that needs an app installed on the repository, and it would be a second source of truth.

### Pin by SHA with a version comment

Each `uses:` becomes `owner/action@<40-char sha> # vX.Y.Z`, resolved with `gh api repos/<owner>/<action>/git/ref/tags/<tag>`. Dependabot's `github-actions` ecosystem keeps both the SHA and the comment up to date.

### The release is tagged after the merge

`/ship` merges the one PR. Then the agent tags the merge commit `v19.0.0` and runs `gh release create v19.0.0 --notes-file <entry>`, with the 19.0.0 section of `CHANGELOG.md` as the notes. `wiki/contributing.md` adds this step to the release ritual, so later releases do the same.

### A private-name guard

A test in `scripts/tests/` fails when a tracked file outside `openspec/changes/archive/` and `CHANGELOG.md` matches the private-name list. The list lives in the test only.

## Risks / Trade-offs

- [An admin bypass weakens the gate] → The bypass is for the owner's prose saves. Every other path needs green checks. GitHub records each bypass.
- [SHA pins go stale] → Dependabot proposes updates weekly.
- [A required check name changes when a workflow is renamed] → The contributing guide says the ruleset names `test` and `payload`. The ruleset shows a pending required check, so a rename fails loudly, not silently.

## Migration Plan

Apply the repo settings after the PR is green and before the merge, so the ruleset gates this PR itself. Roll back a setting with the same `gh api` call and its old value, which the apply task prints first.
