# The fit playbook

What `/wong-setup` runs its consultation on: the discovery question bank (Step 3), the pain→verb map (Steps 3–4), and the disqualifiers with alternatives (Step 4). Everything here is stated factually — what a verb does and what it solves, never how great it is. The verdict this playbook feeds must survive the user later comparing it to reality.

## Discovery question bank

Pick **2–4**, phrased around what the research (Step 2) actually found — cite the repo's own facts, never ask from the blank script. One at a time; follow the answers, not the list.

**How work flows today**
- How does a change get from idea to merged here — what are the actual steps?
- Where does the plan for a piece of work live while you're building it? Where does it go after?
- *(research hook: no CI found)* How do you verify a change is good before it lands?
- *(research hook: CI found)* Your CI gates X — is that the real gate, or do you also review by hand?

**Working with Claude**
- What happens when a Claude session ends mid-feature — how does the next session pick it up?
- When Claude built something two weeks ago, how do you find out what it changed and why?
- Do you work from more than one machine, or run parallel sessions/agents? How do they stay coherent?

**The record**
- *(research hook: the wiki is stale or absent)* Where does "how we do things here" live — and does it match reality right now?
- If you rolled a new teammate (or a fresh Claude session) onto this repo today, what would they read?

**Scale of the work**
- Is this repo an ongoing project with a stream of changes, or a finished/one-off thing you touch occasionally?
- Who else works here — humans or agents — and on what forge?

## Pain → verb map

| Pain, as users say it | What addresses it | How, in one line |
|---|---|---|
| "Claude loses the plot between sessions" / "I re-explain the project every morning" | change folders + `/continue` | the plan lives in `openspec/changes/<name>/`, not the context window; `/continue <name>` checks out the branch and rebuilds a cold session from it, on any machine |
| "Plans live in a chat window / my head" | `/plan` | drafts proposal, specs, design, and tasks under `openspec/changes/<name>/` before any code — reviewable, diffable, in the repo |
| "I can't tell what changed or why last month" | `/save` + the archive | the PR body mirrors the change, every checkpoint appends to a Decision log, and `/ship` archives the spec as the durable record of what shipped |
| "Shipping is manual and scary" / "I forget steps" | `/save` + `/ship` | `/save` commits, pushes, opens/updates the PR, and waits on CI (auto-fixing failures); `/ship` squash-merges on green — or on PR review where there's no CI |
| "Our docs rot" / "the wiki lies" | `/dream` | one deliberate write path: captures durable facts from the session, then gardens the whole wiki — merges duplicates, prunes stale pages, reality-checks cited paths against the code |
| "Work spans machines, sessions, parallel agents" | branch = change + `/continue` | the branch name *is* the change name; any clone can `openspec list`, pick a change, and resume it |
| "I want a second opinion on where this codebase hurts" | `/improve` | read-only senior-advisor audit that writes prioritized, self-contained plans for another agent (or you) to execute |
| "I fixed my workflow tooling but the fix dies in this repo" | `/wong-sync` | offers your genuinely-local payload improvements back upstream, opt-in per file, and opens the PR itself |
| "I'm starting from zero — no repo, no GitHub" | the setup itself | Step 5 bootstraps git, `gh`, auth, and the remote one plain-language rung at a time |

Things WongStack does **not** solve — say so if the pain is one of these: flaky tests, slow CI, code quality itself, hosting/deploy configuration (it *discovers* preview URLs, it doesn't create them), or team process disputes.

## Disqualifiers — and what to suggest instead

Any one of these holding is a "not a good fit" verdict (Step 4). Name it, suggest the alternative, stop.

- **Non-GitHub forge they won't move from** (GitLab, Gitea, Bitbucket, Gerrit…). `/save`, `/continue`, and `/ship` lean on `gh` end to end. *Instead:* use [OpenSpec](https://github.com/Fission-AI/OpenSpec) directly — the planning layer is forge-agnostic (`openspec init`, `/opsx:*`) and gives them the spec-per-change discipline without the git verbs. Revisit if GitHub enters the picture.
- **No git, and no willingness to adopt it.** Every verb assumes version control; there's nothing to install onto. *Instead:* plain Claude Code sessions; return when the project is worth tracking. (No git *yet* but willing → not a disqualifier at all; Step 5 sets it up.)
- **A locked-in workflow the loop would fight** — stacked-diff/Gerrit review chains, a mandated corporate process, a monorepo tool that owns branching. Installing verbs that contradict the house rules creates friction, not flow. *Instead:* cherry-pick the planning layer (OpenSpec standalone) and skip the git verbs; the wiki conventions (`wiki-style.md`) also stand alone.
- **No ongoing stream of changes** — a finished project, a one-off script, throwaway analysis. The loop's overhead (change folders, branches, PRs) exceeds the value when there's no second change coming. *Instead:* plain sessions now; come back when the repo has a roadmap.
- **They want a managed plugin, not files in their repo.** WongStack is a template that lands in `.claude/skills/` and evolves with the repo — in-repo by design, no marketplace, no auto-update. If that model itself is the objection, don't install around it. *Instead:* point at the README's "ideas behind it" section to decide later.

**Borderline patterns** (not disqualifiers — surface the trade-off, let them decide): solo hobbyist who mostly wants speed (the loop adds ceremony; skippable per-change, but say so); a repo that already has half the ideas home-grown (offer per-collision keep/replace in Step 6 rather than a wholesale pitch); heavy uncommitted WIP (suggest landing it first so the install diff stays clean).

## Verdict guidance

- The verdict is a **diagnosis, not a close**. "Good fit" = restate their named pains next to the verb that addresses each — nothing they didn't say, no pains invented for them.
- **Two or fewer real pains surfaced → say so.** "You're not feeling much pain; the honest answer is you don't need this yet" is a valid verdict for a working setup.
- **Borderline → the user decides.** State what's borderline and what would tip it. Don't nudge.
- Never argue with a "no". One clarification if they misread something factual; otherwise the conversation is the product — leave them knowing exactly when WongStack *would* be worth it.
