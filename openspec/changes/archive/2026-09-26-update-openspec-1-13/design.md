## Context

WongStack drives the OpenSpec CLI directly through [the CLI contract](../../../.agents/skills/plan/references/openspec-cli.md). A CLI update is safe when that contract holds.

## Goals / Non-Goals

**Goals:** pin 1.13.2 everywhere 1.8.0 was named, and keep live specs strictly valid in CI.

**Non-Goals:** other dependency updates; any skill behavior change.

## Decisions

- The contract was checked by the same fixture script under both versions, and the JSON key sets diffed. The only difference is one added field.
- `openspec validate --specs --strict --no-interactive` joins the `payload` job's release checks. It scopes to live specs, so an active change that is mid-draft on a branch cannot block its own save.

## Risks / Trade-offs

- A future OpenSpec release could tighten strict validation again and fail CI on existing specs → that failure names the spec and the fix, and the version stays pinned until someone updates it on purpose.
