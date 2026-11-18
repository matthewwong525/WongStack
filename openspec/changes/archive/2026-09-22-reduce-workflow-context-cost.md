<!-- openspec-archive v1 2026-09-22-reduce-workflow-context-cost -->
<!-- file proposal.md utf8 6340 -->
# Reduce workflow context cost

**Status:** ready-to-ship
**Branch:** explore/token-efficiency
**Open questions:** none

## Why

WongStack spends agent context on procedures that do not apply to the current task and on repeated mechanical work. Reduce that required reading and automate checkpoint evidence and formatting while preserving workflow outcomes, review quality, and delivery checks.

## What Changes

- Make `/save` a short main procedure with explicit conditions for loading named-secret handling, prose-only saves, new-plan fallback, and archived handoffs. Keep every required check reachable on its route. (review.html#/save-routes/after/conditions)
- Extend checkpoint helpers to return compact, structured branch and change evidence. Keep intent selection and ambiguous choices with the agent, and preserve each verb's selection rules. (review.html#/checkpoint-evidence/default/structured)
- Generate the PR body's mechanical sections from the selected change and explicit metadata. Keep summary judgment with the agent and preserve tasks, review and preview links, and active or archived handoff text. (review.html#/pr-body/default/renderer)
- Make routine review authors read the author guide and relevant examples instead of the fixed viewer implementation. Keep the standalone page, builder, structural checks, rendered critique, and revision round. (review.html#/author-inputs/default/focused)
- Add repeatable instruction-load measurements and behavior regression coverage. Require lower source and route reading totals, preserve special-case handling, and report runtime token use only when measured. (review.html#/measurement/default/evidence)

**Non-goals:** Reuse or remove checkpoints; change public verbs, review requirements, CI gates, retry budgets, or merge policy; replace OpenSpec; automate semantic spec reconciliation or session-note judgment; add a workflow engine or runtime cache; change Cloudflare, the browser vendor skill, historical records, or application behavior.

## Capabilities

### New Capabilities

- `checkpoint-helpers`: Read-only structured checkpoint evidence and deterministic PR-body assembly with explicit error handling.

### Modified Capabilities

- `context-economy`: Conditional procedure loading, focused review-author inputs, and repeatable source and route measurements with preserved behavior.

## Impact

Primary surfaces are `.agents/skills/save/`, `.agents/skills/plan/`, and narrow helper call-site changes in apply, continue, ship, and verify. Helpers ship through the existing payload inventory; regression fixtures and the instruction measurement tool remain meta-repo tools under `scripts/`. Update affected owner instructions and payload manifests only where necessary. A payload version bump and changelog entry accompany implementation. No new runtime dependency is expected. Existing changes, notes, archives, reviews, and helper entry points remain usable.

## Decision log

- **2026-09-22** — Asked which token cost to prioritize → chose the full workflow, including repeated reads, generated records, and tool output.
- **2026-09-22** — Asked whether scripts belong in scope → chose documentation and scripts, retaining model judgment for work that needs it.
- **2026-09-22** — Asked what this first plan should include → chose instruction loading and helpers; checkpoint reuse is deferred until its validity rules can be tested.
- **2026-09-22** — Asked what evidence completion requires → chose behavior and instruction-load checks; comparable runtime agent runs are optional, and source counts cannot be called token savings.
- **2026-09-22** — Assumed existing public verbs, records, required HTML reviews, human decisions, checkpoint count, and delivery behavior remain compatible because the request requires the same efficacy.
- **2026-09-22** — Assumed dependency-free helpers within the current skills and meta-only measurement tooling; this replaces repeatable work without introducing another workflow layer.
- **2026-09-22** — The bounded explore exit round is complete. Remaining implementation details use supported assumptions recorded in the design.
- **2026-09-22** — The user requested `/ship` after planning, authorizing implementation and delivery after this review. The browser checker passed all five visuals; all six states render at 1440×1000 and 390×844 without page overflow, and offline reload works. The critic checked rendered meaning, Details, joins, and draft close/reopen/save; the revision clarifies that the shared save caption describes the proposed behavior.

- **2026-09-22** — Implementation checkpoint: version 16.3.0 preserves the route audit and adds helper/renderer fixtures plus repeatable source accounting. Core instructions are 18,140 → 16,021 words; normal-save input is 9,130 → 5,766 words; author input is 55,807 → 12,511 bytes. Cold orientation adds 192 words for the explicit evidence contract. Measurements are in measurements.json; runtime tokens were not measured. Payload link/config and strict plan checks pass. CI remains the final task.

- **2026-09-22** — Final code review found that a blank metadata header could consume the next paragraph. Branch and Status parsing now stays on one line, with regression fixtures. This preserves explicit missing-input errors.

- **2026-09-22** — CI passed for a823fa85de5fa81b9f32d4cda076b77a57a79b29 on PR #94: payload regression/release checks, application tests, and deployment. The final CI task is complete. Session-note capture is skipped because the proposal and audit contain the session decisions without a separate surrounding-context fact to preserve.

- **2026-09-22** — Ship archived the complete change after confirming all five delta requirement blocks already matched their main specs. This delegated archive checkpoint preserves version 16.3.0, the exact branch association, and the source-load report; no active change is recreated.

- **2026-09-22** — Archive refresh exposed an existing builder entry-point issue under the repo alias. The builder now compares canonical paths, with process fixtures for both entry paths and invalid input. This narrow correction is required for the documented save refresh to run; viewer behavior is unchanged. The corrected archive commit must pass CI before merge.

<!-- end proposal.md -->
<!-- file design.md utf8 12356 -->
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

Archive integration found that build-review.mjs compared an alias path with its canonical module path and silently skipped its CLI body. The entry-point comparison now resolves the alias, matching the new helper entry points. A process regression covers generation through both paths and invalid-input failure. This preserves the planned review refresh; it adds no viewer feature or dependency.

<!-- end design.md -->
<!-- file tasks.md utf8 2724 -->
## 1. Checkpoint evidence helper

- [x] 1.1 Extend the candidate helper with structured, read-only evidence and explicit root/base/ref handling; preserve existing line output. See review.html#/checkpoint-evidence/default/structured.
- [x] 1.2 Add fixtures for staged/unstaged/untracked paths, renames, multiple changes, branch-name differences, remote inspection, selected roots, invalid inputs, and no mutations. Exercise both alias paths. See review.html#/checkpoint-evidence/default/structured.

## 2. PR-body renderer

- [x] 2.1 Add deterministic body assembly from selected artifacts, an ephemeral agent-authored summary, and explicit link metadata; preserve output on errors. See review.html#/pr-body/default/renderer.
- [x] 2.2 Add active/archive, optional-link, encoded-path, exact-checklist, unchanged-output, and invalid-input regression fixtures. See review.html#/pr-body/default/renderer.

## 3. Skill procedures and review inputs

- [x] 3.1 Extract conditional save procedures, shorten the main runbook, and preserve every obligation in a route-to-owner audit. Keep credential exclusion and final gate handling unconditional. See review.html#/save-routes/after/conditions.
- [x] 3.2 Wire structured evidence and PR rendering into their owning skills without moving intent selection, Git ownership, or delivery policy. See review.html#/checkpoint-evidence/default/structured and review.html#/pr-body/default/renderer.
- [x] 3.3 Change routine review-author inputs to the guide and relevant examples; keep specific kit inspection available and preserve builder/checker/critic behavior. See review.html#/author-inputs/default/focused.

## 4. Measurement and release

- [x] 4.1 Add a meta-only inventory and measurement tool comparing the fixed baseline with current files; include extracted references, shared owners, all seven declared routes, and separate HTML/helper totals. Add fixtures for omissions, missing files, and deterministic counts. See review.html#/measurement/default/evidence.
- [x] 4.2 Record before/after source and route totals, a net reduction, ordinary-save and author-input reductions, special-route changes, and the completed obligation audit. State runtime measurement limits. See review.html#/measurement/default/evidence.
- [x] 4.3 Confirm the new references/helpers ship in the existing payload categories, update VERSION and CHANGELOG, and validate the OpenSpec change and payload link/config contracts.
- [x] 4.4 Review the implementation for unnecessary code, then use /save to run existing and new regression coverage through CI. Resolve failures before marking this task complete. This required checkpoint also covers apply completion when it represents the final unchanged state.

<!-- end tasks.md -->
<!-- file specs/checkpoint-helpers/spec.md utf8 3067 -->
## Purpose

Provide compact checkpoint evidence and stable pull-request records without transferring workflow judgment or delivery actions away from the owning skills.

## ADDED Requirements

### Requirement: Checkpoint evidence is complete and read-only

Checkpoint tooling SHALL report structured branch, comparison-base, changed-path, and change-candidate evidence for the selected root and ref. It SHALL preserve candidate ambiguity, distinguish local work from a remote tree, report failed inspection explicitly, and make no Git or remote-service mutation. Existing line-oriented candidate calls SHALL remain compatible.

#### Scenario: Local work carries several changes

- **WHEN** staged, unstaged, or untracked work and the branch diff identify several active changes
- **THEN** all candidates are reported with their source evidence
- **AND** tooling does not select one by branch name or silently truncate the set

#### Scenario: Remote inspection excludes local work

- **WHEN** the caller inspects a fetched remote ref
- **THEN** candidates and recorded-branch evidence come from that ref
- **AND** unrelated local work is excluded

#### Scenario: Inspection cannot complete

- **WHEN** a required root, ref, comparison base, or Git operation cannot be read
- **THEN** tooling returns an explicit error rather than a successful empty result
- **AND** repository files and refs remain unchanged

#### Scenario: Existing caller uses line output

- **WHEN** a caller uses the existing active or archive invocation with a valid ref
- **THEN** it receives the same sorted candidate-name format

### Requirement: PR body assembly preserves the selected handoff

Checkpoint tooling SHALL assemble a PR body from an agent-authored summary, selected change Status and task checklist, and explicit link metadata. It SHALL preserve checklist content and newlines, omit absent optional sections, encode link paths, and distinguish active and archived handoffs. It SHALL write only the requested output file and SHALL NOT publish the body. Invalid required inputs SHALL leave prior output intact and return an error.

#### Scenario: Active change has a review and preview

- **WHEN** the selected active change has a review file and a discovered preview URL
- **THEN** the body contains its current Status, supplied summary, exact task checklist, review and preview links, and its continue command

#### Scenario: Archived change has no preview

- **WHEN** the selected handoff is an archive and no preview was found
- **THEN** the body links the archive, omits the preview section, and offers no continue command

#### Scenario: Required input is missing

- **WHEN** the selected proposal, checklist, summary input, or required link metadata is invalid
- **THEN** rendering fails without replacing a previous body or publishing anything

#### Scenario: Input contains unusual path characters

- **WHEN** the branch or change path contains spaces or URL-significant characters
- **THEN** links address the intended files and input text is never executed as a command

<!-- end specs/checkpoint-helpers/spec.md -->
<!-- file specs/context-economy/spec.md utf8 3880 -->
## ADDED Requirements

### Requirement: Save loads conditional procedures only when applicable

The save skill SHALL expose a complete main procedure and explicit entry conditions for named-secret persistence, prose-only handling, new-plan fallback, and archived handoffs. Each applicable procedure SHALL be loaded before its actions. Unconditional credential exclusion, workflow ownership, and gate-result handling SHALL remain visible in the main procedure. Extracted procedures SHALL retain all required checks.

#### Scenario: Ordinary active change checkpoint

- **WHEN** save handles an existing active change without newly named secrets or prose-only routing
- **THEN** it can complete the checkpoint without loading the unrelated conditional procedures
- **AND** it retains record maintenance, credential exclusion, PR handling, and CI result reporting

#### Scenario: More than one condition applies

- **WHEN** an archived checkpoint also includes a newly named secret
- **THEN** it loads both applicable procedures
- **AND** preserves the secret in the required durable location and does not recreate the active change

### Requirement: Routine review authors use a focused authoring contract

Routine visual authors SHALL use the author guide and relevant examples without a required full read of the fixed viewer implementation. The builder SHALL continue to produce the standalone page from that viewer. Structural checks, rendered critique, and a revision round SHALL remain required. Specific viewer inspection SHALL remain available for a concrete question the author contract does not answer.

#### Scenario: A workflow change needs a flow visual

- **WHEN** an author creates a routine flow using documented primitives
- **THEN** the guide and relevant examples provide the required authoring inputs
- **AND** the generated page receives the existing structural and rendered checks

## MODIFIED Requirements

### Requirement: Simplification reports a net instruction reduction

The completed change SHALL report before-and-after word and byte counts for a fixed inventory of core workflow skill descriptions, bodies, and linked procedure references, including removed generated instructions and new references. The inventory SHALL show a net reduction and SHALL identify shared owner documents separately. Counts of source text SHALL NOT be presented as measured runtime token savings. Generated review code, executable helpers, and historical records SHALL be accounted for separately.

The report SHALL also name required-reading inventories for ordinary active save, named-secret save, prose save, new-plan fallback, archived save, cold resume, and routine visual authoring. Ordinary save and routine authoring SHALL require less source reading than the recorded baseline. Every special-route increase SHALL be reported with its reason. Completion SHALL include behavior regression evidence and an audit that required checks remain reachable.

#### Scenario: The implementation is reviewed

- **WHEN** the simplification is reported complete
- **THEN** its evidence names the counted paths, baseline revision, before-and-after totals, and the absence of normal generated-skill handoffs
- **AND** it does not claim that all inventoried text was loaded in every session

#### Scenario: Text moves into a new reference

- **WHEN** a procedure is extracted from a skill into a new file
- **THEN** the aggregate inventory includes that file and each applicable route includes its required reading
- **AND** moving the text alone cannot count as a net instruction reduction

#### Scenario: Runtime telemetry is unavailable

- **WHEN** behavior and source-load checks pass but comparable token traces are absent
- **THEN** the change reports source-load reductions and the runtime measurement limit
- **AND** it makes no numerical claim about runtime token savings

<!-- end specs/context-economy/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-09-22

~~~
<!-- end .openspec.yaml -->
<!-- file measurements.json utf8 15730 fence=~~~ -->
~~~json
{
  "baseline": "dec731db66df3667dd0ab28c80c2c0af8435f7ae",
  "metric": "Source words and UTF-8 bytes; not measured runtime tokens",
  "assumptions": "Fixed source-input model, not runtime telemetry. Active/archive routes include meaningful note capture but no spec deltas. Cold resume measures orientation; visual author measures shared author inputs. Change-specific artifacts, implementation context, and repeated agent invocations vary and are excluded. Route files are counted once. Shared loop/owner reading is included conservatively on both sides. Baseline helper counts are read from the named Git revision.",
  "categories": {
    "instructions": {
      "before": {
        "words": 18140,
        "bytes": 116846
      },
      "after": {
        "words": 16021,
        "bytes": 105331
      }
    },
    "owners": {
      "before": {
        "words": 11262,
        "bytes": 71619
      },
      "after": {
        "words": 11262,
        "bytes": 71619
      }
    },
    "html": {
      "before": {
        "words": 5632,
        "bytes": 52981
      },
      "after": {
        "words": 5632,
        "bytes": 52981
      }
    },
    "helpers": {
      "before": {
        "words": 5245,
        "bytes": 40133
      },
      "after": {
        "words": 6165,
        "bytes": 48959
      }
    }
  },
  "routes": {
    "active-save": {
      "before": {
        "files": [
          ".agents/skills/save/SKILL.md",
          ".agents/skills/save/references/git-gate.md",
          "notes/README.md",
          "wiki/development/the-change-loop.md"
        ],
        "words": 9130,
        "bytes": 58156
      },
      "after": {
        "files": [
          ".agents/skills/save/SKILL.md",
          ".agents/skills/save/references/checkpoint-evidence.md",
          ".agents/skills/save/references/git-gate.md",
          "notes/README.md",
          "wiki/development/the-change-loop.md"
        ],
        "words": 5766,
        "bytes": 38094
      },
      "increaseReason": null
    },
    "named-secret-save": {
      "before": {
        "files": [
          ".agents/skills/save/SKILL.md",
          ".agents/skills/save/references/git-gate.md",
          "notes/README.md",
          "wiki/development/secrets.md",
          "wiki/development/the-change-loop.md"
        ],
        "words": 9806,
        "bytes": 62514
      },
      "after": {
        "files": [
          ".agents/skills/save/SKILL.md",
          ".agents/skills/save/references/checkpoint-evidence.md",
          ".agents/skills/save/references/git-gate.md",
          ".agents/skills/save/references/named-secrets.md",
          "notes/README.md",
          "wiki/development/secrets.md",
          "wiki/development/the-change-loop.md"
        ],
        "words": 6850,
        "bytes": 45171
      },
      "increaseReason": null
    },
    "prose-save": {
      "before": {
        "files": [
          ".agents/skills/save/SKILL.md",
          "notes/README.md",
          "wiki/development/the-change-loop.md"
        ],
        "words": 8257,
        "bytes": 52484
      },
      "after": {
        "files": [
          ".agents/skills/save/SKILL.md",
          ".agents/skills/save/references/checkpoint-evidence.md",
          ".agents/skills/save/references/prose-save.md",
          "notes/README.md",
          "wiki/development/the-change-loop.md"
        ],
        "words": 5246,
        "bytes": 34648
      },
      "increaseReason": null
    },
    "new-plan-save": {
      "before": {
        "files": [
          ".agents/skills/explore/SKILL.md",
          ".agents/skills/plan/SKILL.md",
          ".agents/skills/plan/references/openspec-cli.md",
          ".agents/skills/plan/references/review-author.md",
          ".agents/skills/plan/references/review-examples.html",
          ".agents/skills/plan/references/review-kit.html",
          ".agents/skills/save/SKILL.md",
          ".agents/skills/save/references/git-gate.md",
          "notes/README.md",
          "wiki/agent-knowledge-center.md",
          "wiki/development/the-change-loop.md"
        ],
        "words": 18248,
        "bytes": 134368
      },
      "after": {
        "files": [
          ".agents/skills/explore/SKILL.md",
          ".agents/skills/plan/SKILL.md",
          ".agents/skills/plan/references/openspec-cli.md",
          ".agents/skills/plan/references/review-author.md",
          ".agents/skills/plan/references/review-examples.html",
          ".agents/skills/save/SKILL.md",
          ".agents/skills/save/references/checkpoint-evidence.md",
          ".agents/skills/save/references/git-gate.md",
          ".agents/skills/save/references/new-plan.md",
          "notes/README.md",
          "wiki/agent-knowledge-center.md",
          "wiki/development/the-change-loop.md"
        ],
        "words": 10340,
        "bytes": 72586
      },
      "increaseReason": null
    },
    "archived-save": {
      "before": {
        "files": [
          ".agents/skills/save/SKILL.md",
          ".agents/skills/save/references/git-gate.md",
          "notes/README.md",
          "wiki/development/the-change-loop.md"
        ],
        "words": 9130,
        "bytes": 58156
      },
      "after": {
        "files": [
          ".agents/skills/save/SKILL.md",
          ".agents/skills/save/references/archived-save.md",
          ".agents/skills/save/references/checkpoint-evidence.md",
          ".agents/skills/save/references/git-gate.md",
          "notes/README.md",
          "wiki/development/the-change-loop.md"
        ],
        "words": 5917,
        "bytes": 39054
      },
      "increaseReason": null
    },
    "cold-resume": {
      "before": {
        "files": [
          ".agents/skills/apply/SKILL.md",
          ".agents/skills/continue/SKILL.md",
          ".agents/skills/plan/references/openspec-cli.md",
          "notes/README.md",
          "wiki/development/the-change-loop.md"
        ],
        "words": 6432,
        "bytes": 41920
      },
      "after": {
        "files": [
          ".agents/skills/apply/SKILL.md",
          ".agents/skills/continue/SKILL.md",
          ".agents/skills/plan/references/openspec-cli.md",
          ".agents/skills/save/references/checkpoint-evidence.md",
          "notes/README.md",
          "wiki/development/the-change-loop.md"
        ],
        "words": 6624,
        "bytes": 43610
      },
      "increaseReason": "The orientation reads the new explicit evidence/root contract. This small increase preserves branch and ambiguity handling; completion saves are measured separately."
    },
    "visual-author": {
      "before": {
        "files": [
          ".agents/skills/plan/references/review-author.md",
          ".agents/skills/plan/references/review-examples.html",
          ".agents/skills/plan/references/review-kit.html"
        ],
        "words": 6035,
        "bytes": 55807
      },
      "after": {
        "files": [
          ".agents/skills/plan/references/review-author.md",
          ".agents/skills/plan/references/review-examples.html"
        ],
        "words": 1259,
        "bytes": 12511
      },
      "increaseReason": null
    }
  },
  "inventory": [
    {
      "path": ".agents/skills/apply/SKILL.md",
      "kind": "instructions",
      "before": {
        "words": 925,
        "bytes": 6125
      },
      "after": {
        "words": 957,
        "bytes": 6406
      }
    },
    {
      "path": ".agents/skills/continue/SKILL.md",
      "kind": "instructions",
      "before": {
        "words": 1596,
        "bytes": 10438
      },
      "after": {
        "words": 1614,
        "bytes": 10675
      }
    },
    {
      "path": ".agents/skills/explore/SKILL.md",
      "kind": "instructions",
      "before": {
        "words": 1071,
        "bytes": 7137
      },
      "after": {
        "words": 1071,
        "bytes": 7137
      }
    },
    {
      "path": ".agents/skills/plan/SKILL.md",
      "kind": "instructions",
      "before": {
        "words": 699,
        "bytes": 4870
      },
      "after": {
        "words": 723,
        "bytes": 5024
      }
    },
    {
      "path": ".agents/skills/plan/references/openspec-cli.md",
      "kind": "instructions",
      "before": {
        "words": 340,
        "bytes": 2420
      },
      "after": {
        "words": 340,
        "bytes": 2420
      }
    },
    {
      "path": ".agents/skills/plan/references/review-author.md",
      "kind": "instructions",
      "before": {
        "words": 403,
        "bytes": 2826
      },
      "after": {
        "words": 428,
        "bytes": 2993
      }
    },
    {
      "path": ".agents/skills/plan/references/review-examples.html",
      "kind": "html",
      "before": {
        "words": 831,
        "bytes": 9518
      },
      "after": {
        "words": 831,
        "bytes": 9518
      }
    },
    {
      "path": ".agents/skills/plan/references/review-kit.html",
      "kind": "html",
      "before": {
        "words": 4801,
        "bytes": 43463
      },
      "after": {
        "words": 4801,
        "bytes": 43463
      }
    },
    {
      "path": ".agents/skills/plan/scripts/build-review.mjs",
      "kind": "helpers",
      "before": {
        "bytes": 4654,
        "words": 481
      },
      "after": {
        "words": 482,
        "bytes": 4673
      }
    },
    {
      "path": ".agents/skills/plan/scripts/check-review.js",
      "kind": "helpers",
      "before": {
        "bytes": 3355,
        "words": 288
      },
      "after": {
        "words": 288,
        "bytes": 3355
      }
    },
    {
      "path": ".agents/skills/save/SKILL.md",
      "kind": "instructions",
      "before": {
        "words": 4686,
        "bytes": 29547
      },
      "after": {
        "words": 1218,
        "bytes": 8494
      }
    },
    {
      "path": ".agents/skills/save/references/archived-save.md",
      "kind": "instructions",
      "before": {
        "words": 0,
        "bytes": 0
      },
      "after": {
        "words": 151,
        "bytes": 960
      }
    },
    {
      "path": ".agents/skills/save/references/checkpoint-evidence.md",
      "kind": "instructions",
      "before": {
        "words": 0,
        "bytes": 0
      },
      "after": {
        "words": 142,
        "bytes": 1172
      }
    },
    {
      "path": ".agents/skills/save/references/git-gate.md",
      "kind": "instructions",
      "before": {
        "words": 873,
        "bytes": 5672
      },
      "after": {
        "words": 835,
        "bytes": 5491
      }
    },
    {
      "path": ".agents/skills/save/references/named-secrets.md",
      "kind": "instructions",
      "before": {
        "words": 0,
        "bytes": 0
      },
      "after": {
        "words": 408,
        "bytes": 2719
      }
    },
    {
      "path": ".agents/skills/save/references/new-plan.md",
      "kind": "instructions",
      "before": {
        "words": 0,
        "bytes": 0
      },
      "after": {
        "words": 208,
        "bytes": 1422
      }
    },
    {
      "path": ".agents/skills/save/references/prose-save.md",
      "kind": "instructions",
      "before": {
        "words": 0,
        "bytes": 0
      },
      "after": {
        "words": 315,
        "bytes": 2045
      }
    },
    {
      "path": ".agents/skills/save/references/spec-sync.md",
      "kind": "instructions",
      "before": {
        "words": 191,
        "bytes": 1266
      },
      "after": {
        "words": 191,
        "bytes": 1266
      }
    },
    {
      "path": ".agents/skills/save/scripts/change-candidates.sh",
      "kind": "helpers",
      "before": {
        "bytes": 1835,
        "words": 255
      },
      "after": {
        "words": 26,
        "bytes": 227
      }
    },
    {
      "path": ".agents/skills/save/scripts/checkpoint-evidence.mjs",
      "kind": "helpers",
      "before": {
        "words": 0,
        "bytes": 0
      },
      "after": {
        "words": 676,
        "bytes": 6198
      }
    },
    {
      "path": ".agents/skills/save/scripts/preview-url.sh",
      "kind": "helpers",
      "before": {
        "bytes": 2395,
        "words": 323
      },
      "after": {
        "words": 323,
        "bytes": 2395
      }
    },
    {
      "path": ".agents/skills/save/scripts/render-pr-body.mjs",
      "kind": "helpers",
      "before": {
        "words": 0,
        "bytes": 0
      },
      "after": {
        "words": 472,
        "bytes": 4217
      }
    },
    {
      "path": ".agents/skills/save/scripts/sync-review-proposal.mjs",
      "kind": "helpers",
      "before": {
        "bytes": 507,
        "words": 56
      },
      "after": {
        "words": 56,
        "bytes": 507
      }
    },
    {
      "path": ".agents/skills/save/scripts/wait-for-checks.sh",
      "kind": "helpers",
      "before": {
        "bytes": 4414,
        "words": 703
      },
      "after": {
        "words": 703,
        "bytes": 4414
      }
    },
    {
      "path": ".agents/skills/ship/SKILL.md",
      "kind": "instructions",
      "before": {
        "words": 2569,
        "bytes": 16449
      },
      "after": {
        "words": 2601,
        "bytes": 16730
      }
    },
    {
      "path": ".agents/skills/verify/SKILL.md",
      "kind": "instructions",
      "before": {
        "words": 2318,
        "bytes": 14362
      },
      "after": {
        "words": 2350,
        "bytes": 14643
      }
    },
    {
      "path": ".agents/skills/verify/references/walkthrough.md",
      "kind": "instructions",
      "before": {
        "words": 2469,
        "bytes": 15734
      },
      "after": {
        "words": 2469,
        "bytes": 15734
      }
    },
    {
      "path": ".agents/skills/verify/scripts/verify-runner.sh",
      "kind": "helpers",
      "before": {
        "bytes": 7728,
        "words": 1061
      },
      "after": {
        "words": 1061,
        "bytes": 7728
      }
    },
    {
      "path": ".agents/skills/verify/scripts/verify-staging.sh",
      "kind": "helpers",
      "before": {
        "bytes": 15245,
        "words": 2078
      },
      "after": {
        "words": 2078,
        "bytes": 15245
      }
    },
    {
      "path": "AGENTS.md",
      "kind": "owners",
      "before": {
        "words": 758,
        "bytes": 5625
      },
      "after": {
        "words": 758,
        "bytes": 5625
      }
    },
    {
      "path": "notes/README.md",
      "kind": "owners",
      "before": {
        "words": 672,
        "bytes": 4320
      },
      "after": {
        "words": 672,
        "bytes": 4320
      }
    },
    {
      "path": "wiki/agent-knowledge-center.md",
      "kind": "owners",
      "before": {
        "words": 973,
        "bytes": 5978
      },
      "after": {
        "words": 973,
        "bytes": 5978
      }
    },
    {
      "path": "wiki/development/secrets.md",
      "kind": "owners",
      "before": {
        "words": 676,
        "bytes": 4358
      },
      "after": {
        "words": 676,
        "bytes": 4358
      }
    },
    {
      "path": "wiki/development/staging-walkthrough.md",
      "kind": "owners",
      "before": {
        "words": 3708,
        "bytes": 23093
      },
      "after": {
        "words": 3708,
        "bytes": 23093
      }
    },
    {
      "path": "wiki/development/the-change-loop.md",
      "kind": "owners",
      "before": {
        "words": 2899,
        "bytes": 18617
      },
      "after": {
        "words": 2899,
        "bytes": 18617
      }
    },
    {
      "path": "wiki/ux-principles.md",
      "kind": "owners",
      "before": {
        "words": 1576,
        "bytes": 9628
      },
      "after": {
        "words": 1576,
        "bytes": 9628
      }
    }
  ],
  "issues": []
}

~~~
<!-- end measurements.json -->
<!-- file review-visuals.html utf8 11869 fence=~~~ -->
~~~html
<section class="visual flow" id="save-routes" data-kind="flow" data-title="Load the needed save procedures" data-states="after today">
  <p class="caption">After this change, the common procedure directs each save to the references it needs.</p>
  <div class="frame">
    <div class="state state-after">
      <div class="step flow-card" data-target-id="save-main" data-mark="conditions"><h3>Read the main procedure <span class="tag">Changed</span><i class="callout">1</i></h3><p>Keep authorization, selection order, route conditions, and final checks here.</p><details><summary>Details</summary><p>The agent selects the change using existing rules. Secret values stay excluded from records on every route.</p></details></div>
      <p class="flow-connector">↓ Load each matching reference</p>
      <div class="flow-branches">
        <div class="flow-branch" data-target-id="save-secret"><h3>If named secrets were supplied <span class="tag">Moved</span></h3><p>Load secret persistence instructions.</p><details><summary>Details</summary><p>Keep token handling and value exclusion. This condition can combine with other routes.</p></details></div>
        <div class="flow-branch" data-target-id="save-prose"><h3>If all paths are notes or wiki <span class="tag">Moved</span></h3><p>Load the prose save procedure.</p><details><summary>Details</summary><p>Keep the default-branch route and its checks. Classify by path, not extension.</p></details></div>
        <div class="flow-branch" data-target-id="save-fallback"><h3>If a plan must be created <span class="tag">Moved</span></h3><p>Load new-plan fallback instructions.</p><details><summary>Details</summary><p>Keep required artifacts and review generation. Missing dependencies cannot make a plan ready.</p></details></div>
        <div class="flow-branch" data-target-id="save-archive"><h3>If the handoff is archived <span class="tag">Moved</span></h3><p>Load archive maintenance instructions.</p><details><summary>Details</summary><p>Keep archive-aware records and links. Active-change saves need no archive reference.</p></details></div>
      </div>
      <p class="flow-connector">↓ Matching routes rejoin; otherwise continue here directly</p>
      <div class="step flow-card" data-target-id="save-finish"><h3>Complete the selected save <span class="tag">Kept</span></h3><p>Check secret exclusion; finish record, publish, and gate steps.</p><details><summary>Details</summary><p>Keep checkpoints, retry budgets, task guards, and CI or PR-review policy. Load the notes convention when session capture is needed.</p></details></div>
    </div>
    <div class="state state-today"><div class="flow-sequence"><div class="step flow-card" data-target-id="save-today"><h3>Read the full runbook <span class="tag">Today</span></h3><p>Ordinary saves load all special-route instructions.</p><details><summary>Details</summary><p>Named secrets, prose-only saves, fallback plans, and archives all sit in the main skill.</p></details></div><p class="flow-connector">↓</p><div class="step flow-card" data-target-id="save-today-finish"><h3>Use the applicable steps <span class="tag">Today</span></h3><p>The agent identifies its route within the full instructions.</p><details><summary>Details</summary><p>The change reduces required reading while preserving route obligations.</p></details></div></div></div>
  </div>
  <div class="notes"><ol><li>After this change, matching conditions combine: named secrets plus an archive loads both references. The common secret check always runs.</li></ol></div>
</section>

<section class="visual flow" id="checkpoint-evidence" data-kind="flow" data-title="Collect facts, retain judgment">
  <p class="caption">Code gathers local facts. The agent applies the selected verb's policy.</p>
  <div class="frame"><div class="flow-sequence">
    <div class="step flow-card" data-target-id="evidence-input"><h3>Supply repository and comparison base <span class="tag">Kept</span></h3><p>The caller identifies local state or a remote tree.</p><details><summary>Details</summary><p>The helper does not fetch, contact GitHub, switch branches, or read environment files. Existing command arguments remain usable.</p></details></div>
    <p class="flow-connector">↓</p>
    <div class="step flow-card" data-target-id="evidence-json" data-mark="structured"><h3>Return compact JSON <span class="tag">Added</span><i class="callout">1</i></h3><p>Branch, base, paths, candidates, matches, and diagnostics.</p><details><summary>Details</summary><p>Return complete candidate lists and staged, unstaged, untracked, and rename paths. Remote-tree queries exclude unrelated local dirt. Return counts and paths, not contents or diffs.</p></details></div>
    <p class="flow-connector">↓ Check the result</p>
    <div class="flow-branches">
      <div class="flow-branch" data-target-id="evidence-success"><h3>If collection succeeds <span class="tag">Kept</span></h3><p>The agent selects using intent and the verb's rules.</p><details><summary>Details</summary><p>Keep explicit intent first, ambiguity visible, apply's protection for new work, ship's multiple-change guard, and continue's remote resolution.</p></details></div>
      <div class="flow-branch" data-target-id="evidence-error"><h3>If a ref or Git operation fails <span class="tag">Explicit</span></h3><p>Report an error. Resolve it before selection.</p><details><summary>Details</summary><p>Failure cannot look like an empty successful list. Refresh observations after edits or checkout. No persistent cache is added.</p></details></div>
    </div>
    <p class="flow-connector">↓ Continue only with valid evidence and a resolved selection</p>
    <div class="step flow-card" data-target-id="evidence-result"><h3>Return to the verb <span class="tag">Kept</span></h3><p>The existing workflow controls Git changes.</p><details><summary>Details</summary><p>The helper gathers facts only. The model retains intent interpretation and unresolved choices.</p></details></div>
  </div></div>
  <div class="notes"><ol><li>Shorter output must preserve ambiguity. Complete candidate sets are required; partial results cannot select work.</li></ol></div>
</section>

<section class="visual flow" id="pr-body" data-kind="flow" data-title="Assemble the PR body">
  <p class="caption">Keep one maintained plan and one short agent-authored PR summary.</p>
  <div class="frame"><div class="flow-sequence">
    <div class="step flow-card" data-target-id="pr-input"><h3>Agent supplies meaning and metadata <span class="tag">Kept</span></h3><p>Write a summary file; name the change, mode, repository, and branch.</p><details><summary>Details</summary><p>The agent checks summary accuracy and secret exclusion. Preview URL is optional. The temporary summary is not another maintained record.</p></details></div>
    <p class="flow-connector">↓</p>
    <div class="step flow-card" data-target-id="pr-render" data-mark="renderer"><h3>Renderer assembles stable sections <span class="tag">Added</span><i class="callout">1</i></h3><p>Read status and tasks from the selected change.</p><details><summary>Details</summary><p>Preserve Markdown, newlines, the exact task checklist, optional review and preview links, encoded URL paths, and active or archived handoff. Only active changes have a resume footer.</p></details></div>
    <p class="flow-connector">↓ Validate required inputs</p>
    <div class="flow-branches">
      <div class="flow-branch" data-target-id="pr-valid"><h3>If inputs are valid <span class="tag">Added</span></h3><p>Write the requested body file.</p><details><summary>Details</summary><p>The renderer does not publish or print the full body by default. Save supplies the file to gh.</p></details></div>
      <div class="flow-branch" data-target-id="pr-invalid"><h3>If required input is absent <span class="tag">Added</span></h3><p>Report an error; preserve existing output.</p><details><summary>Details</summary><p>The agent corrects inputs and reruns. Missing data cannot replace a body with incomplete output.</p></details></div>
    </div>
    <p class="flow-connector">↓ Continue only after successful rendering</p>
    <div class="step flow-card" data-target-id="pr-publish"><h3>Save publishes and checks the gate <span class="tag">Kept</span></h3><p>Existing Git and CI instructions govern delivery.</p><details><summary>Details</summary><p>No authorization, checkpoint, retry, or merge policy moves into the renderer.</p></details></div>
  </div></div>
  <div class="notes"><ol><li>Code formats stable sections. The agent still decides what the change means and writes its summary.</li></ol></div>
</section>

<section class="visual diff-visual" id="author-inputs" data-kind="diff" data-title="Focus review-author reading">
  <p class="caption">The builder consumes the fixed viewer; the author uses its documented visual vocabulary.</p>
  <div class="frame"><div class="diff">
    <div><div class="label">Today: required author reads</div><pre><span class="line">Proposal + design</span><span class="line">Author guide</span><span class="line del">Full viewer implementation</span><span class="line">Relevant visual examples</span></pre></div>
    <div><div class="label">After: required author reads</div><pre><span class="line">Proposal + design</span><span class="line add" data-mark="focused" data-target-id="author-guide">Complete author guide</span><span class="line add" data-target-id="author-examples">Closest visual examples</span><span class="line add" data-target-id="author-exception">Inspect a specific viewer section only for an unanswered question.</span></pre></div>
  </div><p><span class="tag">Kept</span> Design author → builder → browser checker → rendered critic → one revision round.</p><p><span class="tag">Kept</span> Offline review, anchors, draft notes, copy feedback, and phone inspection.</p></div>
  <div class="notes"><p class="brief">No viewer behavior changes. The guide must explain every required class and attribute in the examples. Existing reviews remain usable.</p></div>
</section>

<section class="visual tree" id="measurement" data-kind="tree" data-title="Measure reading and preserve behavior">
  <p class="caption">Completion evidence separates modeled source load from runtime tokens.</p>
  <div class="frame"><ul>
    <li class="add" data-mark="evidence" data-target-id="measure-inventory">Instruction inventory <i class="callout">1</i><ul>
      <li>Seven core skills + Markdown references</li>
      <li>Shared owner documents: separate subtotal</li>
      <li>Canonical aliases counted once</li>
      <li>Viewer, examples, scripts: separate totals</li>
    </ul></li>
    <li class="add" data-target-id="measure-routes">Seven route fixtures<ul>
      <li>Active save · named-secret save · prose save</li>
      <li>New-plan fallback · archived save</li>
      <li>Cold continue · visual authoring</li>
    </ul></li>
    <li class="add" data-target-id="measure-acceptance">Required source-load results<ul>
      <li>Lower aggregate instruction inventory</li>
      <li>Lower normal-save and review-author loads</li>
      <li>Explain any special-route increase</li>
    </ul></li>
    <li class="add" data-target-id="measure-behavior">Behavior fixtures and route audit<ul>
      <li>Selection, ambiguity, ref errors, rename paths</li>
      <li>PR body, exact tasks, links, active/archive modes</li>
      <li>Secrets, task guards, gates, retries, archives</li>
    </ul></li>
    <li class="edit" data-target-id="measure-runtime">Runtime token savings: claim only with measured traces</li>
  </ul></div>
  <div class="notes"><ol><li>Compare the fixed baseline with the working tree using a declared inventory. Bytes and words model reading cost; they do not establish runtime token savings. No behavior may be removed to meet a budget.</li></ol></div>
</section>

~~~
<!-- end review-visuals.html -->
<!-- file review.html utf8 57276 fence=~~~ -->
~~~html
<!-- wong-review:2 -->
<!doctype html>
<!--
  WongStack review kit. The shared offline viewer lives here.
  Authors write review-visuals.html using review-author.md and review-examples.html.
  build-review.mjs fills the proposal and visual slots. Generated pages contain
  the viewer, so archives open without a server or adjacent source files.
-->

<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Review — 2026-09-22-reduce-workflow-context-cost</title>
<style>
  :root { --ink:#333; --line:#9a9a9a; --fill:#e9e9e9; --fill2:#f6f6f6; --note:#fff4c2; --mark:#1a73e8; --markbg:#eaf2fd; }
  * { box-sizing:border-box; }
  body { margin:0; font:14px/1.4 "Helvetica Neue", Arial, sans-serif; color:var(--ink); background:#d9d9d9; }
  a { color:inherit; }

  /* chrome: the reviewer's toolbar */
  .chrome { position:sticky; top:0; z-index:9; background:#222; color:#eee; padding:8px 14px; display:flex; gap:18px; align-items:center; flex-wrap:wrap; font-size:13px; min-height:41px; }
  .chrome b { font-weight:600; }
  .chrome .group { display:flex; gap:6px; align-items:center; }
  .chrome .group:empty { display:none; }
  .chrome button { font:inherit; padding:3px 9px; background:#444; color:#eee; border:1px solid #666; border-radius:3px; cursor:pointer; }
  .chrome button[aria-pressed="true"] { background:#eee; color:#222; }
  .chrome button.annotate[aria-pressed="true"] { background:var(--mark); color:#fff; border-color:var(--mark); }
  .chrome .hint { opacity:.7; margin-left:auto; }
  .chrome .tools { display:contents; }
  .chrome .tools-toggle { display:none; }

  /* layout: What Changes panel + stage */
  .layout { display:flex; align-items:flex-start; }
  .panel { flex:0 0 340px; position:sticky; top:41px; max-height:calc(100vh - 41px); overflow:auto; background:#fff; border-right:2px solid var(--line); padding:16px 18px; font-size:13px; }
  .panel h2 { font-size:11px; letter-spacing:.08em; text-transform:uppercase; color:#666; margin:18px 0 6px; }
  .panel h2:first-child { margin-top:0; }
  .panel p { margin:0 0 8px; }
  .panel ol.changes { margin:0; padding:0; list-style:none; counter-reset:c; }
  .panel ol.changes li { counter-increment:c; position:relative; margin:0 0 4px; padding:6px 8px 6px 30px; border:1px solid transparent; border-radius:3px; cursor:pointer; }
  .panel ol.changes li::before { content:counter(c); position:absolute; left:8px; top:7px; width:16px; height:16px; border-radius:50%; background:var(--fill); color:#666; font-size:10px; font-weight:700; display:flex; align-items:center; justify-content:center; }
  .panel ol.changes li:hover { background:var(--fill2); }
  .panel ol.changes li.on { border-color:var(--mark); background:var(--markbg); }
  .panel ol.changes li.on::before { background:var(--mark); color:#fff; }
  .panel ol.changes li .kind { display:block; font-size:11px; color:var(--mark); margin-top:2px; }
  .panel ol.changes li.dead .kind { color:#c00; }
  .panel ol.changes li.text .kind { color:#888; }
  .panel code { background:var(--fill); padding:0 3px; }
  .panel .notes-list { margin:0; padding-left:18px; }
  .panel .notes-list li { margin:0 0 6px; cursor:pointer; }
  .panel .notes-list .where { color:#666; font-size:11px; display:block; }
  .panel .notes-list button { border:0; background:none; color:var(--ink); text-align:left; cursor:pointer; font:inherit; padding:0; }
  .panel .draft-list { margin:0; padding-left:18px; }
  .panel .draft-list li { margin:0 0 6px; }
  .panel .draft-list button { border:0; background:none; color:var(--ink); text-align:left; text-decoration:underline; cursor:pointer; font:inherit; padding:0; }
  .panel .draft-count { display:inline-block; margin-left:6px; padding:0 6px; border:1px solid var(--line); border-radius:12px; white-space:nowrap; }
  .panel .empty { color:#666; list-style:none; margin-left:-18px; }
  .stage { flex:1; min-width:0; }
  .item-header { max-width:960px; margin:24px auto 0; padding:20px 24px; background:#fff; border:2px solid var(--line); overflow-wrap:anywhere; }
  .item-header[hidden] { display:none; }
  .item-header h1 { margin:0; font-size:20px; scroll-margin-top:calc(var(--chrome-h, 41px) + 12px); }
  .item-header .position { margin:0 0 10px; color:#666; font-size:13px; }

  /* one visual at a time */
  .visual:not([data-active]) { display:none !important; }
  .visual[data-active] { display:block !important; }
  .frame { max-width:960px; margin:12px auto 24px; background:#fff; border:2px solid var(--line); box-shadow:0 2px 0 #bbb; overflow-wrap:anywhere; }
  .visual:not(.screen) .frame { padding:24px; }
  .caption { max-width:960px; margin:12px auto 0; font-size:12px; color:#666; }
  .caption + .frame { margin-top:6px; }
  .state { display:none; }
  .state[data-on] { display:block; }

  /* lo-fi screen primitives — the screen visual's vocabulary */
  .topbar { display:flex; align-items:center; gap:16px; padding:12px 20px; border-bottom:2px solid var(--line); background:var(--fill2); }
  .logo { width:34px; height:34px; border:2px solid var(--line); background:var(--fill); position:relative; }
  .logo::before, .logo::after { content:""; position:absolute; inset:0; background:linear-gradient(to top right, transparent 48%, var(--line) 48%, var(--line) 52%, transparent 52%); }
  .logo::after { transform:scaleX(-1); }
  .nav { display:flex; gap:14px; }
  .nav span { padding:4px 0; border-bottom:2px solid transparent; }
  .nav span.on { border-color:var(--ink); font-weight:600; }
  .body { padding:20px; }
  h1 { font-size:20px; margin:0; }
  .row { display:flex; gap:12px; align-items:center; }
  .row.between { justify-content:space-between; }
  .btn { display:inline-block; padding:7px 14px; border:2px solid var(--ink); border-radius:3px; background:#fff; cursor:pointer; user-select:none; }
  .btn.primary { background:var(--ink); color:#fff; }
  .btn.ghost { border-color:transparent; text-decoration:underline; }
  .input { display:inline-block; min-width:220px; padding:7px 10px; border:2px solid var(--line); border-radius:3px; background:#fff; color:#888; }
  table { width:100%; border-collapse:collapse; margin-top:16px; }
  th { text-align:left; font-size:12px; color:#666; border-bottom:2px solid var(--line); padding:8px 6px; }
  td { padding:10px 6px; border-bottom:1px solid #ddd; }
  tr.click { cursor:pointer; }
  .tag { display:inline-block; padding:1px 8px; border:1px solid var(--line); border-radius:10px; font-size:12px; }
  .box { border:2px dashed var(--line); background:var(--fill2); padding:30px; text-align:center; color:#666; margin-top:16px; }
  .skeleton { height:14px; background:var(--fill); margin:14px 0; width:70%; }
  .skeleton.s { width:40%; }
  .kv { display:grid; grid-template-columns:140px 1fr; gap:8px 12px; margin:16px 0; }
  .kv dt { color:#666; } .kv dd { margin:0; }
  .muted { color:#666; }
  .hero { height:120px; background:var(--fill); border:2px solid var(--line); position:relative; margin:12px 0; }
  .hero::before, .hero::after { content:""; position:absolute; inset:0; background:linear-gradient(to top right, transparent 49.5%, var(--line) 49.5%, var(--line) 50.5%, transparent 50.5%); }
  .hero::after { transform:scaleX(-1); }
  .callout { display:inline-flex; width:18px; height:18px; border-radius:50%; background:#c00; color:#fff; font-size:11px; font-weight:700; align-items:center; justify-content:center; vertical-align:middle; margin-left:6px; }
  .notes { max-width:960px; margin:0 auto 40px; background:var(--note); border:1px solid #d8c66a; padding:12px 18px; font-size:13px; }
  .notes ol { margin:6px 0 0; padding-left:20px; }
  .notes .brief { margin:0 0 6px; }

  /* flow: lanes of steps */
  .lane { display:flex; align-items:center; gap:10px; padding:10px 0; flex-wrap:wrap; }
  .lane + .lane { border-top:1px solid #ddd; }
  .lane .label { flex:0 0 70px; font-size:11px; text-transform:uppercase; letter-spacing:.06em; color:#666; }
  .lane.today .step { color:#777; border-style:dashed; }
  .step { padding:8px 12px; border:2px solid var(--line); border-radius:3px; background:var(--fill2); }
  .flow-sequence { max-width:720px; margin:0 auto; }
  .flow-card, .flow-branch { display:block; padding:14px; min-width:0; overflow-wrap:anywhere; border:2px solid var(--line); border-radius:3px; background:var(--fill2); }
  .flow-card h3, .flow-branch h3 { margin:0 0 7px; font-size:15px; }
  .flow-card p, .flow-branch p { margin:0; }
  .flow-card details, .flow-branch details { border-top:1px solid #d5d5d5; margin-top:11px; padding-top:9px; }
  .flow-card details p, .flow-branch details p { margin-top:8px; }
  .flow-connector { text-align:center; margin:10px 0; color:#666; font-weight:600; }
  .flow-branches { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr)); gap:12px; }
  .step.gone { text-decoration:line-through; color:#999; }
  .arrow { color:#999; }
  .arrow::before { content:"→"; }

  /* diff: before / after text */
  .diff { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:16px; }
  .diff > div > .label, .tree .label { font-size:11px; text-transform:uppercase; letter-spacing:.06em; color:#666; margin-bottom:6px; }
  .diff pre { margin:0; padding:10px 12px; background:var(--fill2); border:1px solid #ddd; font:12px/1.5 Menlo, Consolas, monospace; white-space:pre-wrap; overflow-wrap:anywhere; }
  .diff .line { display:block; }
  .diff .del { color:#999; text-decoration:line-through; }
  .diff .add { border-left:3px solid var(--mark); margin-left:-12px; padding-left:9px; background:var(--markbg); }

  /* tree: files touched */
  .tree ul { list-style:none; margin:0; padding:0; font:13px/1.8 Menlo, Consolas, monospace; }
  .tree li { padding-left:4px; }
  .tree li::before { display:inline-block; width:18px; color:#888; }
  .tree li.add::before { content:"+"; color:var(--mark); font-weight:700; }
  .tree li.edit::before { content:"~"; }
  .tree li.del::before { content:"−"; }
  .tree li.del { color:#999; text-decoration:line-through; }
  .tree li .why { color:#666; font:12px "Helvetica Neue", Arial, sans-serif; margin-left:10px; }

  /* text stage: a bullet with no visual, and the landing */
  .textstage h1 { font-size:22px; margin:0 0 12px; }
  .textstage p { font-size:16px; max-width:640px; }
  .textstage ol { font-size:15px; max-width:640px; padding-left:22px; }
  .textstage ol li { margin:0 0 6px; cursor:pointer; }
  .textstage ol li:hover { text-decoration:underline; }
  .textstage .muted { font-size:13px; }

  /* highlight: the mark named by the hash */
  .marked { outline:3px solid var(--mark); outline-offset:3px; box-shadow:0 0 0 6px var(--markbg); }
  tr.marked { outline-offset:0; }
  .diff .add.marked, .tree li.marked { outline-offset:0; box-shadow:none; }

  /* annotate */
  body.annotating .visual[data-active] .frame { cursor:crosshair; }
  .hovering { outline:2px dashed var(--mark); outline-offset:2px; }
  .pin { display:inline-flex; width:18px; height:18px; border-radius:3px; background:var(--mark); color:#fff; font-size:11px; font-weight:700; align-items:center; justify-content:center; vertical-align:middle; margin-left:6px; cursor:pointer; }
  .pin.stale { background:#999; }
  .popover { position:fixed; z-index:10; width:300px; background:#fff; border:2px solid var(--mark); border-radius:4px; padding:10px; box-shadow:0 4px 14px rgba(0,0,0,.25); font-size:13px; }
  .popover .where { color:#666; font-size:11px; margin-bottom:6px; word-break:break-word; }
  .popover textarea { width:100%; height:70px; font:inherit; padding:6px; border:1px solid var(--line); border-radius:3px; resize:vertical; }
  .popover .row { margin-top:8px; }
  .popover button { font:inherit; padding:4px 10px; border:1px solid var(--line); background:#fff; border-radius:3px; cursor:pointer; }
  .popover button.save { background:var(--mark); color:#fff; border-color:var(--mark); }
  .popover .del { margin-left:auto; color:#c00; }
  .popover .status { margin:8px 0 0; color:#666; }
  .storage-status { font-size:12px; color:#666; }
  .toast { position:fixed; bottom:16px; left:50%; transform:translateX(-50%); background:#222; color:#eee; padding:8px 14px; border-radius:3px; font-size:13px; z-index:11; opacity:0; transition:opacity .2s; pointer-events:none; }
  .toast.show { opacity:1; }
  #copybuf { position:fixed; left:-9999px; top:0; }
  .error { color:#c00; }

  /* chrome extras: step through changes, phone/desktop view, the panel toggle */
  .chrome .count { opacity:.8; min-width:44px; text-align:center; white-space:nowrap; }
  .chrome .menu { display:none; }
  .panel { top:var(--chrome-h, 41px); max-height:calc(100vh - var(--chrome-h, 41px)); }

  /* viewport: walk a screen at phone width from a desktop */
  body[data-viewport="phone"] .visual.screen .frame { max-width:390px; }
  body[data-viewport="phone"] .desktop-only, body[data-viewport="desktop"] .phone-only { display:none !important; }
  .visual.screen .body { min-width:0; overflow-wrap:anywhere; }

  /* phone: stage full width, the list is a sheet, the note box docks to the bottom */
  @media (max-width: 760px) {
    body { font-size:15px; }
    .chrome { display:grid; grid-template-columns:auto 1fr auto; gap:6px; padding:6px 8px; }
    .chrome > b, .chrome .hint, .chrome #viewport { display:none !important; }
    .chrome .menu, .chrome .tools-toggle { display:inline-block; }
    .chrome > .group { justify-content:center; gap:4px; }
    .chrome .tools { display:none; grid-column:1 / -1; min-width:0; }
    .chrome .tools.open { display:flex; flex-wrap:wrap; gap:8px; padding-top:6px; }
    .chrome .tools .group { flex-wrap:wrap; min-width:0; }
    .chrome .tools button { max-width:100%; overflow-wrap:anywhere; }
    .layout { display:block; }
    .panel { display:none; position:fixed; left:0; right:0; bottom:0; z-index:8; border-right:0; padding:14px 16px 40px; }
    body.menu .panel { display:block; }
    .panel ol.changes li { padding:10px 10px 10px 32px; }
    .frame { margin:12px 8px; }
    .item-header { margin:12px 8px 0; padding:14px; }
    .caption { margin:12px 8px 0; }
    .notes { margin:0 8px 24px; }
    .visual:not(.screen) .frame { padding:14px; }
    .body { padding:14px; }
    .diff { grid-template-columns:1fr; }
    .flow-branches { grid-template-columns:1fr; }
    .textstage p, .textstage ol { font-size:16px; }
    .popover { left:8px !important; right:8px; bottom:8px; top:auto !important; width:auto; }
    body.editor-open .stage { padding-bottom:240px; }
    .popover textarea { font-size:16px; height:90px; }
    .popover button { padding:8px 14px; }
    .chrome button { min-height:40px; min-width:40px; padding:6px 8px; }
  }
</style>
</head>
<body>

<div class="chrome">
  <b>Review · 2026-09-22-reduce-workflow-context-cost</b>
  <button class="menu" id="menu" aria-expanded="false" aria-controls="panel">Changes</button>
  <div class="group"><button id="prev" title="Previous change" aria-label="Previous change">‹</button><span class="count" id="count"></span><button id="next" title="Next change" aria-label="Next change">›</button></div>
  <button class="tools-toggle" id="tools-toggle" aria-expanded="false" aria-controls="tools">Tools</button>
  <div class="tools" id="tools">
  <div class="group" id="states"></div>
  <div class="group" id="viewport"><span>View:</span><button data-vp="desktop">Desktop</button><button data-vp="phone">Phone</button></div>
  <div class="group">
    <button class="annotate" id="annotate" aria-pressed="false">✎ Annotate</button>
    <button id="copy">Copy notes</button>
    <span class="storage-status" id="storage-status" hidden>Notes and drafts last for this session only.</span>
  </div>
  </div>
  <span class="hint">Click a change on the left. Grey = layout only. Blue = what changes. Red dots = reasoning below.</span>
</div>

<script type="text/markdown" id="proposal">
<!-- proposal:start -->
## Why

WongStack spends agent context on procedures that do not apply to the current task and on repeated mechanical work. Reduce that required reading and automate checkpoint evidence and formatting while preserving workflow outcomes, review quality, and delivery checks.

## What Changes

- Make `/save` a short main procedure with explicit conditions for loading named-secret handling, prose-only saves, new-plan fallback, and archived handoffs. Keep every required check reachable on its route. (review.html#/save-routes/after/conditions)
- Extend checkpoint helpers to return compact, structured branch and change evidence. Keep intent selection and ambiguous choices with the agent, and preserve each verb's selection rules. (review.html#/checkpoint-evidence/default/structured)
- Generate the PR body's mechanical sections from the selected change and explicit metadata. Keep summary judgment with the agent and preserve tasks, review and preview links, and active or archived handoff text. (review.html#/pr-body/default/renderer)
- Make routine review authors read the author guide and relevant examples instead of the fixed viewer implementation. Keep the standalone page, builder, structural checks, rendered critique, and revision round. (review.html#/author-inputs/default/focused)
- Add repeatable instruction-load measurements and behavior regression coverage. Require lower source and route reading totals, preserve special-case handling, and report runtime token use only when measured. (review.html#/measurement/default/evidence)

**Non-goals:** Reuse or remove checkpoints; change public verbs, review requirements, CI gates, retry budgets, or merge policy; replace OpenSpec; automate semantic spec reconciliation or session-note judgment; add a workflow engine or runtime cache; change Cloudflare, the browser vendor skill, historical records, or application behavior.
<!-- proposal:end -->
</script>

<div class="layout">
<aside class="panel" id="panel"></aside>
<div class="stage" id="stage">
<header class="item-header" id="item-header" hidden><p class="position" id="item-position"></p><h1 id="item-title" tabindex="-1"></h1></header>

<!-- short fallback for an empty proposal or an invalid direct link -->
<section class="visual textstage" id="_landing" data-kind="text">
  <div class="frame" id="landing"></div>
</section>

<!-- text stage for a bullet with no visual -->
<section class="visual textstage" id="_text" data-kind="text">
  <div class="frame" id="textframe"></div>
</section>

<section class="visual flow" id="save-routes" data-kind="flow" data-title="Load the needed save procedures" data-states="after today">
  <p class="caption">After this change, the common procedure directs each save to the references it needs.</p>
  <div class="frame">
    <div class="state state-after">
      <div class="step flow-card" data-target-id="save-main" data-mark="conditions"><h3>Read the main procedure <span class="tag">Changed</span><i class="callout">1</i></h3><p>Keep authorization, selection order, route conditions, and final checks here.</p><details><summary>Details</summary><p>The agent selects the change using existing rules. Secret values stay excluded from records on every route.</p></details></div>
      <p class="flow-connector">↓ Load each matching reference</p>
      <div class="flow-branches">
        <div class="flow-branch" data-target-id="save-secret"><h3>If named secrets were supplied <span class="tag">Moved</span></h3><p>Load secret persistence instructions.</p><details><summary>Details</summary><p>Keep token handling and value exclusion. This condition can combine with other routes.</p></details></div>
        <div class="flow-branch" data-target-id="save-prose"><h3>If all paths are notes or wiki <span class="tag">Moved</span></h3><p>Load the prose save procedure.</p><details><summary>Details</summary><p>Keep the default-branch route and its checks. Classify by path, not extension.</p></details></div>
        <div class="flow-branch" data-target-id="save-fallback"><h3>If a plan must be created <span class="tag">Moved</span></h3><p>Load new-plan fallback instructions.</p><details><summary>Details</summary><p>Keep required artifacts and review generation. Missing dependencies cannot make a plan ready.</p></details></div>
        <div class="flow-branch" data-target-id="save-archive"><h3>If the handoff is archived <span class="tag">Moved</span></h3><p>Load archive maintenance instructions.</p><details><summary>Details</summary><p>Keep archive-aware records and links. Active-change saves need no archive reference.</p></details></div>
      </div>
      <p class="flow-connector">↓ Matching routes rejoin; otherwise continue here directly</p>
      <div class="step flow-card" data-target-id="save-finish"><h3>Complete the selected save <span class="tag">Kept</span></h3><p>Check secret exclusion; finish record, publish, and gate steps.</p><details><summary>Details</summary><p>Keep checkpoints, retry budgets, task guards, and CI or PR-review policy. Load the notes convention when session capture is needed.</p></details></div>
    </div>
    <div class="state state-today"><div class="flow-sequence"><div class="step flow-card" data-target-id="save-today"><h3>Read the full runbook <span class="tag">Today</span></h3><p>Ordinary saves load all special-route instructions.</p><details><summary>Details</summary><p>Named secrets, prose-only saves, fallback plans, and archives all sit in the main skill.</p></details></div><p class="flow-connector">↓</p><div class="step flow-card" data-target-id="save-today-finish"><h3>Use the applicable steps <span class="tag">Today</span></h3><p>The agent identifies its route within the full instructions.</p><details><summary>Details</summary><p>The change reduces required reading while preserving route obligations.</p></details></div></div></div>
  </div>
  <div class="notes"><ol><li>After this change, matching conditions combine: named secrets plus an archive loads both references. The common secret check always runs.</li></ol></div>
</section>

<section class="visual flow" id="checkpoint-evidence" data-kind="flow" data-title="Collect facts, retain judgment">
  <p class="caption">Code gathers local facts. The agent applies the selected verb's policy.</p>
  <div class="frame"><div class="flow-sequence">
    <div class="step flow-card" data-target-id="evidence-input"><h3>Supply repository and comparison base <span class="tag">Kept</span></h3><p>The caller identifies local state or a remote tree.</p><details><summary>Details</summary><p>The helper does not fetch, contact GitHub, switch branches, or read environment files. Existing command arguments remain usable.</p></details></div>
    <p class="flow-connector">↓</p>
    <div class="step flow-card" data-target-id="evidence-json" data-mark="structured"><h3>Return compact JSON <span class="tag">Added</span><i class="callout">1</i></h3><p>Branch, base, paths, candidates, matches, and diagnostics.</p><details><summary>Details</summary><p>Return complete candidate lists and staged, unstaged, untracked, and rename paths. Remote-tree queries exclude unrelated local dirt. Return counts and paths, not contents or diffs.</p></details></div>
    <p class="flow-connector">↓ Check the result</p>
    <div class="flow-branches">
      <div class="flow-branch" data-target-id="evidence-success"><h3>If collection succeeds <span class="tag">Kept</span></h3><p>The agent selects using intent and the verb's rules.</p><details><summary>Details</summary><p>Keep explicit intent first, ambiguity visible, apply's protection for new work, ship's multiple-change guard, and continue's remote resolution.</p></details></div>
      <div class="flow-branch" data-target-id="evidence-error"><h3>If a ref or Git operation fails <span class="tag">Explicit</span></h3><p>Report an error. Resolve it before selection.</p><details><summary>Details</summary><p>Failure cannot look like an empty successful list. Refresh observations after edits or checkout. No persistent cache is added.</p></details></div>
    </div>
    <p class="flow-connector">↓ Continue only with valid evidence and a resolved selection</p>
    <div class="step flow-card" data-target-id="evidence-result"><h3>Return to the verb <span class="tag">Kept</span></h3><p>The existing workflow controls Git changes.</p><details><summary>Details</summary><p>The helper gathers facts only. The model retains intent interpretation and unresolved choices.</p></details></div>
  </div></div>
  <div class="notes"><ol><li>Shorter output must preserve ambiguity. Complete candidate sets are required; partial results cannot select work.</li></ol></div>
</section>

<section class="visual flow" id="pr-body" data-kind="flow" data-title="Assemble the PR body">
  <p class="caption">Keep one maintained plan and one short agent-authored PR summary.</p>
  <div class="frame"><div class="flow-sequence">
    <div class="step flow-card" data-target-id="pr-input"><h3>Agent supplies meaning and metadata <span class="tag">Kept</span></h3><p>Write a summary file; name the change, mode, repository, and branch.</p><details><summary>Details</summary><p>The agent checks summary accuracy and secret exclusion. Preview URL is optional. The temporary summary is not another maintained record.</p></details></div>
    <p class="flow-connector">↓</p>
    <div class="step flow-card" data-target-id="pr-render" data-mark="renderer"><h3>Renderer assembles stable sections <span class="tag">Added</span><i class="callout">1</i></h3><p>Read status and tasks from the selected change.</p><details><summary>Details</summary><p>Preserve Markdown, newlines, the exact task checklist, optional review and preview links, encoded URL paths, and active or archived handoff. Only active changes have a resume footer.</p></details></div>
    <p class="flow-connector">↓ Validate required inputs</p>
    <div class="flow-branches">
      <div class="flow-branch" data-target-id="pr-valid"><h3>If inputs are valid <span class="tag">Added</span></h3><p>Write the requested body file.</p><details><summary>Details</summary><p>The renderer does not publish or print the full body by default. Save supplies the file to gh.</p></details></div>
      <div class="flow-branch" data-target-id="pr-invalid"><h3>If required input is absent <span class="tag">Added</span></h3><p>Report an error; preserve existing output.</p><details><summary>Details</summary><p>The agent corrects inputs and reruns. Missing data cannot replace a body with incomplete output.</p></details></div>
    </div>
    <p class="flow-connector">↓ Continue only after successful rendering</p>
    <div class="step flow-card" data-target-id="pr-publish"><h3>Save publishes and checks the gate <span class="tag">Kept</span></h3><p>Existing Git and CI instructions govern delivery.</p><details><summary>Details</summary><p>No authorization, checkpoint, retry, or merge policy moves into the renderer.</p></details></div>
  </div></div>
  <div class="notes"><ol><li>Code formats stable sections. The agent still decides what the change means and writes its summary.</li></ol></div>
</section>

<section class="visual diff-visual" id="author-inputs" data-kind="diff" data-title="Focus review-author reading">
  <p class="caption">The builder consumes the fixed viewer; the author uses its documented visual vocabulary.</p>
  <div class="frame"><div class="diff">
    <div><div class="label">Today: required author reads</div><pre><span class="line">Proposal + design</span><span class="line">Author guide</span><span class="line del">Full viewer implementation</span><span class="line">Relevant visual examples</span></pre></div>
    <div><div class="label">After: required author reads</div><pre><span class="line">Proposal + design</span><span class="line add" data-mark="focused" data-target-id="author-guide">Complete author guide</span><span class="line add" data-target-id="author-examples">Closest visual examples</span><span class="line add" data-target-id="author-exception">Inspect a specific viewer section only for an unanswered question.</span></pre></div>
  </div><p><span class="tag">Kept</span> Design author → builder → browser checker → rendered critic → one revision round.</p><p><span class="tag">Kept</span> Offline review, anchors, draft notes, copy feedback, and phone inspection.</p></div>
  <div class="notes"><p class="brief">No viewer behavior changes. The guide must explain every required class and attribute in the examples. Existing reviews remain usable.</p></div>
</section>

<section class="visual tree" id="measurement" data-kind="tree" data-title="Measure reading and preserve behavior">
  <p class="caption">Completion evidence separates modeled source load from runtime tokens.</p>
  <div class="frame"><ul>
    <li class="add" data-mark="evidence" data-target-id="measure-inventory">Instruction inventory <i class="callout">1</i><ul>
      <li>Seven core skills + Markdown references</li>
      <li>Shared owner documents: separate subtotal</li>
      <li>Canonical aliases counted once</li>
      <li>Viewer, examples, scripts: separate totals</li>
    </ul></li>
    <li class="add" data-target-id="measure-routes">Seven route fixtures<ul>
      <li>Active save · named-secret save · prose save</li>
      <li>New-plan fallback · archived save</li>
      <li>Cold continue · visual authoring</li>
    </ul></li>
    <li class="add" data-target-id="measure-acceptance">Required source-load results<ul>
      <li>Lower aggregate instruction inventory</li>
      <li>Lower normal-save and review-author loads</li>
      <li>Explain any special-route increase</li>
    </ul></li>
    <li class="add" data-target-id="measure-behavior">Behavior fixtures and route audit<ul>
      <li>Selection, ambiguity, ref errors, rename paths</li>
      <li>PR body, exact tasks, links, active/archive modes</li>
      <li>Secrets, task guards, gates, retries, archives</li>
    </ul></li>
    <li class="edit" data-target-id="measure-runtime">Runtime token savings: claim only with measured traces</li>
  </ul></div>
  <div class="notes"><ol><li>Compare the fixed baseline with the working tree using a declared inventory. Bytes and words model reading cost; they do not establish runtime token savings. No behavior may be removed to meet a budget.</li></ol></div>
</section>

</div><!-- /stage -->
</div><!-- /layout -->

<div class="toast" id="toast"></div>
<textarea id="copybuf" aria-hidden="true"></textarea>

<script>
  // kit: a load-time failure shows on the page instead of a blank stage
  window.addEventListener('error', function (e) {
    var p = document.getElementById('panel');
    if (p) p.innerHTML = '<p class="error"><b>Review script error:</b> ' + String(e.message).replace(/</g, '&lt;') + ' <span class="muted">(line ' + e.lineno + ')</span></p>' + p.innerHTML;
  });

  // ── routing: #/<visual>[/<state>][/<mark>] ──
  const FILE = 'review.html';
  const CHANGE = document.title.replace(/^Review — /, '');
  const visuals = [...document.querySelectorAll('.visual')];
  const $states = document.getElementById('states');
  const $panel = document.getElementById('panel');
  let current = { id: '_landing', state: 'default', mark: null, bullet: -1 };
  let bullets = [];   // [{text, anchor, id, state, mark, ok}]

  function statesOf(v) { return (v.dataset.states || 'default').split(' '); }
  // resolve the two optional segments: a state if it names one, else a mark
  function resolve(id, a, b) {
    const v = visuals.find(x => x.id === id);
    if (!v || id[0] === '_') return null;
    const allowed = statesOf(v);
    let state, mark;
    if (a && allowed.includes(a)) { state = a; mark = b || null; }
    else if (a && b) return null;               // a is not a state, but a mark follows: bad state
    else { state = allowed[0]; mark = a || null; }
    if (mark && !v.querySelector('[data-mark="' + mark + '"]')) return null;
    return { v, state, mark };
  }
  function ownerIndex(id) { return bullets.findIndex(x => x.ok && x.id === id); }
  function show(id, a, b) {
    if ($pop) closePopover(false);
    const r = resolve(id, a, b);
    const v = r ? r.v : visuals.find(x => x.id === (id === '_text' ? '_text' : '_landing'));
    const state = r ? r.state : 'default', mark = r ? r.mark : null;
    visuals.forEach(x => x.toggleAttribute('data-active', x === v));
    v.dataset.state = state;
    v.querySelectorAll('.state').forEach(function (block) { block.toggleAttribute('data-on', block.classList.contains('state-' + state)); });
    current = { id: v.id, state, mark, bullet: r ? ownerIndex(v.id) : -1 };
    document.querySelectorAll('.marked').forEach(x => x.classList.remove('marked'));
    if (mark) v.querySelectorAll('[data-mark="' + mark + '"]').forEach(x => x.classList.add('marked'));
    renderStates(v, state);
    renderHeader();
    renderPanelState();
    renderFeedback();
    const multi = statesOf(v).length > 1;
    const want = v.id[0] === '_' ? '#/' : '#/' + v.id + (multi && (state !== statesOf(v)[0] || mark) ? '/' + state : '') + (mark ? '/' + mark : '');
    if (location.hash !== want) { try { history.replaceState(null, '', want); } catch (e) { location.hash = want; } }
  }
  function showText(i) {      // a bullet with no visual
    document.getElementById('textframe').innerHTML = '<p class="muted">No visual for this change. Read its full text above and leave feedback if needed.</p>';
    current = { id: '_text', state: 'default', mark: null, bullet: i };
    document.querySelectorAll('.marked').forEach(function (x) { x.classList.remove('marked'); });
    visuals.forEach(x => x.toggleAttribute('data-active', x.id === '_text'));
    renderStates(null); renderHeader(); renderPanelState(); renderFeedback();
    try { history.replaceState(null, '', '#/change/' + (i + 1)); } catch (e) { location.hash = '#/change/' + (i + 1); }
  }
  function renderStates(v, state) {
    $states.innerHTML = '';
    if (!v || statesOf(v).length < 2) return;
    const lab = document.createElement('span'); lab.textContent = 'State:'; $states.appendChild(lab);
    statesOf(v).forEach(st => {
      const b = document.createElement('button');
      b.textContent = st; b.setAttribute('aria-pressed', st === state);
      b.onclick = () => { show(v.id, st, null); requestAnimationFrame(() => window.scrollTo(0, 0)); }; $states.appendChild(b);
    });
  }
  function fromHash() {
    const seg = location.hash.split('/').slice(1);
    // no change chosen: a phone opens the list over the landing, a desktop opens the first bullet
    if (!seg[0] && bullets.length) {
      if (!phoneMedia.matches) return goBullet(0);
      show('_landing', null, null);
      return setMenu(true);
    }
    if (seg[0] === 'change' && bullets[+seg[1] - 1]) return goBullet(+seg[1] - 1);
    show(seg[0] || '_landing', seg[1] || null, seg[2] || null);
  }
  window.addEventListener('hashchange', fromHash);

  // ── proposal panel + landing ──
  function inline(md) {
    return md.replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  }
  function renderHeader() {
    const header = document.getElementById('item-header');
    const b = bullets[current.bullet];
    header.hidden = !b;
    if (!b) return;
    document.getElementById('item-position').textContent = 'Change ' + (current.bullet + 1) + ' of ' + bullets.length;
    document.getElementById('item-title').innerHTML = inline(b.text);
  }
  function parseProposal() {
    const raw = document.getElementById('proposal').textContent.replace(/<\\\/script/gi, '</script').replace(/<!--[\s\S]*?-->/g, '');
    const sections = {}; let cur = null;
    raw.split('\n').forEach(line => {
      const h = line.match(/^## (.+)/);
      if (h) { cur = h[1].trim(); sections[cur] = []; return; }
      if (cur) sections[cur].push(line);
    });
    const why = (sections['Why'] || []).join('\n').trim().split(/\n\s*\n/).map(p => '<p>' + inline(p.replace(/\n/g, ' ')) + '</p>').join('');
    bullets = []; let tail = [];
    const items = []; let open = false;   // fold a wrapped bullet back onto one line
    (sections['What Changes'] || []).forEach(line => {
      if (/^- /.test(line)) { items.push(line); open = true; return; }
      if (open && line.trim()) { items[items.length - 1] += ' ' + line.trim(); return; }
      if (!line.trim()) open = false;
      items.push(line);
    });
    items.forEach(line => {
      const li = line.match(/^- (.+)/);
      if (!li) { if (line.trim()) tail.push(line.trim()); return; }
      const m = li[1].match(/\(?(?:review\.html)?#\/([\w-]+)(?:\/([\w-]+))?(?:\/([\w-]+))?\)?\s*$/);
      if (m) {
        const r = resolve(m[1], m[2] || null, m[3] || null);
        bullets.push({ text: li[1].slice(0, m.index).trim(), anchor: '#/' + [m[1], m[2], m[3]].filter(Boolean).join('/'), id: m[1], state: r ? r.state : null, mark: r ? r.mark : null, ok: !!r, kind: r ? r.v.dataset.kind : null });
      } else bullets.push({ text: li[1].trim(), anchor: null });
    });
    const seen = new Set();
    bullets.forEach(b => { if (!b.ok) return; if (seen.has(b.id)) b.ok = false; else seen.add(b.id); });
    return { why, tail: tail.map(t => '<p>' + inline(t) + '</p>').join('') };
  }
  function renderPanel() {
    const p = parseProposal();
    let html = '<h2>Why</h2>' + p.why + '<h2>What Changes</h2><ol class="changes">';
    bullets.forEach((b, i) => {
      const cls = !b.anchor ? 'text' : b.ok ? '' : 'dead';
      const kind = !b.anchor ? 'no visual' : b.ok ? b.kind + ' · ' + b.anchor : 'dead link · ' + b.anchor + ' — no such visual, state, or mark';
      html += '<li class="' + cls + '" data-i="' + i + '" role="button" tabindex="0" aria-current="false">' + inline(b.text) + '<span class="kind">' + kind + '</span><span class="draft-count" hidden></span></li>';
    });
    html += '</ol>' + p.tail + '<h2>Notes <span id="notecount"></span></h2><ol class="notes-list" id="notelist"></ol><h2>Drafts <span id="draftcount"></span></h2><ol class="draft-list" id="draftlist"></ol>';
    $panel.innerHTML = html;
    document.getElementById('landing').innerHTML = bullets.length
      ? '<h1>Choose a change</h1><p class="muted">Use the change list or Next to open a visual.</p>'
      : '<h1>No changes to review</h1><p class="muted">This proposal has no What Changes entries yet.</p>';
  }
  function renderPanelState() {
    $panel.querySelectorAll('ol.changes li').forEach((li, i) => {
      const b = bullets[i];
      const on = current.bullet === i;
      li.classList.toggle('on', on);
      li.setAttribute('aria-current', on ? 'true' : 'false');
    });
    renderCount();
  }
  function goBullet(i) {
    const b = bullets[i]; if (!b) return;
    closePopover(); setMenu(false);
    if (!b.anchor || !b.ok) showText(i); else show(b.id, b.state, b.mark);
    requestAnimationFrame(() => { window.scrollTo(0, 0); document.getElementById('item-title').focus({ preventScroll:true }); });
  }

  // ── annotation and browser-local feedback ──
  const ANNOTATABLE = '.btn, .input, tr, .box, .tag, .hero, .kv dt, .kv dd, h1, .nav span, .logo, .notes li, .notes .brief, .step, .flow-branch, .diff .line, .diff pre, .tree li, .caption, .textstage p';
  const KEY = 'rv-notes:' + CHANGE;
  const DRAFT_KEY = 'rv-drafts:v1:' + CHANGE;
  let storageAvailable = true;
  function readStored(key, fallback) {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
    catch (e) { storageAvailable = false; return fallback; }
  }
  let notes = readStored(KEY, []);
  if (!Array.isArray(notes)) notes = [];
  const draftStore = readStored(DRAFT_KEY, { version:1, drafts:[] });
  let drafts = draftStore && draftStore.version === 1 && Array.isArray(draftStore.drafts) ? draftStore.drafts : [];
  function persist() {
    if (storageAvailable) {
      try {
        localStorage.setItem(KEY, JSON.stringify(notes));
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ version:1, drafts:drafts }));
      } catch (e) { storageAvailable = false; }
    }
    document.getElementById('storage-status').hidden = storageAvailable;
    renderFeedback();
  }
  const $ann = document.getElementById('annotate');
  let annotating = false, $pop = null, editor = null, editorTrigger = null;
  $ann.onclick = () => setAnnotating(!annotating);
  function setAnnotating(on) {
    annotating = on; $ann.setAttribute('aria-pressed', String(on)); document.body.classList.toggle('annotating', on);
    closePopover(false); document.querySelectorAll('.hovering').forEach(x => x.classList.remove('hovering'));
  }
  function target(el) {
    if (el.closest('.popover, .chrome, .pin, details, a[href^="#/"]')) return null;
    const scope = el.closest('.visual[data-active]');
    if (!scope) return null;
    const t = el.closest('.flow-card, .flow-branch') || el.closest(ANNOTATABLE);
    return t && scope.contains(t) ? { scope:scope, el:t } : null;
  }
  document.addEventListener('mouseover', e => {
    if (!annotating) return;
    document.querySelectorAll('.hovering').forEach(x => x.classList.remove('hovering'));
    const t = target(e.target); if (t) t.el.classList.add('hovering');
  });
  function pathOf(scope, el) {
    const steps = [];
    for (let n = el; n && n !== scope; n = n.parentElement) steps.unshift([...n.parentElement.children].indexOf(n));
    return steps.join('.');
  }
  function elAt(scope, path) {
    if (!scope || !path) return null;
    let n = scope;
    for (const i of path.split('.')) n = n && n.children[+i];
    return n || null;
  }
  function labelOf(el) {
    const c = el.cloneNode(true);
    c.querySelectorAll('.pin, .callout, .kind, .why').forEach(x => x.remove());
    if (el.matches('.flow-card, .flow-branch')) c.querySelectorAll('details').forEach(x => x.remove());
    const content = el.tagName === 'TR' ? [...c.cells].map(td => td.textContent.trim()).join(' · ') : c.textContent;
    const value = content.replace(/\s+/g, ' ').trim().slice(0, 60);
    const kind = el.classList.contains('btn') ? 'button' : el.classList.contains('input') ? 'input' : el.tagName === 'TR' ? 'row'
      : el.classList.contains('box') ? 'panel' : el.tagName === 'H1' ? 'heading' : el.classList.contains('flow-branch') ? 'branch'
      : el.classList.contains('step') ? 'step' : el.classList.contains('line') ? 'line' : el.closest('.tree') ? 'file' : el.tagName.toLowerCase();
    return kind + ' "' + value + '"';
  }
  function recordFor(el) {
    const scope = el.closest('.visual[data-active]');
    return { itemId:current.id === '_text' ? '_text:' + current.bullet : current.id,
      scope:'visual', visual:current.id, state:current.state, targetId:el.dataset.targetId || null,
      path:pathOf(scope, el), label:labelOf(el) };
  }
  function sameTarget(a, b) {
    return a.itemId === b.itemId && a.visual === b.visual && a.state === b.state &&
      (a.targetId && b.targetId ? a.targetId === b.targetId : a.path === b.path && a.label === b.label);
  }
  function findTarget(n) {
    const scope = document.getElementById(n.visual);
    if (!scope) return null;
    let el = null;
    if (n.targetId) el = [...scope.querySelectorAll('[data-target-id]')].find(x => x.dataset.targetId === n.targetId && (!x.closest('.state') || x.closest('.state').classList.contains('state-' + n.state)));
    if (!el && !n.targetId) el = elAt(scope, n.path);
    return el && labelOf(el) === n.label ? el : null;
  }
  function whereOf(n) {
    if (n.visual === '_text') return '#/change/' + (Number(String(n.itemId).split(':')[1]) + 1);
    const v = visuals.find(x => x.id === n.visual);
    return '#/' + n.visual + (v && statesOf(v).length > 1 ? '/' + n.state : '');
  }
  function escapeHtml(value) { return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function newId() { return String(Date.now()) + '-' + Math.random().toString(36).slice(2, 8); }
  function renderFeedback() {
    document.querySelectorAll('.pin').forEach(p => p.remove());
    const list = document.getElementById('notelist'), draftList = document.getElementById('draftlist');
    if (!list || !draftList) return;
    list.innerHTML = ''; draftList.innerHTML = '';
    document.getElementById('notecount').textContent = notes.length ? '(' + notes.length + ')' : '';
    document.getElementById('draftcount').textContent = drafts.length ? '(' + drafts.length + ')' : '';
    notes.forEach((n, i) => {
      const el = findTarget(n), stale = !el;
      if (el) {
        const pin = document.createElement('button'); pin.className = 'pin'; pin.dataset.note = n.id;
        pin.setAttribute('aria-label', 'Open note ' + (i + 1)); pin.textContent = String(i + 1);
        (el.tagName === 'TR' ? el.cells[0] : el).appendChild(pin);
      }
      const li = document.createElement('li');
      const button = document.createElement('button'); button.type = 'button';
      button.innerHTML = '<span class="where">' + escapeHtml(whereOf(n)) + ' · ' + escapeHtml(n.label) + (stale ? ' · moved target' : '') + '</span>' + escapeHtml(n.text);
      button.onclick = () => openRecord(n, false);
      li.appendChild(button); list.appendChild(li);
    });
    if (!notes.length) list.innerHTML = '<li class="empty">No saved notes yet.</li>';
    drafts.forEach(d => {
      const li = document.createElement('li'), button = document.createElement('button'); button.type = 'button';
      button.textContent = whereOf(d) + ' · ' + d.label + (findTarget(d) ? '' : ' · moved target');
      button.onclick = () => openRecord(d, true);
      li.appendChild(button); draftList.appendChild(li);
    });
    if (!drafts.length) draftList.innerHTML = '<li class="empty">No drafts.</li>';
    $panel.querySelectorAll('ol.changes li').forEach((li, i) => {
      const b = bullets[i], itemId = b && b.ok ? b.id : '_text:' + i;
      const count = drafts.filter(d => d.itemId === itemId).length;
      const badge = li.querySelector('.draft-count'); badge.hidden = !count;
      badge.textContent = count + (count === 1 ? ' draft' : ' drafts');
    });
    document.getElementById('storage-status').hidden = storageAvailable;
  }
  function closePopover(restore) {
    if ($pop) $pop.remove();
    $pop = null; editor = null; document.body.classList.remove('editor-open');
    if (restore && editorTrigger && editorTrigger.isConnected) editorTrigger.focus();
    editorTrigger = null;
  }
  function openRecord(n, isDraft) {
    closePopover(false); setMenu(false);
    if (n.visual === '_text') goBullet(Number(String(n.itemId).split(':')[1]));
    else show(n.visual, n.state, null);
    const el = findTarget(n);
    if (el) el.scrollIntoView({ block:'center' });
    const saved = isDraft && n.savedId ? notes.find(x => x.id === n.savedId) : !isDraft ? n : null;
    openPopover(isDraft ? n : saved || n, el, saved || null);
  }
  function openPopover(record, anchorEl, saved) {
    closePopover(false);
    const original = record || recordFor(anchorEl);
    const prior = saved || (record && record.id ? record : null);
    const matching = drafts.find(d => sameTarget(d, original) && (d.savedId || null) === (prior ? prior.id : null));
    editor = { meta:{ itemId:original.itemId, scope:'visual', visual:original.visual, state:original.state,
      targetId:original.targetId || null, path:original.path, label:original.label },
      savedId:prior ? prior.id : null, draftId:matching ? matching.id : (record && record.savedId !== undefined ? record.id : null) };
    editorTrigger = anchorEl;
    const initial = matching ? matching.text : (record && record.text !== undefined ? record.text : prior ? prior.text : '');
    $pop = document.createElement('div'); $pop.className = 'popover';
    const moved = !anchorEl ? '<p class="status">Original target moved. This draft stays here until you choose a new target.</p>' : '';
    $pop.innerHTML = '<div class="where">' + escapeHtml(whereOf(original)) + ' · ' + escapeHtml(original.label) + '</div>' + moved
      + '<textarea aria-label="Note text" placeholder="What should change here?"></textarea>'
      + '<div class="row"><button class="save">Save</button><button class="close">Close</button><button class="discard">Discard draft</button>'
      + (prior ? '<button class="del">Delete saved note</button>' : '') + '</div><p class="status">Drafts are excluded from Copy notes.'
      + (storageAvailable ? '' : ' Notes and drafts last for this session only.') + '</p>';
    const ta = $pop.querySelector('textarea'); ta.value = initial;
    ta.oninput = () => {
      const text = ta.value;
      let d = drafts.find(x => x.id === editor.draftId);
      if (!text.trim() && !editor.savedId) {
        if (d) drafts = drafts.filter(x => x.id !== d.id);
        editor.draftId = null;
      } else if (d) d.text = text;
      else { d = Object.assign({ id:newId(), savedId:editor.savedId, text:text }, editor.meta); drafts.push(d); editor.draftId = d.id; }
      persist();
    };
    $pop.querySelector('.save').onclick = () => {
      const text = ta.value.trim(); if (!text) return;
      const id = editor.savedId || newId();
      const savedNote = Object.assign({ id:id, text:text }, editor.meta);
      const index = notes.findIndex(x => x.id === id);
      if (index < 0) notes.push(savedNote); else notes[index] = savedNote;
      drafts = drafts.filter(x => x.id !== editor.draftId);
      closePopover(true); persist();
    };
    $pop.querySelector('.close').onclick = () => closePopover(true);
    $pop.querySelector('.discard').onclick = () => { drafts = drafts.filter(x => x.id !== editor.draftId); closePopover(true); persist(); };
    const del = $pop.querySelector('.del');
    if (del) del.onclick = () => { notes = notes.filter(x => x.id !== editor.savedId); drafts = drafts.filter(x => x.id !== editor.draftId); closePopover(true); persist(); };
    ta.onkeydown = ev => { if (ev.key === 'Enter' && (ev.metaKey || ev.ctrlKey)) { ev.preventDefault(); $pop.querySelector('.save').click(); } };
    document.body.appendChild($pop); document.body.classList.add('editor-open');
    if (!phoneMedia.matches) {
      const r = anchorEl ? anchorEl.getBoundingClientRect() : document.getElementById('item-header').getBoundingClientRect();
      const W = 300, H = $pop.offsetHeight || 190;
      let top = r.top, left = r.right + 10;
      if (left + W > innerWidth) { left = Math.max(8, Math.min(r.left, innerWidth - W - 8)); top = r.bottom + 8; if (top + H > innerHeight) top = r.top - H - 8; }
      $pop.style.top = Math.max(50, top) + 'px'; $pop.style.left = left + 'px';
    }
    ta.focus();
  }
  let touchStart = null, touchMoved = false;
  document.addEventListener('touchstart', e => { const t = e.touches[0]; if (t) { touchStart = { x:t.clientX, y:t.clientY }; touchMoved = false; } }, { passive:true });
  document.addEventListener('touchmove', e => { const t = e.touches[0]; if (t && touchStart && Math.hypot(t.clientX - touchStart.x, t.clientY - touchStart.y) > 8) touchMoved = true; }, { passive:true });
  document.addEventListener('click', e => {
    if (e.target.closest('.popover')) return;
    const pin = e.target.closest('.pin');
    if (pin) { e.preventDefault(); const n = notes.find(x => x.id === pin.dataset.note); if (n) openRecord(n, false); return; }
    const li = e.target.closest('.panel ol.changes li');
    if (li) { goBullet(+li.dataset.i); return; }
    const panelLink = e.target.closest('.panel a[href*="#/"]');
    if (panelLink) { e.preventDefault(); const s = panelLink.getAttribute('href').split('#/')[1].split('/'); show(s[0], s[1], s[2]); return; }
    const local = e.target.closest('.visual[data-active] a[href^="#/"]');
    if (local) {
      e.preventDefault(); const s = local.getAttribute('href').split('#/')[1].split('/');
      if (s[0] === current.id) { show(s[0], s[1], s[2]); requestAnimationFrame(() => window.scrollTo(0, 0)); }
      else toast('Use Changes to select another change.');
      return;
    }
    if (e.target.closest('details')) return;
    if (touchMoved) { touchMoved = false; return; }
    if (annotating) {
      const t = target(e.target);
      if (t) { e.preventDefault(); openPopover(recordFor(t.el), t.el, null); }
      return;
    }
    const localState = e.target.closest('.visual[data-active] [data-local-state]');
    if (localState) { show(current.id, localState.dataset.localState, null); return; }
    const step = e.target.closest('.visual[data-active] .flow-card, .visual[data-active] .flow-branch');
    if (step) { const detail = step.querySelector('details'); if (detail) detail.open = !detail.open; }
  });
  document.addEventListener('keydown', e => {
    const editing = e.target.matches('textarea,input,[contenteditable="true"]') || !!e.target.closest('[contenteditable="true"]');
    if (e.key === 'Escape') { if ($pop) closePopover(true); return; }
    if (editing) return;
    if (e.key === 'a') { setAnnotating(!annotating); return; }
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.panel ol.changes li')) { e.preventDefault(); goBullet(+e.target.dataset.i); return; }
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.flow-card, .flow-branch')) {
      e.preventDefault();
      if (annotating) openPopover(recordFor(e.target), e.target, null);
      else { const detail = e.target.querySelector('details'); if (detail) { detail.open = !detail.open; detail.querySelector('summary').focus(); } }
    }
  });
  document.querySelectorAll('.flow-card, .flow-branch').forEach(el => { if (!el.hasAttribute('tabindex')) el.tabIndex = 0; });
  function notesText() {
    const lines = ['/continue ' + CHANGE, 'Review notes from ' + FILE + ' (' + notes.length + '):'];
    notes.forEach((n, i) => lines.push((i + 1) + '. ' + whereOf(n) + ' · ' + n.label + ' — ' + n.text));
    return lines.join('\n');
  }
  document.getElementById('copy').onclick = function () {
    if (!notes.length) return toast('No saved notes yet');
    const text = notesText(), buf = document.getElementById('copybuf'); buf.value = text;
    const done = () => toast('Copied ' + notes.length + ' saved note' + (notes.length === 1 ? '' : 's'));
    const fallback = () => { buf.select(); buf.setSelectionRange(0, 99999); document.execCommand('copy'); done(); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback); else fallback();
  };
  function toast(msg) { const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 1800); }

  // ── phone: the chrome's height drives the panel; the list is a sheet; step through changes ──
  function chromeHeight() { document.documentElement.style.setProperty('--chrome-h', document.querySelector('.chrome').offsetHeight + 'px'); }
  window.addEventListener('resize', chromeHeight);
  function setMenu(open) {
    document.body.classList.toggle('menu', open);
    document.getElementById('menu').setAttribute('aria-expanded', open);
  }
  document.getElementById('menu').onclick = () => setMenu(!document.body.classList.contains('menu'));
  document.getElementById('tools-toggle').onclick = function () {
    const open = document.getElementById('tools').classList.toggle('open');
    this.setAttribute('aria-expanded', open);
    chromeHeight();
  };
  function currentBullet() { const li = document.querySelector('.panel ol.changes li.on'); return li ? +li.dataset.i : -1; }
  function renderCount() {
    const i = currentBullet();
    document.getElementById('count').textContent = i < 0 ? bullets.length + ' changes' : (i + 1) + ' / ' + bullets.length;
    document.getElementById('prev').disabled = i <= 0;
    document.getElementById('next').disabled = i >= bullets.length - 1;
    const v = document.querySelector('.visual[data-active]');
    document.getElementById('viewport').style.display = v && v.classList.contains('screen') ? '' : 'none';
    chromeHeight();
  }
  document.getElementById('prev').onclick = () => { const i = currentBullet(); if (i > 0) goBullet(i - 1); };
  document.getElementById('next').onclick = () => { const i = currentBullet(); if (i < bullets.length - 1) goBullet(i + 1); };
  document.addEventListener('keydown', e => { if (e.target.matches('textarea,input,[contenteditable="true"]') || e.target.closest('[contenteditable="true"]')) return; if (e.key === 'ArrowRight') document.getElementById('next').click(); if (e.key === 'ArrowLeft') document.getElementById('prev').click(); });

  // ── viewport: phone or desktop layout of a screen; a phone is a phone already ──
  const phoneMedia = matchMedia('(max-width: 760px)');
  function setViewport(vp) {
    document.body.dataset.viewport = vp;
    document.querySelectorAll('#viewport button').forEach(b => b.setAttribute('aria-pressed', b.dataset.vp === vp));
  }
  document.querySelectorAll('#viewport button').forEach(b => b.onclick = () => setViewport(b.dataset.vp));
  setViewport(phoneMedia.matches ? 'phone' : 'desktop');
  phoneMedia.addEventListener('change', e => setViewport(e.matches ? 'phone' : 'desktop'));

  renderPanel();
  fromHash();
  chromeHeight();
</script>
</body>
</html>

~~~
<!-- end review.html -->
