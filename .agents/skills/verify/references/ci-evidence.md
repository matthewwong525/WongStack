# CI behavior evidence

Recipes: `.agents/verification/<id>.json`, format `verify-recipe-1`. Required: `id`, nonempty `sourcePaths`, owning guide `instructions`, nonempty `scenarios` (`capability`, `requirement`, `scenario`), `capture.workflow` and `capture.artifact`. References must exist; guide owns capture, scenarios expectations.

Source-repo example (installs supply their own recipe):

```sh
helper=.claude/skills/verify/scripts/verify-receipts.mjs
recipe=.agents/verification/memory-areas.json
node "$helper" check --recipe "$recipe"
node "$helper" collect --recipe "$recipe" --sha "$head" --run-dir "$run"
node "$helper" compare --recipe "$recipe" --sha "$head" --run-dir "$fresh_run" --baseline-sha "$base"
```

Use full SHAs/fresh owned folders. Collect validates head/attempt/digests; compare checks inputs/method/environment. Expired/missing artifacts remain unverified; no older fallback. Partial downloads remove only their folder.
