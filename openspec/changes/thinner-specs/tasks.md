# Tasks

Each rewrite task follows the bar in design.md: one promise per requirement in one or two sentences, at most two scenarios, no script, file, or step names unless the name is the promise. Read only the source specs and the skill or wiki page that owns the topic. Remove the source folders the task merges.

## 1. The spec bar (payload rule and meta config)

- [x] 1.1 Add the spec bar to `.agents/rules/openspec.md`: a short paragraph on what a spec holds (what a person or installed repo sees, what must never happen, what an update delivers) and what it leaves to the skill; one or two scenarios per requirement
- [x] 1.2 Add a one-sentence `specs:` rule to `openspec/config.yaml` that points at `.claude/rules/openspec.md`, with no `: ` inside the plain scalar, and run `node scripts/check-openspec-config.mjs`

## 2. Merged capabilities (openspec/specs)

- [x] 2.1 `openspec-workflow` from `openspec-cli-workflow` and `change-branch-association`, plus a requirement stating the spec bar
- [x] 2.2 `change-loop` from `request-routing`, `work-verbs`, and `code-first-planning`
- [x] 2.3 `asking-the-user` from `explore-clarification`, `structured-asks`, and `reader-level`
- [x] 2.4 `apply` from `apply-plan-handoff` and `apply-completion-handoff`
- [x] 2.5 `delivery-gate` from `delivery-gate`, `ship-full-cycle`, `checkpoint-helpers`, and `preview-discovery`
- [x] 2.6 `memory` from `memory-store`, `memory-recall`, and `memory-capture`
- [x] 2.7 `wong-sync` from `wong-sync`, `wong-sync-adapt`, and `wong-sync-after-picture`
- [x] 2.8 `install-onboarding` from `install-onboarding` and `server-setup`
- [x] 2.9 `cloudflare-provisioning` from `cloudflare-provisioning`, `cloudflare-access-guide`, and `cf-secret-parity`
- [x] 2.10 `knowledge-center` from `agent-knowledge-center`, `wiki-root`, `people-wiki`, and `simplified-technical-english`
- [x] 2.11 `payload-layout` from `payload-single-source`, `agent-config-layout`, and `path-scoped-rules`
- [x] 2.12 `dependencies` from `dependency-currency` and `toolchain-dependencies`
- [x] 2.13 `ci-tests` from `ci-tests` and `downstream-contract`

## 3. Kept capabilities, thinned (openspec/specs)

- [x] 3.1 `stack-pack` and `app-scaffold`
- [x] 3.2 `ux-wireframes` and `staging-walkthrough`
- [x] 3.3 `secrets-convention`, `mini-apps`, and `browser-logins`
- [x] 3.4 `payload-checks`, `context-economy`, and `open-source-release`
- [x] 3.5 `repository-improvement` and `paseo-routines`

## 4. Retired names (script data)

- [x] 4.1 In `scripts/retired-names.json`, repoint `allow` paths and replacement texts that name a moved or merged spec, and drop an `allow` path whose spec no longer mentions the name
- [x] 4.2 Add entries for the distinctive retired capability names listed in design.md, each with its new capability as the replacement, and fix any live file the check then flags

## 5. Release and checks

- [x] 5.1 Confirm the totals: 26 capabilities (25 plus `multi-part-workspaces` from main), under 28,000 words, no requirement with more than two scenarios; record the counts in the Decision log
- [x] 5.2 `VERSION` 25.15.0 → 25.16.0 and a `CHANGELOG.md` entry, with an **Updating** note: `/wong-sync` brings the rule; nothing to do by hand, and your own specs are not rewritten
- [x] 5.3 Run `openspec validate --specs --strict --no-interactive`, `node scripts/check-payload-links.mjs`, `node scripts/check-openspec-config.mjs`, `node scripts/check-retired-names.mjs`, and `node scripts/measure-context.mjs --check`
- [ ] 5.4 CI passes on the pushed branch, through `/save`
