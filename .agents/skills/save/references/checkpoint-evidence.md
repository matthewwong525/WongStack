# Read checkpoint evidence

Run `bash "$(git rev-parse --show-toplevel)/.claude/skills/save/scripts/change-candidates.sh" --json` from the working repo. Output contains `branch`, `base`, `sha`, `branchPaths`, `dirtyPaths` (two-character Git status and rename `from`), candidate `active`/`archive` arrays, `recorded` Branch matches, and candidate `sources`.

Complete arrays preserve ambiguity; an error is not an empty result, and an inspection error stops selection. Reuse evidence only while local state and fetched refs remain unchanged. No files, refs, or services are changed.

For a selected planning root use `--repo <repo>` and `--changes-dir <relative-changes-path>`. Use `--base <ref>` for another comparison branch. `--ref <fetched-ref>` inspects that tree without local dirt; `--branch <PR-head-name>` supplies the known branch when needed. Follow the [CLI contract](../../plan/references/openspec-cli.md); inspect external stores from their own repository and never replace a selected root with the default. Missing comparison bases require an explicit base. Existing `active|archive [ref]` calls keep sorted line output.

## Selection rungs

A verb selects a change by walking its own list of these rungs, in order. The first rung with exactly one candidate selects it. A rung with several candidates is ambiguous: ask, with [the candidates as the options](../../explore/references/asking-the-user.md), and do not fall through to a later rung.

| Rung | Selects |
|---|---|
| `explicit` | the change the user names, or the exact path a calling verb hands off |
| `session` | the change created, selected, or discussed in this session |
| `changed-active` | the one `active` candidate: an active folder in the dirty paths or the branch diff |
| `recorded-branch` | the one `recorded` candidate: an active proposal whose `**Branch:**` line names this branch |
| `sole-active` | the only entry in `openspec list`, and only when the session does not establish other work |
| `changed-archive` | the one `archive` candidate: an archived folder in the dirty paths or the branch diff |

A branch name alone never selects a change: a proposal with no Branch line is found only by an earlier rung. Keep the selected change name separate from the branch name.
