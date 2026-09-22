# Read checkpoint evidence

Run `bash "$(git rev-parse --show-toplevel)/.claude/skills/save/scripts/change-candidates.sh" --json` from the working repo. Output contains `branch`, `base`, `sha`, `branchPaths`, `dirtyPaths` (two-character Git status and rename `from`), candidate `active`/`archive` arrays, `recorded` Branch matches, `legacy.active`/`legacy.archive`, and candidate `sources`.

The owning verb keeps its selection policy. Complete arrays preserve ambiguity; an error is not an empty result. Reuse evidence only while local state and fetched refs remain unchanged. No files, refs, or services are changed.

For a selected planning root use `--repo <repo>` and `--changes-dir <relative-changes-path>`. Use `--base <ref>` for another comparison branch. `--ref <fetched-ref>` inspects that tree without local dirt; `--branch <PR-head-name>` supplies the known branch when needed. Follow the [CLI contract](../../plan/references/openspec-cli.md); inspect external stores from their own repository and never replace a selected root with the default. Missing comparison bases require an explicit base. Existing `active|archive [ref]` calls keep sorted line output.
