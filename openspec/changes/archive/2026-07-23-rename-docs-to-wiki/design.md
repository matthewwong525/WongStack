## Context

Docs-only change, but a cross-cutting one: every payload surface names the wiki somewhere. Today
WongStack's own wiki sits at `docs/` while the skills, `CLAUDE.md`, and the convention pages all
speak in `wiki/` terms — the leftover half of `dream-replaces-document`, which shipped the
resolution rule (`wiki/`, falling back to `docs/`) and deferred the directory rename as
"the natural follow-up change, kept separate to keep this one review-sized."

The gap is not cosmetic. `CLAUDE.md` links `wiki/README.md` and `wiki/wiki-style.md`; `dream/SKILL.md`
links `../../../wiki/wiki-style.md`. All three are dead in this repo right now — the source repo's
own instructions point at files that don't exist. Meanwhile `openspec/config.yaml`'s project context
and design rule still say `docs/`, so every future change is drafted against the old name.

Two constraints shape the work. First, **installed targets must not notice**: the fallback is what
protects repos that kept `docs/`, and this change renames the source, not the rule. Second, the repo
has no build or test suite — the payload is prose, so verification is a grep and a link check, not a
green CI run.

## Goals / Non-Goals

**Goals:**

- WongStack's wiki lives at `wiki/`, with page history preserved through `git mv`.
- Every live intra-repo link to a moved page resolves.
- The generic wiki-root resolution rule survives untouched, and the payload manifest keeps syncing
  convention pages to each target's *resolved* root.
- Future changes are drafted against the new name (`openspec/config.yaml` updated).
- The release is legible to installed repos: VERSION + CHANGELOG say the source moved and that
  nothing is required of them.

**Non-Goals:**

- Narrowing the resolution rule to `wiki/` only, or deprecating `docs/` in targets.
- Rewriting CHANGELOG history or archived changes — they record what shipped at the paths that
  existed then.
- Any content edit to a wiki page beyond fixing paths. Voice, structure, and coverage stay as-is;
  that work belongs to `/dream` or `/improve docs`.
- Renaming the `/improve docs` variant or `references/docs-audit-playbook.md`. "docs" there names a
  subject (documentation), not a directory.
- Auto-migrating any target repo's `docs/` → `wiki/`. If a target wants the rename, its owner does
  it; the fallback means they never have to.

## Decisions

**1. `git mv docs wiki` as one move, not per-file copies.** A directory move keeps rename detection
intact so `git log --follow` reaches each page's earlier revisions and the PR diff reads as
renames-plus-small-edits rather than 8 deletions and 8 additions. *Alternative — copy then delete:*
rejected; it destroys the readable diff for no benefit.

**2. Path edits in a second commit, after the move.** Committing the pure rename first means the
reference repairs show up as a small, reviewable diff instead of being buried inside the rename
commit. Same PR, two commits.

**3. Keep the `wiki/`-then-`docs/` fallback everywhere it appears.** Every skill sentence of the
form "resolve the wiki root — `wiki/`, falling back to `docs/`" stays verbatim. These describe how a
skill behaves in *someone else's* repo; the source repo's own layout has no bearing on them. Only
sentences that name *WongStack's own* pages get rewritten. *Alternative — drop the fallback now that
the source is renamed:* rejected, it would silently break every repo installed before v4.4.0 and buy
nothing.

**4. Distinguish the three kinds of `docs/` mention** before editing, since a blind
find-and-replace would corrupt two of them:

| Kind | Example | Action |
| --- | --- | --- |
| WongStack's own page | `CLAUDE.md`'s `docs/wiki-style.md` | Rewrite to `wiki/` |
| A target's wiki root, generically | `improve/SKILL.md`'s "`wiki/` if it exists, else `docs/`" | Leave alone |
| Unrelated path or subject | `improve`'s `docs/adr/` glob; `/improve docs` | Leave alone |

**5. Minor version bump (6.0.1 → 6.1.0).** No target's behavior changes and nothing installed
breaks, so it isn't major; but the payload's own layout moved and the manifest prose changed, which
is more than a patch. *Alternative — patch:* understates a structural move contributors will see in
their next sync diff.

**6. Verification is a scoped grep, not a link-checker dependency.** `grep -rn "docs/"` excluding
`CHANGELOG.md` and `openspec/changes/archive/`, with every surviving hit explained against the table
in decision 4, plus an existence check on each relative link out of `plan/SKILL.md` and
`dream/SKILL.md`. Adding a link-checking tool to a prose repo with no toolchain is more machinery
than the problem warrants. *Alternative — add markdown-link-check in CI:* worth considering later as
its own change; out of scope here.

**7. Update the active `recommended-stack-guide` change in place.** Its proposal, design, tasks, and
spec name `docs/recommended-stack.md` and `docs/README.md`. Unimplemented, so editing it costs
nothing and prevents someone later creating `docs/` afresh. Archived changes are left alone by
contrast — they are history, not instructions. *Alternative — leave it and fix at apply time:*
rejected, it plants a trap for whoever picks the change up.

## Risks / Trade-offs

- **A stale link survives the grep** (e.g. an anchor-relative link inside a wiki page, or a `docs`
  mention with no trailing slash) → the acceptance check greps for bare `docs` word-boundary matches
  as well as `docs/`, and each hit is classified against the decision-4 table rather than skimmed.
- **A generic fallback sentence gets rewritten by accident**, silently breaking targets that kept
  `docs/` → no blanket find-and-replace; every edit is made by hand against the table, and the spec
  carries a scenario asserting the fallback still resolves for an un-renamed target.
- **A contributor's in-flight branch touches `docs/`** and conflicts on merge → git's rename
  detection resolves the common cases; the change is small and worth merging promptly rather than
  letting it sit.
- **Trade-off: churn for no functional gain.** Nothing works better after this lands. What it buys
  is that WongStack's own instructions stop pointing at files that don't exist, and that the toolkit
  practices the convention it ships — which is the whole basis for trusting the convention.
