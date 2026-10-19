# Design

## Context

The rule lives in `.agents/skills/explore/references/asking-the-user.md#which-tool-carries-it`. Skills link it from their closing lines, but those lines spell the options inline (`/apply` step 5: "End with the next step: publish it *(Recommended)* via `/ship`, change it more, or save via `/save`"). The page's own anatomy example is a numbered list in a code fence. In 17 of 25 slips the agent never read the tool section.

Evidence (Claude transcripts since 2026-10-01, scripts kept out of git):

- 516 closing asks; 25 typed. 19 of 462 before compaction (4%), 6 of 54 after (11%).
- By the skill active at the time: `/verify` 10 typed / 51 asked, `/ship` 4/65, `/save` 3/68, `/close` 4/111.
- helpless-fox, `f796012e…jsonl`: compaction at line 716. Its summary said "End with a question: Publish it (Recommended) / Change it more / Save for later", and Claude Code's resume line says "without asking the user any further questions". Slips followed at lines 751 and 923.
- Codex (`~/.codex/sessions`, `archived_sessions`, 313 files): 5 `request_user_input` closing asks, 0 typed.

`.claude` and `.codex` both link to `.agents`: `.agents/settings.json` is Claude Code's, `.agents/hooks.json` is Codex's. The memory `SessionStart` hook matches `startup|resume` and registers the session on every run.

Budget: `node scripts/measure-context.mjs --json` shows instructions at 190,842 of 190,845 bytes. Every word added to skill text needs an equal cut on the same route.

## Goals / Non-Goals

**Goals:** catch a typed closing list in Claude Code before the person has to answer it by hand; re-anchor the rule after compaction; make the skill text say "ask with the tool" at the point of need.

**Non-Goals:** no Codex hook; no change to which actions need a question; no check on mid-turn text, only the reply that ends the turn.

## Decisions

### One script, two modes

`.agents/skills/explore/scripts/ask-check.mjs`, beside `other-work.mjs`, because `/explore` owns the asking convention. It reads the hook JSON on stdin.

- `ask-check.mjs stop`: the `Stop` hook.
- `ask-check.mjs reminder`: a `SessionStart` hook with matcher `compact`; prints one line and exits.

Rejected: adding `compact` to the memory hook's matcher. It would re-register the session and refetch the digest on every compaction.

### The stop check

1. Exit 0 with no output when `stop_hook_active` is true, `WONG_MEMORY_RUN=1`, or the transcript can't be read. A check that can't see the turn lets it end.
2. Read the turn from `transcript_path`: the rows after the last human message (a `user` row with text content that isn't the compaction summary or `isMeta`). Use the final assistant text; take `last_assistant_message` from the input when the host provides it.
3. Any `tool_use` named `AskUserQuestion` in the turn → exit 0.
4. Detect: the last non-blank lines end in 2–4 list items (`-`, `*`, `1.`, `1)`), and either the line before them ends in `?` once trailing `*`, `_` and spaces are trimmed, or an item contains `Recommended`.
5. On a match, print `{"decision":"block","reason":…}`. The reason: *Your reply ends with choices typed as a list. Ask them now with AskUserQuestion, recommended first; don't repeat the report or the list.*

Backtest on the same transcripts: 1,772 turns ended without the tool; this rule flagged 25 and all 25 are real slips. The `?`-only variant flagged 21; the four extra are headed `Next step:` or `## Next step`. The test fixtures copy the shapes of these (trimmed, no private text) plus non-slip endings: a "What changed?" heading over facts, a plain bullet report, a reply that called the tool.

Rejected: matching only `(Recommended)`. It misses `purple-dodo`'s plain `Which do you want?` list.

### The reminder line

`Asks, next steps included, go through the question tool (AskUserQuestion here), never typed as a list while it is callable: .claude/skills/explore/references/asking-the-user.md#which-tool-carries-it`

It costs a few dozen tokens per compaction and loads nothing else.

### Wording, inside the budget

- `asking-the-user.md`: draw the anatomy example as a question card in a `text` box, not a numbered list. Open *End every reply with the next step* with "Call the question tool" in place of "through the first callable tool". Add one clause under *Which tool carries it* naming the Claude Code stop check.
- `apply` step 5, `save`'s closing line, `ship` *Close*, `verify` step 5: "Ask [the next step] with the question tool: …" in place of "End with …". Same option names, no tool order (the payload rule forbids a second copy).
- `verify/references/walkthrough.md` § f: the comment lists the remaining checks as text; the chat ask goes through the tool.
- `payload-manifest.md`: name the ask hooks beside the memory hooks.
- Offset every added byte by trimming the same files; confirm with `measure-context.mjs --check`.

## Risks / Trade-offs

- [The typed list stays on screen above the box] → accepted; the box still arrives and the reason says not to repeat the list.
- [A headless `claude -p` run can't show the box] → `stop_hook_active` stops a second block, so the cost is one extra turn. Paseo sessions run as `sdk-cli` too, so the entrypoint can't tell them apart.
- [Claude Code changes the transcript or hook format] → the script fails open (exit 0, no output); the test pins the fields it reads.
- [A legitimate list ends with a question] → none in 1,772 turns; the reason says *ask them now*, so a false alarm costs one extra turn.

## Migration Plan

Installs get the hooks through `/wong-sync`, which merges hook entries into target settings rather than replacing them. Rollback: remove the two entries from `.agents/settings.json`.
