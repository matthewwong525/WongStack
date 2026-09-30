---
name: update-dependencies
description: Update this source repo's toolchain and app dependencies, checking the OpenSpec CLI contract, only when asked.
user-invocable: true
---

# /update-dependencies

This skill is meta-repo only: it is absent from [the payload inventory](../wong-sync/references/payload-files.json), so no target gets it, and editing only it is no payload release. Run it on demand, never on a schedule.

## Run the script

Run `node .claude/skills/update-dependencies/scripts/update.mjs` and watch its log; in Claude Code, start it in the background. It surveys every tool, `app/`, and `scripts/tests/`, updates what is behind, majors included, and moves every OpenSpec pin together; [`server-setup.test.mjs`](../../../scripts/tests/server-setup.test.mjs) fails, naming the file, when one pin differs. Act on its lines:

- **`FAIL`:** fix what it names, then run it again; finished stages report current.
- **`needs you:`:** ask first, per [required tools](../../../wiki/development/required-tools.md).
- **`major:`:** read the linked notes and migrate. One you can't: restore its old range and rerun with `--hold <package>`; name it in the report.
- **`openspec:`:** the contract test ran. Check the release notes against [the shared contract](../plan/references/openspec-cli.md) and adapt the owning WongStack skill; never accept a missing field silently. [No generated layer](../plan/references/openspec-cli.md) exists: never run `openspec update` or regenerate `openspec-*` skills.
- **`status: current`:** say so and stop without `/save`.

Payload files changed → follow [the release rule](../../rules/payload.md); otherwise say why no release is due.

## Hand off

Pass a nonempty diff to `/save`; [the change loop](../../../wiki/development/the-change-loop.md#the-gate) owns git and the gate. Fix what CI catches, and never claim green CI proves every major safe. Report what moved, each major's migration or hold, the contract result, and the checks CI ran.
