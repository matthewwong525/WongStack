# Fresh run

Run the `start` command the startup prompt names. It checks that the app started this chat and that this version is approved here, then claims the progress. A refusal ends the run.

Do only the quoted instructions it prints, within its `authority`; ask before any other step. Save progress with `progress --key --run --file <json>`. When `until` is met, run `end --key <key> --evidence <proof>`. Then `release --key --run`.
