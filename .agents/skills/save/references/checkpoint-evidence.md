# Read checkpoint evidence

Run `bash "$(git rev-parse --show-toplevel)/.claude/skills/save/scripts/change-candidates.sh" --json` from the working repo. The read-only script prints JSON: the paths, base, and the `active`, `archive`, and `recorded` candidates with their `sources`.

Reuse the evidence only while local state and fetched refs are unchanged. Arrays are complete; an error is not an empty result, and stops selection.

Options: `--repo <repo>` and `--changes-dir <relative-changes-path>` for a selected planning root; `--base <ref>` for another comparison branch (required without a default); `--ref <fetched-ref>` to inspect that tree without local dirt; `--branch <PR-head-name>` for a known branch. Inspect an external store from its own repository, never swapping a selected root for the default ([CLI contract](../../plan/references/openspec-cli.md)). `active|archive [ref]` calls keep sorted line output.

## Selection rungs

Each verb walks its own list of rungs in order; the first with exactly one candidate selects it. Several → ask, with [them as the options](../../explore/references/asking-the-user.md); never fall through.

- `explicit` — the change the user names, or the exact path a calling verb hands off.
- `session` — a change created, selected, or discussed this session.
- `changed-active` — the one `active` candidate, from the dirty paths or branch diff.
- `recorded-branch` — the one `recorded` candidate: an active proposal whose `**Branch:**` line names this branch.
- `sole-active` — the only `openspec list` entry, when the session names no other work.
- `changed-archive` — the one `archive` candidate, from the same paths.

A branch name alone never selects a change: a proposal with no Branch line needs an earlier rung. Keep the change name separate from the branch name.
