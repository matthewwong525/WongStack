## Why

`install-wong-stack` only flows one way: WongStack → target repo. When someone improves a WongStack skill, doc convention, or hook *while working in a target repo* (e.g. ClaymooApp), there is no first-class way to push that improvement back up. The result is drift — WongStack, the source of truth, falls behind its own installs. We need the inverse path so improvements made downstream can be contributed back upstream without leaking app-specific code.

## What Changes

- Add a new source-only meta-skill, `contribute-wong-stack`, that runs **from a target repo** and pushes WongStack payload improvements **up into a WongStack clone** (upstream only — downstream stays `install-wong-stack`'s job).
- It reuses the **same payload set** `install-wong-stack` copies *into* a target (workflow skills, `docs/` convention pages, the auto-push hook, the `CLAUDE.md` `WONG-STACK` block), and diffs **only those files** between the target repo and a user-provided WongStack clone (`$WS`). Non-payload files (app/business skills like `royalty-statement`, `notion`, `server`; and `VERSION`/`CHANGELOG.md`, which the installer never copies into a target) are never read or copied, so nothing local can leak upstream. `VERSION`/`CHANGELOG.md` are touched only by the release ritual, in `$WS`.
- For each drifted manifest file it shows the diff and asks **keep-WongStack / take-from-repo / skip**, per file, then copies accepted changes into `$WS`.
- On close it performs the release ritual **in `$WS`**: bump `VERSION` (semver) and add a newest-first `CHANGELOG.md` entry describing what was upstreamed. It leaves `$WS` as a dirty working tree ready for `/save` — it does **not** run git itself (the WongStack skills own git).
- `contribute-wong-stack` is a **source-only meta-skill, excluded from the copied payload** exactly as `install-wong-stack` is ("the payload minus the meta-skills"), and made available in targets via the same optional symlink mechanism. `install-wong-stack` is updated to exclude it from the copy and to offer symlinking it alongside the installer.
- **Non-goals:** downstream sync (install already does it), git subtree/remote tooling, auto-merging without per-file confirmation, and touching anything outside the manifest.

## Capabilities

### New Capabilities
- `contribute-wong-stack`: an upstream-only, guided, question-driven skill that diffs the WongStack payload manifest between a target repo and a WongStack clone, applies approved per-file changes upstream, and performs the VERSION + CHANGELOG release ritual in the clone.

### Modified Capabilities
<!-- No existing openspec/specs/ capability changes; install-wong-stack's behavior change is captured as a task, not a spec delta (its behavior is not spec-tracked here). -->

## Impact

- **New:** `.claude/skills/contribute-wong-stack/SKILL.md`.
- **Modified:** `.claude/skills/install-wong-stack/SKILL.md` (exclude the new meta-skill from the copied payload; offer to symlink it). `CLAUDE.md` `WONG-STACK` block / skill list and `README.md` (mention the upstream path). `VERSION` bump + `CHANGELOG.md` entry.
- **No runtime code, no dependencies, no CI** — the payload is prose; the gate is PR review.
