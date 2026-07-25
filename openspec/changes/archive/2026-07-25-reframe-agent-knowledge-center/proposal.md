## Why

WongStack's docs currently frame the product as a Claude Code workflow for building apps, with setup language that over-emphasizes fit assessment. The clearer thesis is that WongStack turns a repo into an agent-readable knowledge center: processes are centralized, agents run those processes, and reusable knowledge is captured as work happens.

## What Changes

- Reframe the README around a repo-native AI knowledge center instead of "building apps with Claude Code."
- Make the front door agent-agnostic: Claude Code is a supported runner, but the durable unit is repo files, instructions, process, and knowledge.
- Add wiki documentation for the WongStack philosophy: centralize processes, make them agent-runnable, capture knowledge during execution, and compound that knowledge over time.
- Update generic WongStack context so installed repos describe the wiki/OpenSpec/skills system as shared agent memory.
- Reduce public setup wording that feels like an admissions test while preserving guided setup, consent before file changes, and clear mismatch handling when setup genuinely cannot work.
- Keep the release ritual: changelog entry and semver patch bump.

Non-goals:

- No behavior changes to git, OpenSpec, `/save`, `/ship`, or `/wong-sync`.
- No replacement of OpenSpec or the progressive-disclosure wiki model.
- No claim that WongStack works without a repo, files, or an agent capable of reading and editing files.

## Capabilities

### New Capabilities

- `agent-knowledge-center`: Documents the philosophy and repo structure for WongStack as an AI knowledge center.

### Modified Capabilities

- `install-onboarding`: Reframes the README/setup front door as agent-agnostic guided onboarding and removes the requirement that the README foreground fit assessment.

## Impact

- Affected docs: `README.md`, `wiki/README.md`, new wiki philosophy page, `CLAUDE.md`, `CHANGELOG.md`, `VERSION`.
- Affected setup surfaces: `.claude/skills/wong-setup/SKILL.md` and `.claude/skills/wong-setup/references/fit-playbook.md`.
- No runtime dependencies, APIs, or build systems are affected.
