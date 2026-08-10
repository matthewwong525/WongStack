## Context

See proposal.md — Why.

The constraints that shape the approach:

- **Nothing builds locally.** [The gate](../../../wiki/development/the-change-loop.md#the-gate) is CI when present, else PR review. A skill that ran a suite locally to decide whether a bump is safe would be inventing a second gate.
- **`/save` already owns the loop this skill needs.** It commits, pushes, opens or updates the PR, waits for checks, and auto-fixes failures. An update pass is therefore mostly *deciding what to bump*; the verification half already exists.
- **This repo's own dependency surface is small and mixed:** globally installed npm binaries (`@fission-ai/openspec`, `agent-browser`), OS-level tools (`git`, `gh`, `node`), an npm project at `app/`, and a *generated* layer (`.claude/skills/openspec-*`, `.claude/commands/opsx/`) that is a function of the OpenSpec CLI version rather than of anything committed by hand.
- **The payload is prose with no compiler.** A CLI upgrade that renames or adds a generated skill silently invalidates every payload page that names or counts them, and [`scripts/check-payload-links.mjs`](../../../scripts/check-payload-links.mjs) catches only links, not counts.
- **`/wong-sync` copies exactly the manifest.** That makes manifest membership the whole scoping mechanism — no flag, no conditional, no opt-out list.

## Goals / Non-Goals

**Goals:**

- One verb that leaves this repo at latest across every dependency surface, with a single readable `old → new` report.
- A regeneration step that ends by answering one question: *is this run a release?*
- Reuse of `/save` for everything after the diff exists.

**Non-Goals:**

- Any scheduling, cron, or automatic invocation.
- Any behavior in a target repo. Target repos are unaffected by this change in every respect.
- A test harness, a local build step, a lockfile audit, or a security-advisory scan. Those are separate concerns and adding them here would blur the verb.
- Updating the machine's OS packages beyond the named tools.

## Decisions

**A skill, not a script.** The work is judgment-heavy — reading a major's migration guide and applying it, deciding whether a generated-layer diff rippled into prose — which is exactly what a script cannot do. Considered a `scripts/update-deps.mjs` that does the mechanical bumps and leaves the reading to a human; rejected because the mechanical half is two `npm` commands and the split would put the report in one place and the judgment in another.

**Meta-repo-only by manifest omission, not by a flag.** `/wong-sync` copies only manifest files, so leaving the skill out of [the payload manifest](../../../.claude/skills/wong-sync/references/payload-manifest.md) is sufficient and needs no new mechanism. The cost is that the omission looks like a bug to a later reader, so the skill's own text states the scoping and why — that sentence is load-bearing, not decoration. Considered adding the skill to the payload with a "meta-repo only" note; rejected because a target repo would then have a verb whose update policy it never chose, aimed at tools it may not use.

**Aggressive to latest, majors included.** The alternative — latest-minor with majors surfaced for approval — defers exactly the work that is worth doing while the context is loaded, and lets majors accumulate until the upgrade is a project. Taking the major now means the migration is read once, against a small diff, with CI to catch the rest. The honest cost is stated in the spec: CI's coverage is the ceiling, and `app/`'s coverage is `vitest` plus `oxlint`.

**Survey before change, always.** The report of what *is* out of date has value even when the user stops there, and it makes the run's later output checkable against its own opening. It also gives the skill a natural no-op exit.

**Regen ripple check is name-and-count based.** After `openspec update`, compare the set of generated skill and command names against what the payload's prose says — the wiki's skill listings, `CLAUDE.md`'s verb list, the manifest — because a link checker cannot see a wrong count. Then run [`scripts/check-payload-links.mjs`](../../../scripts/check-payload-links.mjs) for the link half.

**Hand off rather than commit.** The skill runs no git. `/save` is the only checkpoint, consistent with the repo's rule that the WongStack git skills own every git action.

**Release detection is a payload-path test.** "Did any file in the payload manifest change?" is mechanical and exact, and answers the `VERSION`/`CHANGELOG.md` question without judgment. The judgment that remains is only *which* semver segment.

## Risks / Trade-offs

- **A major breaks something CI does not cover** → Stated openly in the skill's own output rather than hidden; the run reports what CI verified, and the bump is on a branch and a PR, so reverting is one merge decision, not a recovery.
- **`agent-browser` and the OpenSpec CLI are the only tools whose upgrade can change payload behavior** → Both are surveyed and regenerated explicitly; `openspec update` runs every pass so a drifted generated layer is corrected even when the CLI version did not move.
- **The manifest omission gets "corrected" by a future sync or reviewer** → The skill states its own scoping, and this change's spec makes the omission a requirement, so a diff that adds it fails review against a written contract.
- **A payload-touching run turns a routine bump into a release** → That is correct, not a risk; the mitigation is that the skill flags it rather than letting the payload change land un-versioned.
- **A run leaves the repo half-updated if it stops mid-way** → Everything it writes is uncommitted until `/save`, so an abandoned run is discarded with the working tree.

## Open Questions

None. Scheduling is deferred by decision, not by uncertainty.
