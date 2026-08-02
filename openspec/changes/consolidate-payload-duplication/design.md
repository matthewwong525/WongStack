## Context

The payload is prose, and prose has no compiler. The only thing keeping two statements of one rule in agreement is that someone remembers to edit both — and the repo has a written record of that failing: the archived `widen-save-prose-fast-path` decision log says its five-site audit under-counted and missed a sixth stale site, after `grep -r` silently declined to follow the `.claude`→`.agents` symlink.

Measured duplication as of v8.4.0:

| Duplicate | Size | Drifted? |
|---|---|---|
| `.claude/commands/opsx/*.md` vs `.claude/skills/openspec-*/SKILL.md` | 741 vs 745 ln | **yes — live bug** |
| `/save` + `/ship` git runbook | ~60 ln × 2 | subtly (cap-of-3 in 3 places) |
| Prose allowlist doctrine | 11 statements / 7 files | not yet |
| `/wong-sync` verdicts (JSON ledger + markdown record) | 2 stores | rule says only half is authoritative |

The `/opsx:apply` drift is the one already costing something. `.claude/commands/opsx/apply.md` ends its completion path with *"congratulate, suggest archive"* and its blocked path with *"suggest using `/opsx:continue`"* — a command that does not exist. The skill at `.claude/skills/openspec-apply-change/SKILL.md` says *"invoke the `save` skill immediately."* So the raw command silently skips the handoff `openspec/specs/apply-completion-handoff/spec.md` requires. Nobody wrote that divergence deliberately; one copy got the v6 edit and the other didn't.

The constraint that shapes everything here: **the vendored OpenSpec layer stays in the repo.** The user's call — no reliance on `openspec init` regenerating anything. Deleting the command files is off the table; the question is only what's *in* them.

## Goals / Non-Goals

**Goals:**
- One owning file per payload fact; every other surface links.
- Make the `/opsx:*` drift structurally impossible rather than re-synced by hand.
- Restore the `references/` extraction convention that `/ship` broke in v8.4.0.
- Collapse `/wong-sync`'s two verdict stores to one, retiring the split-authority rule.
- Leave a durable rule (`payload-single-source`) so the pattern doesn't regrow with the next feature.

**Non-Goals:**
- Deleting or regenerating the vendored OpenSpec layer.
- Any user-visible behavior change except fixing `/opsx:apply`.
- The CI `paths-ignore` fix and the `/save`→`/ship` double-CI-wait — real, separate, and behavioral; this change is prose-only so it can ride the branch-and-PR gate on its own merits.
- Touching `app/`, `scripts/`, or `openspec/changes/archive/`.

## Decisions

### 1. Command files become pointers, not deletions

Each `.claude/commands/opsx/<verb>.md` keeps its frontmatter (`name`, `description`, `category`, `tags` — that's what renders in the command list) and replaces its body with one line:

```markdown
---
name: "OPSX: Apply"
description: Implement tasks from an OpenSpec change (Experimental)
category: Workflow
tags: [workflow, artifacts, experimental]
---

Invoke the `openspec-apply-change` skill (via the Skill tool) and follow it verbatim — that skill owns this command's behavior.
```

**Why this and not the reverse** (skills pointing at commands): skills are what the WongStack verbs already invoke — `/plan`→`openspec-propose`, `/apply`→`openspec-apply-change`. Making the skill canonical means the two entry points converge on the file that was already load-bearing, and the pattern matches what `explore/SKILL.md` does today, so there's nothing new to learn.

**Why not a symlink:** `.claude/skills/*/SKILL.md` symlinks already exist in this repo and are exactly what made `grep -r` under-count during `widen-save-prose-fast-path`. A one-line pointer is greppable, readable in a diff, and survives being copied by a tool that doesn't preserve links.

**Alternative considered — keep both and add a CI check that diffs them.** Rejected: it institutionalizes the duplication and adds a gate to a repo that deliberately has almost none. Removing the second copy is cheaper than policing it.

`explore` and `archive` are the two whose bodies genuinely differ (the command lacks the skill's 103 lines of entry-point examples; the skill lacks the command's 47 lines of output templates). Both extra sections are *keepable content* — they fold into the surviving skill file before the command body is replaced, so nothing written is thrown away.

### 2. `/ship` Step 4.5 → `ship/references/walkthrough.md`

The threshold the payload already applies elsewhere: a runbook that a skill *delegates to* rather than *is* goes in `references/`. `wong-sync/SKILL.md` keeps three sentences on the adapt step and hands the pipeline to `adapt.md`; `/ship` should keep the preflight call, the verdict table, and the merge consequences, and hand 4.5a–4.5f to the reference.

**What stays in SKILL.md** — the parts a reader of *the merge verb* needs: the `preflight` invocation, `RESULT: NONE` → silence, the five-verdict table, "never merge on UNKNOWN or TIMEOUT," and the three walkthrough Hard rules. **What moves** — scouting scenarios, writing journeys, the `run` call, grading against the `THEN`, failure recovery, evidence and cleanup.

The reference enters the payload manifest, which already covers `.claude/skills/<name>/` including `references/` — so no manifest category is new, only the file list in the doc.

### 3. One shared git-gate runbook

`.claude/skills/save/references/git-gate.md` holds what both skills do identically: `gh pr view` → open/update, the change-mirror PR body template, the `wait-for-checks.sh 20` call and its SUCCESS/NONE/UNKNOWN/TIMEOUT/FAILURE handling, and the read-fix-repush loop capped at 3.

**It lives under `save/`, not a new top-level shared directory.** `/save` is where the PR body originates and where `wait-for-checks.sh` and `preview-url.sh` already live — the payload manifest copies `.claude/skills/save/` whole, so a repo that has `/save` gets the runbook automatically, and `/ship` referencing across skill directories is already how it calls `save/scripts/wait-for-checks.sh` today.

**The one fork is documented in the runbook, not in the callers.** `UNKNOWN` means *proceed and report* in `/save` (it's a checkpoint; the branch isn't going anywhere) and *stop, do not merge* in `/ship` (unverified is not absent). One table with a per-caller column beats two prose restatements that can drift apart — and today `/ship`'s cap-of-3 is described three times because Step 4.5 shares Step 4's budget.

**Risk acknowledged:** this makes `/ship` depend on a file under `save/`. That's already true (`wait-for-checks.sh`), and the manifest ships the skills together, so there is no install shape where one arrives without the other.

### 4. Verdicts live in the markdown record; the manifest records install state

`.claude/wong-sync-verdicts.md` becomes the single store. `.claude/.wong-stack.json` drops `capabilities` and goes back to `version`, `commit`, `installedAt`, `updatedAt`, `upstream`, `components`.

**Why the markdown wins over the JSON:** it is the surface the user *acts on* — ticking a checkbox is the documented way to overrule a verdict — and it is committed, diffable, and reviewed in the PR like everything else. The JSON's only remaining unique contribution is `asOfCommit` on a `declined` entry, which the markdown can carry in the line itself (`` `capability-id` — reason _(declined against `a1b2c3d`)_ ``).

**What this retires:** v8.4.0 had to add a paragraph to `SKILL.md` *and* a section to `adapt.md` explaining that *"the ledger stores your decisions, plus a snapshot — only the first half is authoritative."* A rule that has to explain which half of a store counts is a rule about having two stores. Both paragraphs go, along with the lazy-migration note for the pre-split `declined`/`not-applicable` ambiguity — which the markdown record's per-line reason makes legible instead of guessable.

**Alternative considered — keep the JSON as the store and make the markdown a generated view.** Rejected: the markdown is *input* (ticked boxes), not just output, so a one-way generated view would need a read-back path anyway — which is precisely the two-store coupling being removed.

**Migration:** read `capabilities` from an existing manifest on the first run after upgrade, fold each entry into the verdict record, then write the manifest without the key. The manifest is already lazily migrated (`Requirement: Manifest schema, lazily migrated`), so this is the established path, not a new mechanism. An old manifest that still has `capabilities` after migration is harmless — nothing reads it.

### 5. Doctrine ownership: `the-change-loop.md` is canonical

Three sentences currently live in many places: the loop diagram, "CI is the gate when present, else PR review" (now with the walkthrough rung), and the prose allowlist.

| Fact | Owner | Everyone else |
|---|---|---|
| The loop + the gate ladder | `wiki/development/the-change-loop.md` | link |
| The prose allowlist (why + scope) | `wiki/development/the-change-loop.md` | link |
| The allowlist as an **operational test** | `save/SKILL.md` Step 1 | link |

The split on the allowlist is deliberate. `/save` genuinely needs the two path prefixes inline — an agent mid-runbook shouldn't have to open a wiki page to route a save. What it does *not* need is to restate them three more times, in the Step 2 table, the Step 5 prose variant, and Hard rules. Those become links to Step 1. That also kills the tiebreaker sentence Step 2 currently needs — *"when they seem to disagree, the paths win"* — which exists only because the rule is written twice in one file.

`AGENTS.md` keeps a one-line rule per doctrine plus a link. It is the always-loaded file; it should orient, not duplicate.

**`delivery-gate` must be amended first.** Its current requirement says doctrine text *across* `CLAUDE.md`, `README.md`, `the-change-loop.md`, and the `save`/`ship`/`wong-setup` skills MUST state the allowlist and MUST NOT assert CI as the sole gate — i.e. as written, it mandates the restatement this change removes. The delta rewrites it to require **one canonical statement plus conforming links**, with the scenarios checking that no surface *contradicts* the owner rather than that every surface *repeats* it.

### 6. The two stale-doc fixes ride along

`wiki/development/adding-a-skill.md` cites the retired `document` skill twice as the worked example, with two dead links. Replace with `dream` (has no `references/`) and `improve` (has `references/`), which is what the step is actually illustrating.

The `.claude`→`.agents` and `CLAUDE.md`→`AGENTS.md` symlink fact is recorded in three notes and one archived decision log, and nowhere canonical — despite having already silently no-op'd an implementation. It goes to a new `wiki/development/repo-layout.md`: what the symlinks are, that the Edit tool refuses to write through them, and that `grep -r` does not follow them, so audits must target `.agents/`. Linked from `wiki/development/README.md` and from `adding-a-skill.md` step 1.

## Risks / Trade-offs

- **A pointer command loses standalone readability** → someone reading `.claude/commands/opsx/apply.md` no longer sees the runbook. Mitigated by the pointer naming the exact file, and by this being the established pattern (`explore/SKILL.md` is 20 lines for the same reason). The behavior was never in the command anyway once the skill diverged — it was a stale copy of it.
- **Folding `explore`/`archive`'s unique sections could drop content** → the two files are diffed section-by-section before either is touched, and the fold is its own task, done and verified before the body is replaced.
- **The manifest migration runs in target repos we can't see** → the change is additive-then-subtractive on a file `/wong-sync` solely owns, and the skill already lazily migrates. Worst case a repo carries a dead `capabilities` key, which nothing reads.
- **Doctrine links can rot** → fewer links than the restatements they replace, and `/dream`'s reality-check already repairs dead links and anchors as a standing job.
- **This is a large single change** (~950 lines across ~20 payload files) → it is prose-only with no runtime surface, the six pieces are independent, and `tasks.md` groups by surface so a partial `/apply` still leaves the repo coherent. Splitting it would mean amending `delivery-gate` in one change and acting on it in another, with the payload contradicting its own spec in between.

## Migration Plan

1. Merge #43 first. Branch from `main` after it lands — this edits `/ship` Step 4.5 and the `/wong-sync` verdict record, both of which arrive with it.
2. Amend the `delivery-gate` delta spec before editing doctrine prose, so the payload never contradicts its own spec mid-change.
3. Fold, then point: `explore`/`archive` unique content moves into the surviving skill files before any command body is replaced.
4. Extract before deleting: write `git-gate.md` and `walkthrough.md` in full, then thin the callers.
5. Release last: `VERSION` minor bump + newest-first `CHANGELOG.md` entry, per the repo rule that a payload edit is a release.

Rollback is `git revert` — no state, no schema in a database, no deployed artifact. A target repo mid-migration has a manifest with a redundant key and a verdict record that already carries everything.

## Open Questions

- Should `README.md`'s "The workflow" section also reduce to a link, or does the front door earn its own telling for a reader who hasn't cloned yet? Leaning **keep it** — different audience, and it's the only surface a prospective user reads. Confirm during implementation.
