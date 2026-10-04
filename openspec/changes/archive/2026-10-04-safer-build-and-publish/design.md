# Design

## Context

See proposal.md for motivation. Three facts shape the wording:

- `/apply` starts each helper with a two-line prompt, and [the helper brief](../../../.agents/skills/apply/references/build-helper.md) says "The plan on disk is your whole context". Nothing writes a mid-build answer to disk; `/save` logs decisions only later.
- `git-gate.md`'s auto-fix loop reads `gh run view --log-failed | tail -120` and says "Read the failing log, fix, commit, push, re-wait", capped at three attempts, each a full CI round.
- The instruction inventory had 114 spare bytes on 2026-10-04 (`node scripts/measure-context.mjs --check`), so every added byte needs a cut.

Sources: pstack `skills/poteto-mode/SKILL.md` ("Interrupt-chained resumes silently drop directives") and `playbooks/babysit.md` ("Classify CI before any retrigger"), at cursor/plugins e43c7ee; Matt Pocock's `engineering/pr/SKILL.md` ("one-way doors") and `engineering/diagnosing-bugs/SKILL.md`, at mattpocock/skills 24fe0ef. The wording here is original.

## Goals / Non-Goals

**Goals:** three behaviours in the fewest words, with the byte budget unchanged or lower.

**Non-Goals:** a new script, a change to `wait-for-checks.sh`, to the attempt cap, to `build-helper.md`, to `/continue`, or to hosted delivery.

## Decisions

- **The parent logs the answer, not the helper.** The helper can't reach the person and has already stopped; the parent holds the answer. In `apply/SKILL.md`'s question stop, add: log the answer as an `Asked` Decision-log line, in the format `/plan` already owns, then start a new helper. Alternative: pass the answer in the helper prompt. Rejected: it is lost again at the next stop and on a cold resume.
- **The plan is the source of the can't-be-undone line.** `/plan` writes it as a What Changes line when the change deletes or reshapes data, sends a message, or removes a key; `/apply`'s step 4 report repeats it. One clause in each of `plan/SKILL.md` and `apply/SKILL.md`. Alternative: have `/apply` judge it from the diff at report time. Rejected: a person who picks *Build and publish* never sees that report before it is live.
- **Diagnose all, then one push.** Replace the loop's opening sentence in `git-gate.md`: list each failing check and the cause its log shows, then fix all in one push; a check failing in code the diff never touched gets one `gh run rerun "$RUN_ID" --failed`, then a stop with the error and the checks link. The re-run counts as an attempt, so the cap needs no new rule.
- **Pay with trims in the same three files.** Candidates, to settle while building: in `git-gate.md`, "Below the cap, fixing and re-pushing *is* the runbook, not a stop."; in `apply/SKILL.md`, wording that repeats the change loop's own text; in `plan/SKILL.md`, wording the CLI contract already owns. A trim must not remove a linked heading or a behaviour a spec promises.

## Risks / Trade-offs

- [The lines may not change what an assistant does] → Unverified until real use; the wrap-up records an "Unverified since" thread naming what to look for in the next real `/apply` question stop and the next red check.
- [A can't-be-undone line on every plan becomes noise] → The clause names three cases and says silent otherwise.
- ["Not caused by this change" is a judgement] → The rule is narrow: the failing code is outside the diff. When unsure, the assistant treats it as its own, which is today's behaviour.
- [Another change uses the same spare bytes first] → Rerun the measure after bringing main in and trim this change's own lines.
