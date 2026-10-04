# CI behavior evidence

Project `.agents/verification/<id>.json` (`verify-recipe-1`) holds `id`, `sourcePaths`, `instructions`, qualified `scenarios`, and `capture.workflow`/`artifact`. The guide owns commands/prerequisites/cleanup; scenarios own expectations.

Example from this source repo; use your own recipe:

```sh
helper=.claude/skills/verify/scripts/verify-receipts.mjs
recipe=.agents/verification/memory-areas.json
node "$helper" check --recipe "$recipe"
node "$helper" collect --recipe "$recipe" --sha "$head" --run-dir "$run"
node "$helper" compare --recipe "$recipe" --sha "$head" --run-dir "$fresh_run" --baseline-sha "$base"
```

Use full saved revisions and fresh owned folders. Collect validates the newest push attempt and stream digests; compare matches inputs, driver and environment. Grade against `THEN`. Never execute downloads or use old/expired captures.
