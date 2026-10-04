# CI behavior evidence

Recipes: `.agents/verification/<id>.json`, format `verify-recipe-1`. Guide owns capture; scenarios own expectations.

Example:

```sh
helper=.claude/skills/verify/scripts/verify-receipts.mjs
recipe=.agents/verification/memory-areas.json
node "$helper" check --recipe "$recipe"
node "$helper" collect --recipe "$recipe" --sha "$head" --run-dir "$run"
node "$helper" compare --recipe "$recipe" --sha "$head" --run-dir "$fresh_run" --baseline-sha "$base"
```

Full SHAs; fresh owned folders. Collect checks head/attempt/digests; compare checks inputs/driver/environment. Grade `THEN`; never execute downloads.

CI-only: `verify-staging.sh preflight --no-preview --no-browser`.

Before posting, `publish` scrubs imports/report. Inline observations/revisions; link the run, never local paths. Expired/missing artifacts stay unverified; no older fallback. `cleanup` on every exit, including UNKNOWN/TIMEOUT. Partial downloads remove only their folder.
