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
