# Design

## Context

See proposal.md - Why. This is a wording change with one small screen change (the landing page's headline). No behaviour of any skill or script changes.

**The source text**, agreed with Matthew on 2026-10-06. Use his words and order; keep "assistant" and "go live"; add no jargon:

> AI is now good enough that anyone can build their own apps. Most people still can't, because nothing is set up for them. The AI can write an app, but it has nowhere to put it.
>
> WongStack gives your assistant one place to do three things:
> - Build. Ask for a tool in plain words and it makes a real, working app.
> - Remember. It keeps what it learns about you and your work, so you never explain twice.
> - Get things done. It runs your errands, uses websites for you, and does jobs while you sleep.
>
> All of it lives in one Cloudflare account that you own. You paste one message to set it up.
>
> You can put several assistants to work at once, and they don't get in each other's way. You never look at code. You read a short plan, try the real thing on a link, and say "go live".
>
> GitHub is for engineers. This is the next one, for everyone else.

**His points behind it, to keep true:** the setup is the hardest part, and WongStack is that setup done once, his opinionated way, easy to adapt; he built it to run his clay-kit company and shares it; data is personal and stays in the person's own account; logins, keys, and who on a team can see and change what are taken care of.

**What is true today, checked 2026-10-06**, and so bounds the wording:

| Claim in the vision | What holds | Where it is owned |
|---|---|---|
| One Cloudflare account you own | The default for a new install on Mac or Linux, on Cloudflare's paid plan (about $5 a month). The free route keeps files in GitHub. | `wiki/stack/artifacts-route.md` |
| Several assistants at once | Opening a workspace per part needs the `paseo` command today (`.agents/skills/plan/references/new-workspace.md`). Without it, parts are done one at a time. | `wiki/development/required-tools.md` |
| Remember | The digest at the start of a chat and the first-edit reminder are wired for Claude Code (`.agents/settings.json`) and Codex (`.agents/hooks.json`) only. Any assistant can run `memory.mjs` when asked. | `wiki/development/memory.md` |
| Does jobs while you sleep | `/routine` runs in the person's Cloudflare account, on its paid plan. | `wiki/stack/cloud-routines.md` |
| A team | One person publishes on a project kept in Cloudflare; adding a teammate who publishes is not built. | `wiki/stack/artifacts-route.md` |

**Existing spec promises the README must still keep:** its first screen says whose way of using AI this is, through his real business, with example requests and no developer terms (`open-source-release`); it links the philosophy page (`knowledge-center`); it links `LICENSE` and `SECURITY.md`; its fenced install message equals `INSTALL_PROMPT` in `site/src/install.ts` (`scripts/tests/landing-site.test.mjs`).

## Goals / Non-Goals

**Goals:**

- One wording for the vision, in the README; the wiki root and the landing page say it shorter and link or echo it, never a second full copy.
- Every page that tells a reader to get Claude Code or Paseo says an assistant that can work on their computer first.
- Each true limit is stated once, on the page that owns it, and linked from the README.

**Non-Goals:**

- Editing skill behaviour, `paseo.json`, the Paseo scripts, or `tools.md`'s optional pointer to Paseo.
- Re-checking or rewording the comparison table (`site/src/compare.ts`).
- New screenshots or pictures.
- The retrieval test fixtures under `scripts/tests/fixtures/`, which are frozen copies.

## Decisions

### 1. The README is the vision's home

Layout, top to bottom: badges; the vision (three short paragraphs and the three bullets, each bullet carrying one example request so the `open-source-release` promise holds); one paragraph in the first person ("I'm Matt. I run Claymoo…": built to run his company, his opinionated setup done once, change it to your way); *Start in three steps*; *What you get*, regrouped under Build, Remember, Get things done, plus the ownership and no-lock-in points; *What I use*; *Requirements*; *Learn more*; *License*.

- The heading `## Start in three steps` keeps its exact text: `wiki/stack/getting-started.md` and `wiki/development/required-tools.md` link `#start-in-three-steps` on GitHub.
- Step 1 becomes **Open your assistant**: any assistant that can read and change files and run commands on your computer. Step 2 becomes **Paste this into a new chat**. Step 3 is unchanged and still owns the two ways files are kept and the cost.
- A short **What I use** section names Claude Code in the Paseo app, with Codex as another that is set up, and states the two limits (a workspace per assistant needs Paseo; memory loads by itself in Claude Code and Codex), each linking its owning wiki page.
- *Requirements* opens "You bring an assistant and a Cloudflare account."
- The closing line of the vision ("GitHub is for engineers…") ends the opening block.

Alternative considered: a separate `wiki/vision.md` page. Rejected: the README is where a stranger lands, and a second page would be a second copy to keep in step.

### 2. The wiki pages

- `wiki/README.md`: the opening paragraph says what WongStack is in the vision's words (one place for your assistant to build, remember, and get things done), in two sentences, and keeps its link to getting started.
- `wiki/stack/getting-started.md`: the hand-done list's first two items become one: *Have an assistant that can work on your computer*, with Claude Code and Codex as examples after it. Paseo leaves the list; one sentence under the list says it is optional and links `required-tools.md`. "The first two happen before the chat exists" becomes "The first happens…". Renumber.
- `wiki/development/required-tools.md`: the paragraph headed **Paseo is where you chat.** becomes **Chat wherever your assistant runs.** It keeps every true statement already there (what you lose without Paseo, that setup never installs it) and drops the claim that the README's steps start in Paseo. The paragraph **With Paseo, WongStack sets two things.** stays.
- `wiki/maintaining/landing-page.md`: one added rule under *Change what it says about installing*: an assistant or chat app is named after the neutral wording, as an example or as what Matthew uses, and the headline names no other product.

Left alone, each already neutral or a true limit: `wiki/agent-knowledge-center.md` ("Claude Code is one way to run these"), `wiki/development/the-change-loop.md` (the Paseo workspace and its fallback), `wiki/development/memory.md`, `wiki/development/browsing.md`, `wiki/stack/mini-apps.md`, `wiki/stack/cloud-routines.md`, `wiki/maintaining/*`.

### 3. Setup and config (payload)

- `.agents/skills/wong-setup/references/cloudflare.md`, closing report: *"Next time, open <target> in Paseo to chat."* becomes *"Next time, open <target> in your assistant to chat."* The line after it (pairing a phone when `paseo` is present) stays. The replacement is no longer than the original, so the skills' text budget holds; `measure-context.mjs --check` confirms.
- `openspec/config.yaml`: "a stack-agnostic Claude Code workflow toolkit" becomes "a stack-agnostic workflow toolkit for AI assistants". `check-openspec-config.mjs` confirms it still parses.

### 4. The landing page

- **Headline.** `Rotator.tsx` and its CSS (`.rotator*`, the `Grok Lookalike` font face, and `public/fonts/geist-grok.woff2` if nothing else uses it) are removed. The hero's `h1` is plain text: **One place to build, collaborate, and get things done.** The lede under it keeps `DESCRIPTION` ("You own everything…"). The logos used only by the rotator stay if `compare.ts` uses them.
- **Shared-link text.** `site/index.html`'s description, `og:description`, `twitter:description`, and `og:image:alt` take the new line; `site/brand/share-image.svg`'s two text lines change and `site/public/share.png` is re-rendered from it by the SVG's own instructions (1200×630, under 300 KB).
- **Install step.** In `install.ts`, `STEPS` reads "Open any assistant that can work on your computer, such as Claude Code or Codex": the neutral words first, the links after. `InstallSteps` in `Landing.tsx` follows the new order.
- **Pictures.** A `note` line under the hero picture and in the phone tour: "These screens show Paseo, the chat app I use. WongStack works wherever your assistant works." Alt texts keep naming Paseo: they describe the picture.
- **Open source list.** Paseo's line becomes "The chat app I use, on phone and laptop. Optional."
- **Questions.** "What does it cost, with AI?" says each person uses their own AI plan, such as Claude or ChatGPT. "Will Anthropic ban my Claude account?" opens "If you use Claude:" and says WongStack works with the official, unmodified Claude Code. "How does my team use it?" is checked against the team row above and reworded only if it implies a teammate publishes to a project kept in Cloudflare.
- **The setup band** ("The hardest part is the setup. It's done.") stays: it is already his point.
- **Closing band.** Its lede gains the vision's last line: "GitHub is for engineers. This is the next one, for everyone else."
- The page still names no price and no plan (`Site.test.tsx`), so it says "accounts you own", not "one Cloudflare account".

Alternative considered: keep the moving headline with new words. Rejected: its whole idea was to borrow three other products' names.

### 5. Release

A `## Next (patch) — …` entry in `CHANGELOG.md`, in plain words, with **Updating.** "Nothing needs doing by hand." No name is retired: nothing an install reads is renamed.

## UX

### Use-case brief

A person who has heard of WongStack opens wongstack.com, most often on a phone from a shared link, once. The job: decide in a few seconds whether this is for them. Done is that they know what it is and press *Install for free*. The common case is someone who uses an assistant already and does not know Paseo; the edge case is someone comparing products, who scrolls to the table. Assumed: one visit per person, phone first. The screen mirrors today's hero; only the headline changes.

### Flow

Open the page → read one headline that says what WongStack is → read one line on ownership → press *Install for free* → the install steps. No new step, no new screen.

### Hierarchy

Hero: the headline is the largest text; *Install for free* is the one primary action; the GitHub link, the Supports row, and the note under the picture are quiet.

### Review

[review.html](review.html). The What Changes item "The landing page gets a new headline" sketches the hero before and after.

### Components

Existing only: the hero band, `InstallButton`, `Supports`, `PaseoShot`, and the `note` text style. Nothing new; `Rotator` is removed.

## Risks / Trade-offs

- [Pull request #291 edits the same lines] → This lands first. When #291 is brought up to date it keeps this wording for the README, the two wiki pages, and the landing page, and drops its own.
- [The vision's "one Cloudflare account" reads as the only way] → Step 3 of the README, directly below, still says the free route keeps files in GitHub and what the paid plan costs.
- [A promise of "several assistants at once" a reader cannot use] → The limit is stated in *What I use* and owned by `required-tools.md`.
- [The share picture drifts from its SVG] → Re-render in the same task and let `shareCard.test.ts` hold the text.
- [A wiki heading other pages link is renamed] → `check-payload-links.mjs` fails on a broken anchor; the tasks run it.
