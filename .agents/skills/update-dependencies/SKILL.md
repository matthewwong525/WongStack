---
name: update-dependencies
description: Update this source repo's toolchain and app dependencies and check the OpenSpec CLI contract, only when asked.
user-invocable: true
---

# /update-dependencies

This skill is meta-repo only: it is absent from [the payload inventory](../wong-sync/references/payload-files.json), so no target gets it, and editing only it is no payload release. Run it on demand, never on a schedule.

## Survey and update

Report installed (`--version`) and latest versions of `openspec`, `agent-browser`, `gh`, `git`, `node`, each `app/package.json` dependency, and each test tool in `scripts/tests/package.json`. Act on `npm outdated`'s Latest in `app/` and `scripts/tests/`, majors included; its nonzero exit is normal. Test tools are pinned exactly: bump the pin and `scripts/tests/package-lock.json` together. All current → say so and stop without `/save`.

Update machine tools normally; ask first, per [required tools](../../../wiki/development/required-tools.md), when that needs sudo or changes the runtime more than the user expects. Apply each major's migration notes, and update `app/package-lock.json` with `app/package.json`.

## Check the OpenSpec contract

Move every OpenSpec pin together: `.github/workflows/payload.yml`, `server/setup.sh`, `.agents/skills/save/references/preconditions.md`, and `.github/CONTRIBUTING.md`. [`scripts/tests/server-setup.test.mjs`](../../../scripts/tests/server-setup.test.mjs) fails, naming the file, when one differs from `payload.yml`'s.

After a CLI update, check `init --tools none`, `context`, `status --json`, artifact/apply/archive instructions, validation, and archive flags against a disposable fixture, the release notes, and [the shared contract](../plan/references/openspec-cli.md). [No generated layer](../plan/references/openspec-cli.md) exists: never run `openspec update` or regenerate or patch `openspec-*` skills. Report a changed CLI field and adapt the owning WongStack skill before saving; never silently accept a missing contract.

Payload files changed → follow [the release rule](../../rules/payload.md); otherwise say why no release is due.

## Hand off

Pass a nonempty diff to `/save`; [the change loop](../../../wiki/development/the-change-loop.md#the-gate) owns git and the gate. Never claim green CI proves every major safe. Report each stage: current surfaces, migrations, CLI contract evidence, and the checks CI ran.
