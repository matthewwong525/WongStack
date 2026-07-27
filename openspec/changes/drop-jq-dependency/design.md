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
