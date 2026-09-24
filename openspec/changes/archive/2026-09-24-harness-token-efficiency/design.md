## Context

See proposal.md - Why. Claude Code writes one JSONL transcript per session under `~/.claude/projects/<project>/`, and one per subagent under `<session>/subagents/`. Each assistant record carries the API `usage` for its request: `input_tokens`, `cache_creation_input_tokens` with a 5-minute and 1-hour split, `cache_read_input_tokens`, and `output_tokens`. It also carries the model, `requestId`, a timestamp, and `attributionSkill` when a skill is active. A request with several content blocks is recorded several times with the same `requestId`.

## Goals / Non-Goals

**Goals:** a cost-per-task baseline that later prompt, rule, or model proposals can be evaluated against; one fewer failing tool call on every open-PR checkpoint.

**Non-Goals:** a live dashboard; runtime hooks into Claude Code; a price feed.

## Decisions

- **Read transcripts, not a proxy or hook.** Claude Code already records billed usage per request. A proxy or a hook would need target-side settings and trust. Reading files needs neither and also covers past sessions.
- **One task = a main session plus its subagents.** The brief asks for cost per completed task and names subagents as part of the tree. A session sometimes holds several user asks, so the per-task figures are an upper bound per ask.
- **The price table lives in the script, with its check date.** An unknown model is listed, not priced as the nearest model, so a new model cannot skew totals without notice.
- **A prefix rewrite is a request that reads under half of the previous context from cache and writes at least 1,024 tokens.** It is classified by the model change or the time gap before it, which separates the causes the harness can change (model switches) from the causes it cannot (idle gaps).
- **The context-source split is an estimate and says so.** A chunk is placed at the first request that carries it. It is priced as one write at the session's own write rate, plus one read for each later request. Chars per token is 2.5, the median of 114 measured consecutive-request deltas. Images and PDFs count as 1,600 tokens each, because they bill by pixels or pages, not by base64 length. Transcript bookkeeping that is never sent (prompt snapshots, deferred-tool records, permission records) is excluded.
- **Meta-only.** The script stays out of `payload-files.json`, like `measure-context.mjs`. Shipping it to targets through `/improve` is a later proposal.
- **REST `PATCH` for open-PR bodies.** Alternatives were requiring a newer `gh`, which `/update-dependencies` cannot enforce in targets, or keeping `gh pr edit` and documenting a fallback, which keeps the failing call. `gh api` fills in `{owner}/{repo}`, and `-F body=@file` sends the file content as a string on `gh` 2.46.

## Risks / Trade-offs

- [Transcript format changes in a later Claude Code release] → Unparseable lines are skipped, and the fixture test pins the fields in use. A missing field reads as zero, and a report that suddenly shows zeros exposes it.
- [List prices change] → Prices carry a check date, and unknown models are reported.
- [The source split can mislead] → It is labelled an estimate, and the note records its coverage: about 22% of input-side cost, mostly thinking carried in context, is unattributed.
- [`gh api` needs the PR number] → The gate already runs `gh pr view --json number,state,url` to choose the route. The update reads the number from the same command.

## Migration Plan

None for the script. Targets receive the git-gate change on their next `/wong-sync`. To roll back, revert the release commit.
