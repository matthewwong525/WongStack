## Context

See proposal.md — Why. The generated `openspec-explore` and `openspec-propose` skills stay pristine, so every behavior here lives in the three WongStack wrappers: `explore`, `plan`, `ship`. The precedent for a wrapper that behaves differently when another verb calls it already exists twice: `/plan` has "When `/apply` invokes `/plan`," and `/apply` has "Resolve the plan first." This change adds the same shape to `/explore` and `/ship`. AskUserQuestion allows at most four questions per call, and this session is itself non-interactive, so the fallback is not hypothetical.

## Goals / Non-Goals

**Goals:**
- One place asks, once: the exit of `/explore`.
- One rule for the loop: a verb whose precondition is missing invokes the verb before it.
- No new artifact, file, flag, or verb.

**Non-Goals:**
- Merging the two checkpoints of a one-go run into one. That touches `/save` and both "exactly once" rules and is its own change if ever wanted.
- Changing `/apply` beyond what it already does. It is the middle of the chain and needs no edit.

## Decisions

**The round lives in `/explore`, at its exit.** Alternative: in `/plan` before the propose step. Ruled out because finding forks requires investigating the codebase, which is `/explore`'s job; `/plan` would duplicate it. Placing the round at explore's *exit* makes standalone and bounded modes share one rule: standalone exits when the user says "plan it," bounded exits after investigation.

**Bounded mode is a section of the `explore` wrapper, not a separate skill.** Same pattern as "When `/apply` invokes `/plan`." The generated skill still owns the stance; the wrapper adds "when `/plan` invokes `/explore`: read, investigate the gap, ask once, summarize, return, write nothing."

**`/plan` always runs the bounded pass, even after a standalone explore.** Alternative: detect whether the conversation already explored and skip. Ruled out as fuzzy. The bounded pass after a thorough standalone session investigates nothing and asks nothing, so it costs little and the rule stays uniform.

**`/plan` records answers; `/explore` writes nothing.** Keeps explore's "nothing is written" property. Answers land in the proposal's Decision log as `asked X → chose Y` or `asked X → assumed Y (non-interactive)`, which is where a cold reader looks for why the change is shaped this way.

**Non-interactive fallback: recommended option, marked assumed.** Alternative: stop and wait. Ruled out because a scheduled or remote run would hang forever. Marking the answer as assumed keeps the reviewer able to tell a decision from a default.

**`/ship` pulls in `/apply`, not a new verb and not a flag.** Alternatives: `/go` (a seventh verb across CLAUDE.md, the loop diagram, the manifest) or `/ship --all` (flags are foreign to the verbs, which read intent from their argument). The pull-in mirrors `/apply` → `/plan` exactly, so the loop gains one uniform rule instead of a special case.

**Trigger is an explicit argument, never detection.** Bare `/ship` on `main` keeps stopping. The argument is passed to `/apply` verbatim so `/apply`'s existing resolution order, including the "sole active change only when the conversation establishes no different work" guard, decides what it means.

**`/ship`'s preflight gains a branch, not a rewrite.** Step 1 today stops on the default branch or on nothing-to-ship. The new text: if either stop condition holds *and* an argument was given, invoke `/apply` with the argument, then re-run the preflight. Everything from Step 2 onward is unchanged. The authorization sentence at the top of the runbook widens to cover the pulled-in stage.

## Risks / Trade-offs

- [Every `/plan` now runs an explore pass, even for a one-line fix] → bounded mode's first instruction is "investigate only what the conversation does not answer"; a trivial intent yields a short pass and zero questions. The user can also type "just do it" into the AskUserQuestion "Other" field.
- [A bounded explore drifts into open-ended thinking and never returns] → the wrapper states the bounded steps and the exit explicitly; the summary is the return signal.
- [`/ship <intent>` picks the wrong change] → it never resolves anything itself; `/apply`'s resolution rules and its "ask, do not guess" fallback apply unchanged.
- [Two CI runs per one-go task] → accepted; it is what running the verbs by hand costs today, and both "exactly once" rules are load-bearing.
- [The assumed-answer marker gets dropped when a later `/save` syncs the proposal] → the Decision log is append-only by contract; the marker sits in a dated entry that `/save` never rewrites.
