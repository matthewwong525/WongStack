## Context

`/wong-sync` today runs **apply-then-propose**: Step 2 copies absent payload files and updates provably unmodified ones, and only then does Step 3 analyse capabilities and write a plan. `references/adapt.md` makes this explicit — landed files are to be described "as landed, never as tasks", followed by a task telling you to review what already happened.

That ordering has three consequences:

1. `SKILL.md`'s hard rule *"It proposes; it never implements"* is false of the run as a whole.
2. The plan is a **changeset list**, not a destination. A reader assembles the picture of their repo from N reason lines and a file inventory.
3. There is no place to state what a sync **costs**. The never-overwrite guarantee covers the file copy, so losses look like zero — but the real losses live in the grafts: a superseded local mechanism, a new obligation, a convention you can no longer do your own way.

Constraints that do not move: the payload is prose, so nothing here is testable by a suite; the clone stays read-only; local authorship is never overwritten; verdicts keep one store.

## Goals / Non-Goals

**Goals:**
- Make `/wong-sync` write no repo changes, so its own hard rule is true and the review gate is the repo's existing loop.
- Give the adopter one document that says what their repo becomes, what they gain, and what they lose.
- Remove the self-update exemption without losing the "run under the newest logic" property.
- Keep the run non-interactive.

**Non-Goals:**
- The two-subagent analysis, the capability unit, the five verdicts, and the verdict record's format and tick surface all stay as they are.
- No change to the payload manifest, `/wong-setup`, or `/apply`'s own contract.
- No deduplication of sync plans, and no detection of an unapplied one.

## Decisions

### 1. The gate is the loop, not a prompt

`/wong-sync` writes exactly two things: `.claude/wong-sync-verdicts.md` and one `openspec/changes/sync-wongstack-<date>/`. Everything it wants done is a task.

**Why not an interactive gate.** A yes/no prompt in a terminal is worse on every axis than the loop already in this repo: a plan is reviewable when the reader has time, editable before it runs, and travels in a PR diff. It also needs no new mechanism. `adapt.md`'s existing rationale — that avoiding a per-capability prompt wall is worth the loss of a gate — survives, but its framing inverts: the gate is now the loop, so nothing is traded away. **The approval decision is never a prompt.** That is distinct from asking a bounded number of clarifying questions before the plan exists, which Decision 8 permits.

**Rejected:** `/wong-sync` gaining an `--apply` flag. It restores the contradiction for the sake of one saved command.

### 2. Following the clone's instructions is a read, not a write

The self-update pass conflated two things:

| | today | now |
|---|---|---|
| which instructions **this run** follows | requires writing the file first | read `$WS/.claude/skills/wong-sync/**` — no write |
| which instructions are **installed here** | happens before the gate | an ordinary task in the plan |

The blob-hash proof still decides the first: only when the local copy is provably unmodified does the run adopt the clone's text — a locally edited `wong-sync` was changed on purpose and keeps running under its own instructions, with the adaptation proposed as usual. The re-read discipline is unchanged (discard the loaded text, re-run Step 0 against the new one, never refresh the clone twice). The "at most once" rule is no longer needed to stop a loop, because there is no write to loop on, but the never-re-fetch rule stays.

Disclosure is kept and strengthened: the run states which version's logic it followed and why, because a run that behaved like a version other than the installed one is exactly when a reader needs to know which text to consult.

### 3. The after-picture is the proposal

`proposal.md` gets four regions in a fixed order:

```
 After       how this repo works once this lands, in its own terms
 Gain        grouped by what the repo will be able to DO
              └─ each group names what it replaces here
 Lose        superseded mechanisms · new obligations · lost optionality
 Resolution  which parts are sharp · which are "shape it with /plan"
```

**Grouping, not enumeration.** A first sync lands ~60 files. Flat, that is a wall nobody finishes reading, and the Gain region degrades into a file inventory. Grouping by capability keeps the same shape readable at both scales, and it is what the cartographer already produces.

**Resolution is the honesty valve.** `adapt.md` already concedes some grafts cannot be described concretely and become a *shape it with `/plan`* task. A destination narrative invites confident invention, and a picture sharper than the truth is worse than a task list, because it gets approved. So the picture states its own resolution rather than smoothing it.

**Why this dissolves the `present` leak.** The bias toward `adopt` already exists, but `divergent` was given an earned bar and `present` was not, and no verdict expresses *partially* present. You cannot write "here is your repo after this" without confronting partial coverage, because the After region is concrete and in the repo's own terms. As a cheap backstop, a `present` reason line must now **name where this repo expresses the capability**; unattributable, it is `adopt`, exactly as an unattributable difference is already `adopt` rather than `divergent`.

### 4. Seed manifest copies first

A seed manifest (`version` and `commit` both null) means `/wong-setup` just handed off and every payload file is absent — the bulk copy *is* the install, and there is no existing repo state for it to supersede. Gating it buys nothing and costs a round trip at the least convenient moment.

So on that one path the files land first and the after-picture describes them as landed, exactly as `adapt.md` does today; the plan's tasks are the grafts only. Every other run is plan-first. An **absent** manifest is unchanged: stop, point at `/wong-setup`.

### 5. Declining is a tick on the record, not a deleted task

The plan-first flow makes `declined` genuinely reachable for the first time — but only if refusal has somewhere to go. Deleting a task, or simply never running `/apply`, tells the record nothing, and the capability is re-proposed forever.

**Decision: make the `adopt` lines checkboxes too.** Every other group in `.claude/wong-sync-verdicts.md` is already a checkbox, and the file's whole interactive surface is already *tick a box to overrule the verdict*. Extending it to the one group that lacks one makes the surface uniform and the semantics symmetric:

- tick a **non-`adopt`** line → force it to `adopt` next run (unchanged)
- tick an **`adopt`** line → record it `declined` next run, judged against the current clone commit

**Rejected: `/apply` reports back what it skipped.** It couples a generic verb to one skill's bookkeeping, and it cannot distinguish "not wanted" from "not done yet".

**Rejected: a not-wanted marker in `tasks.md`.** It would put a verdict outside the record, breaking the one-store rule, and would require scanning change folders including archived ones.

An unapplied plan therefore stays re-proposed — which is correct. Not yet done is not a refusal.

### 6. The manifest records payload state, not what was examined

`version`/`commit` mean **which upstream release this repo's payload files were brought to**. That is a file-level fact, so the manifest write groups with the file-landing tasks and is the last of them. No files landed → no manifest write, and the next run walks the same changelog span again.

Partial acceptance needs no special rule, because the two facts have separate stores: files are tracked by the manifest, capability adoption by the verdict record — which recomputes every verdict except `declined` on every run. Take the files and three of four grafts, and the fourth is recomputed and re-proposed next run whether or not the version advanced. Nothing hides.

### 7. Task granularity

One coarse task for the file moves (*copy the N files listed in `proposal.md`*, and the same for updates), because sixty tasks is a wall and because a model hand-copying files is slower and less reliable than the scripted operation it replaces. Each graft stays one task at the existing concreteness bar — capability id named, described in this repo's terms.

The *"review the N files this sync landed"* task is removed. It existed because files landed before review; nothing lands unreviewed now.

### 8. A bounded clarification stage, before the plan

Between the subagent reports and verdict assignment — the only point where the run knows what is ambiguous and has committed to nothing — the skill MAY ask the user a small number of questions.

**What this is not.** It is not approval, and it is not per-capability. *"Do you want capability X?"* is never asked: that is what the plan is for, and the review is the answer. Asking it would rebuild the prompt wall Decision 1 exists to avoid.

**The scope is narrow by construction.** The adopt-bias already resolves uncertainty about *evidence* — in doubt means `adopt`, because a wrong `adopt` costs seconds in review. Asking must not erode that, so a question is only permitted where no amount of reading the repo could settle it, because the missing fact is the **user's intent**:

| question | why the bias can't settle it |
|---|---|
| Is this local difference deliberate? | `divergent` needs a *deliberate* alternative; the skill can see the mechanism but not the intent |
| Is this unmet `assumes` a gap or a choice? | `not-applicable` turns on whether the repo *wants* the assumption met |
| Which of two shapes should this graft take here? | otherwise it degrades to a *shape it with `/plan`* task |

The first two are the leaks found in `/explore`: `divergent` attribution, and the `assumes` check acting as a pre-filter ahead of the bias.

**Bounds are a test, not a quota.** A fixed cap is wrong at both ends: three is an interview for a one-file update and far too few for a first sync over the whole payload, where genuine ambiguity scales with what is being adopted. So each question must earn its place on its own:

1. **The answer changes the plan** — a different verdict, or a concrete graft where the alternative was a *shape it with `/plan`* task. A question whose answers all produce the same plan is not asked.
2. **The repo cannot answer it.** Anything the surveyor could establish by reading is read, not asked.
3. **It is about intent**, per the table above.

Questions are asked in one batch, grouped, ordered by how much the answer changes — so the user can answer the top few and stop. Every question states what happens if it goes unanswered.

**The user is the real cap.** Because an unanswered question resolves toward `adopt`, stopping partway is a supported way to answer: the rest fall to the bias and the plan is still written. That is what makes an unbounded count safe, and it is why no number is specified.

**Unanswered means the bias.** In a non-interactive context — cron, headless, a piped run — or when the user skips, the run proceeds and each unanswered question resolves toward `adopt`. The property from Decision 1 therefore holds unconditionally: a run that is never answered still completes and still writes a plan. Questions improve the plan's inputs; they are never load-bearing for it.

**Answers are durable, in the store that already exists.** An answer becomes the reason line of the verdict it produced, marked as the user's word rather than the skill's reading — the same *who decided* axis the taxonomy already splits on. A question is not re-asked while the clone commit it was answered against is unchanged, exactly as a `declined` is not re-pitched until upstream moves. The verdict itself still recomputes every run; only the question is suppressed. No new file, no second store.

**Rejected:** asking during the file classification. Copy-if-absent and update-if-untouched are proofs, not judgments — there is nothing to ask.

## Risks / Trade-offs

- **Every sync now needs a second command.** A one-file update that used to land in the working tree now needs `/apply`. → The plan for such a run is one coarse task, and `/apply` is one command; the run's report names the folder and says so.
- **The run must faithfully follow instructions it read but did not install.** → Identical to the discipline the current self-update pass already requires ("discard the text you were running under"); the only change is that no write accompanies it.
- **Stale sync plans can accumulate**, since duplicates are accepted by design. → The report names any existing `sync-wongstack-*` folder it did not write, so an unapplied one is visible rather than quietly superseded.
- **The after-picture can overstate.** A narrative reads as more certain than a task list, and it is the thing being approved. → The Resolution region is mandatory, and a graft that cannot be described concretely must appear there rather than be smoothed into the After region.
- **A repo on an old installed `wong-sync` behaves like the old version.** → Expected and already handled: it proposes its own update through the ordinary path, and its report says which version's logic ran.
- **Questions could erode the adopt-bias**, turning "in doubt, propose" into "in doubt, ask" and making the run feel like an interview. → The permitted kinds are enumerated rather than described, each question must pass the changes-the-plan test, they arrive in one ordered batch the user can abandon partway, and every unanswered one resolves toward `adopt` — so the bias is the default rather than the exception.
- **Seed-manifest copy-first is a documented exception to the headline rule.** → It is stated in `SKILL.md`'s hard rules rather than buried in a step, so "writes nothing" is never read as unconditional.

## Migration Plan

Payload-only, so there is no runtime migration. Per `CLAUDE.md`: major `VERSION` bump to `11.0.0`, a newest-first `CHANGELOG.md` entry marking the breaking items, and `node scripts/check-payload-links.mjs`. Target repos need no action — an installed copy keeps working and proposes its own update on the next run. Existing `sync-wongstack-*` and `adopt-wongstack-*` folders are left alone.

## Open Questions

None. The two carried from `/explore` — soft declines and partial acceptance — are settled in Decisions 5 and 6.
