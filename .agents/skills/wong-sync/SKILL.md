---
name: wong-sync
description: Update this repo from the latest WongStack source by planning the update with /plan, ending at its review page. Use to sync, update, or upgrade WongStack, or review upstream changes.
user-invocable: true
---

# /wong-sync

Get the latest WongStack source, run its deterministic payload preflight, and invoke [`/plan`](../plan/SKILL.md) only when the selected payload has an update.

Read `.claude/.wong-stack.json` for the installed version, upstream, and local choices; no record, or a seed with null version and commit, means setup is incomplete: invoke `wong-setup` from the source checkout. Never sync the WongStack source repo with itself.

Follow [latest source](references/latest-source.md) and read its [payload inventory](references/payload-manifest.md). Then run the source copy of the helper once, not the installed one, so an old install gets the current classifier:

```bash
node "<source path>/.claude/skills/wong-sync/scripts/preflight.mjs" \
  --target "<target root>" \
  --source "<source path>" \
  --record "<record path relative to target>"
```

The helper fetches and writes nothing. Follow exactly one status route of its versioned JSON:

- `current` — report the latest source version and commit, selected-unit count, and preflight time, then stop. Invoke no `/plan` or `/explore`, create no change, and leave the install record alone.
- `update` — keep the complete report in context and invoke `/plan` below. Start from `changes`, expanding only for a named dependency or impact; don't compare the full selected payload again.
- `error` — report every diagnostic and stop. Never call a partial result current, widen it into a broad AI scan, or invoke `/plan`.

An unrecognized schema version or status, truncated output, failed command, or invalid JSON is an error; don't infer missing fields.

Invoke `/plan` with this description, filled in, plus any user instructions:

> Bring this repo up to date with WongStack <version> at <source path>, commit <commit>. It currently uses <installed version, or unknown>. The deterministic preflight found the attached complete set of changed payload units: <preflight report>. Start with those units and expand only for a named dependency or target impact. Preserve local adaptations, renamed skills, and a relocated docs path. Plan the useful updates through the normal workflow. Record the source version in the install record only after implementation, as the last task.

Pass prior user decisions as context, including an old verdict record's. Use the repo's installed skills under their recorded names, and source skills where one is missing; resolve source resources in that checkout while working in the target. Provisioning a missing part, including moving a store still on a Cloudflare memory token to the production Worker, follows setup's [provisioning runbook](https://github.com/matthewwong525/WongStack/blob/main/.agents/skills/wong-setup/references/cloudflare.md) from the source checkout.

`/plan` owns the artifacts and review; its bounded `/explore` owns investigation and the one question round. Any question this skill asks uses [the ask format](../explore/references/asking-the-user.md). A bare sync stops at the plan's `review.html` and offers the next step; an existing request to implement or ship continues through that verb. Write no separate verdict file and prescribe no proposal format.
