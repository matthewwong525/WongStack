<!-- openspec-archive v1 2026-07-23-rename-docs-to-wiki -->
<!-- file proposal.md utf8 4816 -->
# Rename WongStack's own `docs/` → `wiki/`

**Status:** ready-to-ship
**Open questions:** none

## Why

The `dream-replaces-document` change (v4.4.0) taught every skill to resolve the wiki root as
`wiki/` falling back to `docs/`, rewrote the convention pages to speak in `wiki/` terms, and
explicitly listed WongStack's own directory rename as the deferred follow-up. That follow-up was
never written — so the meta-repo still keeps its wiki at `docs/` while `CLAUDE.md` and
`dream/SKILL.md` already link `wiki/README.md`, `wiki/wiki-style.md`, and
`../../../wiki/wiki-style.md`. **Those links are broken in this repo today**, and WongStack tells
every target repo to use a name it doesn't use itself.

## What Changes

- **Move the tree**: `git mv docs wiki` — `README.md`, `wiki-style.md`, `voice.md`,
  `ux-principles.md`, and `development/{README.md, adding-a-skill.md, secrets.md,
  the-change-loop.md}`. No page content is rewritten beyond path references.
- **Repair every live reference** to the moved paths: `CLAUDE.md` (the Rulebook-canonical line,
  the payload list), `README.md` (tree diagram + what an install gives a target),
  `plan/SKILL.md` (`ux-principles.md` refs incl. the `../../../docs/` relative link),
  `improve/SKILL.md` + `references/docs-audit-playbook.md`, `wong-setup/SKILL.md` +
  `references/fit-playbook.md`, `wong-sync/references/payload-manifest.md`,
  `openspec/config.yaml`, and the wiki's own internal links.
- **Keep the fallback intact.** Skills continue to resolve `wiki/`, falling back to `docs/`.
  Installed targets that kept `docs/` must not break — this change renames the *source* repo, not
  the resolution rule.
- **Refresh the one active change that names `docs/` paths** — `recommended-stack-guide`
  (proposal, design, tasks, spec) — so implementing it lands files in the right place.
  (`improve-openspec-plans` has no such references.)
- **Release ritual**: `VERSION` bump + newest-first `CHANGELOG.md` entry.

**Non-goals:** rewriting CHANGELOG history or archived OpenSpec changes (they are the record of
what shipped, at the paths that existed then); changing the wiki-root *resolution* rule; any
content edit to a wiki page beyond fixing paths; renaming `/improve docs` (the variant name is a
subject, not a path) or `docs-audit-playbook.md`.

## Capabilities

### New Capabilities

- `wiki-root`: where WongStack's progressive-disclosure wiki lives (`wiki/` in this repo), the
  generic `wiki/`-then-`docs/` resolution every skill uses in a target, and the rule that no
  payload file may hardcode `docs/` as the wiki root.

### Modified Capabilities

- `secrets-convention`: the requirement text naming "the `docs/` wiki" and seeding "the
  `secrets.md` page (with `docs/`)" becomes wiki-root-relative.
- `install-onboarding`: the informed-discovery scenario's hardcoded `docs/` folder becomes the
  resolved wiki root.
- `delivery-gate`: the doctrine-text list names `wiki/development/the-change-loop.md`.

## Impact

- **Files moved:** all 8 pages under `docs/` → `wiki/`.
- **Files edited:** `CLAUDE.md`, `README.md`, `VERSION`, `CHANGELOG.md`, `openspec/config.yaml`,
  four skills (`plan`, `improve`, `wong-setup`, `wong-sync`), one active change folder.
- **Downstream:** the payload manifest's convention-page entries are path-resolved, so
  `/wong-sync` keeps syncing them into targets at whichever root each target uses. No installed
  repo needs to act.
- **Risk:** stale links. Mitigated by a repo-wide grep for `docs/` as an acceptance check, with
  CHANGELOG and `openspec/changes/archive/` explicitly excluded.

## Decision log

- **2026-07-23** — Change authored, implemented, and verified in one pass. `git mv docs wiki` moved all 8 pages (history follows). References repaired across `CLAUDE.md`, `README.md`, `openspec/config.yaml`, and the `plan`/`improve`/`wong-setup`/`wong-sync` skills — WongStack's own page paths only; every generic "`wiki/`, falling back to `docs/`" resolution sentence, the `docs/adr/` globs, and the `/improve docs` variant name were left untouched (design decision 4). VERSION → 6.1.0 + CHANGELOG entry. The acceptance grep (decision 6) surfaced a spec the plan had missed — `delivery-gate` names `the-change-loop.md` in its doctrine-text requirement — so a `delivery-gate` delta was added (task 4.3). Branch renamed `docs-wiki-sync` → `rename-docs-to-wiki` to restore the branch=change tie. **Task 1.2 left unchecked deliberately:** it asked for the pure rename as its own commit before the edits, but `/apply` owns no git, so the rename + edits land in one `/save` commit; rename detection still holds (6 of 8 pages byte-identical). Pre-existing rot noted, out of scope: `wiki/development/adding-a-skill.md` links the deleted `document` skill — a `/dream` or `/improve docs` item.

<!-- end proposal.md -->
<!-- file design.md utf8 6345 -->
## Context

Docs-only change, but a cross-cutting one: every payload surface names the wiki somewhere. Today
WongStack's own wiki sits at `docs/` while the skills, `CLAUDE.md`, and the convention pages all
speak in `wiki/` terms — the leftover half of `dream-replaces-document`, which shipped the
resolution rule (`wiki/`, falling back to `docs/`) and deferred the directory rename as
"the natural follow-up change, kept separate to keep this one review-sized."

The gap is not cosmetic. `CLAUDE.md` links `wiki/README.md` and `wiki/wiki-style.md`; `dream/SKILL.md`
links `../../../wiki/wiki-style.md`. All three are dead in this repo right now — the source repo's
own instructions point at files that don't exist. Meanwhile `openspec/config.yaml`'s project context
and design rule still say `docs/`, so every future change is drafted against the old name.

Two constraints shape the work. First, **installed targets must not notice**: the fallback is what
protects repos that kept `docs/`, and this change renames the source, not the rule. Second, the repo
has no build or test suite — the payload is prose, so verification is a grep and a link check, not a
green CI run.

## Goals / Non-Goals

**Goals:**

- WongStack's wiki lives at `wiki/`, with page history preserved through `git mv`.
- Every live intra-repo link to a moved page resolves.
- The generic wiki-root resolution rule survives untouched, and the payload manifest keeps syncing
  convention pages to each target's *resolved* root.
- Future changes are drafted against the new name (`openspec/config.yaml` updated).
- The release is legible to installed repos: VERSION + CHANGELOG say the source moved and that
  nothing is required of them.

**Non-Goals:**

- Narrowing the resolution rule to `wiki/` only, or deprecating `docs/` in targets.
- Rewriting CHANGELOG history or archived changes — they record what shipped at the paths that
  existed then.
- Any content edit to a wiki page beyond fixing paths. Voice, structure, and coverage stay as-is;
  that work belongs to `/dream` or `/improve docs`.
- Renaming the `/improve docs` variant or `references/docs-audit-playbook.md`. "docs" there names a
  subject (documentation), not a directory.
- Auto-migrating any target repo's `docs/` → `wiki/`. If a target wants the rename, its owner does
  it; the fallback means they never have to.

## Decisions

**1. `git mv docs wiki` as one move, not per-file copies.** A directory move keeps rename detection
intact so `git log --follow` reaches each page's earlier revisions and the PR diff reads as
renames-plus-small-edits rather than 8 deletions and 8 additions. *Alternative — copy then delete:*
rejected; it destroys the readable diff for no benefit.

**2. Path edits in a second commit, after the move.** Committing the pure rename first means the
reference repairs show up as a small, reviewable diff instead of being buried inside the rename
commit. Same PR, two commits.

**3. Keep the `wiki/`-then-`docs/` fallback everywhere it appears.** Every skill sentence of the
form "resolve the wiki root — `wiki/`, falling back to `docs/`" stays verbatim. These describe how a
skill behaves in *someone else's* repo; the source repo's own layout has no bearing on them. Only
sentences that name *WongStack's own* pages get rewritten. *Alternative — drop the fallback now that
the source is renamed:* rejected, it would silently break every repo installed before v4.4.0 and buy
nothing.

**4. Distinguish the three kinds of `docs/` mention** before editing, since a blind
find-and-replace would corrupt two of them:

| Kind | Example | Action |
| --- | --- | --- |
| WongStack's own page | `CLAUDE.md`'s `docs/wiki-style.md` | Rewrite to `wiki/` |
| A target's wiki root, generically | `improve/SKILL.md`'s "`wiki/` if it exists, else `docs/`" | Leave alone |
| Unrelated path or subject | `improve`'s `docs/adr/` glob; `/improve docs` | Leave alone |

**5. Minor version bump (6.0.1 → 6.1.0).** No target's behavior changes and nothing installed
breaks, so it isn't major; but the payload's own layout moved and the manifest prose changed, which
is more than a patch. *Alternative — patch:* understates a structural move contributors will see in
their next sync diff.

**6. Verification is a scoped grep, not a link-checker dependency.** `grep -rn "docs/"` excluding
`CHANGELOG.md` and `openspec/changes/archive/`, with every surviving hit explained against the table
in decision 4, plus an existence check on each relative link out of `plan/SKILL.md` and
`dream/SKILL.md`. Adding a link-checking tool to a prose repo with no toolchain is more machinery
than the problem warrants. *Alternative — add markdown-link-check in CI:* worth considering later as
its own change; out of scope here.

**7. Update the active `recommended-stack-guide` change in place.** Its proposal, design, tasks, and
spec name `docs/recommended-stack.md` and `docs/README.md`. Unimplemented, so editing it costs
nothing and prevents someone later creating `docs/` afresh. Archived changes are left alone by
contrast — they are history, not instructions. *Alternative — leave it and fix at apply time:*
rejected, it plants a trap for whoever picks the change up.

## Risks / Trade-offs

- **A stale link survives the grep** (e.g. an anchor-relative link inside a wiki page, or a `docs`
  mention with no trailing slash) → the acceptance check greps for bare `docs` word-boundary matches
  as well as `docs/`, and each hit is classified against the decision-4 table rather than skimmed.
- **A generic fallback sentence gets rewritten by accident**, silently breaking targets that kept
  `docs/` → no blanket find-and-replace; every edit is made by hand against the table, and the spec
  carries a scenario asserting the fallback still resolves for an un-renamed target.
- **A contributor's in-flight branch touches `docs/`** and conflicts on merge → git's rename
  detection resolves the common cases; the change is small and worth merging promptly rather than
  letting it sit.
- **Trade-off: churn for no functional gain.** Nothing works better after this lands. What it buys
  is that WongStack's own instructions stop pointing at files that don't exist, and that the toolkit
  practices the convention it ships — which is the whole basis for trusting the convention.

<!-- end design.md -->
<!-- file tasks.md utf8 4405 -->
## 1. Move the tree

- [x] 1.1 `git mv docs wiki` — one directory move so rename detection holds (design decision 1), covering `README.md`, `wiki-style.md`, `voice.md`, `ux-principles.md`, and `development/{README.md, adding-a-skill.md, secrets.md, the-change-loop.md}`
- [ ] 1.2 Commit the pure rename on its own, before any reference edits (design decision 2), and confirm `git log --follow wiki/wiki-style.md` reaches the file's earlier revisions

## 2. Repair references in the wiki itself

- [x] 2.1 `wiki/README.md` — the "New section? Add a `docs/<section>/README.md` hub" line becomes `wiki/<section>/README.md`; verify the relative links to `wiki-style.md`, `voice.md`, `ux-principles.md`, and `development/README.md` still resolve
- [x] 2.2 `wiki/development/README.md` — the payload list's `[docs/](../README.md)` self-reference becomes `wiki/`; check its `../../` links to `.claude/skills/`, `VERSION`, `CHANGELOG.md`, and `CLAUDE.md`
- [x] 2.3 `wiki/voice.md`, `wiki/wiki-style.md`, `wiki/ux-principles.md`, `wiki/development/{adding-a-skill,secrets,the-change-loop}.md` — sweep each for `docs/` mentions and classify per design decision 4 before editing

## 3. Repair references in the payload surfaces

- [x] 3.1 `CLAUDE.md` — payload list `[docs/](docs/)` → `[wiki/](wiki/)`; the Rulebook-canonical line's `docs/wiki-style.md` → `wiki/wiki-style.md`; confirm the already-`wiki/` links in "Where context lives" (`wiki/README.md`, `wiki/wiki-style.md`) now resolve
- [x] 3.2 `README.md` — the repo tree diagram (`├── docs/{README.md, wiki-style.md}`) and the "installing into a target repo gives it" line; keep the `/improve docs` row's generic "(`wiki/`, falling back to `docs/`)" phrasing intact
- [x] 3.3 `.claude/skills/plan/SKILL.md` — three `docs/ux-principles.md` mentions incl. the relative link `../../../docs/ux-principles.md` → `../../../wiki/ux-principles.md`; verify the target file exists at that path
- [x] 3.4 `.claude/skills/dream/SKILL.md` — verify its existing `../../../wiki/wiki-style.md` link now resolves (no edit expected); leave the "falling back to `docs/`" resolution sentence alone
- [x] 3.5 `.claude/skills/improve/` — `SKILL.md` and `references/docs-audit-playbook.md`: leave every wiki-root resolution sentence, the `docs/adr/` glob, and the `docs` variant name untouched (design decision 4); edit only WongStack's own page paths
- [x] 3.6 `.claude/skills/wong-setup/SKILL.md` + `references/fit-playbook.md` — the research/seed steps and the research-hook question phrase a target's wiki generically rather than as `docs/`
- [x] 3.7 `.claude/skills/wong-sync/references/payload-manifest.md` — confirm the convention-page entries still resolve to the target's wiki root and name WongStack's own source paths as `wiki/`
- [x] 3.8 `openspec/config.yaml` — the `context` block's "the docs/ progressive-disclosure wiki" and the `design` rule's `docs/ux-principles.md` → `wiki/`

## 4. Active OpenSpec change

- [x] 4.1 `openspec/changes/recommended-stack-guide/` — rewrite the `docs/` paths in `proposal.md`, `design.md`, `tasks.md`, and `specs/stack-guide/spec.md` to `wiki/` so implementing it doesn't recreate `docs/`
- [x] 4.2 Leave `openspec/changes/archive/**` and existing `CHANGELOG.md` sections unrewritten (design non-goal); `improve-openspec-plans` needs no edits
- [x] 4.3 Add a `delivery-gate` delta spec — the 6.1 grep surfaced `docs/development/the-change-loop.md` inside its doctrine-text requirement, which the original plan missed

## 5. Release ritual

- [x] 5.1 Bump `VERSION` to `6.1.0` (design decision 5)
- [x] 5.2 Add the newest-first `CHANGELOG.md` entry: the source wiki moved to `wiki/`, the `wiki/`-then-`docs/` fallback is unchanged, and no installed repo needs to act

## 6. Verify

- [x] 6.1 `grep -rn "docs/" . --include='*.md' --include='*.yaml'` excluding `CHANGELOG.md` and `openspec/changes/archive/` — classify every surviving hit against the design's decision-4 table; nothing unexplained remains
- [x] 6.2 Repeat with a bare word-boundary `docs` grep to catch mentions without a trailing slash (design risk 1)
- [x] 6.3 Check each relative link out of `plan/SKILL.md`, `dream/SKILL.md`, `wiki/README.md`, and `wiki/development/README.md` resolves to an existing file
- [x] 6.4 Confirm no `docs/` directory remains at the repo root and `openspec validate rename-docs-to-wiki` passes

<!-- end tasks.md -->
<!-- file specs/delivery-gate/spec.md utf8 934 -->
## MODIFIED Requirements

### Requirement: CI is optional, not required

The WongStack doctrine SHALL treat GitHub Actions (and CI generally) as an optional accelerator that is honored when present and never required. Doctrine text across the payload — `CLAUDE.md`, `README.md`, `wiki/development/the-change-loop.md`, and the `save`, `ship`, and `wong-setup` skills — MUST NOT assert CI as the sole or required gate. The system's durable pillars SHALL be described as: pull requests, version control, OpenSpec, and everything-lives-in-the-repo.

#### Scenario: Payload prose describes CI as optional

- **WHEN** a reader reviews the delivery doctrine in `CLAUDE.md`, `README.md`, or the `save`/`ship` skills
- **THEN** the text states CI is honored when present but not required, and names PR review as the gate when CI is absent
- **AND** no remaining sentence asserts "CI is the only gate" or "GitHub Actions is the build gate"

<!-- end specs/delivery-gate/spec.md -->
<!-- file specs/install-onboarding/spec.md utf8 690 -->
## MODIFIED Requirements

### Requirement: Research before the conversation

`wong-setup` SHALL run its deep-research step (the target-repo survey: what the app is, how it ships, CLAUDE.md, the wiki at its resolved root — `wiki/`, falling back to `docs/` — skills, OpenSpec, legacy traces, GitHub readiness) *before* any discovery conversation, and SHALL use the findings to make its questions specific to the repo rather than generic.

#### Scenario: Informed discovery

- **WHEN** the skill runs in a repo with no CI and a stale wiki folder
- **THEN** the discovery questions reference those findings (e.g. asking how they verify a change today) instead of asking from a blank script

<!-- end specs/install-onboarding/spec.md -->
<!-- file specs/secrets-convention/spec.md utf8 1583 -->
## MODIFIED Requirements

### Requirement: A docs page documents the convention

The wiki SHALL include a page describing the secrets-example convention — why real secrets stay out of git, how the `.example` file stays the source-of-truth list of variables, and how a contributor bootstraps a local secrets file from it. In the WongStack repo that page is `wiki/development/secrets.md`; in a target it sits at that repo's resolved wiki root (`wiki/`, falling back to `docs/`). The page SHALL follow the progressive-disclosure rulebook (topic title, strong opener, linked up/down/sideways) and be registered in the development section README.

#### Scenario: The wiki explains the convention

- **WHEN** a contributor looks for how secrets are handled
- **THEN** a wiki page explains the `.env.example`-as-source-of-truth pattern and how to bootstrap a local file
- **AND** the development section README links it

### Requirement: The installer offers the convention without forcing it

`wong-setup` SHALL offer to seed the convention into a target repo — the `secrets.md` page (at the target's resolved wiki root) plus, on confirmation, an `.env.example` and the git-ignore entries for real secrets files. It SHALL confirm before touching `.gitignore` or adding the example, since the target may already handle secrets its own way.

#### Scenario: Installer seeds on opt-in

- **WHEN** `wong-setup` runs against a repo with no secrets convention and the user opts in
- **THEN** it adds `.env.example` and the `.gitignore` entries; if the user declines, it leaves them untouched

<!-- end specs/secrets-convention/spec.md -->
<!-- file specs/wiki-root/spec.md utf8 3616 -->
## ADDED Requirements

### Requirement: WongStack's own wiki lives at `wiki/`

The WongStack repo's progressive-disclosure wiki SHALL live at `wiki/` at the repo root — the same name the payload tells every target repo to use. The tree SHALL be moved with `git mv` so history follows each page, and no page's content SHALL change except for path references.

#### Scenario: The source repo uses the name it teaches

- **WHEN** someone clones WongStack
- **THEN** the wiki is at `wiki/` (hub `wiki/README.md`, rulebook `wiki/wiki-style.md`, plus `voice.md`, `ux-principles.md`, and the `development/` section)
- **AND** no `docs/` directory remains at the repo root

#### Scenario: History survives the move

- **WHEN** the rename lands
- **THEN** each page was moved with `git mv`, so `git log --follow` still reaches its earlier revisions

### Requirement: The wiki-root resolution rule is unchanged

The skills SHALL continue to resolve a repo's wiki root generically — `wiki/` if present, otherwise `docs/`. This change SHALL NOT narrow that rule to `wiki/` only. A target repo that installed WongStack before the rename and kept its wiki at `docs/` SHALL keep working with no action from its owner.

#### Scenario: An un-renamed target still works

- **WHEN** `/dream` or `/improve docs` runs in a target repo whose wiki is still at `docs/`
- **THEN** it resolves the wiki root to `docs/` and behaves exactly as before

#### Scenario: Convention pages sync to the resolved root

- **WHEN** `/wong-sync` syncs the convention pages (`wiki-style.md`, `voice.md`, `development/secrets.md`, and `ux-principles.md` in UI-bearing repos) into a target
- **THEN** it places them at that target's resolved wiki root, not at a hardcoded `wiki/`

### Requirement: No payload file hardcodes `docs/` as the wiki root

Every live payload file — the skills under `.claude/skills/`, `CLAUDE.md`, `README.md`, `openspec/config.yaml`, and the wiki pages themselves — SHALL refer to WongStack's own wiki pages by their `wiki/` paths, and SHALL refer to a *target's* wiki generically (the resolved wiki root) rather than as `docs/`. Every intra-repo link to a moved page SHALL resolve.

#### Scenario: Repo-wide link check

- **WHEN** the repo is grepped for `docs/` outside `CHANGELOG.md` and `openspec/changes/archive/`
- **THEN** the only remaining hits are generic fallback mentions (`wiki/`, falling back to `docs/`), unrelated paths (e.g. `docs/adr/` globs in `improve`), and the `docs` variant name of `/improve docs`

#### Scenario: Relative skill links resolve

- **WHEN** `plan/SKILL.md` and `dream/SKILL.md` link the rulebook and `ux-principles.md` by relative path
- **THEN** those paths point at files that exist under `wiki/`

### Requirement: The rename is a payload release

The rename SHALL follow the payload release ritual: a semver `VERSION` bump and a newest-first `CHANGELOG.md` entry explaining the move, the unchanged fallback, and that no installed repo needs to act. Historical `CHANGELOG.md` entries and archived changes under `openspec/changes/archive/` SHALL NOT be rewritten — they record what shipped at the paths that existed then.

#### Scenario: Updater can explain the change

- **WHEN** a target repo runs `/wong-sync` after this release
- **THEN** the CHANGELOG entry tells its owner the source wiki moved, that the fallback still holds, and that renaming their own `docs/` is optional

#### Scenario: History is left alone

- **WHEN** the change is implemented
- **THEN** no entry under `openspec/changes/archive/` and no pre-existing CHANGELOG section has its `docs/` paths rewritten

<!-- end specs/wiki-root/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-07-23

~~~
<!-- end .openspec.yaml -->
