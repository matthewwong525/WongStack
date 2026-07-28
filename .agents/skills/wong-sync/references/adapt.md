# The adapt step

How `/wong-sync` turns "what upstream can do" and "what this repo already does" into a proposal. This is Step 3 of the skill: it runs over every payload surface the repo **already has** (Step 2 already copied in the ones it didn't), and its only output is one OpenSpec change.

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
                   │  adopt / declined         │
                   └───────────┬───────────────┘
                               ▼
              openspec/changes/adopt-wongstack-<date>/
                    (one task per `adopt`)
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

| verdict | meaning | becomes a task? |
|---|---|---|
| **present** | the repo already has it, current | no |
| **divergent** | solved differently here, and the local solution is legitimate | no |
| **adopt** | missing, stale, or otherwise wanted here — and expressible in this repo | **yes** |
| **declined** | wrong for this repo, or the user said no | no |

**`divergent` is the verdict that makes this step worth running.** It's how the sync says *"you already solve this — leave it alone"* instead of pitching a redundant graft. Name the local form in the reason ("you use a `Makefile` target where WongStack uses a skill"). It's kept distinct from `present` because the ledger needs to record *that the forms differ* — which matters when upstream later changes that capability.

**Check `assumes` before proposing.** A capability that assumes a frontend has no business in a CLI repo; one that assumes CI has no business in a repo with no forge checks. That's a `declined` with the assumption named, not a task.

**A stale-but-unmodified file is an ordinary `adopt`.** If the repo has a payload file it never touched and upstream has moved on, the verdict is `adopt` and its task says *take the upstream version verbatim*. There's no separate verdict for it — the difference lives in the task text, not the taxonomy. The file is **not** overwritten by the sync itself; it goes through review and `/apply` like everything else. That costs a round trip the old sync didn't, and it's the deliberate price of never clobbering work someone thought was theirs.

### The ledger

Before assigning verdicts, read the manifest's `capabilities` map. A capability previously verdicted `declined` or `divergent` is **not re-pitched** — unless its upstream expression changed since the recorded `asOfCommit`, in which case **re-raise it**, saying it was declined earlier and what has changed since. A decline recorded against commit X is not a decline of what the capability became at commit Y; burying that would hide genuinely new information behind an old "no."

A ledger id with **no counterpart in the new map** is reported as **retired** — upstream dropped or absorbed it. Say so; don't silently drop the entry.

Every verdict this run produces is written back to the ledger at Step 4, `asOfCommit` set to the clone HEAD.

## The output

One OpenSpec change, and nothing else:

```
openspec/changes/adopt-wongstack-<YYYY-MM-DD>/
  proposal.md    why these capabilities, what each buys THIS repo
  tasks.md       one task per `adopt`
```

- **Never overwrite an existing change folder.** If today's already exists, suffix it `-2`, `-3` — the existing one may be mid-flight.
- **Nothing to adopt → no folder.** Report that the repo is current and stop. An empty change is noise.
- **No `openspec/changes/` in the target** → report the capability gap inline and explain why the change couldn't be written. (WongStack installs OpenSpec at setup, so this is rare.)
- Write `proposal.md` and `tasks.md` only. If a graft turns out to be large, the repo's own `/plan` can deepen it.

### The concreteness bar

Every task must name its **capability id** and describe the graft **in this repo's terms** — which file or convention it touches, and what done looks like.

```
✗  - [ ] 1.1 Adopt the dream skill
✓  - [ ] 1.1 [wiki-consolidation] Install .claude/skills/dream/ and add a
       "when to run /dream" line to docs/conventions.md, which currently
       tells contributors to update the wiki by hand
```

**If the graft can't be described concretely, the verdict is `declined`, not a vague task.** A task nobody can act on is worse than an honest "this doesn't fit here" — it wastes an `/apply` and teaches people to skim the change folder.

## The report

The main thread reports, after Step 2's copied-files list:

- **Adopt** — each one, its reason, and the change folder that was written. Point at reviewing it and running `/apply`.
- **Divergent** — one line each. Cheap to read and genuinely reassuring: it's the sync confirming your local solutions are fine, not work.
- **Present** — a count is enough.
- **Declined** — each with its reason, so a wrong call is visible and arguable.
- **Re-raised** — anything previously declined whose upstream expression has since changed, and what changed.
- **Retired** — ledger ids upstream no longer has.

Never show either subagent's report verbatim. The synthesis is the deliverable.
