# evolve-change-loop

**Status:** ready-to-ship
**Open questions:** none

## Why

WongStack's downstream install in ClaymooApp evolved the OpenSpec change loop well past what the template ships — an append-only decision log + status header that make a change resumable "cold" from another machine, a PR body that mirrors the change, a standalone `/apply` implement verb split out of `/continue`, and a parallel `/ship` quality gate. These are stack-agnostic methodology wins that belong back in the source template. Deterministic, self-documenting handoffs are exactly what AI-driven work needs, and WongStack should teach them by default.

**Non-goals:** No Cloudflare/Vite/React/D1/Workers-Builds machinery enters WongStack — it stays stack-agnostic. The only piece from ClaymooApp's stack-specific layer we generalize is a neutral secrets-example convention (`.env.example` + a docs page), with no build-gate or preview-URL coupling.

## What Changes

- **Handoff methodology** in `/save` + `/continue`: `proposal.md` gains a `**Status:**` + `**Open questions:**` header (vocabulary: `in-progress | blocked (<on what>) | ready-to-ship | parked`) and an append-only `## Decision log`; `/save <note>` sets status and seeds a dated log entry; the PR body is regenerated every save as a **mirror** of the change; `/continue` recaps the last decision-log entries and runs a counts-only **drift check**.
- **BREAKING — split `/apply` out of `/continue`:** add a standalone `/apply` skill (live-session implement, fronts `/opsx:apply`). `/continue` becomes cold-resume — checkout branch, load change, then hand off to `/apply`. The loop grows from five verbs to six: `/explore ▶ /plan ▶ /apply ▶ /save ▶ /continue ▶ /ship`. Updates the `WONG-STACK` block, `CLAUDE.md`, `install-wong-stack`, and docs that describe the loop.
- **Richer `/ship` quality gate:** port ClaymooApp's three parallel gate subagents (doc-finder, test-runner, integration-reviewer), genericized — stripped of Cloudflare/D1 specifics — so `/ship` verifies tests + downstream integration + doc drift on any stack.
- **Generic secrets convention:** ship a stack-neutral `.env.example` pattern and a short docs page documenting it (the generalized lesson of `.dev.vars.example`); no Workers-Builds, preview-URL, or `wrangler` coupling.
- **Release bookkeeping:** `CHANGELOG.md` entry + `VERSION` bump to `4.0.0` (major — the loop's verb set changes).

## Capabilities

### New Capabilities
- `change-handoff`: The durable, resumable-cold handoff surface — proposal status header, append-only decision log, PR-body mirror, and `/continue` drift check.
- `workflow-loop`: The verb set and stage boundaries of the change loop, including the `/apply` vs `/continue` split (six-verb loop).
- `ship-quality-gate`: The parallel `/ship` gate agents (doc-finder, test-runner, integration-reviewer) as a stack-agnostic merge gate.
- `secrets-convention`: A stack-neutral secrets-example convention (`.env.example` + docs), decoupled from any build gate.

### Modified Capabilities
<!-- None. delivery-gate is unaffected — the CI-optional doctrine still holds; the new gate agents are additive and equally CI-agnostic. -->

## Impact

- **Skills:** new `.claude/skills/apply/`; rewrites of `save`, `continue`, `ship`; new `ship/agents/*.md` briefs; `install-wong-stack` updated to install `/apply` and teach the six-verb loop.
- **Docs:** `docs/development/the-change-loop.md` (six verbs + handoff surface), a new secrets-convention page, `docs/` index/README touch-ups.
- **Root payload:** `CLAUDE.md` `WONG-STACK` block + rules (six-verb loop, handoff), `README.md` user story, `CHANGELOG.md`, `VERSION` → `4.0.0`, a new root `.env.example`.
- **Consumers:** downstream installs adopt a new verb on update; the installer diffs and explains the `/apply` addition.

## Decision log

- **2026-07-16** — Implemented all four capabilities (17/18 tasks): handoff surface in `/save`+`/continue`, the split `/apply` skill + six-verb loop across every doctrine surface, the genericized three-agent `/ship` gate, and the stack-neutral `.env.example` secrets convention; bumped `VERSION` → 4.0.0. Per the user's calls, shipping on branch `climu-dev-vars-commands` (branch ≠ change name, so the archive is invoked explicitly) and carrying the plan-only `recommended-stack-guide` change along in the same PR. This entry itself dogfoods the new append-only Decision log (task 5.3).
