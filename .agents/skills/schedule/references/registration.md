# Registration

1. Write JSON: `key`, `name`, `instructions`, `timing` (`once` with `dueAt`, or `recurring` with `cron` or `every`; `timezone`; `allowedLatenessMs`). As needed: `kind` (`chat` or `background`), `run` (`cwd` in a main checkout, `provider`, `thinking`, `mode`, `check`, `minutes`, `place`), `authority` (`actions`, `recipients`, `channels`, `minIntervalMs`), and `until` for a goal. No keys.
2. Run `show --file <json>`. Show its text as it is and ask for an OK by [the shared ask](../../explore/references/asking-the-user.md).
3. On OK: `save --file <json> --approve --version <sha>`. On `changed`, show it again.
4. For a schedule changed elsewhere or a team copy: `show <key>`, ask, then `approve <key> --version <sha>`. Only the owner uses `save --team <emails>`.

To change or end a schedule at a goal, save the same key again; never make a second one.
