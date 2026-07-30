# widen-save-prose-fast-path

**Status:** ready-to-ship
**Open questions:** none

## Why

`/save`'s direct-to-default-branch fast path is scoped to exactly `notes/*.md`. Everything else — including a `/dream` run that only rewrites wiki prose — cuts a branch, opens a PR, waits for CI, and then needs `/ship`. That's the full behavior-change gate applied to files that carry no behavior, and it makes the cheapest, most frequent kind of save the most expensive one to land.

The gate exists to stop unreviewed *behavior* reaching the default branch. Prose isn't behavior. Widen the carve-out to the prose surfaces, keep the gate intact for everything that executes.

## What Changes

- **The fast path becomes a path allowlist, not a single directory.** `/save` commits straight to the default branch when every changed path is under `notes/**` or `wiki/**`. One path outside the allowlist and the whole save takes the normal branch + PR + CI flow, with the prose riding along on the branch.
- **Routing stays pure path scope.** No judgment call, no escape hatch, no "is this consequential?" read of the session. The route is a mechanical function of the diff's paths, so it's predictable and auditable.
- **Routing is by path, never by file extension.** `.claude/skills/**/*.md` *is* the WongStack payload and editing it is a release; `openspec/**` is the spec. An extension rule would push both straight to `main`. The allowlist is explicit and closed.
- **Explicitly outside the allowlist:** `.claude/**`, `openspec/**`, `app/**`, `VERSION`, `CHANGELOG.md`, `CLAUDE.md`, `README.md`, and any config file — even though several are markdown.
- **BREAKING (doctrine):** wiki edits no longer require a PR. `CLAUDE.md`, `notes/README.md`, and `.claude/skills/dream/SKILL.md` currently state the opposite — that `/dream`'s wiki edits "take the normal branch + PR route" — and all three must be amended. The review of a wiki edit moves to where it actually happens: in-session, on the diff `/dream` produced, before `/save` runs.
- The skill's vocabulary renames from "notes-only fast path" to **"prose fast path"** throughout (Step 1 decision, Step 5 variant, Step 7 report variant, Hard rules, frontmatter description).
- Payload edit ⇒ release: `CHANGELOG.md` entry + `VERSION` bump (minor — behavior change to a shipped skill, no removed capability).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `delivery-gate`: the notes-only exception to the branch-and-PR gate widens to a `notes/**` + `wiki/**` prose allowlist; the "Wiki edits keep the gate" scenario inverts.
- `session-notes`: the "notes-only save commits directly to the default branch" requirement generalizes to the prose allowlist, and `/dream`'s no-git rule keeps holding while its stated *reason* ("a wiki edit is worth reviewing via PR") is replaced.

## Impact

- `.claude/skills/save/SKILL.md` — frontmatter description, Step 1 fast-path decision, Step 4c (unchanged behavior, wording), Step 5 variant, Step 7 report variant, Hard rules.
- `.claude/skills/dream/SKILL.md` — the "No git" bullet's justification (line ~67).
- `CLAUDE.md` — the carve-out rule under Rules (lines ~71–75).
- `notes/README.md` — the "Reaching `main`" section (lines ~87–95).
- `wiki/contributing.md`, `wiki/development/the-change-loop.md` — check for restatements of the old scope.
- `VERSION`, `CHANGELOG.md` — release.
- No code, no CI config, no app changes. Nothing to build or test.

## Non-goals

- Widening to loose top-level prose (`README.md`, `CHANGELOG.md`, arbitrary root `*.md`/`*.txt`) — considered and left out; several are payload.
- Putting `openspec/changes/**` on the fast path — a plan-only save keeps its PR.
- Any change to `/ship`, `/apply`, or the CI-when-present rule.

## Decision log

- **2026-07-30 (implementation)** — All 19 tasks landed; `VERSION` 7.1.0 → 7.2.0. Two repo-structure facts the plan didn't know, both of which would have silently no-op'd edits: **`CLAUDE.md` is a symlink to `AGENTS.md`** (the Edit tool refuses to write through it — edit `AGENTS.md`), and **every `.claude/skills/*/SKILL.md` is a symlink into `.agents/skills/`**. `grep -r` does not follow either, so design.md's five-site audit under-counted — the real edit targets are `.agents/skills/save/SKILL.md` and `.agents/skills/dream/SKILL.md`. Consequence for the allowlist itself: `AGENTS.md` was added by name to the gated-paths list in the doctrine, since it *is* the doctrine file that `CLAUDE.md` points at. The 6.1 sweep also caught a **sixth** stale site the plan missed — `/save` Step 4c's "notes-only save with no change" — now fixed. Added one thing not in the plan: a `git status --porcelain` re-check between `git add` and `git commit` in Step 5's prose variant, so a stray non-prose path can't ride to the default branch. Left `openspec/specs/{delivery-gate,session-notes}/` untouched by hand — the delta specs fold in via `/save` Step 4d (`openspec-sync-specs`), which is the defined mechanism.
- **2026-07-30** — Scoped the allowlist to `notes/**` + `wiki/**`. Rejected extension-based routing (`*.md`/`*.txt`) outright: in this repo the skills, the specs, and the doctrine are all markdown, so an extension rule would route the payload itself past the gate. Rejected the loose top-level-prose tier and `openspec/changes/**` for the same "it's really payload/spec" reason. Chose pure path scope over a judgment-based escape hatch so "never push to the default branch" stays a hard rule with a closed, enumerable exception rather than a soft one. Accepted trade-off on `wiki/**`: it *is* canonical and curated, which is exactly why the current docs give it a PR — but `/dream` is deliberate and human-invoked, its diff is reviewed in-session before `/save`, and a wiki page can't break a deploy. The three docs asserting the old rule get amended rather than left to contradict the skill.
