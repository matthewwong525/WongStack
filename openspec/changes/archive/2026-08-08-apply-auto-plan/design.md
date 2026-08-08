## Context

The WongStack `/apply` wrapper currently delegates immediately to `openspec-apply-change`. That underlying skill resolves an explicit or inferred active change and stops when required artifacts are missing. This works after `/plan`, but it cannot distinguish a newly explored line of work from an unrelated sole active change. The checkout used during exploration demonstrates the failure: branch `apply-auto-plan` carries new intent while the only active entry, `improve-openspec-plans`, is an unrelated empty scaffold, so today's bare apply would select it and stop blocked.

`/plan`, OpenSpec apply, and `/save` already own artifact creation, task implementation, and git/checkpoint behavior respectively. The change should compose those owners rather than copy them.

## Goals / Non-Goals

**Goals:**

- Make `/explore` → `/apply` a reliable path that still creates a complete OpenSpec change before code is written.
- Prefer the current line of work over unrelated repository-global active-change state.
- Preserve explicit existing-change application and the completed `/apply` → `/save` handoff.
- Keep the behavior explainable as one preflight decision in the `/apply` wrapper.

**Non-Goals:**

- Do not merge `/plan` and `/apply` into one skill or make standalone `/plan` implement automatically.
- Do not copy artifact templates into `/apply` or git mechanics out of `/save`.
- Do not change `/continue`, which remains the cold-session branch checkout and orientation path.
- Do not edit the OpenSpec-generated `openspec-*` skills; target repositories regenerate those from their installed CLI.

## Decisions

### `/apply` owns the orchestration preflight

The WongStack wrapper will resolve whether the requested line of work has an apply-ready change before invoking `openspec-apply-change`. If not, it invokes `/plan`, then passes the resulting change name explicitly to the apply skill.

This belongs in the wrapper because the shortcut is WongStack workflow policy. Changing `openspec-apply-change` would edit a generated, non-payload file and would make a generic OpenSpec action responsible for WongStack's higher-level verb composition.

### Resolve relevance before repository-wide uniqueness

Resolution order is:

1. An explicit change reference or description supplied with `/apply`.
2. The change created or discussed in the current conversation.
3. An active change matching the current branch.
4. A sole active change only when the conversation establishes no different new work.
5. Ask when intent remains ambiguous.

This keeps the existing convenient sole-change selection for cold, context-free calls while preventing stale or unrelated work from stealing an explored request.

### Treat apply readiness as the boundary

The preflight checks OpenSpec status and its schema-defined `applyRequires`, rather than checking whether the literal `/plan` command appeared in the transcript. A ready change goes straight to implementation. Missing or incomplete required artifacts route through `/plan`; an explicitly selected existing change is completed in place rather than duplicated.

This is more durable than command-history detection because changes can be produced by `/plan`, `/improve`, `/wong-sync`, or another compliant OpenSpec author.

### Preserve a reviewable standalone plan

`/apply` itself is the user's authorization to plan and implement in one run. `/plan` invoked alone still stops once artifacts are apply-ready. The automatic path therefore removes ceremony without removing the deliberate review checkpoint for users who want it.

## Risks / Trade-offs

- **A conversation mentions multiple possible changes** → Ask rather than choosing; automatic planning only runs when the implementation intent is clear.
- **An existing incomplete change conflicts with `/plan`'s new-change guardrail** → The `/apply` handoff identifies the existing change and the user's request to continue it, so `/plan` completes the selected artifacts rather than asking whether to create a duplicate.
- **Documentation implies `/plan` is skipped** → Describe it as implicit planning and keep the canonical loop intact; the shortcut changes invocation count, not the durable stages.
- **A new payload link is valid here but absent in targets** → Run `node scripts/check-payload-links.mjs` with the required version and changelog update.

## Migration Plan

Update the skill and guidance atomically as a minor WongStack release. Existing explicit `/plan` → `/apply` and `/continue` flows remain compatible. Rollback is the prior markdown payload; no data or runtime migration is required.

## Open Questions

None.
