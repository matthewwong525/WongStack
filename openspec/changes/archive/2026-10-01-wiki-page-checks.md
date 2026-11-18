<!-- openspec-archive v1 2026-10-01-wiki-page-checks -->
<!-- file proposal.md utf8 8335 -->
# Keep wiki pages short, titled, and their section links working

**Status:** ready-to-ship

**Branch:** wiki-file-size-limits

**Open questions:** none

## Why

Code has limits it can't pass: no file over 500 lines, no function too tangled. The wiki has only a link check. A page can grow without end, and three already passed 3,000 words: the deploy pipeline (4,300), browsing (3,500), and memory (3,300). A long page is slow for a person to read and costly for the assistant to load. A link to one section of a page breaks without warning when that heading is renamed, and nothing checks that a page opens with its title and a first sentence, though the wiki rules require both.

## What Changes

- **Each publish checks every wiki page, the way code is checked.** Beside the link check, three new checks run here and in every install:
  - a page over 3,000 words fails, and the message says to split it by its sections;
  - a link to a section of a page, like `browsing.md#hand-the-browser-over`, must land on a heading that exists;
  - a page opens with one title, then a sentence that says what it is.
  ```text
   publish
      │
      ▼
   wiki check ── links land?        (today)
      │       ── under 3,000 words? (new)
      │       ── section links?     (new)
      │       ── title + sentence?  (new)
      ▼
   all pass ──▶ live
   one fails ─▶ fix it, publish again
  ```
- **The three long pages get split.** Each keeps its address and its opening sections, so the links pointing at it still work. Its longest later sections move to a new page beside it, linked from where they were. You read the same words, in shorter pages.
  ```text
   BEFORE              AFTER
   d1-pipeline  4,300  d1-pipeline   <3,000
                       + 1 new page
   browsing     3,500  browsing      <3,000
                       + blocked sites
   memory       3,300  memory        <3,000
                       + the memory key
  ```
- **Each check runs only when its kind of file changed.** A change to wiki pages alone already skips the code tests. Now a change to code alone skips the wiki check too, unless it removes or moves a file, which could break a wiki link.
  ```text
   changed          │ code tests │ wiki check
   ─────────────────┼────────────┼───────────
   wiki pages only  │ skipped    │ runs
   code only        │ runs       │ skipped
   code + moved file│ runs       │ runs
   both             │ runs       │ runs
  ```
- **The wiki rules name the limit.** The page that sets how the wiki is written says a page stays under 3,000 words, so the assistant splits a page before the check has to catch it.

Non-goals: a limit on line length or on the number of lines, since a wiki paragraph is one line; a ban on filler words from the voice guide; checking links from skills and other files outside the wiki, which this repo's release check already covers; a warning-only mode.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `knowledge-center`: the wiki check on every run adds a page-size cap, section-link check, and title-and-first-sentence check.

## Impact

- `.agents/skills/memory/scripts/lib/links.mjs`: heading anchors and the three new page checks, beside `checkWiki`.
- `.github/scripts/wiki-links.mjs` (ships): the report names the new problems; `.github/workflows/test.yml`: the step's comment and summary line.
- `scripts/tests/wiki-links.test.mjs`: a test per new check, its refusal included.
- `wiki/stack/d1-pipeline.md`, `wiki/development/browsing.md`, `wiki/development/memory.md`: split; new sibling pages linked from their section hubs and listed in `payload-files.json` and the payload manifest where the source page ships.
- `wiki/wiki-style.md`: one line for the cap, offset by an equal cut, since the start-up load sits at 2,197 of 2,200 words.
- `CHANGELOG.md`: a `## Next (minor)` entry whose Updating note asks installs to split any own page over 3,000 words.

## Decision log

- **2026-10-01** — Asked how a size limit on wiki pages should work → a hard cap at 3,000 words that fails the check; the three pages over it today get split in this change.
- **2026-10-01** — Asked which other checks should run on the wiki, like the code checks → section links must land on a real heading, and every page opens with one title and a first sentence; filler-word bans were not chosen.
- **2026-10-01** — Assumed: words are counted as in `measure-context.mjs` (whitespace-separated, whole file, code blocks included), because one counting rule across the repo can't disagree with itself, and a code block costs a reader as much as prose.
- **2026-10-01** — Assumed: no line-count cap like code's 500 lines, because a wiki paragraph is one line, so lines measure nothing; the longest page today is 363 lines.
- **2026-10-01** — Assumed: the new checks run in every install, inside the existing wiki check, because that check already ships to every install's test workflow and one rule for every wiki can't drift. An install whose own page is over the cap gets a to-do in its update plan to split it.
- **2026-10-01** — Assumed: a split keeps the old page at its address with its opening sections, and moves later sections out, because AGENTS.md, skills, and installs' own pages link those pages and their headings; keeping the linked headings in place avoids a retired name and broken links. The new section-link check proves the split left none.
- **2026-10-01** — Assumed: section anchors follow GitHub's rule (lowercase, punctuation dropped, spaces to hyphens, `-1` for a repeated heading), because the wiki is read on GitHub and `wiki-style.md` already states that rule.
- **2026-10-01** — Assumed: the section-link check covers links in wiki pages only, including `#section` links within the same page, because the shipped check is about the wiki, and `check-payload-links.mjs` already checks anchors from skills and rules into shipped pages here.
- **2026-10-01** — Assumed: the title check reads the page with code blocks blanked, because a `# comment` in a shell block is not a title; a trial on 2026-10-01 found every page passes the title, first-sentence, and section-link checks already (218 section links across the wiki, AGENTS.md, and skills, none broken).
- **2026-10-01** — Assumed during the build: links in this repo to a moved `##` section, not only its subheadings, point straight at the new page (the memory key's owner links and `store.mjs`'s help line included), because a reader then lands in one hop; the stubs stay for installs' own links.
- **2026-10-01** — Asked (mid-build) that a wiki-only change runs only the wiki checks and a code-only change only the code checks, so CI wastes no time → wiki-only already skipped the code tests; the wiki check now skips when the change touches no Markdown and removes or moves no file.
- **2026-10-01** — Assumed: any changed `.md` file, or any removed or moved file, runs the wiki check, because a wiki link can point at a skill's heading or at a code file, and a skipped check must be a proven skip, like the code tests' skip. A change with no base to compare runs it.
- **2026-10-01** — Check: `.github/scripts/wiki-links.mjs` now fails on more problems (page size, section links, title and first sentence) and names them in its report; it is stricter, not looser.
- **2026-10-01** — Check: `.github/scripts/app-untouched.sh` prints a fourth answer, `wiki_affected`, false only when the change touches no Markdown and removes or moves no file, because the person asked that a code-only change skip the wiki check; any doubt (no base, an empty diff) answers true.
- **2026-10-01** — Check: `.github/workflows/test.yml` skips *Check the wiki's links* when `wiki_affected` is false and says so in the summary, because no wiki link can break when no Markdown changed and no file was removed or moved.
- **2026-10-01** — Saved for the online checks (task 4.3): all build tasks done; local checks pass except three browser-page tests that need `jsdom`, which this machine lacks.
- **2026-10-01** — Archived for /ship as 29.5.0; the online checks passed on the branch after one lint fix (`startsWith` over a caret regex).

<!-- end proposal.md -->
<!-- file design.md utf8 7573 -->
# Design

## Context

`.github/scripts/wiki-links.mjs` ships to every install and runs in `test.yml` on every run, docs-only included. It prints what `checkWiki` in `.agents/skills/memory/scripts/lib/links.mjs` returns: one line per problem. `linksIn` already strips a link's `#section` part, and `maskCode` blanks code blocks and spans. App code gets oxlint's `max-lines: 500` and `complexity: 21`; the wiki gets nothing like them. See proposal.md for why.

The start-up load (AGENTS.md, `wiki-style.md`, `voice.md`, every skill description) sits at 2,197 of a 2,200-word ceiling, checked by `scripts/measure-context.mjs --check`.

A trial on 2026-10-01: 28 wiki pages; every one opens with one title and a prose sentence; 142 section links in wiki pages, none broken. Three pages are over 3,000 words, measured by `## ` section:

| Page | Words | Largest sections |
|---|---|---|
| `wiki/stack/d1-pipeline.md` | 4,329 | secrets list 749, auto-migrate 689, twin bindings 619, CI 513 |
| `wiki/development/browsing.md` | 3,508 | hand-over 1,476, blocked sites 637, passwords 619 |
| `wiki/development/memory.md` | 3,254 | the memory key 1,535 (with *Joining through GitHub* and *Add or remove a teammate*) |

## Goals / Non-Goals

**Goals:**
- The three checks live in `links.mjs` beside `checkWiki`, so the shipped script and `memory.mjs areas` read one copy of the link and heading rules.
- Every page in this repo passes at the end of the change, so CI starts green.

**Non-Goals:**
- A config file or flag for the cap: one number in the library, raised by a recorded decision like the start-up ceiling.
- Changing `check-payload-links.mjs`, which already checks anchors from skills and rules into shipped pages.

## Decisions

**Extend `checkWiki`, don't add a script.** The new problems join its list, so `wiki-links.mjs`, its CI step, and every install pick them up with no new workflow step. Alternative: a second `wiki-pages.mjs` step; rejected, because two steps for one wiki doubles the summary and the payload list for no gain. The script's heading becomes *Wiki checks* and its pass line names the pages and the cap: `Wiki: 31 pages, all linked, each under 3,000 words.`

**Anchors by GitHub's rule, one copy.** `check-payload-links.mjs` already slugs headings as GitHub does (`slug` and `anchorsOf`: link and markup stripped, lowercased, all but letters, digits, spaces, `_` and `-` dropped, spaces to `-`, repeats `-1`, `-2`, explicit `<a id>` ids too, code blocks skipped). Move both to `links.mjs` as `headingAnchors(root, file)` and import it back into `check-payload-links.mjs`, so the shipped check and the release check never disagree. Alternative: import the slugger from `check-payload-links.mjs`; rejected, because that script is meta-only and installs don't have it. `linksIn` gains an `anchor` field (decoded, empty when none); a pure `#section` link, skipped today, is read against its own page. Only links landing on a `.md` file get the anchor check; a folder link checks its `README.md`.

**Words as `measure-context.mjs` counts them.** Whitespace-separated, whole raw file. A code block costs a reader as much as prose, and one rule can't disagree with another. `WIKI_PAGE_WORDS = 3000` is exported so the test and the message read one number.

**Title and first paragraph.** On the masked text: the first non-blank line is `# ` plus text; no other line starts with `# `; the next non-blank line after the title is not a heading, list item, table row, blockquote, image, fence, or HTML tag. Failure lines: `wiki/x.md: has no # title on its first line`, `wiki/x.md: has 2 # titles`, `wiki/x.md: opens with a list, not a sentence saying what the page is`.

**Split by moving later `##` sections to a sibling page, leaving a stub.** Each moved section's `##` heading stays on the old page with one sentence and a link to the new page, so every existing `page.md#section` link here and in installs still lands. Subheadings move with their section; links to them in this repo move to the new page, and the section-link check finds any missed. Alternative: turn each page into a folder hub; rejected, because a folder changes the page's address, which installs and AGENTS.md link ([folders only for deep branches](../../../wiki/wiki-style.md#folders-only-for-deep-branches)).

| Old page | Moves out | New page |
|---|---|---|
| `wiki/stack/d1-pipeline.md` | *Twin every stateful binding*, *One declared list of secrets, two Workers* | `wiki/stack/staging-bindings.md` |
| `wiki/stack/d1-pipeline.md` | *CI is GitHub Actions* | `wiki/stack/github-actions.md` |
| `wiki/development/browsing.md` | *When a site blocks the agent's browser* | `wiki/development/blocked-sites.md` |
| `wiki/development/browsing.md` | *Save your passwords* | `wiki/development/passwords.md` |
| `wiki/development/memory.md` | *The memory key* | `wiki/development/memory-key.md` |

Each old page lands near 2,000–2,500 words, leaving room to grow. Each new page gets a title, a first sentence, an up link to its hub, and a link back to the page it came from. The hubs (`wiki/stack/README.md`, `wiki/development/README.md`) list the new pages. `payload-files.json` lists the three new `wiki/development/` pages (all of `wiki/stack/` ships already), and `areas.json` adds each new page to its area's `docs`.

**The rule's one line in `wiki-style.md`, offset.** *No orphans, no dead-ends, full hub-coverage* gains "a page stays under 3,000 words; split a longer one by its sections". The same section or another in `wiki-style.md` loses as many words, so `measure-context.mjs --check` passes without raising the ceiling.

**Skip the wiki check on a code-only change, from the shared scope answer.** `.github/scripts/app-untouched.sh` gains a fourth line, `wiki_affected=true|false`: true when any changed path is under `wiki/` or ends in `.md`, or when `git diff --diff-filter=D --no-renames` lists any removed path (a move shows as one); true when the comparison can not be made or the diff is empty. `.github/actions/change-scope` exposes it, and `test.yml`'s *Check the wiki's links* step runs only when it is not `false`; the summary line says when it skipped. Alternative: a workflow `paths:` filter; rejected, because a required check left pending blocks the merge, the reason the code tests skip inside the job too. Alternative: always run it; it takes under a second, but the person asked that each kind of change run only its own checks.

## Risks / Trade-offs

- [An install's own page is over 3,000 words, and its first publish after the update fails] → The changelog's Updating note puts "split any of your wiki pages over 3,000 words" in the sync plan, and the failure message says how. The memory thread from 29.4.0 on whether the assistant fixes a failing wiki check unprompted stays open.
- [An install links a subheading that moved, such as `memory.md#joining-through-github`] → Its section-link check fails on its next publish and names the link; the fix is one path. The Updating note names the five moved sections.
- [A page sits just under the cap and the next small edit fails] → The splits leave each page 500+ words under; the failure says to split, which is the intended outcome.
- [A code change renames a heading in a `.md` file outside `wiki/` that a wiki page links] → Any changed `.md` runs the check, so it is caught.
- [Code-heavy pages, such as runbooks, hit the cap sooner] → Accepted: a long command listing is as long to read.

## Migration Plan

One release. Rollback is reverting it; the split pages read the same either way.

<!-- end design.md -->
<!-- file tasks.md utf8 4879 -->
# Tasks

## 1. The check

- [x] 1.1 Move `slug` and `anchorsOf` from `scripts/check-payload-links.mjs` into `.agents/skills/memory/scripts/lib/links.mjs` as `headingAnchors(root, file)`, import it back, and verify `scripts/tests/payload-links.test.mjs` still passes unchanged.
- [x] 1.2 Give `linksIn` an `anchor` field and read pure `#section` links against their own page; make `checkWiki` report `<file>:<line>: links to <written>, but <target> has no heading #<anchor>`; verify with a new test in `scripts/tests/wiki-links.test.mjs` for a renamed heading, a same-page anchor, a folder link's README, a repeated heading's `-1`, and a heading inside a code block that does not count. Fix the existing fixture's `SKILL.md#run` link so the passing test stays green.
- [x] 1.3 Add the size cap (`WIKI_PAGE_WORDS = 3000`, words counted as in `scripts/measure-context.mjs`) and the title-and-first-paragraph check to `checkWiki`, with the failure lines in design.md; verify with tests for a page at 3,001 words failing and 3,000 passing, no title, two titles, a title in a code block not counting, and a list or heading straight after the title.
- [x] 1.4 Update `.github/scripts/wiki-links.mjs`'s header comment, report heading (*Wiki checks*), and pass line (`Wiki: N pages, all linked, each under 3,000 words.`); update the *Check the wiki's links* step comment and summary line in `.github/workflows/test.yml`; verify the script test asserts the new pass line and a failing run exits 1.

## 2. Split the long pages

- [x] 2.1 Move *Twin every stateful binding* and *One declared list of secrets, two Workers* from `wiki/stack/d1-pipeline.md` to a new `wiki/stack/staging-bindings.md`, and *CI is GitHub Actions* to a new `wiki/stack/github-actions.md`, each moved `##` heading left on the old page with one sentence and a link; link both from `wiki/stack/README.md`; verify `node .github/scripts/wiki-links.mjs` passes and `wc -w` shows each page under 3,000.
- [x] 2.2 Move *When a site blocks the agent's browser* from `wiki/development/browsing.md` to a new `wiki/development/blocked-sites.md`, and *Save your passwords* to a new `wiki/development/passwords.md`, the same way; link both from `wiki/development/README.md`; verify as in 2.1.
- [x] 2.3 Move *The memory key* (with *Joining through GitHub* and *Add or remove a teammate*) from `wiki/development/memory.md` to a new `wiki/development/memory-key.md`, the same way; link it from `wiki/development/README.md`; verify as in 2.1.
- [x] 2.4 Repoint every link in the repo (archives aside) to a moved subheading, found with `memory.mjs areas` on each old page; verify `node scripts/check-payload-links.mjs` and `node .github/scripts/wiki-links.mjs` both pass.
- [x] 2.5 List the three new `wiki/development/` pages in `.agents/skills/wong-sync/references/payload-files.json`, add each new page to its area's `docs` in `.agents/skills/memory/references/areas.json`, and verify `scripts/tests/memory-areas.test.mjs` and `scripts/tests/payload-rule-paths.test.mjs` pass.

## 3. Run each check only for its kind of change

- [x] 3.1 Add `wiki_affected=true|false` to `.github/scripts/app-untouched.sh` (header comment, `--worktree` too) by design.md, expose it from `.github/actions/change-scope/action.yml`, and verify new cases in `scripts/tests/app-untouched.test.mjs`: code-only false, a wiki page true, a `.md` outside `wiki/` true, a removed or moved code file true, no base true, an empty diff true; update the test asserting the output keys.
- [x] 3.2 Gate `test.yml`'s *Check the wiki's links* step on `steps.scope.outputs.wiki_affected != 'false'`, update its comment and the summary line (say when the wiki check skipped), and update *The gate* in `wiki/development/the-change-loop.md` with one sentence on the skip; verify `node .github/scripts/loosened-checks.mjs --worktree` and `node .github/scripts/wiki-links.mjs` pass, adding a `Check:` bullet to the Decision log if the loosened-checks script asks for a reason.
- [x] 3.3 Mention the skip in the `CHANGELOG.md` entry from 4.2 in one plain line; verify `node scripts/check-payload-links.mjs` passes.

## 4. The rule and the release

- [x] 4.1 Add "a page stays under 3,000 words; split a longer one by its sections" to *No orphans, no dead-ends, full hub-coverage* in `wiki/wiki-style.md`, cutting as many words elsewhere on the page; verify `node scripts/measure-context.mjs --check` passes with no new baseline.
- [x] 4.2 Write a `## Next (minor) — Wiki pages stay short, titled, and their section links work` entry at the top of `CHANGELOG.md`, in plain words, whose **Updating.** note asks the install to split any of its own wiki pages over 3,000 words and names the five moved sections; verify `node scripts/check-payload-links.mjs` passes.
- [x] 4.3 Run `/save` and verify CI's payload checks and the Test workflow's wiki step pass on the branch.

<!-- end tasks.md -->
<!-- file specs/knowledge-center/spec.md utf8 2591 -->
# Spec Delta

## MODIFIED Requirements

### Requirement: The wiki's links are checked on every run

Every repo's test workflow SHALL check `wiki/` on every run whose change touches a Markdown file or removes or moves any file, docs-only runs included, and on every run with no base to compare; a run whose change touches only other files SHALL skip the check and say so. The check SHALL fail when a link to a file in the repo points nowhere, when a link's `#section` part names no heading on the page it lands on, when a page other than the root hub is linked from no other wiki page, or when a section's hub does not link one of its pages or subfolders. Section names SHALL follow GitHub's heading anchors, and a heading inside a code block SHALL NOT count. The failure SHALL name each page and link.

#### Scenario: A page nobody links to

- **WHEN** an install's wiki save adds `wiki/customers/acme.md` and no wiki page links to it
- **THEN** the check fails naming that page, and the save does not publish until a page links it

#### Scenario: A renamed heading breaks a section link

- **WHEN** a wiki save renames the heading `## Hand the browser over` while another wiki page links `browsing.md#hand-the-browser-over`
- **THEN** the check fails naming the linking page, its line, and the link, and the save does not publish until the link or the heading is fixed

#### Scenario: A code-only change skips the wiki check

- **WHEN** a branch changes only `app/src/pages/home/Home.tsx`
- **THEN** the test workflow runs the code tests, skips the wiki check, and its summary says the wiki check was skipped because no page or linked file changed

## ADDED Requirements

### Requirement: Every wiki page stays short and opens with its title

The same wiki check SHALL fail when a page holds more than 3,000 words, counted as whitespace-separated words across the whole file, or when a page does not open with exactly one `#` title followed by a first paragraph of prose. A size failure SHALL name the page, its word count, and the cap, and say to split the page by its sections. Every page the meta-repo ships SHALL pass.

#### Scenario: A page grows past the cap

- **WHEN** a wiki save leaves `wiki/development/browsing.md` at 3,200 words
- **THEN** the check fails naming the page, 3,200 words, and the 3,000-word cap, and the save does not publish until the page is split

#### Scenario: A page opens with a list

- **WHEN** a wiki page's title is followed directly by a bulleted list, or the page has no `#` title
- **THEN** the check fails naming the page and what its opening lacks

<!-- end specs/knowledge-center/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-10-01

~~~
<!-- end .openspec.yaml -->
<!-- file review.html utf8 41598 fence=~~~ -->
~~~html
<!-- wong-review:3 -->
<!doctype html>
<!--
  WongStack review kit. build-review.mjs writes the proposal as static HTML at the
  review:content marker and puts the change name in place of its token. The one
  script adds Note buttons, drawing fit and full screen, notes, drafts, and copy. It loads nothing from the network.
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Review · 2026-10-01-wiki-page-checks</title>
<style>
  :root { --ink:#222; --muted:#5f5f5f; --line:#b5b5b5; --fill:#f3f3f3; }
  * { box-sizing:border-box; }
  html { -webkit-text-size-adjust:100%; }
  body { margin:0; padding-bottom:76px; background:#e6e6e6; color:var(--ink); font:16px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; overflow-wrap:anywhere; }
  main { max-width:700px; margin:0 auto; padding:0 12px; }
  a { color:inherit; }
  code, pre, .ln { font-family:ui-monospace, Menlo, Consolas, monospace; }
  code { background:var(--fill); border:1px solid #ddd; border-radius:3px; padding:0 3px; font-size:.88em; }
  :focus-visible { outline:3px solid #111; outline-offset:2px; }
  [hidden] { display:none !important; }
  header { padding:18px 0 4px; }
  .eyebrow { margin:0; color:var(--muted); font-size:13px; letter-spacing:.06em; text-transform:uppercase; }
  h1 { margin:2px 0 4px; font-size:22px; line-height:1.25; }
  .jump { display:flex; flex-wrap:wrap; gap:0 18px; margin:4px 0 0; padding:0; list-style:none; }
  .jump a { display:inline-block; padding:8px 0; }
  .hint, .muted { color:var(--muted); font-size:14px; margin:4px 0 0; }
  #script-error { color:#a00; font-weight:600; }
  section { margin:18px 0; scroll-margin-top:8px; }
  h2 { margin:0 0 8px; color:var(--muted); font-size:13px; letter-spacing:.08em; text-transform:uppercase; }
  .card { background:#fff; border:1px solid var(--line); border-radius:6px; padding:12px; margin:0 0 10px; }
  .card p { margin:0 0 10px; } .card p:last-child { margin-bottom:0; }
  .items, .decisions, .note-list { list-style:none; margin:0; padding:0; }
  .item { display:grid; grid-template-columns:26px minmax(0,1fr); gap:0 10px; overflow:hidden; }
  .item, .decision { scroll-margin-top:8px; }
  .num { flex:0 0 26px; height:26px; border-radius:50%; background:#d6d6d6; font-size:13px; font-weight:700; display:flex; align-items:center; justify-content:center; }
  .body { flex:1; min-width:0; }
  [data-note] { border-radius:3px; }
  [data-note]:hover, .noting { background:#f1f1f1; }
  .item > .drawing { position:relative; grid-column:1 / -1; margin:10px -12px 0; }
  .item > .drawing:last-child { margin-bottom:-12px; }
  .drawing summary { display:flex; align-items:center; gap:6px; min-height:44px; padding:0 12px; border-top:1px solid #ddd; color:var(--muted); font-size:14px; cursor:pointer; list-style:none; }
  .drawing summary::-webkit-details-marker { display:none; }
  .drawing summary::before { content:'\25B8'; display:inline-block; width:1em; }
  .drawing[open] summary::before { transform:rotate(90deg); }
  .drawing[open] .show, .drawing:not([open]) .hide { display:none; }
  .drawing .count { color:var(--ink); font-weight:600; }
  .frame { overflow:auto; border-top:1px solid var(--line); background:var(--fill); touch-action:pan-y; }
  .js .frame { overflow:hidden; cursor:zoom-in; }
  .art { display:block; width:max-content; margin:0; padding:.6em .8em; font-size:13px; line-height:1.2; white-space:pre; overflow-wrap:normal; }
  .art .pin { min-width:1.8em; min-height:1.6em; margin-left:.4em; padding:0 .5em; border-radius:.8em; font-size:.85em; line-height:1.5em; }
  .enlarge { position:absolute; top:6px; right:12px; min-height:32px; padding:2px 10px; font-size:13px; }
  .add { min-width:0; min-height:34px; margin-left:6px; padding:0 12px; border-color:#aaa; border-radius:17px; color:var(--muted); font-size:13px; vertical-align:middle; }
  .zoom { display:flex; align-items:center; gap:6px; }
  .zoom .level { margin-right:auto; color:var(--muted); font-size:13px; }
  #viewer { position:fixed; top:0; left:0; right:0; bottom:0; z-index:8; display:flex; flex-direction:column; background:#fff; }
  #viewer .zoom { flex:none; padding:calc(6px + env(safe-area-inset-top)) 12px 6px; border-bottom:1px solid var(--line); }
  #viewer .vframe { flex:1; min-height:0; overflow:auto; background:var(--fill); touch-action:pan-x pan-y; overscroll-behavior:contain; -webkit-overflow-scrolling:touch; }
  #viewer .vhint { flex:none; margin:0; padding:6px 12px calc(6px + env(safe-area-inset-bottom)); border-top:1px solid var(--line); color:var(--muted); font-size:13px; }
  body.viewing { overflow:hidden; }
  .meta { margin:0 0 4px !important; color:var(--muted); font-size:13px; }
  .tag { display:inline-block; margin-right:8px; padding:0 8px; border:1px solid #777; border-radius:10px; background:#fff; color:var(--ink); font-size:12px; font-weight:700; }
  .tag.assumed { border-style:dashed; }
  .tag.check { border:2px dotted #333; }
  .hit { outline:3px solid #888; outline-offset:3px; }
  button { font:inherit; font-size:14px; min-width:40px; min-height:40px; padding:4px 12px; border:1px solid #777; border-radius:4px; background:#fff; color:var(--ink); cursor:pointer; }
  button.primary { background:#333; border-color:#333; color:#fff; }
  button:disabled { opacity:.45; cursor:default; }
  .pin { min-width:24px; min-height:24px; margin-left:6px; padding:0 7px; border-radius:12px; background:#333; border-color:#333; color:#fff; font:700 12px/22px system-ui, sans-serif; vertical-align:middle; }
  .pin.draft { background:#fff; color:var(--ink); border-style:dashed; }
  .entry { display:block; width:100%; margin:0 0 8px; padding:8px 10px; text-align:left; }
  .entry .where { display:block; color:var(--muted); font-size:13px; }
  .entry .tag { margin:0 0 0 6px; }
  #chip { position:absolute; z-index:9; box-shadow:0 2px 8px rgba(0,0,0,.3); }
  #editor { position:absolute; z-index:6; width:260px; padding:10px; background:#fff; border:2px solid #333; border-radius:6px; box-shadow:0 4px 16px rgba(0,0,0,.25); }
  #editor.docked { position:fixed; left:0; right:0; bottom:0; width:auto; display:flex; flex-direction:column; overflow:auto; border-width:2px 0 0; border-radius:0; padding:8px 12px max(8px, env(safe-area-inset-bottom)); }
  #editor.docked .where { flex:none; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  #editor.docked textarea { flex:1 1 auto; min-height:44px; }
  #editor.docked .row { flex:none; }
  #editor .where { margin:0 0 6px; color:var(--muted); font-size:13px; }
  #editor .moved { margin:0 0 6px; font-size:13px; font-weight:600; }
  #editor textarea { display:block; width:100%; min-height:76px; padding:6px 8px; border:1px solid #777; border-radius:4px; font:16px/1.4 system-ui, sans-serif; resize:vertical; }
  #editor .row { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
  .bar { position:fixed; left:0; right:0; bottom:0; z-index:4; display:flex; align-items:center; gap:10px; padding:8px 12px calc(8px + env(safe-area-inset-bottom)); background:#fff; border-top:1px solid var(--line); }
  .bar .note-count { margin-right:auto; font-size:14px; }
  body.docked .bar, body.viewing .bar { display:none; }
  .session, #editor .copies { color:var(--muted); font-size:13px; }
  #editor .copies { flex:none; margin:6px 0 0; }
  #toast { position:fixed; left:50%; bottom:72px; z-index:7; max-width:90vw; transform:translateX(-50%); padding:6px 12px; border-radius:4px; background:#222; color:#fff; font-size:14px; opacity:0; pointer-events:none; transition:opacity .2s; }
  #toast.show { opacity:1; }
  #copybuf { position:fixed; left:0; top:0; width:1px; height:1px; opacity:0; pointer-events:none; }
</style>
</head>
<body data-change="2026-10-01-wiki-page-checks">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-10-01-wiki-page-checks</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. Saving a note copies all your notes. Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">Code has limits it can't pass: no file over 500 lines, no function too tangled. The wiki has only a link check. A page can grow without end, and three already passed 3,000 words: the deploy pipeline (4,300), browsing (3,500), and memory (3,300). A long page is slow for a person to read and costly for the assistant to load. A link to one section of a page breaks without warning when that heading is renamed, and nothing checks that a page opens with its title and a first sentence, though the wiki rules require both.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>Each publish checks every wiki page, the way code is checked.</b> Beside the link check, three new checks run here and in every install: - a page over 3,000 words fails, and the message says to split it by its sections; - a link to a section of a page, like <code>browsing.md#hand-the-browser-over</code>, must land on a heading that exists; - a page opens with one title, then a sentence that says what it is.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-1-line-1" tabindex="0"> publish</span>
<span class="ln" data-note="item-1-line-2" tabindex="0">    │</span>
<span class="ln" data-note="item-1-line-3" tabindex="0">    ▼</span>
<span class="ln" data-note="item-1-line-4" tabindex="0"> wiki check ── links land?        (today)</span>
<span class="ln" data-note="item-1-line-5" tabindex="0">    │       ── under 3,000 words? (new)</span>
<span class="ln" data-note="item-1-line-6" tabindex="0">    │       ── section links?     (new)</span>
<span class="ln" data-note="item-1-line-7" tabindex="0">    │       ── title + sentence?  (new)</span>
<span class="ln" data-note="item-1-line-8" tabindex="0">    ▼</span>
<span class="ln" data-note="item-1-line-9" tabindex="0"> all pass ──▶ live</span>
<span class="ln" data-note="item-1-line-10" tabindex="0"> one fails ─▶ fix it, publish again</span></pre></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>The three long pages get split.</b> Each keeps its address and its opening sections, so the links pointing at it still work. Its longest later sections move to a new page beside it, linked from where they were. You read the same words, in shorter pages.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-2-line-1" tabindex="0"> BEFORE              AFTER</span>
<span class="ln" data-note="item-2-line-2" tabindex="0"> d1-pipeline  4,300  d1-pipeline   &lt;3,000</span>
<span class="ln" data-note="item-2-line-3" tabindex="0">                     + 1 new page</span>
<span class="ln" data-note="item-2-line-4" tabindex="0"> browsing     3,500  browsing      &lt;3,000</span>
<span class="ln" data-note="item-2-line-5" tabindex="0">                     + blocked sites</span>
<span class="ln" data-note="item-2-line-6" tabindex="0"> memory       3,300  memory        &lt;3,000</span>
<span class="ln" data-note="item-2-line-7" tabindex="0">                     + the memory key</span></pre></div></details></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>Each check runs only when its kind of file changed.</b> A change to wiki pages alone already skips the code tests. Now a change to code alone skips the wiki check too, unless it removes or moves a file, which could break a wiki link.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-3-line-1" tabindex="0"> changed          │ code tests │ wiki check</span>
<span class="ln" data-note="item-3-line-2" tabindex="0"> ─────────────────┼────────────┼───────────</span>
<span class="ln" data-note="item-3-line-3" tabindex="0"> wiki pages only  │ skipped    │ runs</span>
<span class="ln" data-note="item-3-line-4" tabindex="0"> code only        │ runs       │ skipped</span>
<span class="ln" data-note="item-3-line-5" tabindex="0"> code + moved file│ runs       │ runs</span>
<span class="ln" data-note="item-3-line-6" tabindex="0"> both             │ runs       │ runs</span></pre></div></details></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>The wiki rules name the limit.</b> The page that sets how the wiki is written says a page stays under 3,000 words, so the assistant splits a page before the check has to catch it.</div></div></li>
</ol>
<p class="aside">Non-goals: a limit on line length or on the number of lines, since a wiki paragraph is one line; a ban on filler words from the voice guide; checking links from skills and other files outside the wiki, which this repo's release check already covers; a warning-only mode.</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-01</p>Asked how a size limit on wiki pages should work → a hard cap at 3,000 words that fails the check; the three pages over it today get split in this change.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-01</p>Asked which other checks should run on the wiki, like the code checks → section links must land on a real heading, and every page opens with one title and a first sentence; filler-word bans were not chosen.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-01</p>Assumed: words are counted as in <code>measure-context.mjs</code> (whitespace-separated, whole file, code blocks included), because one counting rule across the repo can't disagree with itself, and a code block costs a reader as much as prose.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-01</p>Assumed: no line-count cap like code's 500 lines, because a wiki paragraph is one line, so lines measure nothing; the longest page today is 363 lines.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-01</p>Assumed: the new checks run in every install, inside the existing wiki check, because that check already ships to every install's test workflow and one rule for every wiki can't drift. An install whose own page is over the cap gets a to-do in its update plan to split it.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-01</p>Assumed: a split keeps the old page at its address with its opening sections, and moves later sections out, because AGENTS.md, skills, and installs' own pages link those pages and their headings; keeping the linked headings in place avoids a retired name and broken links. The new section-link check proves the split left none.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-01</p>Assumed: section anchors follow GitHub's rule (lowercase, punctuation dropped, spaces to hyphens, <code>-1</code> for a repeated heading), because the wiki is read on GitHub and <code>wiki-style.md</code> already states that rule.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-01</p>Assumed: the section-link check covers links in wiki pages only, including <code>#section</code> links within the same page, because the shipped check is about the wiki, and <code>check-payload-links.mjs</code> already checks anchors from skills and rules into shipped pages here.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-01</p>Assumed: the title check reads the page with code blocks blanked, because a <code># comment</code> in a shell block is not a title; a trial on 2026-10-01 found every page passes the title, first-sentence, and section-link checks already (218 section links across the wiki, AGENTS.md, and skills, none broken).</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-01</p>Assumed during the build: links in this repo to a moved <code>##</code> section, not only its subheadings, point straight at the new page (the memory key's owner links and <code>store.mjs</code>'s help line included), because a reader then lands in one hop; the stubs stay for installs' own links.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-01</p>Asked (mid-build) that a wiki-only change runs only the wiki checks and a code-only change only the code checks, so CI wastes no time → wiki-only already skipped the code tests; the wiki check now skips when the change touches no Markdown and removes or moves no file.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-01</p>Assumed: any changed <code>.md</code> file, or any removed or moved file, runs the wiki check, because a wiki link can point at a skill's heading or at a code file, and a skipped check must be a proven skip, like the code tests' skip. A change with no base to compare runs it.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-01</p>Check: <code>.github/scripts/wiki-links.mjs</code> now fails on more problems (page size, section links, title and first sentence) and names them in its report; it is stricter, not looser.</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-01</p>Check: <code>.github/scripts/app-untouched.sh</code> prints a fourth answer, <code>wiki_affected</code>, false only when the change touches no Markdown and removes or moves no file, because the person asked that a code-only change skip the wiki check; any doubt (no base, an empty diff) answers true.</li>
<li class="decision card" id="decision-15" data-note="decision-15" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-01</p>Check: <code>.github/workflows/test.yml</code> skips <i>Check the wiki's links</i> when <code>wiki_affected</code> is false and says so in the summary, because no wiki link can break when no Markdown changed and no file was removed or moved.</li>
<li class="decision card" id="decision-16" data-note="decision-16" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-01</p>Saved for the online checks (task 4.3): all build tasks done; local checks pass except three browser-page tests that need <code>jsdom</code>, which this machine lacks.</li>
<li class="decision card" id="decision-17" data-note="decision-17" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-01</p>Archived for /ship as 29.5.0; the online checks passed on the branch after one lint fix (<code>startsWith</code> over a caret regex).</li>
</ol>
</section>
<section id="notes" aria-labelledby="notes-h"><h2 id="notes-h">Your notes</h2>
<p class="session" hidden>Storage is off. Notes and drafts last for this session only.</p>
<ul class="note-list" id="note-list"></ul>
</section>
</main>
<button type="button" id="chip" hidden>Add note</button>
<div id="editor" role="dialog" aria-labelledby="editor-where" hidden>
  <p class="where" id="editor-where"></p>
  <p class="moved">Possibly moved: its text changed, so this note is not attached.</p>
  <textarea aria-label="Note text" rows="3" placeholder="A question or a change"></textarea>
  <div class="row"><button type="button" class="primary" data-act="save">Save</button><button type="button" data-act="discard">Discard</button><button type="button" data-act="delete">Delete note</button><button type="button" data-act="close">Close</button></div>
  <p class="copies">Saving a note copies all your notes.</p>
  <p class="session" hidden>Notes last for this session only.</p>
</div>
<div id="viewer" role="dialog" aria-modal="true" aria-label="Drawing, full screen" hidden>
  <div class="zoom"><span class="level"></span><button type="button" aria-label="Zoom out">−</button><button type="button">Fit</button><button type="button" aria-label="Zoom in">+</button><button type="button" class="primary">Close</button></div>
  <div class="vframe"></div>
  <p class="vhint">Drag to move · pinch or + to zoom · tap a line to note it</p>
</div>
<div class="bar"><span class="note-count" aria-live="polite">0 notes</span><span class="session" hidden>Session only</span><button type="button" class="primary" id="copy">Copy notes</button></div>
<div id="toast" role="status"></div>
<textarea id="copybuf" aria-hidden="true" tabindex="-1" readonly></textarea>
<script>
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  window.addEventListener('error', function (e) {
    $('script-error').hidden = false;
    $('script-error').textContent = 'Review script error: ' + e.message + ' (line ' + e.lineno + ')';
  });
  const root = document.documentElement;
  root.classList.add('js');
  const CHANGE = document.body.getAttribute('data-change');
  const KEY = 'wong-review3:' + CHANGE;
  const phone = window.matchMedia ? window.matchMedia('(max-width: 700px)') : { matches: false };
  const chip = $('chip'), editor = $('editor'), ta = editor.querySelector('textarea');
  const viewer = $('viewer'), vframe = viewer.querySelector('.vframe'), vbar = viewer.querySelector('.zoom'), vb = vbar.querySelectorAll('button');
  const all = function (sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); };
  const esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };

  // ── storage: a refused store keeps notes for this session ──
  let store = null, data = { notes: [], drafts: {} };
  const ok = function (r, id) { return r && typeof r.label === 'string' && typeof r.text === 'string' && /^[\w-]+$/.test(id); };
  try { store = window.localStorage; store.getItem(KEY); } catch (e) { store = null; }
  try {
    const saved = store ? JSON.parse(store.getItem(KEY) || 'null') : null;
    if (saved && Array.isArray(saved.notes)) data.notes = saved.notes.filter(function (n) { return ok(n, n && n.id); });
    if (saved && saved.drafts) Object.keys(saved.drafts).forEach(function (id) { if (ok(saved.drafts[id], id)) data.drafts[id] = saved.drafts[id]; });
  } catch (e) { /* unreadable notes start empty */ }
  function persist() {
    if (store) { try { store.setItem(KEY, JSON.stringify(data)); } catch (e) { store = null; } }
    render();
  }

  // ── targets: a data-note id names its location; the label pins a note to its text ──
  function where(id) {
    const m = /^(why|item|decision)-(\d+)(?:-line-(\d+))?$/.exec(id) || [];
    if (m[1] === 'why') return { at: '#/why', kind: 'paragraph ' + m[2], spot: 'Why, paragraph ' + m[2] };
    if (m[1] === 'item') return { at: '#/' + m[2], kind: m[3] ? 'drawing line ' + m[3] : 'item', spot: 'Change #' + m[2] + (m[3] ? ', drawing line ' + m[3] : '') };
    return { at: '#/decisions/' + m[2], kind: 'decision', spot: 'Decision #' + m[2] };
  }
  function labelOf(el) {
    const c = el.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll('.pin, .meta, .add'), function (n) { n.parentNode.removeChild(n); });
    const text = c.textContent.replace(/\s+/g, ' ').trim();
    return where(el.getAttribute('data-note')).kind + ' "' + (text.length > 60 ? text.slice(0, 59) + '…' : text) + '"';
  }
  function find(id, label) {
    const el = document.querySelector('[data-note="' + id + '"]');
    return el && labelOf(el) === label ? el : null;
  }
  function noteOf(id) { return data.notes.filter(function (n) { return n.id === id; })[0] || null; }

  // ── render pins, Note buttons, counts, and the notes list ──
  function render() {
    all('.pin, .add', function (p) { p.parentNode.removeChild(p); });
    const n = data.notes.length, d = Object.keys(data.drafts).length;
    const count = plural(n) + (d ? ' · ' + d + (d === 1 ? ' draft' : ' drafts') : '');
    all('.note-count', function (el) { el.textContent = count; });
    all('.session', function (el) { el.hidden = !!store; });
    const ids = data.notes.map(function (x) { return x.id; }).concat(Object.keys(data.drafts).filter(function (id) { return !noteOf(id); }));
    $('note-list').innerHTML = ids.length ? '' : '<li class="muted">No notes yet.</li>';
    ids.forEach(function (id) {
      const note = noteOf(id), draft = data.drafts[id], rec = note || draft, num = note ? data.notes.indexOf(note) + 1 : 0;
      const el = find(id, rec.label);
      if (el) {
        const pin = document.createElement('button');
        pin.type = 'button'; pin.className = draft ? 'pin draft' : 'pin'; pin.setAttribute('data-open', id);
        pin.textContent = (num || '') + (num && draft ? ' · ' : '') + (draft ? 'Draft' : '');
        pin.setAttribute('aria-label', (num ? 'Open note ' + num : 'Open draft') + (num && draft ? ' and its draft' : ''));
        el.appendChild(pin);
      }
      const li = document.createElement('li');
      li.innerHTML = '<button type="button" class="entry" data-open="' + id + '"><span class="where">' + (num ? num + '. ' : '')
        + esc(where(id).at + ' · ' + rec.label) + (draft ? '<span class="tag">Draft</span>' : '') + (el ? '' : '<span class="tag">possibly moved</span>')
        + '</span>' + esc(draft ? draft.text : note.text) + '</button>';
      $('note-list').appendChild(li);
    });
    all('[data-note]', function (el) {
      if (el.closest('.art') || el.querySelector('.pin')) return;
      const id = el.getAttribute('data-note'), add = document.createElement('button');
      add.type = 'button'; add.className = 'add'; add.setAttribute('data-open', id);
      add.textContent = '+ Note'; add.setAttribute('aria-label', 'Note on ' + where(id).kind);
      el.appendChild(add);
    });
    drawings.forEach(function (d) {
      const k = d.art.querySelectorAll('.pin').length;
      d.count.textContent = k ? ' · ' + k + (k === 1 ? ' note' : ' notes') : '';
      fit(d);
    });
  }

  // ── still-tap to note: a mouse on text, or any pointer on a full-screen drawing line, shows the chip ──
  let chipFor = null, tap = null;
  const pointers = {};
  function showChip(el, x, y, keyboard) {
    const id = el.getAttribute('data-note');
    chipFor = el;
    chip.textContent = noteOf(id) || data.drafts[id] ? 'Edit note' : 'Add note';
    chip.hidden = false;
    const w = chip.offsetWidth, vw = root.clientWidth;
    chip.style.left = Math.max(8, Math.min(x - w / 2, vw - w - 8)) + window.pageXOffset + 'px';
    chip.style.top = y + 12 + window.pageYOffset + 'px';
    if (keyboard) chip.focus({ preventScroll: true });
  }
  function hideChip() { chip.hidden = true; chipFor = null; }
  document.addEventListener('pointerdown', function (e) {
    if (e.isPrimary) Object.keys(pointers).forEach(function (k) { delete pointers[k]; });
    pointers[e.pointerId] = true;
    tap = Object.keys(pointers).length === 1 && e.button === 0 ? { id: e.pointerId, x: e.clientX, y: e.clientY, t: Date.now(), target: e.target } : null;
  });
  document.addEventListener('pointermove', function (e) {
    if (tap && e.pointerId === tap.id && Math.abs(e.clientX - tap.x) + Math.abs(e.clientY - tap.y) > 8) tap = null;
  });
  document.addEventListener('pointercancel', function (e) { delete pointers[e.pointerId]; tap = null; });
  document.addEventListener('pointerup', function (e) {
    const t = tap;
    delete pointers[e.pointerId]; tap = null;
    if (!t || t.id !== e.pointerId || Date.now() - t.t > 500) return;
    if (t.target.closest('a, button, input, textarea, select, label, summary, #editor')) return;
    const el = t.target.closest('[data-note]');
    const offer = el && (el.closest('#viewer') || (e.pointerType === 'mouse' && !el.closest('.frame')));
    if (offer) showChip(el, e.clientX, e.clientY, false); else hideChip();
  });
  chip.addEventListener('click', function () { if (chipFor) openEditor(chipFor.getAttribute('data-note'), chipFor); });
  document.addEventListener('click', function (e) {
    const t = e.target.closest ? e.target.closest('[data-open]') : null;
    if (!t) return;
    const id = t.getAttribute('data-open'), rec = data.drafts[id] || noteOf(id), el = rec ? find(id, rec.label) : t.closest('[data-note]');
    if (el && t.classList.contains('entry')) { reveal(el); el.scrollIntoView({ block: 'center' }); }
    openEditor(id, el);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (open) closeEditor(true);
      else if (chipFor) { const el = chipFor; hideChip(); el.focus(); }
      else if (view) closeViewer(true);
    } else if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-note]')) {
      e.preventDefault();
      const r = e.target.getBoundingClientRect();
      showChip(e.target, r.left + 48, r.top + Math.min(r.height, 24), true);
    }
  });

  // ── the editor: beside its target on a desktop, docked at the bottom of the visible screen on a phone ──
  let open = null;
  function openEditor(id, el) {
    closeViewer(false); closeEditor(false); hideChip();
    if (el) reveal(el);
    const note = noteOf(id), draft = data.drafts[id];
    const label = draft ? draft.label : note ? note.label : labelOf(el);
    open = { id: id, label: label, el: el };
    $('editor-where').textContent = where(id).at + ' · ' + label;
    editor.querySelector('.moved').hidden = !!el;
    editor.querySelector('[data-act="delete"]').hidden = !note;
    ta.value = draft ? draft.text : note ? note.text : '';
    editor.hidden = false;
    if (el) el.classList.add('noting');
    place();
    ta.focus({ preventScroll: editor.classList.contains('docked') });
  }
  function closeEditor(restore) {
    if (!open) return;
    const el = open.el;
    open = null; editor.hidden = true;
    document.body.classList.remove('docked'); document.body.style.paddingBottom = '';
    if (el) { el.classList.remove('noting'); if (restore) el.focus({ preventScroll: true }); }
  }
  function place() {
    const docked = phone.matches || !open.el;
    editor.classList.toggle('docked', docked);
    document.body.classList.toggle('docked', docked);
    editor.style.left = editor.style.top = editor.style.bottom = editor.style.maxHeight = '';
    if (docked) {
      dock();
      document.body.style.paddingBottom = editor.offsetHeight + 24 + 'px';
      keepVisible();
      return;
    }
    const r = open.el.getBoundingClientRect(), w = editor.offsetWidth, vw = root.clientWidth;
    let left = r.right + 12, top = r.top;
    if (left + w > vw - 8) { left = Math.max(8, Math.min(r.left, vw - w - 8)); top = r.bottom + 8; }
    editor.style.left = left + window.pageXOffset + 'px';
    editor.style.top = top + window.pageYOffset + 'px';
  }
  // The visible screen: a phone keyboard shrinks it, and a host app may shrink the page too, so place from its top.
  function screen() {
    const vv = window.visualViewport;
    return vv ? { top: vv.offsetTop, h: vv.height } : { top: 0, h: window.innerHeight };
  }
  function dock() {
    if (!open || !editor.classList.contains('docked')) return;
    const s = screen();
    editor.style.maxHeight = s.h + 'px';
    editor.style.bottom = 'auto';
    editor.style.top = s.top + Math.max(0, s.h - editor.offsetHeight) + 'px';
  }
  function keepVisible() {
    if (!open || !open.el) return;
    const r = open.el.getBoundingClientRect(), s = screen(), limit = s.top + s.h - editor.offsetHeight - 8;
    if (r.bottom > limit) window.scrollBy(0, Math.min(r.top - s.top - 8, r.bottom - limit));
  }
  let seen = screen().h;
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', function () {
      const h = screen().h, keyboard = Math.abs(h - seen) > 100;
      seen = h; dock();
      if (keyboard) keepVisible();
    });
    window.visualViewport.addEventListener('scroll', dock);
  }
  ta.addEventListener('input', function () {
    if (!open) return;
    const note = noteOf(open.id), text = ta.value;
    if (!text.trim() || (note && text === note.text)) delete data.drafts[open.id];
    else data.drafts[open.id] = { label: open.label, text: text };
    persist();
  });
  editor.addEventListener('click', function (e) {
    const act = e.target.getAttribute('data-act');
    if (!act || !open) return;
    const id = open.id, note = noteOf(id), text = ta.value.trim();
    if (act === 'save') {
      if (!text) { ta.focus(); return; }
      if (note) note.text = text; else data.notes.push({ id: id, label: open.label, text: text });
    }
    if (act === 'delete') data.notes = data.notes.filter(function (n) { return n.id !== id; });
    if (act !== 'close') delete data.drafts[id];
    closeEditor(true); persist();
    if (act === 'save') {
      const n = data.notes.length;
      copyNotes(function () { toast('Saved and copied ' + plural(n) + '. Paste them into chat.'); },
        function () { toast('Saved. Tap Copy notes to copy them.'); });
    }
  });

  // ── drawings: fitted by font size on the page; a tap shows one full screen, where it zooms and scrolls natively ──
  const BASE = 13, drawings = [];
  let view = null;
  const V = { f: BASE, lo: BASE, hi: BASE };
  function size(art, f, max) {
    art.style.fontSize = f + 'px';
    for (let i = 0; i < 3 && art.offsetWidth > max; i += 1) { f *= max / art.offsetWidth; art.style.fontSize = f + 'px'; }
    return f;
  }
  function fit(d) {
    if (!d.fig.open || view === d) return;
    d.art.style.fontSize = BASE + 'px';
    const w = d.art.offsetWidth, fw = d.frame.clientWidth - 1;
    if (w > 0 && fw > 0) size(d.art, BASE * Math.min(1.25, fw / w), fw);
  }
  function reveal(el) {
    const fig = el.closest('details');
    if (fig && !fig.open) { fig.open = true; drawings.forEach(fit); }
  }
  function scale(f, cx, cy) {
    f = Math.max(V.lo, Math.min(V.hi, f));
    const k = f / V.f, x = (vframe.scrollLeft + cx) * k - cx, y = (vframe.scrollTop + cy) * k - cy;
    V.f = f; view.art.style.fontSize = f + 'px';
    vframe.scrollLeft = x; vframe.scrollTop = y;
    const atFit = f <= V.lo * 1.001;
    vbar.firstChild.textContent = (atFit ? 'Fit · ' : '') + Math.round(f / BASE * 100) + '%';
    vb[0].disabled = atFit; vb[2].disabled = f >= V.hi * 0.999;
  }
  function openViewer(d) {
    hideChip();
    view = d; viewer.hidden = false; document.body.classList.add('viewing');
    vframe.appendChild(d.art);
    d.art.style.fontSize = BASE + 'px';
    const fw = vframe.clientWidth - 1;
    V.lo = size(d.art, BASE * fw / Math.max(1, d.art.offsetWidth), fw);
    V.hi = Math.max(V.lo * 4, 40); V.f = V.lo;
    vframe.scrollLeft = vframe.scrollTop = 0;
    scale(V.lo, 0, 0);
    vb[3].focus({ preventScroll: true });
  }
  function closeViewer(restore) {
    if (!view) return;
    const d = view;
    view = null;
    d.frame.insertBefore(d.art, d.frame.firstChild);
    viewer.hidden = true; document.body.classList.remove('viewing');
    fit(d);
    if (restore) d.enlarge.focus({ preventScroll: true });
  }
  vbar.addEventListener('click', function (e) {
    const i = Array.prototype.indexOf.call(vb, e.target);
    if (i === 3) closeViewer(true);
    else if (i >= 0) scale([V.f / 1.25, V.lo, V.f * 1.25][i], vframe.clientWidth / 2, vframe.clientHeight / 2);
  });
  vframe.addEventListener('wheel', function (e) {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const r = vframe.getBoundingClientRect();
    scale(V.f * (e.deltaY < 0 ? 1.1 : 1 / 1.1), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });
  // One finger scrolls natively; two fingers pinch around their midpoint.
  let pinch = null;
  const span = function (t) { return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY) || 1; };
  vframe.addEventListener('touchstart', function (e) { if (e.touches.length === 2) pinch = { f: V.f, dist: span(e.touches) }; }, { passive: true });
  vframe.addEventListener('touchmove', function (e) {
    if (!pinch || e.touches.length !== 2) return;
    if (e.cancelable) e.preventDefault();
    const r = vframe.getBoundingClientRect(), t = e.touches;
    scale(pinch.f * span(t) / pinch.dist, (t[0].clientX + t[1].clientX) / 2 - r.left, (t[0].clientY + t[1].clientY) / 2 - r.top);
  }, { passive: false });
  vframe.addEventListener('touchend', function (e) { if (e.touches.length < 2) pinch = null; });
  document.addEventListener('gesturestart', function (e) { if (view) e.preventDefault(); });
  all('.drawing', function (fig) {
    const frame = fig.querySelector('.frame'), enlarge = document.createElement('button');
    enlarge.type = 'button'; enlarge.className = 'enlarge'; enlarge.textContent = 'Full screen';
    frame.appendChild(enlarge);
    const d = { fig: fig, frame: frame, art: fig.querySelector('.art'), count: fig.querySelector('.count'), enlarge: enlarge };
    drawings.push(d);
    fig.addEventListener('toggle', function () { fit(d); });
    frame.addEventListener('click', function (e) { if (!e.target.closest('[data-open]')) openViewer(d); });
  });

  // ── direct links: #/why, #/<n>, #/decisions/<n> ──
  function jump() {
    const m = /^#\/(?:decisions\/(\d+)|(\d+)|(why|changes|decisions))$/.exec(location.hash);
    const el = m ? $(m[1] ? 'decision-' + m[1] : m[2] ? 'item-' + m[2] : m[3]) : null;
    if (!el) return;
    all('.hit', function (n) { n.classList.remove('hit'); });
    el.classList.add('hit');
    el.scrollIntoView({ block: 'start' });
  }

  // ── copy: saved notes only, as notes on the plan: each asks or changes something ──
  function notesText() {
    const lines = ['Notes on the plan ' + CHANGE + ' from the review page. Don\'t build yet.'];
    data.notes.forEach(function (n) {
      const w = where(n.id);
      lines.push('- ' + w.spot + ' (' + n.label.slice(w.kind.length + 1) + '): ' + n.text.replace(/\s*\n\s*/g, ' '));
    });
    return lines.join('\n');
  }
  function toast(text) {
    $('toast').textContent = text; $('toast').classList.add('show');
    setTimeout(function () { $('toast').classList.remove('show'); }, 2000);
  }
  function plural(n) { return n + (n === 1 ? ' note' : ' notes'); }
  // One routine for Copy notes and Save: the Clipboard API, else select #copybuf and execCommand, then hand focus back.
  function copyNotes(done, failed) {
    const buf = $('copybuf');
    buf.value = notesText();
    const fallback = function () {
      const back = document.activeElement;
      buf.select();
      const ok = document.execCommand('copy');
      if (back && back !== buf && back.focus) back.focus({ preventScroll: true });
      if (ok) done(); else failed();
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(buf.value).then(done, fallback); else fallback();
  }
  $('copy').addEventListener('click', function () {
    const n = data.notes.length;
    if (!n) { toast('No saved notes yet. Drafts are not copied.'); return; }
    copyNotes(function () { toast('Copied ' + plural(n) + '. Paste them into chat.'); },
      function () { toast('Copy failed. Copy the notes list by hand.'); });
  });

  let width = root.clientWidth;
  window.addEventListener('resize', function () {
    if (root.clientWidth !== width) {
      width = root.clientWidth; hideChip();
      if (view) { const d = view; closeViewer(false); openViewer(d); }
    }
    drawings.forEach(fit);
    if (open) place();
  });
  window.addEventListener('hashchange', jump);
  render();
  jump();
}());
</script>
</body>
</html>

~~~
<!-- end review.html -->
