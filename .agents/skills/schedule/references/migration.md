# Migration

`move-in` moves the person's routines, team routines, timed jobs and `schedules/*.json` records to the app, approves each here, and pauses, then deletes, its Paseo job. Show `move-in --dry-run` first. For each pair in `duplicates`, ask which to keep, then run again with `--keep <id>` or `--drop <id>`. It removes moved entries, team routines too when the owner runs it; `--unattended` leaves files alone. Tell the person each `resumeOn` date: resume it then.

`legacy list|inspect|pause|resume|cancel` manages old cloud jobs with the installed key. [Teardown](../../../../wiki/stack/legacy-cloud-schedules.md) is a separate request. Keep jobs and secrets; keep anything uncertain paused.
