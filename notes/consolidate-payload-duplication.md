---
slug: consolidate-payload-duplication
started: 2026-08-02
updated: 2026-08-02
consolidated:
---

# Consolidating payload duplication

Session ran `/explore` → full-repo audit → `/plan` → `/apply`. The change itself covers what was done
and why it's shaped that way; this note holds the audit that produced it, the findings deliberately
**not** acted on, and the measurement technique.

## What the user asked for and constrained

- **"Map up the entire process… find components we can consolidate or make more efficient or to
  remove redundancy."** The ask was explicitly high-level and process-wide, not a single file.
- **Keep the vendored OpenSpec layer.** Stated directly: *"as for the openspec i want to keep it so
  we aren't reliant on the openspec init for now so just keep it in the repo."* This ruled out the
  audit's first-choice fix (delete `.claude/commands/opsx/`, let `openspec init` regenerate) and
  forced the pointer-file design instead. The constraint is about **not depending on a regeneration
  step**, not about the files being valuable — so the pointer form satisfies it fully.
- The review was requested **against PR #43 specifically** ("i'm about to merge #43"), which is why
  the change is scoped to land right after it.

## Findings surfaced but NOT in this change

These came out of the audit and are real; they were scoped out because they're behavioral, not prose.
Anyone picking this up next should start here:

1. **The archive commit buys a whole CI cycle.** `.github/workflows/deploy.yml` is `on: push` with
   no path filter, so `/ship` Step 2's `chore(openspec): archive` commit — which moves a folder and
   touches nothing else — triggers a full build + staging deploy, and Step 4 then *waits* on it.
   Fix is one line (`paths-ignore` for `openspec/**`, `notes/**`, `wiki/**`) or a `/ship` check that
   skips the re-wait when nothing outside those prefixes changed since the last green.
   **Open question the user has to settle:** doing this means the archive commit lands without a
   green check of its own. That's consistent with the prose-allowlist doctrine (the gate exists to
   stop unreviewed *behavior*), but extending the doctrine is the user's call, not an implementation
   detail.
2. **`/apply` → `/save` → `/ship` waits for CI twice back-to-back.** The auto-save handoff pushes and
   waits (minutes), then `/ship` immediately pushes and waits again on a tree that differs only by
   the archive move. Worth asking whether `/ship` should recognise "HEAD is already green."
3. **The archived delta spec is a byte-copy of the live spec.** Verified by diff:
   `openspec/changes/archive/2026-08-02-ship-staging-tests/specs/ship-walkthrough/spec.md` (200 ln)
   vs `openspec/specs/ship-walkthrough/spec.md` (206 ln) differ **only by a 7-line header**. Across
   all archives that's 2,913 lines duplicating the 1,902-line live set, and `openspec/` is now
   159 files / 8,302 lines — about twice the payload it describes. This is OpenSpec's own shape, so
   it's a "do you care" question rather than a defect. Not raised with the user yet.
4. **`openspec/specs/` contains specs about prose.** `delivery-gate` had requirements whose subject
   was *what other markdown files must say*, verified by nobody. This change rewrote that one
   requirement (it directly forbade the consolidation), but the broader question — what
   `openspec/specs/` is *for* in a repo whose config says "the payload is prose" — is unresolved.
   `delivery-gate`'s Purpose is still literally `TBD - created by archiving change optional-ci-gate.`

## How the duplication was measured

Useful if this needs redoing. Diff each command body against its skill counterpart with frontmatter
stripped, then look only at lines the *command* has:

```bash
awk 'BEGIN{n=0} /^---$/{n++; next} n>=2' FILE     # strip YAML frontmatter
diff /tmp/cmd.md /tmp/skl.md | grep '^<'          # command-only content
```

That's what separated genuine content (three output templates in `archive.md`, folded into the skill)
from stale content (`apply.md`'s "suggest archive", which *was* the bug) — the two look identical in
a line count and are opposite in what you do with them.

For "how many places state this rule," `grep -rl` on a distinctive fragment (`notes/**`, `**Cap: 3`,
`ladder is CI`) and then judge each hit as owner / operational-use / summarizing-line / defect.

## Threads left open

- `README.md`'s "What you get" table and "Layout" tree still name skills by hand — one more surface
  `adding-a-skill.md` requires wiring, derivable from the payload manifest in principle.
- `/wong-sync`'s payload manifest lists `references/` files by name now (task 7.1). That list is
  itself a thing that can drift from the directory; nobody checks it.
- The `.claude`→`.agents` symlink page (`wiki/development/repo-layout.md`) is new. Worth checking
  whether `/wong-sync` copying `.claude/skills/<name>/` into a target produces a real directory
  there or inherits anything odd — raised during `/explore`, never answered.
