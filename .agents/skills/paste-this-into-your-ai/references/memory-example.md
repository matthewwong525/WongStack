# Memory system post: the gold example

Matthew's settled post about the memory system. Every new post copies its shape: one opener, one flat list, every line a `>` and one clause. [The skill](../SKILL.md) owns the rules.

```
How my Claude Code remembers everything:

> 4 stores, 1 job each: plans, specs, memory, wiki
> Plans: one folder per change with proposal, design, and tasks
> Specs: what shipped, frozen once the plan is archived
> Memory: short facts from each session, kept outside git
> Wiki: lasting how-tos, curated in the repo
> No fact lives in two places
> Each fact is one line
> Fact types: user, feedback, decision, reference, open question
> Each fact is tagged with change name, folder, author, date, and session
> Facts are never edited, only replaced by a newer one
> Replaced facts stay searchable
> Transcripts are kept with secrets scrubbed, so every fact traces back
> Personal facts stay private, decisions are shared with the team
> Session start: a hook loads a short digest of open questions, preferences, and recent decisions
> First edit in a folder: a hook shows that folder's warnings
> One map file links folders to tags
> Before big work, one search runs across facts, wiki, and specs
> Results cite the originals, and Claude reads them
> Each step (plan, build, ship) loads its own open questions
> Checkpoints write facts from the session
> A background run catches sessions you never saved
> Every write shows near-duplicates: add, replace, or drop
> Open questions must name who checks them next
> Struggles get logged and feed a self-improvement routine
> Unanswered questions auto-close after 30 days
> Facts that name a file get that folder's tag
> A regular pass merges duplicates and settles contradictions
> Lasting facts move to the wiki, and stale ones retire
> Planning reads memory and wiki before asking you anything
> Building loads facts for every file the plan touches
> Shipping archives the plan as a spec and saves decisions
> Closing a chat writes what it learned to the wiki
> Memory is a hint: when it disagrees with the code, the code wins
> Search by keyword first, and add embeddings only if it misses
> A test set of questions in CI keeps search from breaking
```
