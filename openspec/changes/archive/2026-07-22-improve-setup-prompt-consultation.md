<!-- openspec-archive v1 2026-07-22-improve-setup-prompt-consultation -->
<!-- file proposal.md utf8 2170 -->
## Why

The README's one-paste setup prompt opens with "**Set up** WongStack in this repo…", which reads as a decision-already-made install command. `wong-setup`'s Step 3 has a fast path that skips the consultation when "the user … came in having read the README and named what they want" — so an agent handed that paste jumps straight to setup and skips the fit verdict entirely. The front door's whole point (assess fit, including "not a good fit", *before* installing) never runs for the exact users the README is written for.

## What Changes

- **Reword the README paste prompt** so it asks the agent to *evaluate fit and walk the user through it*, not to install outright — the paste should be the trigger for the consultation, not a bypass of it. Keep the URL-read mechanism (still points at `wong-setup/SKILL.md`) and the beginner-friendly, one-line shape.
- **Tighten `wong-setup` Step 3's fast-path trigger** so the consultation is the *default*: the fast path fires only on an explicit skip signal ("just install it", "skip the questions"). Merely asking to "set up WongStack" — the natural reading of the README paste — SHALL run the consultation. Remove/soften the "read the README and named what they want" clause that currently catches the paste.
- Keep the fast path a real, no-toll-gate escape hatch for users who genuinely arrive decided.
- Payload edit → bump `VERSION` and add a newest-first `CHANGELOG.md` entry.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `install-onboarding`: the "Warm one-paste front door" requirement (prompt now invites the consultation rather than commanding an install) and the "Consultation is skippable" requirement (fast path fires only on an explicit skip signal; the default paste runs the consultation).

## Impact

- `README.md` — the setup-prompt code block and its surrounding sentence.
- `.claude/skills/wong-setup/SKILL.md` — Step 3 fast-path wording (and the "Hard rules" line that restates it, if it drifts).
- `VERSION`, `CHANGELOG.md` — release ritual.
- No behavior change to already-installed repos (Step 1 still short-circuits on a real manifest).

<!-- end proposal.md -->
<!-- file design.md utf8 3653 -->
## Context

The README's install section (README.md ~line 35–40) hands newcomers a one-line paste:

```
Set up WongStack in this repo by reading and following
https://raw.githubusercontent.com/matthewwong525/WongStack/refs/heads/main/.claude/skills/wong-setup/SKILL.md
```

`wong-setup/SKILL.md` Step 3 ("discover and diagnose (skippable)") begins with a **fast path**:

> the user arrived already decided — they said "just install it", asked to skip the questions, or came in having read the README and named what they want. Confirm in one line and jump to Step 5.

An agent handed the paste above reads "**Set up** WongStack" as a made decision (and the "read the README and named what they want" clause reinforces it), takes the fast path, and skips the consultation and fit verdict — defeating the front door for its target audience. The "Hard rules" section restates this ("The consultation is never a toll gate. 'Just install it' skips straight to Step 5.").

## Goals / Non-Goals

**Goals:**
- The README paste, when followed, runs the consultation (research → diagnose → fit verdict) by default.
- The fast path stays available as a real escape hatch — but only on an explicit skip signal, never on a bare "set up" request.
- Keep the paste one short warm line, still URL-read against `wong-setup/SKILL.md` (no drift from the runbook).

**Non-Goals:**
- No change to what the consultation or setup *does* once it runs.
- No change for already-installed repos (Step 1's manifest short-circuit is untouched).
- No new skill, no structural README rework — wording only.

## Decisions

**1. New README paste — evaluate-first framing.** Replace the imperative "Set up WongStack…" opener with one that asks the agent to assess fit and then guide setup:

```
Read and follow
https://raw.githubusercontent.com/matthewwong525/WongStack/refs/heads/main/.claude/skills/wong-setup/SKILL.md
to see whether WongStack fits how I work — then, if it does, walk me through setting it up.
```

The lead-in sentence (README ~line 35) drops "that's the whole setup" (which pre-commits to installing) in favor of framing it as the front door that assesses fit first; the existing "(not sure WongStack is for you? it'll tell you)" note stays.

**2. Tighten Step 3's fast-path trigger.** Reword so the consultation is the stated default and the fast path fires only on an explicit skip signal. Drop the "came in having read the README and named what they want" clause (the one that catches the paste); keep "just install it" / "asked to skip the questions". Explicitly note that a bare "set up WongStack" is *not* a skip signal.

**3. Keep the "Hard rules" line consistent.** The rule "'Just install it' skips straight to Step 5" already scopes the skip to the explicit phrase — leave it, but verify it doesn't reintroduce the broad reading after the Step 3 edit.

**4. Release ritual.** Payload touched (`wong-setup/SKILL.md`) → bump `VERSION` (patch: wording fix, no behavior/API change) and prepend a `CHANGELOG.md` entry.

## Risks / Trade-offs

- **Someone who genuinely wants a straight install now types one extra word.** Mitigated: "just install it" / "skip the questions" still fast-paths, and the reworded prompt still ends in setup on a yes — the consultation for a decided user is short (a one-line confirm, per the fast path's own "confirm in one line").
- **The install-onboarding spec already blessed the old prompt shape.** This change modifies both affected requirements in the delta, so the archived spec stays the accurate record.
- **Low blast radius:** two prose files plus the release ritual; nothing executable changes.

<!-- end design.md -->
<!-- file tasks.md utf8 1416 -->
## 1. Reword the README front door

- [x] 1.1 Replace the setup-prompt code block in `README.md` with the evaluate-first paste from design.md ## Decisions #1 (keeps the `wong-setup/SKILL.md` URL-read mechanism).
- [x] 1.2 Adjust the lead-in sentence (~line 35) so it frames the paste as the fit-assessing front door rather than "the whole setup"; keep the "(not sure WongStack is for you? it'll tell you)" note.

## 2. Tighten the fast-path trigger

- [x] 2.1 In `.claude/skills/wong-setup/SKILL.md` Step 3, reword the fast path per design.md ## Decisions #2 — consultation is the default; fast path fires only on an explicit skip signal ("just install it" / "skip the questions"); drop the "read the README and named what they want" clause; state that a bare "set up WongStack" is not a skip signal.
- [x] 2.2 Verify the "Hard rules" line about skipping still reads consistently with the tightened Step 3 (no reintroduced broad reading).

## 3. Release ritual

- [x] 3.1 Bump `VERSION` 6.0.0 → 6.0.1 (patch: wording fix, no behavior change).
- [x] 3.2 Prepend a newest-first `CHANGELOG.md` entry describing the front-door prompt fix.

## 4. Verify

- [x] 4.1 Re-read the reworded README paste + Step 3 as an agent would: confirm following the paste now leads to the consultation, and that an explicit "just install it" still fast-paths.
- [x] 4.2 `openspec validate improve-setup-prompt-consultation --strict`.

<!-- end tasks.md -->
<!-- file specs/install-onboarding/spec.md utf8 2400 -->
## MODIFIED Requirements

### Requirement: Consultation is skippable

`wong-setup` SHALL run the discovery-and-diagnosis consultation by **default**, and SHALL fast-path straight to setup **only** when the user gives an explicit skip signal — asking to skip the questions or to just install it. A request that merely names WongStack or asks to set it up (e.g. the README paste, "set up WongStack in this repo") SHALL NOT count as a skip signal; it SHALL run the consultation. The consultation SHALL never be a toll gate: an explicit skip is always honored immediately.

#### Scenario: Default paste runs the consultation

- **WHEN** the user hands the skill a plain setup request ("set up WongStack in this repo", or the README paste prompt) with no skip signal
- **THEN** the skill runs discovery, diagnosis, and the fit verdict before any setup work

#### Scenario: Explicit skip is honored

- **WHEN** the user asks to skip the questions or says "just install it"
- **THEN** the skill proceeds directly to setup without requiring the discovery conversation

### Requirement: Warm one-paste front door

The README SHALL present a short, warm, beginner-friendly paste-able setup prompt that keeps the URL-read mechanism pointed at `wong-setup/SKILL.md` (so the README never drifts from the runbook), SHALL note that the skill will honestly assess fit ("not sure it's for you? it'll tell you"), and SHALL point newcomers to Claude Code's web/desktop version at claude.ai/code as the least terminal-intensive way to run that first paste — while the prompt itself works in any coding agent. The prompt's wording SHALL frame the paste as a request to **evaluate fit and guide the user through it** rather than a command to install outright, so that following it triggers the consultation instead of bypassing it.

#### Scenario: Newcomer reads the README

- **WHEN** someone new to coding agents reads the install section
- **THEN** they find one short warm prompt to paste that reads+follows the `wong-setup` runbook URL, a note that it assesses fit honestly, and a pointer to claude.ai/code for running it without a heavy terminal setup

#### Scenario: The paste invites the consultation

- **WHEN** an agent follows the pasted prompt in a repo with no WongStack manifest
- **THEN** the prompt's wording leads it to run `wong-setup`'s consultation and fit verdict, not to jump straight to install

<!-- end specs/install-onboarding/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-07-22

~~~
<!-- end .openspec.yaml -->
