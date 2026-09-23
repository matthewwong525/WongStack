## Context

[`/wong-sync`](../../../.claude/skills/wong-sync/SKILL.md) already has three routes after its deterministic preflight: `current`, `update`, and `error`. Only `update` hands off, and today it hands off to `/explore`. [`/plan`](../../../.claude/skills/plan/SKILL.md) already starts with a bounded `/explore` that asks one question group at most, then drafts, builds `review.html`, validates, and — when not invoked by `/apply` — presents the page and stops. See proposal.md — Why.

## Goals / Non-Goals

**Goals:**
- Change the one handoff target and every sentence that names it, so the skill, its specs, and its advertised summary agree.

**Non-Goals:**
- No new mode or flag in `/plan` or `/explore`: the existing bounded mode and standalone stop already give the chosen behavior.
- No change to the preflight script or its JSON contract.

## Decisions

- **Invoke `/plan`, not `/apply` with a stop.** `/plan` standalone already stops at the review and offers the next step. Routing through `/apply` would need a new "plan only" instruction. Ruled out.
- **Keep the handoff description, retargeted.** The quoted description sync passes on stays the same, except that it now asks for a plan. `/plan` records it as intent, so no sync-specific proposal format appears.
- **Keep the pre-16 migration in the plan's tasks.** The generated-layer migration was to be included "in the agreed `/apply` tasks"; it now lands in the tasks `/plan` writes, which `/apply` later works. Same outcome, earlier on the page.
- **Keep the verb-chain sentence.** "An existing request to plan, implement, or ship continues through that verb" still holds: a request to implement or ship goes to `/apply` or `/ship`, which invoke `/plan` themselves.

## Risks / Trade-offs

- [A user who only wanted to discuss an update now gets a change folder] → it is uncommitted until `/save`; the review offers "stop here", and the folder can be deleted.
- [The first sync that brings in this release still runs the target's old installed skill, so it stops in `/explore`] → expected and harmless; later syncs use the new handoff, and the CHANGELOG entry explains it.
