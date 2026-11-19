<!-- openspec-archive v1 2026-09-29-one-home-per-rule -->
<!-- file proposal.md utf8 7708 -->
# Give each rule one home, so the docs stop disagreeing

**Status:** ready-to-ship
**Branch:** naive-catfish
**Open questions:** none

## Why

An audit on 2026-09-29 found the same rule written in several places, and the copies now say different things: what an install gets, whether the Cloudflare setup is optional, which commands save and publish, what to ask after a plan. An agent that reads the wrong copy does the wrong thing, and every copy has to be fixed by hand each time the rule changes. The record of what shipped has drifted the same way.

## What Changes

- **Each rule is written once and linked everywhere else.** Where a page repeats a rule, it now points to the one page that owns it, in a few words. The next edit to a rule then reaches everyone at once.
  ```text
       BEFORE                AFTER
  ┌──────────────┐     ┌──────────────┐
  │ page A: rule │     │ owner: rule  │
  │ page B: rule'│     └──────▲───────┘
  │ page C: rule"│      A ────┤
  │ page D: rule │      B ────┤
  └──────────────┘      C ────┘
   four copies drift    one copy, links
  ```
- **What an install gets is described once.** Three pages that listed it, each a bit wrong, now point to the one list. That list now also names the blank settings file every install gets.
- **The Cloudflare setup is no longer called optional.** Every install takes it; pages that said "if you took the stack" now just say what it does.
- **Which commands save and publish is stated once**, on the page about how work moves, and the others link it.
- **After a plan, one way to go on.** The closing question already offers *Build it now*, so the "type `/apply` to build it" line under the plan's link no longer shows beside it. It shows only after you pick *Review the plan*, where no question follows.
- **The question after a publish is listed once.** The publish step links it instead of keeping its own list; the same goes for the choices when a request splits into parts.
- **The record of what shipped matches what the tools do.** Pasted review notes that only ask a question get an answer, not a plan edit. A failed check of the preview pauses a publish. Plain words and link checks each get one owner, and the record names the rules file by its real name.
- **Small mismatches fixed.** A new server gets the same Node version everything else uses. The command list in the README gains `/verify`, and the knowledge-center page gains `/improve` and `/routine`. A few titles, counts, and a hard-coded version number now match the facts.

Non-goals: no new behavior beyond the one line after a plan; no page moves or merges (the "Reshape the wiki" part owns those); no code bugs (the "Real bugs" part).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `asking-the-user`: the plan link's next-step line appears only on the *Review the plan* reply; the plain-words requirement also owns short messages and when to name git, OpenSpec, or CI.
- `knowledge-center`: its plain-message requirement is removed; `asking-the-user` owns it.
- `ux-wireframes`: pasted notes change the plan only for notes that ask for a change.
- `staging-walkthrough`: `/verify` gates nothing on its own run; `delivery-gate` owns what a failed walk does inside `/ship`.
- `delivery-gate`: the gate doctrine's one summary line lives in `AGENTS.md`.
- `context-economy`: the meta-repo half and the measured start-up load name `AGENTS.md`.
- `payload-checks`: the one owner of link checks, fresh-install and GitHub cases included.
- `payload-layout`: its link requirement is removed; `payload-checks` owns it.
- `open-source-release`: its link requirement is removed; `payload-checks` owns it.

## Impact

- Payload prose: `AGENTS.md`, `wiki/development/{README,the-change-loop,required-tools,staging-walkthrough,adding-a-skill}.md`, `wiki/{contributing,agent-knowledge-center,ux-principles}.md`, `wiki/stack/{README,core-stack,d1-pipeline,mini-apps}.md`, `.agents/rules/payload.md`, `.agents/skills/{ship,save}/SKILL.md`, `.agents/skills/save/references/facts-save.md`, `.agents/skills/explore/references/asking-the-user.md`, `.agents/skills/plan/references/{new-workspace,openspec-cli}.md`, `.agents/skills/wong-sync/references/payload-manifest.md`.
- Config and scripts: `openspec/config.yaml`, `server/setup.sh`, `.agents/skills/plan/scripts/build-review.mjs` (comment only), `README.md`.
- Specs: the nine capabilities above, plus Purpose lines in `staging-walkthrough` and `context-economy`.
- Release: one `## Next (patch)` entry in `CHANGELOG.md`.
- Overlap: "Reshape the wiki" also edits `wiki/development/` and `wiki/stack/d1-pipeline.md`; whichever publishes second merges the other's edits.

## Decision log

- **2026-09-29** — Asked whether to keep the "type `/apply`" line beside a question that already offers *Build it now* → chose to show it only when no question follows (the *Review the plan* reply).
- **2026-09-29** — Assumed: all ten audit findings from the 2026-09-29 `/explore` are in scope, each by its suggested fix, because the user settled that before this plan.
- **2026-09-29** — Assumed: `server/README.md` needs no Node edit, because a recheck against main found it no longer names Node 24; only `server/setup.sh` does.
- **2026-09-29** — Assumed: `server/setup.sh` moves to Node 22, not `.nvmrc` to 24, because CI, `.nvmrc`, `@types/node`, and setup's own version check all read 22.
- **2026-09-29** — Assumed: `ship/SKILL.md`'s "never … delete a local branch" stays, because it is scoped to recovering a merge conflict and does not contradict `/close` deleting a branch after its merge.
- **2026-09-29** — Assumed: `payload.md`'s git-owner line is now at line 42, not 79, and `the-change-loop.md`'s Status list near line 126; the fixes target the text, not the old line numbers.
- **2026-09-29** — Assumed: `required-tools.md` lists `curl` as a fifth required command, because setup's provisioning and `/verify`'s probes need it; saying "four" hides it.
- **2026-09-29** — Assumed: the wiki's staging-walkthrough line "None of them gates anything" gets the same fix as its spec, because it states the same rule.
- **2026-09-29** — Assumed: the plain-words overlap is resolved by removing the `knowledge-center` requirement and folding its unique parts (short messages, when to name git) into `asking-the-user`, because that spec already owns reports and plain words.
- **2026-09-29** — Assumed: Purpose lines, which a delta cannot change, are edited directly in `openspec/specs/`, because `/save` reconciles main specs on the branch anyway.
- **2026-09-29** — Assumed: a patch release, because the only behavior change is one line of chat after a plan.
- **2026-09-29** — Assumed: the plan's "run `/save`" task is dropped, because `/ship`'s own checkpoint runs CI after the archive.
- **2026-09-29** — Assumed: `verify/SKILL.md`'s "stack-pack repos:" tag and the walkthrough page's opening "It gates nothing" get the same fixes, because the build found them saying what the change removes elsewhere.
- **2026-09-29** — Assumed: archived and checkpointed by `/ship` as 27.1.1, after merging main's 27.1.0 release; the build tasks all passed the payload link, config, retired-name, and context-size checks.
- **2026-09-29** — Assumed: after "Reshape the wiki" shipped as 27.1.1 first, this release is renumbered 27.1.2; its payload paragraph moved to `wiki/maintaining/README.md`, so the "manifest lists what ships" fix went there, and the development hub keeps main's new opening.

<!-- end proposal.md -->
<!-- file design.md utf8 6172 -->
# Design

## Context

See proposal.md - Why. Findings came from the 2026-09-29 audit; each was rechecked against `main` at v27.0.0. All still hold except `server/README.md`, which no longer names Node 24. Line numbers moved; edits target the quoted text.

## Goals / Non-Goals

- Each duplicated rule keeps one owner; every other copy becomes a short link to it, never a paraphrase.
- No page is moved, merged, or renamed, and no linked heading is renamed: installed repos link these headings, and `check-payload-links.mjs` only checks anchors on source-only skills.
- No script behavior changes. `build-review.mjs` keeps printing `NEXT_STEP`; the rule decides when to copy it.

## Decisions

### The owners

| Rule | Owner | Surfaces that link instead |
|---|---|---|
| What ships | `wong-sync/references/payload-manifest.md` | `wiki/development/README.md`, `AGENTS.md` (meta half), `wiki/contributing.md` |
| Which verbs own git | `the-change-loop.md`, the "OpenSpec owns the plan" paragraph | `.agents/rules/payload.md` (git-fronting bullet), `required-tools.md` (`git` row), `AGENTS.md` block (drop "only `/save` and `/ship` push") |
| The finished-plan question | `asking-the-user.md#end-every-reply-with-the-next-step` | `the-change-loop.md#just-ask`, `wiki/stack/mini-apps.md`, `AGENTS.md` block |
| The after-ship menu | `new-workspace.md#next-work` | `ship/SKILL.md` Step 6; `asking-the-user.md` keeps its one-line pointer |
| Workspace-split options | `new-workspace.md#ask-once` | `the-change-loop.md#several-parts-several-workspaces` |
| Status values | `the-change-loop.md` living-handoff section | `save/SKILL.md` input line |
| What a failed walk does in `/ship` | `delivery-gate` spec, `ship/SKILL.md` Step 4 | `staging-walkthrough` spec, `staging-walkthrough.md` verdict line |
| Plain words | `asking-the-user` spec | `knowledge-center` spec (requirement removed) |
| Link checks | `payload-checks` spec | `payload-layout`, `open-source-release` (requirements removed) |

A link names the rule in a few words and points at the owner's heading, for example "`/save`, `/continue`, `/ship`, and `/close` own git ([the change loop](…#…))" becomes "[the change loop](…) says which verbs run git".

### The `/apply` line after a plan

`asking-the-user.md#print-the-plans-link` changes from "copy both when the plan waits" to "copy the next-step line only on the *Review the plan* reply, which ends with no question". The `AGENTS.md` block's print-the-link rule and the `build-review.mjs` comment follow. Chosen over dropping the line, because the *Review the plan* reply would otherwise leave no way on. `plan/SKILL.md` already defers to the rule and needs no edit.

### What ships, and `.env.example`

The three pages each get one sentence: "The [payload manifest](…) lists what ships." `AGENTS.md`'s meta line drops "the wiki" and "OpenSpec records" (the manifest says OpenSpec records never copy, and only some wiki pages ship). The manifest's "The agent folder" section gains one line: setup also copies the source's values-blank `.env.example`; it is not in `payload-files.json`, so a sync never updates it.

### The stack pack is not optional

Drop each conditional, keep the fact: `core-stack.md` loses "take it whole, take a piece, or skip it"; `agent-knowledge-center.md` "if you took that stack"; `required-tools.md` "any repo taking (or on)", "pack-gated", "a pack repo"; `staging-walkthrough.md` the two "*(stack-pack repos)*" tags; `stack/README.md` the "installs with the stack pack" callout; `d1-pipeline.md` "in every repo that takes the pack"; `ux-principles.md` "A repo with no UI … can ignore it", since every install gets the starter app.

### Small fixes

- `the-change-loop.md` "`/plan` always invokes `/explore`" gains ", except for review-page notes" with a link to `plan/SKILL.md#review-notes`.
- `ship/SKILL.md` "`/save`'s authoring test" links `save/SKILL.md#1-protect-credentials-and-select-the-route` (the route table); `facts-save.md` "save's capture rules" links `../SKILL.md#2-maintain-the-handoff-and-capture-context`.
- `openspec/config.yaml`: context says the payload is skills under `.agents/skills/`, the wiki, `AGENTS.md`, `VERSION`, `CHANGELOG.md`, without "is markdown"; rules at lines 26, 32, 42, 61 read `.agents/`; line 58's surface list says `AGENTS.md`. `check-openspec-config.mjs` proves it still parses.
- `server/setup.sh`: `Node.js 22` and `setup_22.x`, matching `.nvmrc`.
- `README.md` command table gains `/verify`; `agent-knowledge-center.md`'s skill list gains `/improve` and `/routine`.
- `AGENTS.md` title becomes `# AGENTS.md`, as the installer writes.
- `openspec-cli.md` "CLI 1.13.2 has no `sync` command" becomes "The CLI has no `sync` command", so no unpinned version number is left.
- `required-tools.md`: a `curl` row; "exactly four commands" and "the core four-tool guarantee" become five.
- `adding-a-skill.md` step 1: a one-line `description` that says what the skill does and when to use it, like the others, in place of "trigger-rich".
- `stack/README.md` Getting started entry: "what installing costs, what you do by hand, and what to do when something goes wrong", not "five steps".

### Specs

Deltas carry the requirement changes. Two Purpose lines change directly in `openspec/specs/`, because a delta cannot: `staging-walkthrough` ("gates nothing" → "gates nothing on its own run") and `context-economy` (`CLAUDE.md` → `AGENTS.md`). The two removed link requirements move their scenarios into `payload-checks`; the removed `knowledge-center` requirement's rules move into `asking-the-user`.

## Risks / Trade-offs

- [The "Reshape the wiki" part edits the same `wiki/development/` and `d1-pipeline.md` pages] → whichever publishes second merges by the union of intent and re-runs the link check.
- [A link replacing a restated rule loses context for a reader who skims] → each link keeps a few words naming the rule.
- [Skill word count] → the edits mostly cut text; `measure-context.mjs --check` in CI catches growth.

## Migration Plan

Patch release. Installed repos get the prose through `/wong-sync`; `server/setup.sh` affects only servers built after it ships.

<!-- end design.md -->
<!-- file tasks.md utf8 3574 -->
# Tasks

## 1. AGENTS.md

- [x] 1.1 Retitle `AGENTS.md` to `# AGENTS.md`; in the meta half, say only that the payload manifest lists what ships, dropping "the wiki" and "OpenSpec records".
- [x] 1.2 In the `WONG-STACK` block's verbs rule, drop "only `/save` and `/ship` push" and point the finished-plan question at its owner instead of quoting it.
- [x] 1.3 In the block's print-the-link rule, say the `/apply` line goes under the link only after *Review the plan*.

## 2. Skills and rules

- [x] 2.1 `asking-the-user.md#print-the-plans-link`: copy the next-step line only on the *Review the plan* reply; update the `NEXT_STEP` comment in `build-review.mjs` to match.
- [x] 2.2 `ship/SKILL.md`: Step 6's closing question links `new-workspace.md#next-work` with no option list; "`/save`'s authoring test" links save's route table.
- [x] 2.3 `new-workspace.md#next-work`: own the whole after-ship list (next part, walk the merged app, *Close this workspace*, stop).
- [x] 2.4 `save/SKILL.md`: the status note links the change loop's Status values instead of listing them; `facts-save.md`: "save's capture rules" links save's step 2.
- [x] 2.5 `.agents/rules/payload.md`: the git-fronting bullet links the change loop for which verbs own git.
- [x] 2.6 `openspec-cli.md`: drop the hard-coded CLI version from the reconcile section.
- [x] 2.7 `payload-manifest.md`: one line in "The agent folder" that setup also copies the values-blank `.env.example`, which a sync does not update.

## 3. Wiki

- [x] 3.1 `the-change-loop.md`: keep the git-owner list; add the review-notes exception to "`/plan` always invokes `/explore`"; link the finished-plan question and the workspace-split options to their owners.
- [x] 3.2 `wiki/development/README.md` and `wiki/contributing.md`: one sentence each linking the payload manifest for what ships.
- [x] 3.3 `required-tools.md`: the `git` row links the change loop; add a `curl` row and say five commands; drop the stack-pack conditionals.
- [x] 3.4 Drop the stack-pack conditionals in `core-stack.md`, `agent-knowledge-center.md`, `staging-walkthrough.md`, `stack/README.md`, `d1-pipeline.md`, and `ux-principles.md`.
- [x] 3.5 `staging-walkthrough.md`: the verdict line says a verdict gates nothing on `/verify`'s own run and links `/ship`'s Step 4 for a failed walk.
- [x] 3.6 `wiki/stack/mini-apps.md`: the Plan bullet links the finished-plan question instead of quoting "build it now?".
- [x] 3.7 `agent-knowledge-center.md`: add `/improve` and `/routine` to the skill list.
- [x] 3.8 `adding-a-skill.md`: step 1 asks for a one-line description of what the skill does and when to use it.
- [x] 3.9 `stack/README.md`: the Getting started entry describes the page, not a step count.

## 4. README, config, and server

- [x] 4.1 `README.md`: add `/verify` to the command table.
- [x] 4.2 `openspec/config.yaml`: `.agents/` paths and `AGENTS.md`, and no "is markdown".
- [x] 4.3 `server/setup.sh`: install Node 22 (`setup_22.x`).
- [x] 4.4 Add a test in `scripts/tests/server-setup.test.mjs` that `server/setup.sh`'s Node major equals `.nvmrc`.

## 5. Specs and release

- [x] 5.1 Edit the Purpose lines of `openspec/specs/staging-walkthrough/spec.md` and `openspec/specs/context-economy/spec.md`.
- [x] 5.2 Add a `## Next (patch) — Each rule has one home` entry at the top of `CHANGELOG.md`, with **Updating.** *Nothing to do by hand.*
- [x] 5.3 Run `node scripts/check-payload-links.mjs`, `node scripts/check-openspec-config.mjs`, `node scripts/check-retired-names.mjs`, and `node scripts/measure-context.mjs --check`; fix what fails.

<!-- end tasks.md -->
<!-- file specs/asking-the-user/spec.md utf8 2857 -->
## MODIFIED Requirements

### Requirement: A reply that makes or changes a plan prints its link

A reply that creates a plan, or changes what it says or its checklist, SHALL print *Click here to see the plan:* with the full link to the change's review page, as its own chat line above any closing question, never inside it. Record-keeping alone (status, branch, decision log) SHALL NOT count as a change. The closing question SHALL offer *Review the plan*; picking it SHALL end the next reply with the link line and, after a blank line, *When you're ready, type `/apply` to build it.*, with no question, and SHALL start nothing. No other reply SHALL print that line: a closing question that offers to build is the one way on. The link SHALL NOT add a stop.

#### Scenario: The person picks Review the plan

- **WHEN** a plan finishes and the person picks *Review the plan* in its closing question
- **THEN** the next reply ends with *Click here to see the plan:*, the full-path link, a blank line, and *When you're ready, type `/apply` to build it.*, with no question box after it, and nothing is built

#### Scenario: Apply plans first

- **WHEN** `/apply` plans a change and goes on to build it
- **THEN** the reply prints the plan's link before the build continues, with no line telling the person to type `/apply`

#### Scenario: A save that only records progress

- **WHEN** `/save` updates only the plan's status and decision log
- **THEN** its report prints no plan link and its question offers no *Review the plan*

#### Scenario: A standalone plan finishes

- **WHEN** `/plan` finishes and its closing question offers *Build it now*
- **THEN** the reply prints the plan's link above the question and no line telling the person to type `/apply`

### Requirement: Plans, asks, and reports use plain words

For every reader, a plan's Why and What Changes, every ask, and every report SHALL name what the person will see, get, lose, or risk, with no file path, identifier, command, or engineering term unless the person used it first or asked for that detail. Messages SHALL be short, in the voice `wiki/voice.md` owns: the point first, a few lines, and more only when asked. Git, OpenSpec, or CI SHALL be named only when the person asks or must act; code, commands, identifiers, and quotations SHALL stay exact. A skill SHALL try a fix within its own rules before asking, and SHALL NOT offer a choice that needs judgment the person lacks.

#### Scenario: A migration question

- **WHEN** `/explore` must ask about changing stored data
- **THEN** it asks what should happen to the accounts that exist today, not how to migrate the schema

#### Scenario: The person names the mechanism

- **WHEN** a person asks to move the app's data into a new `accounts` table
- **THEN** the plan may name the `accounts` table, because the person used the term first

<!-- end specs/asking-the-user/spec.md -->
<!-- file specs/context-economy/spec.md utf8 1309 -->
## MODIFIED Requirements

### Requirement: Payload conventions load only when needed

The meta-repo half of `AGENTS.md` SHALL identify the repo and point into the wiki. The conventions for working on the payload SHALL live in a meta-only rule that loads when a payload file is touched.

#### Scenario: A session that touches no payload file

- **WHEN** a session never edits a payload file
- **THEN** the release conventions never load

### Requirement: Instruction size is measured as source text

The meta-repo SHALL measure the words and bytes of the start-up load (the `WONG-STACK` block and the rest of `AGENTS.md`, the pages it always imports, and every skill description) and of every WongStack-authored skill's instructions, against a baseline recorded at the measuring change's own starting commit. A reduction SHALL be reported as source text, never as runtime token savings, and text moved into a new file SHALL still count.

#### Scenario: A procedure moves to a reference

- **WHEN** text is extracted from a skill into a new reference
- **THEN** the measured total includes the new file

#### Scenario: An earlier change's savings

- **WHEN** a change reports its before-and-after count
- **THEN** the before is its own starting commit, so an earlier change's savings are not counted as its own

<!-- end specs/context-economy/spec.md -->
<!-- file specs/delivery-gate/spec.md utf8 672 -->
## MODIFIED Requirements

### Requirement: The gate doctrine has one owner

`wiki/development/the-change-loop.md` SHALL state the gate and the ladder (CI when present, then merge, a skipped rung never a failure); other surfaces SHALL link to it, except one summary line in `AGENTS.md`. No surface SHALL call CI required, present the walkthrough as a condition of the merge, or describe a save route that depends on which paths changed.

#### Scenario: A surface restates the gate differently

- **WHEN** a payload surface describes the gate in terms the owner does not, or names a path-specific save route
- **THEN** that is a defect, fixed by a link or the owner's terms

<!-- end specs/delivery-gate/spec.md -->
<!-- file specs/knowledge-center/spec.md utf8 388 -->
## REMOVED Requirements

### Requirement: Messages are short and plain

**Reason**: `asking-the-user` owns plain words and reports; a second owner had drifted from it.

**Migration**: Short messages and when to name git, OpenSpec, or CI now live in `asking-the-user`'s "Plans, asks, and reports use plain words"; naming a branch on request is its "Reports give the outcome and one link".

<!-- end specs/knowledge-center/spec.md -->
<!-- file specs/open-source-release/spec.md utf8 300 -->
## REMOVED Requirements

### Requirement: Links resolve on GitHub

**Reason**: Link checks had three owners; `payload-checks` is the one.

**Migration**: The symbolic-link rule, README raw URLs included, now lives in `payload-checks`' "The link check catches links a target or GitHub cannot follow".

<!-- end specs/open-source-release/spec.md -->
<!-- file specs/payload-checks/spec.md utf8 1443 -->
## MODIFIED Requirements

### Requirement: The link check catches links a target or GitHub cannot follow

This SHALL be the one requirement for payload link checks. Every internal link in a payload file SHALL resolve in a fresh install, so every page a skill cites as an owner SHALL itself ship; the check SHALL resolve links against a target's file set, not this repo, treating a path as present only when setup writes it. It SHALL fail on a live Markdown link that resolves nowhere in a target or passes through a symbolic link, naming the real path, and on a README `raw.githubusercontent.com` URL that passes through one, because GitHub returns a 404 for it. A skill that stays in the source repo SHALL have its links resolved against the source repo, heading anchors included. Code spans and commands SHALL NOT be checked.

#### Scenario: A wiki page links through `.claude/`

- **WHEN** a wiki page links `../.claude/skills/save/SKILL.md`
- **THEN** the check fails and names `.agents/skills/save/SKILL.md` as the path to use

#### Scenario: Setup links a renamed heading

- **WHEN** `wong-setup` links `../memory/SKILL.md#background-run` and that heading was renamed
- **THEN** the check fails and names the file and the missing anchor

#### Scenario: A link resolves only in the source

- **WHEN** a payload page links a page only WongStack's own wiki has
- **THEN** the release check fails until the example is generalized or dropped

<!-- end specs/payload-checks/spec.md -->
<!-- file specs/payload-layout/spec.md utf8 321 -->
## REMOVED Requirements

### Requirement: Payload links resolve in a fresh install

**Reason**: Link checks had three owners; `payload-checks` is the one.

**Migration**: The fresh-install promise and its source-only scenario now live in `payload-checks`' "The link check catches links a target or GitHub cannot follow".

<!-- end specs/payload-layout/spec.md -->
<!-- file specs/staging-walkthrough/spec.md utf8 849 -->
## MODIFIED Requirements

### Requirement: Verify is a verb that gates nothing

The walk SHALL run only when a person invokes `/verify`, or once inside `/ship` as evidence before the merge; `/save`, `/apply`, and `/continue` SHALL NOT walk. `/verify` SHALL run at any point in a change and any number of times, and its own run SHALL block, delay, or condition nothing. What a failed walk does inside `/ship` SHALL be `delivery-gate`'s rule, not this one.

#### Scenario: A failing walk

- **WHEN** a walk that a person invoked returns `FAILURE`
- **THEN** the failure is reported and posted, and `/verify` stops no push, merge, or other skill

#### Scenario: Mid-change and repeated

- **WHEN** `/verify` runs three times on a branch with unchecked tasks
- **THEN** each run walks what is deployed for the current commit and reports its own verdict

<!-- end specs/staging-walkthrough/spec.md -->
<!-- file specs/ux-wireframes/spec.md utf8 878 -->
## MODIFIED Requirements

### Requirement: Pasted notes update the plan and stop

Pasted notes SHALL update that change's artifacts with no question round, only for notes that ask for a change, and log what each such note changed or why it was declined; a note that asks a question SHALL be answered as `asking-the-user` requires, with no edit. The reply SHALL rebuild the page when anything changed and end with the plan's link and whether to build now. Notes SHALL build nothing, and SHALL change nothing when the change is not in this checkout.

#### Scenario: Notes pasted

- **WHEN** a reviewer pastes notes asking for changes to a change
- **THEN** the proposal, design, specs, and tasks reflect them, and no task is implemented

#### Scenario: The change is not here

- **WHEN** the change is not in the current checkout
- **THEN** the reply says so, and nothing changes

<!-- end specs/ux-wireframes/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-09-29

~~~
<!-- end .openspec.yaml -->
<!-- file review.html utf8 39362 fence=~~~ -->
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
<title>Review · 2026-09-29-one-home-per-rule</title>
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
<body data-change="2026-09-29-one-home-per-rule">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-09-29-one-home-per-rule</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. Saving a note copies all your notes. Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">An audit on 2026-09-29 found the same rule written in several places, and the copies now say different things: what an install gets, whether the Cloudflare setup is optional, which commands save and publish, what to ask after a plan. An agent that reads the wrong copy does the wrong thing, and every copy has to be fixed by hand each time the rule changes. The record of what shipped has drifted the same way.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>Each rule is written once and linked everywhere else.</b> Where a page repeats a rule, it now points to the one page that owns it, in a few words. The next edit to a rule then reaches everyone at once.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-1-line-1" tabindex="0">     BEFORE                AFTER</span>
<span class="ln" data-note="item-1-line-2" tabindex="0">┌──────────────┐     ┌──────────────┐</span>
<span class="ln" data-note="item-1-line-3" tabindex="0">│ page A: rule │     │ owner: rule  │</span>
<span class="ln" data-note="item-1-line-4" tabindex="0">│ page B: rule'│     └──────▲───────┘</span>
<span class="ln" data-note="item-1-line-5" tabindex="0">│ page C: rule&quot;│      A ────┤</span>
<span class="ln" data-note="item-1-line-6" tabindex="0">│ page D: rule │      B ────┤</span>
<span class="ln" data-note="item-1-line-7" tabindex="0">└──────────────┘      C ────┘</span>
<span class="ln" data-note="item-1-line-8" tabindex="0"> four copies drift    one copy, links</span></pre></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>What an install gets is described once.</b> Three pages that listed it, each a bit wrong, now point to the one list. That list now also names the blank settings file every install gets.</div></div></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>The Cloudflare setup is no longer called optional.</b> Every install takes it; pages that said &quot;if you took the stack&quot; now just say what it does.</div></div></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>Which commands save and publish is stated once</b>, on the page about how work moves, and the others link it.</div></div></li>
<li class="item card" id="item-5"><span class="num">5</span><div class="body"><div class="text" data-note="item-5" tabindex="0"><b>After a plan, one way to go on.</b> The closing question already offers <i>Build it now</i>, so the &quot;type <code>/apply</code> to build it&quot; line under the plan's link no longer shows beside it. It shows only after you pick <i>Review the plan</i>, where no question follows.</div></div></li>
<li class="item card" id="item-6"><span class="num">6</span><div class="body"><div class="text" data-note="item-6" tabindex="0"><b>The question after a publish is listed once.</b> The publish step links it instead of keeping its own list; the same goes for the choices when a request splits into parts.</div></div></li>
<li class="item card" id="item-7"><span class="num">7</span><div class="body"><div class="text" data-note="item-7" tabindex="0"><b>The record of what shipped matches what the tools do.</b> Pasted review notes that only ask a question get an answer, not a plan edit. A failed check of the preview pauses a publish. Plain words and link checks each get one owner, and the record names the rules file by its real name.</div></div></li>
<li class="item card" id="item-8"><span class="num">8</span><div class="body"><div class="text" data-note="item-8" tabindex="0"><b>Small mismatches fixed.</b> A new server gets the same Node version everything else uses. The command list in the README gains <code>/verify</code>, and the knowledge-center page gains <code>/improve</code> and <code>/routine</code>. A few titles, counts, and a hard-coded version number now match the facts.</div></div></li>
</ol>
<p class="aside">Non-goals: no new behavior beyond the one line after a plan; no page moves or merges (the &quot;Reshape the wiki&quot; part owns those); no code bugs (the &quot;Real bugs&quot; part).</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-29</p>Asked whether to keep the &quot;type <code>/apply</code>&quot; line beside a question that already offers <i>Build it now</i> → chose to show it only when no question follows (the <i>Review the plan</i> reply).</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-29</p>Assumed: all ten audit findings from the 2026-09-29 <code>/explore</code> are in scope, each by its suggested fix, because the user settled that before this plan.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-29</p>Assumed: <code>server/README.md</code> needs no Node edit, because a recheck against main found it no longer names Node 24; only <code>server/setup.sh</code> does.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-29</p>Assumed: <code>server/setup.sh</code> moves to Node 22, not <code>.nvmrc</code> to 24, because CI, <code>.nvmrc</code>, <code>@types/node</code>, and setup's own version check all read 22.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-29</p>Assumed: <code>ship/SKILL.md</code>'s &quot;never … delete a local branch&quot; stays, because it is scoped to recovering a merge conflict and does not contradict <code>/close</code> deleting a branch after its merge.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-29</p>Assumed: <code>payload.md</code>'s git-owner line is now at line 42, not 79, and <code>the-change-loop.md</code>'s Status list near line 126; the fixes target the text, not the old line numbers.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-29</p>Assumed: <code>required-tools.md</code> lists <code>curl</code> as a fifth required command, because setup's provisioning and <code>/verify</code>'s probes need it; saying &quot;four&quot; hides it.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-29</p>Assumed: the wiki's staging-walkthrough line &quot;None of them gates anything&quot; gets the same fix as its spec, because it states the same rule.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-29</p>Assumed: the plain-words overlap is resolved by removing the <code>knowledge-center</code> requirement and folding its unique parts (short messages, when to name git) into <code>asking-the-user</code>, because that spec already owns reports and plain words.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-29</p>Assumed: Purpose lines, which a delta cannot change, are edited directly in <code>openspec/specs/</code>, because <code>/save</code> reconciles main specs on the branch anyway.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-29</p>Assumed: a patch release, because the only behavior change is one line of chat after a plan.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-29</p>Assumed: the plan's &quot;run <code>/save</code>&quot; task is dropped, because <code>/ship</code>'s own checkpoint runs CI after the archive.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-29</p>Assumed: <code>verify/SKILL.md</code>'s &quot;stack-pack repos:&quot; tag and the walkthrough page's opening &quot;It gates nothing&quot; get the same fixes, because the build found them saying what the change removes elsewhere.</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-29</p>Assumed: archived and checkpointed by <code>/ship</code> as 27.1.1, after merging main's 27.1.0 release; the build tasks all passed the payload link, config, retired-name, and context-size checks.</li>
<li class="decision card" id="decision-15" data-note="decision-15" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-29</p>Assumed: after &quot;Reshape the wiki&quot; shipped as 27.1.1 first, this release is renumbered 27.1.2; its payload paragraph moved to <code>wiki/maintaining/README.md</code>, so the &quot;manifest lists what ships&quot; fix went there, and the development hub keeps main's new opening.</li>
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
