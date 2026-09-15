## 1. Retire the skill payload

- [x] 1.1 Delete `.agents/skills/dream/` and `.agents/skills/improve/`, including the adapted-work license and all audit references, per `review.html#/retired-skills/removal`.
- [x] 1.2 Remove both skills from `payload-files.json` and the payload-manifest prose, and add the authorship-safe retired-skill classification and planned-removal path to `/wong-sync` per `review.html#/sync-retirement/safe-retire`.
- [x] 1.3 Remove both names and their runtime promises from `/wong-setup` and its fit playbook.

## 2. Simplify notes and wiki work

- [x] 2.1 Rewrite `/save` so notes remain permanent cold-resume context, its note template has no `consolidated:` field, and wiki-only work remains a generic prose-fast-path case per `review.html#/notes-lifecycle/permanent`.
- [x] 2.2 Update `notes/README.md` and remove the empty `consolidated:` field from current live notes without changing their content.
- [x] 2.3 Remove the single-writer and automatic-consolidation claims from `AGENTS.md`, `.agents/rules/openspec.md`, `wiki/wiki-style.md`, `wiki/agent-knowledge-center.md`, and `wiki/development/the-change-loop.md`; direct improvement work to `/explore` → `/plan` and explicit wiki work.
- [x] 2.4 Remove `/dream` handoffs from `/ship` while keeping the archived change as the shipping record.

## 3. Update discovery and development documentation

- [x] 3.1 Remove both commands from `README.md` and all current workflow inventories.
- [x] 3.2 Replace the retired skill examples in `wiki/development/adding-a-skill.md` and update `wiki/development/required-tools.md` to list only supported verbs.

## 4. Clean current planning truth

- [x] 4.1 Delete the empty `openspec/changes/improve-openspec-plans/` scaffold and leave `openspec/changes/archive/**` unchanged per `review.html#/current-specs/spec-cleanup`.
- [x] 4.2 Confirm the delta specifications remove the `improve-plan-output` contract and all `/dream` requirements while preserving notes, `/continue`, the wiki-root fallback, and the prose allowlist.

## 5. Release and verify

- [x] 5.1 Bump `VERSION` to `14.0.0` and add a newest-first `CHANGELOG.md` entry that explains the breaking command retirement, note lifecycle, explicit replacements, and safe target migration per `review.html#/release/major`.
- [x] 5.2 Run `node scripts/check-payload-links.mjs`, `openspec validate remove-improve-dream --strict`, and live-reference searches that exclude `CHANGELOG.md`, `notes/**`, and `openspec/changes/archive/**`; resolve every unintended reference before completion.
