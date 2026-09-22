---
name: wong-sync
description: Update this repo from the latest WongStack source through the normal /explore workflow. Use to sync, update, or upgrade WongStack, or review upstream changes.
user-invocable: true
---

# /wong-sync

Get the latest WongStack source, run its deterministic payload preflight, and invoke [`/explore`](../explore/SKILL.md) only when the selected payload has an update.

Read `.claude/.wong-stack.json` (falling back to legacy `.claude/.wong-framework.json`) for the installed version, upstream, and local choices. No record, or a seed with null version and commit, means setup is incomplete: invoke `wong-setup` from the source checkout. Do not sync the WongStack source repo with itself.

Follow [latest source](references/latest-source.md). Read its `VERSION`, relevant `CHANGELOG.md` entries, and [payload inventory](references/payload-manifest.md).

After the clean source checkout is current, run its helper once. Use the source copy, not the installed copy, so an old installation gets the current classifier on this run:

```bash
node "<source path>/.claude/skills/wong-sync/scripts/preflight.mjs" \
  --target "<target root>" \
  --source "<source path>" \
  --record "<record path relative to target>"
```

Read the versioned JSON result. The helper fetches nothing, writes nothing, and reports only revision facts, counts, paths, classifications, diagnostics, and its own elapsed time. Follow exactly one status route:

- `current` — report the latest source version and commit, selected-unit count, and preflight time, then stop. Do not invoke `/explore` and do not advance the install record. Source refresh still occurred and can dominate a cold run.
- `update` — keep the complete report in context and invoke `/explore` below. Start from `changes`; inspect other target paths only for a named dependency or impact discovered from one of those changes. Do not compare the full selected payload a second time.
- `error` — report every diagnostic and stop. Do not call a partial result current, widen it into a broad AI scan, or invoke `/explore`.

An unrecognized schema version, status, truncated output, failed command, or invalid JSON is an error route. Do not infer missing fields.

Invoke `/explore` with this description, filled with the source and target details plus any user instructions:

> Bring this repo up to date with WongStack <version> at <source path>, commit <commit>. It currently uses <installed version, or unknown>. The deterministic preflight found the attached complete set of changed payload units: <preflight report>. Start with those units and expand only for a named dependency or target impact. Preserve local adaptations, renamed skills, and selected components. Carry useful updates through the normal workflow, and record the source version only after implementation.

Pass prior user decisions as context, including those in an old verdict record if present. Use the repo's installed skills, including recorded renames; use the source skills when one is missing. Resolve source resources in that checkout, but keep the target as the working directory. When updating a pre-16 installation, include the [generated-layer migration](scripts/retire-generated-openspec.mjs): inventory the exact known files in dry-run mode, preserve and report any modified or independently installed content, and include safe retirement in the agreed `/apply` tasks. Do not advance the install record while that migration has unresolved content.

Let `/explore` own investigation and questions, `/plan` own artifacts, `/apply` own edits, and `/save` own the checkpoint. A bare sync starts exploration; an existing request to plan, implement, or ship continues through that verb. Do not write a separate verdict file or prescribe a proposal format.
