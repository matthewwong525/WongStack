## 1. Secrets Guidance and Templates

- [x] 1.1 Update `wiki/development/secrets.md` with the primary-worktree live-value rule, active-branch blank-example rule, rotation behavior, destination ignore check, and non-destructive duplicate reconciliation guidance.
- [x] 1.2 Update the root `.env.example` header and `.claude/skills/wong-sync/references/stack-pack-fragments.md` so new variables are documented blank, rotations do not create template churn, and real values never enter examples; mirror the fragment under `.agents/`.
- [x] 1.3 Review `wiki/stack/cloudflare-credentials.md`, `wiki/stack/staging-walkthrough.md`, and the Cloudflare failure map for ambiguous “repo root” or active-worktree credential directions, and align every affected reference with the canonical secrets page without duplicating its resolver details.

## 2. Cloudflare Provisioning Skill

- [x] 2.1 Update `.claude/skills/wong-cloudflare/SKILL.md` to resolve the primary worktree from Git's absolute per-worktree and common directories, stopping before credential input if the durable location cannot be established.
- [x] 2.2 Make provisioning create the durable `.env` from the active branch's example when absent, prove the destination is ignored (using the repository-common exclude as immediate protection when required), and narrowly read/write both Cloudflare variables there throughout the run.
- [x] 2.3 Add value-safe handling for a separate active-worktree `.env`: preserve it, prefer the durable file, and report reconciliation or the ignored-link option without printing, comparing, deleting, or bulk-merging values.
- [x] 2.4 Apply the completed provisioning-skill and failure-map changes identically under `.agents/skills/wong-cloudflare/` and verify the mirrors byte-for-byte.

## 3. Staging Walkthrough Script and Skill

- [x] 3.1 Update `.claude/skills/walk/scripts/walk-staging.sh` so exported values retain precedence and file fallback resolves the primary worktree's durable `.env` from Git metadata for the Cloudflare token and optional Access credentials.
- [x] 3.2 Keep missing or unresolvable durable credentials on the existing value-safe `UNKNOWN` path, and update `.claude/skills/walk/SKILL.md` only where its credential-source guidance needs to describe the new lookup.
- [x] 3.3 Mirror the walkthrough script and skill under `.agents/skills/walk/`, verify both pairs byte-for-byte, and run `bash -n` plus linked-worktree checks that distinguish primary and active `.env` files without emitting their contents.

## 4. Save Skill

- [x] 4.1 Add an early credential-preservation step to `.claude/skills/save/SKILL.md` that handles only explicitly named secret additions or rotations, writes values narrowly to the primary worktree's ignored file, and maintains blank active-branch example declarations when their contract changed.
- [x] 4.2 Make `/save` redact handled values from notes, OpenSpec artifacts, commit messages, PR bodies, reports, and staged tracked files while retaining non-secret variable context; stop value-safely if a handled value appears in a tracked surface.
- [x] 4.3 Add an explicit shipping context to `/save` that accepts the archived change name, uses that archive as the handoff/PR-body source, skips fallback active-change authoring, and returns the existing gate result for `/ship` to consume.
- [x] 4.4 Mirror the completed save skill under `.agents/skills/save/` and verify the skill and any changed references or scripts byte-for-byte.

## 5. Ship Skill

- [x] 5.1 Refactor `.claude/skills/ship/SKILL.md` so it performs feature/default-branch preflight and its owned `openspec-archive-change`, then invokes `/save` once in shipping context before merge.
- [x] 5.2 Remove `/ship`'s duplicate dirty-tree commit, PR creation/update, push, and branch-CI wait/auto-fix instructions; consume `/save`'s `SUCCESS`/`NONE` versus `UNKNOWN`/`TIMEOUT`/failure result and retain only merge/archive-specific handling.
- [x] 5.3 Mirror the completed ship skill under `.agents/skills/ship/` and verify both copies byte-for-byte.

## 6. Generic Agent Guidance

- [x] 6.1 Update the generic `WONG-STACK` credentials block in `CLAUDE.md` to direct all agents to save live values in the primary worktree while editing values-blank declarations and sourcing comments on the active branch, retaining stack-equivalent wording and the canonical wiki link.
- [x] 6.2 Check all shipped instructions for contradictory claims that `.env` always means the active checkout or that `/ship` independently checkpoints and gates the branch, replacing those claims with links or concise wording owned by the secrets convention and change loop.

## 7. Release and Validation

- [x] 7.1 Bump `VERSION` with the appropriate semver increment and add a newest-first `CHANGELOG.md` entry describing worktree-safe durable secret persistence, `/save` redaction/checkpointing, and `/ship` delegation.
- [x] 7.2 Run `node scripts/check-payload-links.mjs`, validate `secret-save-workflow` with OpenSpec, and inspect the final diff for any credential value, absolute machine path, unmatched `.claude/` versus `.agents/` mirror, or changed path outside the planned surfaces.
- [x] 7.3 Walk through normal `/save`, shipping-context `/save`, `/ship` after archive, linked-worktree credential lookup, missing credential, duplicate `.env`, and tracked-value leak scenarios without logging any test value.

## 8. Simplify the Ship-to-Save Handoff

- [x] 8.1 Remove `/save --shipping` and make ordinary `/save` recognize exactly one archived change matching the current branch before fallback authoring.
- [x] 8.2 Update `/ship` to archive first, invoke ordinary `/save` exactly once, consume its gate result, and retain no duplicate checkpoint mechanics.
- [x] 8.3 Align the change-loop guidance, setup playbook, generic agent block, changelog, and mirrored skill files with the flag-free single-save flow.
- [x] 8.4 Validate the OpenSpec change, payload links, mirror equality, and textual ship order; confirm no `--shipping` or `shipping context` instruction remains.
