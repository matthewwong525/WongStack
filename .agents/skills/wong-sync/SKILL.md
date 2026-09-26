---
name: wong-sync
description: Update this repo from the latest WongStack source by planning the update with /plan, ending at its review page. Use to sync, update, or upgrade WongStack, or review upstream changes.
user-invocable: true
---

# /wong-sync

Get the latest WongStack source, run its deterministic payload preflight, and invoke [`/plan`](../plan/SKILL.md) only when the selected payload has an update. A bare sync ends at the plan's `review.html`.

Read `.claude/.wong-stack.json` for the installed version, upstream, and local choices. No record, or a seed with null version and commit, means setup is incomplete: invoke `wong-setup` from the source checkout. Do not sync the WongStack source repo with itself.

Follow [latest source](references/latest-source.md). Read its `VERSION`, relevant `CHANGELOG.md` entries, and [payload inventory](references/payload-manifest.md).

After the clean source checkout is current, run its helper once. Use the source copy, not the installed copy, so an old installation gets the current classifier on this run:

```bash
node "<source path>/.claude/skills/wong-sync/scripts/preflight.mjs" \
  --target "<target root>" \
  --source "<source path>" \
  --record "<record path relative to target>"
```

Read the versioned JSON result. The helper fetches nothing, writes nothing, and reports only revision facts, counts, paths, classifications, diagnostics, and its own elapsed time. Follow exactly one status route:

- `current` — report the latest source version and commit, selected-unit count, and preflight time, then stop. Do not invoke `/plan` or `/explore`, create no change, and do not advance the install record. Source refresh still occurred and can dominate a cold run.
- `update` — keep the complete report in context and invoke `/plan` below. Start from `changes`; inspect other target paths only for a named dependency or impact discovered from one of those changes. Do not compare the full selected payload a second time.
- `error` — report every diagnostic and stop. Do not call a partial result current, widen it into a broad AI scan, or invoke `/plan`.

An unrecognized schema version, status, truncated output, failed command, or invalid JSON is an error route. Do not infer missing fields.

Invoke `/plan` with this description, filled with the source and target details plus any user instructions:

> Bring this repo up to date with WongStack <version> at <source path>, commit <commit>. It currently uses <installed version, or unknown>. The deterministic preflight found the attached complete set of changed payload units: <preflight report>. Start with those units and expand only for a named dependency or target impact. Preserve local adaptations, renamed skills, and a relocated docs path. Plan the useful updates through the normal workflow. Record the source version in the install record only after implementation, as the last task.

Pass prior user decisions as context, including those in an old verdict record if present. Use the repo's installed skills, including recorded renames; use the source skills when one is missing. Resolve source resources in that checkout, but keep the target as the working directory. Provisioning a missing part (a memory store, a bucket, the memory Worker for a store with no `components.memory.worker`, or the pack's resources) follows setup's [provisioning runbook](https://github.com/matthewwong525/WongStack/blob/main/.agents/skills/wong-setup/references/cloudflare.md) from the source checkout.

`/plan` owns the artifacts and the review page. The bounded `/explore` it runs owns investigation and the one question round. `/apply` owns edits, and `/save` owns the checkpoint. Any question this skill asks itself uses [the shared ask format](../explore/references/asking-the-user.md). A bare sync stops at the review and offers the next step, as a standalone `/plan` does. An existing request to implement or ship continues through that verb. Do not write a separate verdict file or prescribe a proposal format.
