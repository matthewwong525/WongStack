# Proposal: improve-openspec-plans

## Why

`/improve` still writes its implementation plans to a standalone `plans/NNN-*.md` directory — a format that predates v3.0.0, where OpenSpec became WongStack's planning layer. In a WongStack repo this leaves two parallel planning systems: audit output in `plans/` that `/continue`, `/save`, and `/ship` can't see, and OpenSpec changes that can't be produced by the audit. The advisor's plans should land where the rest of the toolkit plans.

## What Changes

- **`/improve` Phase 4 becomes OpenSpec-aware:** when the audited repo has an initialized `openspec/` directory, each selected finding is written as an OpenSpec change folder (`openspec/changes/<slug>/` with `proposal.md`, delta specs, `tasks.md`, and `design.md` when warranted) instead of a `plans/NNN-*.md` file, preserving the same self-contained-for-a-weak-executor standards.
- **`plans/` remains the fallback** for repos without OpenSpec — shadcn's original behavior is unchanged there.
- **Hard Rule 1's write boundary widens** to include `openspec/changes/` in OpenSpec mode (still strictly no source edits).
- **Variants that reference `plans/` are updated** for OpenSpec mode: `execute`, `reconcile`, `review-plan`, `--issues`, and the `docs` variant (docs findings become OpenSpec changes implemented via `/continue` → `/save` → `/ship`).
- **New reference** `references/openspec-plans.md` maps the plan template's sections onto OpenSpec artifacts so the plan-quality bar carries over.
- **Release bookkeeping:** CHANGELOG entry + VERSION minor bump (payload edit = release).

**Non-goals:** no changes to the audit itself (Recon/Audit/Vet), no rewrite of shadcn's references, no removal of the `plans/` pathway.

## Capabilities

### New Capabilities
- `improve-plan-output`: where and in what format `/improve` writes its plans — OpenSpec change folders when the target repo uses OpenSpec, `plans/` files otherwise — and how the downstream variants (`execute`, `reconcile`, `review-plan`, `--issues`, `docs`) locate and track those plans in each mode.

### Modified Capabilities

(none — `delivery-gate` is unaffected)

## Impact

- `.claude/skills/improve/SKILL.md` — Hard Rule 1, Phase 4, invocation variants.
- `.claude/skills/improve/references/openspec-plans.md` — new file.
- `CHANGELOG.md`, `VERSION` — release entry + minor bump.
- No other skills change; `/continue`/`/save`/`/ship` already operate on OpenSpec changes.
