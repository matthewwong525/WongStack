## Context

WongStack is a stack-agnostic workflow template. Its downstream install in ClaymooApp (a Cloudflare Workers + Vite/React app) evolved the change loop further than the source: a status-headed, decision-logged proposal that resumes cold; a PR body that mirrors the change; a standalone `/apply` verb; and a three-agent `/ship` gate. This change back-ports the **stack-agnostic** parts and generalizes exactly one stack-specific idea (a secrets-example file), while deliberately leaving Cloudflare/Workers-Builds/D1/preview-URL machinery in ClaymooApp.

The current WongStack `/save` has none of the handoff surface; `/continue` fronts `/opsx:apply` directly (no separate `/apply`); `/ship` waits on CI when present and merges, with no gate agents. The delivery-gate spec (CI-optional) is unaffected and must stay true.

## Goals / Non-Goals

**Goals:**
- Back-port the handoff methodology (status header, append-only decision log, PR-body mirror, drift check) into `/save` and `/continue`.
- Split `/apply` out as its own verb; make `/continue` cold-resume that delegates to it.
- Port the three `/ship` gate agents, genericized to any stack.
- Ship a stack-neutral `.env.example` secrets convention + a docs page.
- Keep WongStack stack-agnostic and keep the delivery-gate (CI-optional) doctrine intact.

**Non-Goals:**
- No Cloudflare/Vite/React/D1/Workers-Builds/wrangler/preview-URL machinery in the payload.
- No change to OpenSpec itself or to the rule that the WongStack skills own all git while OpenSpec never runs git.
- No new external dependencies.

## Decisions

**1. One change, four capabilities — not four changes.** The four workstreams share the same cross-cutting edits (`CLAUDE.md` `WONG-STACK` block, `README.md`, `install-wong-stack`, `docs/development/the-change-loop.md`). Splitting them would triple the doctrine churn and risk contradictory loop descriptions mid-flight. Ship as one change with grouped task sections. *Alternative — split the `/apply` breaking change out first:* rejected because the doctrine surfaces can't describe five verbs and six verbs simultaneously; the loop must flip atomically.

**2. `/apply` fronts `/opsx:apply`; `/continue` delegates to `/apply`.** Mirror ClaymooApp: `/apply` is the thin front-door over `openspec-apply-change`; `/continue` keeps the git checkout + change-load + drift-check, then invokes the `/apply` skill (Skill tool) instead of `/opsx:apply` directly. This keeps a single implement path. *Alternative — leave apply folded in `/continue`:* rejected; the user asked for the split and it cleanly separates "resume cold" from "implement now."

**3. The CI gate stays honored-when-present; the gate agents are additive.** The `/ship` quality gate (test-runner + integration-reviewer + doc-finder) is layered on top of the existing CI-when-present-else-PR-review gate, not a replacement. ClaymooApp's versions are wired to Cloudflare Workers Builds; the ported briefs must discover the test command and downstream callers from the repo, asserting nothing about the platform. This preserves the `delivery-gate` spec.

**4. Generalize `.dev.vars` → `.env.example`, docs-only, no machinery.** Per the user's "generic secrets convention only" call, we ship a documented `.env.example` + a wiki page and a `.gitignore` entry for the real file — but none of ClaymooApp's build-log-fetch/preview-URL logic. The value is the *convention* (example file as the source-of-truth variable list), not the Cloudflare plumbing.

**5. Major version bump (`3.1.0 → 4.0.0`).** The loop's public verb set changes (a new `/apply` stage) — a breaking change for anyone whose muscle memory or automation encodes the five-verb loop. The installer's diff-and-explain flow covers the upgrade.

## Risks / Trade-offs

- **Doctrine drift across many files** → the loop is described in `CLAUDE.md`, `README.md`, docs, and `install-wong-stack`; missing one leaves a stale five-verb description. *Mitigation:* a task-list sweep of every loop mention (grep for `/continue` and the arrow diagram) as an explicit verification step.
- **This repo dogfoods WongStack** → editing `save`/`continue`/`ship` changes how *this very change* gets shipped. *Mitigation:* land skill edits, then use the updated skills for the `/save`/`/ship` of this change; verify against the new behavior.
- **Gate agents slow `/ship`** → three subagents add latency. *Mitigation:* they run in parallel, in the background, while the push/CI proceeds — collected at the gate step, not serially.
- **Genericizing the agents loses ClaymooApp's sharpness** → the ported briefs are necessarily more generic than the D1/Workers-tuned originals. *Trade-off accepted:* stack-agnosticism is the whole point; a target install can re-sharpen them.

## Migration Plan

Additive for the handoff/gate/secrets pieces (new files + skill rewrites). The `/apply` split is the only behavior change: on update, `install-wong-stack` installs the new `/apply` skill and re-merges the loop description; existing changes-in-flight are unaffected (their branches still `/save`/`/ship` normally). No rollback beyond reverting the release.

## Open Questions

- None blocking. (The `.env.example` lives at the repo root as the conventional location; the docs page slots under `docs/development/`.)
