<!-- openspec-archive v1 2026-10-04-remove-server-and-managed-hosting -->
<!-- file proposal.md utf8 8549 -->
# Remove the server and managed-hosting pieces

**Status:** ready-to-ship

**Branch:** fabulous-unicorn

**Open questions:** none

## Why

WongStack now has one way in: you run it from your own computer, with your own GitHub and Cloudflare accounts. wongstack.com becomes a landing page only, so the parts of this repo that existed to serve it, or to set up a rented server, have no one left to use them. Left in place they keep costing: every change is checked against them, and the guides describe a route nobody can take.

## What Changes

- **One way in, not three.** The repo stops carrying the server setup and the wongstack.com-managed route. Installing from your own computer through GitHub works exactly as it does today.
  ```text
        BEFORE                    AFTER
  your computer ─▶ GitHub   your computer ─▶ GitHub
  wongstack.com ─▶ managed
  your server ─▶ setup
  ```
- **The server folder goes.** **BREAKING** for anyone who sets up servers from it: the script that turns a fresh server into a workspace, the helper that runs on that server, and the installer it used all leave the repo. They stay in the repo's history at version 30.10.0 for anyone who needs them.
- **Saving and publishing stop looking for a managed workspace.** Setup, save, publish and resume no longer check first whether the project is hosted by wongstack.com. They go straight to the GitHub steps they already use.
- **The guides describe one route.** Getting started, the stack overview and the change-loop page drop the managed route, and the managed-projects page is removed. Nothing in them promises a hosted service.
- **The automatic checks get lighter.** The checks no longer build a hosted starter or test the server pieces, so about fifteen test files leave and each check run has less to do.
- **Installed projects lose nothing they used.** Managed hosting was never switched on for anyone. The next update of an installed project removes the unused pieces and asks for nothing.

**Non-goals:** Moving the landing page into this repo. Shutting down the wongstack.com app, its servers, or its keys. The new route that keeps a project in your own Cloudflare account. Rewriting the changelog's history or archived plans. Changing how setup creates your site, database, memory, or login wall.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `delivery-gate`: the managed Artifacts route leaves the gate, save, precondition, branch-cleanup and one-route requirements; the GitHub wording stays.
- `install-onboarding`: the hosted-workspace check, the hosted starter, the server setup script, the unattended server installer and its rerun leave; interactive setup stays.
- `cloudflare-provisioning`: the shared provisioning script serves `/wong-setup` only.
- `dependencies`: no server script installs Paseo or the tunnel tool.
- `paseo-defaults`: only setup adds the agent presets.
- `cloudflare-hosted-projects`, `managed-workspace-access`, `server-agent`, `preserved-server-setup`: retired whole.

## Impact

- **Deleted:** `server/` (20 files); `.agents/skills/save/scripts/hosted-delivery.mjs`, `hosted-main-pre-push.mjs`, `.agents/skills/save/references/hosted-delivery.md`; `.agents/skills/wong-sync/scripts/hosted-context.mjs`; `scripts/check-hosted-starter.mjs`; `scripts/acceptance/`; `wiki/stack/hosted-projects.md`; fifteen `scripts/tests/server-*.test.mjs` and `hosted-*.test.mjs` files; four specs.
- **Edited, shared with the GitHub route:** `.agents/skills/save/scripts/saved-revision.mjs` and its test; the `/wong-setup`, `/save`, `/ship`, `/continue`, `/apply`, `/verify` and `/wong-sync` skill text; `.agents/skills/memory/references/areas.json`; `.agents/skills/update-dependencies/scripts/update.mjs`; `.env.example`; `.github/workflows/payload.yml`; `scripts/tests/.c8rc.json`; `README.md`; `.github/CONTRIBUTING.md`; nine wiki pages.
- **Unchanged in behavior:** `provision.mjs` and `private-access.mjs` (comments only), `.github/scripts/checks.mjs` (untouched), the GitHub route of every verb.
- **Release:** a major `CHANGELOG.md` entry and new `scripts/retired-names.json` rows.
- **Other work in flight:** the own-account Artifacts part edits the same verbs and the change-loop page; `installation-owned-memory-devices` edits three `server/` files and one requirement this change removes. Whichever publishes second catches up.

## Decision log

- **2026-10-04** — Asked what stays of the server and managed hosting → chose none of it: "None of it should be in this repo for now." wongstack.com becomes a landing page and people run WongStack from their own computer.
- **2026-10-04** — Asked whether the GitHub route changes → chose it stays exactly as it is.
- **2026-10-04** — Assumed: the script setup uses to create your Cloudflare site keeps every behavior, the open-until-you-add-a-card finish included, because interactive setup uses the same option; only its comments named the server installer.
- **2026-10-04** — Assumed: the checks' option that only lists which checks apply stays, because it holds nothing about hosting and the own-account Artifacts part may call it; only one test's title changes.
- **2026-10-04** — Assumed: this is a major release, because a fork that sets up servers from the server folder loses it; an installed project on GitHub has nothing to do.
- **2026-10-04** — Assumed: the frozen sample documents used to test search keep their old wording, because they are fixed snapshots whose content the tests pin.
- **2026-10-04** — Assumed: publishing this before wongstack.com is shut down breaks no running server, because the server guide has each host copy the source at a fixed earlier version, which stays in history. How the wongstack.com app pins it was not checked in its own repo.
- **2026-10-04** — Assumed: the line on Matthew's page that prefers a sign-in service "hosted inside WongStack cloud" loses that clause, because that cloud is going; his wish for free, generic connections stays.
- **2026-10-04** — Assumed: the example "a computer with no recent chats, such as a hosted server" stays, because it describes any server, not the managed service.
- **2026-10-04** — Check: `scripts/tests/server-agent-contract.test.mjs`, `scripts/tests/server-agent-copy.test.mjs`, `scripts/tests/server-agent-management.test.mjs`, `scripts/tests/server-agent-roll.test.mjs`, `scripts/tests/server-agent-runtime.test.mjs`, `scripts/tests/server-agent-source.test.mjs`, `scripts/tests/server-agent.test.mjs`, `scripts/tests/server-install.test.mjs`, `scripts/tests/server-preservation.test.mjs`, `scripts/tests/server-project.test.mjs`, `scripts/tests/server-setup.test.mjs` are deleted, because the server code they test is deleted with them. The one test in them that guards something else, that every place naming the OpenSpec version agrees, moves to `scripts/tests/update-dependencies.test.mjs`.
- **2026-10-04** — Check: `scripts/tests/hosted-acceptance-evidence.test.mjs`, `scripts/tests/hosted-bootstrap.test.mjs`, `scripts/tests/hosted-delivery.test.mjs`, `scripts/tests/hosted-starter.test.mjs` are deleted, because the managed-hosting code they test is deleted with them.
- **2026-10-04** — Check: `.github/workflows/payload.yml` drops the hosted-starter step and the `server` paths from its lint and shell checks, because those files are gone; every other check stays.
- **2026-10-04** — Check: `scripts/tests/.c8rc.json` stops measuring `server/` and `scripts/acceptance/`, which no longer exist; the coverage floors stay where they are.
- **2026-10-04** — Assumed while building: a few leftover mentions the design did not list go too, because no live file should name the server or the managed route. They are the fourth "server setup script" clause and the Paseo sentence on the required-tools page, the "on a hosted server" sentence on the login-wall page, one test's failure message, one test helper's comment, the dependency test's title (three pins, not five), and one line of the revision-check notes. Nothing behaves differently.
- **2026-10-04** — Assumed: the retired-name check and the leftover search are confirmed again after the plan is archived, because archiving is what rewrites the main specs; the automatic checks' result is read at the publish checkpoint, not ticked as a build task.
- **2026-10-04** — Archive checkpoint: built, archived and numbered 31.0.0; the retired-name check, the leftover search, the link check and spec validation pass against the reconciled specs.

<!-- end proposal.md -->
<!-- file design.md utf8 9104 -->
# Design

## Context

See proposal.md for why. Three groups of files only ever served a host:

- `server/`: `setup.sh`, `preserve.sh`, `agent-runtime.sh`, the installer (`install-wongstack.mjs`, `prepare-project.mjs`, `project-github.mjs`, `access-result.mjs`, `sign-ins.mjs`, `preservation.json`), the agent (`agent/*.mjs`), and the hosted bootstrap and starter (`hosted/*.mjs`). It sits outside the target inventory, so no install holds a copy.
- The managed delivery pieces in the payload: `save/scripts/hosted-delivery.mjs`, `save/scripts/hosted-main-pre-push.mjs`, `save/references/hosted-delivery.md`, `wong-sync/scripts/hosted-context.mjs`.
- Source-only checks for them: `scripts/check-hosted-starter.mjs`, `scripts/acceptance/cloudflare-hosted/`, and fifteen test files.

"Check each for other users" found three shared files:

| File | Other user | What happens |
|---|---|---|
| `save/scripts/saved-revision.mjs` | `/verify` and `/save` on GitHub | Loses its Artifacts branch; keeps the GitHub path byte for byte |
| `wong-setup/scripts/provision.mjs`, `private-access.mjs` | `/wong-setup` | Comments only; `openWithoutLogin` stays because `--open-without-login` is interactive setup's own option |
| `.github/scripts/checks.mjs` | GitHub CI | Untouched; `--discover` holds no hosting code |

Nothing else imports from `server/` or the hosted modules: the only importers outside the deleted set are `saved-revision.mjs` and `check-hosted-starter.mjs`.

## Goals / Non-Goals

**Goals:**

- No live file names the server folder, the managed route, or wongstack.com as a host.
- The GitHub route of every verb reads and behaves as before.
- The release checks pass with no leftover link, anchor, or retired name.

**Non-Goals:**

- Touching `openspec/changes/archive/` or past `CHANGELOG.md` entries.
- Removing `--discover` from `checks.mjs`, `openWithoutLogin` from the provisioner, or the `wongstack-cloud` guard in `private-names.test.mjs`.
- Rewording mentions that are not about this: Access's `self_hosted` app type, Claude's managed-settings policy in `extract-host.mjs`, generated `app/worker-configuration.d.ts`, "a hosted server" as a generic example in `mini-apps`, "hosted account" in `memory`.

## Decisions

### Delete whole files; edit only the three shared ones

Each deleted file loses its last importer in the same change. `saved-revision.mjs` drops its two hosted imports, the `hosted` branch, the `hostedInput` and `delivery` parameters, and the `--hosted-input` flag. It keeps `SHA` as a local constant (`/^[a-f0-9]{40}$/`, the value `hosted-context.mjs` exported) and treats a non-GitHub `origin` as it already does: `UNKNOWN`, "Unsupported or foreign repository identity". Its test file loses the one hosted case.

Alternative considered: keep `hosted-context.mjs` for the own-account Artifacts part. Rejected: that part brings its own files and does not reuse these, and `HOSTED_ORIGIN` there is `https://wongstack.com`.

### Skill text loses the fork, not the steps

Each verb has one line that sends an Artifacts checkout to hosted delivery before its GitHub steps. That line goes and the steps under it stay as written:

- `wong-setup/SKILL.md`: the *Hosted workspace first* section.
- `save/SKILL.md` line on hosted transport; `save/references/preconditions.md` first line; `save/references/git-gate.md` saved-revision paragraph (the "verified hosted gate" and "Hosted candidate/generation/base" clauses).
- `ship/SKILL.md`, `continue/SKILL.md`: "for hosted/GitHub transport".
- `apply/SKILL.md`: "Managed preview: hosted delivery. Otherwise:".
- `verify/SKILL.md`: "or verified `--hosted-input <file>`".
- `wong-sync/references/catch-up.md`: the "Managed installs also need…" sentences. `wong-sync/references/payload-manifest.md`: "the `server/` setup script and agent" in the outside-the-inventory list.
- `wong-setup/references/cloudflare.md`: the two server-installer clauses.
- `memory/references/areas.json`: the `server` area, and `hosted-projects.md` wherever another area lists it.

This is a net cut, so `measure-context.mjs --check` gains headroom. If its baseline names a deleted file, record a new baseline at this revision rather than editing counts by hand.

### Specs: retire four, rename where a scenario drops

`retire_capabilities: true` is set, so archiving deletes the four emptied specs. A MODIFIED block must keep every scenario, so each requirement that loses a hosted or server scenario is REMOVED and ADDED under a new name ([the CLI contract](../../../.agents/skills/plan/references/openspec-cli.md#validate-and-archive)); those that lose only a paragraph are MODIFIED. The GitHub paragraphs are kept word for word, so the own-account Artifacts part finds the text it expects under the new names.

`install-onboarding`'s Purpose names the server script. A delta cannot change a Purpose, so `/apply` edits `openspec/specs/install-onboarding/spec.md` directly, ending the sentence at "through the normal workflow".

### Retired names, with the frozen fixtures allowed

Add to `scripts/retired-names.json`: `server/setup.sh`, `server/README.md`, `install-wongstack.mjs`, `hosted-delivery`, `hosted-main-pre-push`, `hosted-context.mjs`, `check-hosted-starter`, `hosted-projects.md`, `cloudflare-hosted-projects`, `managed-workspace-access`, `HOSTED_ACCEPTANCE_`. Each `replacement` says the piece was removed and names `/wong-setup` where one exists. The retrieval corpus under `scripts/tests/fixtures/document-retrieval/corpus/` is a pinned snapshot that names several of these; list those exact files under `allow` with that reason, as `session-notes` already does. `CHANGELOG.md` and `openspec/changes/` are exempt by the checker.

`server-agent` and `preserved-server-setup` are not added as names: both are ordinary words a later change could use.

### A major release with nothing to do

`## Next (major)` in `CHANGELOG.md`. The **Updating.** note, in plain words: an installed project needs no step; the update removes pieces it never used. Someone who set up servers from the `server` folder of a fork keeps them by staying on, or copying from, version 30.10.0.

### The wiki keeps one route

- Delete `wiki/stack/hosted-projects.md` and its hub line in `wiki/stack/README.md`; rewrite that hub's two opening paragraphs and its closing lines for one route.
- `wiki/stack/getting-started.md`: the first two paragraphs become one that points at the README's three steps; drop "Personal GitHub setup" qualifiers and the managed-cost sentence.
- `wiki/stack/customizing-wongstack.md`: "your hosted project" → "your project" in the drawing; drop the *For servers you run* paragraph.
- `wiki/stack/cloudflare-access.md`: the server-installer clause in the first paragraph, "serves both standalone setup and the managed server installer", and the *Managed membership* paragraph.
- `wiki/stack/cloudflare-cli.md`, `wiki/development/required-tools.md`: "hosted or scoped workspace" → "scoped workspace"; the three "server setup script installs it" clauses; "Setup and the server installer" → "Setup"; "server installer" in the cf line.
- `wiki/development/the-change-loop.md`: the two managed sentences in *The gate*. `wiki/README.md`: the Save line's managed half.
- `wiki/people/matthew-wong.md`: the "hosted inside WongStack cloud" clause.

`#the-gate` and every other heading stay, so installed repos' links to them hold.

## Risks / Trade-offs

- [Coverage falls under the floor once well-tested server code leaves the total] → The floors in `scripts/tests/.c8rc.json` stay at 85 and 81. If CI reports under, add tests for what remains; lowering a floor would need its own `Check:` reason and the person's say.
- [The loosened-checks guard flags the deleted tests and changed check settings] → The Decision log carries a `Check:` bullet naming each file. A file flagged beyond those gets its own bullet before the next save.
- [The own-account Artifacts part edits the same verbs, `delivery-gate`, and the change-loop page] → Whichever publishes second catches up: it keeps this change's removals and re-adds only its own route, targeting the renamed requirements.
- [`installation-owned-memory-devices` edits `server/README.md`, `server/agent/agent.mjs`, `server/install-wongstack.mjs` and MODIFIES "The server installer installs WongStack unattended"] → When it catches up it drops those edits and that delta; its memory work does not depend on them.
- [`choose-project-in-setup` edits `areas.json`, `payload-manifest.md`, `wiki/stack/README.md`] → Different lines; an ordinary merge.
- [An older install's wiki still links `server/README.md` on GitHub until it syncs] → Dead link only; the next `/wong-sync` delivers the fixed pages.
- [wongstack.com is still running when this publishes] → Its servers hold a clone at a pinned commit, which history keeps. Not checked in the wongstack-cloud repo; the *Shut down the wongstack.com app* part owns that side.

## Migration Plan

One change, published once. Undo it by reverting that publish; nothing outside the repo changes, and no key, account, or data is touched.

<!-- end design.md -->
<!-- file tasks.md utf8 5962 -->
# Tasks

## 1. Server folder

- [x] 1.1 Delete `server/` whole; verify `git ls-files server` prints nothing
- [x] 1.2 Delete the eleven `scripts/tests/server-*.test.mjs` files; verify `ls scripts/tests | grep '^server-'` prints nothing
- [x] 1.3 Remove `server/setup.sh` and `server/preserve.sh` from the pin list in `.agents/skills/update-dependencies/scripts/update.mjs` and from the fixture in `scripts/tests/update-dependencies.test.mjs`; verify by reading that the test still names every remaining place the OpenSpec version lives

## 2. Managed delivery pieces

- [x] 2.1 Delete `.agents/skills/save/scripts/hosted-delivery.mjs`, `.agents/skills/save/scripts/hosted-main-pre-push.mjs`, `.agents/skills/save/references/hosted-delivery.md`, `.agents/skills/wong-sync/scripts/hosted-context.mjs`, `scripts/check-hosted-starter.mjs`, `scripts/acceptance/`, and the four `scripts/tests/hosted-*.test.mjs` files; verify `git ls-files | grep -i hosted` lists only `openspec/` paths
- [x] 2.2 In `.agents/skills/save/scripts/saved-revision.mjs`, remove the two hosted imports, the Artifacts branch, the `hostedInput` and `delivery` parameters and the `--hosted-input` flag, keeping `SHA` as a local constant; verify by reading that the GitHub path is unchanged and a non-GitHub origin still returns `UNKNOWN`
- [x] 2.3 In `scripts/tests/saved-revision.test.mjs`, remove the hosted case and add one asserting an Artifacts origin returns `UNKNOWN`; in `scripts/tests/checks.test.mjs`, retitle the `--discover` test without "hosted"; verify both files import nothing deleted
- [x] 2.4 Remove the `HOSTED_ACCEPTANCE_EXECUTION_TOKEN` block from `.env.example`; reword "hosted setups" in `scripts/tests/downstream-contract.test.mjs` and `scripts/tests/private-names.test.mjs` messages to name `/wong-setup` and installed repos; verify the assertions themselves are unchanged

## 3. Skill text

- [x] 3.1 Remove the *Hosted workspace first* section from `.agents/skills/wong-setup/SKILL.md`, the server-installer clauses from `references/cloudflare.md`, and the server-installer wording from the header comments of `scripts/provision.mjs` and `scripts/private-access.mjs`; verify no code line in either script changed
- [x] 3.2 Remove the hosted fork from `.agents/skills/save/SKILL.md`, `save/references/preconditions.md`, and `save/references/git-gate.md`; verify each GitHub step under it reads as before
- [x] 3.3 Remove the hosted fork from `.agents/skills/ship/SKILL.md`, `continue/SKILL.md`, `apply/SKILL.md`, and the `--hosted-input` clause from `verify/SKILL.md`; verify no link to `hosted-delivery.md` or `hosted-projects.md` remains under `.agents/skills/`
- [x] 3.4 Remove the managed-install sentences from `.agents/skills/wong-sync/references/catch-up.md` and the `server/` clause from `references/payload-manifest.md`; verify the outside-the-inventory list still names every source-only piece that exists
- [x] 3.5 Remove the `server` area from `.agents/skills/memory/references/areas.json` and any `hosted-projects.md` or retired-spec path from other areas' `docs`; verify every path the file names exists

## 4. Wiki

- [x] 4.1 Delete `wiki/stack/hosted-projects.md` and rewrite `wiki/stack/README.md` and `wiki/stack/getting-started.md` for one route, as the design lists; verify the hub links every remaining page in `wiki/stack/`
- [x] 4.2 Edit `wiki/stack/customizing-wongstack.md`, `wiki/stack/cloudflare-access.md`, `wiki/stack/cloudflare-cli.md`, and `wiki/development/required-tools.md` as the design lists; verify no link to `server/README.md` remains under `wiki/`
- [x] 4.3 Edit *The gate* in `wiki/development/the-change-loop.md`, the Save line in `wiki/README.md`, and the cloud clause in `wiki/people/matthew-wong.md`; verify the `#the-gate` heading text is unchanged

## 5. CI and repo docs

- [x] 5.1 In `.github/workflows/payload.yml`, drop `server` from the lint paths, `server/*.sh` from the shell check, and the *Generated hosted starter checks* step; in `scripts/tests/.c8rc.json`, drop `server` from `src` and the `server/…` and `scripts/acceptance/…` globs from `include`, leaving both floors; verify no workflow names a deleted path
- [x] 5.2 Remove the `server/` row from `README.md` and `server/*.sh` from the command in `.github/CONTRIBUTING.md`; verify neither file names `server/`

## 6. Specs and release

- [x] 6.1 Edit the Purpose of `openspec/specs/install-onboarding/spec.md` to end at "through the normal workflow"; verify the Purpose names no server script
- [x] 6.2 Add the `## Next (major) — …` entry to `CHANGELOG.md` with the plain-words **Updating.** note from the design; verify `VERSION` is untouched
- [x] 6.3 Add the design's names to `scripts/retired-names.json`, each with a replacement and the frozen corpus files under `allow`; verify every `allow` path exists

## 7. Final verification

- [x] 7.1 Run `node scripts/check-payload-links.mjs`, `node scripts/check-openspec-config.mjs`, `node scripts/check-retired-names.mjs`, and `node scripts/measure-context.mjs --check`; fix what they name. The retired-name check may name only `openspec/specs/` lines this change's deltas remove; it is rerun clean after the archive reconciles them, before the publish checkpoint
- [x] 7.2 Run `node .github/scripts/loosened-checks.mjs --worktree`; add a `Check:` Decision-log bullet for any file it flags that the log does not name
- [x] 7.3 Run `git grep -n -i -E 'hosted-(delivery|context|projects|main)|server/(setup|README|install|agent|hosted)|managed (hosted|Artifacts|route|delivery|publication)' -- . ':!openspec/changes' ':!openspec/specs' ':!CHANGELOG.md' ':!scripts/tests/fixtures' ':!scripts/retired-names.json'`; verify it prints nothing, and again without the `openspec/specs` exclusion after the archive
- [x] 7.4 Run `openspec validate "remove-server-and-managed-hosting" --strict --no-interactive`; CI's script tests and coverage floor are read at the publish checkpoint, with no floor lowered

<!-- end tasks.md -->
<!-- file specs/cloudflare-hosted-projects/spec.md utf8 3360 -->
## REMOVED Requirements

### Requirement: Managed storage is the default for new hosted projects

**Reason:** wongstack.com no longer hosts projects, so the managed Cloudflare route has no user.
**Migration:** Install from your own computer through `/wong-setup`; `delivery-gate` and `install-onboarding` own the GitHub route.

### Requirement: Managed creation stays disabled pending live acceptance

**Reason:** wongstack.com no longer hosts projects, so the managed Cloudflare route has no user.
**Migration:** Install from your own computer through `/wong-setup`; `delivery-gate` and `install-onboarding` own the GitHub route.

### Requirement: Hosted setup preserves the project and its source identity

**Reason:** wongstack.com no longer hosts projects, so the managed Cloudflare route has no user.
**Migration:** Install from your own computer through `/wong-setup`; `delivery-gate` and `install-onboarding` own the GitHub route.

### Requirement: Hosted execution has no GitHub runtime dependency

**Reason:** wongstack.com no longer hosts projects, so the managed Cloudflare route has no user.
**Migration:** Install from your own computer through `/wong-setup`; `delivery-gate` and `install-onboarding` own the GitHub route.

### Requirement: Business content and exact previews stay private

**Reason:** wongstack.com no longer hosts projects, so the managed Cloudflare route has no user.
**Migration:** Install from your own computer through `/wong-setup`; `delivery-gate` and `install-onboarding` own the GitHub route.

### Requirement: Publication requires approval of the passing candidate

**Reason:** wongstack.com no longer hosts projects, so the managed Cloudflare route has no user.
**Migration:** Install from your own computer through `/wong-setup`; `delivery-gate` and `install-onboarding` own the GitHub route.

### Requirement: Published means provider, live identity and repository agree

**Reason:** wongstack.com no longer hosts projects, so the managed Cloudflare route has no user.
**Migration:** Install from your own computer through `/wong-setup`; `delivery-gate` and `install-onboarding` own the GitHub route.

### Requirement: Platform authority is isolated from customer commands

**Reason:** wongstack.com no longer hosts projects, so the managed Cloudflare route has no user.
**Migration:** Install from your own computer through `/wong-setup`; `delivery-gate` and `install-onboarding` own the GitHub route.

### Requirement: Operations have bounded uncertainty and finite cleanup

**Reason:** wongstack.com no longer hosts projects, so the managed Cloudflare route has no user.
**Migration:** Install from your own computer through `/wong-setup`; `delivery-gate` and `install-onboarding` own the GitHub route.

### Requirement: Internal functionality trials do not establish customer readiness

**Reason:** wongstack.com no longer hosts projects, so the managed Cloudflare route has no user.
**Migration:** Install from your own computer through `/wong-setup`; `delivery-gate` and `install-onboarding` own the GitHub route.

### Requirement: Internal staging access does not change billing

**Reason:** wongstack.com no longer hosts projects, so the managed Cloudflare route has no user.
**Migration:** Install from your own computer through `/wong-setup`; `delivery-gate` and `install-onboarding` own the GitHub route.

<!-- end specs/cloudflare-hosted-projects/spec.md -->
<!-- file specs/cloudflare-provisioning/spec.md utf8 920 -->
## REMOVED Requirements

### Requirement: Setup and the server installer provision the same way

**Reason:** The server installer is removed, so the shared script has one caller and the taken-name-on-a-server scenario goes.
**Migration:** Use "Setup provisions through one shared script" below; what setup creates and asks is unchanged.

## ADDED Requirements

### Requirement: Setup provisions through one shared script

`/wong-setup` SHALL create its Cloudflare resources, names, app config, memory store, and deploy token through one shared script, so every install is provisioned the same way and a fix reaches all of them. Setup SHALL keep its questions: which account when there are several, and one ask before anything billable.

#### Scenario: Setup provisions

- **WHEN** a person approves provisioning during `/wong-setup`
- **THEN** setup runs the shared script and reports what it created and what it reused

<!-- end specs/cloudflare-provisioning/spec.md -->
<!-- file specs/delivery-gate/spec.md utf8 4806 -->
## REMOVED Requirements

### Requirement: The gate is CI when present, else PR review

**Reason:** The managed Artifacts route is removed, and with it the scenario for unreadable hosted checks.
**Migration:** Use "CI is the gate when present, else PR review" below; the GitHub rule is unchanged.

### Requirement: Save checkpoints and never merges

**Reason:** The managed Artifacts route is removed, and with it the hosted checkpoint scenario.
**Migration:** Use "Save checkpoints without merging" below; the GitHub rule is unchanged.

### Requirement: Git verbs check their preconditions first

**Reason:** The managed Artifacts route is removed, and with it the private hosted handoff check.
**Migration:** Use "Git verbs check GitHub preconditions first" below; the GitHub checks are unchanged.

## ADDED Requirements

### Requirement: CI is the gate when present, else PR review

For a GitHub repository, `/ship` SHALL merge only when `/save`'s gate result is `SUCCESS` (checks passed) or `NONE` (the repo has no checks, so PR review is the gate); `UNKNOWN`, `TIMEOUT`, or `FAILURE` SHALL stop the merge. `/ship` SHALL NOT bypass, repeat, or reinterpret that result, and SHALL NOT start while the default branch's own checks are failing or unreadable.

#### Scenario: Checks fail on the branch

- **WHEN** a pushed commit's checks fail
- **THEN** the skill reads the failure and pushes a fix, at most three times
- **AND** `/ship` merges only once the checks pass

#### Scenario: The repo has no checks

- **WHEN** the repo has no CI workflow
- **THEN** `/save` reports `NONE` and `/ship` merges on PR review

### Requirement: Save checkpoints without merging

For GitHub repositories, `/save` SHALL commit, push, open or update the pull request, and wait on the gate, and SHALL NOT merge, force-push, or bypass hooks. The pull request body SHALL show the change's current Status, its exact task checklist, and review and preview links when they exist, and no live credential value SHALL reach a commit, fact, pull request, or report.

#### Scenario: A normal save

- **WHEN** `/save` runs on a branch with an active change
- **THEN** the pull request shows the current Status and checklist, and the report ends with one gate result

### Requirement: Git verbs check GitHub preconditions first

For GitHub repositories, `/save`, `/continue`, and `/ship` SHALL check that `gh` is signed in, an `origin` remote exists, and the `openspec` CLI runs, before any git or GitHub action. A failed check SHALL stop the verb with the command that fixes it, and a sign-in failure SHALL NOT be read as "no PR".

#### Scenario: gh is signed out

- **WHEN** `/save` runs and `gh` is not signed in
- **THEN** it stops before the push and says to run `gh auth login`

## MODIFIED Requirements

### Requirement: The gate reads the pushed commit

The check wait SHALL report on the commit just pushed and no other. For the GitHub route it SHALL report `NONE` only when the repo has no workflow files or no check appears within a grace period, and `UNKNOWN` when the check state cannot be read, so `/save` finishes unverified and `/ship` does not merge.

#### Scenario: The previous commit was green

- **WHEN** the previous commit's checks passed and the new commit's checks have not started
- **THEN** the wait does not report `SUCCESS`

### Requirement: Ship deletes the branch only after a confirmed merge

For GitHub repositories, `/ship` SHALL merge exactly the gated commit, confirm the merge, and retarget every open pull request based on the branch to the default branch before deleting it. When the merge fails, or the dependent pull requests cannot be listed, it SHALL keep the branch; a branch the forge already deleted SHALL be reported as deleted at merge, not as an error.

#### Scenario: A stacked pull request

- **WHEN** an open pull request uses the merged branch as its base
- **THEN** it is retargeted to the default branch before the delete, and the report names it

### Requirement: Every file edit takes the same route

Every save that changes a GitHub repository file SHALL take a feature branch, a pull request, and the gate, whatever paths or file types it changes. `/save` SHALL author an OpenSpec change only for code or a plan for code; a save with no change SHALL get a pull request body that describes the edit in plain words. A save whose only output is facts SHALL make no commit.

#### Scenario: A wiki-only save

- **WHEN** `/save` runs and the only changed file is a wiki page
- **THEN** it opens a pull request with a plain body and waits on the gate, with no OpenSpec change
- **AND** nothing is pushed to the default branch

#### Scenario: A facts-only save

- **WHEN** the session only produced facts
- **THEN** they go to the memory store with no commit, branch, or pull request

<!-- end specs/delivery-gate/spec.md -->
<!-- file specs/dependencies/spec.md utf8 1272 -->
## MODIFIED Requirements

### Requirement: Nothing is installed without consent

No skill SHALL install a runtime or tool without the person's consent, and a skill other than `/wong-setup` SHALL install one only when a step needs it. WongStack SHALL NOT install Paseo on a person's machine.

#### Scenario: A verb finds its tool missing

- **WHEN** `/verify` needs its browser CLI and it is absent
- **THEN** it installs the tool at that step and says so

### Requirement: A remote hand-over adds one tool

A hand-over through a private link SHALL be the one step that needs Cloudflare's tunnel tool. Setup SHALL offer it up front; on any other machine without it, the agent SHALL install it with the person's consent the first time a remote hand-over needs it. It SHALL add nothing to the repository, and a hand-over at the computer SHALL NOT need it.

#### Scenario: A first remote hand-over

- **WHEN** the person takes over from another device and the tunnel tool is absent
- **THEN** the agent asks before installing it on the machine, and adds nothing to the repo

#### Scenario: A machine readied by setup

- **WHEN** the person takes over the browser for the first time on a computer readied by setup
- **THEN** the link opens with no install step and no question

<!-- end specs/dependencies/spec.md -->
<!-- file specs/install-onboarding/spec.md utf8 7343 -->
## REMOVED Requirements

### Requirement: Setup readies the computer before it writes anything

**Reason:** Setup no longer looks for a hosted workspace first, so the Artifacts-handoff scenario goes.
**Migration:** Use "Setup readies the computer first" below; personal setup is unchanged.

### Requirement: A finished install is complete and recorded

**Reason:** The hosted starter is removed, so only the personal install remains to describe.
**Migration:** Use "A finished install is whole and recorded" below; the personal install is unchanged.

### Requirement: All installations enable Zero Trust automatically

**Reason:** The unattended server installer is removed, so `/wong-setup` is the only installation path.
**Migration:** Use "Setup enables Zero Trust automatically" below; interactive setup is unchanged.

### Requirement: The server script builds an agent workspace

**Reason:** The source no longer ships `server/setup.sh`; people run WongStack from their own computer.
**Migration:** None. The script remains in the repository history at version 30.10.0.

### Requirement: The server script leaves the host its paths

**Reason:** The source no longer ships `server/setup.sh` or a host contract for it.
**Migration:** None. The script and its guide remain in the repository history at version 30.10.0.

### Requirement: The server installer installs WongStack unattended

**Reason:** The source no longer ships an unattended installer; no host runs one.
**Migration:** Install through `/wong-setup`. The installer remains in the repository history at version 30.10.0.

### Requirement: The server installer keeps the host contract

**Reason:** The source no longer ships an unattended installer, so it has no host contract to keep.
**Migration:** None. The contract remains in the repository history at version 30.10.0.

### Requirement: A server rerun turns an open install private without publishing

**Reason:** The source no longer ships an unattended installer to rerun.
**Migration:** Add the card and follow the provisioning runbook's step for turning an open install private.

## ADDED Requirements

### Requirement: Setup readies the computer first

Before it clones the source or writes in the folder, setup SHALL ready the tools it needs, one GitHub sign-in with the `workflow` and `user:email` scopes, the git name and email, and on Windows real symbolic links, asking before each install; the person SHALL type no command. The same install question SHALL also cover the agent's browser tool and Cloudflare's tunnel tool when absent. Setup SHALL never install a package manager. A decline or failure SHALL stop setup with nothing written, except that a failed browser or tunnel install SHALL be reported and skipped, and an existing git identity SHALL stay unchanged.

#### Scenario: A new computer

- **WHEN** setup runs where tools, sign-in, and git identity are missing
- **THEN** it installs tools after asking, signs in through GitHub in the browser, and sets git identity from that account

#### Scenario: Sign-in not completed

- **WHEN** the person does not finish the GitHub approval
- **THEN** setup stops and has created no Cloudflare resource

#### Scenario: The helpers come with the one question

- **WHEN** setup runs where the browser tool and the tunnel tool are absent and the person says yes to its install question
- **THEN** both are installed, and no later step asks to install either

#### Scenario: A helper fails to install

- **WHEN** the browser tool or the tunnel tool fails to install during setup
- **THEN** setup names it, says it will be offered again at first need, and continues

### Requirement: A finished install is whole and recorded

A completed install SHALL leave the payload in a real `.agents/` folder with `.claude` and `.codex` links, the required wiki hubs, ignore rules for `.env*` and `.dev.vars*`, the memory skill and its session-start hooks, a provisioned memory store, and an install record `.claude/.wong-stack.json` naming the source version and commit.

#### Scenario: Install completes

- **WHEN** `/apply` finishes the install tasks with a token in `.env`
- **THEN** the repo has its install record, including the memory store, and the `/save` checkpoint follows

### Requirement: Setup enables Zero Trust automatically

`/wong-setup` SHALL enable Zero Trust for the workspace's production and staging sites, assets, APIs, mini apps, and previews without asking an enable-or-public question. The owner SHALL authenticate by a reachable email. Setup SHALL preserve memory-key authentication and SHALL NOT make business content public when protection is incomplete, with one exception: when Cloudflare withholds Zero Trust until the account has a payment method, `/wong-setup` SHALL finish with the site open without login and recommend the card afterwards as optional. A site that already has protection SHALL never open. A deliberately public surface requires a separately reviewed exception.

#### Scenario: Interactive setup

- **WHEN** a person installs WongStack through `/wong-setup`
- **THEN** setup automatically provisions protected hosting and does not ask whether to enable protection

#### Scenario: Setup cannot finish protection

- **WHEN** setup cannot finish its Zero Trust setup for a reason other than a missing payment method
- **THEN** setup reports the recoverable blocker without publishing public business content

#### Scenario: No card on a personal computer

- **WHEN** `/wong-setup` finds Zero Trust needs a payment method
- **THEN** setup finishes without stopping, and the closing report recommends the card and says what is missing without it

## MODIFIED Requirements

### Requirement: Setup waits for the Cloudflare token

Setup SHALL ask whether the person has the Cloudflare user token before anything is written, giving the pre-filled token link from the credentials page. With no token, it SHALL stop, write nothing, and say that running setup again continues. It SHALL NOT report memory or hosting working when none exists.

#### Scenario: No token yet

- **WHEN** a person starts setup without a token
- **THEN** setup writes nothing and gives the link that creates one

### Requirement: Easy setup honors a chosen source

When a person asks to install WongStack from a particular GitHub repository, fresh setup SHALL use that repository's version for the setup guidance, prerequisites, and installed payload, and the completed project's install record SHALL name the actual source repository, version, and commit. With no custom source requested, setup SHALL use the original WongStack repository. Setup SHALL retain its normal tools, hosting, and memory flow, and SHALL NOT install into the source checkout itself or silently substitute another repository when the requested source cannot be retrieved.

#### Scenario: Install a customized fork

- **WHEN** a person asks to install from their customized WongStack fork
- **THEN** the new project receives that fork's defaults and records that fork as its source through the usual easy setup
- **AND** the source checkout remains separate from the installed project

#### Scenario: Requested source cannot be retrieved

- **WHEN** the requested fork cannot be retrieved
- **THEN** setup reports the problem and does not install the original WongStack as a substitute

<!-- end specs/install-onboarding/spec.md -->
<!-- file specs/managed-workspace-access/spec.md utf8 2027 -->
## REMOVED Requirements

### Requirement: Managed installation receives the owner's verified email

**Reason:** No cloud service manages a workspace any more, so no membership is synchronized from one.
**Migration:** Setup creates the login wall and its policies; `cloudflare-provisioning` owns them, and the owner adds or removes people through the Access guide.

### Requirement: Cloud team emails determine human permissions

**Reason:** No cloud service manages a workspace any more, so no membership is synchronized from one.
**Migration:** Setup creates the login wall and its policies; `cloudflare-provisioning` owns them, and the owner adds or removes people through the Access guide.

### Requirement: Removal invalidates existing workspace sessions

**Reason:** No cloud service manages a workspace any more, so no membership is synchronized from one.
**Migration:** Setup creates the login wall and its policies; `cloudflare-provisioning` owns them, and the owner adds or removes people through the Access guide.

### Requirement: Membership synchronization survives failures and races

**Reason:** No cloud service manages a workspace any more, so no membership is synchronized from one.
**Migration:** Setup creates the login wall and its policies; `cloudflare-provisioning` owns them, and the owner adds or removes people through the Access guide.

### Requirement: The cloud management connection is restricted and private

**Reason:** No cloud service manages a workspace any more, so no membership is synchronized from one.
**Migration:** Setup creates the login wall and its policies; `cloudflare-provisioning` owns them, and the owner adds or removes people through the Access guide.

### Requirement: An open install reports its login is off

**Reason:** No cloud service manages a workspace any more, so no membership is synchronized from one.
**Migration:** Setup creates the login wall and its policies; `cloudflare-provisioning` owns them, and the owner adds or removes people through the Access guide.

<!-- end specs/managed-workspace-access/spec.md -->
<!-- file specs/paseo-defaults/spec.md utf8 1203 -->
## MODIFIED Requirements

### Requirement: Setup adds the owner's agent presets without overwriting
Setup SHALL add WongStack's agent presets to the machine's Paseo configuration when Paseo is installed and configured, then ask Paseo to reload it. A preset SHALL be added only when no existing preset has its id or its name, and only when its agent's command is installed. Every other setting and every existing preset SHALL stay unchanged. With Paseo absent or not yet configured, it SHALL change nothing and say so; a failure SHALL NOT stop the install.

#### Scenario: A machine with Claude only
- **WHEN** setup runs on a machine with Paseo and `claude` but no `codex`, and no presets
- **THEN** the two Claude presets are added, the two Codex presets are skipped as not installed, and the report names both

#### Scenario: A preset the person already has
- **WHEN** the person already has a preset named *[CLAUDE] Apply / Ship* using a different model
- **THEN** that preset is left exactly as it was and is reported as kept

#### Scenario: Run twice
- **WHEN** the presets step runs a second time on the same machine
- **THEN** the configuration file is unchanged and nothing is reported as added

<!-- end specs/paseo-defaults/spec.md -->
<!-- file specs/preserved-server-setup/spec.md utf8 583 -->
## REMOVED Requirements

### Requirement: Preservation setup fills missing tools without replacing existing work

**Reason:** The source no longer ships server setup, so there is no preservation mode to keep.
**Migration:** None. The preservation scripts remain in the repository history at version 30.10.0.

### Requirement: Project preparation preserves work and reports real readiness

**Reason:** The source no longer ships server setup, so there is no preservation mode to keep.
**Migration:** None. The preservation scripts remain in the repository history at version 30.10.0.

<!-- end specs/preserved-server-setup/spec.md -->
<!-- file specs/server-agent/spec.md utf8 1775 -->
## REMOVED Requirements

### Requirement: The source ships the server agent

**Reason:** The source no longer ships a server agent; no control plane sends it jobs.
**Migration:** None. The agent and its contract remain in the repository history at version 30.10.0.

### Requirement: The agent declares its contract and commit

**Reason:** The source no longer ships a server agent; no control plane sends it jobs.
**Migration:** None. The agent and its contract remain in the repository history at version 30.10.0.

### Requirement: The contract is written down

**Reason:** The source no longer ships a server agent; no control plane sends it jobs.
**Migration:** None. The agent and its contract remain in the repository history at version 30.10.0.

### Requirement: A running agent never changes itself

**Reason:** The source no longer ships a server agent; no control plane sends it jobs.
**Migration:** None. The agent and its contract remain in the repository history at version 30.10.0.

### Requirement: The agent keeps secrets and verification boundaries

**Reason:** The source no longer ships a server agent; no control plane sends it jobs.
**Migration:** None. The agent and its contract remain in the repository history at version 30.10.0.

### Requirement: A contract-2 agent asks for the open finish

**Reason:** The source no longer ships a server agent; no control plane sends it jobs.
**Migration:** None. The agent and its contract remain in the repository history at version 30.10.0.

### Requirement: The agent prepares projects with configured workspace identity

**Reason:** The source no longer ships a server agent; no control plane sends it jobs.
**Migration:** None. The agent and its contract remain in the repository history at version 30.10.0.

<!-- end specs/server-agent/spec.md -->
<!-- file .openspec.yaml utf8 66 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-10-04
retire_capabilities: true

~~~
<!-- end .openspec.yaml -->
<!-- file review.html utf8 39559 fence=~~~ -->
~~~html
<!-- wong-review:3 -->
<!doctype html>
<!--
  WongStack review kit. build-review.mjs writes the proposal as static HTML at the
  review:content marker and puts the change name in place of its token. The one
  script adds Note buttons, drawing fit and full screen, notes, drafts, and copy. It loads nothing from the network.
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Review · 2026-10-04-remove-server-and-managed-hosting</title>
<style>
  :root { --ink:#222; --muted:#5f5f5f; --line:#b5b5b5; --fill:#f3f3f3; }
  * { box-sizing:border-box; }
  html { -webkit-text-size-adjust:100%; }
  body { margin:0; padding-bottom:76px; background:#e6e6e6; color:var(--ink); font:16px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; overflow-wrap:anywhere; }
  main { max-width:700px; margin:0 auto; padding:0 12px; }
  a { color:inherit; }
  code, pre, .ln { font-family:ui-monospace, Menlo, Consolas, monospace; }
  code { background:var(--fill); border:1px solid #ddd; border-radius:3px; padding:0 3px; font-size:.88em; }
  :focus-visible { outline:3px solid #111; outline-offset:2px; }
  [hidden] { display:none !important; }
  header { padding:18px 0 4px; }
  .eyebrow { margin:0; color:var(--muted); font-size:13px; letter-spacing:.06em; text-transform:uppercase; }
  h1 { margin:2px 0 4px; font-size:22px; line-height:1.25; }
  .jump { display:flex; flex-wrap:wrap; gap:0 18px; margin:4px 0 0; padding:0; list-style:none; }
  .jump a { display:inline-block; padding:8px 0; }
  .hint, .muted { color:var(--muted); font-size:14px; margin:4px 0 0; }
  #script-error { color:#a00; font-weight:600; }
  section { margin:18px 0; scroll-margin-top:8px; }
  h2 { margin:0 0 8px; color:var(--muted); font-size:13px; letter-spacing:.08em; text-transform:uppercase; }
  .card { background:#fff; border:1px solid var(--line); border-radius:6px; padding:12px; margin:0 0 10px; }
  .card p { margin:0 0 10px; } .card p:last-child { margin-bottom:0; }
  .items, .decisions, .note-list { list-style:none; margin:0; padding:0; }
  .item { display:grid; grid-template-columns:26px minmax(0,1fr); gap:0 10px; overflow:hidden; }
  .item, .decision { scroll-margin-top:8px; }
  .num { flex:0 0 26px; height:26px; border-radius:50%; background:#d6d6d6; font-size:13px; font-weight:700; display:flex; align-items:center; justify-content:center; }
  .body { flex:1; min-width:0; }
  [data-note] { border-radius:3px; }
  [data-note]:hover, .noting { background:#f1f1f1; }
  .item > .drawing { position:relative; grid-column:1 / -1; margin:10px -12px 0; }
  .item > .drawing:last-child { margin-bottom:-12px; }
  .drawing summary { display:flex; align-items:center; gap:6px; min-height:44px; padding:0 12px; border-top:1px solid #ddd; color:var(--muted); font-size:14px; cursor:pointer; list-style:none; }
  .drawing summary::-webkit-details-marker { display:none; }
  .drawing summary::before { content:'\25B8'; display:inline-block; width:1em; }
  .drawing[open] summary::before { transform:rotate(90deg); }
  .drawing[open] .show, .drawing:not([open]) .hide { display:none; }
  .drawing .count { color:var(--ink); font-weight:600; }
  .frame { overflow:auto; border-top:1px solid var(--line); background:var(--fill); touch-action:pan-y; }
  .js .frame { overflow:hidden; cursor:zoom-in; }
  .art { display:block; width:max-content; margin:0; padding:.6em .8em; font-size:13px; line-height:1.2; white-space:pre; overflow-wrap:normal; }
  .art .pin { min-width:1.8em; min-height:1.6em; margin-left:.4em; padding:0 .5em; border-radius:.8em; font-size:.85em; line-height:1.5em; }
  .enlarge { position:absolute; top:6px; right:12px; min-height:32px; padding:2px 10px; font-size:13px; }
  .add { min-width:0; min-height:34px; margin-left:6px; padding:0 12px; border-color:#aaa; border-radius:17px; color:var(--muted); font-size:13px; vertical-align:middle; }
  .zoom { display:flex; align-items:center; gap:6px; }
  .zoom .level { margin-right:auto; color:var(--muted); font-size:13px; }
  #viewer { position:fixed; top:0; left:0; right:0; bottom:0; z-index:8; display:flex; flex-direction:column; background:#fff; }
  #viewer .zoom { flex:none; padding:calc(6px + env(safe-area-inset-top)) 12px 6px; border-bottom:1px solid var(--line); }
  #viewer .vframe { flex:1; min-height:0; overflow:auto; background:var(--fill); touch-action:pan-x pan-y; overscroll-behavior:contain; -webkit-overflow-scrolling:touch; }
  #viewer .vhint { flex:none; margin:0; padding:6px 12px calc(6px + env(safe-area-inset-bottom)); border-top:1px solid var(--line); color:var(--muted); font-size:13px; }
  body.viewing { overflow:hidden; }
  .meta { margin:0 0 4px !important; color:var(--muted); font-size:13px; }
  .tag { display:inline-block; margin-right:8px; padding:0 8px; border:1px solid #777; border-radius:10px; background:#fff; color:var(--ink); font-size:12px; font-weight:700; }
  .tag.assumed { border-style:dashed; }
  .tag.check { border:2px dotted #333; }
  .hit { outline:3px solid #888; outline-offset:3px; }
  button { font:inherit; font-size:14px; min-width:40px; min-height:40px; padding:4px 12px; border:1px solid #777; border-radius:4px; background:#fff; color:var(--ink); cursor:pointer; }
  button.primary { background:#333; border-color:#333; color:#fff; }
  button:disabled { opacity:.45; cursor:default; }
  .pin { min-width:24px; min-height:24px; margin-left:6px; padding:0 7px; border-radius:12px; background:#333; border-color:#333; color:#fff; font:700 12px/22px system-ui, sans-serif; vertical-align:middle; }
  .pin.draft { background:#fff; color:var(--ink); border-style:dashed; }
  .entry { display:block; width:100%; margin:0 0 8px; padding:8px 10px; text-align:left; }
  .entry .where { display:block; color:var(--muted); font-size:13px; }
  .entry .tag { margin:0 0 0 6px; }
  #chip { position:absolute; z-index:9; box-shadow:0 2px 8px rgba(0,0,0,.3); }
  #editor { position:absolute; z-index:6; width:260px; padding:10px; background:#fff; border:2px solid #333; border-radius:6px; box-shadow:0 4px 16px rgba(0,0,0,.25); }
  #editor.docked { position:fixed; left:0; right:0; bottom:0; width:auto; display:flex; flex-direction:column; overflow:auto; border-width:2px 0 0; border-radius:0; padding:8px 12px max(8px, env(safe-area-inset-bottom)); }
  #editor.docked .where { flex:none; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  #editor.docked textarea { flex:1 1 auto; min-height:44px; }
  #editor.docked .row { flex:none; }
  #editor .where { margin:0 0 6px; color:var(--muted); font-size:13px; }
  #editor .moved { margin:0 0 6px; font-size:13px; font-weight:600; }
  #editor textarea { display:block; width:100%; min-height:76px; padding:6px 8px; border:1px solid #777; border-radius:4px; font:16px/1.4 system-ui, sans-serif; resize:vertical; }
  #editor .row { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
  .bar { position:fixed; left:0; right:0; bottom:0; z-index:4; display:flex; align-items:center; gap:10px; padding:8px 12px calc(8px + env(safe-area-inset-bottom)); background:#fff; border-top:1px solid var(--line); }
  .bar .note-count { margin-right:auto; font-size:14px; }
  body.docked .bar, body.viewing .bar { display:none; }
  .session, #editor .copies { color:var(--muted); font-size:13px; }
  #editor .copies { flex:none; margin:6px 0 0; }
  #toast { position:fixed; left:50%; bottom:72px; z-index:7; max-width:90vw; transform:translateX(-50%); padding:6px 12px; border-radius:4px; background:#222; color:#fff; font-size:14px; opacity:0; pointer-events:none; transition:opacity .2s; }
  #toast.show { opacity:1; }
  #copybuf { position:fixed; left:0; top:0; width:1px; height:1px; opacity:0; pointer-events:none; }
</style>
</head>
<body data-change="2026-10-04-remove-server-and-managed-hosting">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-10-04-remove-server-and-managed-hosting</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. Saving a note copies all your notes. Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">WongStack now has one way in: you run it from your own computer, with your own GitHub and Cloudflare accounts. wongstack.com becomes a landing page only, so the parts of this repo that existed to serve it, or to set up a rented server, have no one left to use them. Left in place they keep costing: every change is checked against them, and the guides describe a route nobody can take.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>One way in, not three.</b> The repo stops carrying the server setup and the wongstack.com-managed route. Installing from your own computer through GitHub works exactly as it does today.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-1-line-1" tabindex="0">      BEFORE                    AFTER</span>
<span class="ln" data-note="item-1-line-2" tabindex="0">your computer ─▶ GitHub   your computer ─▶ GitHub</span>
<span class="ln" data-note="item-1-line-3" tabindex="0">wongstack.com ─▶ managed</span>
<span class="ln" data-note="item-1-line-4" tabindex="0">your server ─▶ setup</span></pre></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>The server folder goes.</b> <b>BREAKING</b> for anyone who sets up servers from it: the script that turns a fresh server into a workspace, the helper that runs on that server, and the installer it used all leave the repo. They stay in the repo's history at version 30.10.0 for anyone who needs them.</div></div></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>Saving and publishing stop looking for a managed workspace.</b> Setup, save, publish and resume no longer check first whether the project is hosted by wongstack.com. They go straight to the GitHub steps they already use.</div></div></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>The guides describe one route.</b> Getting started, the stack overview and the change-loop page drop the managed route, and the managed-projects page is removed. Nothing in them promises a hosted service.</div></div></li>
<li class="item card" id="item-5"><span class="num">5</span><div class="body"><div class="text" data-note="item-5" tabindex="0"><b>The automatic checks get lighter.</b> The checks no longer build a hosted starter or test the server pieces, so about fifteen test files leave and each check run has less to do.</div></div></li>
<li class="item card" id="item-6"><span class="num">6</span><div class="body"><div class="text" data-note="item-6" tabindex="0"><b>Installed projects lose nothing they used.</b> Managed hosting was never switched on for anyone. The next update of an installed project removes the unused pieces and asks for nothing.</div></div></li>
</ol>
<p class="aside"><b>Non-goals:</b> Moving the landing page into this repo. Shutting down the wongstack.com app, its servers, or its keys. The new route that keeps a project in your own Cloudflare account. Rewriting the changelog's history or archived plans. Changing how setup creates your site, database, memory, or login wall.</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-04</p>Asked what stays of the server and managed hosting → chose none of it: &quot;None of it should be in this repo for now.&quot; wongstack.com becomes a landing page and people run WongStack from their own computer.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-04</p>Asked whether the GitHub route changes → chose it stays exactly as it is.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: the script setup uses to create your Cloudflare site keeps every behavior, the open-until-you-add-a-card finish included, because interactive setup uses the same option; only its comments named the server installer.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: the checks' option that only lists which checks apply stays, because it holds nothing about hosting and the own-account Artifacts part may call it; only one test's title changes.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: this is a major release, because a fork that sets up servers from the server folder loses it; an installed project on GitHub has nothing to do.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: the frozen sample documents used to test search keep their old wording, because they are fixed snapshots whose content the tests pin.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: publishing this before wongstack.com is shut down breaks no running server, because the server guide has each host copy the source at a fixed earlier version, which stays in history. How the wongstack.com app pins it was not checked in its own repo.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: the line on Matthew's page that prefers a sign-in service &quot;hosted inside WongStack cloud&quot; loses that clause, because that cloud is going; his wish for free, generic connections stays.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: the example &quot;a computer with no recent chats, such as a hosted server&quot; stays, because it describes any server, not the managed service.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-04</p>Check: <code>scripts/tests/server-agent-contract.test.mjs</code>, <code>scripts/tests/server-agent-copy.test.mjs</code>, <code>scripts/tests/server-agent-management.test.mjs</code>, <code>scripts/tests/server-agent-roll.test.mjs</code>, <code>scripts/tests/server-agent-runtime.test.mjs</code>, <code>scripts/tests/server-agent-source.test.mjs</code>, <code>scripts/tests/server-agent.test.mjs</code>, <code>scripts/tests/server-install.test.mjs</code>, <code>scripts/tests/server-preservation.test.mjs</code>, <code>scripts/tests/server-project.test.mjs</code>, <code>scripts/tests/server-setup.test.mjs</code> are deleted, because the server code they test is deleted with them. The one test in them that guards something else, that every place naming the OpenSpec version agrees, moves to <code>scripts/tests/update-dependencies.test.mjs</code>.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-04</p>Check: <code>scripts/tests/hosted-acceptance-evidence.test.mjs</code>, <code>scripts/tests/hosted-bootstrap.test.mjs</code>, <code>scripts/tests/hosted-delivery.test.mjs</code>, <code>scripts/tests/hosted-starter.test.mjs</code> are deleted, because the managed-hosting code they test is deleted with them.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-04</p>Check: <code>.github/workflows/payload.yml</code> drops the hosted-starter step and the <code>server</code> paths from its lint and shell checks, because those files are gone; every other check stays.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-04</p>Check: <code>scripts/tests/.c8rc.json</code> stops measuring <code>server/</code> and <code>scripts/acceptance/</code>, which no longer exist; the coverage floors stay where they are.</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed while building: a few leftover mentions the design did not list go too, because no live file should name the server or the managed route. They are the fourth &quot;server setup script&quot; clause and the Paseo sentence on the required-tools page, the &quot;on a hosted server&quot; sentence on the login-wall page, one test's failure message, one test helper's comment, the dependency test's title (three pins, not five), and one line of the revision-check notes. Nothing behaves differently.</li>
<li class="decision card" id="decision-15" data-note="decision-15" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: the retired-name check and the leftover search are confirmed again after the plan is archived, because archiving is what rewrites the main specs; the automatic checks' result is read at the publish checkpoint, not ticked as a build task.</li>
<li class="decision card" id="decision-16" data-note="decision-16" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>Archive checkpoint: built, archived and numbered 31.0.0; the retired-name check, the leftover search, the link check and spec validation pass against the reconciled specs.</li>
</ol>
</section>
<section id="notes" aria-labelledby="notes-h"><h2 id="notes-h">Your notes</h2>
<p class="session" hidden>Storage is off. Notes and drafts last for this session only.</p>
<ul class="note-list" id="note-list"></ul>
</section>
</main>
<button type="button" id="chip" hidden>Add note</button>
<div id="editor" role="dialog" aria-labelledby="editor-where" hidden>
  <p class="where" id="editor-where"></p>
  <p class="moved">Possibly moved: its text changed, so this note is not attached.</p>
  <textarea aria-label="Note text" rows="3" placeholder="A question or a change"></textarea>
  <div class="row"><button type="button" class="primary" data-act="save">Save</button><button type="button" data-act="discard">Discard</button><button type="button" data-act="delete">Delete note</button><button type="button" data-act="close">Close</button></div>
  <p class="copies">Saving a note copies all your notes.</p>
  <p class="session" hidden>Notes last for this session only.</p>
</div>
<div id="viewer" role="dialog" aria-modal="true" aria-label="Drawing, full screen" hidden>
  <div class="zoom"><span class="level"></span><button type="button" aria-label="Zoom out">−</button><button type="button">Fit</button><button type="button" aria-label="Zoom in">+</button><button type="button" class="primary">Close</button></div>
  <div class="vframe"></div>
  <p class="vhint">Drag to move · pinch or + to zoom · tap a line to note it</p>
</div>
<div class="bar"><span class="note-count" aria-live="polite">0 notes</span><span class="session" hidden>Session only</span><button type="button" class="primary" id="copy">Copy notes</button></div>
<div id="toast" role="status"></div>
<textarea id="copybuf" aria-hidden="true" tabindex="-1" readonly></textarea>
<script>
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  window.addEventListener('error', function (e) {
    $('script-error').hidden = false;
    $('script-error').textContent = 'Review script error: ' + e.message + ' (line ' + e.lineno + ')';
  });
  const root = document.documentElement;
  root.classList.add('js');
  const CHANGE = document.body.getAttribute('data-change');
  const KEY = 'wong-review3:' + CHANGE;
  const phone = window.matchMedia ? window.matchMedia('(max-width: 700px)') : { matches: false };
  const chip = $('chip'), editor = $('editor'), ta = editor.querySelector('textarea');
  const viewer = $('viewer'), vframe = viewer.querySelector('.vframe'), vbar = viewer.querySelector('.zoom'), vb = vbar.querySelectorAll('button');
  const all = function (sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); };
  const esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };

  // ── storage: a refused store keeps notes for this session ──
  let store = null, data = { notes: [], drafts: {} };
  const ok = function (r, id) { return r && typeof r.label === 'string' && typeof r.text === 'string' && /^[\w-]+$/.test(id); };
  try { store = window.localStorage; store.getItem(KEY); } catch (e) { store = null; }
  try {
    const saved = store ? JSON.parse(store.getItem(KEY) || 'null') : null;
    if (saved && Array.isArray(saved.notes)) data.notes = saved.notes.filter(function (n) { return ok(n, n && n.id); });
    if (saved && saved.drafts) Object.keys(saved.drafts).forEach(function (id) { if (ok(saved.drafts[id], id)) data.drafts[id] = saved.drafts[id]; });
  } catch (e) { /* unreadable notes start empty */ }
  function persist() {
    if (store) { try { store.setItem(KEY, JSON.stringify(data)); } catch (e) { store = null; } }
    render();
  }

  // ── targets: a data-note id names its location; the label pins a note to its text ──
  function where(id) {
    const m = /^(why|item|decision)-(\d+)(?:-line-(\d+))?$/.exec(id) || [];
    if (m[1] === 'why') return { at: '#/why', kind: 'paragraph ' + m[2], spot: 'Why, paragraph ' + m[2] };
    if (m[1] === 'item') return { at: '#/' + m[2], kind: m[3] ? 'drawing line ' + m[3] : 'item', spot: 'Change #' + m[2] + (m[3] ? ', drawing line ' + m[3] : '') };
    return { at: '#/decisions/' + m[2], kind: 'decision', spot: 'Decision #' + m[2] };
  }
  function labelOf(el) {
    const c = el.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll('.pin, .meta, .add'), function (n) { n.parentNode.removeChild(n); });
    const text = c.textContent.replace(/\s+/g, ' ').trim();
    return where(el.getAttribute('data-note')).kind + ' "' + (text.length > 60 ? text.slice(0, 59) + '…' : text) + '"';
  }
  function find(id, label) {
    const el = document.querySelector('[data-note="' + id + '"]');
    return el && labelOf(el) === label ? el : null;
  }
  function noteOf(id) { return data.notes.filter(function (n) { return n.id === id; })[0] || null; }

  // ── render pins, Note buttons, counts, and the notes list ──
  function render() {
    all('.pin, .add', function (p) { p.parentNode.removeChild(p); });
    const n = data.notes.length, d = Object.keys(data.drafts).length;
    const count = plural(n) + (d ? ' · ' + d + (d === 1 ? ' draft' : ' drafts') : '');
    all('.note-count', function (el) { el.textContent = count; });
    all('.session', function (el) { el.hidden = !!store; });
    const ids = data.notes.map(function (x) { return x.id; }).concat(Object.keys(data.drafts).filter(function (id) { return !noteOf(id); }));
    $('note-list').innerHTML = ids.length ? '' : '<li class="muted">No notes yet.</li>';
    ids.forEach(function (id) {
      const note = noteOf(id), draft = data.drafts[id], rec = note || draft, num = note ? data.notes.indexOf(note) + 1 : 0;
      const el = find(id, rec.label);
      if (el) {
        const pin = document.createElement('button');
        pin.type = 'button'; pin.className = draft ? 'pin draft' : 'pin'; pin.setAttribute('data-open', id);
        pin.textContent = (num || '') + (num && draft ? ' · ' : '') + (draft ? 'Draft' : '');
        pin.setAttribute('aria-label', (num ? 'Open note ' + num : 'Open draft') + (num && draft ? ' and its draft' : ''));
        el.appendChild(pin);
      }
      const li = document.createElement('li');
      li.innerHTML = '<button type="button" class="entry" data-open="' + id + '"><span class="where">' + (num ? num + '. ' : '')
        + esc(where(id).at + ' · ' + rec.label) + (draft ? '<span class="tag">Draft</span>' : '') + (el ? '' : '<span class="tag">possibly moved</span>')
        + '</span>' + esc(draft ? draft.text : note.text) + '</button>';
      $('note-list').appendChild(li);
    });
    all('[data-note]', function (el) {
      if (el.closest('.art') || el.querySelector('.pin')) return;
      const id = el.getAttribute('data-note'), add = document.createElement('button');
      add.type = 'button'; add.className = 'add'; add.setAttribute('data-open', id);
      add.textContent = '+ Note'; add.setAttribute('aria-label', 'Note on ' + where(id).kind);
      el.appendChild(add);
    });
    drawings.forEach(function (d) {
      const k = d.art.querySelectorAll('.pin').length;
      d.count.textContent = k ? ' · ' + k + (k === 1 ? ' note' : ' notes') : '';
      fit(d);
    });
  }

  // ── still-tap to note: a mouse on text, or any pointer on a full-screen drawing line, shows the chip ──
  let chipFor = null, tap = null;
  const pointers = {};
  function showChip(el, x, y, keyboard) {
    const id = el.getAttribute('data-note');
    chipFor = el;
    chip.textContent = noteOf(id) || data.drafts[id] ? 'Edit note' : 'Add note';
    chip.hidden = false;
    const w = chip.offsetWidth, vw = root.clientWidth;
    chip.style.left = Math.max(8, Math.min(x - w / 2, vw - w - 8)) + window.pageXOffset + 'px';
    chip.style.top = y + 12 + window.pageYOffset + 'px';
    if (keyboard) chip.focus({ preventScroll: true });
  }
  function hideChip() { chip.hidden = true; chipFor = null; }
  document.addEventListener('pointerdown', function (e) {
    if (e.isPrimary) Object.keys(pointers).forEach(function (k) { delete pointers[k]; });
    pointers[e.pointerId] = true;
    tap = Object.keys(pointers).length === 1 && e.button === 0 ? { id: e.pointerId, x: e.clientX, y: e.clientY, t: Date.now(), target: e.target } : null;
  });
  document.addEventListener('pointermove', function (e) {
    if (tap && e.pointerId === tap.id && Math.abs(e.clientX - tap.x) + Math.abs(e.clientY - tap.y) > 8) tap = null;
  });
  document.addEventListener('pointercancel', function (e) { delete pointers[e.pointerId]; tap = null; });
  document.addEventListener('pointerup', function (e) {
    const t = tap;
    delete pointers[e.pointerId]; tap = null;
    if (!t || t.id !== e.pointerId || Date.now() - t.t > 500) return;
    if (t.target.closest('a, button, input, textarea, select, label, summary, #editor')) return;
    const el = t.target.closest('[data-note]');
    const offer = el && (el.closest('#viewer') || (e.pointerType === 'mouse' && !el.closest('.frame')));
    if (offer) showChip(el, e.clientX, e.clientY, false); else hideChip();
  });
  chip.addEventListener('click', function () { if (chipFor) openEditor(chipFor.getAttribute('data-note'), chipFor); });
  document.addEventListener('click', function (e) {
    const t = e.target.closest ? e.target.closest('[data-open]') : null;
    if (!t) return;
    const id = t.getAttribute('data-open'), rec = data.drafts[id] || noteOf(id), el = rec ? find(id, rec.label) : t.closest('[data-note]');
    if (el && t.classList.contains('entry')) { reveal(el); el.scrollIntoView({ block: 'center' }); }
    openEditor(id, el);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (open) closeEditor(true);
      else if (chipFor) { const el = chipFor; hideChip(); el.focus(); }
      else if (view) closeViewer(true);
    } else if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-note]')) {
      e.preventDefault();
      const r = e.target.getBoundingClientRect();
      showChip(e.target, r.left + 48, r.top + Math.min(r.height, 24), true);
    }
  });

  // ── the editor: beside its target on a desktop, docked at the bottom of the visible screen on a phone ──
  let open = null;
  function openEditor(id, el) {
    closeViewer(false); closeEditor(false); hideChip();
    if (el) reveal(el);
    const note = noteOf(id), draft = data.drafts[id];
    const label = draft ? draft.label : note ? note.label : labelOf(el);
    open = { id: id, label: label, el: el };
    $('editor-where').textContent = where(id).at + ' · ' + label;
    editor.querySelector('.moved').hidden = !!el;
    editor.querySelector('[data-act="delete"]').hidden = !note;
    ta.value = draft ? draft.text : note ? note.text : '';
    editor.hidden = false;
    if (el) el.classList.add('noting');
    place();
    ta.focus({ preventScroll: editor.classList.contains('docked') });
  }
  function closeEditor(restore) {
    if (!open) return;
    const el = open.el;
    open = null; editor.hidden = true;
    document.body.classList.remove('docked'); document.body.style.paddingBottom = '';
    if (el) { el.classList.remove('noting'); if (restore) el.focus({ preventScroll: true }); }
  }
  function place() {
    const docked = phone.matches || !open.el;
    editor.classList.toggle('docked', docked);
    document.body.classList.toggle('docked', docked);
    editor.style.left = editor.style.top = editor.style.bottom = editor.style.maxHeight = '';
    if (docked) {
      dock();
      document.body.style.paddingBottom = editor.offsetHeight + 24 + 'px';
      keepVisible();
      return;
    }
    const r = open.el.getBoundingClientRect(), w = editor.offsetWidth, vw = root.clientWidth;
    let left = r.right + 12, top = r.top;
    if (left + w > vw - 8) { left = Math.max(8, Math.min(r.left, vw - w - 8)); top = r.bottom + 8; }
    editor.style.left = left + window.pageXOffset + 'px';
    editor.style.top = top + window.pageYOffset + 'px';
  }
  // The visible screen: a phone keyboard shrinks it, and a host app may shrink the page too, so place from its top.
  function screen() {
    const vv = window.visualViewport;
    return vv ? { top: vv.offsetTop, h: vv.height } : { top: 0, h: window.innerHeight };
  }
  function dock() {
    if (!open || !editor.classList.contains('docked')) return;
    const s = screen();
    editor.style.maxHeight = s.h + 'px';
    editor.style.bottom = 'auto';
    editor.style.top = s.top + Math.max(0, s.h - editor.offsetHeight) + 'px';
  }
  function keepVisible() {
    if (!open || !open.el) return;
    const r = open.el.getBoundingClientRect(), s = screen(), limit = s.top + s.h - editor.offsetHeight - 8;
    if (r.bottom > limit) window.scrollBy(0, Math.min(r.top - s.top - 8, r.bottom - limit));
  }
  let seen = screen().h;
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', function () {
      const h = screen().h, keyboard = Math.abs(h - seen) > 100;
      seen = h; dock();
      if (keyboard) keepVisible();
    });
    window.visualViewport.addEventListener('scroll', dock);
  }
  ta.addEventListener('input', function () {
    if (!open) return;
    const note = noteOf(open.id), text = ta.value;
    if (!text.trim() || (note && text === note.text)) delete data.drafts[open.id];
    else data.drafts[open.id] = { label: open.label, text: text };
    persist();
  });
  editor.addEventListener('click', function (e) {
    const act = e.target.getAttribute('data-act');
    if (!act || !open) return;
    const id = open.id, note = noteOf(id), text = ta.value.trim();
    if (act === 'save') {
      if (!text) { ta.focus(); return; }
      if (note) note.text = text; else data.notes.push({ id: id, label: open.label, text: text });
    }
    if (act === 'delete') data.notes = data.notes.filter(function (n) { return n.id !== id; });
    if (act !== 'close') delete data.drafts[id];
    closeEditor(true); persist();
    if (act === 'save') {
      const n = data.notes.length;
      copyNotes(function () { toast('Saved and copied ' + plural(n) + '. Paste them into chat.'); },
        function () { toast('Saved. Tap Copy notes to copy them.'); });
    }
  });

  // ── drawings: fitted by font size on the page; a tap shows one full screen, where it zooms and scrolls natively ──
  const BASE = 13, drawings = [];
  let view = null;
  const V = { f: BASE, lo: BASE, hi: BASE };
  function size(art, f, max) {
    art.style.fontSize = f + 'px';
    for (let i = 0; i < 3 && art.offsetWidth > max; i += 1) { f *= max / art.offsetWidth; art.style.fontSize = f + 'px'; }
    return f;
  }
  function fit(d) {
    if (!d.fig.open || view === d) return;
    d.art.style.fontSize = BASE + 'px';
    const w = d.art.offsetWidth, fw = d.frame.clientWidth - 1;
    if (w > 0 && fw > 0) size(d.art, BASE * Math.min(1.25, fw / w), fw);
  }
  function reveal(el) {
    const fig = el.closest('details');
    if (fig && !fig.open) { fig.open = true; drawings.forEach(fit); }
  }
  function scale(f, cx, cy) {
    f = Math.max(V.lo, Math.min(V.hi, f));
    const k = f / V.f, x = (vframe.scrollLeft + cx) * k - cx, y = (vframe.scrollTop + cy) * k - cy;
    V.f = f; view.art.style.fontSize = f + 'px';
    vframe.scrollLeft = x; vframe.scrollTop = y;
    const atFit = f <= V.lo * 1.001;
    vbar.firstChild.textContent = (atFit ? 'Fit · ' : '') + Math.round(f / BASE * 100) + '%';
    vb[0].disabled = atFit; vb[2].disabled = f >= V.hi * 0.999;
  }
  function openViewer(d) {
    hideChip();
    view = d; viewer.hidden = false; document.body.classList.add('viewing');
    vframe.appendChild(d.art);
    d.art.style.fontSize = BASE + 'px';
    const fw = vframe.clientWidth - 1;
    V.lo = size(d.art, BASE * fw / Math.max(1, d.art.offsetWidth), fw);
    V.hi = Math.max(V.lo * 4, 40); V.f = V.lo;
    vframe.scrollLeft = vframe.scrollTop = 0;
    scale(V.lo, 0, 0);
    vb[3].focus({ preventScroll: true });
  }
  function closeViewer(restore) {
    if (!view) return;
    const d = view;
    view = null;
    d.frame.insertBefore(d.art, d.frame.firstChild);
    viewer.hidden = true; document.body.classList.remove('viewing');
    fit(d);
    if (restore) d.enlarge.focus({ preventScroll: true });
  }
  vbar.addEventListener('click', function (e) {
    const i = Array.prototype.indexOf.call(vb, e.target);
    if (i === 3) closeViewer(true);
    else if (i >= 0) scale([V.f / 1.25, V.lo, V.f * 1.25][i], vframe.clientWidth / 2, vframe.clientHeight / 2);
  });
  vframe.addEventListener('wheel', function (e) {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const r = vframe.getBoundingClientRect();
    scale(V.f * (e.deltaY < 0 ? 1.1 : 1 / 1.1), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });
  // One finger scrolls natively; two fingers pinch around their midpoint.
  let pinch = null;
  const span = function (t) { return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY) || 1; };
  vframe.addEventListener('touchstart', function (e) { if (e.touches.length === 2) pinch = { f: V.f, dist: span(e.touches) }; }, { passive: true });
  vframe.addEventListener('touchmove', function (e) {
    if (!pinch || e.touches.length !== 2) return;
    if (e.cancelable) e.preventDefault();
    const r = vframe.getBoundingClientRect(), t = e.touches;
    scale(pinch.f * span(t) / pinch.dist, (t[0].clientX + t[1].clientX) / 2 - r.left, (t[0].clientY + t[1].clientY) / 2 - r.top);
  }, { passive: false });
  vframe.addEventListener('touchend', function (e) { if (e.touches.length < 2) pinch = null; });
  document.addEventListener('gesturestart', function (e) { if (view) e.preventDefault(); });
  all('.drawing', function (fig) {
    const frame = fig.querySelector('.frame'), enlarge = document.createElement('button');
    enlarge.type = 'button'; enlarge.className = 'enlarge'; enlarge.textContent = 'Full screen';
    frame.appendChild(enlarge);
    const d = { fig: fig, frame: frame, art: fig.querySelector('.art'), count: fig.querySelector('.count'), enlarge: enlarge };
    drawings.push(d);
    fig.addEventListener('toggle', function () { fit(d); });
    frame.addEventListener('click', function (e) { if (!e.target.closest('[data-open]')) openViewer(d); });
  });

  // ── direct links: #/why, #/<n>, #/decisions/<n> ──
  function jump() {
    const m = /^#\/(?:decisions\/(\d+)|(\d+)|(why|changes|decisions))$/.exec(location.hash);
    const el = m ? $(m[1] ? 'decision-' + m[1] : m[2] ? 'item-' + m[2] : m[3]) : null;
    if (!el) return;
    all('.hit', function (n) { n.classList.remove('hit'); });
    el.classList.add('hit');
    el.scrollIntoView({ block: 'start' });
  }

  // ── copy: saved notes only, as notes on the plan: each asks or changes something ──
  function notesText() {
    const lines = ['Notes on the plan ' + CHANGE + ' from the review page. Don\'t build yet.'];
    data.notes.forEach(function (n) {
      const w = where(n.id);
      lines.push('- ' + w.spot + ' (' + n.label.slice(w.kind.length + 1) + '): ' + n.text.replace(/\s*\n\s*/g, ' '));
    });
    return lines.join('\n');
  }
  function toast(text) {
    $('toast').textContent = text; $('toast').classList.add('show');
    setTimeout(function () { $('toast').classList.remove('show'); }, 2000);
  }
  function plural(n) { return n + (n === 1 ? ' note' : ' notes'); }
  // One routine for Copy notes and Save: the Clipboard API, else select #copybuf and execCommand, then hand focus back.
  function copyNotes(done, failed) {
    const buf = $('copybuf');
    buf.value = notesText();
    const fallback = function () {
      const back = document.activeElement;
      buf.select();
      const ok = document.execCommand('copy');
      if (back && back !== buf && back.focus) back.focus({ preventScroll: true });
      if (ok) done(); else failed();
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(buf.value).then(done, fallback); else fallback();
  }
  $('copy').addEventListener('click', function () {
    const n = data.notes.length;
    if (!n) { toast('No saved notes yet. Drafts are not copied.'); return; }
    copyNotes(function () { toast('Copied ' + plural(n) + '. Paste them into chat.'); },
      function () { toast('Copy failed. Copy the notes list by hand.'); });
  });

  let width = root.clientWidth;
  window.addEventListener('resize', function () {
    if (root.clientWidth !== width) {
      width = root.clientWidth; hideChip();
      if (view) { const d = view; closeViewer(false); openViewer(d); }
    }
    drawings.forEach(fit);
    if (open) place();
  });
  window.addEventListener('hashchange', jump);
  render();
  jump();
}());
</script>
</body>
</html>

~~~
<!-- end review.html -->
