# Open-source surface

**Status:** ready-to-ship
**Branch:** plan-aot-opensource
**Open questions:** none

## Why

A stranger who lands on the repository today sees problems before any code runs. About 70 doc links return 404 on github.com, because they go through the `.claude` symlink. `SECURITY.md` points to a reporting channel that is turned off. "CI is the gate" is not enforced on `main`. There are no tags or releases, no CONTRIBUTING file that GitHub finds, and no issue or PR templates. The README never says what problem WongStack solves. This change makes the public surface match what the repo already claims, and releases the work as 19.0.0.

## What Changes

- **Doc links resolve on github.com.** Markdown links point at the real `.agents/` paths. Shell commands can keep `.claude/`. The link checker fails on any Markdown link that passes through a symlink, so the bug cannot return.
- **The README leads with the problem.**
  - The first screen says what goes wrong without WongStack: agents forget decisions between sessions, and process lives in chat. It then says what WongStack does about it.
  - It adds badges (CI, license, version) and a screenshot of a `review.html` page.
  - A short comparison with a plain `AGENTS.md`, OpenSpec alone, and GitHub Spec Kit.
  - A repository layout table that names every top-level folder and file.
  - Correct prerequisites: Node, `curl`, the OpenSpec install command, and `core.symlinks` on Windows. The Cursor claim is qualified.
  - One line on why Cloudflare is required (memory and hosting), with a link to `SECURITY.md`.
  - "Fork first" for working from the source.
  - The novice glossary moves to the wiki. Paseo is linked as optional. (review.html#/readme)
- **Community files exist.**
  - `.github/CONTRIBUTING.md`: how to run the tests and payload checks, and why a fork PR gets no preview.
  - `CODE_OF_CONDUCT.md` (Contributor Covenant 2.1).
  - Issue templates for bug, feature, and a `config.yml` that sends security reports to the private advisory form.
  - A PR template with the VERSION and CHANGELOG checklist, and `CODEOWNERS`.
- **Repository hygiene.**
  - `.gitattributes` keeps LF endings for scripts on Windows, and `.editorconfig` sets the basics.
  - `dependabot.yml` covers `npm` in `app/` and GitHub Actions.
  - Workflow actions are pinned to commit SHAs, and each job has `timeout-minutes`.
  - Production deploys run in a `production` environment limited to `main`.
- **No private names in live files.** Examples and tests that name ClaymooApp or `wongstack-cloud` use generic names. The archive and changelog keep their record.
- **GitHub settings match the docs.** The agent shows each setting, then applies it with `gh`.
  - Private vulnerability reporting, secret scanning with push protection, and Dependabot alerts and security updates are turned on.
  - A ruleset on `main` requires the Test and Payload checks and blocks force-push and deletion. It gives the owner a bypass for prose saved straight to `main`.
  - Squash merges only, and head branches are deleted after a merge.
  - A third-person description that states the problem, plus topics and a homepage. (review.html#/settings)
- **Release 19.0.0.** `VERSION` and a `CHANGELOG.md` entry cover all three changes and state that installs from before this release must be set up again. After the merge, the commit is tagged `v19.0.0`, and a GitHub Release carries the changelog entry. Later releases do the same.

**Non-goals:** No back-tagging of the 92 earlier versions. No GIF or video. No change to how setup works without Cloudflare: Cloudflare stays required. No rewrite of `CHANGELOG.md` history or the archive.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `open-source-release`: Community files, a problem-first README with correct prerequisites, GitHub settings that enforce the documented gate, doc links that resolve on github.com, no private names in live files, and a tagged release.
- `payload-checks`: The link checker rejects Markdown links through a symlink.
- `ci-tests`: Workflows pin actions to SHAs, set job timeouts, and read Node from `.nvmrc`. Dependabot proposes updates.

## Impact

- **Root:** `README.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, `.gitattributes`, `.editorconfig`, `VERSION`, `CHANGELOG.md`, and `AGENTS.md` (links only).
- **`.github/`:** `CONTRIBUTING.md`, `ISSUE_TEMPLATE/`, `PULL_REQUEST_TEMPLATE.md`, `CODEOWNERS`, `dependabot.yml`, and `workflows/*.yml`.
- **Links:** every live Markdown file that links through `.claude/`, in `wiki/`, `AGENTS.md`, `.agents/`, and the README. `wiki/development/repo-layout.md` gets the new rationale.
- **Code and tests:** `scripts/check-payload-links.mjs`, `.agents/skills/routine/scripts/routine.mjs`, `scripts/tests/routine.test.mjs`, `scripts/tests/downstream-contract.test.mjs`, and the `downstream-contract` spec's Purpose.
- **GitHub (outside the repo):** repository settings, a ruleset, a `production` environment, the `v19.0.0` tag, and a release.

## Decision log

- **2026-09-25** — Asked whether the agent applies GitHub settings → chose **apply via gh**, with each setting shown before it is applied.
- **2026-09-25** — Asked the delivery shape → **several changes, one PR**. This change applies last and carries the one 19.0.0 release entry for all three.
- **2026-09-25** — Asked whether Cloudflare stays mandatory → mandatory, because memory needs it. The README says why and links `SECURITY.md`, instead of offering a Cloudflare-free path.
- **2026-09-25** — Asked how far the fresh-repo reset goes → **remove legacy code only**. The changelog and archive keep their private names, because they are the record.
- **2026-09-25** — Assumed: tag `v19.0.0` and create a GitHub Release from now on, with no back-tagging. Old versions have no release commit on record that is easy to verify.
- **2026-09-25** — Assumed: a `review.html` screenshot, not a GIF. A screenshot can be regenerated from any change, and a GIF goes stale.
- **2026-09-25** — Assumed: CONTRIBUTING lives in `.github/`, so GitHub detects it and the root stays short. It links `wiki/contributing.md` for the payload release ritual, and does not copy it.
- **2026-09-25** — Assumed: the ruleset gives the repository owner a bypass. "Prose goes straight to `main`" needs a direct push, and a rule without a bypass would block it.
- **2026-09-25** — Assumed: Contributor Covenant 2.1 for the code of conduct, with the security advisory form as the contact, because no public email is listed.
- **2026-09-25** — Assumed: the README keeps the command table and "Learn more". "Where the knowledge lives" folds into the layout table, because both name the same surfaces. The review wireframe leaves those three sections out, and this entry is the owner of that choice.
- **2026-09-25** — Assumed: the homepage is the wiki hub on github.com (`/tree/main/wiki`), because WongStack has no site. It is shown for approval with the other settings.
- **2026-09-26** — Asked the user to approve the settings table → **apply all**. Applied with `gh api` and read back. Old values, for rollback:
  - Private vulnerability reporting, vulnerability alerts, automated security fixes, secret scanning, and push protection were all off.
  - Merge commits, rebase merges, and squash merges were all allowed, and `delete_branch_on_merge` was `false`.
  - The description was "My harness for building a collaborative AI knowledge center". There were no topics, and the homepage was `null`.
  - There were no rulesets. Ruleset `main` (id 24044041) was added, and `DELETE repos/:owner/:repo/rulesets/24044041` removes it.
  - Only a `staging` environment existed. A `production` environment was added, deployable from `main` only.
- **2026-09-26** — Changed during apply: the private-name test exempts all of `openspec/changes/`, not only the archive, because an active change names private repos to describe its task. The spec line now says the same. `dependabot.yml` is meta-only and not in the payload. Installed repos get the SHA pins through `/wong-sync`, and the changelog says so.
- **2026-09-26** — Changed during apply: two shipped pages keep a `CLAUDE.md` link (`.agents/rules/wiki.md` and `wiki/agent-knowledge-center.md`), because an install has a real `CLAUDE.md` and no `AGENTS.md`. The link checker allows a link to a file that installs receive as a real file. On github.com in this repo, those two links open the symlink page. The link sweep repointed 66 links in 15 files. The checker now reads symlinks from the tree, the index, and the working tree.
- **2026-09-26** — Changed during apply: `deploy.yml` sets the `production` environment on the `build` job only for a push to the default branch, so the `build` check name and fork behavior stay the same. Actions are pinned to `actions/checkout` v4.4.0 and `actions/setup-node` v4.4.0 by SHA.
- **2026-09-26** — The release ritual in `wiki/contributing.md` now tags the merge commit and publishes a GitHub Release. `/ship` runs those commands for 19.0.0 right after the squash merge and reports the release URL.
- **2026-09-26** — Changed during apply: the README comparison was checked on 2026-09-26 against the OpenSpec and Spec Kit READMEs and agents.md, and its header links each source. Spec Kit's `.specify/memory/` holds a constitution, not session facts, so the table says "No" for facts kept between sessions. The screenshot uses the archived `add-memory-store` review, because `add-paseo-routines` names a private repo. `app/wrangler.jsonc` holds no account ID, so `SECURITY.md` names only `.agents/.wong-stack.json`. "Work from the source" forks with `gh repo fork … --clone`, and memory stays off in a fork.
- **2026-09-26** — Distilled facts before the archive: no reusable fact. The one feedback fact (#147) is about briefing audit subagents, not about WongStack process.
- **2026-09-26** — Archived after CI passed on PR #105 (`2b82958`), with the deltas already reconciled into `openspec/specs/`, so the archive used `--skip-specs`.
