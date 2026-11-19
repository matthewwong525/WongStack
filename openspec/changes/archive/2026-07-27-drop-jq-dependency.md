<!-- openspec-archive v1 2026-07-27-drop-jq-dependency -->
<!-- file proposal.md utf8 3965 -->
# Drop the jq dependency

**Status:** ready-to-ship
**Open questions:** none

## Why

WongStack's payload requires `jq` on PATH, but only three places actually use the standalone binary — every other `--jq` in the payload is `gh`'s own embedded jq (gojq), which costs nothing. That leaves a real external dependency, and a `wong-setup` preflight that gates onboarding on it, for a handful of trivial JSON reads. On a machine with `gh` but no `jq` — a common shape — `wait-for-checks.sh` silently produces empty output and `/wong-sync` Step 0 resolves every manifest field to empty.

## What Changes

- Rewrite `save/scripts/wait-for-checks.sh` to do its filtering with `gh pr checks --jq` (gh's built-in gojq) plus plain shell, removing all four pipes to a standalone `jq`.
- Reframe `/wong-sync` Step 0's four manifest reads: instead of `jq -r` shelling out, the skill instructs the agent to read `.claude/.wong-stack.json` directly and note `commit`, `upstream.repo`, `upstream.fork`, `upstream.clone` — with the defaults and `~` expansion stated in prose.
- Drop `jq` from the `wong-setup` GitHub-readiness preflight; the required external tools become `git`, `gh`, and `openspec`.
- Document the resulting rule so it doesn't regress: payload scripts and skills may use `gh --jq`, never a standalone `jq`.
- Mirror every skill edit across both `.agents/skills/` and `.claude/skills/`, which are byte-identical copies.
- Release ritual: bump `VERSION`, add a newest-first `CHANGELOG.md` entry.

Non-goals: no change to what `wait-for-checks.sh` reports (same four RESULT lines, same semantics), no change to the manifest schema, no swap to `python3`/`node` as a replacement parser.

## Capabilities

### New Capabilities
- `toolchain-dependencies`: the external commands the WongStack payload is allowed to depend on, and the rule that JSON handling goes through `gh --jq` rather than a standalone `jq`.

### Modified Capabilities
<!-- None. The `wong-setup` readiness preflight's tool list is not spec-level in
     `install-onboarding`; the new `toolchain-dependencies` capability owns it. -->


## Impact

- `.agents/skills/save/scripts/wait-for-checks.sh` + `.claude/` mirror
- `.agents/skills/wong-sync/SKILL.md` Step 0 + `.claude/` mirror
- `.agents/skills/wong-setup/SKILL.md` preflight item 9 + `.claude/` mirror
- `wiki/` — a short note on the allowed toolchain
- `VERSION`, `CHANGELOG.md`
- Removes one external dependency for every WongStack target repo; the only behavior change for users who already have `jq` is that the CI gate stops reporting false green (see the Decision log).

## Decision log

- **2026-07-27** — Implemented in full; all 13 tasks complete, `VERSION` 6.4.0. Two findings changed the shape of the work. **(1)** The `RC -ne 0` half of `wait-for-checks.sh`'s no-checks guard is an independent bug that had to be dropped rather than carried over: `gh pr checks` exits `8` on pending and `1` on failure, so the exit code reports the *verdict*, not whether checks exist — meaning any PR with live checks took the `RESULT: NONE` branch on the first poll and `/save`/`/ship` skipped the gate entirely. This hit every user, `jq` installed or not, and is now fixed alongside the jq-specific false-`SUCCESS` bug; captured in design.md under "Correction found during implementation". **(2)** The planned `.agents/` ↔ `.claude/` mirroring step was a no-op — `.claude` is a committed *symlink* to `.agents`, so there is one skill tree, not two; the design risk is struck through and task 5.1 records why. Also decided the new `wiki/development/required-tools.md` stays **out** of the wong-sync payload manifest (it documents working on WongStack itself, like `the-change-loop.md`), which meant removing the link to it I had added in `wong-setup/SKILL.md` — that skill *is* synced, so the link would dangle in every target repo. Ruled out swapping `jq` for `python3`/`node`: trades one dependency for a less universal one.

<!-- end proposal.md -->
<!-- file design.md utf8 5802 -->
## Context

The payload has 20 `jq` mentions across the skills. Sorting them by what they actually require:

```
 gh ... --jq '...'          12 sites   gh embeds gojq — no external binary   ✓ free
 echo "$JSON" | jq '...'     4 sites   wait-for-checks.sh                    ✗ real dep
 jq -r '...' "$MF"           4 sites   wong-sync SKILL.md Step 0             ✗ real dep
 "jq?" preflight             1 line    wong-setup SKILL.md item 9            ✗ gates on it
```

On a machine with `gh` but no `jq` (verified: this very environment), the two real sites fail quietly rather than loudly. `wait-for-checks.sh` runs `set -uo pipefail` without `-e`, so `PENDING` becomes empty, `${PENDING:-0}` defaults to 0, and the script reports `RESULT: SUCCESS` for a PR whose checks are still running or already red. `/wong-sync` Step 0 resolves `BASE`/`UPSTREAM`/`FORK`/`WS` to empty, so the sync silently falls back to defaults and re-clones. Both are wrong-answer failures, not crashes — which is why this hasn't been noticed.

## Goals / Non-Goals

**Goals:**
- Remove `jq` from WongStack's external dependency set entirely.
- Preserve `wait-for-checks.sh`'s contract exactly: the same four `RESULT:` lines with the same meanings and the same trailing detail lines.
- Make the rule durable — a wiki note plus the preflight change, so a future edit doesn't reintroduce a bare `jq`.

**Non-Goals:**
- Replacing `jq` with `python3` or `node`. That trades one dependency for another; both are less universally present than `gh`, which WongStack already hard-requires.
- Touching the 12 `gh --jq` sites. They're already dependency-free.
- Changing `.claude/.wong-stack.json`'s schema or `wait-for-checks.sh`'s polling cadence or timeout.

## Decisions

**1. `wait-for-checks.sh` filters with `gh pr checks --jq`, counts with shell.**

`gh pr checks` accepts `--jq` and applies gh's embedded gojq to the response before printing. Emit one tab-delimited line per check and let the existing shell do the arithmetic:

```bash
LINES=$(gh pr checks --json name,bucket,link \
  --jq '.[] | "\(.bucket)\t\(.name)\t\(.link)"' 2>/dev/null)
```

Then `grep -c '^pending'`, `grep -E '^(fail|cancel)'`, and `cut`/`printf` produce the same output the four `jq` filters did. One `gh` call per poll, same as today — the script already re-fetched every iteration.

*Alternative considered:* keep the single `--json` fetch and parse the raw JSON in bash. Rejected — hand-rolled JSON parsing in shell is exactly the fragility `jq` existed to avoid, and gojq is right there.

*Note on the empty case:* the current no-checks detection (`RC -ne 0 || -z "$JSON" || "$JSON" = "[]"`) becomes simply `-z "$LINES"`, since a `--jq` filter over `[]` prints nothing.

**Correction found during implementation:** the `RC -ne 0` half of that guard is itself a bug and must be dropped, not carried over. `gh pr checks` exits **8** when checks are merely pending and **1** when any check failed — the exit code reports the *verdict*, not whether checks exist. So the current script takes the `RESULT: NONE` branch on the first poll of any PR with running or failing checks, meaning `/save` and `/ship` skip waiting entirely and fall back to "no CI configured." Emptiness of the output is the only reliable no-checks signal. This is a second silent wrong-answer bug in the same guard, independent of the jq one, and it affects users who *do* have jq installed.

**2. `/wong-sync` Step 0 reads the manifest as an agent, not a subshell.**

The four values are scalars from a ~6-line local JSON file, consumed by an agent that is about to read a dozen other files anyway. Replacing the bash block with an instruction — *read `.claude/.wong-stack.json`; note `commit`, `upstream.repo` (default `https://github.com/matthewwong525/WongStack`), `upstream.fork`, `upstream.clone` with `~` expanded to `$HOME`; any of them may be absent on older manifests* — is both dependency-free and more robust than `// empty`: it handles the pre-2.0 `.wong-framework.json` filename and malformed files by reading, not by silently yielding "".

This is the more interesting decision philosophically: WongStack skills are instructions to an agent, so a shell incantation is only worth it when determinism or volume demands it. Four scalars is neither.

*Alternative considered:* `grep`/`sed` extraction. Rejected — brittle against formatting, and strictly worse than having the agent look.

**3. The allowed toolchain is `git`, `gh`, `openspec`.**

Stated once in the wiki and reflected in the `wong-setup` preflight, with the corollary rule: JSON in payload scripts goes through `gh --jq`; a bare `jq` is not available.

## Risks / Trade-offs

- **gojq is not jq.** → The filters used here (`select`, `map`, string interpolation, array indexing) are identical in both. Nothing in the payload uses a jq-only extension, and the rule confines future JSON work to `gh --jq`, where gojq is the only implementation in play — so there's no silent divergence to drift into.
- **Tab-delimited parsing breaks if a check name contains a tab.** → GitHub check names come from workflow/job names, which cannot contain tabs. Field order puts `link` last regardless, so a stray tab would corrupt display, not control flow.
- **Fixing the silent-success bug changes observed behavior for jq-less users.** → That is the point: a red PR will now report `RESULT: FAILURE` where it previously reported `SUCCESS`. Worth calling out in the CHANGELOG as a fix, not just a refactor.
- ~~**The `.agents/` and `.claude/` skill trees are byte-identical committed copies.**~~ → Not a risk: `.claude` is a committed *symlink* to `.agents`, so there is exactly one copy of every skill and no mirroring step is needed. (Assumption corrected during implementation.)

<!-- end design.md -->
<!-- file tasks.md utf8 2659 -->
## 1. wait-for-checks.sh

- [x] 1.1 Rewrite the poll loop in `.agents/skills/save/scripts/wait-for-checks.sh` to fetch tab-delimited lines via `gh pr checks --json name,bucket,link --jq '.[] | "\(.bucket)\t\(.name)\t\(.link)"'`, per design.md Decision 1
- [x] 1.2 Replace the four `jq` filters with shell equivalents — pending count, fail/cancel selection, and the two detail-line printers — preserving the exact `RESULT:` lines and indented `  - name  link` / `  - name (still running)` output
- [x] 1.3 Update the no-checks guard to `-z "$LINES"` alone — dropping the `RC -ne 0` half, which was a second silent bug (`gh pr checks` exits 8 on pending / 1 on failure, so the old guard reported `NONE` for any live PR); see design.md "Correction found during implementation" — and confirm the header comment still describes the four results accurately
- [x] 1.4 Verify no `| jq` remains in the script and dry-run it in this repo (expect `RESULT: NONE` with no PR)

## 2. wong-sync Step 0

- [x] 2.1 Replace the `jq -r` bash block in `.agents/skills/wong-sync/SKILL.md` Step 0 with prose instructing the agent to read `.claude/.wong-stack.json` and note `commit`, `upstream.repo`, `upstream.fork`, `upstream.clone`, per design.md Decision 2
- [x] 2.2 State in that prose the default for `upstream.repo`, the `~` → `$HOME` expansion for `upstream.clone`, and that absent fields are absent (not empty strings) on older manifests
- [x] 2.3 Check the rest of `wong-sync/SKILL.md` — including Step 6's manifest write — for any other standalone `jq` and convert it the same way

## 3. wong-setup preflight

- [x] 3.1 Drop `jq?` from the GitHub-readiness item in `.agents/skills/wong-setup/SKILL.md` and state the required set as `git`, `gh` (installed + authed), a resolving `origin`, and `openspec`

## 4. Documentation

- [x] 4.1 Add a short "Required tools" note to `wiki/development/` recording the `git` / `gh` / `openspec` set and the rule that JSON goes through `gh --jq`, never a standalone `jq`; link it from `wiki/development/README.md`
- [x] 4.2 Sweep the whole payload for remaining standalone-`jq` references in prose (skills, wiki, CLAUDE.md, README.md) and fix any stragglers

## 5. Mirror and release

- [x] 5.1 ~~Apply every skill and script edit to the `.claude/skills/` mirror~~ — no-op: `.claude` is a committed symlink to `.agents`, so the trees are one tree; `diff -rq` confirmed empty
- [x] 5.2 Bump `VERSION` to 6.4.0 (payload behavior change, backwards compatible)
- [x] 5.3 Add a newest-first `CHANGELOG.md` entry covering the dependency removal and the `wait-for-checks.sh` silent-false-SUCCESS fix noted in design.md Risks

<!-- end tasks.md -->
<!-- file specs/toolchain-dependencies/spec.md utf8 3609 -->
## ADDED Requirements

### Requirement: The payload depends only on git, gh, and openspec

The WongStack payload SHALL require no external command-line tools beyond `git`, `gh`, and `openspec`. No payload script or skill SHALL invoke a standalone `jq`, `python`, `node`, or other interpreter to do work the agent or an already-required tool can do.

#### Scenario: Target repo has gh but not jq

- **WHEN** any WongStack skill or script runs in a repo on a machine where `git`, `gh`, and `openspec` are installed but `jq` is not
- **THEN** every skill and script completes with correct results, invoking no command outside that set

#### Scenario: Onboarding preflight

- **WHEN** `/wong-setup` runs its readiness check
- **THEN** it checks for `git`, `gh` (installed and authenticated), a resolving `origin` remote, and `openspec`
- **AND** it does not check for or require `jq`

### Requirement: JSON handling goes through gh's embedded filter

Where a payload script must filter or reshape JSON returned by GitHub, it SHALL use `gh`'s built-in `--jq` flag rather than piping to a standalone `jq`. Filters SHALL stay within the syntax common to jq and gojq (`gh`'s embedded implementation).

#### Scenario: Script needs a subset of a gh response

- **WHEN** a payload script needs specific fields out of a `gh` API or `gh pr` response
- **THEN** it passes a `--jq` expression to the `gh` invocation itself
- **AND** no `| jq` pipeline appears anywhere in the payload

### Requirement: Skills read local JSON directly rather than shelling out

Where a skill needs values from a small local JSON file — such as the manifest at `.claude/.wong-stack.json` — the skill SHALL instruct the agent to read the file and note the values, stating each field's default and any expansion (for example `~` → `$HOME`) in prose, rather than shelling out to a JSON parser.

#### Scenario: wong-sync resolves its manifest

- **WHEN** `/wong-sync` Step 0 needs `commit`, `upstream.repo`, `upstream.fork`, and `upstream.clone`
- **THEN** the skill directs the agent to read the manifest file and note those values, applying the documented default for `upstream.repo` and expanding `~` in `upstream.clone`
- **AND** absent fields are recognized as absent rather than silently resolving to an empty string

### Requirement: Check-waiting reports the true gate result without jq

`wait-for-checks.sh` SHALL determine and report the aggregate check result — `SUCCESS`, `FAILURE`, `NONE`, or `TIMEOUT`, each on a single `RESULT:` line, with failing or still-pending check names listed after `FAILURE` and `TIMEOUT` — using only `gh` and shell built-ins. It MUST NOT report `SUCCESS` on a run whose checks are pending, failed, or unreadable. Because `gh pr checks` exits non-zero when checks are merely pending or failing, the script MUST NOT treat that exit code as a "no checks" signal; emptiness of the filtered output is the only such signal.

#### Scenario: Failing checks on a machine without jq

- **WHEN** the script runs against a PR with at least one failed or cancelled check, on a machine with no standalone `jq`
- **THEN** it prints `RESULT: FAILURE` followed by the name and link of each failing check

#### Scenario: Checks are still running

- **WHEN** the script polls a PR whose checks are pending, causing `gh pr checks` to exit non-zero
- **THEN** it keeps waiting rather than reporting `RESULT: NONE`

#### Scenario: No checks configured

- **WHEN** `gh pr checks` reports no checks for the branch
- **THEN** the script prints `RESULT: NONE` and exits, so the caller falls back to PR review as the gate

<!-- end specs/toolchain-dependencies/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-07-27

~~~
<!-- end .openspec.yaml -->
