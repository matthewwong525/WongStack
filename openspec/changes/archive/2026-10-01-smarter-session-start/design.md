# Design

## Context

See proposal.md, Why. `digestPlan` in `.agents/skills/memory/scripts/lib/digest.mjs` runs one batch: other-slug threads (`THREAD_CAP = 8`, under `THREAD_MAX_AGE_DAYS = 30`), non-thread facts by `TYPE_ORDER` (`LIMIT 60`), a count of live facts and other-slug threads, the current slug's threads, the last run, and consolidation state. `buildDigest` fills `MAX_LINES = 40` and `MAX_BYTES = 6 KB` in that order. With facts up to 400 characters, the byte cap binds first: on 2026-10-01 the digest held 8 other-slug threads and 5 feedback facts, and no project fact.

`personPage(ctx)` already finds the `wiki/people/` page listing the git email; `personalFilter` uses it for team filtering. The startup instruction route (`AGENTS.md`, wiki style and voice, skill descriptions) sits at its 2,200-word ceiling in `scripts/measure-context.mjs`; the digest is excluded from that count.

## Goals / Non-Goals

**Goals:** the start holds only what applies to every task; the agent searches memory with its own terms once it knows the task; open threads on other changes stay one search away.

**Non-Goals:** a model call or a new hook; reading the first user message; links between facts; a schema, Worker, or migration change.

## Decisions

- **Drop the other-slug thread statement.** Remove it with `THREAD_CAP` and `THREAD_MAX_AGE_DAYS`. Replace the count with a per-tag count: `SELECT ft.tag, count(*) FROM facts f LEFT JOIN fact_tags ft ON ft.fact_id = f.id AND ft.tag IN (<VERB_TAGS>) WHERE <where> AND f.type = 'thread' AND f.slug != ? GROUP BY ft.tag` (a thread with two verb tags counts under each; untagged rows come back as `NULL`). `buildDigest` prints one line right after the current change's threads: `Open threads on other changes, by step: plan 3, save 5, ship 2; 41 untagged. When a step starts, load its own: \`<script> search --type thread --tag <step>\`.` Alternative: keep 3 listed — rejected by the user.
- **`VERB_TAGS`** is a constant in `digest.mjs`: the existing topic tags named after a verb or skill — `explore`, `plan`, `apply`, `save`, `ship`, `continue`, `verify`, `routine`, `sync`, `setup`, plus `close` and `improve`, which the first writer defines through `newTags` as usual. Alternative: an `on:<verb>` namespace — rejected; it duplicates tags writers already use and needs new definitions.
- **Writers tag threads.** `references/writing-facts.md`'s *Unanswered questions* line adds: tag the verb or skill whose next run should check it. The gate needs no change; tags already pass `tagProblems`.
- **Consolidation tags old threads.** The memory skill's consolidation step adds: supersede an open thread that names a verb's next run but carries no verb tag with the same body and that tag. This uses the existing supersede write, so no Worker statement changes; a teammate's run only restates their own threads, the admin's restates all. The restated thread gets a fresh date, which is harmless now that threads no longer age out of the digest.
- **People page section.** `digestPlan` calls `personPage(ctx)` once (the filter already reads it; reuse one result) and passes `{ path, text }` to `buildDigest`. It prints `## You (<path>)`, then the page body minus its `#` title and its `Back to` footer, line by line, until `PERSON_MAX_BYTES = 1536`; when cut, a final line `The rest: <path>.` Lines count against `MAX_LINES` and `MAX_BYTES` like facts. The page is read from the checkout, like `currentSlug` reads proposals; it is committed text, so it carries no privacy change.
- **Header line becomes the search prompt.** Replace `Search more: \`…search <terms>\`.` with: `Once you know the task, and before you act on more than a quick question, search memory for its key terms in your own words: \`<script> search <terms>\`.` This is the rule; no `AGENTS.md` line is added, so the startup ceiling holds. Alternative: an `AGENTS.md` rule — rejected, it needs an offsetting cut of a rule every session reads.
- **Order:** header, run line, current change's threads, other-thread count line, person section, then non-thread facts by `TYPE_ORDER` (feedback, project, reference, user), then the left-out count.
- **Rejected approaches** (from /explore, kept here for the record): a `UserPromptSubmit` hook running FTS on the raw first message — on this chat's real messages it returned unrelated facts that can't be unloaded; backlinks — rank importance, not relevance to the task; a model-picked digest — 1–3 s and a model call per session.

## Risks / Trade-offs

- [The agent skips the search] → the prompt sits in the digest's first lines every session; `/explore` and `/continue` still search on their own. A miss leaves the agent with today's information minus the other-slug threads.
- [Other changes' threads get less attention] → the gate still lists up to 3 matching open threads on every write, and consolidation closes answered ones; the count line points to the rest.
- [A long people page crowds facts out] → capped at 1.5 KB with a pointer to the rest.
- [A branch edits the people page] → it only changes what that branch's own session shows; the team filter already reads the same page.

## Migration Plan

None: no schema, Worker, or hook change. The next session start after the update uses the new digest; the offline cache refreshes on the next online start. Rollback is reverting the release.
