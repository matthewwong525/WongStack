# Maintaining WongStack

Maintaining WongStack means editing the toolkit itself — this repo is the meta-repo that *ships* WongStack and *dogfoods* it at once. This section covers how to change what downstream repos receive without breaking their next install or update.

The **payload** is the set that [`/wong-sync`](../../.agents/skills/wong-sync/SKILL.md) brings into other repos and keeps current — a fresh install (fronted by [`/wong-setup`](../../.agents/skills/wong-setup/SKILL.md)) is the same manifest-driven sync in the case where every payload file happens to be absent. The [payload manifest](../../.agents/skills/wong-sync/references/payload-manifest.md) lists what ships. Everything else in the repo is scaffolding around it.

**Editing the payload is a release**, cut by the steps in [the payload rule](../../.agents/rules/payload.md), or the installer's updater can't detect it.

## Pages

- [Adding a skill](adding-a-skill.md) — create a new workflow skill and wire it through every surface that installs, versions, and advertises the payload.
- [Measure a skill change](measure-a-skill-change.md) — run a skill's instructions against a practice site with planted mistakes, before and after an edit, and keep only what catches more.
- [Measure session speed](measure-session-speed.md) — count steps, seconds per step, repeated page reads, and failed-check rounds from this computer's session logs, to see whether a change made tasks faster.
- [Repo layout](repo-layout.md) — `.claude` and `.codex` are symlinks to `.agents`, and `CLAUDE.md` to `AGENTS.md`: which path to edit and to link, and why a repo-wide `grep` under-counts.
- [Test a setup change on a real install](test-a-setup-change.md) — install from an unpublished branch into a throwaway folder, what to walk, and how to remove it.
- [The landing page](landing-page.md) — the public site in `site/`, which no install receives: where its install wording lives, what it must never offer, its privacy promises, and how it is checked, previewed, and published.
- [The hosted app's archive](hosted-app-archive.md) — the app that ran at wongstack.com is shut down: what is gone, what is kept and where, and why its repo must never be published as it is.
- [The payload rule](../../.agents/rules/payload.md) — the release steps and the link check every payload edit runs.
- [Development](../development/README.md) — the change loop and the conventions every install uses, this repo included.

Part of [the WongStack wiki](../README.md).
