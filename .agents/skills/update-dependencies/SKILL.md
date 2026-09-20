---
name: update-dependencies
description: Survey and update this WongStack source repo's toolchain and app dependencies on demand, check the OpenSpec CLI contract, and hand changed files to /save. Use only when asked to update dependencies.
user-invocable: true
---

# /update-dependencies

This skill is meta-repo-only and absent from [the payload inventory](../wong-sync/references/payload-files.json). It runs on demand, never by schedule. Editing only this skill is not a payload release; changing any payload file is.

## Survey and update

Report installed and latest versions for the OpenSpec CLI, agent-browser, gh, git, node, and each dependency in `app/package.json`. Use `openspec --version`, `agent-browser --version`, `gh --version`, `git --version`, `node --version`, and the package sources those tools use. `npm outdated` in `app/` reports Current, Wanted, and Latest; act on Latest, including majors. A normal nonzero `npm outdated` exit means updates were found. If everything is current, report it and stop without `/save`.

Update machine tools through their normal package source. A machine-level change that requires sudo or changes the runtime more than the user expects calls for user authorization under [required tools](../../../wiki/development/required-tools.md). For each major app dependency, read migration notes and apply them; update `app/package-lock.json` with `app/package.json`.

## Check the OpenSpec contract

WongStack uses the CLI directly through [the shared contract](../plan/references/openspec-cli.md). After a CLI update, verify `init --tools none`, `context`, `status --json`, artifact/apply/archive instructions, validation, and archive flags against a disposable fixture. Read any release notes that change these commands. Do not run `openspec update`, regenerate `openspec-*` agent skills, or patch their visibility. Report a changed CLI field and adapt the owning WongStack skill before saving; do not silently accept a missing contract.

Check payload link and config release checks if payload files changed. Bump `VERSION` and add a newest-first `CHANGELOG.md` entry for such a change. If only this meta-only skill or machine tools changed, say why no payload version bump is due.

## Hand off

Pass a nonempty diff to `/save`, which owns git and the CI gate. Do not define a separate local build gate or claim a green CI run proves every major update safe. Report each stage, including current surfaces, actual migrations, CLI contract evidence, and the checks CI ran. This skill does not update installed target repos or run on a schedule.
