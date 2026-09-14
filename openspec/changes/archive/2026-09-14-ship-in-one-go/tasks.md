## 1. `/explore` skill (`.claude/skills/explore/SKILL.md`)

- [x] 1.1 Add a "The exit round" section: at explore's exit, collect the forks whose answer would make the artifacts wrong, ask them in exactly one AskUserQuestion call (≤4 questions, recommended option first and labelled, zero questions valid, no call when zero). State the 80/20 test: scope, observable behavior, compatibility, acceptance criteria are questions; naming, placement, wording are assumptions to record. Skip any fork the conversation already resolved; beyond four, ask the four that most change the artifacts and record the rest as assumptions.
- [x] 1.2 Add the non-interactive fallback to that section: when the session cannot answer or the tool is unavailable, take the recommended option and mark it *assumed* in the summary.
- [x] 1.3 Add a "When `/plan` invokes `/explore`" section (bounded mode): read the conversation, investigate only what it does not answer, run the exit round, end with a short "What we figured out" summary, return to `/plan`, write no file and create no artifact. State that standalone `/explore` keeps its open stance and holds the same exit round when the user says they are ready to plan.
- [x] 1.4 Update the closing handoff paragraph so it names the exit round as the moment before `/plan`; keep the `openspec-explore` invocation and the code-vs-AI section unchanged.

## 2. `/plan` skill (`.claude/skills/plan/SKILL.md`)

- [x] 2.1 Add an "Explore first" section before the `openspec-propose` invocation: always invoke the `explore` skill in bounded mode with the intent, whether `/plan` was invoked by the user, by `/apply`, or through `/ship`; then invoke `openspec-propose` with the intent and the answers.
- [x] 2.2 State in that section that `/plan` records each answer in the proposal's Decision log as `asked X → chose Y` or `asked X → assumed Y (non-interactive)`, and that `/plan` asks nothing of its own beyond the existing UX layout fork.
- [x] 2.3 Update the "When `/apply` invokes `/plan`" section with one line: the bounded explore pass still runs on that path, so the questions reach the user before any code.

## 3. `/ship` skill (`.claude/skills/ship/SKILL.md`)

- [x] 3.1 Widen the authorization sentence at the top: invoking `/ship <intent>` also authorizes the pulled-in explore, plan, implement, and save stages, with no re-prompt between stages.
- [x] 3.2 In Step 1, add the pull-in branch: when an argument was given and the preflight finds nothing to ship (on the default branch, or clean tree with 0 commits ahead), invoke the `apply` skill with the argument verbatim, let it resolve under its own rules, then re-run the preflight on the branch `/save` created. Bare `/ship` keeps every existing stop. A feature branch with work runs the runbook without invoking `/apply`.
- [x] 3.3 Add the stop rule to Step 1 and to Hard rules: if `/plan` pauses, `/apply` ends with tasks pending, or a `/save` inside the chain returns failing or unverifiable, report the blocker and stop before Step 2; never archive, checkpoint, or merge a partial change; never merge as a way of stopping.
- [x] 3.4 Update the description frontmatter (≤600 characters, trigger-focused) so it says `/ship <intent>` runs the whole cycle from intent to merge.

## 4. Wiki (`wiki/development/the-change-loop.md`)

- [x] 4.1 Change the `/explore` step from *(optional)* to always-runs: `/plan` invokes it when you skip it, and it owns the one-call clarification round at its exit. Keep the step one paragraph, link down to the skill.
- [x] 4.2 Add the chain rule beside the "diagram shows durable stages" paragraph: each verb invokes the verb before it when its precondition is missing, with the nesting `/ship` → `/apply` → `/plan` → `/explore`; `/ship <intent>` is the one-go entry.
- [x] 4.3 Extend the `/ship` step with one sentence on the pull-in and the stop rule; note that a one-go run has two checkpoints, and link to the gate section rather than restating it.
- [x] 4.4 Run the wiki-style checks by hand: no duplicated procedure between the page and the three skills, every named skill linked, the diagram stays visual-only.

## 5. `CLAUDE.md` (`WONG-STACK` block)

- [x] 5.1 Update the "Drive work through the WongStack verbs" bullet so the loop line no longer implies `/explore` is optional and adds that `/ship <intent>` runs the whole cycle. Keep the block free of repo-specifics and under its current length.

## 6. Release ritual

- [x] 6.1 Bump `VERSION` to 12.4.0.
- [x] 6.2 Add a newest-first `CHANGELOG.md` entry: the exit round in `/explore`, explore always runs, `/ship <intent>` one-go, the chain rule, the non-interactive fallback, and what a target gains on the next `/wong-sync`.
- [x] 6.3 Run `node scripts/check-payload-links.mjs` and fix any dead link.
- [x] 6.4 Confirm `git diff --stat` touches no `openspec-*` skill and no `agent-browser` file, and that the payload manifest needs no edit (no new files).
