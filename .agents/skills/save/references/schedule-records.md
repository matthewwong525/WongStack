# Scheduled records

Before code or checkout, resolve selected routines/goals using `.claude/skills/schedule/scripts/schedule.mjs list` and `inspect --record <reference>`, retaining `--store <id>`. References are `schedules/<name>.json` or the CLI-reported goal path. Invalid/ambiguous selections stop; names and Branch headers never imply code branches. Continue/apply/plan dispatch inspect, pause, resume, run, cancel, answer or change; pending questions block dependent actions. Revisions use schedule's approval procedure, not code artifacts. Menus include both kinds with owner/state and stale/unavailable timing.

## Publish only the selected record

Confirmed registration/checkpoints use `--schedule-record <reference>` on `checkpoint.mjs` and `ship.mjs prepare`/`finish`. Stage the exact definition or goal artifacts/page; omit code selection flags. Validation rejects mixed branch/index/worktree files and incomplete staging. Required implementation takes the ordinary loop separately.

Keep the feature branch, checkpoint and normal checks/review/merge gate. Routines need no change/page; goals stay active with open tasks, no spec reconciliation, numbering or ordinary archive. Preview the actual record/destination. After merge, checkpoint `lifecycle.published: true` and `lifecycle.publication` with the actual immutable merged instruction reference (repository, commit, path); publish that binding through this route. Never invent a SHA or substitute an unmerged save. Publication alone activates nothing. Prefer paused creation, then publish binding, arm and inspect; otherwise publish instructions first and create with startup guards. Use `bind`/`reconcile`; inspect uncertain creation before retries.

## Terminal goals

`ship.mjs prepare --archive-record <active reference>` requires completed/cancelled/approved superseded state, evidence and verified owned-execution stopping. Cleanup pending blocks archive. It uses `--skip-specs` and exact old removals/new archive files through the same gate. Cancelled routines retain disabled definitions.
