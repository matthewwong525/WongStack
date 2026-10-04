# CI behavior evidence

Project `.agents/verification/<id>.json` (`verify-recipe-1`) holds `id`, `sourcePaths`, `instructions`, qualified `scenarios`, and `capture.workflow`/`artifact`. The guide owns commands/prerequisites/cleanup; scenarios own expectations.

Source-repo example:

```sh
helper=.claude/skills/verify/scripts/verify-receipts.mjs
recipe=.agents/verification/memory-areas.json
node "$helper" check --recipe "$recipe"
node "$helper" collect --recipe "$recipe" --sha "$head" --run-dir "$run"
node "$helper" compare --recipe "$recipe" --sha "$head" --run-dir "$fresh_run" --baseline-sha "$base"
```

Full saved SHAs; fresh owned folders. Collect checks head/attempt/digests; compare checks inputs/driver/environment. Grade against `THEN`; never execute downloads or reuse old/expired captures.

CI-only: `bash .claude/skills/verify/scripts/verify-staging.sh preflight --no-preview --no-browser`.
