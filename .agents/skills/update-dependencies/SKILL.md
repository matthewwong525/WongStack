---
name: update-dependencies
description: Bring the WongStack meta-repo's own toolchain and dependencies to their latest versions in one pass — survey installed vs latest for the OpenSpec CLI, agent-browser, gh, git, node, the app/ npm dependencies and the generated openspec-* skill layer; update the machine's tools; run openspec update and check what rippled into the payload; bump app/ to latest including majors, reading each major's migration guide and fixing what breaks; then hand the diff to /save, where CI is the gate. Use when asked to update or bump dependencies, upgrade the tools, check whether we are on the latest OpenSpec or agent-browser, take the app to the newest versions, or find out what is out of date. Meta-repo only — this skill is not part of the payload and never reaches a target repo. On demand only; it schedules nothing.
user-invocable: true
---

# /update-dependencies

Everything this repo depends on, brought to latest in one pass — the tools on the machine, the layer `openspec` generates, and the `app/` package tree — then handed to the ordinary gate.

Two things about this verb before anything else:

**It is meta-repo-only.** It maintains the WongStack source clone, and nothing else. It is deliberately **absent from [the payload manifest](../wong-sync/references/payload-manifest.md)**, and that absence is the whole mechanism: `/wong-sync` copies exactly the manifest, so a target repo never receives this skill and never inherits an update policy it did not choose. **The omission is not an oversight — do not "fix" it by adding an entry.** A target repo keeps its own update story; [adding a skill](../../../wiki/development/adding-a-skill.md) describes the payload path, and this skill is not on it.

Because it is not payload, editing this skill's own files needs **no `VERSION` bump and no `CHANGELOG.md` entry**. That exemption covers these files only. Any payload file a *run* touches is a release like any other — see [Stage 3](#stage-3--regen).

**It is on demand.** If you are asked to make it recurring, say that scheduling is not part of this verb. Register no cron entry, write no workflow, arrange no recurring execution.

## What it runs on

Five stages, in order. **Report every stage, including the ones with nothing to do** — a stage that finds everything current is reported as current, never skipped silently, because the value of the run is a complete picture of currency whether or not anything moved.

If the survey finds nothing out of date anywhere, say so, change no file, and stop. Do not invoke `/save` for a no-op run.

### Stage 1 — Survey

Report **installed vs latest** for each surface below, as one table with an `old → new` column. Mark anything already current as current.

| Surface | Installed | Latest |
|---|---|---|
| OpenSpec CLI | `openspec --version` | `npm view @fission-ai/openspec version` |
| `agent-browser` | `agent-browser --version` | `npm view agent-browser version` |
| `gh` | `gh --version` | `gh release view --repo cli/cli --json tagName --jq .tagName` |
| `git` | `git --version` | the platform's package source |
| `node` | `node --version` | `npm view node version`, or the [Node.js](https://nodejs.org/) release line |
| `app/` dependencies | `app/package.json` | `npm outdated` in `app/` (it exits non-zero when anything is outdated — that is its normal reporting exit, not a failure) |
| generated `openspec-*` layer | the `.claude/skills/openspec-*` and `.claude/commands/opsx/` files on disk | what the installed CLI generates |

`npm outdated` reports `Current`, `Wanted`, and `Latest`. **`Latest` is the column this skill acts on** — `Wanted` is the semver-range answer and is the thing this verb deliberately ignores.

The globally installed npm binaries are the OpenSpec CLI and `agent-browser`; `npm ls -g --depth=0` lists what is actually installed. What each tool is for is [required tools](../../../wiki/development/required-tools.md) — link there rather than re-explaining it in the run's output.

### Stage 2 — Machine

Update the machine's tools to latest and report each as `old → new`.

The two npm-distributed tools update with `npm install -g <pkg>@latest`. `git`, `gh`, and `node` come from the platform's own package source; where updating one would need `sudo` or would change the machine more than the user expects, say what the update is and ask rather than doing it — installing a runtime is the one action in this repo's flows that changes the machine rather than the repo, and [required tools](../../../wiki/development/required-tools.md#runtimes-install-at-the-point-of-need) owns that rule.

Report the resulting versions even where nothing moved.

### Stage 3 — Regen

Run `openspec update` to regenerate the OpenSpec instruction layer. **Run it every pass**, not only when the CLI version moved — a generated layer can drift from the installed CLI on its own, and regenerating corrects that for free.

Then the **ripple check**, which asks what the regeneration changed *beyond* the generated files. A link checker cannot see a wrong count, so check names and counts by reading:

1. **The set of generated skills and commands** — `.claude/skills/openspec-*/` and `.claude/commands/opsx/`. Compare the names against what the repo's prose says they are, and **report any name that was added, removed, or renamed**. A CLI release that changes this set invalidates every page that lists them.
2. **The payload prose that cites those names or counts** — the skills list in the `WONG-STACK` block of [`CLAUDE.md`](../../../CLAUDE.md), the [payload manifest](../wong-sync/references/payload-manifest.md), the `README.md` "What you get" table and Layout tree, and the wiki pages that name the verbs.
3. **The links** — `node scripts/check-payload-links.mjs`. It resolves every internal link against the file set a *target* receives, in each install shape; this repo cannot detect a payload dead link by inspection, because everything resolves here. *Dead* fails the run; *conditional* is reported and allowed.

End the stage by answering **"is this run a release?"** out loud, in both directions:

- **A payload file changed** → the run **is a release**, and ends the way every payload edit does: follow [editing the payload is a release](../../../wiki/development/README.md), which owns the rule. Do it in this same change.
- **Only generated files changed, or nothing did** → say plainly that the run is **not** a release and no `VERSION` bump is due, so the absence of one is a stated conclusion rather than something a reviewer has to guess at.

Whether a file is payload is a mechanical test: is it in [the manifest](../wong-sync/references/payload-manifest.md)? The only judgment left is which semver segment.

### Stage 4 — Deps

Bump `app/` to **latest, majors included**.

- Do not pin to the newest minor. Do not skip a major to avoid breakage. Do not ask for per-bump approval — the aggressive posture is the decided one, and the safety net is the gate, not caution here.
- For **every major-version bump**, read that dependency's changelog, release notes, or migration guide, and apply the migration to this repo's code before handing off. A major taken without reading its notes is the one failure mode this stage exists to prevent.
- Update `app/package-lock.json` alongside `app/package.json`.

`npm outdated` in `app/` gives the list; `npm install <pkg>@latest` per package (or `npm install <pkg>@latest ...` in one call) takes them there. Report the whole set as `old → new`, majors marked.

### Stage 5 — Hand off

**This skill runs no git.** Hand the diff to [`/save`](../save/SKILL.md), which owns every git action, and let the gate decide.

- CI is the gate; where it is absent, PR review is. Both are [the change loop](../../../wiki/development/the-change-loop.md#the-gate)'s call, not this skill's.
- **Define no test harness here.** Do not run a build or a suite locally as a prerequisite for handing off, and do not report an update as verified on this skill's own authority — nothing builds locally, and a second gate invented here would be one nothing else honours.
- When CI comes back **red**, fix the failure through `/save`'s own auto-fix loop and re-checkpoint. Do not fall back to running the suite locally as the gate.

**Say what was actually verified.** CI's coverage is the real ceiling on what breakage gets caught: for `app/`, that is `vitest` and `oxlint` by way of [`.github/workflows/test.yml`](../../../.github/workflows/test.yml). A green run means those passed — it does **not** mean the majors are proven safe, and the run's report must not imply that it does.

## Boundaries

- **No scheduling.** On demand only.
- **No target-repo behavior.** This verb changes nothing about how any installed repo works.
- **No lockfile audit, no advisory scan, no OS-package sweep.** Currency is the job; security auditing is a different one and belongs in its own verb.
- **No git.** `/save` owns it.
