# Make slide decks

**Status:** parked
**Branch:** harness-problems-slide-deck
**Open questions:** none

## Why

You want to ask for a slide deck and get a real PowerPoint file you can open, edit and present. Today each deck is a one-off script on one computer, with tools WongStack doesn't install, and the copies get lost. The first deck you want: the problems people hit when they build an AI harness, and how WongStack solves each.

## What Changes

- **You ask for a deck; you get a PowerPoint file.** Ask *make a deck about X* and the agent writes the slides, builds the file and sends you a link. The link shows every slide and has a *Download* button. Type changes on the same page and send them; the agent rebuilds the deck. It needs nothing new on your computer.
  ```mermaid
  flowchart LR
    ask["you ask"] --> write[slides written] --> link[link: see, download]
    link -->|"changes"| write
  ```
- **One problem per slide: words on the left, a picture on the right.** The picture is made of boxes and arrows the file keeps as shapes, so you can still move and retype them in PowerPoint, Keynote or Google Slides. Short labels on the slide; the detail goes in the speaker notes.
  ```screen
  <div class="card col gap">
    <h3>Keys leak into chat</h3>
    <div class="row gap">
      <div class="col gap grow"><span class="muted">The agent needs your keys. Pasted in chat, they stay in its history.</span></div>
      <div class="col gap grow">
        <span class="bar">How WongStack solves it</span>
        <div class="row gap"><span class="tag-outline">You</span><span>→</span><span class="tag-outline">Private link</span><span>→</span><span class="tag">Key file</span></div>
      </div>
    </div>
  </div>
  ```
- **The first deck: building an AI harness.** After the skill works, the agent uses it to make this deck and sends you its link. One slide per problem; change the list on this plan if you want others:
  | Slide | The problem (words) | How WongStack solves it (picture) |
  |-|-|-|
  | Keys and logins | Pasted keys stay in chat history | A private link puts the key in a file on your computer; the app holds business keys |
  | Memory | Each chat starts blank | Every chat leaves facts; the next chat starts with a digest |
  | Context | Load everything and the agent drowns | Short start file, then a wiki read one link at a time; a word budget |
  | Stale knowledge | The same fact in two places goes stale | Four places, one job each; one topic, one page |
  | Building the wrong thing | Code starts before you agree | Explore, plan with a review page, build only on your go |
  | Guesses and lost reasons | The agent guesses silently; later nobody knows why | The plan page lists each guess for you to fix; the decision log is kept |
  | Breaking what works | A change goes live untested | Checks, then a preview, then publish on your yes |
  | Git for people who don't code | Branches and merges get in the way | You ask in plain words; the steps run git |
  | Websites without an API | The agent must log in as you | Saved logins, passwords through a private link, a live view at robot checks |
  | A team on one brain | Everyone needs their own access | Each person signs in; roles decide what they see; one shared memory |
  | Work that repeats | The agent works only while you chat | Schedules run it and report back |
  | Tied to one AI | Your setup lives inside one chat app | One repo that Claude Code and Codex both read |
  | Staying current | A copied template drifts | Updates arrive as a plan that keeps your edits |

Non-goals: no upload to Google Drive or other services in this change (download the file, then import it); no photos or charts from data; no editing of a deck someone made in another tool.

## Capabilities

### New Capabilities
- `slide-decks`: the `/deck` skill: a deck written as a short outline, built into an editable .pptx with no added dependency, previewed and downloaded through a reply link, kept outside the repo for later edits.

### Modified Capabilities

## Impact

- New skill `.agents/skills/deck/` (`SKILL.md`, `scripts/deck.mjs`, `scripts/lib/pptx.mjs`, `scripts/lib/zip.mjs`) and test `scripts/tests/deck.test.mjs`.
- New wiki page `wiki/development/decks.md`, linked from `wiki/development/README.md`.
- `payload-files.json` `core.skillDirs`, `areas.json` (new spec), `CHANGELOG.md` `## Next (minor)` entry.
- Startup words: the skill's description must fit the 49 words left under the 2,200-word ceiling.

## Decision log

- **2026-10-29** — Asked whether to make only this deck, a deck skill then this deck, or keep this deck in the repo → chose a deck skill, then this deck.
- **2026-10-29** — Assumed: the builder is a Node script with only built-in modules, not python-pptx or an npm package, because WongStack's required tools rule out Python and new dependencies.
- **2026-10-29** — Assumed: the picture side is drawn as native shapes and arrows, not images, because an earlier image-heavy python-pptx deck would not open in Google Slides and shapes stay editable.
- **2026-10-29** — Assumed: the finished deck goes to you through a reply link with a preview and a Download button, because a file path on the computer can't be opened from a phone; Drive upload is left out.
- **2026-10-29** — Assumed: decks are kept in `~/.wong-stack/decks/<name>/`, outside the repo, because earlier deck copies were lost and a deck is not repo content.
- **2026-10-29** — Assumed: the look is the self-drive deck's dark look (near-black, mint, blue, purple), because your last two decks used it.
- **2026-10-29** — Assumed: the harness problems in the table, picked from what WongStack already ships; edit the list on this plan.
- **2026-10-29** — Assumed: short labels on slides, detail in speaker notes, because you removed sub text on the 2026-10-12 deck twice.
- **2026-10-29** — Asked, during the build, for a slide on the planning process → added "The agent guesses, and the why gets lost" after the planning slide, since "Code starts before you agree" already covered building the wrong thing.
- **2026-10-29** — Assumed: `SKILL.md` is one link to the wiki's *Make a deck* steps, and the preview code sits in its own file, because the skill-text budget had 1 byte of room.
- **2026-10-29** — Assumed: about 270 bytes of wording cut from setup's Cloudflare runbook, with no rule removed, to fit the new skill under the skill-text budget.
- **2026-10-29** — Assumed: `areas.json` names the `slide-decks` spec only at archive, because the area test fails on a spec file that does not exist yet.
- **2026-10-29** — Saved for later, not published (the person's choice). Built and checked here; the deck is at `~/.wong-stack/decks/harness-problems/`. Open: task 4.4, the person imports the file into Google Slides once.
