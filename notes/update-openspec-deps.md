---
slug: update-openspec-deps
started: 2026-08-10
updated: 2026-08-10
consolidated:
---

# OpenSpec CLI 1.5.0 → 1.8.0

## What 1.8.0 changed upstream

- Delivery is skills-only. `openspec update` deletes any `.claude/commands/opsx/*.md` an older
  CLI generated, and writes a `.claude/skills/.openspec-target` marker (content: `agents`).
- The core profile now has six workflows — the sixth is `update` → the generated
  `openspec-update-change` skill (revise a change's planning artifacts, keep them coherent,
  never edits code).
- Regenerated skill additions: store-aware `planningHome.root` paths, sticky `--store` flag,
  stricter delta-spec selection during sync/archive (only `existingOutputPaths`, never inferred),
  and new `context`/`operationGuidance` prompt inputs treated as prompt-level contracts.
- The profile lives in the machine-global `~/.config/openspec/config.json`, not the repo's
  `openspec/config.yaml`. `openspec config profile core` sets it; `openspec update` applies it.

## The convention the user set (durable)

**Generated `openspec-*` skills are pristine upstream output — never edit them locally.** Any
WongStack behavior around an OpenSpec step belongs in the fronting verb skill. Rationale: the
updater rewrites generated skills from templates, so local edits are silently wiped on every CLI
update (this had already happened once — the assistant's first pass re-grafted the `/save`
handoff into `openspec-apply-change`, and the user reversed it). `/apply` already carried the
whole handoff (all-done → `/save` exactly once, gate-task exception, never-checkpoint-to-stop),
so dropping the in-skill copy lost nothing; the duplication dated from v10.2.0 and earlier.

Also stated: deprecated commands are not kept deliberately — the user was glad the `opsx`
pointer commands are gone, reversing the v8.5.0-era "kept deliberately" stance the manifest
recorded. And the `update` workflow is worth adopting even with no fronting verb yet.

## Open threads

- No WongStack verb fronts `openspec-update-change`. If revising a plan mid-flight becomes
  common, it could slot under `/plan` (which currently revises by re-invoking propose).
- Targets get the 1.8.0 layer only when they update their own CLI
  (`npm install -g @fission-ai/openspec@latest && openspec update`); the generated skills are
  per-repo, not payload, so `/wong-sync` does not deliver this.
- The 1.8.0 generated `openspec-apply-change` on all-done says "suggest archive" and on blocked
  suggests `/openspec-continue-change` (not installed under the custom-profile era; core profile
  doesn't generate it either — it's a different upstream profile's skill). `/apply`'s wrapper
  text overrides both in practice; worth watching for confusion.
