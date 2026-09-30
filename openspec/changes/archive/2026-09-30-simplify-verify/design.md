# Design

## Context

See [the proposal](proposal.md) for the why. `/verify` today is three pages: `SKILL.md` (756 words, seven numbered steps), `references/walkthrough.md` (1,554 words, §§ a–f), and `wiki/development/staging-walkthrough.md` (1,614 words). The `staging-walkthrough` spec's 17 requirements stay as they are; the rewrite changes instructions, not behavior. `verify-staging.sh` (`scout-check`, `preflight`, `run`, `publish`, `cleanup`) and `verify-runner.sh` stay unchanged. Other skills and pages link into these pages by anchor.

Two open jobs overlap: #213 (`zero-trust-defaults`) edits the Access-heal paragraph of `SKILL.md`; #215 (`agent-browser-mobile`) edits the hand-over scripts in `verify/scripts/`.

## Goals / Non-Goals

**Goals:** a short, goal-led `SKILL.md` in the shape of `/improve`'s; one home per point across the skill, the reference, and the wiki page; plain checks named in the skill.

**Non-Goals:** moving the hand-over, key, and password scripts; any script edit; any change to `/ship`'s walk step.

## Decisions

- **The skill states the goal, the authority, and the limits.** `SKILL.md` opens with the outcome: *show, with evidence from this commit's deployed preview, whether the change does what its scenarios promise*. Then it gives what an invocation authorizes (unchanged list), the order that matters (scout before spending: `scout-check`; save, then `preflight`; walk and grade; post on every verdict; on `FAILURE`, reset then fix in scope or stop; report), the Access-heal paragraph, the verdict table, and the hard rules. How to probe, write journeys, and grade lives in the reference. Numbered step headings go; the order is one short list, because the order carries the "nothing to walk costs nothing" and "walk this commit" promises. Alternative: keep the numbered steps with shorter text. Rejected: a runbook is what the user asked to leave behind.
- **Keep linked anchors or fix every link.** `#verdicts` stays as a heading. Removing `#step-1--scout-first-before-spending-anything` and `#step-4--verify-healing-the-block-you-can-fix` means updating every link to them (the reference's § a, the wiki page's *When the walk can't get in*, and any others `check-payload-links.mjs` finds). Installed repos' own pages link only the wiki page's headings, which keep their text.
- **The Access paragraph moves whole.** It keeps main's exact wording as a single paragraph, so #213's one-paragraph edit merges on either side; whichever change ships second takes #213's text.
- **One home per point.** The wiki page owns *why*; the reference owns *how*; the skill owns *what and in which order*. Concretely:
  - The wiki page's *The probe ladder* keeps only why a scenario no probe reaches is listed by name, linking the reference for the ladder itself.
  - Its *Why a walk runs the way it does* keeps each reason and drops the restated rule text the reference owns (journeys from scenarios, no assertions, waits).
  - Its *When the walk can't get in* and *When a walk fails* keep the reasons (one heal, why reset, why two attempts) and link the skill for the steps.
  - The reference drops its opening paragraph on which `RESULT` triggers which section (the skill owns order) and § e's restated fix actions (the skill owns them); § e keeps the in-scope definition.
  - The wiki page keeps every heading an installed repo may link and every declined option `The walkthrough page records what was declined` requires.
- **Plain checks are one short paragraph in the skill.** With no change's scenarios in play, use the named address, else run the normal `/save` and `preflight` for this commit's preview; use the same probes and tools; show the evidence in the chat; post no comment unless asked; run `cleanup`. Its verdict follows the same table. Alternative: a separate skill. Rejected: the description already promises it, and the tools are the same.
- **Words go down.** `node scripts/measure-context.mjs --check` must pass, and the skill plus reference should shrink by a clear margin; the wiki page is not counted as instruction text but should also shrink.

## Risks / Trade-offs

- A shorter skill drops a detail an agent relied on → every spec requirement maps to a line in the skill or the reference; the build checks each of the 17 requirements plus the new one against the result.
- #213 or #215 conflicts → only the Access paragraph overlaps #213, kept whole; no file overlaps #215.
- A dropped anchor breaks a link → `check-payload-links.mjs` fails on it.

## Migration Plan

A minor payload release: a `## Next (minor)` entry with an Updating note saying there is nothing to do by hand. No script, schedule, or data migration. `/ship` archives, numbers, and merges; CI is the gate. No app preview is needed: nothing under `app/` or `mini-apps/` changes.
