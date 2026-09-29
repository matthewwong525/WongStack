# Maintaining WongStack

Maintaining WongStack means editing the toolkit itself — this repo is the meta-repo that *ships* WongStack and *dogfoods* it at once. This section covers how to change what downstream repos receive without breaking their next install or update.

The **payload** is the set that [`/wong-sync`](../../.agents/skills/wong-sync/SKILL.md) brings into other repos and keeps current — a fresh install (fronted by [`/wong-setup`](../../.agents/skills/wong-setup/SKILL.md)) is the same manifest-driven sync in the case where every payload file happens to be absent. The [payload manifest](../../.agents/skills/wong-sync/references/payload-manifest.md) lists what ships. Everything else in the repo is scaffolding around it.

**Editing the payload is a release**, cut by the steps in [the payload rule](../../.agents/rules/payload.md), or the installer's updater can't detect it.

## Pages

- [Adding a skill](adding-a-skill.md) — create a new workflow skill and wire it through every surface that installs, versions, and advertises the payload.
- [Repo layout](repo-layout.md) — `.claude` and `.codex` are symlinks to `.agents`, and `CLAUDE.md` to `AGENTS.md`: which path to edit and to link, and why a repo-wide `grep` under-counts.
- [The payload rule](../../.agents/rules/payload.md) — the release steps and the link check every payload edit runs.
- [Development](../development/README.md) — the change loop and the conventions every install uses, this repo included.

Part of [the WongStack wiki](../README.md).
