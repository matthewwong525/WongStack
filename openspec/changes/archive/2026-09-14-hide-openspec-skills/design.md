## Context

See [proposal.md](proposal.md) — Why. The constraints that shape the approach:

- **The six files are generated, not authored.** `openspec init` and `openspec update` rewrite `.claude/skills/openspec-*/SKILL.md` from CLI 1.8.0 templates. Any edit is discarded on the next run, so the patch must be re-applied rather than maintained.
- **The fronting verbs invoke them through the Skill tool.** `/explore`→`openspec-explore`, `/plan`→`openspec-propose`, `/apply`→`openspec-apply-change`, `/ship`→`openspec-archive-change`. Whatever hides them must not break that.
- **`.claude/settings.json` is not payload.** The [manifest](../../../.claude/skills/wong-sync/references/payload-manifest.md) excludes it, which is what rules a hook out of a payload-reaching solution.
- **The payload is prose with no test suite.** Verification is by probe and by reading, not by a runner.
- **Frontmatter shape is fixed and simple**: a leading `---`, flat `key: value` lines, a nested `metadata:` block, a closing `---`.

## Goals / Non-Goals

**Goals:**

- One idempotent script owns the patch; the three regenerating skills call it and report the result.
- Discovery by glob, so a CLI release that adds or renames a generated skill needs no script edit.
- The edit is provably minimal — one inserted line, description and body untouched.

**Non-Goals:**

- Detecting drift. No `--check` mode, no CI job, no hook. Regeneration outside a WongStack skill leaves the menu visible until the next skill run, and that is accepted.
- Hiding any WongStack verb, or touching `agent-browser` (already `hidden: true` upstream).
- Changing what the generated skills do.

## Decisions

**`user-invocable: false`, not `disable-model-invocation: true`.** The second is the obvious-looking lever and it is wrong: a spike recorded in [`notes/extract-walk-skill.md`](../../../notes/extract-walk-skill.md) proved it blocks the Skill tool itself — `Skill spike-flagged cannot be used with Skill tool due to disable-model-invocation` — which would sever all four handoffs. `user-invocable: false` is documented as the opposite lever: hides from the `/` menu, keeps model invocation. **It has not been probed here**, so task 1 probes it before anything else is built.

**Not `hidden: true`.** `agent-browser` ships it, and that skill still appears in the agent's own skill listing, so `hidden` governs something other than model visibility. Its exact semantics are undocumented in this repo. `user-invocable` is the documented name for the behavior wanted, so prefer the lever whose contract is written down. If task 1 shows `user-invocable: false` also blocks the Skill tool, `hidden: true` is the fallback to probe next — and if both fail, the change is void and stops there.

**A bash script, not a node one.** The precedent for a payload skill shipping scripts is [`save/scripts/`](../../../.claude/skills/save/scripts/), both bash. The work is line-oriented text editing over six small files — no dependency, no parsing library, nothing node buys here.

**It lives in `wong-sync/scripts/`, not a new top-level directory.** `/wong-sync` is the skill most associated with keeping a target's payload current, and the manifest already ships whole skill directories including their `scripts/`. A shared `.claude/scripts/` would be a new payload category for one file. The cost is that `/wong-setup` and `/update-dependencies` call a script under another skill's directory — acceptable, and already how `/verify` uses `save/scripts/preview-url.sh`.

**Insert the key rather than rewrite the frontmatter.** The script finds the opening `---`, scans to the closing `---`, and inserts `user-invocable: false` **immediately after the opening fence**, only when no `user-invocable:` key is already in that block. This makes idempotency a property of the algorithm, keeps every other byte identical, and avoids round-tripping YAML through a parser that would reformat `metadata:` or requote strings.

Insertion at the *top* of the block, not the bottom: CLI 1.8.0 frontmatter ends with a nested `metadata:` block, so a key appended before the closing fence sits at column 0 directly under indented children. That parses correctly — column 0 closes the nested block — but it reads as though it belongs to `metadata:`, and the next person to touch it has to re-derive that it doesn't. The top of the block is unambiguous, and it is just as independent of key order.

**Glob both `.claude/skills/` and `.agents/skills/`, then dedupe by real path.** In this repo `.claude` is a symlink to `.agents`, and `.openspec-target` says the CLI generates into `.agents/`. A target may have either layout, or both-as-one like here. Globbing one path would miss a repo using the other; globbing both without deduping would patch the same file twice and miscount the summary. Resolving each hit to its real path and skipping duplicates covers every layout with no configuration.

**`/wong-sync` proposes the run; it does not perform it.** Wiring the script into the sync the way the other two callers take it would break the skill's central guarantee — it writes no payload file and opens no PR, so that a user reviews the gap before anything changes. A script run is a write. So the sync adds *running the script* as a task in the change it proposes, and `/apply` performs it on the ordinary path. The one exception is the fresh-install path (a seed manifest, where every payload file is absent and the sync does copy): there is no plan to carry a task there, so the script runs inline with the copy. This was found while wiring the caller, not while planning it.

**Report, don't just act.** Each caller prints `patched N, already-hidden M`, so a regeneration that silently produced zero generated skills is visible rather than a no-op that reads like success.

## Risks / Trade-offs

- **`user-invocable: false` might also block the Skill tool** → task 1 probes it with a flagged/control pair before any other work. The control proves hot-reload worked, so a failure is attributable to the flag. If it blocks, probe `hidden: true`; if that also blocks, stop and report — the change cannot be built.
- **A future CLI emits frontmatter this script cannot parse** (no `---` fence, or a different format) → the script exits non-zero and names the file rather than writing a corrupted SKILL.md. A loud failure during a regeneration pass is recoverable; a mangled skill is not.
- **A user runs `openspec update` by hand and the six reappear** → accepted by decision, not mitigated. The symptom is self-evident in the `/` menu and the fix is one script run.
- **The menu hides a skill a power user genuinely wanted** → they can still reach every OpenSpec step through its fronting verb, which is strictly more capable. No capability is removed, only a worse door.
- **Three callers can drift apart** → the script owns the behavior and each caller owns one line invoking it, so drift is limited to a caller forgetting the line. The spec's third requirement names all three, which is what a reviewer checks against.

## Migration Plan

Existing targets pick the patch up on their next `/wong-sync`, which proposes the new script as an ordinary payload addition and then runs it. No migration step is needed in a target, and nothing breaks if a target never syncs — it simply keeps the six visible, exactly as today.

Rollback is deleting the script and the three call sites; the next `openspec update` restores the generated skills to upstream state on its own, because the patch was never anything but an overlay.
