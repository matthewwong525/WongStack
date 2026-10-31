# Make slide decks

**Status:** in-progress
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
- **One problem per slide: words on the left, a picture on the right.** Each picture is drawn as shapes the file keeps, so you can still move and retype them in PowerPoint, Keynote or Google Slides. Short labels on the slide; the detail goes in the speaker notes.
- **Six kinds of picture, so slides don't all look the same.** The agent picks the kind that fits each idea:
  ```svg
  <svg viewBox="0 0 600 220">
    <text x="10" y="18" fill="muted">steps</text>
    <rect x="10" y="30" width="40" height="24" rx="4" fill="card" stroke="line"/><rect x="70" y="30" width="40" height="24" rx="4" fill="card" stroke="line"/><rect x="130" y="30" width="40" height="24" rx="4" fill="card" stroke="fg"/>
    <path d="M50 42h18M110 42h18" stroke="fg"/>
    <text x="210" y="18" fill="muted">loop</text>
    <circle cx="260" cy="60" r="34" fill="none" stroke="line"/><circle cx="260" cy="26" r="9" fill="card" stroke="fg"/><circle cx="290" cy="77" r="9" fill="card" stroke="fg"/><circle cx="230" cy="77" r="9" fill="card" stroke="fg"/>
    <text x="410" y="18" fill="muted">before / after</text>
    <rect x="410" y="30" width="80" height="70" rx="4" fill="card" stroke="danger"/><rect x="505" y="30" width="80" height="70" rx="4" fill="card" stroke="fg"/>
    <text x="420" y="70" fill="danger">without</text><text x="518" y="70" fill="fg">with</text>
    <text x="10" y="130" fill="muted">hub</text>
    <circle cx="90" cy="180" r="16" fill="card" stroke="fg"/><path d="M90 164v-18M90 196v18M74 180h-30M106 180h30" stroke="line"/>
    <circle cx="90" cy="142" r="6" fill="subtle"/><circle cx="90" cy="216" r="6" fill="subtle"/><circle cx="40" cy="180" r="6" fill="subtle"/><circle cx="140" cy="180" r="6" fill="subtle"/>
    <text x="210" y="130" fill="muted">layers</text>
    <rect x="210" y="140" width="120" height="16" rx="3" fill="card" stroke="line"/><rect x="225" y="162" width="90" height="16" rx="3" fill="card" stroke="line"/><rect x="240" y="184" width="60" height="16" rx="3" fill="card" stroke="fg"/>
    <text x="410" y="130" fill="muted">timeline</text>
    <path d="M410 180h180" stroke="line"/><circle cx="430" cy="180" r="6" fill="fg"/><circle cx="490" cy="180" r="6" fill="fg"/><circle cx="550" cy="180" r="6" fill="fg"/>
  </svg>
  ```
  | Kind | For an idea like |
  |-|-|
  | steps | one thing, then the next, with a stop where you say yes |
  | loop | something that comes back around and gets better each time |
  | before / after | the usual way, crossed out, beside the better way |
  | hub | one shared thing in the middle, many people or tools around it |
  | layers | start small and open only what you need |
  | timeline | work that happens on its own, on a schedule |
- **The first deck: the top 7 problems with an AI assistant, in plain words.** Each title names what is at stake for you, not a general idea. After the skill works, the agent uses it to make this deck and sends you its link. Generic problems anyone using AI meets, not how WongStack is built:
  | Slide | The problem | How WongStack solves it | Picture |
  |-|-|-|-|
  | You explain your business again every day | Each new chat starts from zero. You explain your business again. | Each chat saves what it learned; the next one starts knowing it. | loop |
  | It doesn't know how your business works | It gives generic answers, because it can't see how you do things. | Your company's know-how is written down once, in pages it reads before it works. | before / after |
  | It builds something you never asked for | It guesses what you meant, and you find out at the end. | It shows you a plan, with its guesses listed, and waits for your go. | steps |
  | One change takes down your live website | A change that looked fine goes live and breaks something. | Every change is checked, then you see a test copy, then you say publish. | steps (with a failure branch) |
  | What one person teaches it, the team never gets | Each person's AI learns alone. A fix found on Monday is lost to everyone else. | One shared brain: what any chat learns, every teammate's AI can use. | hub |
  | Everyone has access to your company secrets | To share the AI with your team, you share one login, and every secret with it. | Each person signs in as themselves and sees only their part. | before / after |
  | Switch AI apps and you lose your whole setup | Your setup lives inside one AI app. Switch, and you start over. | Your business knowledge lives in your own folder; any AI can use it. | hub |

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
- **2026-10-29** — Asked, after seeing the first deck, for more varied pictures, less technical wording, and only the top 8 problems → planned five more picture kinds (loop, before/after, hub, layers, timeline) beside steps, and replaced the 13 problem slides with 8 generic ones.
- **2026-10-29** — Assumed: the 8 problems are the first three you named (logins, memory, context), then planning, safety, team access, schedules and being locked to one AI; stale knowledge, git, websites without an API, and template updates are cut as the most technical.
- **2026-10-31** — Asked, in review, for slide titles less vague, like "Everyone has access to your company secrets" → rewrote all 8 titles to name what is at stake for you.
- **2026-10-31** — Asked, in review, to drop the passwords slide (less important for someone starting out) and the schedules slide (not developed enough), to question the "too much to read" slide, and to add one on sharing with the team without sharing company secrets or losing what each person learned → dropped both; added "What one person teaches it, the team never gets"; kept the access slide as the secrets half.
- **2026-10-31** — Assumed: the context slide becomes "It doesn't know how your business works", because generic answers are the context problem a business owner sees; "too much to read" was the builder's view of it.
- **2026-10-31** — Assumed: 7 slides, not 8, because the two cuts and one addition leave seven, and padding one in would weaken the deck; timeline and layers stay in the skill but this deck doesn't use them.
