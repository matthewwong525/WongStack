<!-- openspec-archive v1 2026-07-30-widen-save-prose-fast-path -->
<!-- file proposal.md utf8 5937 -->
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

<!-- end proposal.md -->
<!-- file design.md utf8 7873 -->
## Context

`/save` routes every checkpoint down one of two paths, decided in Step 1 of `.claude/skills/save/SKILL.md`:

- **notes-only fast path** — every changed path matches `notes/*.md` → commit straight to the default branch, no branch, no PR, no CI, no `/ship`.
- **normal flow** — anything else → branch + commit + push + PR (body mirrors the change) + CI wait.

That scope is asserted in five places, and three of them go further and state that wiki edits specifically *must* take the PR route:

| File | Line(s) | Says |
|---|---|---|
| `.claude/skills/save/SKILL.md` | Step 1, Step 5, Step 7, Hard rules | scope is `notes/*.md`, "exact" |
| `CLAUDE.md` | ~71–75 | "scoped exactly to `notes/*.md`" + "those take the normal branch + PR route" |
| `notes/README.md` | 87–95 | same, plus "those go through the normal branch + PR gate" |
| `wiki/development/the-change-loop.md` | 23–29 | same, plus "which takes the usual branch + PR route" |
| `.claude/skills/dream/SKILL.md` | 67 | "a wiki edit *is* canonical and *is* worth reviewing" |

The `delivery-gate` and `session-notes` specs encode it too, including a `Scenario: Wiki edits keep the gate`.

So this is not a one-line edit to a skill. It is a doctrine change with a fixed, enumerable blast radius, and the failure mode is leaving one of the five saying the opposite.

This repo has no build or test suite — the payload is prose. Verification is reading the five files back and confirming they agree.

## Goals / Non-Goals

**Goals:**

- `/save` lands prose-only sessions on the default branch in one command, for both `notes/**` and `wiki/**`.
- The routing rule stays a **mechanical function of the diff's paths** — readable, closed, and decidable without reading the session.
- All five doctrine sites plus both specs state the same rule after this change.
- The `notes/*.md` → `notes/**` widening is included: a note is `notes/<slug>.md` today, but the prefix form is what the allowlist speaks and there is no reason for `notes/` to be narrower than `wiki/`.

**Non-Goals:**

- Extension-based routing (`*.md`, `*.txt`) anywhere.
- Adding `README.md`, `CHANGELOG.md`, root scratch prose, or `openspec/changes/**` to the allowlist.
- Any change to `/ship`, `/apply`, `/continue`, or the CI-when-present rule.
- Automating the check — no script, no hook. `/save` already reads `git status --porcelain` in Step 1; the allowlist test is applied to that output by the agent, the same way the `notes/*.md` test is applied today.

## Decisions

### D1 — Allowlist of path prefixes, not a file-extension rule

`notes/**` and `wiki/**`. Nothing else.

*Why not extension.* The user's ask was "markdown files or text files." In almost any other repo that would be a fine proxy for "prose." In *this* repo it inverts: `.claude/skills/**/*.md` **is** the shipped payload (CLAUDE.md: "Editing the payload is a release"), `openspec/**` is the specs, and `CLAUDE.md` itself is the doctrine. An extension rule would push a skill rewrite, a spec edit, and a version bump straight to `main` unreviewed — exactly the thing the gate exists to stop. The same trap exists in any target repo that documents in markdown next to its code.

*Why a closed allowlist and not a denylist.* A denylist (`everything except .claude/, openspec/, app/, config`) fails open: a new payload surface added next year silently joins the fast path. An allowlist fails closed — a new surface gets the gate until someone deliberately adds it.

### D2 — Pure path scope, no judgment escape hatch

The alternative considered was: path scope decides by default, but `/save` may escalate a prose-only diff to a PR when it judges the edit consequential (e.g. rewriting the wiki's install steps).

Rejected. It converts "never push to the default branch, except <enumerable list>" from a hard rule into a soft one. A hard rule with a closed exception is auditable by reading a diff's paths; a soft one is not, and it makes `/save`'s behavior unpredictable across runs on the same kind of change. If a wiki edit genuinely wants review, the user can say so and `/save` is a skill, not a wall — but the default must be mechanical.

### D3 — Accept that `wiki/` is canonical and still fast-path it

This is the real trade-off, and the current docs argue the other side explicitly. Reasons to accept it anyway:

- **`/dream` is deliberate and human-invoked.** Nothing auto-runs it. Its edits sit in the working tree and the human sees the diff in-session before `/save`. The review happens — it just isn't a PR.
- **Wiki content cannot break anything.** No deploy, no import, no behavior. The worst case is a wrong sentence, fixed by the next `/dream`, which gardens contradictions newest-wins by design.
- **The PR was costing more than it bought.** A wiki-only `/dream` currently needs branch + PR + CI wait + `/ship` + archive to land a paragraph.

Mitigation is in D4: git history is the audit trail, and `/dream`'s gardening pass is the repair mechanism.

### D4 — Amend the three "wiki edits take the PR route" assertions rather than leave them

`CLAUDE.md`, `notes/README.md`, `wiki/development/the-change-loop.md`, and `.claude/skills/dream/SKILL.md` all justify the notes carve-out by contrasting it with wiki edits. Once wiki joins the allowlist that contrast is false, so each needs a *replacement justification*, not a deletion: **the gate stops unreviewed behavior reaching the default branch; neither notes nor wiki carry behavior.** `/dream`'s "No git" bullet keeps its rule (it runs no git) but swaps its reason from "wiki edits deserve a PR" to "the git skills own git."

### D5 — Ordering: specs and doctrine in one change, `/save` last

Edit the skill last so that when its Step 1 is rewritten, the four doctrine files it cross-references already agree. Release bookkeeping (`VERSION`, `CHANGELOG.md`) closes the change, per the repo's release rule.

### D6 — Version bump: minor

`7.1.0 → 7.2.0`. Behavior of a shipped skill changes and the routing doctrine widens; nothing is removed and no target repo's existing usage breaks (a repo with no `wiki/` is unaffected; a repo with one gets faster saves). Not a patch — the change is user-visible and worth a `/wong-sync` adopting it.

## Risks / Trade-offs

- **A bad wiki edit reaches `main` with no PR review.** → `/dream`'s gardening pass resolves contradictions newest-wins and reality-checks paths against the code; git history and `git revert` remain. Blast radius is prose.
- **Ambiguity at the boundary: does `wiki/` include a repo whose wiki root is `docs/`?** → No. The allowlist is the literal prefix `wiki/`. `/improve docs` falls back to `docs/`, but the fast path does not — a repo that keeps prose in `docs/` keeps the gate. Stated explicitly in the skill so it isn't re-litigated per save.
- **Mixed `/dream` output.** A `/dream` run that also stamps `consolidated:` into `notes/` stays fully in the allowlist — good. But one that also touches `openspec/` or a skill drops to the normal flow for the *whole* diff. → This is intended and must be stated in the skill's Step 1, or an agent will be tempted to split the commit.
- **A target repo protects its default branch.** → Already handled: the existing rejected-push fallback (branch + PR, never force) is kept and now covers wiki too.
- **Five files drift apart.** → The verification task greps for `notes/*.md` and "branch + PR route" across the payload and confirms zero stale hits.

## Migration Plan

No data, no code, no deploy. Existing repos pick this up through `/wong-sync`, which copies missing payload files and proposes adopting the rest; it never overwrites, so a repo that already customized `save/SKILL.md` keeps its version and sees the gap proposed as a change.

Rollback is `git revert` of this change's merge commit.

## Open Questions

None.

<!-- end design.md -->
<!-- file tasks.md utf8 4134 -->
## 1. Doctrine — CLAUDE.md

- [x] 1.1 Rewrite the carve-out bullet under `## Rules` (~lines 71–75): the exception is the **prose allowlist** `notes/**` + `wiki/**`, decided by exact path scope, never by extension. Replace the "and those take the normal branch + PR route" clause about `/dream`'s wiki edits with the new justification per design.md D4 — the gate stops unreviewed *behavior*, and neither surface carries behavior.
- [x] 1.2 In the same bullet, state the payload trap explicitly: markdown under `.claude/**`, `openspec/**`, and `CLAUDE.md`/`README.md`/`CHANGELOG.md`/`VERSION` keeps the full gate, because editing the payload is a release.

## 2. Doctrine — notes/README.md and the wiki

- [x] 2.1 Rewrite `notes/README.md` `## Reaching \`main\`` (~lines 87–95) for the widened allowlist; drop "those go through the normal branch + PR gate like everything else" and give the replacement reason.
- [x] 2.2 Rewrite `wiki/development/the-change-loop.md` (~lines 23–29) the same way; drop "which takes the usual branch + PR route."
- [x] 2.3 Grep `wiki/contributing.md` and the rest of `wiki/` for other restatements of the `notes/*.md`-only scope and fix any found.

## 3. The /dream skill

- [x] 3.1 In `.claude/skills/dream/SKILL.md`, rewrite the **No git** bullet (~line 67): keep the rule (`/dream` runs no git; `/save` commits, `/ship` merges) but replace its reason per design.md D4 — the git skills own git — and delete the claim that a wiki edit is worth a PR and that the fast path "does not apply here."

## 4. The /save skill

- [x] 4.1 Rewrite **Step 1 — the fast path decision**: rename "notes-only fast path" → **prose fast path**; state the allowlist as the two prefixes `notes/**` + `wiki/**`; keep the "exact path scope" language; add that routing is by path prefix and never by extension, and that `wiki/` means the literal prefix (a repo whose prose lives in `docs/` keeps the gate) per design.md Risks.
- [x] 4.2 State in Step 1 that a mixed diff — prose plus one path outside the allowlist — takes the normal flow **for the whole save**, and must not be split into two commits to dodge the gate.
- [x] 4.3 Update the Step 2 routing table so a prose-only session (incl. a `/dream` run) maps to the prose fast path.
- [x] 4.4 Rewrite **Step 5's notes-only variant** → prose variant: `git add notes/ wiki/` (stage by path, only what changed), commit message convention for a wiki-bearing save, unchanged direct push to the default branch. Keep the protected-branch fallback (branch + PR, never force) and extend its wording to cover wiki.
- [x] 4.5 Rewrite **Step 7's notes-only report variant** → prose variant: name the changed prose paths, say they landed on the default branch, omit PR/CI/preview sections entirely, don't suggest `/ship`.
- [x] 4.6 Update the **Hard rules** block: the default-branch exception is the prose allowlist; the "never merge" and "never force" rules are untouched.
- [x] 4.7 Update the skill's frontmatter `description` — it currently says a conversation-only session "commits it straight to the default branch"; broaden to the prose allowlist so the skill is discoverable for wiki saves.

## 5. Release

- [x] 5.1 Bump `VERSION` `7.1.0` → `7.2.0` (minor, per design.md D6).
- [x] 5.2 Add the newest-first `CHANGELOG.md` entry: `/save`'s fast path widens from `notes/*.md` to the `notes/**` + `wiki/**` prose allowlist; wiki edits no longer need a PR; routing is by path prefix, never extension.

## 6. Verify

- [x] 6.1 `grep -rn "notes/\*\.md" .` across the payload — zero remaining hits asserting the old scope (archived changes under `openspec/changes/archive/` are historical record; leave them).
- [x] 6.2 `grep -rn "branch + PR route\|branch + PR gate\|worth reviewing"` — zero remaining hits claiming wiki edits need a PR.
- [x] 6.3 Read the five doctrine sites back in order (`CLAUDE.md`, `notes/README.md`, `wiki/development/the-change-loop.md`, `.claude/skills/dream/SKILL.md`, `.claude/skills/save/SKILL.md`) and confirm they state one identical rule.
- [x] 6.4 `openspec validate widen-save-prose-fast-path --strict` passes.

<!-- end tasks.md -->
<!-- file specs/delivery-gate/spec.md utf8 4627 -->
## MODIFIED Requirements

### Requirement: The gate is CI-when-present, else PR review

`/save` and `/ship` SHALL determine the gate by whether the repo has checks configured. When checks exist, the skills wait for them and, on failure, read-fix-repush (capped); `/ship` merges only on green. When no checks exist, the gate SHALL be PR review only — the PR plus the OpenSpec change and the in-repo record is the system, and a human approves the PR before `/ship` merges.

**Prose exception.** A `/save` whose entire diff falls inside the **prose allowlist** SHALL bypass the branch-and-PR gate and commit directly to the default branch. The allowlist is exactly two path prefixes: `notes/**` and `wiki/**`. The carve-out is decided by **path scope only** — never by file extension, and never by a judgment of how consequential the edit is. It is exact: if any path outside the allowlist appears in the diff, the normal branch + PR flow applies in full to the whole save.

Routing SHALL NOT key on file extension. Markdown outside the allowlist — `.claude/**` (the shipped payload, whose edit is a release), `openspec/**` (the specs), `CLAUDE.md`, `README.md`, `CHANGELOG.md`, `VERSION`, `app/**`, and any config file — keeps the full gate.

The gate is not weakened by this. Neither surface carries behavior: a note is raw, unconsolidated, and non-canonical, and a wiki page is prose a human already reviewed in-session on the diff `/dream` produced. Nothing in either surface executes, deploys, or changes what the tooling does.

#### Scenario: Repo has CI configured

- **WHEN** `/save` or `/ship` runs and `wait-for-checks.sh` reports checks
- **THEN** the skill waits for the checks, auto-fixes on red (cap 3 attempts), and `/ship` merges only once green

#### Scenario: Repo has no CI configured

- **WHEN** `/save` or `/ship` runs and `wait-for-checks.sh` returns `NONE`
- **THEN** the skill proceeds without waiting for or requiring any CI run
- **AND** `/ship` merges on the strength of PR review rather than a green CI run

#### Scenario: Notes-only save bypasses the gate

- **WHEN** `/save` runs and every changed path is under `notes/`
- **THEN** it commits and pushes directly to the default branch, opening no PR and requiring no `/ship`

#### Scenario: Wiki-only save bypasses the gate

- **WHEN** `/dream` has consolidated notes into `wiki/` and `/save` runs with every changed path under `wiki/` (optionally alongside the `consolidated:` frontmatter updates in `notes/`)
- **THEN** it commits and pushes directly to the default branch, opening no PR and requiring no `/ship`

#### Scenario: A single non-allowlisted path restores the gate

- **WHEN** a save's diff contains `notes/<slug>.md` or `wiki/<page>.md` plus any path outside the allowlist
- **THEN** the normal branch + PR flow applies and the prose rides along on that branch

#### Scenario: Markdown payload keeps the gate

- **WHEN** a save's diff touches `.claude/skills/save/SKILL.md`, `CLAUDE.md`, or `openspec/changes/<name>/proposal.md` — markdown, but not in the allowlist
- **THEN** the normal branch + PR flow applies in full

### Requirement: CI is optional, not required

The WongStack doctrine SHALL treat GitHub Actions (and CI generally) as an optional accelerator that is honored when present and never required. Doctrine text across the payload — `CLAUDE.md`, `README.md`, `wiki/development/the-change-loop.md`, and the `save`, `ship`, and `wong-setup` skills — MUST NOT assert CI as the sole or required gate. The system's durable pillars SHALL be described as: pull requests, version control, OpenSpec, and everything-lives-in-the-repo.

Where that doctrine text states the scope of the direct-to-default-branch carve-out, it SHALL state the prose allowlist (`notes/**` + `wiki/**`) rather than `notes/*.md` alone, and SHALL NOT assert that wiki edits require a pull request.

#### Scenario: Payload prose describes CI as optional

- **WHEN** a reader reviews the delivery doctrine in `CLAUDE.md`, `README.md`, or the `save`/`ship` skills
- **THEN** the text states CI is honored when present but not required, and names PR review as the gate when CI is absent
- **AND** no remaining sentence asserts "CI is the only gate" or "GitHub Actions is the build gate"

#### Scenario: Doctrine states the widened carve-out consistently

- **WHEN** a reader reviews `CLAUDE.md`, `notes/README.md`, `wiki/development/the-change-loop.md`, and the `save` and `dream` skills
- **THEN** every statement of the carve-out names `notes/**` + `wiki/**`
- **AND** no remaining sentence says wiki edits take the normal branch + PR route

<!-- end specs/delivery-gate/spec.md -->
<!-- file specs/session-notes/spec.md utf8 4273 -->
## RENAMED Requirements

- FROM: `### Requirement: A notes-only save commits directly to the default branch`
- TO: `### Requirement: A prose-only save commits directly to the default branch`

## MODIFIED Requirements

### Requirement: A prose-only save commits directly to the default branch

When a `/save`'s entire diff falls inside the **prose allowlist** — the path prefixes `notes/**` and `wiki/**` — `/save` SHALL commit and push directly to the default branch: no feature branch, no PR, no CI wait, and no `/ship` needed. The carve-out SHALL be decided by exact path scope; any changed path outside the allowlist restores the normal branch + PR flow for the whole save. `/save` SHALL NOT route on file extension, and SHALL NOT make a judgment call about whether a prose edit is consequential enough to warrant a PR. `/save` SHALL NOT merge a pull request under any circumstance, and no scheduled job or other skill SHALL merge on its behalf.

If the direct push is rejected (protected default branch, required reviews, non-fast-forward), `/save` SHALL NOT force or retry; it SHALL fall back to the normal branch + PR flow and say why.

#### Scenario: Conversation-only session lands in one command

- **WHEN** `/save` runs after a session whose only output is `notes/billing-tenancy.md`
- **THEN** the note is committed and pushed to the default branch
- **AND** no branch is created, no PR is opened, and the user is not asked to run `/ship`

#### Scenario: A dream session lands in one command

- **WHEN** `/save` runs after `/dream`, and the diff is wiki pages plus the `consolidated:` frontmatter stamps in `notes/`
- **THEN** every path is in the allowlist, so the whole diff is committed and pushed to the default branch
- **AND** no branch is created, no PR is opened, and the user is not asked to run `/ship`

#### Scenario: Mixed session keeps the gate

- **WHEN** a save's diff contains prose plus a source, skill, spec, or config file
- **THEN** the prose rides along on the change's feature branch and goes through the PR flow with it

#### Scenario: Markdown outside the allowlist keeps the gate

- **WHEN** a save's diff touches `.claude/skills/**/*.md`, `CLAUDE.md`, `README.md`, `CHANGELOG.md`, or `openspec/**`
- **THEN** the normal branch + PR flow applies, because routing is by path prefix and not by extension

#### Scenario: Prose-only save reports without a PR link

- **WHEN** a prose-only save completes
- **THEN** the report names the changed prose paths and states they landed on the default branch
- **AND** it omits the PR, CI, and preview sections rather than reporting them as missing

#### Scenario: Protected default branch falls back

- **WHEN** a prose-only save's direct push to the default branch is rejected
- **THEN** `/save` cuts a branch, opens a PR whose body is the prose change, and states that the default branch is protected
- **AND** it never force-pushes

### Requirement: `/dream` consolidates from the repo only

`/dream`'s capture phase SHALL read unconsolidated notes from the repo's `notes/` directory and SHALL NOT read the current conversation, scrollback, or machine-local transcript files. After consolidating a note's qualifying facts into `wiki/`, it SHALL record the `consolidated:` date in that note's frontmatter.

`/dream` SHALL run no git itself — its edits stay in the working tree for `/save` to commit. Its stated reason SHALL be the division of labour (the git skills own git), NOT a claim that wiki edits need a pull request; under the prose allowlist a wiki-only `/save` lands on the default branch.

#### Scenario: Consolidating on a different machine

- **WHEN** a session is captured on machine A, pushed, and `/dream` is run on machine B after pulling
- **THEN** `/dream` consolidates that session's facts from `notes/`, with no access to machine A's transcript

#### Scenario: A consumed note is marked

- **WHEN** `/dream` finishes consolidating a note
- **THEN** that note's frontmatter carries a `consolidated:` date

#### Scenario: `/dream` does not claim wiki edits need a PR

- **WHEN** the `/dream` skill's no-git rule is read
- **THEN** it states that `/save` commits and `/ship` merges
- **AND** it contains no claim that a wiki edit is gated behind a branch and pull request

<!-- end specs/session-notes/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-07-30

~~~
<!-- end .openspec.yaml -->
