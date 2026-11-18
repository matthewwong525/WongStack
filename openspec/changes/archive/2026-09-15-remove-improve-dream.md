<!-- openspec-archive v1 2026-09-15-remove-improve-dream -->
<!-- file proposal.md utf8 4057 -->
# Retire the improve and dream skills

**Status:** ready-to-ship
**Open questions:** none

## Why

`/improve` and `/dream` add two large, separate workflows that are rarely used and overlap the normal `/explore` → `/plan` path and explicit wiki work. The unused consolidation lifecycle also leaves every saved note waiting for a later step that does not happen.

## What Changes

- **BREAKING:** Remove the `improve` and `dream` skill directories from WongStack and from the core payload, setup checks, command lists, and examples. (review.html#/retired-skills/removal)
- Keep session notes as permanent context for `/continue`, but remove the `consolidated:` watermark and every promise of automatic note-to-wiki consolidation. Wiki edits become explicit work governed by the existing wiki rules. (review.html#/notes-lifecycle/permanent)
- Update `/wong-sync` so an upgrade proposes removal of provably unmodified retired skill copies, preserves locally changed copies as local skills, and removes both names from the managed skills list. (review.html#/sync-retirement/safe-retire)
- Remove current specifications that exist only for the retired workflows, revise the specifications that refer to them, and remove the empty `improve-openspec-plans` scaffold. (review.html#/current-specs/spec-cleanup)
- Release the command removal as WongStack 14.0.0, keep historical archives and changelog entries unchanged, and run the payload link check. (review.html#/release/major)

**Non-goals:** Do not move either workflow into `/save`, `/ship`, or another skill. Do not delete existing session notes or rewrite historical OpenSpec archives and changelog entries.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `agent-knowledge-center`: Present durable notes and explicit wiki work without `/dream` or `/improve`.
- `delivery-gate`: Keep the prose allowlist while removing workflow-specific examples and references.
- `improve-plan-output`: Remove the retired audit-and-plan contract.
- `session-notes`: Make notes permanent cold-resume context with no consolidation state or consumer.
- `toolchain-dependencies`: Remove both retired commands from the core-verb inventory.
- `wiki-root`: Remove compatibility requirements that exist only for `/dream` and `/improve docs`.
- `wong-sync`: Retire both skills safely from future installs and existing managed installations.

## Impact

This changes the payload under `.agents/` (and therefore `.claude/`), the setup and sync runbooks, `AGENTS.md`, `README.md`, `notes/README.md`, the wiki process pages, current OpenSpec specifications, `VERSION`, and `CHANGELOG.md`. Existing target repositories will see a reviewable removal task on their next `/wong-sync`; locally authored skill variants stay untouched.

## Decision log

- **2026-09-15** — Asked whether retirement means hiding the commands or removing their workflows; assumed full removal because the request called them redundant and infrequently used.
- **2026-09-15** — Asked what replaces `/dream`; assumed no replacement. Notes stay for `/continue`, while wiki edits become explicit tasks under the existing wiki rules.
- **2026-09-15** — Asked how upgrades handle installed copies; assumed removal only when the retired copy is provably unmodified. A customized copy stays in place but leaves WongStack's managed skills list.
- **2026-09-15** — Asked whether to clean history; assumed historical archives and changelog entries stay immutable, while current specs and the empty active scaffold are removed or revised.
- **2026-09-15** — Treated the removal of two public commands as a breaking release and selected version 14.0.0.
- **2026-09-15** — Completed all implementation tasks, synchronized the seven capability deltas into the current specifications, and retired the now-empty `improve-plan-output` capability. Payload links and strict OpenSpec validation pass.
- **2026-09-15** — Archived the completed change after the implementation checkpoint passed CI; the archive is the durable shipping record.

<!-- end proposal.md -->
<!-- file design.md utf8 4823 -->
## Context

See `proposal.md` for the motivation. The two skills are core payload directories, so removal crosses the manifest, setup, user-facing command lists, note conventions, wiki doctrine, and current specifications. `.claude` is a symlink to `.agents`, so implementation edits the `.agents` paths. Historical archives and existing changelog entries are records and stay unchanged.

Every current note has an empty `consolidated:` field. This makes the consolidation state safe to remove without migrating a completed-note distinction.

## Goals / Non-Goals

**Goals:**

- Leave one clear improvement path: investigate with `/explore`, then create work with `/plan`.
- Keep notes useful for `/continue` without a queue-like state that no command consumes.
- Remove the two skills from new installs and safely retire managed copies in existing targets.
- Leave no live link, current specification, or command list that promises the retired workflows.

**Non-Goals:**

- Do not add note consolidation to another skill.
- Do not make wiki gardening automatic.
- Do not delete session notes, historical archives, or old changelog entries.
- Do not delete a customized retired skill from a target repository.

## Decisions

### D1 — Notes become permanent context, not an inbox

Remove `consolidated:` from the note template and from existing live notes. `/save` still writes notes and `/continue` still reads them. Explicit wiki work can use notes as normal repository context, but no skill owns a transfer step.

Alternative: move consolidation into `/save`. Rejected because it preserves the model call and hidden scope that the retirement is meant to remove.

### D2 — Explicit wiki work uses the normal rules

Remove the single-writer claim from `AGENTS.md`, `wiki-style.md`, and the OpenSpec rule. A user can request a wiki edit or audit directly; `.agents/rules/wiki.md` still loads `wiki-style.md` and `voice.md` for those edits. The `notes/**` + `wiki/**` prose fast path stays because it is path doctrine, not a `/dream` feature.

Alternative: create a smaller wiki skill. Rejected because that would rename the redundant command instead of removing it.

### D3 — `/improve` has no dedicated replacement

Remove the skill and its licensed reference bundle. A targeted audit or roadmap discussion uses `/explore`; selected work uses `/plan`. This keeps analysis and planning in the main change loop.

Alternative: move the audit playbooks into `/explore`. Rejected because it would keep the large specialized workflow and context cost.

### D4 — Retirement is authorship-safe in target repos

Add a bounded retired-skill pass to `/wong-sync`. It checks the local name recorded in `components.skills`, including renames. A directory is removal-safe only when all files match historical upstream blobs and there are no extra files. Otherwise it is preserved unchanged and simply leaves WongStack management. The plan shows the deletion before `/apply` performs it.

Alternative: stop listing the skills and leave old copies in place. Rejected because existing installations would keep showing commands that upstream says no longer exist.

### D5 — Current truth changes; history does not

Use delta specs to remove or revise current requirements. Delete the empty active `improve-openspec-plans` scaffold during implementation. Do not touch `openspec/changes/archive/**` or earlier changelog sections.

## Risks / Trade-offs

- **Users lose broad audit and wiki-gardening shortcuts.** → The README and philosophy point to `/explore` → `/plan` and explicit wiki work.
- **A target customized a retired skill.** → `/wong-sync` preserves the directory byte-for-byte and only removes its managed mapping.
- **Old notes retain `consolidated:` in target repos.** → The field becomes harmless legacy data; no bulk target rewrite is required.
- **Removing the improve license could appear to erase attribution.** → Historical changelog entries and archived changes remain unchanged; only the retired live payload bundle is deleted.
- **Live references are easy to miss because `.claude` is a symlink.** → Search the real `.agents` tree and run `node scripts/check-payload-links.mjs` before completion.

## Migration Plan

1. Remove the live skill directories and all current references.
2. Update note and wiki doctrine without replacing the retired workflows.
3. Add authorship-safe retired-skill handling to `/wong-sync` and remove both names from its manifest schema.
4. Apply the delta specifications, delete the empty obsolete scaffold, bump to 14.0.0, and add the newest changelog entry.
5. Run the payload link check and repository-wide live-reference checks.

Rollback is a normal revert of the release commit. Existing target repositories do not lose customized skill files during migration.

<!-- end design.md -->
<!-- file tasks.md utf8 2564 -->
## 1. Retire the skill payload

- [x] 1.1 Delete `.agents/skills/dream/` and `.agents/skills/improve/`, including the adapted-work license and all audit references, per `review.html#/retired-skills/removal`.
- [x] 1.2 Remove both skills from `payload-files.json` and the payload-manifest prose, and add the authorship-safe retired-skill classification and planned-removal path to `/wong-sync` per `review.html#/sync-retirement/safe-retire`.
- [x] 1.3 Remove both names and their runtime promises from `/wong-setup` and its fit playbook.

## 2. Simplify notes and wiki work

- [x] 2.1 Rewrite `/save` so notes remain permanent cold-resume context, its note template has no `consolidated:` field, and wiki-only work remains a generic prose-fast-path case per `review.html#/notes-lifecycle/permanent`.
- [x] 2.2 Update `notes/README.md` and remove the empty `consolidated:` field from current live notes without changing their content.
- [x] 2.3 Remove the single-writer and automatic-consolidation claims from `AGENTS.md`, `.agents/rules/openspec.md`, `wiki/wiki-style.md`, `wiki/agent-knowledge-center.md`, and `wiki/development/the-change-loop.md`; direct improvement work to `/explore` → `/plan` and explicit wiki work.
- [x] 2.4 Remove `/dream` handoffs from `/ship` while keeping the archived change as the shipping record.

## 3. Update discovery and development documentation

- [x] 3.1 Remove both commands from `README.md` and all current workflow inventories.
- [x] 3.2 Replace the retired skill examples in `wiki/development/adding-a-skill.md` and update `wiki/development/required-tools.md` to list only supported verbs.

## 4. Clean current planning truth

- [x] 4.1 Delete the empty `openspec/changes/improve-openspec-plans/` scaffold and leave `openspec/changes/archive/**` unchanged per `review.html#/current-specs/spec-cleanup`.
- [x] 4.2 Confirm the delta specifications remove the `improve-plan-output` contract and all `/dream` requirements while preserving notes, `/continue`, the wiki-root fallback, and the prose allowlist.

## 5. Release and verify

- [x] 5.1 Bump `VERSION` to `14.0.0` and add a newest-first `CHANGELOG.md` entry that explains the breaking command retirement, note lifecycle, explicit replacements, and safe target migration per `review.html#/release/major`.
- [x] 5.2 Run `node scripts/check-payload-links.mjs`, `openspec validate remove-improve-dream --strict`, and live-reference searches that exclude `CHANGELOG.md`, `notes/**`, and `openspec/changes/archive/**`; resolve every unintended reference before completion.

<!-- end tasks.md -->
<!-- file specs/agent-knowledge-center/spec.md utf8 841 -->
## MODIFIED Requirements

### Requirement: Knowledge capture happens during the work

WongStack SHALL explain that knowledge capture happens through the work, not only as a separate documentation chore. Plans, decision logs, archived changes, and session notes SHALL be presented as the mechanisms that let each project leave more useful context for the next person or agent. Reusable wiki knowledge SHALL be added through explicit wiki work rather than an automatic consolidation workflow.

#### Scenario: Reader understands why capture pays off

- **WHEN** a reader reviews the README or philosophy page
- **THEN** they see, in plain terms, that the process is written down, agents run it, what happens is captured, and future work starts with more context
- **AND** no command is presented as an automatic bridge from notes into the wiki

<!-- end specs/agent-knowledge-center/spec.md -->
<!-- file specs/delivery-gate/spec.md utf8 6180 -->
## MODIFIED Requirements

### Requirement: CI is optional, not required

The WongStack doctrine SHALL treat GitHub Actions (and CI generally) as an optional accelerator that is honored when present and never required. The system's durable pillars SHALL be described as: pull requests, version control, OpenSpec, and everything-lives-in-the-repo.

This doctrine SHALL have **one owning file** — `wiki/development/the-change-loop.md` — which states the gate ladder (CI when present → merge, a skipped rung never being a failure), the scope of the direct-to-default-branch carve-out, and the prose allowlist (`notes/**` + `wiki/**`) with its rationale. Other payload surfaces SHALL link to that owner rather than restate it, per the `payload-single-source` capability.

Two bounded exceptions, each because the reader must act without leaving the page:

- `AGENTS.md`/`CLAUDE.md` MAY carry one summarizing line per doctrine, naming and linking the owner.
- `.claude/skills/save/SKILL.md` SHALL state the allowlist's two path prefixes inline **once**, as the operational routing test the skill performs. Its other sections SHALL link to that single statement rather than repeat it.

No payload surface SHALL assert CI as the sole or required gate, state the carve-out as `notes/*.md` alone, or say that wiki edits require a pull request. No payload surface SHALL describe the staging walkthrough as a rung of the gate ladder or as a condition on the merge. Where a surface links to the owner instead of restating it, that link SHALL satisfy this requirement.

#### Scenario: Payload prose describes CI as optional

- **WHEN** a reader reviews the delivery doctrine in `CLAUDE.md`, `README.md`, or the `save`/`ship` skills
- **THEN** the text states CI is honored when present but not required, and names PR review as the gate when CI is absent
- **AND** no remaining sentence asserts "CI is the only gate" or "GitHub Actions is the build gate"

#### Scenario: No surface describes the walkthrough as a gate

- **WHEN** a reader reviews `wiki/development/the-change-loop.md`, the `ship` skill, or the stack section
- **THEN** no surface presents the staging walkthrough as a rung of the ladder or as a condition on the merge
- **AND** the walkthrough is described as something `/verify` produces on request

#### Scenario: The carve-out has one owner

- **WHEN** a reader reviews `CLAUDE.md`, `notes/README.md`, and the `save` skill
- **THEN** each either links to `wiki/development/the-change-loop.md` or carries one summarizing line naming it
- **AND** no surface other than `save/SKILL.md`'s single operational statement reproduces the allowlist's scope, exceptions, or rationale

#### Scenario: The save skill can route without leaving its runbook

- **WHEN** `/save` reaches the point of deciding a save's route
- **THEN** the two path prefixes are stated inline at that point
- **AND** the skill's later sections link back to that statement rather than restating the prefixes

#### Scenario: A surface contradicts the owner

- **WHEN** any payload surface states the gate or the carve-out in terms the owning file does not
- **THEN** that is a defect, resolved by correcting the surface to a link or to the owner's terms

### Requirement: The gate is CI-when-present, else PR review

`/save` and `/ship` SHALL determine the gate by whether the repo has checks configured. When checks exist, the skills wait for them and, on failure, read-fix-repush (capped); `/ship` merges only on green. When no checks exist, the gate SHALL be PR review only — the PR plus the OpenSpec change and the in-repo record is the system, and a human approves the PR before `/ship` merges.

**Prose exception.** A `/save` whose entire diff falls inside the **prose allowlist** SHALL bypass the branch-and-PR gate and commit directly to the default branch. The allowlist is exactly two path prefixes: `notes/**` and `wiki/**`. The carve-out is decided by **path scope only** — never by file extension, and never by a judgment of how consequential the edit is. It is exact: if any path outside the allowlist appears in the diff, the normal branch + PR flow applies in full to the whole save.

Routing SHALL NOT key on file extension. Markdown outside the allowlist — `.claude/**` (the shipped payload, whose edit is a release), `openspec/**` (the specs), `AGENTS.md`/`CLAUDE.md`, `README.md`, `CHANGELOG.md`, `VERSION`, `app/**`, and any config file — keeps the full gate.

The gate is not weakened by this. Neither surface carries behavior: a note is raw, permanent session context, and a wiki page is prose reviewed in the diff that produced it. Nothing in either surface executes, deploys, or changes what the tooling does.

#### Scenario: Repo has CI configured

- **WHEN** `/save` or `/ship` runs and `wait-for-checks.sh` reports checks
- **THEN** the skill waits for the checks, auto-fixes on red (cap 3 attempts), and `/ship` merges only once green

#### Scenario: Repo has no CI configured

- **WHEN** `/save` or `/ship` runs and `wait-for-checks.sh` returns `NONE`
- **THEN** the skill proceeds without waiting for or requiring any CI run
- **AND** `/ship` merges on the strength of PR review rather than a green CI run

#### Scenario: Notes-only save bypasses the gate

- **WHEN** `/save` runs and every changed path is under `notes/`
- **THEN** it commits and pushes directly to the default branch, opening no PR and requiring no `/ship`

#### Scenario: Wiki-only save bypasses the gate

- **WHEN** `/save` runs and every changed path is under `wiki/`
- **THEN** it commits and pushes directly to the default branch, opening no PR and requiring no `/ship`

#### Scenario: A single non-allowlisted path restores the gate

- **WHEN** a save's diff contains `notes/<slug>.md` or `wiki/<page>.md` plus any path outside the allowlist
- **THEN** the normal branch + PR flow applies and the prose rides along on that branch

#### Scenario: Markdown payload keeps the gate

- **WHEN** a save's diff touches `.claude/skills/save/SKILL.md`, `CLAUDE.md`, or `openspec/changes/<name>/proposal.md` — markdown, but not in the allowlist
- **THEN** the normal branch + PR flow applies in full

<!-- end specs/delivery-gate/spec.md -->
<!-- file specs/improve-plan-output/spec.md utf8 995 -->
## REMOVED Requirements

### Requirement: OpenSpec mode detection

**Reason**: The `/improve` skill is retired because its audit-to-plan workflow overlaps the standard `/explore` → `/plan` path and is rarely used.

**Migration**: Use `/explore` to investigate an improvement and `/plan` to create its OpenSpec change.

### Requirement: OpenSpec plans keep the handoff quality bar

**Reason**: Advisor-authored plans no longer form a separate plan type after `/improve` is removed.

**Migration**: Use the normal `/plan` artifacts and their existing quality rules.

### Requirement: Write boundary in OpenSpec mode

**Reason**: The retired advisor workflow has no write boundary to specify.

**Migration**: Use `/explore` for read-only investigation and `/plan` for artifact writes.

### Requirement: Variants operate on OpenSpec changes

**Reason**: The `/improve` variants are removed with the skill.

**Migration**: Use `/explore`, `/plan`, `/continue`, and the normal change loop directly.

<!-- end specs/improve-plan-output/spec.md -->
<!-- file specs/session-notes/spec.md utf8 6714 -->
## MODIFIED Requirements

### Requirement: Session notes live in a repo-committed `notes/` surface

The payload SHALL define a top-level `notes/` directory holding one markdown note per line of work at `notes/<slug>.md`, where `<slug>` is the same kebab-case slug used for the branch and the OpenSpec change. Notes SHALL be committed to the repo so they are readable from any clone, and SHALL remain in the repo as permanent session context.

#### Scenario: A note is keyed to its line of work

- **WHEN** a session's work is tracked as change `add-po-search` on branch `add-po-search`
- **THEN** its session note is at `notes/add-po-search.md`, parallel to `openspec/changes/add-po-search/`
- **AND** the filename carries no date, so a note spanning several days is not stamped with the first

#### Scenario: A conversation-only session still gets a note

- **WHEN** a session produces understanding but no code change and no plan
- **THEN** a note is written at `notes/<topic-slug>.md`
- **AND** no OpenSpec change folder is created for it

#### Scenario: Notes survive consolidation

- **WHEN** later work needs the context from an earlier session, whether or not its reusable facts were also written into the wiki
- **THEN** the note remains in the repo for future reference

### Requirement: Notes are a compression of the session, not a summary or a transcript

A note SHALL preserve what the user stated, decisions with their rationale, what was ruled out and why, concrete specifics (names, repo-relative paths, numbers, versions, error strings), and open threads — such that a cold reader on another machine reaches the same understanding without the transcript. It SHALL omit tool-call mechanics, file dumps, the assistant's reasoning-out-loud, and facts already true in the repo.

#### Scenario: Rationale is preserved

- **WHEN** an option was considered and rejected during the session
- **THEN** the note records the rejected option and why it was rejected

#### Scenario: Selection is deferred to consolidation

- **WHEN** `/save` writes a note containing both durable conventions and change-specific context
- **THEN** it records both when they are needed for a cold reader to reach the same understanding, without filtering for a later consolidation command

### Requirement: A prose-only save commits directly to the default branch

When a `/save`'s entire diff falls inside the **prose allowlist** — the path prefixes `notes/**` and `wiki/**` — `/save` SHALL commit and push directly to the default branch: no feature branch, no PR, no CI wait, and no `/ship` needed. The carve-out SHALL be decided by exact path scope; any changed path outside the allowlist restores the normal branch + PR flow for the whole save. `/save` SHALL NOT route on file extension, and SHALL NOT make a judgment call about whether a prose edit is consequential enough to warrant a PR. `/save` SHALL NOT merge a pull request under any circumstance, and no scheduled job or other skill SHALL merge on its behalf.

If the direct push is rejected (protected default branch, required reviews, non-fast-forward), `/save` SHALL NOT force or retry; it SHALL fall back to the normal branch + PR flow and say why.

#### Scenario: Conversation-only session lands in one command

- **WHEN** `/save` runs after a session whose only output is `notes/billing-tenancy.md`
- **THEN** the note is committed and pushed to the default branch
- **AND** no branch is created, no PR is opened, and the user is not asked to run `/ship`

#### Scenario: A dream session lands in one command

- **WHEN** `/save` runs after explicit wiki work and every changed path is under `wiki/`
- **THEN** the whole diff is committed and pushed to the default branch
- **AND** no branch is created, no PR is opened, and the user is not asked to run `/ship`

#### Scenario: Mixed session keeps the gate

- **WHEN** a save's diff contains prose plus a source, skill, spec, or config file
- **THEN** the prose rides along on the change's feature branch and goes through the PR flow with it

#### Scenario: Markdown outside the allowlist keeps the gate

- **WHEN** a save's diff touches `.claude/skills/**/*.md`, `CLAUDE.md`, `README.md`, `CHANGELOG.md`, or `openspec/**`
- **THEN** the normal branch + PR flow applies, because routing is by path prefix and not by extension

#### Scenario: Prose-only save reports without a PR link

- **WHEN** a prose-only save completes
- **THEN** the report names the changed prose paths and states they landed on the default branch
- **AND** it omits the PR, CI, and preview sections rather than reporting them as missing

#### Scenario: Protected default branch falls back

- **WHEN** a prose-only save's direct push to the default branch is rejected
- **THEN** `/save` cuts a branch, opens a PR whose body is the prose change, and states that the default branch is protected
- **AND** it never force-pushes

### Requirement: `notes/` is a payload surface installed by `/wong-sync`

The payload manifest SHALL list `notes/README.md`, so `/wong-sync` copies it into a target repo that lacks it and thereby creates the notes convention surface. The README SHALL state the slug key, compression bar, permanent lifecycle, and boundary against the change's Decision log and `wiki/`. As with every manifest file, an existing file SHALL NOT be overwritten.

#### Scenario: Target repo without notes

- **WHEN** `/wong-sync` runs in a repo that has no `notes/` directory
- **THEN** `notes/` and `notes/README.md` are copied in

#### Scenario: Target repo that already has notes

- **WHEN** a target repo already has `notes/README.md`
- **THEN** it is left untouched and handed to the adapt step

## REMOVED Requirements

### Requirement: Note state is tracked in per-note frontmatter

**Reason**: No workflow consumes consolidation state after `/dream` is retired.

**Migration**: Remove the `consolidated:` key from existing notes when convenient; notes remain valid without it.

### Requirement: `/dream` consolidates from the repo only

**Reason**: The `/dream` command and its note-to-wiki workflow are retired.

**Migration**: Keep notes for cold resumes and make wiki edits explicitly when reusable documentation work is needed.

### Requirement: `/dream` gardens with or without new notes

**Reason**: Wiki gardening is no longer a separate command.

**Migration**: Request a wiki audit or edit as explicit work governed by the wiki rules.

### Requirement: Sweep mode is removed from `/dream`

**Reason**: The parent skill no longer exists, so a negative requirement about one of its old modes has no current behavior to govern.

**Migration**: None; session notes remain repo files and `/continue` still reads them.

<!-- end specs/session-notes/spec.md -->
<!-- file specs/toolchain-dependencies/spec.md utf8 2978 -->
## MODIFIED Requirements

### Requirement: The payload depends only on git, gh, and openspec

The WongStack **core** payload SHALL require no external command-line tools beyond `git`, `gh`, and `openspec`, with one named exception: **`/verify` requires the browser automation CLI it drives**, which it installs at the point of need. Every other core verb — `/explore`, `/plan`, `/apply`, `/save`, `/continue`, `/ship`, and `/wong-sync` — SHALL continue to run on `git`, `gh`, and `openspec` alone, and a repo that never invokes `/verify` SHALL never acquire that tool.

That exception SHALL be a **tool**, not a language toolchain: the walk's browser dependency SHALL NOT require a package manifest, a dependency entry, or a language runtime inside the repository. A repo in any language SHALL be able to walk without gaining a toolchain it does not otherwise use.

No core payload script or skill outside `/verify` SHALL invoke a standalone `jq`, `python`, `node`, or other interpreter to do work the agent or an already-required tool can do.

The **opt-in Cloudflare stack pack** MAY require additional tools — `node`/`npm` and `wrangler` in that repo's own build/CI, and `curl` in the pack's own provisioning skill — but only in a repo that explicitly took the pack. Provisioning SHALL use `curl` against the Cloudflare REST API rather than `wrangler` or a Node script, so that setting up the app requires no language runtime on the user's machine.

The required-tools page SHALL state this split precisely: the three universal tools, the browser CLI scoped to `/verify`, and `curl` as a pack-gated skill dependency. The governing rule SHALL be stated there: use a tool where it is already required, and never let a WongStack skill be the reason a *runtime* gets installed without asking.

#### Scenario: A pack-gated script uses node where node already exists

- **WHEN** a stack-pack script runs in CI or at the repo's build boundary, where `node` is already required
- **THEN** it MAY use `node` for work `curl` and shell would do poorly, such as JSON assembly or editing `wrangler.jsonc`
- **AND** no skill on the user's own machine gains a `node` dependency as a result

#### Scenario: The walk's tool dependency is named, not hidden

- **WHEN** a reader consults the required-tools page to learn what the toolkit needs
- **THEN** the browser CLI is listed as required by `/verify` specifically
- **AND** the rest of the core payload is still stated to need only `git`, `gh`, and `openspec`

#### Scenario: Walking adds no toolchain to the repo

- **WHEN** `/verify` runs in a repo whose language is not JavaScript
- **THEN** no package manifest, dependency entry, or language runtime is added to that repo
- **AND** the browser tool is installed on the machine instead

#### Scenario: A repo that never walks needs no browser tool

- **WHEN** a repo uses the loop without ever invoking `/verify`
- **THEN** no browser tool or browser is installed on its behalf

<!-- end specs/toolchain-dependencies/spec.md -->
<!-- file specs/wiki-root/spec.md utf8 1801 -->
## MODIFIED Requirements

### Requirement: The wiki-root resolution rule is unchanged

WongStack SHALL continue to resolve a target repo's wiki root generically — `wiki/` if present, otherwise `docs/`. This change SHALL NOT narrow that rule to `wiki/` only. A target repo that installed WongStack before the rename and kept its wiki at `docs/` SHALL keep working with no action from its owner.

#### Scenario: An un-renamed target still works

- **WHEN** `/wong-sync` runs in a target repo whose wiki is still at `docs/`
- **THEN** it resolves the wiki root to `docs/` and behaves exactly as before

#### Scenario: Convention pages sync to the resolved root

- **WHEN** `/wong-sync` syncs the convention pages (`wiki-style.md`, `voice.md`, `development/secrets.md`, and `ux-principles.md` in UI-bearing repos) into a target
- **THEN** it places them at that target's resolved wiki root, not at a hardcoded `wiki/`

### Requirement: No payload file hardcodes `docs/` as the wiki root

Every live payload file — the skills under `.claude/skills/`, `CLAUDE.md`, `README.md`, `openspec/config.yaml`, and the wiki pages themselves — SHALL refer to WongStack's own wiki pages by their `wiki/` paths, and SHALL refer to a *target's* wiki generically (the resolved wiki root) rather than as `docs/`. Every intra-repo link to a moved page SHALL resolve.

#### Scenario: Repo-wide link check

- **WHEN** the repo is grepped for `docs/` outside `CHANGELOG.md` and `openspec/changes/archive/`
- **THEN** the only remaining hits are generic fallback mentions (`wiki/`, falling back to `docs/`) and unrelated paths

#### Scenario: Relative skill links resolve

- **WHEN** a payload skill links the rulebook or `ux-principles.md` by relative path
- **THEN** those paths point at files that exist under `wiki/`

<!-- end specs/wiki-root/spec.md -->
<!-- file specs/wong-sync/spec.md utf8 4255 -->
## MODIFIED Requirements

### Requirement: Single payload manifest, wong-sync included

The payload-manifest list SHALL live in exactly one place, inside the `wong-sync` skill, and `wong-setup` SHALL reference it rather than keep a copy — `wong-setup` copies no payload file except the `wong-sync` skill itself (its bootstrap); everything else arrives through the sync's copy-if-absent step. The list includes the supported workflow skills plus `wong-sync` itself, the docs convention pages — **including a contributing page documenting the manual route for sending a payload improvement upstream** — and the CLAUDE.md `WONG-STACK` block; it excludes the retired `dream` and `improve` skills, `wong-setup`, `VERSION`, and `CHANGELOG.md`. The manifest SHALL additionally define an **opt-in `stack-pack` category** — the pack's drop-in files (its scripts, seed template, and `wiki/stack/` pipeline docs) — in scope **only** for a repo whose manifest has `components.stackPack: true`; for any other repo those files are outside the manifest and MUST never be copied or analysed.

The manifest bounds what the skill **copies**. It SHALL NOT bound what the analysis's surveyor **reads**, which is specified by the `wong-sync-adapt` capability; no read content leaves the machine. A supported payload skill installed under a different local name SHALL be recognized under that name via the manifest's skills mapping, so it counts as present rather than absent.

#### Scenario: wong-sync updates itself

- **WHEN** upstream ships an improved `wong-sync` skill and the target's copy is provably unmodified
- **THEN** the self-update pass brings it current before any other payload file is considered
- **AND** where the target's copy has local edits instead, it is left untouched and the update is handled by the capability analysis

#### Scenario: Non-manifest files are never copied

- **WHEN** the target contains app-specific skills, source, or docs outside the manifest
- **THEN** the skill never copies over them

#### Scenario: Renamed skill counts as present

- **WHEN** a supported payload skill was installed under a different local name recorded in `components.skills`
- **THEN** it is treated as present and analysed, not copied in a second time under the default name

#### Scenario: Retired skills are not installed

- **WHEN** a fresh repository installs or syncs WongStack 14.0.0 or later
- **THEN** the payload manifest does not copy the `dream` or `improve` skill

#### Scenario: Pack files are in scope only for opt-in repos

- **WHEN** `/wong-sync` runs in a repo whose manifest lacks `components.stackPack: true`
- **THEN** the pack's files are treated as outside the manifest — never copied or analysed
- **AND** in a repo with `components.stackPack: true`, those files are copied if absent and analysed if present

#### Scenario: Target repos receive the contributing page

- **WHEN** a repo installs or syncs the payload
- **THEN** the contributing page arrives with the other copied docs, so the way to contribute is discoverable

## ADDED Requirements

### Requirement: Retired managed skills are removed without deleting local authorship

When a target manifest records `dream` or `improve` as a managed skill, `/wong-sync` SHALL plan removal of the installed skill directory only when every file in that directory is provably unmodified from an upstream release and the directory contains no extra local file. If any file has local authorship, the directory SHALL remain byte-identical and become an unmanaged local skill. In both cases, the rewritten manifest SHALL remove the retired name from `components.skills`.

#### Scenario: Unmodified retired skill is removed

- **WHEN** a target has an installed `dream` or `improve` directory whose complete contents match upstream history
- **THEN** `/wong-sync` includes its removal in the reviewable change plan
- **AND** the manifest task removes its name from `components.skills`

#### Scenario: Customized retired skill is preserved

- **WHEN** a retired skill directory contains a changed or extra file
- **THEN** `/wong-sync` leaves the directory byte-identical and reports it as a local unmanaged skill
- **AND** the manifest task removes its retired WongStack mapping

<!-- end specs/wong-sync/spec.md -->
<!-- file .openspec.yaml utf8 66 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-09-15
retire_capabilities: true

~~~
<!-- end .openspec.yaml -->
<!-- file review.html utf8 45598 fence=~~~ -->
~~~html
<!doctype html>
<!--
  ─────────────────────────────────────────────────────────────────────────────
  REVIEW KIT — fill this in; do not restyle it.

  Copy this file to openspec/changes/<name>/review.html. It is the reviewer's
  page for the change: the proposal's What Changes list on the left is the
  navigation, and each entry opens a picture of that change on the stage. The
  look is fixed on purpose: every WongStack review page reads the same way, and
  a reviewer learns the chrome once.

  WHAT YOU FILL, WHAT THE TOOLING FILLS
  - You fill: the <section class="visual"> blocks, one per What Changes bullet,
    and the data-mark attributes the bullets point at.
  - The sync script fills: everything between the two comment markers named
    "proposal:start" and "proposal:end" (they sit just below, around the
    example proposal). Never hand-edit that block — /save overwrites it from
    proposal.md on every checkpoint. Leave both markers in place.
  - The kit owns: the chrome, the panel, the landing, routing, the annotate
    layer and the pins. Reviewer chrome, not the product. Leave it alone.

  HOW TO FILL IT
  1. Title: replace CHANGE-NAME in the <title> and in the chrome with the
     change name. The page reads the change name from the title.
  2. One <section class="visual"> per What Changes bullet that has something
     to show. Two bullets may share one visual. A bullet with nothing to draw
     needs no section — it opens a text stage on its own.
  3. Give every visual:
       id="<slug>"            the anchor: #/<slug>
       data-kind="screen|flow|diff|tree"    which of the four kinds it is
       data-states="a b c"    only for a visual with more than one state;
                              the first listed is the landing state
       data-state="<first>"   the state it opens in
  4. Anchor each bullet in proposal.md by appending
       (review.html#/<visual>[/<state>][/<mark>])
     The state segment is optional — a segment that is not one of the visual's
     states is read as a mark. So #/list/search, #/list/empty/create and
     #/receive-flow/after/new all work.
     A MARK MUST NEVER SHARE A NAME WITH A STATE of the same visual, or the
     router reads it as the state and highlights nothing.
  5. Mark what the bullet changes with data-mark="<mark>" on the elements it
     touches. Choosing that bullet outlines every one of them.
  6. Mark the layout choices that matter with <i class="callout">N</i> and put
     a matching numbered line in that visual's .notes block.
  7. Delete the example visuals below. Keep the <style> and <script> untouched.

  THE FOUR VISUAL KINDS
    screen  a low-fidelity wireframe of a UI screen, with its states. Every
            screen in the flow, each with the empty, loading and error states
            the design names. Exactly ONE .btn.primary visible at a time —
            counted per state, because markup outside a state block shows in
            every state. Give it data-go="<id>" so the flow is clickable.
            A change that adds or restructures a screen uses this kind, and
            wiki/ux-principles.md governs what the screen should be.
    flow    a sequence of steps, as .lane rows of .step boxes and .arrow
            separators. Use two lanes with data-states="after today" to argue
            a process change: the .lane.today row draws dashed and muted.
            This is the kind for a skill, a runbook, or any change to how a
            job gets done.
    diff    before and after text, as two labelled <pre> columns whose lines
            are .line, and .del or .add for what goes and what arrives. The
            kind for a rule, a config value, a template, or prose.
    tree    files added, edited, or removed, as an <ul> whose items are .add,
            .edit or .del, each with an optional <span class="why">.

  MOBILE
  - The page itself reflows below 760px: the stage takes the width, the list
    becomes a sheet behind the Changes button, and ‹ › step through the
    bullets. You get that for free.
  - A SCREEN MUST CONSIDER THE PHONE. The chrome's View toggle walks any
    screen at phone width. Use class="phone-only" and class="desktop-only" to
    give one screen both layouts. When the use-case brief says the job is done
    on a phone, draw the phone layout first and check every state at phone
    width — a screen that only works at 960px is not finished.

  HARD RULES
  - No network. No CDN link, no web font, no remote image, no analytics. The
    file must render from file:// with no server and no connection, years from
    now, out of the change's archive folder.
  - No new CSS, no colour, no brand, no design-system token, no product
    typography. Compose the primitives below and nothing else. Low fidelity is
    the contract: this is an argument about the change, not a picture of the
    product. The one accent colour is the reviewer's, for marks and pins.
  - No real data and no real copy where a placeholder does the job.
  - Nothing at the top level of the script may throw before the first render,
    and the script uses no optional chaining and no optional catch binding —
    a phone browser that refuses localStorage on file:// must still render.

  THE PRIMITIVES
    screen: .topbar + .logo + .nav (span.on = current)   the app frame
            .btn / .btn.primary / .btn.ghost             actions
            .input / .input.wide, .field > label         form fields
            table                                         rows of data
            .box                                          empty / error panel
            .skeleton (+ .s for a short one)              loading
            .hero                                         image placeholder
            .kv (dt/dd)                                   label-value pairs
            .tag                                          status chip
    flow:   .lane (+ .today), .lane .label, .step (+ .gone), .arrow
    diff:   .diff > div > .label + pre > .line (+ .add / .del)
    tree:   .tree ul > li.add / li.edit / li.del + .why
    any:    .row / .row.between, .muted, .caption, .phone-only,
            .desktop-only, .callout + .notes, data-mark

  Owner: .claude/skills/plan/SKILL.md — the review stage. The judgment a
  screen serves (hierarchy, one primary action, designed empty states) is in
  wiki/ux-principles.md.
  ─────────────────────────────────────────────────────────────────────────────
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Review — remove-improve-dream</title>
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
  .panel code { background:var(--fill); padding:0 3px; }
  .panel .notes-list { margin:0; padding-left:18px; }
  .panel .notes-list li { margin:0 0 6px; cursor:pointer; }
  .panel .notes-list .where { color:#666; font-size:11px; display:block; }
  .panel .empty { color:#666; list-style:none; margin-left:-18px; }
  .stage { flex:1; min-width:0; }

  /* one visual at a time */
  .visual { display:none; }
  .visual[data-active] { display:block; }
  .frame { max-width:960px; margin:24px auto; background:#fff; border:2px solid var(--line); box-shadow:0 2px 0 #bbb; }
  .visual.screen .frame { min-height:560px; }
  .visual:not(.screen) .frame { padding:24px; }
  .caption { max-width:960px; margin:24px auto 0; font-size:12px; color:#666; }
  .caption + .frame { margin-top:6px; }
  .state { display:none; }
  .screen[data-state="default"] .state-default,
  .screen[data-state="empty"]   .state-empty,
  .screen[data-state="loading"] .state-loading,
  .screen[data-state="error"]   .state-error { display:block; }

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
  .step.gone { text-decoration:line-through; color:#999; }
  .arrow { color:#999; }
  .arrow::before { content:"→"; }

  /* diff: before / after text */
  .diff { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
  .diff > div > .label, .tree .label { font-size:11px; text-transform:uppercase; letter-spacing:.06em; color:#666; margin-bottom:6px; }
  .diff pre { margin:0; padding:10px 12px; background:var(--fill2); border:1px solid #ddd; font:12px/1.5 Menlo, Consolas, monospace; white-space:pre-wrap; }
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
  body.annotating .visual[data-active] .frame, body.annotating .panel { cursor:crosshair; }
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
  .toast { position:fixed; bottom:16px; left:50%; transform:translateX(-50%); background:#222; color:#eee; padding:8px 14px; border-radius:3px; font-size:13px; z-index:11; opacity:0; transition:opacity .2s; pointer-events:none; }
  .toast.show { opacity:1; }
  #copybuf { position:fixed; left:-9999px; top:0; }
  .error { color:#c00; }

  /* chrome extras: step through changes, phone/desktop view, the panel toggle */
  .chrome .count { opacity:.8; min-width:44px; text-align:center; }
  .chrome .menu { display:none; }
  .panel { top:var(--chrome-h, 41px); max-height:calc(100vh - var(--chrome-h, 41px)); }

  /* viewport: walk a screen at phone width from a desktop */
  body[data-viewport="phone"] .visual.screen .frame { max-width:390px; min-height:700px; }
  body[data-viewport="phone"] .desktop-only, body[data-viewport="desktop"] .phone-only { display:none !important; }
  .visual.screen .body { overflow-x:auto; }

  /* phone: stage full width, the list is a sheet, the note box docks to the bottom */
  @media (max-width: 760px) {
    body { font-size:15px; }
    .chrome { gap:8px; padding:6px 10px; }
    .chrome .hint, .chrome #viewport { display:none; }
    .chrome .menu { display:inline-block; }
    .layout { display:block; }
    .panel { display:none; position:fixed; left:0; right:0; bottom:0; z-index:8; border-right:0; padding:14px 16px 40px; }
    body.menu .panel { display:block; }
    .panel ol.changes li { padding:10px 10px 10px 32px; }
    .frame { margin:12px 8px; }
    .caption { margin:12px 8px 0; }
    .notes { margin:0 8px 24px; }
    .visual:not(.screen) .frame { padding:14px; }
    .visual.screen .frame { min-height:0; }
    .body { padding:14px; }
    .diff { grid-template-columns:1fr; }
    .textstage p, .textstage ol { font-size:16px; }
    .popover { left:8px !important; right:8px; bottom:8px; top:auto !important; width:auto; }
    .popover textarea { font-size:16px; height:90px; }
    .popover button { padding:8px 14px; }
    .chrome button { padding:6px 10px; }
  }
</style>
</head>
<body>

<div class="chrome">
  <b>Review · remove-improve-dream</b>
  <button class="menu" id="menu">☰ Changes</button>
  <div class="group"><button id="prev" title="Previous change">‹</button><span class="count" id="count"></span><button id="next" title="Next change">›</button></div>
  <div class="group" id="states"></div>
  <div class="group" id="viewport"><span>View:</span><button data-vp="desktop">Desktop</button><button data-vp="phone">Phone</button></div>
  <div class="group">
    <button class="annotate" id="annotate" aria-pressed="false">✎ Annotate</button>
    <button id="copy">Copy notes</button>
  </div>
  <span class="hint">Click a change on the left. Grey = layout only. Blue = what changes. Red dots = reasoning below.</span>
</div>

<!-- ══ THE PROPOSAL BLOCK — machine-filled; do not hand-edit ═══════════
     /save runs sync-review-proposal.mjs on every checkpoint, which replaces
     everything between the two markers with proposal.md's current Why and
     What Changes. Keep the markers. The example below is what a filled block
     looks like; it goes when you delete the example visuals. -->
<script type="text/markdown" id="proposal">
<!-- proposal:start -->
## Why

`/improve` and `/dream` add two large, separate workflows that are rarely used and overlap the normal `/explore` → `/plan` path and explicit wiki work. The unused consolidation lifecycle also leaves every saved note waiting for a later step that does not happen.

## What Changes

- **BREAKING:** Remove the `improve` and `dream` skill directories from WongStack and from the core payload, setup checks, command lists, and examples. (review.html#/retired-skills/removal)
- Keep session notes as permanent context for `/continue`, but remove the `consolidated:` watermark and every promise of automatic note-to-wiki consolidation. Wiki edits become explicit work governed by the existing wiki rules. (review.html#/notes-lifecycle/permanent)
- Update `/wong-sync` so an upgrade proposes removal of provably unmodified retired skill copies, preserves locally changed copies as local skills, and removes both names from the managed skills list. (review.html#/sync-retirement/safe-retire)
- Remove current specifications that exist only for the retired workflows, revise the specifications that refer to them, and remove the empty `improve-openspec-plans` scaffold. (review.html#/current-specs/spec-cleanup)
- Release the command removal as WongStack 14.0.0, keep historical archives and changelog entries unchanged, and run the payload link check. (review.html#/release/major)

**Non-goals:** Do not move either workflow into `/save`, `/ship`, or another skill. Do not delete existing session notes or rewrite historical OpenSpec archives and changelog entries.
<!-- proposal:end -->
</script>

<div class="layout">
<aside class="panel" id="panel"></aside>
<div class="stage" id="stage">

<!-- landing: the Why and the list, before any bullet is chosen -->
<section class="visual textstage" id="_landing" data-kind="text">
  <div class="frame" id="landing"></div>
</section>

<!-- text stage for a bullet with no visual -->
<section class="visual textstage" id="_text" data-kind="text">
  <div class="frame" id="textframe"></div>
</section>

<section class="visual tree" id="retired-skills" data-kind="tree" data-state="default">
  <p class="caption">The live payload after the two public commands are retired.</p>
  <div class="frame">
    <ul>
      <li class="del" data-mark="removal">.agents/skills/improve/ <span class="why">retired command and licensed reference bundle</span></li>
      <li class="del" data-mark="removal">.agents/skills/dream/ <span class="why">retired consolidation workflow</span></li>
      <li class="edit" data-mark="removal">.agents/skills/wong-sync/references/payload-manifest.md <span class="why">both names leave the core payload <i class="callout">1</i></span></li>
      <li class="edit" data-mark="removal">.agents/skills/wong-setup/ <span class="why">remove setup checks and command examples</span></li>
      <li class="edit" data-mark="removal">AGENTS.md · README.md · wiki/ <span class="why">remove live command promises</span></li>
    </ul>
  </div>
  <div class="notes"><ol><li>The directory removals and every discovery surface change together, so a fresh install cannot expose a retired command.</li></ol></div>
</section>

<section class="visual diff-visual" id="notes-lifecycle" data-kind="diff" data-state="default">
  <p class="caption">Session notes remain durable context, but they stop behaving like a consolidation queue.</p>
  <div class="frame">
    <div class="diff">
      <div><div class="label">Before</div><pre><span class="line del">consolidated:</span><span class="line del">/dream moves durable facts into wiki/</span><span class="line">/continue reads the session note</span></pre></div>
      <div><div class="label">After</div><pre><span class="line add" data-mark="permanent">note is permanent repository context <i class="callout">1</i></span><span class="line add" data-mark="permanent">wiki work is explicit and follows wiki rules</span><span class="line">/continue reads the session note</span></pre></div>
    </div>
  </div>
  <div class="notes"><ol><li>The note keeps its cold-resume job. Only the unused watermark and automatic transfer promise go away.</li></ol></div>
</section>

<section class="visual flow" id="sync-retirement" data-kind="flow" data-state="default">
  <p class="caption"><code>/wong-sync</code> retires managed copies without deleting local authorship.</p>
  <div class="frame">
    <div class="lane">
      <span class="label">Inspect</span>
      <span class="step">Read retired mapped name</span><span class="arrow"></span>
      <span class="step">Compare all files with historical upstream</span><span class="arrow"></span>
      <span class="step">Check for extra files <i class="callout">1</i></span>
    </div>
    <div class="lane">
      <span class="label">Exact</span>
      <span class="step" data-mark="safe-retire">Propose directory removal</span><span class="arrow"></span>
      <span class="step" data-mark="safe-retire">Remove managed mapping</span>
    </div>
    <div class="lane">
      <span class="label">Changed</span>
      <span class="step" data-mark="safe-retire">Preserve directory unchanged <i class="callout">2</i></span><span class="arrow"></span>
      <span class="step" data-mark="safe-retire">Remove managed mapping</span>
    </div>
  </div>
  <div class="notes"><ol><li>A copy is removal-safe only when every file matches historical upstream and no extra file exists.</li><li>A customized copy becomes a local skill: its bytes stay unchanged, but WongStack stops managing it.</li></ol></div>
</section>

<section class="visual tree" id="current-specs" data-kind="tree" data-state="default">
  <p class="caption">Current planning surfaces lose contracts that only the retired workflows need.</p>
  <div class="frame">
    <ul>
      <li class="del" data-mark="spec-cleanup">openspec/specs/improve-plan-output/ <span class="why">retired audit-and-plan contract</span></li>
      <li class="del" data-mark="spec-cleanup">openspec/changes/improve-openspec-plans/ <span class="why">empty active scaffold <i class="callout">1</i></span></li>
      <li class="edit" data-mark="spec-cleanup">openspec/specs/agent-knowledge-center/ <span class="why">durable notes and explicit wiki work</span></li>
      <li class="edit" data-mark="spec-cleanup">openspec/specs/session-notes/ <span class="why">no consolidation state or consumer</span></li>
      <li class="edit" data-mark="spec-cleanup">openspec/specs/wong-sync/ <span class="why">safe retirement behavior</span></li>
      <li class="edit" data-mark="spec-cleanup">other referring current specs <span class="why">remove live command requirements</span></li>
    </ul>
  </div>
  <div class="notes"><ol><li>Only current truth changes. Archived changes remain the immutable record of earlier behavior.</li></ol></div>
</section>

<section class="visual flow" id="release" data-kind="flow" data-state="default">
  <p class="caption">The breaking release records and checks the completed retirement.</p>
  <div class="frame">
    <div class="lane">
      <span class="label">Release</span>
      <span class="step" data-mark="major">Set VERSION to 14.0.0 <i class="callout">1</i></span><span class="arrow"></span>
      <span class="step" data-mark="major">Add newest changelog entry</span><span class="arrow"></span>
      <span class="step" data-mark="major">Run payload link check</span>
    </div>
    <div class="lane today">
      <span class="label">History</span>
      <span class="step">Keep archived changes unchanged</span><span class="arrow"></span>
      <span class="step">Keep earlier changelog entries unchanged <i class="callout">2</i></span>
    </div>
  </div>
  <div class="notes"><ol><li>Removing two public commands is a breaking change, so it uses the next major version.</li><li>The release adds current truth without rewriting historical evidence.</li></ol></div>
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
  let current = { id: '_landing', state: 'default', mark: null };
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
  function show(id, a, b) {
    const r = resolve(id, a, b);
    const v = r ? r.v : visuals.find(x => x.id === (id === '_text' ? '_text' : '_landing'));
    const state = r ? r.state : 'default', mark = r ? r.mark : null;
    visuals.forEach(x => x.toggleAttribute('data-active', x === v));
    if (v.classList.contains('screen')) v.dataset.state = state;
    current = { id: v.id, state, mark };
    document.querySelectorAll('.marked').forEach(x => x.classList.remove('marked'));
    if (mark) v.querySelectorAll('[data-mark="' + mark + '"]').forEach(x => x.classList.add('marked'));
    if (v.classList.contains('flow')) v.querySelectorAll('.lane').forEach(l => l.style.opacity = (state === 'today' && !l.classList.contains('today')) || (state === 'after' && l.classList.contains('today')) ? .45 : 1);
    renderStates(v, state);
    renderPanelState();
    renderPins();
    const multi = statesOf(v).length > 1;
    const want = v.id[0] === '_' ? '#/' : '#/' + v.id + (multi && (state !== statesOf(v)[0] || mark) ? '/' + state : '') + (mark ? '/' + mark : '');
    if (location.hash !== want) { try { history.replaceState(null, '', want); } catch (e) { location.hash = want; } }
  }
  function showText(i) {      // a bullet with no visual
    const b = bullets[i];
    document.getElementById('textframe').innerHTML = '<p class="muted">Change ' + (i + 1) + ' · no visual — behaviour only</p><h1>' + inline(b.text) + '</h1>';
    current = { id: '_text', state: 'default', mark: null, bullet: i };
    visuals.forEach(x => x.toggleAttribute('data-active', x.id === '_text'));
    renderStates(null); renderPanelState(); renderPins();
    try { history.replaceState(null, '', '#/change/' + (i + 1)); } catch (e) { location.hash = '#/change/' + (i + 1); }
  }
  function renderStates(v, state) {
    $states.innerHTML = '';
    if (!v || statesOf(v).length < 2) return;
    const lab = document.createElement('span'); lab.textContent = 'State:'; $states.appendChild(lab);
    statesOf(v).forEach(st => {
      const b = document.createElement('button');
      b.textContent = st; b.setAttribute('aria-pressed', st === state);
      b.onclick = () => show(v.id, st, current.mark); $states.appendChild(b);
    });
  }
  function fromHash() {
    const seg = location.hash.split('/').slice(1);
    if (seg[0] === 'change' && bullets[+seg[1] - 1]) { const i = +seg[1] - 1; return bullets[i].anchor ? show(bullets[i].id, bullets[i].state, bullets[i].mark) : showText(i); }
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
  function parseProposal() {
    const raw = document.getElementById('proposal').textContent.replace(/<!--[\s\S]*?-->/g, '');
    const sections = {}; let cur = null;
    raw.split('\n').forEach(line => {
      const h = line.match(/^## (.+)/);
      if (h) { cur = h[1].trim(); sections[cur] = []; return; }
      if (cur) sections[cur].push(line);
    });
    const why = (sections['Why'] || []).join('\n').trim().split(/\n\s*\n/).map(p => '<p>' + inline(p.replace(/\n/g, ' ')) + '</p>').join('');
    bullets = []; let tail = [];
    (sections['What Changes'] || []).forEach(line => {
      const li = line.match(/^- (.+)/);
      if (!li) { if (line.trim()) tail.push(line.trim()); return; }
      const m = li[1].match(/\(?(?:review\.html)?#\/([\w-]+)(?:\/([\w-]+))?(?:\/([\w-]+))?\)?\s*$/);
      if (m) {
        const r = resolve(m[1], m[2] || null, m[3] || null);
        bullets.push({ text: li[1].slice(0, m.index).trim(), anchor: '#/' + [m[1], m[2], m[3]].filter(Boolean).join('/'), id: m[1], state: r ? r.state : null, mark: r ? r.mark : null, ok: !!r, kind: r ? r.v.dataset.kind : null });
      } else bullets.push({ text: li[1].trim(), anchor: null });
    });
    return { why, tail: tail.map(t => '<p>' + inline(t) + '</p>').join('') };
  }
  function renderPanel() {
    const p = parseProposal();
    let html = '<h2>Why</h2>' + p.why + '<h2>What Changes</h2><ol class="changes">';
    bullets.forEach((b, i) => {
      const cls = !b.anchor ? 'text' : b.ok ? '' : 'dead';
      const kind = !b.anchor ? 'no visual' : b.ok ? b.kind + ' · ' + b.anchor : 'dead link · ' + b.anchor + ' — no such visual, state, or mark';
      html += '<li class="' + cls + '" data-i="' + i + '">' + inline(b.text) + '<span class="kind">' + kind + '</span></li>';
    });
    html += '</ol>' + p.tail + '<h2>Notes <span id="notecount"></span></h2><ol class="notes-list" id="notelist"></ol>';
    $panel.innerHTML = html;
    document.getElementById('landing').innerHTML = '<h1>Why</h1>' + p.why.replace(/<p>/g, '<p>') + '<p class="muted">' + bullets.length + ' changes — click one to see it.</p><ol>' + bullets.map((b, i) => '<li data-i="' + i + '">' + inline(b.text) + '</li>').join('') + '</ol>';
  }
  function renderPanelState() {
    $panel.querySelectorAll('ol.changes li').forEach((li, i) => {
      const b = bullets[i];
      const on = current.id === '_text' ? current.bullet === i
        : !!b.anchor && b.id === current.id && (!b.state || b.state === current.state) && (b.mark || null) === current.mark;
      li.classList.toggle('on', on);
    });
    renderCount();
  }
  function goBullet(i) { const b = bullets[i]; document.body.classList.remove('menu'); if (!b.anchor || !b.ok) showText(i); else show(b.id, b.state, b.mark); }

  // ── annotate ──
  const ANNOTATABLE = '.btn, .input, tr, .box, .tag, .hero, .kv dt, .kv dd, h1, .nav span, .logo, .notes li, .notes .brief, .step, .lane .label, .diff .line, .diff pre, .tree li, .caption, .textstage p, .panel ol.changes li, .panel p';
  const KEY = 'rv-notes:' + CHANGE;
  const store = {
    get() { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; } },
    set(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {} }
  };
  let notes = store.get();
  let annotating = false;
  const $ann = document.getElementById('annotate');
  $ann.onclick = () => setAnnotating(!annotating);
  function setAnnotating(on) {
    annotating = on; $ann.setAttribute('aria-pressed', on); document.body.classList.toggle('annotating', on);
    closePopover(); document.querySelectorAll('.hovering').forEach(x => x.classList.remove('hovering'));
  }
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closePopover(); return; }
    if (e.key === 'a' && !e.target.matches('textarea,input')) setAnnotating(!annotating);
  });
  function target(el) {
    if (el.closest('.popover, .chrome, .pin')) return null;
    const scope = el.closest('.visual[data-active], .panel');
    if (!scope) return null;
    const t = el.closest(ANNOTATABLE);
    return t && scope.contains(t) ? { scope, el: t } : null;
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
  function elAt(scope, path) { let n = scope; for (const i of path.split('.')) n = n && n.children[i]; return n || null; }
  function labelOf(el) {
    const c = el.cloneNode(true); c.querySelectorAll('.pin, .callout, .kind, .why').forEach(x => x.remove());
    const text = (el.tagName === 'TR' ? [...c.cells].map(td => td.textContent.trim()).join(' · ') : c.textContent).replace(/\s+/g, ' ').trim().slice(0, 60);
    const kind = el.classList.contains('btn') ? 'button' : el.classList.contains('input') ? 'input' : el.tagName === 'TR' ? 'row'
      : el.classList.contains('box') ? 'panel' : el.tagName === 'H1' ? 'heading' : el.classList.contains('step') ? 'step'
      : el.classList.contains('line') ? 'line' : el.closest('.tree') ? 'file' : el.closest('.panel') ? 'bullet' : el.tagName.toLowerCase();
    return kind + ' "' + text + '"';
  }
  function whereOf(n) {
    if (n.scope === 'panel') return 'What Changes';
    const v = visuals.find(x => x.id === n.visual);
    return '#/' + n.visual + (v && statesOf(v).length > 1 ? '/' + n.state : '');
  }

  document.addEventListener('click', e => {
    if (e.target.closest('.popover')) return;
    const pin = e.target.closest('.pin');
    if (pin) { e.preventDefault(); openPopover(notes.find(n => n.id === pin.dataset.note), pin); return; }
    if (annotating) {
      const t = target(e.target);
      if (t) {
        e.preventDefault();
        const scope = t.scope.classList.contains('panel') ? 'panel' : 'visual';
        openPopover({ id: null, scope, visual: current.id, state: current.state, path: pathOf(t.scope, t.el), label: labelOf(t.el), text: '' }, t.el);
        return;
      }
      return;
    }
    const li = e.target.closest('.panel ol.changes li, #landing li');
    if (li) { goBullet(+li.dataset.i); return; }
    const a = e.target.closest('.panel a[href*="#/"]');
    if (a) { e.preventDefault(); const s = a.getAttribute('href').split('#/')[1].split('/'); show(s[0], s[1], s[2]); return; }
    const go = e.target.closest('[data-go]');
    if (go) show(go.dataset.go, null, null);
  });

  let $pop = null;
  function openPopover(note, anchorEl) {
    closePopover();
    $pop = document.createElement('div'); $pop.className = 'popover';
    $pop.innerHTML = '<div class="where">' + whereOf(note) + ' · ' + inline(note.label) + '</div>'
      + '<textarea placeholder="What should change here?"></textarea>'
      + '<div class="row"><button class="save">Save</button><button class="cancel">Cancel</button>' + (note.id ? '<button class="del">Delete</button>' : '') + '</div>';
    const ta = $pop.querySelector('textarea'); ta.value = note.text;
    $pop.querySelector('.save').onclick = () => {
      const text = ta.value.trim(); if (!text) return closePopover();
      if (note.id) note.text = text; else { note.id = String(Date.now()); note.text = text; notes.push(note); }
      persist(); closePopover();
    };
    $pop.querySelector('.cancel').onclick = closePopover;
    const del = $pop.querySelector('.del'); if (del) del.onclick = () => { notes = notes.filter(n => n.id !== note.id); persist(); closePopover(); };
    ta.onkeydown = ev => { if (ev.key === 'Enter' && (ev.metaKey || ev.ctrlKey)) $pop.querySelector('.save').click(); };
    document.body.appendChild($pop);
    // beside the element: right if there is room, else below, else above — never over it
    if (phoneMedia.matches) { ta.focus(); return; }
    const r = anchorEl.getBoundingClientRect(), W = 300, H = $pop.offsetHeight || 160;
    let top = r.top, left = r.right + 10;
    if (left + W > innerWidth) { left = Math.max(8, Math.min(r.left, innerWidth - W - 8)); top = r.bottom + 8; if (top + H > innerHeight) top = r.top - H - 8; }
    if (top < 50) top = 50;
    $pop.style.top = top + 'px'; $pop.style.left = left + 'px';
    ta.focus();
  }
  function closePopover() { if ($pop) { $pop.remove(); $pop = null; } }
  function persist() { store.set(notes); renderPins(); }
  function renderPins() {
    document.querySelectorAll('.pin').forEach(p => p.remove());
    const $list = document.getElementById('notelist'); if (!$list) return;
    $list.innerHTML = '';
    document.getElementById('notecount').textContent = notes.length ? '(' + notes.length + ')' : '';
    if (!notes.length) $list.innerHTML = '<li class="empty">Turn on Annotate, click anything, type. Copy notes puts them on your clipboard as a /continue command.</li>';
    notes.forEach((n, i) => {
      const scope = n.scope === 'panel' ? $panel : document.getElementById(n.visual);
      const el = scope && elAt(scope, n.path);
      const stale = !el || labelOf(el) !== n.label;
      if (el) { const pin = document.createElement('i'); pin.className = 'pin' + (stale ? ' stale' : ''); pin.dataset.note = n.id; pin.textContent = i + 1; (el.tagName === 'TR' ? el.cells[0] : el).appendChild(pin); }
      const li = document.createElement('li');
      li.innerHTML = '<span class="where">' + whereOf(n) + ' · ' + inline(n.label) + (stale ? ' · <b>moved?</b>' : '') + '</span>' + inline(n.text);
      li.onclick = () => { if (n.scope === 'visual') show(n.visual, n.state, null); const p = document.querySelector('.pin[data-note="' + n.id + '"]'); if (p) { p.scrollIntoView({ block: 'center' }); openPopover(n, p); } };
      $list.appendChild(li);
    });
  }

  // ── copy: a runnable /continue block ──
  function notesText() {
    const lines = ['/continue ' + CHANGE, 'Review notes from ' + FILE + ' (' + notes.length + '):'];
    notes.forEach((n, i) => lines.push((i + 1) + '. ' + whereOf(n) + ' · ' + n.label + ' — ' + n.text));
    return lines.join('\n');
  }
  document.getElementById('copy').onclick = function () {
    if (!notes.length) return toast('No notes yet');
    const text = notesText(), buf = document.getElementById('copybuf'); buf.value = text;
    const done = () => toast('Copied ' + notes.length + ' note' + (notes.length === 1 ? '' : 's') + ' — paste into Claude');
    const fallback = () => { buf.select(); buf.setSelectionRange(0, 99999); document.execCommand('copy'); done(); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback); else fallback();
  };
  function toast(msg) { const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 1800); }

  // ── phone: the chrome's height drives the panel; the list is a sheet; step through changes ──
  function chromeHeight() { document.documentElement.style.setProperty('--chrome-h', document.querySelector('.chrome').offsetHeight + 'px'); }
  window.addEventListener('resize', chromeHeight);
  document.getElementById('menu').onclick = () => document.body.classList.toggle('menu');
  function currentBullet() { const li = document.querySelector('.panel ol.changes li.on'); return li ? +li.dataset.i : -1; }
  function renderCount() {
    const i = currentBullet();
    document.getElementById('count').textContent = i < 0 ? bullets.length + ' changes' : (i + 1) + ' / ' + bullets.length;
    document.getElementById('prev').disabled = i < 0;
    document.getElementById('next').disabled = i >= bullets.length - 1;
    const v = document.querySelector('.visual[data-active]');
    document.getElementById('viewport').style.display = v && v.classList.contains('screen') ? '' : 'none';
  }
  document.getElementById('prev').onclick = () => { const i = currentBullet(); if (i > 0) goBullet(i - 1); else show('_landing'); };
  document.getElementById('next').onclick = () => { const i = currentBullet(); if (i < bullets.length - 1) goBullet(i + 1); };
  document.addEventListener('keydown', e => { if (e.target.matches('textarea,input')) return; if (e.key === 'ArrowRight') document.getElementById('next').click(); if (e.key === 'ArrowLeft') document.getElementById('prev').click(); });

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
