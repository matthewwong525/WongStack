# Working on WongStack

Working on WongStack means editing the toolkit itself — this repo is the meta-repo that *ships* WongStack and *dogfoods* it at once. This section covers how to change what downstream repos receive without breaking their next install or update.

The **payload** is the set that [`/wong-sync`](../../.agents/skills/wong-sync/SKILL.md) brings into other repos and keeps current — a fresh install (fronted by [`/wong-setup`](../../.agents/skills/wong-setup/SKILL.md)) is the same manifest-driven sync in the case where every payload file happens to be absent: the workflow skills under [`.claude/skills/`](../../.agents/skills/), the [OpenSpec](https://github.com/Fission-AI/OpenSpec) planning layer (`openspec/`, driven through the CLI), this [`wiki/`](../README.md) wiki, [`VERSION`](../../VERSION), [`CHANGELOG.md`](../../CHANGELOG.md), and the `WONG-STACK:BEGIN/END` block in [`CLAUDE.md`](../../AGENTS.md). The canonical file-by-file list lives in one place: the [payload manifest](../../.agents/skills/wong-sync/references/payload-manifest.md) inside `wong-sync`. Everything else in the repo is scaffolding around it.

**Editing the payload is a release.** Any change a downstream repo would receive has to be versioned and explained, or the installer's updater can't detect it — so a payload edit always ends by bumping [`VERSION`](../../VERSION) (semver) and adding a newest-first [`CHANGELOG.md`](../../CHANGELOG.md) entry in the same change, then running the two release checks: `node scripts/check-payload-links.mjs` for links that fail in a target, and `node scripts/check-openspec-config.mjs` for a config the OpenSpec CLI cannot read. The [payload rule](../../.agents/rules/payload.md) owns the release steps.

## Processes

- [The change loop](the-change-loop.md) — how work moves from idea to shipped, archived spec: `/explore → /plan → /apply → /save → /continue → /ship`, each a thin verb over an OpenSpec step, with the change as a living handoff (Status header + append-only Decision log + PR-body mirror).
- [Staging walkthrough](staging-walkthrough.md) — why `/verify` probes the deployed preview, what you need for it, and what it deliberately is not.
- [Adding a skill](adding-a-skill.md) — create a new workflow skill and wire it through every surface that installs, versions, and advertises the payload.
- [Repository improvement](repository-improvement.md) — run or schedule the bounded `/improve` spot check without creating a second delivery workflow.
- [Scheduled routines](../../.agents/skills/routine/SKILL.md) — `/routine` puts any prompt or verb on a Paseo schedule, each run in its own worktree.
- [Repo layout](repo-layout.md) — `.claude` and `.codex` are symlinks to `.agents`, and `CLAUDE.md` to `AGENTS.md`: which path to edit and to link, and why a repo-wide `grep` under-counts.
- [Required tools](required-tools.md) — the whole toolchain is `git`, `gh`, Node, and `openspec`: why it stays that small, and how the payload handles JSON without a standalone `jq`.
- [Home](home.md) — the person's own repo, recorded once per machine: what every repo reads from it at session start, the private facts it receives, and saved browser logins.
- [Session memory](memory.md) — the private fact store: the start-of-session digest, capture by `/save` and the background run, consolidation, `#private`, and the memory key.
- [Secrets and environment variables](secrets.md) — the `.env.example`-as-source-of-truth convention: blank declarations stay on the active branch, while real values persist outside git in the primary worktree across linked checkouts.
- [Contributing upstream](../contributing.md) — the other side of the payload: how a target repo sends an improvement back by hand, and the generality bar it has to clear before you'd merge it here.
