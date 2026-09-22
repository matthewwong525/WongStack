## Context

The choice format and the host tool order live in [`/explore`'s SKILL.md](../../../.claude/skills/explore/SKILL.md#question-mechanism), inside a section written for the explore-to-plan transition. `/continue` restates the tool order in one long bullet; `/improve` links the section and repeats its rules; every other skill asks in prose — "stop and ask", "ask the user", "ask how to proceed" — with no options and no recommendation. See [proposal.md — Why](proposal.md#why).

Constraints that shape the approach:

- **Skills are instructions, not code.** Nothing executes them, so the convention is enforced by being short, linked at the point of need, and impossible to miss.
- **The payload ships to other repos.** A file under `.claude/skills/explore/` travels with the skill directory, which [`payload-files.json`](../../../.claude/skills/wong-sync/references/payload-manifest.md) copies whole.
- **Context costs.** Ten skills linking one reference beats ten skills carrying a paragraph each; the reference is read only when a skill reaches an ask.
- **Host capability differs.** Codex `request_user_input` and Claude `AskUserQuestion` have different shapes and limits, and some sessions have neither.

## Goals / Non-Goals

**Goals:**

- One file a reader can follow to write any ask in WongStack.
- Each ask site names its options and their consequences, and links the convention for everything else.
- A reply that stops always names the decision that restarts the work.

**Non-Goals:**

- No change to which actions need authorization.
- No new script, tool, or dependency.
- No rewrite of `/explore`'s clarification budget.
- No edits to archived changes or their review pages.

## Decisions

**The reference lives at `.claude/skills/explore/references/asking-the-user.md`.** `/explore` owns questions in the loop, and skill-folder references linked across skills are the established pattern ([the CLI contract](../../../.claude/skills/plan/references/openspec-cli.md) sits under `plan/` and is read by `explore`, `apply`, and `ship`). *Alternative:* a wiki page — rejected because a skill at an ask site reads its own references, and the wiki hop adds a layer for a rule needed mid-runbook. *Alternative:* keep it in `/explore`'s SKILL.md — rejected because a runbook citing it would inherit clarification budget text that does not apply to a fix-or-merge fork.

**`/explore`'s SKILL.md keeps the budget and links down for the format.** The split is *what to ask and how many* (explore) against *what an ask looks like and which tool carries it* (the reference). That is the line that lets `/ship` cite one without the other.

**Confirmations become two-option questions.** `Delete these two databases (Recommended once you are sure) / Keep them and stop` reads the same way as any other ask, names the consequence on each side, and removes the ambiguity of a bare yes. The cost is slightly longer prompts; the benefit is that the recommendation and the consequence are visible at the moment of the decision.

**The convention governs form, not authorization.** Stated explicitly in both the reference and the spec, because the obvious misreading — "everything gets a confirmation now" — would add a prompt to every authorized runbook step and break `/ship`'s no-re-prompt chain.

**The next-step question is a closing habit, not a new section in each skill.** The reference states it once: before finishing, answer *what does the user need to decide for this to continue?* and put it as the same kind of question. Each skill's report step gains a sentence pointing at it, with its own typical options. *Alternative:* enumerate the stop points per skill — rejected as more text to keep in sync for the same result.

**No checker.** Deciding whether an ask is a genuine multiple choice requires reading intent from prose. A grep for "ask the user" without a nearby link would fire on the many lines that merely discuss asking. The [payload rule](../../../.claude/rules/payload.md) carries a one-line reminder instead, where the release ritual already loads.

## Risks / Trade-offs

- **Prompts get longer, and a long prompt is skipped** → Two or three options, one short tradeoff each. The reference caps option count and states that a wall of text defeats the format.
- **A skill treats the convention as permission to ask more** → The form-not-authorization rule is a requirement in the spec with its own scenario, and a line in the reference.
- **The closing next-step question becomes noise on an authorized chain** → The rule applies only where a reply hands control back; a handoff inside `/ship`'s authorized chain continues instead of asking.
- **The host tool cannot express a recommendation** → The `(Recommended)` label goes in the option text, so the convention needs nothing from the tool beyond options and free text.
- **A target repo on an older version has the old text in `/explore`** → `/wong-sync` copies the skill directory whole, so the reference and the edited skills arrive together.
