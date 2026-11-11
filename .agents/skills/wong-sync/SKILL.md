---
name: wong-sync
description: Update, sync, or upgrade this repo from the latest WongStack source, or review upstream changes, planned with /plan.
user-invocable: true
---

# /wong-sync

Get the latest WongStack source, run its payload preflight, and invoke [`/plan`](../plan/SKILL.md) only for an update.

Read `.claude/.wong-stack.json` for the installed version, upstream, and local choices. No record, or a seed with null version and commit, means setup is incomplete: invoke `wong-setup` from the source checkout. Never sync the source repo with itself.

Follow [latest source](references/latest-source.md), read [the payload inventory](references/payload-manifest.md), and run the helper once from the source, not the install, so an old install gets the current classifier:

```bash
node "<source path>/.claude/skills/wong-sync/scripts/preflight.mjs" \
  --target "<target root>" \
  --source "<source path>" \
  --record "<record path relative to target>"
```

It writes nothing. Follow exactly one route, by the `status` in its versioned JSON:

- `current` — report the source version and commit, selected-unit count, preflight time, and the line `codex-plugin.mjs` beside it prints, run in the target; stop. No plan, change, or record edit.
- `update` — keep the whole report in context and invoke `/plan`, never stopping at *Plan it?*. Start from `changes`; never re-compare the full payload.
- `error` — report every diagnostic and stop: no partial "current", no `/plan`.

An unknown schema version or status, truncated output, failed command, or invalid JSON is an error; never infer missing fields.

Invoke `/plan` with this description, filled in, plus any user instructions:

> Update this repo to WongStack <version> at <source path>, commit <commit>; it now runs <installed version, or unknown>. The preflight found this complete set of changed payload units: <preflight report>. Start there and expand only for a named dependency or target impact. Keep local adaptations and renamed skills. If `CLAUDE.md` is a real file, not a link to `AGENTS.md`, plan its move per <source path>/.claude/skills/wong-sync/references/payload-manifest.md#the-agent-folder. Follow <source path>/.claude/skills/wong-sync/references/payload-manifest.md#planning-an-update for catch-up moves, skipped releases' hand steps, the merge check, and plain wording. Plan the useful updates through the normal workflow. As the last task, after implementation, record the source version in the install record, then run node <source path>/.claude/skills/wong-sync/scripts/codex-plugin.mjs in the target.

Pass prior user decisions as context. Use installed skills by their recorded names, else the source's; resolve source resources in the source checkout while working in the target. Provision a missing part by setup's [provisioning runbook](https://github.com/matthewwong525/WongStack/blob/main/.agents/skills/wong-setup/references/cloudflare.md) from the source checkout.

`/plan` owns the artifacts and review; its bounded `/explore` owns investigation and questions. Ask in [the ask format](../explore/references/asking-the-user.md). A bare sync stops at the plan's `review.html` with the next step; a request to implement or ship continues through that verb ([just ask](../../../wiki/development/the-change-loop.md#just-ask)).
