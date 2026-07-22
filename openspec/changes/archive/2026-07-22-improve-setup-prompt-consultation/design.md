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
