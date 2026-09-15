## Context

See `proposal.md` for the motivation. The two skills are core payload directories, so removal crosses the manifest, setup, user-facing command lists, note conventions, wiki doctrine, and current specifications. `.claude` is a symlink to `.agents`, so implementation edits the `.agents` paths. Historical archives and existing changelog entries are records and stay unchanged.

Every current note has an empty `consolidated:` field. This makes the consolidation state safe to remove without migrating a completed-note distinction.

## Goals / Non-Goals

**Goals:**

- Leave one clear improvement path: investigate with `/explore`, then create work with `/plan`.
- Keep notes useful for `/continue` without a queue-like state that no command consumes.
- Remove the two skills from new installs and safely retire managed copies in existing targets.
- Leave no live link, current specification, or command list that promises the retired workflows.

**Non-Goals:**

- Do not add note consolidation to another skill.
- Do not make wiki gardening automatic.
- Do not delete session notes, historical archives, or old changelog entries.
- Do not delete a customized retired skill from a target repository.

## Decisions

### D1 — Notes become permanent context, not an inbox

Remove `consolidated:` from the note template and from existing live notes. `/save` still writes notes and `/continue` still reads them. Explicit wiki work can use notes as normal repository context, but no skill owns a transfer step.

Alternative: move consolidation into `/save`. Rejected because it preserves the model call and hidden scope that the retirement is meant to remove.

### D2 — Explicit wiki work uses the normal rules

Remove the single-writer claim from `AGENTS.md`, `wiki-style.md`, and the OpenSpec rule. A user can request a wiki edit or audit directly; `.agents/rules/wiki.md` still loads `wiki-style.md` and `voice.md` for those edits. The `notes/**` + `wiki/**` prose fast path stays because it is path doctrine, not a `/dream` feature.

Alternative: create a smaller wiki skill. Rejected because that would rename the redundant command instead of removing it.

### D3 — `/improve` has no dedicated replacement

Remove the skill and its licensed reference bundle. A targeted audit or roadmap discussion uses `/explore`; selected work uses `/plan`. This keeps analysis and planning in the main change loop.

Alternative: move the audit playbooks into `/explore`. Rejected because it would keep the large specialized workflow and context cost.

### D4 — Retirement is authorship-safe in target repos

Add a bounded retired-skill pass to `/wong-sync`. It checks the local name recorded in `components.skills`, including renames. A directory is removal-safe only when all files match historical upstream blobs and there are no extra files. Otherwise it is preserved unchanged and simply leaves WongStack management. The plan shows the deletion before `/apply` performs it.

Alternative: stop listing the skills and leave old copies in place. Rejected because existing installations would keep showing commands that upstream says no longer exist.

### D5 — Current truth changes; history does not

Use delta specs to remove or revise current requirements. Delete the empty active `improve-openspec-plans` scaffold during implementation. Do not touch `openspec/changes/archive/**` or earlier changelog sections.

## Risks / Trade-offs

- **Users lose broad audit and wiki-gardening shortcuts.** → The README and philosophy point to `/explore` → `/plan` and explicit wiki work.
- **A target customized a retired skill.** → `/wong-sync` preserves the directory byte-for-byte and only removes its managed mapping.
- **Old notes retain `consolidated:` in target repos.** → The field becomes harmless legacy data; no bulk target rewrite is required.
- **Removing the improve license could appear to erase attribution.** → Historical changelog entries and archived changes remain unchanged; only the retired live payload bundle is deleted.
- **Live references are easy to miss because `.claude` is a symlink.** → Search the real `.agents` tree and run `node scripts/check-payload-links.mjs` before completion.

## Migration Plan

1. Remove the live skill directories and all current references.
2. Update note and wiki doctrine without replacing the retired workflows.
3. Add authorship-safe retired-skill handling to `/wong-sync` and remove both names from its manifest schema.
4. Apply the delta specifications, delete the empty obsolete scaffold, bump to 14.0.0, and add the newest changelog entry.
5. Run the payload link check and repository-wide live-reference checks.

Rollback is a normal revert of the release commit. Existing target repositories do not lose customized skill files during migration.
