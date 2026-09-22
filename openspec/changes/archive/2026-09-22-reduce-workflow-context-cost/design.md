## Context

See proposal.md for scope and decisions. The baseline is commit `dec731db66df3667dd0ab28c80c2c0af8435f7ae`. Seven core skill files contain 13,864 whitespace-separated words; save and ship contain 7,255. These counts exclude references and are orientation only. The measurement task must count the full declared inventory on both revisions.

Existing code already lists changed OpenSpec folders, waits for CI, discovers previews, and builds review pages. Extend these boundaries instead of adding a workflow engine. The current plan skill still requires reading the fixed kit; this planning run follows that rule until implementation changes it.

## Goals / Non-Goals

Reduce required source reading and repeated formatting. Preserve explicit selection, uncertainty, all special routes, and existing command entry points. The model still writes summaries, notes, decisions, and semantic spec changes. No checkpoint cache or Git mutation helper is introduced.

## Decisions

### 1. Conditional save references

Keep authorization, secret-value exclusion, route conditions, operation order, selection precedence, and final gate handling in save/SKILL.md. Extract full named-secret persistence, prose-only handling, fallback artifact creation, and archived maintenance into small owned references. The normal active-change procedure remains readable without them. Conditions compose: a save with named secrets and an archive loads both references. Preserve the mandatory final secret exclusion check on every route, even when no new secret was supplied.

Keep session capture guidance in notes/README.md and refer to it when capture is needed instead of copying its keep/drop list. Preserve append-only decision history and the rule to skip redundant notes. Shorten repeated rationale in ship only where the gate and task guards remain explicit. Do not move required instructions into comments that the agent never reads.

Alternative: shorten all paragraphs in place. That leaves every rare route loaded on every save and makes omissions harder to detect.

### 2. Structured local evidence, not automatic intent selection

Extend the existing change-candidates entry point with an optional JSON mode backed by a dependency-free Node helper. Preserve legacy active/archive line output and its optional ref argument. JSON reports branch, resolved comparison base, dirty path records, active/archive candidates, recorded-branch matches, legacy matches, and explicit diagnostics. Accept the selected repo/planning root and comparison base from the caller; the default remains the existing repo-local layout. Worktree records include staged, unstaged, untracked, rename source and destination paths. A remote-ref query uses that tree and excludes unrelated local dirt.

Use argument arrays and NUL-delimited Git output. The helper reads local metadata and files only; it does not fetch, switch, stage, commit, contact GitHub, read environment files, or print source text. Missing refs, unreadable roots, and failed Git commands are errors, not empty successful candidate lists. Return complete candidate sets so ambiguity cannot disappear through truncation. If output must be bounded, return a named error rather than a partial selection. Include counts and paths, not diffs.

The skills retain their own selection policies: explicit/session intent wins, apply does not replace new work with an unrelated lone change, ship rejects multiple active folders, and continue resolves a remote branch independently. Use the JSON once per unchanged local state; refresh after edits or checkout. This is same-turn reuse of observations, not a persisted cache.

Alternative: put all selection policy into a script. Rejected because conversation intent is not a deterministic input and the verbs deliberately differ.

### 3. Deterministic PR-body assembly

Add a pure renderer in save/scripts. Input is a selected change root, active/archive mode, repo URL, branch, optional discovered preview URL, and a short agent-authored summary supplied through a file. Read Status and tasks from that selected root. Write the body to a caller-specified file for gh's body-file input; do not publish it or echo the complete body by default. Preserve the task checklist, optional review/preview sections, archive-aware links, and resume footer only for active changes. Encode URL path components, preserve Markdown and newlines, and reject absent required inputs without replacing an existing output file.

The summary file is ephemeral; do not add another maintained summary to the repo. The agent remains responsible for its meaning and credential exclusion. Fixtures use synthetic values only. Existing gate policy remains in git-gate.md; only body assembly moves to code.

Alternative: copy Why and What Changes verbatim into every PR. Rejected because the current runbook calls for a concise summary and long plans would increase output.

### 4. Review author input boundary

Update plan/SKILL.md and the author guide so routine authors read the guide plus the closest visual examples. The kit is read by build-review.mjs. An author may inspect a specific kit section only if the guide and examples cannot answer a concrete question. Preserve the design and critic agents, structural browser checker, phone and desktop inspection, and one revision round. The guide must document every required class or attribute used by the examples. No viewer behavior changes or historical regeneration.

### 5. Measurement and behavior evidence

Use scripts/measure-context.mjs and scripts/fixtures/context-baseline.json. The fixture records per-file counts read from the fixed baseline revision, so shallow CI checkouts can compare current files without switching branches or fetching history. Inventory the seven core SKILL.md files and their Markdown procedure references; include new references and count each canonical file once, resolving the .claude/.agents alias. Keep shared owner documents used by those routes in the inventory and report their separate subtotal. List all paths and bytes/words. Report kit/example HTML bytes separately. Scripts are reported separately and counted as reading only where a route instructs an agent to read their source.

Declare route fixtures for normal active save, named-secret save, prose save, new-plan fallback, archived save, cold continue, and routine visual authoring. Each names its required files before and after. Counts are an explicit source-load model, not traced runtime use. Require a lower aggregate instruction inventory and lower normal-save and review-author loads. Report every special route; none may increase without a documented reason and no behavior may be removed to pass a budget. Do not count generated pages or archives as routine instructions. Verify that new references are not omitted from the inventory.

Behavior fixtures cover evidence selection and errors, renderer active/archive variants, exact checklist preservation, omitted optional links, unusual paths, and unchanged outputs. A route contract audit maps every extracted obligation to a surviving owner and entry condition, including secrets, prose routing, incomplete tasks, ambiguous changes, UNKNOWN versus NONE, retry limits, and archive handling. Existing CLI, review, and candidate fixtures continue in CI. No live workflow replay or token telemetry is required for completion.

## Risks / Trade-offs

### Completed obligation audit

| Preserved obligation | Implemented owner and entry condition |
|---|---|
| Named-secret primary-worktree storage, ignore proof, narrow replacement, duplicate-file handling | save/references/named-secrets.md; explicit named secret supplied or rotated |
| Exclude every encountered credential value from durable records and output | save main procedure; every route before commit or publication |
| Exact notes/wiki allowlist, mixed-diff routing, protected-push fallback | save main condition plus references/prose-save.md; prose route only |
| Explicit/session selection, branch differs from change, ambiguity | owning verb plus structured evidence; each resolution |
| Latest plan, append-only log, current Status/Branch/tasks, cold-resume context | save main maintenance and notes/README.md; normal save and meaningful capture |
| Missing-plan CLI dependency closure and required HTML review | save/references/new-plan.md; new plan fallback only |
| Archive maintenance, no active recreation or repeated delta sync | save/references/archived-save.md; selected archive only |
| Stale current review reporting and legacy refresh behavior | save main builder step; handoff refresh |
| Path-specific staging, no forced push, no bypass, no merge in save | save main commit procedure; normal route |
| PR state handling, summary judgment, exact checklist and optional links | save/references/git-gate.md plus renderer; normal PR route |
| CI retry cap and UNKNOWN/TIMEOUT versus NONE | save/references/git-gate.md and ship; every delegated gate result |
| Incomplete tasks, distinct implementation/archive saves, verify verdict policy, worktree-safe merge | apply/ship/verify existing guards; unchanged |
| Rendered meaning, structural checks, phone states, revision round | plan and review-author; every new review |

- Conditional references could hide a required check → retain an explicit condition table and audit every extracted obligation against fixtures.
- A compact helper could hide ambiguity → complete candidate arrays, explicit failures, and remote/local distinction tests.
- A renderer could drift from human summaries → keep summary authorship with the agent; automate only stable sections.
- Source reduction could fail to reduce runtime tokens → label the metric precisely; make no runtime claim without comparable traces.
- New scripts add maintenance → use Node built-ins, keep old entry points, and test both alias paths.

## Migration Plan

Ship helper code and instructions together through the existing payload manifest. Preserve old helper arguments and existing review artifacts. Update VERSION and CHANGELOG in implementation. Run payload link/config checks and existing plus new regression coverage through CI using /save. Rollback reverts helper call sites and their shipped files together; no data migration is required. Wiki changes are limited to an affected owner if the implementation reveals a necessary correction; no general rewrite is planned.


## Implementation evidence

The obligation table above was checked against the revised main skill and references. The main procedure retains credential exclusion on every route and the gate result distinction. The conditional references retain primary-worktree secret handling, exact prose routing with rejected-push fallback, required new-plan artifacts and review, and archive maintenance. Apply, ship, and verify retain their task guards, checkpoint counts, retry limits, and merge behavior. The helper contract centralizes field/root guidance; no policy moved into code.

The payload manifest already copies each core skill directory with all references and scripts. The new files therefore ship in every core install shape; no duplicate file list was added. Link and OpenSpec-config checks pass. No installed simplify skill was found in the available skill roots, so the code received a direct simplification review before save; no separate skill completion is claimed. Actual regression execution remains CI-owned.

The fixed report is [measurements.json](measurements.json). Core source: 18,140 → 16,021 words (11.7% reduction). Ordinary save: 9,130 → 5,766 words (36.8% reduction). Shared author input: 55,807 → 12,511 bytes (77.6% reduction). Cold orientation: 6,432 → 6,624 words; its 192-word increase documents structured evidence and selected-root handling. All other declared routes decrease. Shared owner and HTML totals remain unchanged. The new executable helper source is counted separately.
