# Design

## Context

See [the proposal](proposal.md) for the reason and the measurement. Today's parts:

- `recall` (`scripts/lib/documents/commands.mjs`, `packet.mjs` in the memory plugin) reads up to eight facts and five passages and admits them into a 6,144-byte packet. A fact prints its id, type, date, author, session, slug, and body. It prints no path.
- `pull` (`scripts/lib/pull.mjs`) answers a topic, a path, a change, or a fact in groups of three with `--more <group>`. A path's answer already prints areas, docs, code folders, past changes, backlinks, and code users through the profile's `lookup` part.
- The profile (`.agents/memory/profile.mjs`) gives the plugin WongStack's own lookups from `.agents/memory/lookup.mjs`: `named` (the paths a change's plan names), `before`, `after`.
- `/ship` squash-merges, so one commit on the main branch holds a change's archive folder and every file it touched. Measured here: 424 of 425 archive folders map to such a commit, and 1,048 of 1,361 live facts carry a slug of a shipped change.

The plugin must work with another repo's store and names no database. The OpenSpec archive and its git history are WongStack's layout, so they belong behind the profile.

## Goals / Non-Goals

**Goals:**

- A files list on `recall`, on a fact's pull, and on a change's pull, by the `memory` spec delta.
- Read fresh, with no stored link, no new index, and no new dependency.
- No new skill or reference text: the output labels itself.

**Non-Goals:**

- A search of code by the question's words.
- A files group on a topic's pull.
- A cache on disk. An in-process memo for one command is enough.

## Decisions

### 1. The plugin owns the merge; the profile owns the history read

A new plugin file `scripts/lib/files.mjs` exports:

- `namedPaths(body, root)`: repo-relative paths in a fact's words that exist, through `normalizePath` (so `.claude/…` and `.agents/…` are one path). Reuse the path test in `scripts/lib/upkeep.mjs` if it has one; do not write a second.
- `filesBehind(ctx, facts, { profile, areas, limit, perChange, deadline })`: the ranked list `[{ path, facts: [id…], via: 'named' | 'change' | 'topic' }]`.

A new profile part `lookup.files(ctx, slugs, { deadline })` returns `Map<slug, [{ path, churn }]>`. WongStack's is `changeFiles` in `.agents/memory/lookup.mjs`. A profile without the part gives only named paths and topic folders.

*Alternative:* put the git read in the plugin. Rejected: the plugin would then name the OpenSpec archive layout, which a repo with only the plugin may not have. `lookup.named` set the pattern.

### 2. A shipped change's files come from one history read

`changeFiles` runs, with `execFile` and no shell:

1. `git log --diff-filter=A --format=@%H --name-only -- 'openspec/changes/archive/*/proposal.md'`: one call maps every archived slug to the commit that added its archive (93 ms here). The newest commit wins for a slug archived twice.
2. `git show --numstat --format= <commit>` for each asked slug (14 ms each): the files and their changed lines.

It then drops `openspec/changes/**`, `CHANGELOG.md`, `VERSION`, and `**/package-lock.json`, and sorts by changed lines.

3. **Follow moves.** When any kept path does not exist now, run once per read `git log --reverse -M --name-status --format=@%H <oldest asked commit>..HEAD`. For each missing path, replay in order only the moves made from its own change's commit on: a name reused after a move then keeps its own file. A path that exists now is never followed. A path that still does not exist is dropped. The read lists every commit, not `--diff-filter=R`, because that filter hides the commits that mark each change's place. Paths stay repo-relative and full, through `normalizePath`. Measured here: 95 ms from a recent change, 391 ms from the oldest; across all archived changes, 416 of 1,638 gone files come back, and the rest were deleted. One call per read, not one per change or per file: `git log --follow` takes one file at a time. For an active change (a folder under `openspec/changes/`, no archive), it returns the existing paths from `changePaths`. For a slug with neither, it returns nothing.

Any git failure (no git, a shallow history, a timeout) returns the plan-named paths of the archive folder for that slug, through `changePaths`. The read never throws to its caller.

*Alternative:* always use the paths the plan names. Rejected as the main source: the plan names words in backticks, which include commands and files it did not touch. It stays as the fallback.

*Alternative:* store `files` on each fact at write time. Rejected: a stored path goes stale on a move, older facts would need a backfill, and Matthew accepted fresh reads for code links (fact #1787).

### 3. Ranking

For the admitted facts in order `i = 0…`:

- Each distinct change adds weight `1 / (1 + i / 4)` to each of its top 10 files by changed lines, where `i` is the rank of the first fact from that change.
- Each path a fact names in its words adds 1.5.
- A fact with no change file and no named path adds weight 0.5 to its topic's docs, then its code folders, from `areas.json` through the areas the plugin already loads.

Sort by weight, then by path. Keep 8 for recall. These numbers come from the replay in [the proposal](proposal.md): seven variants scored between 37 and 40 of 56, so the simple one is kept.

### 4. Recall's packet

- `recallPacket` builds the list after facts arrive, with a 1,500 ms limit taken from the same deadline, and passes it to `renderPacket`.
- `renderPacket` admits facts and documents as today, with `available` first reduced by `min(600, the list's size)`. After the reclaim passes, it admits list entries in rank order while they fit in the budget, and only entries with at least one admitted fact. Unused reserve goes back to the document expansion pass.
- Text: one block before the `Omitted selected entries` line:
  ```text
  Files (from the facts above; a place to start, not a full list):
  - <path> (#<id>, #<id>)
  ```
- JSON: `files: [{ path, facts, via }]` and `sources.files: { state: 'ok' | 'empty' | 'unavailable' }`. `version` stays 1: both fields are added, none changes. The status line names files only when the state is `unavailable`.
- `documents` (no facts) prints no list.

### 5. Pull

- `changeAnswer`: a `files` section from `lookup.files` for that one slug, three entries with `--more files`. It prints from the repo even when the store does not answer.
- `factAnswer`: a `files` section from `filesBehind` on that one fact.
- `jsonOf` carries the section as it carries others.
- `topicAnswer` and `pathAnswer` do not change.

### 6. Words

- `wiki/development/document-retrieval.md` gets one short section, *Files behind the facts*: the three sources, the limits, and that the list is a start.
- `wiki/development/memory.md` is at 2,990 of 3,000 words. Change the profile table's `lookup` row and the *One lookup shows everything linked* bullet to name the files group, and cut the same number of words on that page.
- No `SKILL.md` or reference changes, so `measure-context.mjs --check` needs no offset.
- `CHANGELOG.md`: `## Next (minor) — Memory shows the files behind each fact`. **Updating.** Nothing to do by hand.

## Risks / Trade-offs

- [The list is right about 3 times in 10] → The label says *a place to start, not a full list*; the list takes at most 600 bytes; facts and passages keep their room.
- [A large change floods the list] → At most ten files a change, by changed lines.
- [A repo with no history, or an install whose changes were not squash-merged] → The fallback to plan-named paths, then to named paths and topic folders. The replay script reports coverage, so a low number shows.
- [Slow git on a large repo] → `git show` cost follows the commit's size, not the repo's. The lookup has a 1,500 ms limit inside recall and returns what it has.
- [A rename] → Followed to its new path by the one rename read. A file split in two, or moved with large edits that git does not see as a move, still drops out.
- [The rename read is slow on a long history] → It runs only when a path is missing, starts at the oldest asked change, and shares the 1,500 ms limit; on a timeout the missing paths drop out and the rest show.
- [A fact body that looks like a path but is not] → Only paths that exist are kept.

## Acceptance after the build

Run `node scripts/tests/manual/files-line-replay.mjs 60` from the repo root, signed in to memory. It repeats the proposal's replay with the real `filesBehind`. Pass: a right file for at least 60% of the changes, and a median of at most 700 ms added to a recall. Write both numbers in the Decision log. It needs the live store, so it is a build check, not a CI test.
