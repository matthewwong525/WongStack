<!-- openspec-archive v1 2026-08-12-philosophy-docs-integration -->
<!-- file proposal.md utf8 5326 -->
# State the working principles, and drop the buzzwords

**Status:** ready-to-ship
**Open questions:** none

## Why

The README and philosophy page sell WongStack with buzzwords ("AI-native", "the compounding loop") instead of stating the working principles behind it. The maintainer wants the docs to state those principles plainly — six maxims, matter-of-fact, presented as one way of working that a team can adapt — and wants one of them (prefer code over AI for repeatable process improvements) to guide planning, not just sit on a page.

## What Changes

- Rewrite `wiki/agent-knowledge-center.md` around six maxims, in plain impersonal prose:
  1. Building in-house is about speed and quality, not saving money.
  2. Most process improvements should be code, not AI.
  3. Consolidate the processes and the data in one place you own — processes become code, which is also the record of how the work is done, and the business data sits behind that code. An agent that reads both is far more capable than one querying disconnected tools.
  4. Using AI must not require a complicated setup — no local dev environment, minimum dependencies.
  5. Context has to survive the session.
  6. Give AI as much access as you can, and as little autonomy as it needs — humans stay in the loop through the plan, PR review, tests, and Zero Trust, because AI does not disobey instructions, it misinterprets them.
- Strip and tighten `README.md`: keep the structure, remove "AI-native", "the compounding loop", and sales-style phrasing.
- Add code-first planning guidance to `.claude/skills/explore/SKILL.md` and `.claude/skills/plan/SKILL.md`: for a repeatable process, prefer a deterministic script over an AI-run step. The canonical statement lives on the philosophy page; the skills reference it.
- Update `wiki/README.md` pointer text and `CLAUDE.md` cross-references only where their wording depends on removed phrases.
- Release bookkeeping: bump `VERSION` (minor), add a `CHANGELOG.md` entry, run `node scripts/check-payload-links.mjs`.

Non-goals: no tooling or workflow mechanics change (the no-local-dev principle is framing only — CI and previews already are the gate); no first-person founder voice in the repo; no edits to the generated `openspec-*` skills; no wiki restructuring beyond the pages named above.

## Capabilities

### New Capabilities

- `code-first-planning`: `/explore` and `/plan` steer repeatable process improvements toward deterministic code instead of recurring AI-run steps, referencing the canonical principle on the philosophy page.

### Modified Capabilities

- `agent-knowledge-center`: the philosophy page and README present the six working principles in matter-of-fact prose; the "compounding loop" framing and "AI-native" label are removed; the docs present the setup as one way of working that a team can adapt.

## Impact

- `README.md`, `wiki/agent-knowledge-center.md` (rewritten), `wiki/README.md` (pointer text)
- `.agents/skills/explore/SKILL.md`, `.agents/skills/plan/SKILL.md` — the tracked path; `.claude/skills` is a symlink to `.agents/skills`
- `VERSION` (12.0.0 → 12.1.0), `CHANGELOG.md` (payload edit = release)
- `CLAUDE.md` needed no edit: it names the philosophy page by path, not by any removed phrase.
- No application code, no tests, no generated `openspec-*` skills.

## Decision log

- **2026-08-12** — Shipped the rewrite. Six principles, not five: the user added data consolidation mid-implementation and chose to give it its own principle rather than fold it into "building in-house", because it is the bridge between building in-house and granting an agent access. Their framing decided the wording — the consolidation covers *processes written as code* (which double as the record of how the work is done) *plus the business data behind that code*, so an agent reads both together. Placed third, after "most process improvements shouldn't use AI", since code is what does the consolidating. Change renamed from the Paseo-generated `devilish-kiwi` to `philosophy-docs-integration`, and the branch renamed from `philosophy/docs-integration` to match — a slash in the branch would have broken the `openspec/changes/<branch>/` lookup that `/continue` and `/ship` rely on. Ruled out: a first-person founder-voice page, and a standalone `wiki/philosophy.md` (two pages would both claim to own the philosophy; the existing page already had every inbound link). The three new links into `wiki/stack/` are conditional — they resolve only where the target took the Cloudflare pack — so the prose marks that optionality; `check-payload-links.mjs` reports them and passes with no dead links.
- **2026-08-12** — Archived by `/ship`. Both delta specs were already folded into `openspec/specs/` by the preceding `/save`, and archive re-verified each capability before moving the change: all three ADDED requirements present, the REMOVED `Knowledge capture is part of execution` gone, no delta operation headers leaked into the main specs, and `openspec/specs/code-first-planning/spec.md` created with its Purpose. PR #71 carried CI green on commit `488f622`. Noted in passing, out of scope here: `openspec validate --specs` reports `spec/wiki-root` failing with "must have at least one requirement" — a pre-existing empty spec this change never touched.

<!-- end proposal.md -->
<!-- file design.md utf8 3587 -->
## Context

See proposal.md — Why. The change is cross-cutting prose: two doc pages, the README, two skills, and release bookkeeping. The repo already enforces ASD-STE100 best-effort for user-facing prose, single-ownership of facts (a page states a rule once, everything else links), and the payload-edit-is-a-release rule. The `agent-knowledge-center` spec currently requires the "compounding loop" framing, so the delta spec in this change rewrites that requirement.

## Goals / Non-Goals

**Goals:**
- One canonical home for the five principles: `wiki/agent-knowledge-center.md`. Every other surface links there.
- The README keeps its current section order so the diff is reviewable as a tone change, not a restructure.

**Non-Goals:**
- No behavior change to any workflow mechanics — `/explore` and `/plan` gain guidance text only.
- No new wiki page. The principles replace the "model" section of the existing philosophy page rather than adding a `philosophy.md` sibling.

## Decisions

- **Rewrite the existing page, don't add a new one.** `wiki/agent-knowledge-center.md` is already linked from the README, `wiki/README.md`, and `CLAUDE.md` as "the philosophy". Rewriting it in place keeps every inbound link valid and avoids a rename rippling through the payload manifest. Alternative considered: a new `wiki/philosophy.md` — rejected because it would leave two pages claiming to own the philosophy.
- **Principles as sections, mechanisms as links.** Each principle gets a short section that states it and names the repo mechanism that applies it (Cloudflare pack, change loop, knowledge surfaces, gates). The page does not restate how those mechanisms work — the owning pages do.
- **Consolidation is its own principle, placed third.** It follows "processes should be code" because code is what consolidates: a process written as code is also the record of how the work is done, and the business data sits behind that code. It precedes the access principle because consolidated data is what makes access worth granting. Alternative considered: folding it into "building in-house" — rejected, it is the bridge between that principle and the access one, and reads as an afterthought when buried.
- **Skill guidance is one short paragraph, placed before the handoff.** In `explore/SKILL.md` and `plan/SKILL.md`, the code-first check reads roughly: "When the work is a repeatable process, first weigh a deterministic script against a recurring AI-run step — see the philosophy page." It goes in the wrapper skills because the generated `openspec-*` skills are regenerated by `openspec update` and must stay pristine.
- **Minor version bump.** The skill guidance changes what agents do during planning, so this is a feature-level payload change, not a patch. The doc rewrites ride the same release.
- **Tone rule for the rewrite:** state facts, drop superlatives, keep the "adapt it" caveat to one sentence near the top. The five maxims appear once as a plain list so they are quotable, then each gets its section.

## Risks / Trade-offs

- [Removing "compounding loop" wording could orphan references] → grep the payload for "compounding" and "AI-native" and fix every hit; `scripts/check-payload-links.mjs` catches broken anchors if a heading changes.
- [The README first line "turns a repo into an AI knowledge center" is required by an unmodified spec requirement] → keep that framing; only the sales language around it changes.
- [Guidance text in two skills can drift] → both copies are one sentence plus a link; the philosophy page owns the full statement.

<!-- end design.md -->
<!-- file tasks.md utf8 1369 -->
## 1. Philosophy page

- [x] 1.1 Rewrite `wiki/agent-knowledge-center.md` around the six principles per design.md — plain list first, then one short section per principle linking to the mechanism that applies it; keep the surface-ownership and capture content; no first-person voice; one-sentence "adapt it" caveat.

## 2. README

- [x] 2.1 Strip and tighten `README.md`: keep the section order, keep the "turns a repo into an AI knowledge center" opening, remove "AI-native", rename and de-brand "The compounding loop" section, flatten sales-style bullets to matter-of-fact statements.

## 3. Skills

- [x] 3.1 Add the one-paragraph code-first check to `.claude/skills/explore/SKILL.md`, linking to the philosophy page; do not touch `openspec-explore`.
- [x] 3.2 Add the same check to `.claude/skills/plan/SKILL.md`, linking to the philosophy page; do not touch `openspec-propose`.

## 4. Cross-references

- [x] 4.1 Grep the payload for "AI-native", "compounding", and "smarter than the last"; update `wiki/README.md` pointer text and `CLAUDE.md` cross-references only where wording depends on removed phrases.

## 5. Release

- [x] 5.1 Bump `VERSION` (minor) and add the newest-first `CHANGELOG.md` entry describing the principles rewrite and the code-first planning guidance.
- [x] 5.2 Run `node scripts/check-payload-links.mjs` and fix any dead link it reports.

<!-- end tasks.md -->
<!-- file specs/agent-knowledge-center/spec.md utf8 3271 -->
## ADDED Requirements

### Requirement: The docs state the six working principles

The philosophy page SHALL state the six working principles behind WongStack in plain, impersonal prose, and the README SHALL link to that page. The principles are: building in-house is about speed and quality, not saving money; most process improvements should be code, not AI; consolidate the processes and the data in one place you own; using AI must not require a complicated setup (no local dev environment, minimum dependencies); context has to survive the session; give AI as much access as you can, and as little autonomy as it needs.

#### Scenario: Reader finds the principles

- **WHEN** a reader opens the philosophy page
- **THEN** they see the six principles stated plainly
- **AND** each principle points to the repo mechanism that applies it (Cloudflare pack, the change loop, the knowledge surfaces, PR review and tests)

#### Scenario: Consolidation principle covers process and data

- **WHEN** a reader reads the consolidation principle
- **THEN** it states that a process written as code is also the record of how the work is done
- **AND** that the business data sits behind that code, so an agent can read the process and the records together
- **AND** it explains that this is what makes access to an agent worth granting

#### Scenario: The setup is presented as adaptable

- **WHEN** a reader reviews the philosophy page
- **THEN** it presents the setup as one way of working that a team can adapt, not a doctrine
- **AND** it contains no first-person founder framing

#### Scenario: Autonomy principle explains the gates

- **WHEN** a reader asks why humans stay in the loop
- **THEN** the philosophy page explains that AI does not disobey instructions, it misinterprets them
- **AND** it names the standardized gates: the reviewed plan, PR review, tests, and Zero Trust

### Requirement: The docs use matter-of-fact language

The README and philosophy page SHALL describe WongStack in matter-of-fact terms. They SHALL NOT use the labels "AI-native" or "the compounding loop" or equivalent sales-style framing.

#### Scenario: Buzzwords are absent

- **WHEN** a reader searches the README and philosophy page
- **THEN** the phrases "AI-native" and "compounding loop" do not appear

### Requirement: Knowledge capture happens during the work

WongStack SHALL explain that knowledge capture happens through the work, not only as a separate documentation chore. Plans, decision logs, archived changes, and `/dream` SHALL be presented as the mechanism that lets each project leave more useful context for the next person or agent.

#### Scenario: Reader understands why capture pays off

- **WHEN** a reader reviews the README or philosophy page
- **THEN** they see, in plain terms, that the process is written down, agents run it, what happens is captured, and future work starts with more context

## REMOVED Requirements

### Requirement: Knowledge capture is part of execution
**Reason**: Replaced by "Knowledge capture happens during the work" — same substance, but the scenario no longer requires the "compounding loop" branding this change removes from the docs.
**Migration**: The ADDED requirement above covers the behavior; no doc keeps the old framing.

<!-- end specs/agent-knowledge-center/spec.md -->
<!-- file specs/code-first-planning/spec.md utf8 1229 -->
## Purpose

The planning verbs steer repeatable process improvements toward deterministic code instead of recurring AI-run steps, applying the code-first principle stated on the philosophy page.

## ADDED Requirements

### Requirement: Planning guidance prefers code over AI for repeatable processes

The `/explore` and `/plan` skills SHALL carry guidance that, when the work is a repeatable process improvement, directs the agent to consider a deterministic script or automation before a recurring AI-run step. The guidance SHALL reference the canonical statement of the principle on the philosophy page instead of restating it in full.

#### Scenario: Exploring a repeatable process

- **WHEN** a user runs `/explore` or `/plan` on a process that will run repeatedly
- **THEN** the skill guidance directs the agent to weigh a deterministic script against a recurring AI-run step
- **AND** the guidance links to the philosophy page as the owner of the principle

#### Scenario: Generated skills stay pristine

- **WHEN** the code-first guidance is added
- **THEN** it lives in the WongStack wrapper skills (`.claude/skills/explore/SKILL.md`, `.claude/skills/plan/SKILL.md`)
- **AND** no generated `openspec-*` skill is modified

<!-- end specs/code-first-planning/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-08-12

~~~
<!-- end .openspec.yaml -->
