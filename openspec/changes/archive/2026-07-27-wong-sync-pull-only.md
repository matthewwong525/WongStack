<!-- openspec-archive v1 2026-07-27-wong-sync-pull-only -->
<!-- file proposal.md utf8 5772 -->
# wong-sync-pull-only

**Status:** ready-to-ship
**Open questions:** none

## Why

`/wong-sync` currently ends every run by curating your local drift and asking what to send upstream. Most of the time people just want the update — they ran a sync to *pull*, and the contribute leg is a prompt they decline. Making a rarely-wanted step mandatory on a frequently-run command is backwards: the default should be the common case, and contributing should be something you ask for when you actually mean it.

Nothing is lost. The contribution machinery — curation bar, fork-aware PR, release ritual — stays exactly as it is; it just stops running unprompted. Discovery moves to a documented page, which is where "how do I send this upstream?" belongs anyway.

**Non-goals:** the contribute *capability* is not removed, weakened, or changed in behavior — only in how it's triggered. No change to the pull leg, the three-way diff, fresh mode, or the stack pack.

## What Changes

- **`/wong-sync` becomes pull-only by default.** A bare `/wong-sync` refreshes the clone, classifies, pulls upstream updates into the working tree, rewrites the manifest, and reports. It no longer curates local drift or asks about contributing.
- **`/wong-sync contribute` runs the contribute leg**, on request. The full existing flow: classify local-only drift as candidates, one-line generality rationale each, opt-in per file, then branch + release ritual + fork-aware PR in the clone. Invoked this way it still pulls first (the ordering rule that makes drift self-cancel is behavior, not a prompt).
- **A contributing page in the wiki** — how to send a payload improvement upstream, what the generality bar is ("does this belong in every WongStack repo?"), and the `/wong-sync contribute` command. Added to the payload manifest's synced docs so target repos actually get it — the page is the discovery path that replaces the prompt.
- **Reword the round-trip framing** everywhere it implies contributing happens automatically: `wong-sync`'s skill `description` + opener + step diagram, the `WONG-STACK` block in `CLAUDE.md`, `wiki/development/README.md`, `README.md`'s skill table, and `wong-setup`'s installed-repo hand-off line.
- `CHANGELOG.md` entry + `VERSION` bump (minor — behavior change to a skill's default, additive doc).

## Capabilities

### New Capabilities
<!-- None. -->

### Modified Capabilities
- `wong-sync`: the round trip becomes pull-by-default; the contribute leg runs only on explicit `/wong-sync contribute`; the manifest's synced docs gain the contributing page.

<!-- `install-onboarding` and `wiki-root` need prose rewording only (a hand-off line, a wiki link) — no requirement changes, so no delta specs. -->

## Non-goals

The contribution machinery is unchanged in behavior: same curation bar, same opt-in-per-file default, same fork-aware PR and release ritual. Only its trigger moves from automatic to explicit.

## Impact

- **Skills:** `.claude/skills/wong-sync/SKILL.md` (description, opener, diagram, Step 4/5 gating, Step 7 report), `.claude/skills/wong-setup/SKILL.md` (one hand-off line).
- **Docs:** new contributing page at the wiki root; `wiki/development/README.md` link; `wiki/development/required-tools.md` (the `gh` row cites "the `/wong-sync` contribution leg" — reword to stay accurate); `README.md` skill table.
- **`CLAUDE.md`:** the `WONG-STACK` block's `/wong-sync` bullet + the "What this is" round-trip sentence.
- **Manifest:** `payload-manifest.md` gains the contributing page in the synced docs list.
- **Root payload:** `CHANGELOG.md` + `VERSION`.
- **No change** to the pull leg, three-way classification, fresh mode, manifest schema, or the stack pack.

## Decision log

- **2026-07-27** — All 15 tasks implemented; v6.7.0 cut. `wong-sync`'s `SKILL.md` gained an **Input contract** section stating the two invocations and that `contribute` still pulls first (no contribute-only mode); Steps 4 and 5 are headed `— contribute only` with an explicit gate line each, and Step 3 now ends a bare run outright. The Step 2 table's `unchanged upstream / changed local` row was renamed from **contribution candidate** to **local-only change** — the classification still runs (Step 3 needs it to know a file isn't a clean update), it's just silent on a bare run. Step 7 split into bare and `contribute` reports; the bare report closes with one non-prompting line naming `/wong-sync contribute`, and explicitly **does not name which local files drifted** — listing them would turn the line back into the prompt this change removes. Two hard rules added ("Pull-only unless asked", "`contribute` still pulls first"). New `wiki/contributing.md` written and added to the manifest's synced-docs list, linked from `wiki/README.md` (prose + section list) and `wiki/development/README.md`. Reworded `AGENTS.md` (both surfaces), `README.md`'s skill table, `wiki/development/README.md`, `required-tools.md`'s `gh` row, and `wong-setup`'s installed-repo hand-off.
- **2026-07-27** — Two discoveries during implementation, neither changing the plan. (1) **`CLAUDE.md` is a symlink to `AGENTS.md`** in this repo, and `.claude/skills/` resolves to `.agents/skills/` — the task list names the `CLAUDE.md`/`.claude/` paths, but edits must be written to the real targets. (2) `contributing.md` ships to target repos, whose wiki root may be `docs/` rather than `wiki/` and which never receive `wiki/development/` — so the page **must not link into `development/`**. A drafted link to `required-tools.md` was cut for this reason, and Step 7's closing line names `contributing.md` at the wiki root in plain text rather than as a relative link. Ruled out: making the page's `gh` note a link, since there is no synced page to point at.

<!-- end proposal.md -->
<!-- file design.md utf8 4735 -->
## Context

Change 3 of the arc, and the only one independent of the Cloudflare stack — it could have shipped first. `/wong-sync` was built as a "round trip": pull, then curate local drift and offer it upstream. In practice the contribute leg is declined most runs, so a command people invoke to *get updates* ends with a curation step they didn't ask for. The machinery is good; the trigger is wrong.

The fix is deliberately small: gate an existing step behind an argument, then make the prose stop promising it. The risk here is not implementation — it's **discoverability**, since removing a prompt removes the only place most people would learn the capability exists.

## Goals / Non-Goals

**Goals:**
- A bare `/wong-sync` pulls and stops. No curation, no contribute prompt.
- `/wong-sync contribute` runs the existing leg unchanged, still pulling first.
- Replace the prompt's discovery role with a documented page that ships to target repos.
- Reword every surface that implies a plain sync contributes.

**Non-Goals:**
- No behavior change inside the contribute leg (curation bar, opt-in-per-file, fork-aware PR, release ritual all stay).
- No change to the pull leg, three-way classification, fresh mode, manifest schema, or the stack pack.
- Not removing the capability — this is a trigger change, not a deprecation.

## Decisions

**1. Argument-gated, not deleted.** `/wong-sync contribute` keeps the whole Step 4–5 flow intact; a bare run skips to Step 6. Deleting the machinery would have been simpler but throws away working fork-aware PR + release-ritual code that has no other home. *Alternative — a `--contribute` flag:* same thing, but the skills in this payload take bare-word arguments (`/save <note>`, `/continue <name>`), so a bare word matches the house style.

**2. An explicit contribute run still pulls first.** The pull-before-contribute ordering is what makes local drift that already landed upstream self-cancel instead of being re-offered. That's a correctness property of the classification, not a UX nicety, so it survives the gating — `/wong-sync contribute` is "sync, then also contribute," never "contribute only."

**3. The contributing page is a *synced* doc, not a meta-repo page.** This is the load-bearing choice. `wiki/development/` documents working on WongStack itself and does **not** sync to targets; a contributing page that lives only there would be invisible to exactly the people who need it — someone in a target repo who improved a skill. So it joins the manifest's synced docs list (alongside `wiki-style.md`, `voice.md`, `secrets.md`, `ux-principles.md`) and installs into every target. Without this, removing the prompt genuinely loses the capability.

**4. Reword prose everywhere, in one pass.** Six surfaces currently promise the round trip: the `wong-sync` skill `description` + opener + the Step-1-through-6 diagram, `CLAUDE.md`'s "What this is" sentence and its `WONG-STACK` block bullet, `wiki/development/README.md`, `README.md`'s skill table, `wong-setup`'s installed-repo hand-off line, and `required-tools.md`'s `gh` row (which cites "the `/wong-sync` contribution leg" as a reason `gh` is required — still true, but should read as the explicit action). A spec scenario asserts none of them describe a bare sync as contributing, so this can't half-land.

**5. `gh` stays required.** It's needed for the pull leg's clone refresh and for the delivery gate regardless; the contribute leg was never its only justification. Only the wording of that row changes.

## Risks / Trade-offs

- **Discoverability loss** → the prompt was the only place most users met the contribute capability; a page can go unread. *Mitigation:* Decision 3 (ship the page into targets), plus naming `/wong-sync contribute` in the skill's own description and report so an agent reading the skill still surfaces it on request. Accepted: fewer accidental contributions is the point, and a contribution someone had to seek out is a better contribution.
- **Fewer upstream contributions overall** → the honest consequence of making it opt-in-by-invocation. *Trade accepted:* the prompt was mostly generating declines, and the curation bar already made most drift a skip.
- **Skill prose drift** → six surfaces reworded by hand can half-land. *Mitigation:* the spec scenario "No payload prose implies automatic contribution" makes the sweep verifiable, and a task enumerates every file.
- **Someone's muscle memory** → a user who relied on the automatic prompt now has to know the word. *Mitigation:* the pull-only report ends by naming `/wong-sync contribute` as the way to send improvements up — one line, no prompt, no decision to make.

## Open Questions

- None blocking.

<!-- end design.md -->
<!-- file tasks.md utf8 3360 -->
## 1. Gate the contribute leg in `wong-sync`

- [x] 1.1 Add the input contract to `.claude/skills/wong-sync/SKILL.md`: bare `/wong-sync` = pull-only; `/wong-sync contribute` = pull, then the contribute leg. State that an explicit contribute run **still pulls first** (the ordering is a correctness property, per design Decision 2).
- [x] 1.2 Gate Step 4 (curate) and Step 5 (branch + ritual + PR) on the `contribute` argument — on a bare run, skip from Step 3 straight to Step 6. Leave both steps' internals unchanged.
- [x] 1.3 Update the Step 2 classification table: a local-only change is still classified, but on a bare run it's silent (no candidate surfaced) rather than queued for Step 4.
- [x] 1.4 Update Step 7's report: on a bare run report pulled/conflicts/manifest only, and close with one line naming `/wong-sync contribute` as the way to send improvements upstream (no prompt, no decision).
- [x] 1.5 Rewrite the skill's frontmatter `description` and its opener + step diagram so neither describes a plain sync as contributing back.

## 2. The contributing page (synced to targets)

- [x] 2.1 Write the contributing page at the wiki root per `wiki/wiki-style.md` + `wiki/voice.md`: what `/wong-sync contribute` does, the generality bar ("does this belong in every WongStack repo?"), opt-in per file with skip as default, and that the skill opens the upstream PR itself (fork-aware, VERSION + CHANGELOG ritual). Link it up/down/sideways.
- [x] 2.2 Add the page to the **synced docs** list in `.claude/skills/wong-sync/references/payload-manifest.md` — alongside `wiki-style.md`, `voice.md`, `development/secrets.md`, `ux-principles.md` — so target repos receive it (design Decision 3; this is what replaces the prompt's discovery role).
- [x] 2.3 Link the page from `wiki/README.md` (and `wiki/development/README.md` if it reads naturally there) so it isn't orphaned.

## 3. Reword the round-trip framing

- [x] 3.1 `CLAUDE.md` — the "What this is" sentence ("runs the round trip: pull updates down, contribute improvements back up") and the `WONG-STACK` block's `/wong-sync` bullet ("runs the round trip in one pass … then offers your genuinely-local payload improvements back upstream"). Frame as: pulls updates; contributing is `/wong-sync contribute`.
- [x] 3.2 `README.md` — the skill table row for `/wong-sync`.
- [x] 3.3 `wiki/development/README.md` — the `/wong-sync` description in the payload/processes prose.
- [x] 3.4 `wiki/development/required-tools.md` — the `gh` row cites "the `/wong-sync` contribution leg"; reword so it reads as the explicit action (`gh` stays required regardless — design Decision 5).
- [x] 3.5 `.claude/skills/wong-setup/SKILL.md` — the installed-repo hand-off line ("run `/wong-sync` to pull updates and contribute improvements back") → pull updates only.

## 4. Release + verify

- [x] 4.1 `CHANGELOG.md` entry + `VERSION` bump (minor — a skill's default behavior changes; additive doc).
- [x] 4.2 Verify: a bare `/wong-sync` run surfaces no contribution prompt anywhere in the runbook; `/wong-sync contribute` still pulls before curating; the contributing page is in the manifest's synced docs and linked from the wiki; **no payload prose describes a plain sync as contributing** (sweep `README.md`, `CLAUDE.md`, `wiki/`, both skills); `openspec validate wong-sync-pull-only` passes.

<!-- end tasks.md -->
<!-- file specs/wong-sync/spec.md utf8 6748 -->
## MODIFIED Requirements

### Requirement: One-pass round trip, pull before contribute

The `wong-sync` skill SHALL be **pull-only by default**. A bare invocation SHALL refresh the clone, classify every in-manifest payload file, pull upstream changes into the target's working tree, rewrite the manifest, and report — and SHALL NOT curate local drift or prompt about contributing.

The contribute leg SHALL run only when explicitly requested (`/wong-sync contribute`). When requested, the skill SHALL run the full round trip in a single invocation, in this order: refresh the clone → pull upstream changes into the target → identify remaining local drift as contribution candidates → open an upstream PR for approved contributions. The pull leg MUST complete before the contribute leg begins, so that drift already resolved upstream self-cancels and is never offered back up. This ordering is behavior, not a prompt: an explicit contribute run still pulls first.

#### Scenario: Bare sync never mentions contributing

- **WHEN** the user runs `/wong-sync` with no argument
- **THEN** the skill pulls upstream updates, rewrites the manifest, and reports
- **AND** it neither curates local drift nor asks whether to contribute anything

#### Scenario: Explicit contribute runs the full round trip

- **WHEN** the user runs `/wong-sync contribute`
- **THEN** the pull leg completes first, then local-only drift is curated as candidates and approved files become an upstream PR

#### Scenario: Local change already landed upstream

- **WHEN** a payload file was customized locally, an equivalent change has already been merged into WongStack upstream, and the user runs `/wong-sync contribute`
- **THEN** the pull leg brings the file into sync and the contribute leg does not offer it as a candidate

#### Scenario: Refuses to run in the WongStack source

- **WHEN** `/wong-sync` is invoked inside a WongStack clone itself (the resolved clone equals the current repo)
- **THEN** the skill stops without changing anything, explaining the source has nothing to sync with itself

### Requirement: Curation bar for contributions

When the contribute leg runs (only on explicit request), each contribution candidate SHALL carry a one-line generality rationale answering "does this belong in every WongStack repo?". Contributing is opt-in: the default disposition is skip, and drift the skill judges app-specific or marginal is presented as such. Approved candidates' rationales become the PR body. Because the leg no longer runs unprompted, a repo with local drift SHALL accumulate no prompts during ordinary syncs.

#### Scenario: App-specific drift

- **WHEN** a payload file's local change encodes something specific to this repo and the contribute leg is running
- **THEN** the skill recommends skip with its rationale, and the file moves upstream only on an explicit opt-in

#### Scenario: PR body content

- **WHEN** the upstream PR is created
- **THEN** its body lists each contributed file with its generality rationale

#### Scenario: Local drift is silent on a bare sync

- **WHEN** a repo has locally modified payload files and the user runs a bare `/wong-sync`
- **THEN** those files are not surfaced as contribution candidates and no prompt about them appears

### Requirement: Single payload manifest, wong-sync included

The payload-manifest list (which files sync) SHALL live in exactly one place, inside the `wong-sync` skill, and `wong-setup` SHALL reference it rather than keep a copy — `wong-setup` copies no payload file except the `wong-sync` skill itself (its bootstrap); everything else installs through the fresh-mode pull. The list includes the workflow skills plus `wong-sync` itself, the docs convention pages — **including a contributing page documenting how to send a payload improvement upstream** — and the CLAUDE.md `WONG-STACK` block; it excludes `wong-setup`, `VERSION`, and `CHANGELOG.md`. The manifest SHALL additionally define an **opt-in `stack-pack` category** — the pack's drop-in files (its scripts, seed template, and `wiki/stack/` pipeline docs) — that is read and copied **only** for a repo whose manifest has `components.stackPack: true`; for any other repo those files are outside the manifest and MUST never be read or copied. Files outside the manifest MUST never be read or copied in either direction. A payload skill installed under a different local name SHALL be diffed under that name via the manifest's skills mapping.

#### Scenario: wong-sync updates itself

- **WHEN** upstream ships an improved `wong-sync` skill
- **THEN** the sync's pull leg offers the update like any other payload file

#### Scenario: App files cannot leak

- **WHEN** the target contains app-specific skills, source, or docs outside the manifest
- **THEN** the skill never reads them and they cannot appear in the clone or the PR

#### Scenario: Pack files are in-manifest only for opt-in repos

- **WHEN** `/wong-sync` runs in a repo whose manifest lacks `components.stackPack: true`
- **THEN** the pack's files are treated as outside the manifest — never classified, pulled, or offered
- **AND** in a repo with `components.stackPack: true`, those same files are classified and pulled like any other payload file

#### Scenario: Target repos receive the contributing page

- **WHEN** a repo installs or syncs the payload
- **THEN** the contributing page arrives with the other synced docs, so the way to contribute is discoverable without the prompt

## ADDED Requirements

### Requirement: Contributing is documented rather than prompted

The payload SHALL include a contributing page at the wiki root explaining how to send a payload improvement upstream: that `/wong-sync contribute` runs the leg, what the generality bar is ("does this belong in every WongStack repo?"), that approval is opt-in per file, and that the skill opens the upstream PR itself (fork-aware, with the VERSION + CHANGELOG release ritual). Payload prose SHALL NOT describe an ordinary sync as contributing improvements back — descriptions, skill openers, the `WONG-STACK` block, and the README SHALL frame `/wong-sync` as pulling updates, with contributing named as an explicit, separate action.

#### Scenario: A reader finds how to contribute

- **WHEN** someone wants to send a workflow improvement upstream
- **THEN** the contributing page tells them to run `/wong-sync contribute` and states the generality bar and the opt-in-per-file rule

#### Scenario: No payload prose implies automatic contribution

- **WHEN** a reader reviews the `wong-sync` description and opener, the `WONG-STACK` block, the README skill table, and the wiki
- **THEN** none of them describe a plain `/wong-sync` as contributing anything upstream

<!-- end specs/wong-sync/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-07-27

~~~
<!-- end .openspec.yaml -->
