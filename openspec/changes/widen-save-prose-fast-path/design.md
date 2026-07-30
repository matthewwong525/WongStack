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
