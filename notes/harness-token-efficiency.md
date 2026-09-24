---
slug: harness-token-efficiency
started: 2026-09-24
updated: 2026-09-24
---

# Harness token efficiency: baseline and ranked levers

The user asked for lower price-weighted cost per completed task with no quality loss, in this
order: map and measure, rank, make only the safe changes directly, keep the rest behind flags or
proposals, report. The "harness" here is the WongStack payload that runs inside Claude Code:
the `WONG-STACK` block, rules and their `@`-imports, skill descriptions and bodies, references,
and helper scripts. Request assembly, tool schemas, cache breakpoints, and compaction belong to
Claude Code and are out of reach from this repo.

## How it was measured

`scripts/measure-usage.mjs` (added here) reads `~/.claude/projects/**/*.jsonl`. It prices each
deduplicated request by its recorded `usage` (input, 5m and 1h cache writes, cache reads, output)
and rolls subagents into their parent task. It also classifies prefix rewrites by cause and
estimates context cost by source: a chunk is written once, then read by each later request, at
the session's own rates. Chars per token = 2.5, the median of 114 consecutive-request deltas;
images and PDFs count as 1,600 tokens each. Prices were checked 2026-09-24. Corpus: 858
transcripts (442 subagent), 416 tasks, $4,637. The repos are ClaymooApp 68%,
ClaymooHeadless 10%, SuccessStoryClub 10%, WongStack 5%, and others.

`node scripts/measure-usage.mjs --since 2026-09-10` gives the current baseline:

- **By billing type:** cache read 55%, cache write 30% (1h 22%, 5m 9%), output 14%, uncached
  input ~0%. The cache hit rate is 97.7%. Writes cost so much because a 1h write is 20–80× a
  read.
- **Per task:** median $6.54, mean $13.88, median 63 requests (p90 291). The top 10% of tasks
  are 42% of cost. Subagents are 17%.
- **By active skill:** WongStack verbs plus the legacy `openspec-*` skills are ~70%. A median
  `/save` run takes 12 requests but starts at ~220k tokens of context. Its cost is the session it
  inherits, not its runbook.
- **Prefix rewrites:** idle > 1h 4.2%, mid-session model switch 1.7%, idle 5–60m 1.3%.
- **Context sources (main threads):** Bash output 17%, assistant tool inputs and text 12%,
  queued user messages 5% (pasted content), skill listing 2.7% (mostly user-level plugins), and
  re-injected edited files 1.9% (OpenSpec files after `sed -i` or checkout). The eager imports
  are 1.6%: `wiki-style.md` 0.9%, `notes/README.md` 0.5%, `voice.md` ~0.2%. The WongStack skill
  bodies are ~3.4% (`ship`, `save` 0.9% each; `plan` 0.7%). The whole `CLAUDE.md` is 0.8%, and
  in targets most of that is repo-specific text.
- **Static prefix per new session:** ~32k tokens. Claude Code's shared ~11.6k is read from a
  cross-session cache, and ~21k is written. WongStack's share is ~8.5k: `WONG-STACK` block ~1.7k,
  eager imports ~5.2k, skill descriptions ~1.6k. Each general-purpose subagent writes ~28k at
  start, and that includes the same imports.
- **Tools (main sessions, share of sessions / error rate):** Bash 75% / 2.3%, Read 47% / 8.3%
  (oversized ClaymooApp data files), Skill 42% / 0.1%, Agent 32% / 0.7%, AskUserQuestion
  26% / 4.3% (user declines), Monitor 2% / 21% (called before its deferred schema loads, a Claude
  Code quirk). Tool errors inside verb turns were 1.2%.

## Changed directly

1. `scripts/measure-usage.mjs` and its test: runtime telemetry. The repo had only static word
   counts (`measure-context.mjs`). This change is meta-only, so it has no release.
2. v16.7.1: the git gate updates an open PR's body with
   `gh api -X PATCH "repos/{owner}/{repo}/pulls/$PR_NUMBER" -F "body=@$BODY_FILE"`. `gh pr edit`
   failed on 36 of 43 recorded calls (gh 2.46, Projects (classic) GraphQL error). The agent then
   recovered with the same REST call, one or more turns later at ~220k context.
   `notes/add-update-dependencies-skill.md` recorded the workaround but never moved it into the
   payload.

## Ranked levers not changed here

Rank = share × removable ÷ risk. Savings are shares of total billed cost, estimated from the
source split above.

| # | Lever | Kind | Est. saving | Risk |
|---|---|---|---|---|
| 1 | After a gap of 1h or more, resume with `/continue` in a fresh session instead of the stale one. The rewrite is then ~30k tokens, not ~200k. | workflow proposal | ≤ 3% | context that `/save` did not capture is lost |
| 2 | Keep one model per session; run a different model as a subagent. | workflow proposal | ≤ 1.7% | none |
| 3 | Make `wiki.md` and `notes.md` link their docs instead of `@`-importing them, so they load only when a wiki or notes file is read. 49% of sessions that pay for them write neither kind of file. The user chose on 2026-09-02 to keep them eager (`notes/slim-claude-md-into-rules.md`); this data is the case for reopening that choice. | flag | 0.8–1.1% (subagents included) | style drift if the rule does not fire before a write |
| 4 | Prompt-audit trim of the verb bodies (`ship` 17.5 KB, `verify` 15.3 KB, `continue` 11 KB, `save` 9 KB). Change emphasis and commands into plain descriptions, and delete text that repeats a reference. | flag | 0.7–1.0% | verb behaviour; Git-fronting steps must survive |
| 5 | Run `/plan`'s review author on Sonnet 5 when the parent uses Opus or Fable. It costs $0.54–1.80 per plan, and 96–98% of that is input. | model choice: propose only | ~0.5% | visual quality |
| 6 | `/apply` ticks tasks with the Edit tool, not `sed -i`, so Claude Code does not re-inject the whole file. The cause is only partly confirmed. | investigate | ≤ 1% | none |
| 7 | `/wong-sync` ClaymooHeadless (on 15.0.0, still has 6 `openspec-*` skills). | action | local | none |
| 8 | Trim the `WONG-STACK` block (proposed diff below). | flag | < 0.1% | low |
| 9 | Drop the repeated `context` field from `openspec instructions --json` after the first artifact (873 chars × 4 per plan). | flag | ~0.1% | none |

Rejected: asking the model to spend fewer tokens, capping tool output, and cutting `/save`'s
runbook to reduce turns. `/save`'s cost is inherited context, so fewer steps save little and risk
the gate.

## Proposed `WONG-STACK` block diff (not applied)

Labels: keep, rewrite, delete, move. The measured value is small. The main reason for the change
is less duplication with the skill bodies, which load when a skill runs anyway.

- keep — `## Where context lives` heading, the four-surface table, and the credentials paragraph:
  product and environment facts that the model cannot infer. The credentials line fixes an
  observed behaviour: asking the user for a token.
- rewrite — "Before any non-trivial change, **find and read the owning doc** rather than
  guessing" → "Before a non-trivial change, read the doc that owns the topic". Emphasis and
  "rather than guessing" guard against a behaviour this model does not show.
- keep — "Don't duplicate a fact across surfaces." and the `openspec list`/`show` pointer.
- rewrite — "**Always use ASD-STE100…**" → "**Use ASD-STE100…**". "Always" is emphasis only.
- rewrite — the verbs bullet: keep the chain, the "precondition invokes the verb before it"
  rule, and the change-loop link.
- delete — from the verbs bullet: "Use `/explore` for read-only investigation and `/plan` for
  selected improvement work" and "Each verb's loaded description says when to use it". They
  repeat the skill descriptions that every turn already carries.
- delete — from the verbs bullet: "on an intent you give it, or on the thread this session
  established — and `/explore` always asks its questions before anything is drafted". This is
  owned by the `ship` and `explore` bodies.
- move — from the verbs bullet: "The change and its note share a name… `/save` records the
  actual branch". This is already owned by `notes/README.md` and `/save`, so delete it here.
- keep — the Git-ownership bullet and the CI-gate bullet: rules that each mode depends on.
- rewrite — the prose bullet: keep the rule and the allowlist link. Delete "no branch, PR, or
  `/ship`. Routing is by path prefix, never file extension". The prose-save reference owns it.
- rewrite — the `/wong-sync` and `/improve` bullets → one line: "`/wong-sync` updates
  WongStack; `/improve` runs a bounded maintenance spot check; send an improvement back as a
  manual pull request ([contributing])". Delete the mechanism, which repeats the skill
  descriptions. Move the scheduling detail to [repository improvement], which already holds it.
- keep — "Don't edit `wiki/` mid-task" and the path-scoped-rules bullet. Codex reads `AGENTS.md`
  and does not auto-load rules.

Net: ~1.3k of 4.2k chars (~500 tokens per session and per subagent).

## Test plan for flagged levers

- **Offline:** use 8–10 prompts from real transcripts, phrased as users write them. Examples:
  bare `/save`; `/ship <short intent>`; `/explore why is X slow`; `/continue <change>`; a
  wiki-page edit; a notes-only save; `/verify`; `/wong-sync` in a target. Run each twice per arm
  (A = main, B = the flag branch) in fresh worktrees, with the same model and effort.
- **Cost:** `node scripts/measure-usage.mjs --cwd <worktree-prefix> --json` for $ per task,
  requests per task, cache hit rate, and subagent share.
- **Quality:**
  - Checklist per prompt: PR opened with the rendered body, `SAVE_GATE_RESULT` reported, change
    archived, note in the convention's shape, and asks in the ask format.
  - For lever 3, a style rubric on each wiki diff: topic title, lead sentence, links, and no
    duplicated fact.
  - For lever 5, reviewer acceptance of `review.html` with no revision round.
- **Ship rule:** ship when $ per task drops beyond run-to-run noise and no checklist item
  regresses. Record null results here.
- **Online:** this is a template repo with few users. After `/wong-sync`, compare per-skill
  $ per invocation in the targets with `--since <sync date>` over two weeks.
- **Rollback:** revert the commit. Targets take the revert on their next `/wong-sync`.

## Gaps

- No offline eval ran. Quality is protected only by what was left unchanged.
- The source split is an estimate: 2.5 chars per token, fixed media size, and thinking carried in
  context is unattributed (~22% of input-side cost).
- Per-request system prompt and tool-schema tokens are not visible per section. Only the
  first-request read and write split is available.
- No reasoning-item or tool-schema levers exist at this layer; Claude Code owns them.
