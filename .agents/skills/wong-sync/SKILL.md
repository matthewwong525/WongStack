---
name: wong-sync
description: Update this repo from the latest WongStack source through the normal /explore workflow. Use to sync, update, or upgrade WongStack, or review upstream changes.
user-invocable: true
---

# /wong-sync

Get the latest WongStack source, then invoke [`/explore`](../explore/SKILL.md) with the update intent.

Read `.claude/.wong-stack.json` (falling back to legacy `.claude/.wong-framework.json`) for the installed version, upstream, and local choices. No record, or a seed with null version and commit, means setup is incomplete: invoke `wong-setup` from the source checkout. Do not sync the WongStack source repo with itself.

Follow [latest source](references/latest-source.md). Read its `VERSION`, relevant `CHANGELOG.md` entries, and [payload inventory](references/payload-manifest.md).

Invoke `/explore` with this description, filled with the source and target details plus any user instructions:

> Bring this repo up to date with WongStack <version> at <source path>, commit <commit>. It currently uses <installed version, or unknown>. Compare the relevant upstream changes with how this repo works. Preserve local work, renamed skills, and selected components. Use the payload inventory to identify what belongs here. Carry useful updates through the normal workflow, and record the source version only after implementation.

Pass prior user decisions as context, including those in an old verdict record if present. Use the repo's installed skills, including recorded renames; use the source skills when one is missing. Resolve source resources in that checkout, but keep the target as the working directory.

Let `/explore` own investigation and questions, `/plan` own artifacts, `/apply` own edits, and `/save` own the checkpoint. A bare sync starts exploration; an existing request to plan, implement, or ship continues through that verb. Do not write a separate verdict file or prescribe a proposal format.
