# Design

## Context

See proposal.md, Why. Baseline on `main` 25.13.0 (`58cdfdc`): 48 capabilities in `openspec/specs/`, about 84,000 words, 330 requirements, 1,030 scenarios. Skills and their references come to about 31,000 words. Nothing reads a spec at run time except `/verify`'s walkthrough, which probes the scenarios of capabilities whose files a branch touches ([walkthrough](../../../.agents/skills/verify/references/walkthrough.md)). `scripts/retired-names.json` names four spec paths in `allow` lists. Specs do not ship to installed repos; `.agents/rules/openspec.md` does.

## Goals / Non-Goals

**Goals:**
- Each requirement states one promise in one or two sentences, with at most two scenarios.
- 25 capabilities, under 28,000 words in total.
- `openspec validate --specs --strict --no-interactive` passes.
- A standing bar that planning agents read before they write spec text, here and in installed repos.

**Non-Goals:**
- Changing any skill, script, or wiki page to match a spec. When the rewrite finds a spec that disagrees with its skill, the skill wins, and the spec says what the skill does.
- Touching `openspec/changes/archive/`.

## Decisions

### The bar: a promise, not a procedure

A requirement stays when a person or an installed repo relies on it:
- **What they see or get** — the outcome of a verb, a page, a report.
- **What must never happen** — no push without a gate, no production data in staging, no secret in git.
- **What an update delivers or preserves** — the install record, target-owned files, fragments merged, never overwritten.

Cut from the requirement text: which script or step does it, file and function names (unless the name *is* the promise, like `.env.example` or `/apps/<name>/`), exact wording of a message, ordering inside a skill, and restated rationale. Keep one scenario for the ordinary case and, where one exists, one for the edge or the failure the rule exists to stop. Two near-identical requirements become one.

Alternatives: *only what no skill says* (user declined; the specs would stop being a whole picture), and *a word target alone* (user declined; it cuts without a test for what stays).

### Rewrite in place, no deltas

The change sets `skip_specs: true` and edits `openspec/specs/` directly. OpenSpec 1.13.2 rejects a MODIFIED block that drops a scenario, so a delta rewrite would need a REMOVED and an ADDED for nearly every requirement, and 23 retired capabilities. `/save` has no deltas to reconcile, and archive has none to sync. The archive keeps the old text.

### The merge map

| New capability | Merged from |
|---|---|
| `knowledge-center` | `agent-knowledge-center`, `wiki-root`, `people-wiki`, `simplified-technical-english` |
| `asking-the-user` | `explore-clarification`, `structured-asks`, `reader-level` |
| `change-loop` | `request-routing`, `work-verbs`, `code-first-planning` |
| `openspec-workflow` | `openspec-cli-workflow`, `change-branch-association`, plus the new spec-bar requirement |
| `apply` | `apply-plan-handoff`, `apply-completion-handoff` |
| `delivery-gate` | `delivery-gate`, `ship-full-cycle`, `checkpoint-helpers`, `preview-discovery` |
| `memory` | `memory-store`, `memory-recall`, `memory-capture` |
| `wong-sync` | `wong-sync`, `wong-sync-adapt`, `wong-sync-after-picture` |
| `install-onboarding` | `install-onboarding`, `server-setup` |
| `cloudflare-provisioning` | `cloudflare-provisioning`, `cloudflare-access-guide`, `cf-secret-parity` |
| `payload-layout` | `payload-single-source`, `agent-config-layout`, `path-scoped-rules` |
| `dependencies` | `dependency-currency`, `toolchain-dependencies` |
| `ci-tests` | `ci-tests`, `downstream-contract` |

Kept alone, thinned: `app-scaffold`, `stack-pack`, `mini-apps`, `secrets-convention`, `payload-checks`, `context-economy`, `staging-walkthrough`, `ux-wireframes`, `open-source-release`, `repository-improvement`, `paseo-routines`, `browser-logins`. Total: 25.

A merged spec gets one `## Purpose` for the whole topic. Requirement names stay unique inside it. The builder may split a merged spec back out when it reads as two topics, and records that in the Decision log.

### Where the bar lives

`.agents/rules/openspec.md` owns it: a short paragraph, loaded whenever anyone edits `openspec/**`, here and in installed repos. `openspec/config.yaml` gets a `specs:` rule of one sentence that points at the rule file, so `openspec instructions specs` shows it too. The config rule contains no `: ` inside a plain scalar (memory #95); `scripts/check-openspec-config.mjs` confirms it parses. The `openspec-workflow` spec states the promise that specs hold promises, not procedure.

### Retired names

Retired capability names with a distinctive form (`apply-plan-handoff`, `apply-completion-handoff`, `wong-sync-adapt`, `wong-sync-after-picture`, `memory-recall`, `memory-capture`, `explore-clarification`, `structured-asks`, `request-routing`, `change-branch-association`, `openspec-cli-workflow`, `payload-single-source`, `cf-secret-parity`, `toolchain-dependencies`, `dependency-currency`) go into `scripts/retired-names.json` with their new capability as the replacement, so the check finds any live file still citing them. Names that are also ordinary words or file names elsewhere (`memory-store`, `downstream-contract`, `server-setup`, `people-wiki`, `wiki-root`, `reader-level`, `checkpoint-helpers`, `preview-discovery`) are left out, because `downstream-contract.test.mjs` and similar files keep those names legitimately. Existing entries whose `allow` paths or replacement text name a moved spec are updated.

## Risks / Trade-offs

- [A cut drops a real promise that only the spec held] → Before deleting a requirement, the builder checks that it is either a how, a duplicate, or stated by the kept promise. Anything that is none of those stays.
- [`/verify` probes fewer scenarios] → Accepted by the user's choice of one or two per rule; the kept scenarios are the ones a reviewer would probe first.
- [The rewrite is large for one helper's context] → Tasks go one merged capability at a time, and each reads only its source specs and the skill that owns it.
- [A branch in flight carries deltas against a capability this change removes] → The next `/save` on that branch stops on the missing base requirement. Its owner rewrites the delta against the merged capability. `openspec list` showed no active changes when this was planned.
