# Selective helper evidence

The integrated helper was checked remotely at `ca0dbfb2681b333bee7ce4faef8abe31be5116b7` on 2026-10-04 against machine-owned memory v30.0.0, published main `a775930044e8d77c967a136431d8d971b20809e8`. [Payload checks](https://github.com/matthewwong525/WongStack/actions/runs/37169606709), [app checks](https://github.com/matthewwong525/WongStack/actions/runs/37169606637), and [deployment](https://github.com/matthewwong525/WongStack/actions/runs/37169606647) passed. All 1,070 assertions passed, with no skipped tests, 91.75% line coverage and 88.50% branch coverage. No check or acceptance threshold was loosened. The [earlier deterministic evidence](evidence.md) remains separately labeled.

## What the automated gate establishes

The tests cover serialized cumulative task allowances, multibyte/whole-entry caps, fixed filters, deadline cancellation, strict model replies, forged IDs, changed/superseded facts, revoked access, unsupported hosts, exhausted output, and verified fallback. Worker integration checks text search, JSON, briefs and extraction for admin/member/reader credentials, including default scope, explicit broadening, unshared and historical private facts, and private sources. Fact reads never fetch transcripts or write stored memory. Task identity uses the installation and credential, independently of changing author labels.

The first gate stopped on lint warnings and a wiki size limit; the second found a test fixture editing an immutable fact source. Those were corrected without loosening checks. The first passing report then revealed helper IDs overriding fixture names after scoring; the final source preserves comparable fixture keys and asserts that presentation contract.

## Comparative protocol evidence

The [full structured report](helper-protocol-evaluation.json) contains 23 synthetic executions per mode, one per frozen question. All modes share a 3,072-byte whole-entry packet renderer. The helper receives a recorded selection callback, not a live model. Its callback selections retain keyword candidates and do not exercise semantic judgment. Calls in the table are callback invocations; store requests are in-process fixture queries. Timing percentiles and variance in the JSON measure this synthetic protocol only, with one sample per question; they establish no provider or production latency, repeated live variance, cost, or model quality.

| Mode | Executions | Complete expected sets | Supplied input bytes, total | Returned bytes, total | Recorded model calls | Fixture store requests |
| --- | --- | --- | --- | --- | --- | --- |
| direct-eight | 23 | 20 | 0 | 10,704 | 0 | 23 |
| direct-twenty | 23 | 21 | 0 | 11,235 | 0 | 23 |
| helper | 23 | 21 | 24,885 | 11,235 | 23 | 43 |

Every mode preserved the 13 existing regression questions and returned zero forbidden facts. The two synonym-only questions still miss in this recorded protocol: their recovery requires live reformulation evidence. Provider input/output/cache tokens are unknown for the callback, not estimated from bytes. Live acceptance is false and selective guidance remains disabled.

### Eight can lose a needed fact

The broad shipping fixture places an older required approval behind eleven newer equal-ranking notes. Direct-eight returns eight notes, misses that critical fact, and uses 1,193 bytes. Direct-twenty returns all twelve facts, including the approval, in 1,724 bytes. The recorded helper also returns all twelve in 1,724 bytes; that demonstrates its bounded candidate/packet protocol, not a live model's ability to identify the approval efficiently. This constructed case proves the smaller default can reduce recall; it does not estimate how often that happens in real memory.

Current deterministic format diagnostics, after machine-ownership integration, measured eight-fact text at 832 bytes, JSON at 2,527 bytes, and a brief at 1,280 bytes; a twenty-fact brief used 2,834 bytes. Search and briefs each used one fixture D1 request in both ordinary and team configurations. Machine privacy no longer adds the older reader-schema probe. These are synthetic bytes and query counts, separate from the shared 3,072-byte comparison packets.

## Installed-host isolation and live blocker

On this host, Claude CLI 2.1.287's isolated initialization reported empty tool, MCP-server, and skill lists. Its normal configured model was `claude-opus-5`. The first model request exited with the weekly usage-limit message, stating reset at 14:00 UTC; it reported zero input/output/cache tokens. This was a capability/authentication probe, not a completed comparative run. No live quality, total usage, or latency evidence was obtained. The adapter's remote tests verify its isolation arguments, authentication preservation, credential scrubbing, buffered output, cancellation and unknown-usage behavior. The calling agent must pass `--model` if its active per-session override differs from the CLI's configured default.

Installed Codex CLI 0.159.2 did not establish removal of all tools through a verified supported control. Its adapter remains unsupported and uses the same verified deterministic fallback; it never silently switches to Claude.

Tasks 8.2's live portion and 8.3 remain incomplete. The user must explicitly choose experimental delivery or leave live acceptance pending; build approval alone does not waive the bar or grant publication. After usable Claude quota returns, run the synthetic live comparison with the intended caller model:

```bash
node scripts/evaluate-memory-search.mjs --context --live --agent claude --repeats 2 --json
```

Keep the fixed budgets and acceptance criteria. Record at least twenty live executions per mode, all provider usage availability, sample sizes and timing dispersion; require no forbidden/fabricated evidence, preserved regressions, no per-case critical loss against direct-twenty, and recovery of both synonym-only misses before enabling selective guidance.

## Review

Review the [plan](review.html) and reports before publication. This adds CLI behavior and no main-app screen; the existing app deployment cannot demonstrate memory extraction. Reverting the helper leaves ordinary search, factual briefs, startup loading and stored memory intact. No production memory was exported, no ownership migration was introduced here, and no additional session facts were stored because the decisions already live in the proposal.
