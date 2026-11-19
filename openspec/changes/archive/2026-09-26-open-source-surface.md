<!-- openspec-archive v1 2026-09-26-open-source-surface -->
<!-- file proposal.md utf8 10091 -->
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

<!-- end proposal.md -->
<!-- file design.md utf8 4280 -->
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

<!-- end design.md -->
<!-- file tasks.md utf8 5115 -->
## 1. Links

- [x] 1.1 Extend `scripts/check-payload-links.mjs`: read symlink paths from `git ls-tree -r HEAD`, and fail on a Markdown link that passes through one, naming the real path. Skip code spans and fenced code. Add negative-case tests (a link through `.claude/` fails, a command in a code span passes).
- [x] 1.2 Repoint every live Markdown link from `.claude/...` to `.agents/...` in `wiki/`, `AGENTS.md`, `.agents/`, `README.md`, and `CHANGELOG.md`'s newest entry only. Update `wiki/development/repo-layout.md` with the rule and its reason, and name all three links (`.claude`, `.codex`, `CLAUDE.md`).

## 2. README and root docs

- [x] 2.1 Rewrite `README.md` to the order in review.html#/readme. The first screen states the problem and what WongStack does. Add badges, the comparison table, the layout table, and correct requirements (Node, `curl`, `npm install -g @fission-ai/openspec@1.8.0`, `git config core.symlinks true` on Windows). Say why Cloudflare is required and link `SECURITY.md`. Use "fork first" in the source section. Qualify the Cursor claim, and link Paseo as optional. Move the glossary to `wiki/README.md` or a linked page. Keep the command table and "Learn more", and fold "Where the knowledge lives" into the layout table. Check each comparison cell against the current OpenSpec and Spec Kit docs before you write it, and link the sources. Follow `wiki/voice.md`.
- [x] 2.2 Generate the screenshot: build a `review.html` from an archived change, capture it with `agent-browser` at desktop width, and commit it as `wiki/assets/review-page.png`. Reference it from the README.
- [x] 2.3 `SECURITY.md`: say that the Cloudflare account ID in `.agents/.wong-stack.json` is an identifier, not a secret.

## 3. Community files

- [x] 3.1 Add `.github/CONTRIBUTING.md`. Cover the issue first, then the fork, then the tests (`node --test scripts/tests/*.test.mjs`, the payload checks, `npm test` in `app/`), and say that a fork PR gets no preview. Link `wiki/contributing.md` for the release ritual.
- [x] 3.2 Add `CODE_OF_CONDUCT.md` (Contributor Covenant 2.1, with the advisory form as the contact). Add `.github/ISSUE_TEMPLATE/{bug.yml,feature.yml,config.yml}` (`config.yml` links the security advisory form and turns off blank issues), `.github/PULL_REQUEST_TEMPLATE.md` with the VERSION and CHANGELOG checklist, and `.github/CODEOWNERS`.
- [x] 3.3 Add `.gitattributes` (`* text=auto eol=lf`) and `.editorconfig`.

## 4. CI

- [x] 4.1 Pin every `uses:` in `.github/workflows/*.yml` to a commit SHA with a version comment. Add `timeout-minutes` to each job (15 for `test` and `payload`, 20 for `build`).
- [x] 4.2 Add `.github/dependabot.yml` for `npm` in `/app` and `github-actions` in `/`, weekly.
- [x] 4.3 Run `deploy.yml`'s production job in a `production` environment. Create the environment with a deployment-branch policy limited to `main` (applied with the settings in 6.1).

## 5. Private names

- [x] 5.1 Replace ClaymooApp in `routine.mjs:95` and `routine.test.mjs:134` with a generic name. Replace `wongstack-cloud` in `downstream-contract.test.mjs` with "hosted setups", and fix the `downstream-contract` Purpose in `openspec/specs/downstream-contract/spec.md`.
- [x] 5.2 Add `scripts/tests/private-names.test.mjs`. It fails on a private name in a tracked file outside `openspec/changes/archive/` and `CHANGELOG.md`.

## 6. GitHub settings

- [x] 6.1 Print each current value and its new value (review.html#/settings), and ask the user to approve before anything is applied. Then, with `gh api`: turn on private vulnerability reporting, secret scanning and push protection, and vulnerability alerts and automated security fixes. Set squash-only merges and `delete_branch_on_merge`. Set the description, topics, and homepage. Create the `production` environment for `main`. Create the `main` ruleset (required checks `test` and `payload`, a pull request rule, block force-push and deletion, and an admin bypass). Record each old value in the Decision log for rollback.
- [x] 6.2 Read each setting back and confirm it. Open the `SECURITY.md` advisory link and confirm that the form loads.

## 7. Release

- [x] 7.1 Bump `VERSION` to 19.0.0. Add one newest-first `CHANGELOG.md` entry that covers `harden-edge-cases`, `trim-legacy-and-restatement`, and this change, and state that installs from before 19.0.0 must be set up again in an empty folder. Add the tag-and-release step to the release ritual in `wiki/contributing.md`.
- [x] 7.2 Run `node scripts/check-payload-links.mjs`, `node scripts/check-openspec-config.mjs`, and `node scripts/measure-context.mjs --check`, and fix any failure.
- [x] 7.3 Run `/save` so CI runs every suite on the one PR. The task is done when CI passes.
- [x] 7.4 Write the post-merge release commands into the release ritual in `wiki/contributing.md` (`git tag v<VERSION> <merge-sha>`, `git push origin v<VERSION>`, and `gh release create v<VERSION> --notes-file <entry>`). Record in the Decision log that `/ship` runs them for 19.0.0 right after the squash merge and reports the release URL. The tag cannot exist before the merge commit does.

<!-- end tasks.md -->
<!-- file specs/ci-tests/spec.md utf8 721 -->
## ADDED Requirements

### Requirement: Workflows are pinned, bounded, and kept current

Every workflow step that uses an action SHALL pin it to a full commit SHA with the version in a comment. Every job SHALL set `timeout-minutes`. Workflows SHALL read the Node version from `.nvmrc`. A Dependabot configuration SHALL propose updates for the app's npm dependencies and for GitHub Actions.

#### Scenario: A tag is moved upstream

- **WHEN** an action's `v4` tag is moved to a new commit
- **THEN** the workflows keep running the pinned commit until a Dependabot PR updates it

#### Scenario: A step hangs

- **WHEN** a browser install hangs in CI
- **THEN** the job stops at its timeout instead of running for six hours

<!-- end specs/ci-tests/spec.md -->
<!-- file specs/open-source-release/spec.md utf8 4162 -->
## ADDED Requirements

### Requirement: The repository carries the community files GitHub detects

The repository SHALL contain a contributing guide, a code of conduct, issue templates, a pull request template, and a code owners file, each at a path GitHub's community profile detects. The contributing guide SHALL say how to run the test suite and the payload checks, and SHALL say that a pull request from a fork gets a build check but no preview deploy. The issue template configuration SHALL send security reports to the private advisory form. The pull request template SHALL include the VERSION and CHANGELOG checklist for payload changes.

#### Scenario: A first-time contributor opens an issue

- **WHEN** a reader selects "New issue" on GitHub
- **THEN** they choose a bug or feature template, and the security option opens the private advisory form

#### Scenario: A fork opens a pull request

- **WHEN** an outside contributor reads the contributing guide before opening a PR from a fork
- **THEN** it tells them that no preview URL appears on their PR and why

### Requirement: The README states the problem, the requirements, and the layout

The README's first screen SHALL state the problem WongStack solves and what it does about it before any install step. The README SHALL list every tool that setup needs, including Node, `curl`, the OpenSpec install command, and the Windows symlink setting. It SHALL say why Cloudflare is required and link `SECURITY.md`. It SHALL name every top-level folder and file of the repository with its purpose. Working from the source SHALL start with a fork.

#### Scenario: A reader checks prerequisites

- **WHEN** a reader follows the README's requirements list on a new Windows machine
- **THEN** the list names every tool setup calls, and the symlink setting that the skills need

#### Scenario: A reader asks what a folder is for

- **WHEN** a reader sees `schema/` or `paseo.json` at the repository root
- **THEN** the README's layout table says what it is

### Requirement: GitHub settings enforce the documented gate

The default branch SHALL be protected by a ruleset that requires the test and payload checks to pass and blocks force-push and deletion. The repository owner SHALL be able to bypass it for prose saved straight to the default branch. Private vulnerability reporting, secret scanning, push protection, and Dependabot alerts SHALL be on. Only squash merges SHALL be allowed, and head branches SHALL be deleted after a merge. The agent SHALL show each setting to the user before it applies it.

#### Scenario: A red PR cannot merge

- **WHEN** a PR's required checks fail
- **THEN** GitHub refuses the merge

#### Scenario: A reporter follows SECURITY.md

- **WHEN** a reader opens the private vulnerability reporting link in `SECURITY.md`
- **THEN** GitHub shows the report form

### Requirement: Markdown links resolve on github.com

No live Markdown link SHALL pass through a symbolic link, because GitHub's web view does not follow a directory link. Links SHALL name the real path.

#### Scenario: A reader clicks a skill link in the wiki

- **WHEN** a reader clicks a link to a skill from a wiki page on github.com
- **THEN** GitHub opens the file, not a 404 page

### Requirement: Live files carry no private names

No tracked file outside `openspec/changes/` and `CHANGELOG.md` SHALL name a private downstream repository or service. Change folders are exempt because an active change may name a private repository to describe its task, and it becomes part of the archive when it ships. Examples and tests SHALL use generic names.

#### Scenario: A reader searches the code

- **WHEN** a reader searches the live files for a private downstream name
- **THEN** there is no match outside the change folders and the changelog

### Requirement: Each release is tagged

Each release SHALL be tagged `v<VERSION>` on its merge commit, and SHALL have a GitHub Release whose body is its changelog entry.

#### Scenario: A user pins a version

- **WHEN** a user looks for release 19.0.0
- **THEN** the tag `v19.0.0` and its GitHub Release exist, and the release body is the 19.0.0 changelog entry

<!-- end specs/open-source-release/spec.md -->
<!-- file specs/payload-checks/spec.md utf8 718 -->
## ADDED Requirements

### Requirement: The link check rejects links through a symlink

The payload link check SHALL fail when a live Markdown link's path passes through a symbolic link in the git tree. The failure SHALL name the file, the link, and the real path to use. Code spans and shell commands SHALL NOT be checked by this rule.

#### Scenario: A wiki page links through `.claude/`

- **WHEN** a wiki page links `../.claude/skills/save/SKILL.md`
- **THEN** the link check fails and names `.agents/skills/save/SKILL.md` as the path to use

#### Scenario: A command names `.claude/`

- **WHEN** a skill's shell command runs `.claude/skills/memory/scripts/memory.mjs`
- **THEN** the link check does not report it

<!-- end specs/payload-checks/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-09-25

~~~
<!-- end .openspec.yaml -->
<!-- file review-visuals.html utf8 11995 fence=~~~ -->
~~~html
<section class="visual screen" id="readme" data-kind="screen" data-title="README on GitHub" data-states="after today" data-state="after">
  <p class="caption">The repository home page on GitHub: the README's first screen and its section order, after this change and today.</p>
  <div class="frame">
    <div class="topbar">
      <div class="logo"></div>
      <div class="nav desktop-only"><span class="on">Code</span><span>Issues</span><span>Pull requests</span><span>Actions</span><span>Security</span></div>
      <span class="phone-only">☰</span>
    </div>
    <div class="body">
      <div class="state state-after">
        <p class="muted">README.md</p>
        <h1>WongStack</h1>
        <div class="row" data-target-id="after-badges">
          <span class="tag">CI: passing</span><span class="tag">License: MIT</span><span class="tag">Version: 19.0.0</span> <i class="callout">1</i>
        </div>
        <div class="box" data-target-id="after-problem">
          <p><b>Coding agents forget your decisions between sessions, and your process lives in chat.</b></p>
          <p>WongStack keeps the process, the plans, and the decisions in the repo, so each agent runs the same workflow and each change starts with more context. <i class="callout">2</i></p>
        </div>
        <div class="hero" data-target-id="after-screenshot"></div>
        <p class="muted">Screenshot: a <code>review.html</code> page from a real change. <i class="callout">3</i></p>

        <h2>Start here</h2>
        <div class="box" data-target-id="after-start">
          <p class="muted">Make an empty folder, open it in your coding agent, and paste:</p>
          <p><code>Read and follow …/.agents/skills/wong-setup/SKILL.md to install WongStack in this folder …</code></p>
          <span class="btn primary">Copy the prompt</span> <i class="callout">4</i>
        </div>

        <h2>What you get</h2>
        <div class="skeleton"></div><div class="skeleton s"></div><div class="skeleton"></div>

        <h2>How it compares</h2>
        <table class="desktop-only" data-target-id="after-compare">
          <thead><tr><th></th><th>Plain <code>AGENTS.md</code></th><th>OpenSpec alone</th><th>GitHub Spec Kit</th><th>WongStack</th></tr></thead>
          <tbody>
            <tr><td>Agent instructions in the repo</td><td>Yes</td><td>Yes</td><td>Yes</td><td>Yes</td></tr>
            <tr><td>Plan and shipped-spec records</td><td>No</td><td>Yes</td><td>Yes</td><td>Yes, through OpenSpec</td></tr>
            <tr><td>Save, PR, CI wait, and merge</td><td>No</td><td>No</td><td>Part</td><td>Yes</td></tr>
            <tr><td>Memory across sessions</td><td>No</td><td>No</td><td>No</td><td>Yes</td></tr>
            <tr><td>Preview per change</td><td>No</td><td>No</td><td>No</td><td>Yes, on Cloudflare</td></tr>
          </tbody>
        </table>
        <div class="phone-only">
          <dl class="kv"><dt>Plain <code>AGENTS.md</code></dt><dd>Instructions only</dd><dt>OpenSpec alone</dt><dd>Plans and specs</dd><dt>GitHub Spec Kit</dt><dd>Specs, part of the git steps</dd><dt>WongStack</dt><dd>All of these, plus memory and previews</dd></dl>
        </div>
        <p class="muted">Cell values are a draft. <i class="callout">5</i></p>

        <h2>Repository layout</h2>
        <table data-target-id="after-layout">
          <thead><tr><th>Path</th><th>Holds</th></tr></thead>
          <tbody>
            <tr><td><code>.agents/</code></td><td>Skills and path rules. <code>.claude</code> and <code>.codex</code> link here.</td></tr>
            <tr><td><code>.github/</code></td><td>Workflows, templates, CONTRIBUTING</td></tr>
            <tr><td><code>app/</code></td><td>The starter app</td></tr>
            <tr><td><code>openspec/</code></td><td>Active changes, specs, archive</td></tr>
            <tr><td><code>wiki/</code></td><td>Process and conventions</td></tr>
            <tr><td><code>schema/</code>, <code>scripts/</code></td><td>Memory schema, checks, tests</td></tr>
            <tr><td class="muted">Root files</td><td class="muted"><code>AGENTS.md</code>, <code>VERSION</code>, <code>CHANGELOG.md</code>, <code>SECURITY.md</code>, and the rest, one row each</td></tr>
          </tbody>
        </table>

        <h2>Requirements</h2>
        <dl class="kv" data-target-id="after-requirements">
          <dt>Coding agent</dt><dd>Claude Code or Codex. Cursor with limits, stated.</dd>
          <dt>Tools</dt><dd>Node.js, <code>curl</code>, <code>gh</code> (signed in), <code>git</code></dd>
          <dt>OpenSpec</dt><dd><code>npm install -g @fission-ai/openspec</code></dd>
          <dt>Windows</dt><dd><code>git config --global core.symlinks true</code></dd>
          <dt>Cloudflare</dt><dd>Required: memory and hosting run there. Links <code>SECURITY.md</code> for what each token can do. <i class="callout">6</i></dd>
          <dt>Paseo</dt><dd class="muted">Optional, for <code>/routine</code></dd>
        </dl>

        <h2>Work from the source</h2>
        <p>Fork first, then clone your fork. <i class="callout">7</i></p>

        <h2>License</h2>
        <p class="muted">MIT</p>
      </div>

      <div class="state state-today">
        <p class="muted">README.md</p>
        <h1>WongStack</h1>
        <p>WongStack turns a repo into an AI knowledge center.</p>
        <p class="muted">Agents need shared knowledge to do useful work. WongStack keeps a team's processes inside the repo …</p>
        <p class="muted">No badges. No screenshot. No line says what goes wrong without WongStack.</p>

        <h2>Start here</h2>
        <div class="box">
          <p class="muted">Empty folder, Claude Code, Codex, Cursor, or another agent. Paste:</p>
          <p><code>Read and follow …/wong-setup/SKILL.md …</code></p>
          <span class="btn primary">Copy the prompt</span>
        </div>
        <h2>What you get</h2>
        <div class="skeleton"></div><div class="skeleton s"></div>
        <h2>How the pieces fit</h2>
        <div class="skeleton s"></div>
        <h2>The workflow</h2>
        <div class="skeleton"></div><div class="skeleton"></div>
        <h2>Where the knowledge lives</h2>
        <div class="skeleton s"></div>
        <h2>A few terms the agent may introduce</h2>
        <div class="skeleton s"></div>
        <h2>Learn more</h2>
        <div class="skeleton s"></div>
        <h2>Requirements</h2>
        <dl class="kv">
          <dt>Tools</dt><dd><code>gh</code>, Node.js. No <code>curl</code>, no OpenSpec install command.</dd>
          <dt>Windows</dt><dd class="muted">Not named</dd>
          <dt>Cloudflare</dt><dd>Named, with no reason why it is required</dd>
        </dl>
        <h2>Prefer to work from the source?</h2>
        <p>Clone this repo.</p>
        <h2>License</h2>
        <p class="muted">MIT</p>
      </div>
    </div>
  </div>
  <div class="notes">
    <p class="brief"><b>Who / job:</b> a developer who lands on the repository from a link or a search, and decides in under a minute whether WongStack solves a problem they have. <b>Done:</b> they copy the setup prompt, or they know why WongStack is not for them. <b>Context:</b> GitHub on a desktop browser, drawn first; the phone view (toggle View: Phone) keeps the same order and folds the comparison table into a list. <b>Frequency:</b> once per visitor.</p>
    <ol>
      <li>Badges come first, so a visitor sees that CI passes, the license, and the version before they read. The version badge reads <code>VERSION</code>.</li>
      <li>The problem comes before the product. Today the first line names the product ("an AI knowledge center"); a visitor who does not know that term cannot tell if it is for them.</li>
      <li>One screenshot of a <code>review.html</code> page, not a GIF. It shows the output a user gets, and any change can make a new one.</li>
      <li>The copy prompt stays the one primary action. Nothing else on the first screen competes with it.</li>
      <li>The comparison is short and names each other tool fairly. The final cell text is for the README draft to decide; review the rows, not the words.</li>
      <li>Requirements say why Cloudflare is required and link <code>SECURITY.md</code>, instead of offering a path without Cloudflare.</li>
      <li>"Fork first" replaces "clone this repo": a visitor cannot push to this repository, and a fork PR is the way to send a change back.</li>
      <li>Not drawn: the workflow table, "Where the knowledge lives", and "Learn more". The plan does not say if they stay, move to the wiki, or shrink. "A few terms" moves to the wiki.</li>
    </ol>
  </div>
</section>

<section class="visual tree" id="settings" data-kind="tree">
  <p class="caption">GitHub repository settings: the value today → the value after. The agent shows each row to you, then applies it with <code>gh</code>. Nothing changes before you see it.</p>
  <div class="frame">
    <div class="label">Security</div>
    <ul>
      <li class="edit" data-target-id="set-pvr">Private vulnerability reporting: off → on <span class="why">the channel <code>SECURITY.md</code> names works <i class="callout">1</i></span></li>
      <li class="edit" data-target-id="set-secrets">Secret scanning and push protection: off → on <span class="why">a pushed token is stopped</span></li>
      <li class="edit" data-target-id="set-dependabot">Dependabot alerts and security updates: off → on <span class="why">pairs with the new <code>dependabot.yml</code></span></li>
    </ul>
    <div class="label">Ruleset on main</div>
    <ul>
      <li class="add" data-target-id="set-ruleset">Required checks: none → Test and Payload checks <span class="why">"CI is the gate" is enforced <i class="callout">2</i></span></li>
      <li class="add" data-target-id="set-force">Force-push and deletion: allowed → blocked</li>
      <li class="add" data-target-id="set-bypass">Bypass: none → repository owner only <span class="why">prose saves go straight to <code>main</code> <i class="callout">3</i></span></li>
    </ul>
    <div class="label">Pull requests</div>
    <ul>
      <li class="edit" data-target-id="set-merge">Merge methods: merge, rebase, squash → squash only <span class="why">matches what <code>/ship</code> does</span></li>
      <li class="edit" data-target-id="set-delete">Delete head branch after merge: off → on</li>
    </ul>
    <div class="label">About</div>
    <ul>
      <li class="edit" data-target-id="set-description">Description: "My harness for building a collaborative AI knowledge center" → a third-person line that states the problem <span class="why">search results quote it</span></li>
      <li class="add" data-target-id="set-topics">Topics: none → ai-agents, claude-code, codex, openspec, cloudflare-workers, developer-workflow</li>
      <li class="add" data-target-id="set-homepage">Homepage: empty → a link, shown for your approval <span class="why">value set when the agent shows it</span></li>
    </ul>
    <div class="label">Environments</div>
    <ul>
      <li class="add" data-target-id="set-env">production: none → deploys from <code>main</code> only <span class="why">a branch cannot deploy to production <i class="callout">4</i></span></li>
    </ul>
  </div>
  <div class="notes">
    <ol>
      <li>Today <code>SECURITY.md</code> points to a reporting form that is turned off. Turning it on makes the file true; the file does not change.</li>
      <li>The check names match the workflow names in <code>.github/workflows/</code>. A check that is renamed later must also be renamed here, or every PR waits for a check that never runs.</li>
      <li>Without an owner bypass, a wiki-only <code>/save</code> cannot push to <code>main</code>. The bypass is for the owner only; other people still go through a PR.</li>
      <li>The deploy workflow names the <code>production</code> environment, so the limit to <code>main</code> is enforced by GitHub, not only by the workflow's own branch filter.</li>
    </ol>
  </div>
</section>

~~~
<!-- end review-visuals.html -->
<!-- file review.html utf8 59087 fence=~~~ -->
~~~html
<!-- wong-review:2 -->
<!doctype html>
<!--
  WongStack review kit. The shared offline viewer lives here.
  Authors write review-visuals.html using review-author.md and review-examples.html.
  build-review.mjs fills the proposal and visual slots. Generated pages contain
  the viewer, so archives open without a server or adjacent source files.
-->

<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Review — 2026-09-26-open-source-surface</title>
<style>
  :root { --ink:#333; --line:#9a9a9a; --fill:#e9e9e9; --fill2:#f6f6f6; --note:#fff4c2; --mark:#1a73e8; --markbg:#eaf2fd; }
  * { box-sizing:border-box; }
  body { margin:0; font:14px/1.4 "Helvetica Neue", Arial, sans-serif; color:var(--ink); background:#d9d9d9; }
  a { color:inherit; }

  /* chrome: the reviewer's toolbar */
  .chrome { position:sticky; top:0; z-index:9; background:#222; color:#eee; padding:8px 14px; display:flex; gap:18px; align-items:center; flex-wrap:wrap; font-size:13px; min-height:41px; }
  .chrome b { font-weight:600; }
  .chrome .group { display:flex; gap:6px; align-items:center; }
  .chrome .group:empty { display:none; }
  .chrome button { font:inherit; padding:3px 9px; background:#444; color:#eee; border:1px solid #666; border-radius:3px; cursor:pointer; }
  .chrome button[aria-pressed="true"] { background:#eee; color:#222; }
  .chrome button.annotate[aria-pressed="true"] { background:var(--mark); color:#fff; border-color:var(--mark); }
  .chrome .hint { opacity:.7; margin-left:auto; }
  .chrome .tools { display:contents; }
  .chrome .tools-toggle { display:none; }

  /* layout: What Changes panel + stage */
  .layout { display:flex; align-items:flex-start; }
  .panel { flex:0 0 340px; position:sticky; top:41px; max-height:calc(100vh - 41px); overflow:auto; background:#fff; border-right:2px solid var(--line); padding:16px 18px; font-size:13px; }
  .panel h2 { font-size:11px; letter-spacing:.08em; text-transform:uppercase; color:#666; margin:18px 0 6px; }
  .panel h2:first-child { margin-top:0; }
  .panel p { margin:0 0 8px; }
  .panel ol.changes { margin:0; padding:0; list-style:none; counter-reset:c; }
  .panel ol.changes li { counter-increment:c; position:relative; margin:0 0 4px; padding:6px 8px 6px 30px; border:1px solid transparent; border-radius:3px; cursor:pointer; }
  .panel ol.changes li::before { content:counter(c); position:absolute; left:8px; top:7px; width:16px; height:16px; border-radius:50%; background:var(--fill); color:#666; font-size:10px; font-weight:700; display:flex; align-items:center; justify-content:center; }
  .panel ol.changes li:hover { background:var(--fill2); }
  .panel ol.changes li.on { border-color:var(--mark); background:var(--markbg); }
  .panel ol.changes li.on::before { background:var(--mark); color:#fff; }
  .panel ol.changes li .kind { display:block; font-size:11px; color:var(--mark); margin-top:2px; }
  .panel ol.changes li.dead .kind { color:#c00; }
  .panel ol.changes li.text .kind { color:#888; }
  .panel code { background:var(--fill); padding:0 3px; overflow-wrap:anywhere; }
  .panel .notes-list { margin:0; padding-left:18px; }
  .panel .notes-list li { margin:0 0 6px; cursor:pointer; }
  .panel .notes-list .where { color:#666; font-size:11px; display:block; }
  .panel .notes-list button { border:0; background:none; color:var(--ink); text-align:left; cursor:pointer; font:inherit; padding:0; }
  .panel .draft-list { margin:0; padding-left:18px; }
  .panel .draft-list li { margin:0 0 6px; }
  .panel .draft-list button { border:0; background:none; color:var(--ink); text-align:left; text-decoration:underline; cursor:pointer; font:inherit; padding:0; }
  .panel .draft-count { display:inline-block; margin-left:6px; padding:0 6px; border:1px solid var(--line); border-radius:12px; white-space:nowrap; }
  .panel .empty { color:#666; list-style:none; margin-left:-18px; }
  .stage { flex:1; min-width:0; }
  .item-header { max-width:960px; margin:24px auto 0; padding:20px 24px; background:#fff; border:2px solid var(--line); overflow-wrap:anywhere; }
  .item-header[hidden] { display:none; }
  .item-header h1 { margin:0; font-size:20px; scroll-margin-top:calc(var(--chrome-h, 41px) + 12px); }
  .item-header .position { margin:0 0 10px; color:#666; font-size:13px; }

  /* one visual at a time */
  .visual:not([data-active]) { display:none !important; }
  .visual[data-active] { display:block !important; }
  .frame { max-width:960px; margin:12px auto 24px; background:#fff; border:2px solid var(--line); box-shadow:0 2px 0 #bbb; overflow-wrap:anywhere; }
  .visual:not(.screen) .frame { padding:24px; }
  .caption { max-width:960px; margin:12px auto 0; font-size:12px; color:#666; }
  .caption + .frame { margin-top:6px; }
  .state { display:none; }
  .state[data-on] { display:block; }

  /* lo-fi screen primitives — the screen visual's vocabulary */
  .topbar { display:flex; align-items:center; gap:16px; padding:12px 20px; border-bottom:2px solid var(--line); background:var(--fill2); }
  .logo { width:34px; height:34px; border:2px solid var(--line); background:var(--fill); position:relative; }
  .logo::before, .logo::after { content:""; position:absolute; inset:0; background:linear-gradient(to top right, transparent 48%, var(--line) 48%, var(--line) 52%, transparent 52%); }
  .logo::after { transform:scaleX(-1); }
  .nav { display:flex; gap:14px; }
  .nav span { padding:4px 0; border-bottom:2px solid transparent; }
  .nav span.on { border-color:var(--ink); font-weight:600; }
  .body { padding:20px; }
  h1 { font-size:20px; margin:0; }
  .row { display:flex; gap:12px; align-items:center; }
  .row.between { justify-content:space-between; }
  .btn { display:inline-block; padding:7px 14px; border:2px solid var(--ink); border-radius:3px; background:#fff; cursor:pointer; user-select:none; }
  .btn.primary { background:var(--ink); color:#fff; }
  .btn.ghost { border-color:transparent; text-decoration:underline; }
  .input { display:inline-block; min-width:220px; padding:7px 10px; border:2px solid var(--line); border-radius:3px; background:#fff; color:#888; }
  table { width:100%; border-collapse:collapse; margin-top:16px; }
  th { text-align:left; font-size:12px; color:#666; border-bottom:2px solid var(--line); padding:8px 6px; }
  td { padding:10px 6px; border-bottom:1px solid #ddd; }
  tr.click { cursor:pointer; }
  .tag { display:inline-block; padding:1px 8px; border:1px solid var(--line); border-radius:10px; font-size:12px; }
  .box { border:2px dashed var(--line); background:var(--fill2); padding:30px; text-align:center; color:#666; margin-top:16px; }
  .skeleton { height:14px; background:var(--fill); margin:14px 0; width:70%; }
  .skeleton.s { width:40%; }
  .kv { display:grid; grid-template-columns:140px 1fr; gap:8px 12px; margin:16px 0; }
  .kv dt { color:#666; } .kv dd { margin:0; }
  .muted { color:#666; }
  .hero { height:120px; background:var(--fill); border:2px solid var(--line); position:relative; margin:12px 0; }
  .hero::before, .hero::after { content:""; position:absolute; inset:0; background:linear-gradient(to top right, transparent 49.5%, var(--line) 49.5%, var(--line) 50.5%, transparent 50.5%); }
  .hero::after { transform:scaleX(-1); }
  .callout { display:inline-flex; width:18px; height:18px; border-radius:50%; background:#c00; color:#fff; font-size:11px; font-weight:700; align-items:center; justify-content:center; vertical-align:middle; margin-left:6px; }
  .notes { max-width:960px; margin:0 auto 40px; background:var(--note); border:1px solid #d8c66a; padding:12px 18px; font-size:13px; }
  .notes ol { margin:6px 0 0; padding-left:20px; }
  .notes .brief { margin:0 0 6px; }

  /* flow: lanes of steps */
  .lane { display:flex; align-items:center; gap:10px; padding:10px 0; flex-wrap:wrap; }
  .lane + .lane { border-top:1px solid #ddd; }
  .lane .label { flex:0 0 70px; font-size:11px; text-transform:uppercase; letter-spacing:.06em; color:#666; }
  .lane.today .step { color:#777; border-style:dashed; }
  .step { padding:8px 12px; border:2px solid var(--line); border-radius:3px; background:var(--fill2); }
  .flow-sequence { max-width:720px; margin:0 auto; }
  .flow-card, .flow-branch { display:block; padding:14px; min-width:0; overflow-wrap:anywhere; border:2px solid var(--line); border-radius:3px; background:var(--fill2); }
  .flow-card h3, .flow-branch h3 { margin:0 0 7px; font-size:15px; }
  .flow-card p, .flow-branch p { margin:0; }
  .flow-card details, .flow-branch details { border-top:1px solid #d5d5d5; margin-top:11px; padding-top:9px; }
  .flow-card details p, .flow-branch details p { margin-top:8px; }
  .flow-connector { text-align:center; margin:10px 0; color:#666; font-weight:600; }
  .flow-branches { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr)); gap:12px; }
  .step.gone { text-decoration:line-through; color:#999; }
  .arrow { color:#999; }
  .arrow::before { content:"→"; }

  /* diff: before / after text */
  .diff { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:16px; }
  .diff > div > .label, .tree .label { font-size:11px; text-transform:uppercase; letter-spacing:.06em; color:#666; margin-bottom:6px; }
  .diff pre { margin:0; padding:10px 12px; background:var(--fill2); border:1px solid #ddd; font:12px/1.5 Menlo, Consolas, monospace; white-space:pre-wrap; overflow-wrap:anywhere; }
  .diff .line { display:block; }
  .diff .del { color:#999; text-decoration:line-through; }
  .diff .add { border-left:3px solid var(--mark); margin-left:-12px; padding-left:9px; background:var(--markbg); }

  /* tree: files touched */
  .tree ul { list-style:none; margin:0; padding:0; font:13px/1.8 Menlo, Consolas, monospace; }
  .tree li { padding-left:4px; }
  .tree li::before { display:inline-block; width:18px; color:#888; }
  .tree li.add::before { content:"+"; color:var(--mark); font-weight:700; }
  .tree li.edit::before { content:"~"; }
  .tree li.del::before { content:"−"; }
  .tree li.del { color:#999; text-decoration:line-through; }
  .tree li .why { color:#666; font:12px "Helvetica Neue", Arial, sans-serif; margin-left:10px; }

  /* text stage: a bullet with no visual, and the landing */
  .textstage h1 { font-size:22px; margin:0 0 12px; }
  .textstage p { font-size:16px; max-width:640px; }
  .textstage ol { font-size:15px; max-width:640px; padding-left:22px; }
  .textstage ol li { margin:0 0 6px; cursor:pointer; }
  .textstage ol li:hover { text-decoration:underline; }
  .textstage .muted { font-size:13px; }

  /* highlight: the mark named by the hash */
  .marked { outline:3px solid var(--mark); outline-offset:3px; box-shadow:0 0 0 6px var(--markbg); }
  tr.marked { outline-offset:0; }
  .diff .add.marked, .tree li.marked { outline-offset:0; box-shadow:none; }

  /* annotate */
  body.annotating .visual[data-active] .frame { cursor:crosshair; }
  .hovering { outline:2px dashed var(--mark); outline-offset:2px; }
  .pin { display:inline-flex; width:18px; height:18px; border-radius:3px; background:var(--mark); color:#fff; font-size:11px; font-weight:700; align-items:center; justify-content:center; vertical-align:middle; margin-left:6px; cursor:pointer; }
  .pin.stale { background:#999; }
  .popover { position:fixed; z-index:10; width:300px; background:#fff; border:2px solid var(--mark); border-radius:4px; padding:10px; box-shadow:0 4px 14px rgba(0,0,0,.25); font-size:13px; }
  .popover .where { color:#666; font-size:11px; margin-bottom:6px; word-break:break-word; }
  .popover textarea { width:100%; height:70px; font:inherit; padding:6px; border:1px solid var(--line); border-radius:3px; resize:vertical; }
  .popover .row { margin-top:8px; }
  .popover button { font:inherit; padding:4px 10px; border:1px solid var(--line); background:#fff; border-radius:3px; cursor:pointer; }
  .popover button.save { background:var(--mark); color:#fff; border-color:var(--mark); }
  .popover .del { margin-left:auto; color:#c00; }
  .popover .status { margin:8px 0 0; color:#666; }
  .storage-status { font-size:12px; color:#666; }
  .toast { position:fixed; bottom:16px; left:50%; transform:translateX(-50%); background:#222; color:#eee; padding:8px 14px; border-radius:3px; font-size:13px; z-index:11; opacity:0; transition:opacity .2s; pointer-events:none; }
  .toast.show { opacity:1; }
  #copybuf { position:fixed; left:-9999px; top:0; }
  .error { color:#c00; }

  /* chrome extras: step through changes, phone/desktop view, the panel toggle */
  .chrome .count { opacity:.8; min-width:44px; text-align:center; white-space:nowrap; }
  .chrome .menu { display:none; }
  .panel { top:var(--chrome-h, 41px); max-height:calc(100vh - var(--chrome-h, 41px)); }

  /* viewport: walk a screen at phone width from a desktop */
  body[data-viewport="phone"] .visual.screen .frame { max-width:390px; }
  body[data-viewport="phone"] .desktop-only, body[data-viewport="desktop"] .phone-only { display:none !important; }
  .visual.screen .body { min-width:0; overflow-wrap:anywhere; }

  /* phone: stage full width, the list is a sheet, the note box docks to the bottom */
  @media (max-width: 760px) {
    body { font-size:15px; }
    .chrome { display:grid; grid-template-columns:auto 1fr auto; gap:6px; padding:6px 8px; }
    .chrome > b, .chrome .hint, .chrome #viewport { display:none !important; }
    .chrome .menu, .chrome .tools-toggle { display:inline-block; }
    .chrome > .group { justify-content:center; gap:4px; }
    .chrome .tools { display:none; grid-column:1 / -1; min-width:0; }
    .chrome .tools.open { display:flex; flex-wrap:wrap; gap:8px; padding-top:6px; }
    .chrome .tools .group { flex-wrap:wrap; min-width:0; }
    .chrome .tools button { max-width:100%; overflow-wrap:anywhere; }
    .layout { display:block; }
    .panel { display:none; position:fixed; left:0; right:0; bottom:0; z-index:8; border-right:0; padding:14px 16px 40px; }
    body.menu .panel { display:block; }
    .panel ol.changes li { padding:10px 10px 10px 32px; }
    .frame { margin:12px 8px; }
    .item-header { margin:12px 8px 0; padding:14px; }
    .caption { margin:12px 8px 0; }
    .notes { margin:0 8px 24px; }
    .visual:not(.screen) .frame { padding:14px; }
    .body { padding:14px; }
    .diff { grid-template-columns:1fr; }
    .flow-branches { grid-template-columns:1fr; }
    .textstage p, .textstage ol { font-size:16px; }
    .popover { left:8px !important; right:8px; bottom:8px; top:auto !important; width:auto; }
    body.editor-open .stage { padding-bottom:240px; }
    .popover textarea { font-size:16px; height:90px; }
    .popover button { padding:8px 14px; }
    .chrome button { min-height:40px; min-width:40px; padding:6px 8px; }
  }
</style>
</head>
<body>

<div class="chrome">
  <b>Review · 2026-09-26-open-source-surface</b>
  <button class="menu" id="menu" aria-expanded="false" aria-controls="panel">Changes</button>
  <div class="group"><button id="prev" title="Previous change" aria-label="Previous change">‹</button><span class="count" id="count"></span><button id="next" title="Next change" aria-label="Next change">›</button></div>
  <button class="tools-toggle" id="tools-toggle" aria-expanded="false" aria-controls="tools">Tools</button>
  <div class="tools" id="tools">
  <div class="group" id="states"></div>
  <div class="group" id="viewport"><span>View:</span><button data-vp="desktop">Desktop</button><button data-vp="phone">Phone</button></div>
  <div class="group">
    <button class="annotate" id="annotate" aria-pressed="false">✎ Annotate</button>
    <button id="copy">Copy notes</button>
    <span class="storage-status" id="storage-status" hidden>Notes and drafts last for this session only.</span>
  </div>
  </div>
  <span class="hint">Click a change on the left. Grey = layout only. Blue = what changes. Red dots = reasoning below.</span>
</div>

<script type="text/markdown" id="proposal">
<!-- proposal:start -->
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
<!-- proposal:end -->
</script>

<div class="layout">
<aside class="panel" id="panel"></aside>
<div class="stage" id="stage">
<header class="item-header" id="item-header" hidden><p class="position" id="item-position"></p><h1 id="item-title" tabindex="-1"></h1></header>

<!-- short fallback for an empty proposal or an invalid direct link -->
<section class="visual textstage" id="_landing" data-kind="text">
  <div class="frame" id="landing"></div>
</section>

<!-- text stage for a bullet with no visual -->
<section class="visual textstage" id="_text" data-kind="text">
  <div class="frame" id="textframe"></div>
</section>

<section class="visual screen" id="readme" data-kind="screen" data-title="README on GitHub" data-states="after today" data-state="after">
  <p class="caption">The repository home page on GitHub: the README's first screen and its section order, after this change and today.</p>
  <div class="frame">
    <div class="topbar">
      <div class="logo"></div>
      <div class="nav desktop-only"><span class="on">Code</span><span>Issues</span><span>Pull requests</span><span>Actions</span><span>Security</span></div>
      <span class="phone-only">☰</span>
    </div>
    <div class="body">
      <div class="state state-after">
        <p class="muted">README.md</p>
        <h1>WongStack</h1>
        <div class="row" data-target-id="after-badges">
          <span class="tag">CI: passing</span><span class="tag">License: MIT</span><span class="tag">Version: 19.0.0</span> <i class="callout">1</i>
        </div>
        <div class="box" data-target-id="after-problem">
          <p><b>Coding agents forget your decisions between sessions, and your process lives in chat.</b></p>
          <p>WongStack keeps the process, the plans, and the decisions in the repo, so each agent runs the same workflow and each change starts with more context. <i class="callout">2</i></p>
        </div>
        <div class="hero" data-target-id="after-screenshot"></div>
        <p class="muted">Screenshot: a <code>review.html</code> page from a real change. <i class="callout">3</i></p>

        <h2>Start here</h2>
        <div class="box" data-target-id="after-start">
          <p class="muted">Make an empty folder, open it in your coding agent, and paste:</p>
          <p><code>Read and follow …/.agents/skills/wong-setup/SKILL.md to install WongStack in this folder …</code></p>
          <span class="btn primary">Copy the prompt</span> <i class="callout">4</i>
        </div>

        <h2>What you get</h2>
        <div class="skeleton"></div><div class="skeleton s"></div><div class="skeleton"></div>

        <h2>How it compares</h2>
        <table class="desktop-only" data-target-id="after-compare">
          <thead><tr><th></th><th>Plain <code>AGENTS.md</code></th><th>OpenSpec alone</th><th>GitHub Spec Kit</th><th>WongStack</th></tr></thead>
          <tbody>
            <tr><td>Agent instructions in the repo</td><td>Yes</td><td>Yes</td><td>Yes</td><td>Yes</td></tr>
            <tr><td>Plan and shipped-spec records</td><td>No</td><td>Yes</td><td>Yes</td><td>Yes, through OpenSpec</td></tr>
            <tr><td>Save, PR, CI wait, and merge</td><td>No</td><td>No</td><td>Part</td><td>Yes</td></tr>
            <tr><td>Memory across sessions</td><td>No</td><td>No</td><td>No</td><td>Yes</td></tr>
            <tr><td>Preview per change</td><td>No</td><td>No</td><td>No</td><td>Yes, on Cloudflare</td></tr>
          </tbody>
        </table>
        <div class="phone-only">
          <dl class="kv"><dt>Plain <code>AGENTS.md</code></dt><dd>Instructions only</dd><dt>OpenSpec alone</dt><dd>Plans and specs</dd><dt>GitHub Spec Kit</dt><dd>Specs, part of the git steps</dd><dt>WongStack</dt><dd>All of these, plus memory and previews</dd></dl>
        </div>
        <p class="muted">Cell values are a draft. <i class="callout">5</i></p>

        <h2>Repository layout</h2>
        <table data-target-id="after-layout">
          <thead><tr><th>Path</th><th>Holds</th></tr></thead>
          <tbody>
            <tr><td><code>.agents/</code></td><td>Skills and path rules. <code>.claude</code> and <code>.codex</code> link here.</td></tr>
            <tr><td><code>.github/</code></td><td>Workflows, templates, CONTRIBUTING</td></tr>
            <tr><td><code>app/</code></td><td>The starter app</td></tr>
            <tr><td><code>openspec/</code></td><td>Active changes, specs, archive</td></tr>
            <tr><td><code>wiki/</code></td><td>Process and conventions</td></tr>
            <tr><td><code>schema/</code>, <code>scripts/</code></td><td>Memory schema, checks, tests</td></tr>
            <tr><td class="muted">Root files</td><td class="muted"><code>AGENTS.md</code>, <code>VERSION</code>, <code>CHANGELOG.md</code>, <code>SECURITY.md</code>, and the rest, one row each</td></tr>
          </tbody>
        </table>

        <h2>Requirements</h2>
        <dl class="kv" data-target-id="after-requirements">
          <dt>Coding agent</dt><dd>Claude Code or Codex. Cursor with limits, stated.</dd>
          <dt>Tools</dt><dd>Node.js, <code>curl</code>, <code>gh</code> (signed in), <code>git</code></dd>
          <dt>OpenSpec</dt><dd><code>npm install -g @fission-ai/openspec</code></dd>
          <dt>Windows</dt><dd><code>git config --global core.symlinks true</code></dd>
          <dt>Cloudflare</dt><dd>Required: memory and hosting run there. Links <code>SECURITY.md</code> for what each token can do. <i class="callout">6</i></dd>
          <dt>Paseo</dt><dd class="muted">Optional, for <code>/routine</code></dd>
        </dl>

        <h2>Work from the source</h2>
        <p>Fork first, then clone your fork. <i class="callout">7</i></p>

        <h2>License</h2>
        <p class="muted">MIT</p>
      </div>

      <div class="state state-today">
        <p class="muted">README.md</p>
        <h1>WongStack</h1>
        <p>WongStack turns a repo into an AI knowledge center.</p>
        <p class="muted">Agents need shared knowledge to do useful work. WongStack keeps a team's processes inside the repo …</p>
        <p class="muted">No badges. No screenshot. No line says what goes wrong without WongStack.</p>

        <h2>Start here</h2>
        <div class="box">
          <p class="muted">Empty folder, Claude Code, Codex, Cursor, or another agent. Paste:</p>
          <p><code>Read and follow …/wong-setup/SKILL.md …</code></p>
          <span class="btn primary">Copy the prompt</span>
        </div>
        <h2>What you get</h2>
        <div class="skeleton"></div><div class="skeleton s"></div>
        <h2>How the pieces fit</h2>
        <div class="skeleton s"></div>
        <h2>The workflow</h2>
        <div class="skeleton"></div><div class="skeleton"></div>
        <h2>Where the knowledge lives</h2>
        <div class="skeleton s"></div>
        <h2>A few terms the agent may introduce</h2>
        <div class="skeleton s"></div>
        <h2>Learn more</h2>
        <div class="skeleton s"></div>
        <h2>Requirements</h2>
        <dl class="kv">
          <dt>Tools</dt><dd><code>gh</code>, Node.js. No <code>curl</code>, no OpenSpec install command.</dd>
          <dt>Windows</dt><dd class="muted">Not named</dd>
          <dt>Cloudflare</dt><dd>Named, with no reason why it is required</dd>
        </dl>
        <h2>Prefer to work from the source?</h2>
        <p>Clone this repo.</p>
        <h2>License</h2>
        <p class="muted">MIT</p>
      </div>
    </div>
  </div>
  <div class="notes">
    <p class="brief"><b>Who / job:</b> a developer who lands on the repository from a link or a search, and decides in under a minute whether WongStack solves a problem they have. <b>Done:</b> they copy the setup prompt, or they know why WongStack is not for them. <b>Context:</b> GitHub on a desktop browser, drawn first; the phone view (toggle View: Phone) keeps the same order and folds the comparison table into a list. <b>Frequency:</b> once per visitor.</p>
    <ol>
      <li>Badges come first, so a visitor sees that CI passes, the license, and the version before they read. The version badge reads <code>VERSION</code>.</li>
      <li>The problem comes before the product. Today the first line names the product ("an AI knowledge center"); a visitor who does not know that term cannot tell if it is for them.</li>
      <li>One screenshot of a <code>review.html</code> page, not a GIF. It shows the output a user gets, and any change can make a new one.</li>
      <li>The copy prompt stays the one primary action. Nothing else on the first screen competes with it.</li>
      <li>The comparison is short and names each other tool fairly. The final cell text is for the README draft to decide; review the rows, not the words.</li>
      <li>Requirements say why Cloudflare is required and link <code>SECURITY.md</code>, instead of offering a path without Cloudflare.</li>
      <li>"Fork first" replaces "clone this repo": a visitor cannot push to this repository, and a fork PR is the way to send a change back.</li>
      <li>Not drawn: the workflow table, "Where the knowledge lives", and "Learn more". The plan does not say if they stay, move to the wiki, or shrink. "A few terms" moves to the wiki.</li>
    </ol>
  </div>
</section>

<section class="visual tree" id="settings" data-kind="tree">
  <p class="caption">GitHub repository settings: the value today → the value after. The agent shows each row to you, then applies it with <code>gh</code>. Nothing changes before you see it.</p>
  <div class="frame">
    <div class="label">Security</div>
    <ul>
      <li class="edit" data-target-id="set-pvr">Private vulnerability reporting: off → on <span class="why">the channel <code>SECURITY.md</code> names works <i class="callout">1</i></span></li>
      <li class="edit" data-target-id="set-secrets">Secret scanning and push protection: off → on <span class="why">a pushed token is stopped</span></li>
      <li class="edit" data-target-id="set-dependabot">Dependabot alerts and security updates: off → on <span class="why">pairs with the new <code>dependabot.yml</code></span></li>
    </ul>
    <div class="label">Ruleset on main</div>
    <ul>
      <li class="add" data-target-id="set-ruleset">Required checks: none → Test and Payload checks <span class="why">"CI is the gate" is enforced <i class="callout">2</i></span></li>
      <li class="add" data-target-id="set-force">Force-push and deletion: allowed → blocked</li>
      <li class="add" data-target-id="set-bypass">Bypass: none → repository owner only <span class="why">prose saves go straight to <code>main</code> <i class="callout">3</i></span></li>
    </ul>
    <div class="label">Pull requests</div>
    <ul>
      <li class="edit" data-target-id="set-merge">Merge methods: merge, rebase, squash → squash only <span class="why">matches what <code>/ship</code> does</span></li>
      <li class="edit" data-target-id="set-delete">Delete head branch after merge: off → on</li>
    </ul>
    <div class="label">About</div>
    <ul>
      <li class="edit" data-target-id="set-description">Description: "My harness for building a collaborative AI knowledge center" → a third-person line that states the problem <span class="why">search results quote it</span></li>
      <li class="add" data-target-id="set-topics">Topics: none → ai-agents, claude-code, codex, openspec, cloudflare-workers, developer-workflow</li>
      <li class="add" data-target-id="set-homepage">Homepage: empty → a link, shown for your approval <span class="why">value set when the agent shows it</span></li>
    </ul>
    <div class="label">Environments</div>
    <ul>
      <li class="add" data-target-id="set-env">production: none → deploys from <code>main</code> only <span class="why">a branch cannot deploy to production <i class="callout">4</i></span></li>
    </ul>
  </div>
  <div class="notes">
    <ol>
      <li>Today <code>SECURITY.md</code> points to a reporting form that is turned off. Turning it on makes the file true; the file does not change.</li>
      <li>The check names match the workflow names in <code>.github/workflows/</code>. A check that is renamed later must also be renamed here, or every PR waits for a check that never runs.</li>
      <li>Without an owner bypass, a wiki-only <code>/save</code> cannot push to <code>main</code>. The bypass is for the owner only; other people still go through a PR.</li>
      <li>The deploy workflow names the <code>production</code> environment, so the limit to <code>main</code> is enforced by GitHub, not only by the workflow's own branch filter.</li>
    </ol>
  </div>
</section>

</div><!-- /stage -->
</div><!-- /layout -->

<div class="toast" id="toast"></div>
<textarea id="copybuf" aria-hidden="true"></textarea>

<script>
  // kit: a load-time failure shows on the page instead of a blank stage
  window.addEventListener('error', function (e) {
    var p = document.getElementById('panel');
    if (p) p.innerHTML = '<p class="error"><b>Review script error:</b> ' + String(e.message).replace(/</g, '&lt;') + ' <span class="muted">(line ' + e.lineno + ')</span></p>' + p.innerHTML;
  });

  // ── routing: #/<visual>[/<state>][/<mark>] ──
  const FILE = 'review.html';
  const CHANGE = document.title.replace(/^Review — /, '');
  const visuals = [...document.querySelectorAll('.visual')];
  const $states = document.getElementById('states');
  const $panel = document.getElementById('panel');
  let current = { id: '_landing', state: 'default', mark: null, bullet: -1 };
  let bullets = [];   // [{text, anchor, id, state, mark, ok}]

  function statesOf(v) { return (v.dataset.states || 'default').split(' '); }
  // resolve the two optional segments: a state if it names one, else a mark
  function resolve(id, a, b) {
    const v = visuals.find(x => x.id === id);
    if (!v || id[0] === '_') return null;
    const allowed = statesOf(v);
    let state, mark;
    if (a && allowed.includes(a)) { state = a; mark = b || null; }
    else if (a && b) return null;               // a is not a state, but a mark follows: bad state
    else { state = allowed[0]; mark = a || null; }
    if (mark && !v.querySelector('[data-mark="' + mark + '"]')) return null;
    return { v, state, mark };
  }
  function ownerIndex(id) { return bullets.findIndex(x => x.ok && x.id === id); }
  function show(id, a, b) {
    if ($pop) closePopover(false);
    const r = resolve(id, a, b);
    const v = r ? r.v : visuals.find(x => x.id === (id === '_text' ? '_text' : '_landing'));
    const state = r ? r.state : 'default', mark = r ? r.mark : null;
    visuals.forEach(x => x.toggleAttribute('data-active', x === v));
    v.dataset.state = state;
    v.querySelectorAll('.state').forEach(function (block) { block.toggleAttribute('data-on', block.classList.contains('state-' + state)); });
    current = { id: v.id, state, mark, bullet: r ? ownerIndex(v.id) : -1 };
    document.querySelectorAll('.marked').forEach(x => x.classList.remove('marked'));
    if (mark) v.querySelectorAll('[data-mark="' + mark + '"]').forEach(x => x.classList.add('marked'));
    renderStates(v, state);
    renderHeader();
    renderPanelState();
    renderFeedback();
    const multi = statesOf(v).length > 1;
    const want = v.id[0] === '_' ? '#/' : '#/' + v.id + (multi && (state !== statesOf(v)[0] || mark) ? '/' + state : '') + (mark ? '/' + mark : '');
    if (location.hash !== want) { try { history.replaceState(null, '', want); } catch (e) { location.hash = want; } }
  }
  function showText(i) {      // a bullet with no visual
    document.getElementById('textframe').innerHTML = '<p class="muted">No visual for this change. Read its full text above and leave feedback if needed.</p>';
    current = { id: '_text', state: 'default', mark: null, bullet: i };
    document.querySelectorAll('.marked').forEach(function (x) { x.classList.remove('marked'); });
    visuals.forEach(x => x.toggleAttribute('data-active', x.id === '_text'));
    renderStates(null); renderHeader(); renderPanelState(); renderFeedback();
    try { history.replaceState(null, '', '#/change/' + (i + 1)); } catch (e) { location.hash = '#/change/' + (i + 1); }
  }
  function renderStates(v, state) {
    $states.innerHTML = '';
    if (!v || statesOf(v).length < 2) return;
    const lab = document.createElement('span'); lab.textContent = 'State:'; $states.appendChild(lab);
    statesOf(v).forEach(st => {
      const b = document.createElement('button');
      b.textContent = st; b.setAttribute('aria-pressed', st === state);
      b.onclick = () => { show(v.id, st, null); requestAnimationFrame(() => window.scrollTo(0, 0)); }; $states.appendChild(b);
    });
  }
  function fromHash() {
    const seg = location.hash.split('/').slice(1);
    // no change chosen: a phone opens the list over the landing, a desktop opens the first bullet
    if (!seg[0] && bullets.length) {
      if (!phoneMedia.matches) return goBullet(0);
      show('_landing', null, null);
      return setMenu(true);
    }
    if (seg[0] === 'change' && bullets[+seg[1] - 1]) return goBullet(+seg[1] - 1);
    show(seg[0] || '_landing', seg[1] || null, seg[2] || null);
  }
  window.addEventListener('hashchange', fromHash);

  // ── proposal panel + landing ──
  function inline(md) {
    return md.replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  }
  function renderHeader() {
    const header = document.getElementById('item-header');
    const b = bullets[current.bullet];
    header.hidden = !b;
    if (!b) return;
    document.getElementById('item-position').textContent = 'Change ' + (current.bullet + 1) + ' of ' + bullets.length;
    document.getElementById('item-title').innerHTML = inline(b.text);
  }
  function parseProposal() {
    const raw = document.getElementById('proposal').textContent.replace(/<\\\/script/gi, '</script').replace(/<!--[\s\S]*?-->/g, '');
    const sections = {}; let cur = null;
    raw.split('\n').forEach(line => {
      const h = line.match(/^## (.+)/);
      if (h) { cur = h[1].trim(); sections[cur] = []; return; }
      if (cur) sections[cur].push(line);
    });
    const why = (sections['Why'] || []).join('\n').trim().split(/\n\s*\n/).map(p => '<p>' + inline(p.replace(/\n/g, ' ')) + '</p>').join('');
    bullets = []; let tail = [];
    const items = []; let open = false;   // fold a wrapped bullet back onto one line
    (sections['What Changes'] || []).forEach(line => {
      if (/^- /.test(line)) { items.push(line); open = true; return; }
      if (open && line.trim()) { items[items.length - 1] += ' ' + line.trim(); return; }
      if (!line.trim()) open = false;
      items.push(line);
    });
    items.forEach(line => {
      const li = line.match(/^- (.+)/);
      if (!li) { if (line.trim()) tail.push(line.trim()); return; }
      const m = li[1].match(/\(?(?:review\.html)?#\/([\w-]+)(?:\/([\w-]+))?(?:\/([\w-]+))?\)?\s*$/);
      if (m) {
        const r = resolve(m[1], m[2] || null, m[3] || null);
        bullets.push({ text: li[1].slice(0, m.index).trim(), anchor: '#/' + [m[1], m[2], m[3]].filter(Boolean).join('/'), id: m[1], state: r ? r.state : null, mark: r ? r.mark : null, ok: !!r, kind: r ? r.v.dataset.kind : null });
      } else bullets.push({ text: li[1].trim(), anchor: null });
    });
    const seen = new Set();
    bullets.forEach(b => { if (!b.ok) return; if (seen.has(b.id)) b.ok = false; else seen.add(b.id); });
    return { why, tail: tail.map(t => '<p>' + inline(t) + '</p>').join('') };
  }
  function renderPanel() {
    const p = parseProposal();
    let html = '<h2>Why</h2>' + p.why + '<h2>What Changes</h2><ol class="changes">';
    bullets.forEach((b, i) => {
      const cls = !b.anchor ? 'text' : b.ok ? '' : 'dead';
      const kind = !b.anchor ? 'no visual' : b.ok ? b.kind + ' · ' + b.anchor : 'dead link · ' + b.anchor + ' — no such visual, state, or mark';
      html += '<li class="' + cls + '" data-i="' + i + '" role="button" tabindex="0" aria-current="false">' + inline(b.text) + '<span class="kind">' + kind + '</span><span class="draft-count" hidden></span></li>';
    });
    html += '</ol>' + p.tail + '<h2>Notes <span id="notecount"></span></h2><ol class="notes-list" id="notelist"></ol><h2>Drafts <span id="draftcount"></span></h2><ol class="draft-list" id="draftlist"></ol>';
    $panel.innerHTML = html;
    document.getElementById('landing').innerHTML = bullets.length
      ? '<h1>Choose a change</h1><p class="muted">Use the change list or Next to open a visual.</p>'
      : '<h1>No changes to review</h1><p class="muted">This proposal has no What Changes entries yet.</p>';
  }
  function renderPanelState() {
    $panel.querySelectorAll('ol.changes li').forEach((li, i) => {
      const b = bullets[i];
      const on = current.bullet === i;
      li.classList.toggle('on', on);
      li.setAttribute('aria-current', on ? 'true' : 'false');
    });
    renderCount();
  }
  function goBullet(i) {
    const b = bullets[i]; if (!b) return;
    closePopover(); setMenu(false);
    if (!b.anchor || !b.ok) showText(i); else show(b.id, b.state, b.mark);
    requestAnimationFrame(() => { window.scrollTo(0, 0); document.getElementById('item-title').focus({ preventScroll:true }); });
  }

  // ── annotation and browser-local feedback ──
  const ANNOTATABLE = '.btn, .input, tr, .box, .tag, .hero, .kv dt, .kv dd, h1, .nav span, .logo, .notes li, .notes .brief, .step, .flow-branch, .diff .line, .diff pre, .tree li, .caption, .textstage p';
  const KEY = 'rv-notes:' + CHANGE;
  const DRAFT_KEY = 'rv-drafts:v1:' + CHANGE;
  let storageAvailable = true;
  function readStored(key, fallback) {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
    catch (e) { storageAvailable = false; return fallback; }
  }
  let notes = readStored(KEY, []);
  if (!Array.isArray(notes)) notes = [];
  const draftStore = readStored(DRAFT_KEY, { version:1, drafts:[] });
  let drafts = draftStore && draftStore.version === 1 && Array.isArray(draftStore.drafts) ? draftStore.drafts : [];
  function persist() {
    if (storageAvailable) {
      try {
        localStorage.setItem(KEY, JSON.stringify(notes));
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ version:1, drafts:drafts }));
      } catch (e) { storageAvailable = false; }
    }
    document.getElementById('storage-status').hidden = storageAvailable;
    renderFeedback();
  }
  const $ann = document.getElementById('annotate');
  let annotating = false, $pop = null, editor = null, editorTrigger = null;
  $ann.onclick = () => setAnnotating(!annotating);
  function setAnnotating(on) {
    annotating = on; $ann.setAttribute('aria-pressed', String(on)); document.body.classList.toggle('annotating', on);
    closePopover(false); document.querySelectorAll('.hovering').forEach(x => x.classList.remove('hovering'));
  }
  function target(el) {
    if (el.closest('.popover, .chrome, .pin, details, a[href^="#/"]')) return null;
    const scope = el.closest('.visual[data-active]');
    if (!scope) return null;
    const t = el.closest('.flow-card, .flow-branch') || el.closest(ANNOTATABLE);
    return t && scope.contains(t) ? { scope:scope, el:t } : null;
  }
  document.addEventListener('mouseover', e => {
    if (!annotating) return;
    document.querySelectorAll('.hovering').forEach(x => x.classList.remove('hovering'));
    const t = target(e.target); if (t) t.el.classList.add('hovering');
  });
  function pathOf(scope, el) {
    const steps = [];
    for (let n = el; n && n !== scope; n = n.parentElement) steps.unshift([...n.parentElement.children].indexOf(n));
    return steps.join('.');
  }
  function elAt(scope, path) {
    if (!scope || !path) return null;
    let n = scope;
    for (const i of path.split('.')) n = n && n.children[+i];
    return n || null;
  }
  function labelOf(el) {
    const c = el.cloneNode(true);
    c.querySelectorAll('.pin, .callout, .kind, .why').forEach(x => x.remove());
    if (el.matches('.flow-card, .flow-branch')) c.querySelectorAll('details').forEach(x => x.remove());
    const content = el.tagName === 'TR' ? [...c.cells].map(td => td.textContent.trim()).join(' · ') : c.textContent;
    const value = content.replace(/\s+/g, ' ').trim().slice(0, 60);
    const kind = el.classList.contains('btn') ? 'button' : el.classList.contains('input') ? 'input' : el.tagName === 'TR' ? 'row'
      : el.classList.contains('box') ? 'panel' : el.tagName === 'H1' ? 'heading' : el.classList.contains('flow-branch') ? 'branch'
      : el.classList.contains('step') ? 'step' : el.classList.contains('line') ? 'line' : el.closest('.tree') ? 'file' : el.tagName.toLowerCase();
    return kind + ' "' + value + '"';
  }
  function recordFor(el) {
    const scope = el.closest('.visual[data-active]');
    return { itemId:current.id === '_text' ? '_text:' + current.bullet : current.id,
      scope:'visual', visual:current.id, state:current.state, targetId:el.dataset.targetId || null,
      path:pathOf(scope, el), label:labelOf(el) };
  }
  function sameTarget(a, b) {
    return a.itemId === b.itemId && a.visual === b.visual && a.state === b.state &&
      (a.targetId && b.targetId ? a.targetId === b.targetId : a.path === b.path && a.label === b.label);
  }
  function findTarget(n) {
    const scope = document.getElementById(n.visual);
    if (!scope) return null;
    let el = null;
    if (n.targetId) el = [...scope.querySelectorAll('[data-target-id]')].find(x => x.dataset.targetId === n.targetId && (!x.closest('.state') || x.closest('.state').classList.contains('state-' + n.state)));
    if (!el && !n.targetId) el = elAt(scope, n.path);
    return el && labelOf(el) === n.label ? el : null;
  }
  function whereOf(n) {
    if (n.visual === '_text') return '#/change/' + (Number(String(n.itemId).split(':')[1]) + 1);
    const v = visuals.find(x => x.id === n.visual);
    return '#/' + n.visual + (v && statesOf(v).length > 1 ? '/' + n.state : '');
  }
  function escapeHtml(value) { return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function newId() { return String(Date.now()) + '-' + Math.random().toString(36).slice(2, 8); }
  function renderFeedback() {
    document.querySelectorAll('.pin').forEach(p => p.remove());
    const list = document.getElementById('notelist'), draftList = document.getElementById('draftlist');
    if (!list || !draftList) return;
    list.innerHTML = ''; draftList.innerHTML = '';
    document.getElementById('notecount').textContent = notes.length ? '(' + notes.length + ')' : '';
    document.getElementById('draftcount').textContent = drafts.length ? '(' + drafts.length + ')' : '';
    notes.forEach((n, i) => {
      const el = findTarget(n), stale = !el;
      if (el) {
        const pin = document.createElement('button'); pin.className = 'pin'; pin.dataset.note = n.id;
        pin.setAttribute('aria-label', 'Open note ' + (i + 1)); pin.textContent = String(i + 1);
        (el.tagName === 'TR' ? el.cells[0] : el).appendChild(pin);
      }
      const li = document.createElement('li');
      const button = document.createElement('button'); button.type = 'button';
      button.innerHTML = '<span class="where">' + escapeHtml(whereOf(n)) + ' · ' + escapeHtml(n.label) + (stale ? ' · moved target' : '') + '</span>' + escapeHtml(n.text);
      button.onclick = () => openRecord(n, false);
      li.appendChild(button); list.appendChild(li);
    });
    if (!notes.length) list.innerHTML = '<li class="empty">No saved notes yet.</li>';
    drafts.forEach(d => {
      const li = document.createElement('li'), button = document.createElement('button'); button.type = 'button';
      button.textContent = whereOf(d) + ' · ' + d.label + (findTarget(d) ? '' : ' · moved target');
      button.onclick = () => openRecord(d, true);
      li.appendChild(button); draftList.appendChild(li);
    });
    if (!drafts.length) draftList.innerHTML = '<li class="empty">No drafts.</li>';
    $panel.querySelectorAll('ol.changes li').forEach((li, i) => {
      const b = bullets[i], itemId = b && b.ok ? b.id : '_text:' + i;
      const count = drafts.filter(d => d.itemId === itemId).length;
      const badge = li.querySelector('.draft-count'); badge.hidden = !count;
      badge.textContent = count + (count === 1 ? ' draft' : ' drafts');
    });
    document.getElementById('storage-status').hidden = storageAvailable;
  }
  function closePopover(restore) {
    if ($pop) $pop.remove();
    $pop = null; editor = null; document.body.classList.remove('editor-open');
    if (restore && editorTrigger && editorTrigger.isConnected) editorTrigger.focus();
    editorTrigger = null;
  }
  function openRecord(n, isDraft) {
    closePopover(false); setMenu(false);
    if (n.visual === '_text') goBullet(Number(String(n.itemId).split(':')[1]));
    else show(n.visual, n.state, null);
    const el = findTarget(n);
    if (el) el.scrollIntoView({ block:'center' });
    const saved = isDraft && n.savedId ? notes.find(x => x.id === n.savedId) : !isDraft ? n : null;
    openPopover(isDraft ? n : saved || n, el, saved || null);
  }
  function openPopover(record, anchorEl, saved) {
    closePopover(false);
    const original = record || recordFor(anchorEl);
    const prior = saved || (record && record.id ? record : null);
    const matching = drafts.find(d => sameTarget(d, original) && (d.savedId || null) === (prior ? prior.id : null));
    editor = { meta:{ itemId:original.itemId, scope:'visual', visual:original.visual, state:original.state,
      targetId:original.targetId || null, path:original.path, label:original.label },
      savedId:prior ? prior.id : null, draftId:matching ? matching.id : (record && record.savedId !== undefined ? record.id : null) };
    editorTrigger = anchorEl;
    const initial = matching ? matching.text : (record && record.text !== undefined ? record.text : prior ? prior.text : '');
    $pop = document.createElement('div'); $pop.className = 'popover';
    const moved = !anchorEl ? '<p class="status">Original target moved. This draft stays here until you choose a new target.</p>' : '';
    $pop.innerHTML = '<div class="where">' + escapeHtml(whereOf(original)) + ' · ' + escapeHtml(original.label) + '</div>' + moved
      + '<textarea aria-label="Note text" placeholder="What should change here?"></textarea>'
      + '<div class="row"><button class="save">Save</button><button class="close">Close</button><button class="discard">Discard draft</button>'
      + (prior ? '<button class="del">Delete saved note</button>' : '') + '</div><p class="status">Drafts are excluded from Copy notes.'
      + (storageAvailable ? '' : ' Notes and drafts last for this session only.') + '</p>';
    const ta = $pop.querySelector('textarea'); ta.value = initial;
    ta.oninput = () => {
      const text = ta.value;
      let d = drafts.find(x => x.id === editor.draftId);
      if (!text.trim() && !editor.savedId) {
        if (d) drafts = drafts.filter(x => x.id !== d.id);
        editor.draftId = null;
      } else if (d) d.text = text;
      else { d = Object.assign({ id:newId(), savedId:editor.savedId, text:text }, editor.meta); drafts.push(d); editor.draftId = d.id; }
      persist();
    };
    $pop.querySelector('.save').onclick = () => {
      const text = ta.value.trim(); if (!text) return;
      const id = editor.savedId || newId();
      const savedNote = Object.assign({ id:id, text:text }, editor.meta);
      const index = notes.findIndex(x => x.id === id);
      if (index < 0) notes.push(savedNote); else notes[index] = savedNote;
      drafts = drafts.filter(x => x.id !== editor.draftId);
      closePopover(true); persist();
    };
    $pop.querySelector('.close').onclick = () => closePopover(true);
    $pop.querySelector('.discard').onclick = () => { drafts = drafts.filter(x => x.id !== editor.draftId); closePopover(true); persist(); };
    const del = $pop.querySelector('.del');
    if (del) del.onclick = () => { notes = notes.filter(x => x.id !== editor.savedId); drafts = drafts.filter(x => x.id !== editor.draftId); closePopover(true); persist(); };
    ta.onkeydown = ev => { if (ev.key === 'Enter' && (ev.metaKey || ev.ctrlKey)) { ev.preventDefault(); $pop.querySelector('.save').click(); } };
    document.body.appendChild($pop); document.body.classList.add('editor-open');
    if (!phoneMedia.matches) {
      const r = anchorEl ? anchorEl.getBoundingClientRect() : document.getElementById('item-header').getBoundingClientRect();
      const W = 300, H = $pop.offsetHeight || 190;
      let top = r.top, left = r.right + 10;
      if (left + W > innerWidth) { left = Math.max(8, Math.min(r.left, innerWidth - W - 8)); top = r.bottom + 8; if (top + H > innerHeight) top = r.top - H - 8; }
      $pop.style.top = Math.max(50, top) + 'px'; $pop.style.left = left + 'px';
    }
    ta.focus();
  }
  let touchStart = null, touchMoved = false;
  document.addEventListener('touchstart', e => { const t = e.touches[0]; if (t) { touchStart = { x:t.clientX, y:t.clientY }; touchMoved = false; } }, { passive:true });
  document.addEventListener('touchmove', e => { const t = e.touches[0]; if (t && touchStart && Math.hypot(t.clientX - touchStart.x, t.clientY - touchStart.y) > 8) touchMoved = true; }, { passive:true });
  document.addEventListener('click', e => {
    if (e.target.closest('.popover')) return;
    const pin = e.target.closest('.pin');
    if (pin) { e.preventDefault(); const n = notes.find(x => x.id === pin.dataset.note); if (n) openRecord(n, false); return; }
    const li = e.target.closest('.panel ol.changes li');
    if (li) { goBullet(+li.dataset.i); return; }
    const panelLink = e.target.closest('.panel a[href*="#/"]');
    if (panelLink) { e.preventDefault(); const s = panelLink.getAttribute('href').split('#/')[1].split('/'); show(s[0], s[1], s[2]); return; }
    const local = e.target.closest('.visual[data-active] a[href^="#/"]');
    if (local) {
      e.preventDefault(); const s = local.getAttribute('href').split('#/')[1].split('/');
      if (s[0] === current.id) { show(s[0], s[1], s[2]); requestAnimationFrame(() => window.scrollTo(0, 0)); }
      else toast('Use Changes to select another change.');
      return;
    }
    if (e.target.closest('details')) return;
    if (touchMoved) { touchMoved = false; return; }
    if (annotating) {
      const t = target(e.target);
      if (t) { e.preventDefault(); openPopover(recordFor(t.el), t.el, null); }
      return;
    }
    const localState = e.target.closest('.visual[data-active] [data-local-state]');
    if (localState) { show(current.id, localState.dataset.localState, null); return; }
    const step = e.target.closest('.visual[data-active] .flow-card, .visual[data-active] .flow-branch');
    if (step) { const detail = step.querySelector('details'); if (detail) detail.open = !detail.open; }
  });
  document.addEventListener('keydown', e => {
    const editing = e.target.matches('textarea,input,[contenteditable="true"]') || !!e.target.closest('[contenteditable="true"]');
    if (e.key === 'Escape') { if ($pop) closePopover(true); return; }
    if (editing) return;
    if (e.key === 'a') { setAnnotating(!annotating); return; }
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.panel ol.changes li')) { e.preventDefault(); goBullet(+e.target.dataset.i); return; }
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.flow-card, .flow-branch')) {
      e.preventDefault();
      if (annotating) openPopover(recordFor(e.target), e.target, null);
      else { const detail = e.target.querySelector('details'); if (detail) { detail.open = !detail.open; detail.querySelector('summary').focus(); } }
    }
  });
  document.querySelectorAll('.flow-card, .flow-branch').forEach(el => { if (!el.hasAttribute('tabindex')) el.tabIndex = 0; });
  function notesText() {
    const lines = ['/continue ' + CHANGE, 'Review notes from ' + FILE + ' (' + notes.length + '):'];
    notes.forEach((n, i) => lines.push((i + 1) + '. ' + whereOf(n) + ' · ' + n.label + ' — ' + n.text));
    return lines.join('\n');
  }
  document.getElementById('copy').onclick = function () {
    if (!notes.length) return toast('No saved notes yet');
    const text = notesText(), buf = document.getElementById('copybuf'); buf.value = text;
    const done = () => toast('Copied ' + notes.length + ' saved note' + (notes.length === 1 ? '' : 's'));
    const fallback = () => { buf.select(); buf.setSelectionRange(0, 99999); document.execCommand('copy'); done(); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback); else fallback();
  };
  function toast(msg) { const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 1800); }

  // ── phone: the chrome's height drives the panel; the list is a sheet; step through changes ──
  function chromeHeight() { document.documentElement.style.setProperty('--chrome-h', document.querySelector('.chrome').offsetHeight + 'px'); }
  window.addEventListener('resize', chromeHeight);
  function setMenu(open) {
    document.body.classList.toggle('menu', open);
    document.getElementById('menu').setAttribute('aria-expanded', open);
  }
  document.getElementById('menu').onclick = () => setMenu(!document.body.classList.contains('menu'));
  document.getElementById('tools-toggle').onclick = function () {
    const open = document.getElementById('tools').classList.toggle('open');
    this.setAttribute('aria-expanded', open);
    chromeHeight();
  };
  function currentBullet() { const li = document.querySelector('.panel ol.changes li.on'); return li ? +li.dataset.i : -1; }
  function renderCount() {
    const i = currentBullet();
    document.getElementById('count').textContent = i < 0 ? bullets.length + ' changes' : (i + 1) + ' / ' + bullets.length;
    document.getElementById('prev').disabled = i <= 0;
    document.getElementById('next').disabled = i >= bullets.length - 1;
    const v = document.querySelector('.visual[data-active]');
    document.getElementById('viewport').style.display = v && v.classList.contains('screen') ? '' : 'none';
    chromeHeight();
  }
  document.getElementById('prev').onclick = () => { const i = currentBullet(); if (i > 0) goBullet(i - 1); };
  document.getElementById('next').onclick = () => { const i = currentBullet(); if (i < bullets.length - 1) goBullet(i + 1); };
  document.addEventListener('keydown', e => { if (e.target.matches('textarea,input,[contenteditable="true"]') || e.target.closest('[contenteditable="true"]')) return; if (e.key === 'ArrowRight') document.getElementById('next').click(); if (e.key === 'ArrowLeft') document.getElementById('prev').click(); });

  // ── viewport: phone or desktop layout of a screen; a phone is a phone already ──
  const phoneMedia = matchMedia('(max-width: 760px)');
  function setViewport(vp) {
    document.body.dataset.viewport = vp;
    document.querySelectorAll('#viewport button').forEach(b => b.setAttribute('aria-pressed', b.dataset.vp === vp));
  }
  document.querySelectorAll('#viewport button').forEach(b => b.onclick = () => setViewport(b.dataset.vp));
  setViewport(phoneMedia.matches ? 'phone' : 'desktop');
  phoneMedia.addEventListener('change', e => setViewport(e.matches ? 'phone' : 'desktop'));

  renderPanel();
  fromHash();
  chromeHeight();
</script>
</body>
</html>

~~~
<!-- end review.html -->
