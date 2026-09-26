## Context

See [proposal.md](proposal.md) for why. The [review page](review.html#/removed) shows what is removed and [where each rule lands](review.html#/owners). The facts that shape the approach:

- `wong-sync/scripts/preflight.mjs:213-216` selects the `ui`, `pack`, and `scaffold` categories from the `components` flags. New installs already set all three to `true`.
- `save/scripts/checkpoint-evidence.mjs` emits a `legacy` object (same-name active and archive folders). Five verbs read it through a sentence copied four times.
- `plan/scripts/build-review.mjs:79-82` has a `legacy` branch for pages with `proposal:start` markers, and `save/scripts/sync-review-proposal.mjs` is its compatibility entry point.
- `memory/scripts/lib/digest.mjs:6-7` sets `MAX_LINES = 150` and `MAX_BYTES = 25 KB`. The cached digest in this repo is 25.3 KB.
- `scripts/measure-context.mjs` already reports the instruction-word total against a baseline. The `context-economy` spec requires a simplification to report a net reduction.

## Goals / Non-Goals

**Goals:**
- A net cut of at least 4,000 instruction words, measured by `measure-context.mjs`, with no loss of a rule. Every removed sentence is either legacy or has a live owner that a link reaches.
- Code and prose agree: when a legacy branch leaves the code, its prose and tests leave with it.

**Non-Goals:**
- No rewording for style alone. A section that is correct, single-owned, and short stays as it is.
- No change to `review-kit.html` or the review page layout.

## Decisions

### Cut by owner, not by length

For each duplicated rule, choose the owner by where a reader acts on it. The skill owns the steps and commands the agent runs. A `references/` file owns mechanics that only that skill needs. The wiki owns reasons and process that people read. Every other copy becomes one sentence and a link. *Alternative:* shorten each copy in place. Rejected: shorter copies still drift, and drift is the defect.

### Named rungs for change selection

`checkpoint-evidence.md` defines the rungs by name: `explicit`, `session`, `changed-active`, `recorded-branch`, `sole-active`, and `changed-archive`. Each verb lists the rungs it uses, in order. With the `legacy` rung gone, the helper stops emitting `legacy`, and its tests drop those cases.

### Flags go, the selection stays one code path

`preflight.mjs` always selects `core`, `ui`, `pack`, and `scaffold`. Setup stops writing `components.stackPack`, `components.appScaffold`, and `components.ui`. `components.skills` and `components.docsPath` stay, because they are a target's own choices. The preflight ignores an old flag rather than rejecting it. An unsupported repo then fails later, in planning, where a person reads it.

### The digest is ranked, then capped

`digest.mjs` ranks the facts: current-change threads, other threads, feedback, project, and reference, each newest first. It then cuts at 40 lines or 6 KB. The last line keeps the count and the search command. The Claude hook gets `"matcher": "startup|resume"`, like the Codex hook.

### The vendored browser skill is not auto-invoked

Add `disable-model-invocation: true` to `agent-browser/SKILL.md`, and record that edit in the vendored-file note, so an upstream refresh keeps it. `/verify` already names the skill.

### One CLI convention

Add `scripts/lib-cli.mjs` with `isMain` and `parseCli(spec)`. `parseCli` uses `parseArgs` with `strict: true`, prints usage for `--help` and exits 0, and exits 2 on a usage error. The seven scripts that copy `isMain` import it. The memory scripts keep their own copy in `lib/store.mjs`, because the memory skill ships alone and must not import from `scripts/`.

## Risks / Trade-offs

- [A cut removes a rule that only the cut text held] → Before each cut, grep for the rule's key terms and confirm the owner states it. The review page lists every owner, so a reviewer can check.
- [A 6 KB digest hides a fact that the agent needed] → Threads and the current change come first, and the last line names the search. The `/explore` and `/continue` memory searches do not change.
- [`disable-model-invocation` is not honored by Codex] → Codex does not list vendored descriptions the same way. If it does, shorten the description as the fallback in the Decision log.

## Migration Plan

None. Installs from before this release are not supported. The 19.0.0 changelog entry says so and gives the fix: set up again in an empty folder.
