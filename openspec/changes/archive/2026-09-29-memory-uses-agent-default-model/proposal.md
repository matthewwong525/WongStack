# Memory capture uses the agent's default model

**Status:** ready-to-ship
**Branch:** stack-codex-compatibility
**Open questions:** none

## Why

Automatic memory capture names a Codex model that ChatGPT-signed-in users can no longer run. Each model retirement can break capture again. Letting the installed agent choose its normal model keeps capture working as its available models change.

## What Changes

- **Memory capture uses the agent's normal model.** A background run uses the model Claude Code or Codex would choose on that computer. Someone who wants a separate memory model can still set one explicitly.
  ```text
  unsaved chat ──▶ memory run
                       │
                       ▼
                 agent default model
                       │
                       ▼
                  saved facts
  ```
- **The cost guidance matches the new choice.** Capture can use more of a person's model allowance when their normal model is larger; the guidance no longer promises the old small-model cost.

Non-goals: selecting the cheapest current model from a changing catalog, changing the memory store, or changing when capture runs.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `memory`: background capture inherits the agent CLI's default model unless a memory-specific override is set.

## Impact

- `.agents/skills/memory/scripts/run.mjs` and focused tests in `scripts/tests/memory-capture.test.mjs`.
- `wiki/development/memory.md` cost guidance and one `CHANGELOG.md` release entry.
- No new dependency, credential, or hand step for an installed repo.

## Decision log

- **2026-09-29** — Asked whether capture should use the agent default or keep choosing a small model → chose the agent default, accepting that capture may cost more to avoid model upkeep.
- **2026-09-29** — Assumed: keep `WONG_MEMORY_MODEL` and `WONG_MEMORY_CODEX_MODEL` as optional explicit overrides, because they already let someone separate memory costs from their normal agent setting without shipping another fixed model name.
- **2026-09-29** — Assumed: make the choice for both Claude Code and Codex, because the request is to stop maintaining memory model names across the stack; Claude's current `haiku` alias ages more gracefully but still overrides a person's normal model.
- **2026-09-29** — Assumed: this is a minor release, because an unattended run changes which model it uses by default and may use more allowance.
- **2026-09-29** — Assumed: CI stays in `/ship`'s checkpoint after the archive, because this one-go publication needs one checkpoint rather than an extra mid-build save.
- **2026-09-29** — Archive checkpoint: all tasks were checked and the memory spec was updated in the archive; the branch caught up with main at 27.5.1 and this release was numbered 27.6.0 for CI and publication.
