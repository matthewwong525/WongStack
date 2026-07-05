# Working on WongStack

Working on WongStack means editing the toolkit itself — this repo is the meta-repo that *ships* WongStack and *dogfoods* it at once. This section covers how to change what downstream repos receive without breaking their next install or update.

The **payload** is the set that [`/install-wong-stack`](../../.claude/skills/install-wong-stack/SKILL.md) copies into other repos: the workflow skills under [`.claude/skills/`](../../.claude/skills/), this [`docs/`](../README.md) wiki, [`VERSION`](../../VERSION), [`CHANGELOG.md`](../../CHANGELOG.md), and the `WONG-STACK:BEGIN/END` block in [`CLAUDE.md`](../../CLAUDE.md). Everything else in the repo is scaffolding around it.

**Editing the payload is a release.** Any change a downstream repo would receive has to be versioned and explained, or the installer's updater can't detect it — so a payload edit always ends by bumping [`VERSION`](../../VERSION) (semver) and adding a newest-first [`CHANGELOG.md`](../../CHANGELOG.md) entry in the same change. The "Working on WongStack" notes in [`CLAUDE.md`](../../CLAUDE.md) are the short form of this rule; the pages here are the long form.

## Processes

- [Adding a skill](adding-a-skill.md) — create a new workflow skill and wire it through every surface that installs, versions, and advertises the payload.
