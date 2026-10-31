# Attachments: paste-in fixes for your AI setup

**Status:** ready-to-ship
**Branch:** attachments-page
**Open questions:** none

## Why

People already have an AI setup, and they hit the same problems: it forgets, it doesn't know the business, it builds the wrong thing. You want to help them fix each problem in the setup they have, not sell them WongStack. Each fix is a short list someone pastes into their own AI chat, and their AI builds it. The fixes come from how WongStack works today, so they must change when WongStack does.

## What Changes

- **A new page on wongstack.com: Attachments.** One card per problem. Each card says the problem in a sentence, the fix in a sentence, and holds the text to paste, with a Copy button. The header gets an *Attachments* link, and each card has its own link, so a slide or a post can point straight to one.
  ```screen
  <div class="card col gap phone">
    <h3>Attachments</h3>
    <span class="muted">Paste one into your AI chat. It adds the fix to the setup you have.</span>
    <div class="sep"></div>
    <div class="card col gap">
      <h3>You explain your business again every day</h3>
      <span class="muted">Each new chat starts from zero.</span>
      <span>Fix: each chat saves what it learned, and the next one starts knowing it.</span>
      <div class="field col gap"><span class="bar">Add a memory system to my AI setup…</span><span class="bar">&gt; Keep short facts from each chat…</span><span class="bar">&gt; For more context, look at this repo…</span></div>
      <div class="row gap"><span class="grow"></span><button class="btn-primary">Copy</button></div>
    </div>
    <div class="card col gap"><h3>It doesn't know how your business works</h3><div class="skeleton"></div></div>
  </div>
  ```
- **Each attachment is a list of bullets for an AI to build from.** An opening line tells the AI what to add and to ask before anything that can't be undone. Then one flat list: every line starts with `>` and says one short thing, with no WongStack names or tools the reader lacks. The last bullet points to the WongStack repo for more context, at the page for that problem.
  ```text
  Add a memory system to my AI setup. Build it
  in this project and ask me before anything
  you can't undo:

  > Keep short facts from each chat, one per line
  > Each fact says who, when, and why
  > ...
  > For more context, look at this repo:
    https://github.com/matthewwong525/WongStack
    (start at wiki/development/memory.md)
  ```
- **The first seven attachments**, one per problem:
  | Problem | The fix it installs |
  |-|-|
  | You explain your business again every day | Each chat saves what it learned; the next one starts knowing it |
  | It doesn't know how your business works | Your know-how written down once, in pages the AI reads before it works |
  | It builds something you never asked for | It shows you a plan, with its guesses listed, and waits for your go |
  | One change takes down your live website | Every change is checked, then you see a test copy, then you say publish |
  | What one person teaches it, the team never gets | One shared memory and knowledge base every teammate's AI uses |
  | Everyone has access to your company secrets | Each person signs in as themselves; keys stay on the server, never in chat |
  | Switch AI apps and you lose your whole setup | Your setup lives in your own folder, in files any AI can read |
- **They change when WongStack changes.** Each attachment lists the WongStack pages it comes from. When a change edits one of those pages, publishing stops until that attachment is rewritten in the same change, or marked checked when the edit doesn't touch it.
  ```mermaid
  flowchart LR
    edit[page changes] --> check{"attachment too?"}
    check -->|yes| publish
    check -->|no| stop[rewrite it]
  ```
- **Your WongOS skill moves into WongStack.** `/paste-this-into-your-ai` writes the X posts as before, and now also writes and rewrites attachments. It stays in WongStack only: no install gets it.

Non-goals: no deck and no deck skill (dropped; a deck can point to these cards later); no change to what installs get; no attachment for passwords in chat or for schedules.

## Capabilities

### New Capabilities

### Modified Capabilities
- `landing-site`: a public Attachments page of paste-in fixes with copy buttons and a link per card; each attachment lists its WongStack sources, and the checks fail when a source changes without its attachment.

## Impact

- `site/attachments/<slug>.md` (seven files), `site/src/Attachments.tsx`, `site/src/App.tsx` (route), `site/src/SiteHeader.tsx` (link), `site/src/index.css`, site tests.
- `scripts/check-attachments.mjs` and `scripts/tests/check-attachments.test.mjs`; a step in `scripts/payload-checks.mjs` and `.github/workflows/payload.yml`.
- `.agents/skills/paste-this-into-your-ai/` (from WongOS, meta-only, not in `payload-files.json`).
- `wiki/maintaining/attachments.md` (new), linked from `wiki/maintaining/README.md` and `wiki/maintaining/landing-page.md`.
- Meta-only throughout: no `CHANGELOG.md` entry, nothing reaches installs.

## Decision log

- **2026-10-31** — Asked to stop pitching WongStack: for each problem, a paste-in prompt that installs WongStack's fix in the person's own setup, kept on a WongStack page and updated with WongStack, the last bullet pointing to the repo.
- **2026-10-31** — Asked where the attachments live → chose a page on wongstack.com with a Copy button per card, the text kept as files in WongStack.
- **2026-10-31** — Asked how they stay current → chose a check at each publish: a changed source page stops publishing until its attachment is rewritten.
- **2026-10-31** — Asked where the WongOS bullet skill lives → chose to move it into WongStack.
- **2026-10-31** — Asked whether to finish the deck skill first → chose to drop the deck skill and build the attachments first. The deck change (`make-slide-decks`, pull request #477) was closed unmerged; its branch `harness-problems-slide-deck` stays for reference.
- **2026-10-31** — Assumed: the page is named *Attachments*, at `/attachments`, using your word for them; it is a cheap rename later.
- **2026-10-31** — Assumed: the seven problems are the deck's last list, because you settled those titles in the deck review.
- **2026-10-31** — Assumed: the opening line asks the AI to build in the current project and to ask before anything that can't be undone, because a stranger's AI pastes this into a real setup.
- **2026-10-31** — Assumed: an edit to a source page that doesn't change the fix passes by updating the attachment's `checked:` date, so a wording fix in the wiki doesn't force a rewrite.
- **2026-10-31** — Assumed: the WongOS copy of the skill stays until you remove it there; this change edits only WongStack.
- **2026-10-31** — Assumed: no release entry, because the site, the check and the moved skill are WongStack-only and reach no install.
- **2026-10-31** — Check: `.github/workflows/payload.yml` gains one release check, `node scripts/check-attachments.mjs`, and loosens nothing, because the attachments check runs on every change, a wiki-only one too.
- **2026-10-31** — Assumed: `scripts/check-attachments.mjs` always reads uncommitted work as well as the branch's commits, with no `--worktree` flag, because the local pre-check runs the same command as CI, and CI's working tree is clean.
- **2026-10-31** — Assumed: on a phone (under 30rem, 480 px) the header shows the logo without the name, read aloud only, because the name and three links overflow a 400 px screen.
- **2026-10-31** — Built. The second look found one bug: an empty field, such as a blank `title:`, read as a list and passed the check. Fixed: only `sources:` opens a list; any other empty value reads as missing, with tests for a blank title and a blank order.
