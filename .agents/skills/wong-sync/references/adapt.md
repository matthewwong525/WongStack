# The adapt step

How `/wong-sync` turns "what upstream can do" and "what this repo already does" into a proposal. This is Step 3 of the skill: it runs over every payload surface the repo **already has** (Step 2 already copied in the ones it didn't). It writes two things and nothing else — a verdict record every run, and an OpenSpec change when there's something to adopt.

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
                   │       MAIN THREAD         │
                   │  one verdict per capability│
                   │  present / divergent /    │
                   │  adopt / not-applicable / │
                   │  declined                 │
                   └───────────┬───────────────┘
                               ▼
         ┌─────────────────────┴─────────────────────┐
         ▼                                           ▼
 .claude/wong-sync-verdicts.md      openspec/changes/adopt-wongstack-<date>/
   (every run — every verdict,            (only when something is `adopt`
    tick a box to overrule)                 — one task per `adopt`)
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

**Ids must be stable**, because the ledger keys on them. Two rules:

1. Derive ids from **upstream content only** — never from the target — so the same upstream commit yields the same ids in every repo.
2. The cartographer is **given the ids already in this repo's ledger** and must reuse a matching id rather than minting a new one for the same capability. Renaming an id orphans its ledger entry and silently re-pitches something the user already declined.

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

The payload manifest bounds what `/wong-sync` **copies**. It does **not** bound what the surveyor reads — it can't, because the whole job is noticing that this repo already solves something in a place upstream never heard of.

That's a real change from how this skill used to work, and it's safe for one reason: **there is no outbound path any more.** The manifest's old "never read outside this list" rule existed to guarantee nothing local could leak into a contribution PR. With the contribute leg gone, nothing the surveyor reads leaves the machine — it isn't written to the clone, isn't pushed, and isn't included in any outbound request.

## The gap analysis

The main thread takes both reports and assigns **every mapped capability exactly one verdict**, each with a **one-line reason**.

The taxonomy splits on **who decided**, not on why. Four of the five verdicts are the skill's own reading of the evidence; exactly one records a decision the user made. That distinction is the whole point — it's what decides which verdicts are recomputed freely and which one carries the weight to suppress.

| verdict | meaning | decided by | becomes a task? |
|---|---|---|---|
| **present** | the repo already has it, current | the skill | no |
| **divergent** | solved differently here, and the local solution is legitimate | the skill | no |
| **adopt** | missing, stale, or otherwise wanted here — and expressible in this repo | the skill | **yes** |
| **not-applicable** | doesn't fit this repo: an `assumes` it doesn't meet, or a graft that can't be made concrete | the skill | no |
| **declined** | the user said no | **the user** | no |

**`declined` is only ever written from an actual refusal.** Never infer it. If you are reaching for `declined` and cannot point to something the user said, the verdict you want is `not-applicable`. The two used to be one slot, and collapsing them gave the skill's guesses the permanence that belongs only to the user's decisions.

**`divergent` is the verdict that makes this step worth running.** It's how the sync says *"you already solve this — leave it alone"* instead of pitching a redundant graft. Name the local form in the reason ("you use a `Makefile` target where WongStack uses a skill"). It's kept distinct from `present` because the record needs to show *that the forms differ* — which matters when upstream later changes that capability.

**Check `assumes` before proposing.** A capability that assumes a frontend has no business in a CLI repo; one that assumes CI has no business in a repo with no forge checks. That's a `not-applicable` with the assumption named, not a task — and not a `declined`, because the user never said anything about it.

**A stale-but-unmodified file is an ordinary `adopt`.** If the repo has a payload file it never touched and upstream has moved on, the verdict is `adopt` and its task says *take the upstream version verbatim*. There's no separate verdict for it — the difference lives in the task text, not the taxonomy. The file is **not** overwritten by the sync itself; it goes through review and `/apply` like everything else. That costs a round trip the old sync didn't, and it's the deliberate price of never clobbering work someone thought was theirs.

### The ledger

Before assigning verdicts, read the manifest's `capabilities` map. **Only `declined` suppresses.**

A capability previously verdicted `declined` is **not re-pitched** — unless its upstream expression changed since the recorded `asOfCommit`, in which case **re-raise it**, saying it was declined earlier and what has changed since. A decline recorded against commit X is not a decline of what the capability became at commit Y; burying that would hide genuinely new information behind an old "no."

Every other verdict — `present`, `divergent`, `adopt`, `not-applicable` — is **recomputed from scratch on every run**. Its ledger entry is a snapshot of the last computed state, kept for reporting and for retirement detection; it is not authority and must never be read as a reason to skip re-evaluating. Recomputing is close to free: none of the four becomes a task on its own, and the subagents have already done the reading. What it buys is correctness — delete the `Makefile` target that made something `divergent` and the next run notices, landing it on `adopt` instead of honoring a stale "you already solve this."

That distinction matters most for **`not-applicable`, which turns on the *target's* shape, not upstream's.** `asOfCommit` records a commit in the *clone*, so freezing a `not-applicable` against it would be a category error: the repo can grow CI, gain a frontend, or adopt a forge without upstream moving a byte, and the verdict has to follow the repo. Re-evaluate it every run.

So the ledger's job is precise: **it stores the user's decisions, plus a snapshot of the last computed state.** Only the first half is authoritative on a later run.

A ledger id with **no counterpart in the new map** is reported as **retired** — upstream dropped or absorbed it. Say so; don't silently drop the entry.

**Lazy migration.** A ledger written before the `declined` / `not-applicable` split could mean either "the user said no" or "the skill judged it a poor fit," and after the fact the two are indistinguishable. Honor an old `declined` as a user refusal — the conservative read. It keeps suppressing something that may have been suppressed on the skill's say-so, but the alternative re-pitches things the user genuinely refused, which is the louder failure. Anyone who wants a clean slate can tick its box (below) or delete the entry.

Every verdict this run produces is written back to the ledger at Step 4, `asOfCommit` set to the clone HEAD.

## The output

Two artifacts, and nothing else. They have different lifecycles on purpose:

```
.claude/wong-sync-verdicts.md                 ← EVERY run. Every verdict.
openspec/changes/adopt-wongstack-<YYYY-MM-DD>/ ← only when something is `adopt`
  proposal.md    why these capabilities, what each buys THIS repo
  tasks.md       one task per `adopt`
```

The change folder is the *work*; the verdict record is the *picture*. A run can produce the second without the first, and on a repo that's already current that's the normal case.

**The change folder:**

- **Never overwrite an existing change folder.** If today's already exists, suffix it `-2`, `-3` — the existing one may be mid-flight.
- **Nothing to adopt → no folder.** An empty change is noise. Say the repo is current and point at the verdict record, which is written either way.
- **No `openspec/changes/` in the target** → still write the verdict record, and explain why the change couldn't be written. (WongStack installs OpenSpec at setup, so this is rare.)
- Write `proposal.md` and `tasks.md` only. If a graft turns out to be large, the repo's own `/plan` can deepen it.

### The concreteness bar

Every task must name its **capability id** and describe the graft **in this repo's terms** — which file or convention it touches, and what done looks like.

```
✗  - [ ] 1.1 Adopt the dream skill
✓  - [ ] 1.1 [wiki-consolidation] Install .claude/skills/dream/ and add a
       "when to run /dream" line to docs/conventions.md, which currently
       tells contributors to update the wiki by hand
```

**If the graft can't be described concretely, the verdict is `not-applicable`, not a vague task.** A task nobody can act on is worse than an honest "this doesn't fit here" — it wastes an `/apply` and teaches people to skim the change folder. It's `not-applicable` rather than `declined` because *you* didn't turn it down; the skill couldn't express it. And since `not-applicable` is recomputed every run, a later run that can describe the graft will simply propose it.

## The verdict record

`.claude/wong-sync-verdicts.md` is written **on every run**, whether or not anything is adopted, and holds **every** mapped capability — not just the ones that became work.

It exists because the step used to have a review gate for everything it said *yes* to and none for anything it said *no* to. An `adopt` got a change folder you could read at your leisure; a `divergent` or a `declined` got one line in a chat report that scrolled away, plus a JSON entry that quietly suppressed it forever. This file is the missing half.

Three properties, each load-bearing:

- **It lives next to the manifest, not in the change folder.** Verdicts are *repo state*, not change scope — they outlive any one adoption change, and on a current repo there is no change folder at all. A dated folder per run would scatter the record; what you want is the current picture, in one place.
- **It is committed, not ignored.** `/save` picks it up like anything else, so it travels between clones and shows up in the pull request diff — the same place every other piece of this repo's knowledge is reviewed.
- **It is regenerated, not appended.** Each run rewrites it to reflect that run. It is a snapshot of now, not a log.

### Shape

A generated-file header, then one group per verdict. Every capability gets one line: its id, then its one-line reason. **Every non-`adopt` line is a checkbox.**

```markdown
<!-- Generated by /wong-sync — rewritten on every run.
     Ticked checkboxes are read before this file is regenerated;
     any other edit will be overwritten. -->

# WongStack capability verdicts

As of clone `a1b2c3d` (WongStack 8.3.0), 2026-08-02.

## Adopted — written as tasks in openspec/changes/adopt-wongstack-2026-08-02/

- `session-notes` — you capture sessions ad hoc in commit messages; `/save` writes notes/<slug>.md.

## Divergent — you already solve these, differently. Not work.

- [ ] `wiki-progressive-disclosure` — you use a flat docs/ with a generated index; upstream nests by section.

## Not applicable — the skill's call, re-evaluated every run

- [ ] `ci-gate-when-present` — assumes forge checks; this repo has no CI workflows.

## Declined — you said no

- [ ] `stack-pack-cloudflare` — declined 2026-07-14 at clone `9f8e7d6`.

## Present — 14 capabilities, current

- `openspec-planning` — openspec/ present and in use.
...
```

**Tick a box to overrule the verdict.** That line is the file's whole interactive surface, and it belongs in the header prose so nobody has to infer it.

### Promotion

Each run reads the existing `.claude/wong-sync-verdicts.md` **before** regenerating it and collects every ticked capability id. For each one:

- **Force it to `adopt`** for this run, whatever the analysis would otherwise have assigned, and write it a task in the change folder like any other adoption.
- **Clear any `declined` ledger entry** among them. Asking for a capability is how a previous refusal is reversed — there is no separate un-decline gesture, because wanting the thing *is* the reversal.
- **Show it under the adopted group** when the file is regenerated, and **name it in the report**. A tick that vanished into a rewritten file would reproduce the exact failure this section exists to fix.

Promotion therefore takes a second `/wong-sync` run. That's the deliberate trade: the run itself stays non-interactive — no per-capability prompt wall — and the skill keeps proposing rather than deciding. Ticking nothing changes nothing; the analysis's own verdicts stand.

Ticking is the **only** edit the skill honors. Everything else in the file is regenerated, which the header says plainly so no one loses work they thought was durable.

## The report

The record is the deliverable; the report is a summary that points at it. After Step 2's copied-files list:

- **Adopt** — each one, its reason, and the change folder that was written. Point at reviewing it and running `/apply`.
- **Promoted by tick** — anything force-adopted from a ticked box, named, so the tick is visibly acted on.
- **Divergent** and **not-applicable** — a count each, plus the pointer to `.claude/wong-sync-verdicts.md` for the lines and reasons. They're no longer chat-only, so they no longer need to be read out in full.
- **Present** — a count is enough.
- **Declined** — each with its reason. Still worth naming in the report: these are the user's own decisions being honored, and seeing them is how a wrong one gets noticed.
- **Re-raised** — anything previously declined whose upstream expression has since changed, and what changed.
- **Retired** — ledger ids upstream no longer has.

Say where the record was written and that a box can be ticked to overrule any of it.

Never show either subagent's report verbatim. The synthesis is the deliverable.
