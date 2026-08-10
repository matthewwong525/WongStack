# The adapt step

How `/wong-sync` turns "what upstream can do" and "what this repo already does" into a plan. This is Step 3 of the skill: it runs over every payload surface the repo **already has** (Step 2 already classified the rest, writing nothing). It writes two things and nothing else — a verdict record every run, and an OpenSpec change whenever the run has anything to do.

The premise is that updating is **adaptation, not replication**. A repo is up to date when it *can do* what WongStack does — not when its files match upstream's byte for byte. Two repos can both be current and share almost no bytes.

```
        ┌─────────────────────┐     ┌─────────────────────┐
        │   CARTOGRAPHER      │     │      SURVEYOR       │
        │   reads only $WS    │     │   reads only $ROOT  │
        │                     │     │                     │
        │   what WongStack    │     │   what this repo    │
        │   lets you DO       │     │   already does      │
        └──────────┬──────────┘     └──────────┬──────────┘
                   │                           │
                   └───────────┬───────────────┘
                               ▼
                   ┌───────────────────────────┐
                   │   CLARIFY — one batch,    │
                   │   only what the repo      │
                   │   cannot answer itself    │
                   └───────────┬───────────────┘
                               ▼
                   ┌───────────────────────────┐
                   │       MAIN THREAD         │
                   │  one verdict per capability│
                   │  present / divergent /    │
                   │  adopt / not-applicable / │
                   │  declined                 │
                   └───────────┬───────────────┘
                               ▼
         ┌─────────────────────┴─────────────────────┐
         ▼                                           ▼
 .claude/wong-sync-verdicts.md      openspec/changes/sync-wongstack-<date>/
   (every run — every verdict,          (every run with anything to do —
    tick a box to overrule)              the after-picture + every task)
```

## Why two agents

They run concurrently, share no context, and neither one's raw output is shown to the user.

**Independent reads are the point.** A single agent holding both sides drifts into pattern-matching target files onto upstream files — which is exactly the file-shaped thinking this step exists to escape. Keeping them blind to each other forces the comparison to happen where it belongs: at the capability level, in the main thread, which is also the only place that has the conversation's context.

Subagent output is **evidence, not conclusion**. The main thread owns every verdict.

Neither agent writes a file. Ever.

## The cartographer

**Reads:** only the refreshed clone (`$WS`). It is given no information about the target repo — not its name, not its stack, not what it has installed. Its map must be the same for every repo at a given upstream commit.

**Reads broadly within the clone**, and this is load-bearing: `.claude/skills/`, **the whole `wiki/`**, and **the `WONG-STACK` block of `CLAUDE.md`** are all first-class sources. The capabilities that matter most are often not in a skill at all — "CI is the gate when present, else PR review," "branch name = change name," "the wiki is progressive disclosure," "credentials live in the repo's environment files" are conventions, and a skill-shaped map would miss every one of them. That's the same keyhole the old file sync looked through; don't rebuild it.

**Maps capabilities**, where a capability is:

> a thing WongStack lets you do, plus what it assumes about your repo

Explicitly **not** one-per-file and **not** one-per-skill. One capability may span several files; one file may carry several capabilities; a capability may live entirely in a paragraph of prose.

Each record carries:

| field | what it holds |
|---|---|
| `id` | stable kebab-case identifier (see below) |
| `does` | what it lets you do, in one or two sentences |
| `expressedIn` | where upstream expresses it — paths, a wiki page, a section of the block |
| `assumes` | what it needs from a repo: a forge? CI? a frontend? OpenSpec? a particular stack? |
| `dependsOn` | other capability ids it builds on |

**Ids must be stable**, because the verdict record keys on them. Two rules:

1. Derive ids from **upstream content only** — never from the target — so the same upstream commit yields the same ids in every repo.
2. The cartographer is **given the ids already in this repo's verdict record** and must reuse a matching id rather than minting a new one for the same capability. Renaming an id orphans its entry and silently re-pitches something the user already declined.

## The surveyor

**Reads:** only the target repo (`$ROOT`). It is given no information about upstream — no capability list, no file names to look for. If it knows what it's looking for it will find it whether or not it's there.

**Scope: the repo's process surfaces**, not its application source:

- `.claude/skills/` — everything, not just payload skills
- `wiki/` or `docs/` — the whole tree
- `CLAUDE.md` / `AGENTS.md`, including content outside the `WONG-STACK` markers
- configuration: `openspec/`, CI workflows, `.env.example`, package manifests, forge settings
- top-level structure — enough to know what kind of repo this is

It **may** sample application source to answer "what kind of project is this," but it is not asked to read it broadly and it is never asked to review it.

**Returns:** what this repo already does and how — its conventions, its workflow, what's automated and what's manual, where process knowledge lives, and what it deliberately does differently. Plain description, no recommendations, no comparison (it has nothing to compare against).

### The read boundary

The payload manifest bounds what `/wong-sync` **plans**. It does **not** bound what the surveyor reads — it can't, because the whole job is noticing that this repo already solves something in a place upstream never heard of.

That's a real change from how this skill used to work, and it's safe for one reason: **there is no outbound path any more.** The manifest's old "never read outside this list" rule existed to guarantee nothing local could leak into a contribution PR. With the contribute leg gone, nothing the surveyor reads leaves the machine — it isn't written to the clone, isn't pushed, and isn't included in any outbound request.

## The clarification stage

Both reports are in and nothing has been decided. This is the only moment where the run knows what is ambiguous and has committed to nothing, so it is the only place a question belongs.

**This is not approval.** *"Do you want capability X?"* is never asked — that is what the plan is for, and reviewing it is the answer. Asking it would rebuild the per-capability prompt wall this skill exists without.

**Ask only what the repo cannot answer**, because the missing fact is the user's intent:

| question | why the evidence can't settle it |
|---|---|
| Is this local difference **deliberate**? | `divergent` needs a *deliberate* alternative; the skill can see the mechanism but not the intent |
| Is this unmet `assumes` a **gap or a choice**? | `not-applicable` turns on whether the repo *wants* the assumption met |
| **Which of two shapes** should this graft take here? | otherwise it degrades into a *shape it with `/plan`* task |

The first two are why this stage exists. The adopt bias already settles uncertainty about *evidence* — in doubt means `adopt` — but no amount of reading settles what someone meant, and both of those verdicts turn on exactly that.

**There is no fixed number of questions.** A cap is wrong at both ends: three is an interview for a one-file update and far too few for a first sync over the whole payload, where real ambiguity scales with what's being adopted. Each question earns its place instead, by meeting **all three**:

1. **The answer changes the plan** — a different verdict, or a concrete graft where the alternative was a *shape it with `/plan`* task. If every answer produces the same plan, don't ask.
2. **The repo can't answer it.** Anything the surveyor could establish by reading is read, not asked.
3. **It's about intent**, per the table above.

**Ask in one batch, ordered by how much the answer changes**, and state on each what happens if it goes unanswered.

**Unanswered resolves toward `adopt`.** In a non-interactive run — cron, headless, piped — ask nothing. When the user answers the first few and stops, that's a supported outcome, not an abandoned run: the rest fall to the bias and the plan is still written. **The user is the real cap**, which is what makes an unbounded count safe.

**Answers are durable and attributed.** An answer becomes the reason line of the verdict it produced, marked as the user's word rather than the skill's reading, carrying the clone commit it was answered against. Don't ask it again while that commit's expression of the capability is unchanged — the same rule that keeps a `declined` from being re-pitched. The *verdict* is still recomputed every run; only the *question* is suppressed. No new file: the record is the store.

## The gap analysis

The main thread takes both reports and any answers, then assigns **every mapped capability exactly one verdict**, each with a **one-line reason**.

The taxonomy splits on **who decided**, not on why. Four of the five verdicts are the skill's own reading of the evidence; exactly one records a decision the user made. That distinction is the whole point — it's what decides which verdicts are recomputed freely and which one carries the weight to suppress.

| verdict | meaning | decided by | becomes a task? |
|---|---|---|---|
| **present** | the repo already has it, current, at a named place | the skill | no |
| **divergent** | solved differently here, through a named, deliberate local alternative | the skill | no |
| **adopt** | missing, stale, or otherwise wanted here | the skill | **yes** |
| **not-applicable** | an `assumes` this repo doesn't meet | the skill | no |
| **declined** | the user said no | **the user** | no |

**When the evidence supports both `adopt` and another verdict, the verdict is `adopt`.** The costs are asymmetric: an `adopt` becomes one task in a plan the user reviews before anything happens, while every other verdict is effectively final until someone rereads the record. A wrong `adopt` costs seconds in review; a wrong `divergent` or `present` hides the gap indefinitely. Justify *not* adopting, not adopting.

**`declined` is only ever written from an actual refusal** — a ticked `adopt` line in the record, or something the user said. Never infer it, and never read silence as one: a deleted task, or a plan nobody applied, is **not** a refusal, because not yet done is not no. If you are reaching for `declined` and cannot point to something the user did, the verdict you want is `not-applicable`.

**`divergent` is the verdict that makes this step worth running — and it must be earned.** It's how the sync says *"you already solve this — leave it alone"* instead of pitching a redundant graft. It requires a **named, deliberate local alternative**: the reason line must name the local mechanism — a file, convention, or tool — that covers the capability ("you use a `Makefile` target where WongStack uses a skill"). A difference you cannot attribute to a local decision is `adopt`, not `divergent` — an accidental difference or a half-version of something old earns no protection. Where the mechanism is visible but the intent isn't, that's a question for the stage above, not a guess. It's kept distinct from `present` because the record needs to show *that the forms differ* — which matters when upstream later changes that capability.

**`present` must be earned too, on the same terms.** Its reason line must name **where this repo expresses the capability** — a path, a convention, or a tool. A capability you believe is present but cannot attribute to anything here is `adopt`, exactly as an unattributable difference is `adopt` rather than `divergent`. `present` used to be the one verdict with no bar, which made it the softest place for a gap to hide: a repo that half-does something reads as doing it.

**Check `assumes`, but don't let it pre-empt the bias.** A capability that assumes a frontend has no business in a CLI repo; that's a `not-applicable` with the assumption named, not a task — and not a `declined`, because the user never said anything about it. But an unmet assumption is not automatically a fit failure: a repo with no CI may want CI. Where the assumption is something this repo could plausibly gain, ask (above) or verdict `adopt` — never dispose of it silently on the assumption alone.

**A stale file that isn't provably unmodified is an ordinary `adopt`.** A payload file byte-identical to a historical upstream version is planned as a direct update at Step 2 and never reaches this analysis as stale. What can still arrive here stale is a file whose content matches no upstream release — a copy from a fork, or an edited lineage. Its verdict is `adopt` and its task says *take the upstream version verbatim*. There's no separate verdict for it — the difference lives in the task text, not the taxonomy.

### What the last run decided

Before assigning verdicts, read the previous [verdict record](#the-verdict-record) — `.claude/wong-sync-verdicts.md`, which is the only place verdicts live. **Only `declined` suppresses.**

A capability previously verdicted `declined` is **not re-pitched** — unless its upstream expression changed since the commit recorded with that entry, in which case **re-raise it**, saying it was declined earlier and what has changed since. A decline recorded against commit X is not a decline of what the capability became at commit Y; burying that would hide genuinely new information behind an old "no."

Every other verdict — `present`, `divergent`, `adopt`, `not-applicable` — is **recomputed from scratch on every run**. The previous record is a picture of the last run; it is not authority and must never be read as a reason to skip re-evaluating. Recomputing is close to free: none of the four becomes a task on its own, and the subagents have already done the reading. What it buys is correctness — delete the `Makefile` target that made something `divergent` and the next run notices, landing it on `adopt` instead of honoring a stale "you already solve this."

That distinction matters most for **`not-applicable`, which turns on the *target's* shape, not upstream's.** The recorded commit is a commit in the *clone*, so freezing a `not-applicable` against it would be a category error: the repo can grow CI, gain a frontend, or adopt a forge without upstream moving a byte, and the verdict has to follow the repo. Re-evaluate it every run.

A recorded id with **no counterpart in the new map** is reported as **retired** — upstream dropped or absorbed it. Say so; don't silently drop the entry.

**Migrating a manifest ledger.** Earlier versions kept verdicts in `.claude/.wong-stack.json` under `capabilities`, alongside the record — two stores for one fact. If that key is still present, fold its entries into the record on this run, and the plan's manifest task writes the manifest without it (the manifest keeps install state only). Honor each migrated `declined` as a user refusal: a ledger written before the `declined` / `not-applicable` split could mean either "the user said no" or "the skill judged it a poor fit," and after the fact the two are indistinguishable. The conservative read keeps suppressing something that may have been suppressed on the skill's say-so; the alternative re-pitches things the user genuinely refused, which is the louder failure. Anyone who wants a clean slate can tick its box (below).

### The changelog accounting

Step 1 collected the `CHANGELOG.md` entries between the manifest's recorded version and the clone's current one. After verdicts are assigned, account for **every** entry with at least one line, one of:

- **reflected here** — the entry's effect is already present locally; name the evidence.
- **adopt** — covered by a verdict in this run; name the capability id.
- **planned directly** — covered by Step 2's classification as a copy or an update; name the file.
- **outside payload scope** — the entry touches nothing the payload delivers to a target (`wong-setup`, source-repo tooling).

The accounting goes in the report, not the verdict record — the record's shape doesn't change. An entry with no line is a visible gap in the run's own output, and that is the point: "the sync missed this" must be impossible to do silently. A seed manifest has no prior version, so it skips the walk and the accounting.

## The output

Two artifacts, and nothing else. They have different lifecycles on purpose:

```
.claude/wong-sync-verdicts.md                 ← EVERY run. Every verdict.
openspec/changes/sync-wongstack-<YYYY-MM-DD>/ ← every run with ANYTHING to do
  proposal.md    the after-picture: After · Gain · Lose · Resolution
  tasks.md       the coarse file work, manifest last, then one task per `adopt`
```

The change folder is the *run*; the verdict record is the *picture of what was judged*. Only a run with nothing to do produces the second without the first.

**The change folder:**

- **It covers the whole run** — hence `sync-`, not the old `adopt-`. Copies and updates are changes to this repo, and they are tasks in this plan rather than edits that already happened.
- **Written whenever the run has anything to do**: a file to copy, a file to update, a newer `wong-sync` to install, or at least one `adopt`.
- **Nothing to do and nothing to adopt → no folder.** An empty change is noise. Say the repo is current and point at the verdict record, which is written either way.
- **Never overwrite an existing change folder.** If today's already exists, suffix it `-2`, `-3` — the existing one may be mid-flight.
- **An unapplied plan never suppresses a new one.** A repo may sit with a sync change nobody ran; write this run's plan anyway, because a changed situation deserves a changed plan. Name the older folder in the report so it stays visible rather than being quietly superseded.
- **Leave old `adopt-wongstack-*` folders alone.** They're historical changes, often already archived; renaming shipped records buys nothing.
- **No `openspec/changes/` in the target** → still write the verdict record, and explain why the change couldn't be written. (WongStack installs OpenSpec at setup, so this is rare.)
- Write `proposal.md` and `tasks.md` only. If a graft turns out to be large, the repo's own `/plan` can deepen it.

### `proposal.md` is an after-picture

Not a changeset list. The reader's question is *"what will my repo be, and what does it cost me"* — and until this document answered it, they assembled it themselves out of N reason lines. Four regions, in order:

```
 After       how this repo works once this lands, in its own terms
 Gain        grouped by what the repo will be able to DO
              └─ each group names what it replaces here
 Lose        superseded mechanisms · new obligations · lost optionality
 Resolution  which parts are sharp · which are "shape it with /plan"
```

The version span synced, the files to copy and update, and a pointer to `.claude/wong-sync-verdicts.md` all still appear — **subordinate to these regions**, not as the document's structure. Nothing has landed when you write this, so describe file changes as **tasks**, not as done. ⑂ The one exception is a seed manifest, where the copy already happened: describe it as landed.

**All four regions are always present.** A region with nothing in it says so and why, rather than being dropped.

**Gain is grouped, never enumerated.** Group by what the repo will be able to *do*, with file detail subordinate to the group it serves. A first sync lands sixty-odd files; flat, that's a wall nobody finishes, and the region decays into an inventory. Grouping is what lets one format serve a two-file update and a whole-payload install — differing in length, not in kind.

**Lose is the region that didn't used to exist**, and the one worth getting right. It is drawn from the *grafts*, not the file copy:

- **superseded local mechanisms** — a file, convention, or tool that stops being the way things are done here;
- **new obligations** — process the repo must now follow that it didn't before (a branch, a PR, a CI gate);
- **lost optionality** — a choice it can no longer make its own way without diverging.

**An empty Lose region must be justified, never just blank.** "Nothing is overwritten" is not evidence that a sync costs nothing: the never-overwrite guarantee covers the *file copy*, which is exactly where the losses aren't. If a sync genuinely supersedes nothing and adds no obligation, say that and say why.

**Resolution is the honesty valve.** A capability verdicted `adopt` whose graft can't yet be described in this repo's terms belongs here, named, as work to shape with `/plan` — and must **not** be written into After as though it were settled. A narrative reads as more certain than a task list, and it's the thing being approved, so overstating is the failure this region prevents. Where everything is concrete, say the picture is sharp throughout.

### `tasks.md` is the whole run

Everything the sync wants done, in dependency order:

1. **One coarse task for the copies** — *copy the N files listed in `proposal.md`* — and one for the updates. Not one task per file: sixty tasks is a wall, and a model hand-copying files is slower and less reliable than the scripted operation it replaces.
2. **One task to install a newer `wong-sync`**, when the run followed the clone's instructions without installing them.
3. **The manifest rewrite, last among the file tasks**, so it records what actually landed.
4. **One task per `adopt`**, at the concreteness bar below.

There is **no** "review the N files this sync landed" task any more. It existed because files landed before anyone reviewed them; now nothing lands unreviewed, so the review is the plan itself.

### The concreteness bar

Every adoption task must name its **capability id** and describe the graft **in this repo's terms** — which file or convention it touches, and what done looks like.

```
✗  - [ ] 1.1 Adopt the dream skill
✓  - [ ] 1.1 [wiki-consolidation] Install .claude/skills/dream/ and add a
       "when to run /dream" line to docs/conventions.md, which currently
       tells contributors to update the wiki by hand
```

**If the graft can't be described concretely yet, the verdict is still `adopt` — and the task is to shape it.** Write the task as *run `/plan` to shape the graft for this capability*, naming what upstream offers and what is unclear about landing it here, and name it in the proposal's Resolution region. That is still concrete: the actor knows exactly what to do next. `not-applicable` is reserved for a fit failure — an `assumes` this repo doesn't meet — and must never record the skill's own inability to express a graft; that mislabels an effort failure as a fit failure and buries the capability where nobody reviews it.

## The verdict record

`.claude/wong-sync-verdicts.md` is written **on every run**, whether or not anything is adopted, and holds **every** mapped capability — not just the ones that became work.

It exists because the step used to have a review gate for everything it said *yes* to and none for anything it said *no* to. An `adopt` got a change folder you could read at your leisure; a `divergent` or a `declined` got one line in a chat report that scrolled away, plus a JSON entry that quietly suppressed it forever. This file is the missing half.

**It is the single store of verdicts.** No verdict, reason, or judgment commit is recorded anywhere else — not in `.claude/.wong-stack.json`, which holds install state only. One store means one authority: what this file says is what the last run decided, with no second copy to reconcile against.

Three properties, each load-bearing:

- **It lives next to the manifest, not in the change folder.** Verdicts are *repo state*, not change scope — they outlive any one adoption change, and on a current repo there is no change folder at all. A dated folder per run would scatter the record; what you want is the current picture, in one place.
- **It is committed, not ignored.** `/save` picks it up like anything else, so it travels between clones and shows up in the pull request diff — the same place every other piece of this repo's knowledge is reviewed.
- **It is regenerated, not appended.** Each run rewrites it to reflect that run. It is a snapshot of now, not a log.

### Shape

A generated-file header, then one group per verdict. Every capability gets one line: its id, then its one-line reason. **Every line is a checkbox, in every group** — including `adopt`. A `declined` line, and any line whose reason came from an answered question, additionally carries the clone commit it was judged against — that is what lets a later run tell whether upstream has moved since.

```markdown
<!-- Generated by /wong-sync — rewritten on every run.
     Tick a box to overrule that verdict on the next run:
     an adopt line to refuse it, any other line to force it.
     Ticked boxes are read before this file is regenerated;
     any other edit will be overwritten. -->

# WongStack capability verdicts

As of clone `a1b2c3d` (WongStack 11.0.0), 2026-08-10.

## Adopted — written as tasks in openspec/changes/sync-wongstack-2026-08-10/

- [ ] `session-notes` — you capture sessions ad hoc in commit messages; `/save` writes notes/<slug>.md.

## Divergent — you already solve these, differently. Not work.

- [ ] `wiki-progressive-disclosure` — you use a flat docs/ with a generated index; upstream nests by section. Confirmed deliberate 2026-08-10 at clone `a1b2c3d`.

## Not applicable — the skill's call, re-evaluated every run

- [ ] `ci-gate-when-present` — assumes forge checks; this repo has no CI workflows.

## Declined — you said no

- [ ] `improve-audits` — declined 2026-07-14 at clone `9f8e7d6`.

## Present — 14 capabilities, current

- [ ] `openspec-planning` — openspec/ present and in use, driven from CLAUDE.md's loop section.
...
```

**Tick a box to overrule the verdict.** That line is the file's whole interactive surface, and it belongs in the header prose so nobody has to infer it.

### Promotion and refusal

Each run reads the existing `.claude/wong-sync-verdicts.md` **before** regenerating it and collects every ticked capability id. What a tick means depends on the group it was in:

**Ticked in any non-`adopt` group → force it to `adopt`** for this run, whatever the analysis would otherwise have assigned, and write it a task in the change folder like any other adoption. **Drop any prior `declined`** among them, so it no longer suppresses. Asking for a capability is how a previous refusal is reversed — there is no separate un-decline gesture, because wanting the thing *is* the reversal.

**Ticked in the `adopt` group → record it `declined`** for this run, with the clone commit it was judged against, and write it no task. This is the supported way to refuse an adoption, and it is what makes `declined` reachable at all: the run is non-interactive, so without it a refusal has nowhere to go. Deleting a task from the plan, or never running `/apply`, is **not** a refusal and must never be read as one — the capability is simply recomputed and re-proposed next run, which is correct, because not yet done is not no.

Either way, **show the capability under the group its tick moved it to** when the file is regenerated, and **name it in the report**. A tick that vanished into a rewritten file would reproduce the exact failure this section exists to fix.

Overruling therefore takes a second `/wong-sync` run. That's the deliberate trade: the run itself asks nothing about approval — no per-capability prompt wall — and the skill keeps proposing rather than deciding. Ticking nothing changes nothing; the analysis's own verdicts stand.

Ticking is the **only** edit the skill honors. Everything else in the file is regenerated, which the header says plainly so no one loses work they thought was durable.

## Why the approval decision is never a prompt

This skill used to accept a real loss: it stayed non-interactive to avoid a per-capability prompt wall, and paid for it by having no review gate on anything it decided *not* to do. That trade is gone, because the gate moved somewhere better.

**The gate is the repo's own loop.** The plan is reviewable when the reader has time, editable before it runs, and visible in the pull request diff. A terminal prompt is worse on every one of those, and needs a mechanism this repo doesn't otherwise have. So the run stays non-interactive about *approval* **and** gates — nothing is traded away.

The clarification stage isn't a counterexample: it runs before a plan exists, it asks about intent rather than approval, and an unanswered run still produces the same plan the bias would have produced. Questions improve the plan's inputs; they are never load-bearing for it.

## The report

The record is the deliverable; the report is a summary that points at it. After the skill's own which-logic-ran line:

- **Questions** — anything asked and how each was answered, plus how unanswered ones resolved. A skipped question isn't a failure; name what it fell back to.
- **Adopt** — each one, its reason, and the change folder that was written. Point at reviewing it and running `/apply`, which is what makes any of it happen. The folder is written for a file-only run too; name it either way, since it is the one document covering the whole run.
- **Promoted by tick** — anything force-adopted from a ticked box, named, so the tick is visibly acted on. **Declined by tick** — likewise, so a refusal is confirmed rather than silent.
- **Divergent** and **not-applicable** — a count each, plus the pointer to `.claude/wong-sync-verdicts.md` for the lines and reasons. They're no longer chat-only, so they no longer need to be read out in full.
- **Present** — a count is enough.
- **Declined** — each with its reason. Still worth naming in the report: these are the user's own decisions being honored, and seeing them is how a wrong one gets noticed.
- **Re-raised** — anything previously declined whose upstream expression has since changed, and what changed.
- **Retired** — recorded ids upstream no longer has.
- **Already waiting** — any `sync-wongstack-*` folder this run did not write, so an unapplied plan is visible.
- **Changelog accounting** — one line per `CHANGELOG.md` entry since the last synced version, each mapped to reflected-here / adopt / planned-directly / outside-payload-scope, so a missed entry is visible in the run's own output.

Say where the record was written and that a box can be ticked to overrule any of it.

Never show either subagent's report verbatim. The synthesis is the deliverable.
