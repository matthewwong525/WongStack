# Optional code audit

For `/verify --code-audit` after scout/bind/preflight, before journeys. Default/`NONE` call no model. Paid Clef advice proves no behavior.

Write `$RUN_DIR/code-audit-input.json`: exact selected `when`/`then`, confirmed related sources:

```json
{"cases":[{"scenario":"Owner isolation","when":"another owner requests it","then":"the request is refused","sources":[{"path":"src/notes.ts","role":"changed","relationship":"Request handler","headLines":[10,40],"baselineLines":[10,38]}]}]}
```

Roles: `changed`, `caller`, `contract`; optional inclusive ranges per revision. Supply a full earlier commit, never guess. Limits: six cases, eight sources/case, 48,000 request bytes, 1 MiB/source; narrow explicitly. Exclude secrets, images, captures and whole-repo uploads.

```sh
node "$ROOT/.claude/skills/verify/scripts/verify-code-audit.mjs" \
  --input "$RUN_DIR/code-audit-input.json" --sha "$SHA" \
  --baseline-sha <full-commit> --run-dir "$RUN_DIR"
```

Reads saved objects, checks head, scrubs credentials/tokens; private requests/results in `code-audit/`. Uses exported Cloudflare account/token, else primary `.env`; missing access stays unavailable, no provisioning/key request. One `@cf/cloudflare/clef` call/case, no retries/Flash; 20 seconds each/60 total including response reads.

Inspect `result.json`/flagged sources. Report model/revisions, limits, accepted/dismissed/unresolved flags separately. Probabilities prove nothing. Audit `COMPLETE`/`UNAVAILABLE` are no walk verdicts. Missing access/context, invalid answers, changed head or budgets leave checks running.

Flags authorize no fixes, broader scope, new promises, skipped checks or verdicts. Observe existing connected scenarios against verbatim `THEN`; missing promises stay coverage gaps. [Walk/report/cleanup](walkthrough.md) applies on every exit; cite no cleaned local records.
