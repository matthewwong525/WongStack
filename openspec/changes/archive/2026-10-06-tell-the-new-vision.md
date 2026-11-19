<!-- openspec-archive v1 2026-10-06-tell-the-new-vision -->
<!-- file proposal.md utf8 11637 -->
# The README and guides tell the new vision, and name no assistant as needed

**Status:** ready-to-ship

**Branch:** pleasant-dragonfly

**Open questions:** none

## Why

WongStack's front pages still describe an older idea of it, and they tell a newcomer to get Claude Code and Paseo first. Neither is needed: they are what Matthew uses, and WongStack works wherever an assistant works. A reader who uses something else is turned away at step one, and nobody is told the plain reason WongStack exists: the AI can write an app, but it has nowhere to put it.

## What Changes

- **The README opens with the start of the vision, in Matthew's words, and stops at the bullets.** AI is good enough for anyone to build their own apps; most people still can't, because nothing is set up for them. WongStack gives your assistant one place to build, remember, collaborate, and get things done. One line under the bullets says who he is and that he built it to run his clay-kit company.
  ```text
    BEFORE                 AFTER
  ┌───────────────────┐  ┌────────────────────┐
  │ My opinionated    │  │ +Anyone can build  │
  │ way of using AI.  │  │ +apps now. Nothing │
  │ Now yours.        │  │ +is set up for you.│
  │                   │  │ +One place to:     │
  │ What you get      │  │ + Build            │
  │  5 mixed points   │  │ + Remember         │
  │                   │  │ + Collaborate      │
  │                   │  │ + Get things done  │
  └───────────────────┘  └────────────────────┘
  ```
- **The first step no longer names a product you must get.** It says to open an assistant that can work on your computer, then names Claude Code and Paseo as what Matthew uses. The same goes for the list of what you need, the getting-started guide's list of things you do by hand, and the tools guide.
  ```text
    BEFORE                  AFTER
  1 Get Claude Code       1 +Open your assistant
    and Paseo               (I use Claude Code
  2 Open Paseo, paste       in Paseo)
  3 Answer questions      2 +Paste in a new chat
                          3 Answer questions
  ```
- **The pages say plainly what still needs one of them.** Giving each assistant its own workspace, so several can work at once, needs the free Paseo app today; without it the parts of a request are done one at a time. Memory that loads by itself at the start of a chat is set up for Claude Code and Codex today; another assistant reads the same files and looks memory up when asked. Nothing claims more than that.
- **The landing page gets a new headline: "One place to build, collaborate, and get things done."** It no longer opens with "Grok Bot, Muse, or Dots, but yours", and the text a shared link shows changes with it. The comparison table stays as it is.
  ```text
    BEFORE                 AFTER
  ┌───────────────────┐  ┌────────────────────┐
  │ Grok Bot ▲        │  │ +One place to      │
  │ but yours.        │  │ +build,            │
  │                   │  │ +collaborate, and  │
  │ You own it all... │  │ +get things done.  │
  │ [Install]         │  │ You own it all...  │
  │ Supports Claude…  │  │ [Install]          │
  │ ┌ app picture ──┐ │  │ ┌ app picture ───┐ │
  │ └───────────────┘ │  │ └ +what I use ───┘ │
  └───────────────────┘  └────────────────────┘
  ```
- **The landing page names Claude Code and Paseo only as examples.** Its install step puts "any assistant that can work on your computer" first. The phone and laptop pictures stay, with a line saying they show Paseo, the chat app Matthew uses. The question about Claude accounts stays, worded for people who use Claude.
- **Setup's last message stops sending you to Paseo.** When it installs into a new folder, it says to open that folder in your assistant next time.
- **Team wording stays true.** No page says that several people can publish to one project kept in Cloudflare; that is not built. Logins, keys, and who on a team can see and change what are described as taken care of, which they are.
- **The docs name no other assistant or product to compare or criticise.** The one existing comparison table on the landing page is the exception you chose to keep.

**Non-goals:** Changing how anything works: no code that uses Paseo or Claude Code changes, and nothing that needs Paseo today stops needing it (pull request #291 does that). Removing the landing page's comparison table or its pictures. The Cloudflare competition entry, which changes no file here. Old plans in the archive and the changelog's past entries, which stay as written.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `install-onboarding`: the README sends the person to any assistant that can work on their computer, not to Paseo; the walkthrough's hand-done steps no longer list Paseo; setup's closing report says to open the new folder in the person's assistant.
- `landing-site`: the page presents assistants and chat apps as examples with the neutral wording first, and its headline and shared-link text name no other product.

## Impact

- **`README.md`**: the opening, *Start in three steps*, *What you get*, *Requirements*. The fenced install message is unchanged, so the landing page's copy still matches. The heading *Start in three steps* keeps its exact text: two wiki pages link its anchor.
- **Wiki (payload)**: `wiki/stack/getting-started.md`, `wiki/development/required-tools.md`, `wiki/README.md`. `wiki/maintaining/landing-page.md` (meta-only) gains the rule that the page names assistants as examples.
- **Setup (payload)**: one line in `.agents/skills/wong-setup/references/cloudflare.md`; `openspec/config.yaml`'s context sentence.
- **Landing page (meta-only)**: `site/src/Landing.tsx`, `site/src/install.ts`, `site/src/Rotator.tsx` (removed), `site/src/index.css`, `site/index.html`, `site/brand/share-image.svg`, `site/public/share.png`, and their tests.
- **Release**: a `patch` changelog entry; nothing for an install to do by hand.
- **Overlap**: pull request #291 (`run-without-paseo`) edits the same README steps, wiki pages, and landing page words. This change lands first; #291 takes this wording when it is next brought up to date.

## Decision log

- **2026-10-06** — Asked where to do this work, given pull request #291 rewrites the same pages → chose to keep going here; #291 stays as it is.
- **2026-10-06** — Asked how far the landing page should change → chose a new headline in the vision's words and to keep the comparison table.
- **2026-10-06** — Assumed: the README carries the vision's sentence "one Cloudflare account that you own" as agreed, and its third step keeps saying that the free route keeps files in GitHub, because both are true and the step already owns the cost.
- **2026-10-06** — Assumed: the landing page says "accounts you own", not "one Cloudflare account", because the page lists GitHub and Cloudflare as the free accounts and may not name a price, and keeping files in Cloudflare needs its paid plan.
- **2026-10-06** — Assumed: the landing page's Paseo pictures stay, with a line saying they show the app Matthew uses, because they are real screens of his own setup and new pictures are a separate job.
- **2026-10-06** — Assumed: the comparison table's row "Uses your Claude or ChatGPT plan" stays as worded, because you chose to keep the table and each mark was checked against that wording.
- **2026-10-06** — Assumed: setup's optional line pointing to Paseo when it is missing stays, because it already says Paseo is optional and removing it belongs to pull request #291.
- **2026-10-06** — Assumed: the pages say automatic memory is set up for Claude Code and Codex today, because the files that load memory at the start of a chat exist only for those two, and the brief says not to claim otherwise.
- **2026-10-06** — Assumed: the principles page, the change loop, and the memory guide are left alone, because each already names these tools as one way or states a true limit.
- **2026-10-06** — Assumed: this is a `patch` release, because every shipped edit is wording.
- **2026-10-06** — Review note on the landing page's headline: "One place for AI to…" → the headline reads "One place for AI to build, remember, and get things done."; the README and guides keep the vision's word "assistant".
- **2026-10-06** — Built: the README no longer says setup ends with "the steps to connect your phone", because those steps appear only with Paseo; *What I use* says Paseo is how Matthew chats from his phone.
- **2026-10-06** — Built: the landing page's team answer is unchanged. It says everyone works in the same projects and shares one memory, and does not say a teammate publishes; a test now fails if an answer says so.
- **2026-10-06** — Built: the shared-link text reads "One place for AI to build, remember, and get things done, in accounts you own. Free and open source."; the share picture shows the headline on three lines over "In accounts you own."
- **2026-10-06** — Built: the page now loads no font file. The three lookalike fonts served only the moving headline, so `Site.test.tsx` asserts the styles load no file at all.
- **2026-10-06** — Built: task 2.7's search left no sentence telling a reader to get Claude Code or Paseo. Each remaining mention is a stated limit, an optional pointer, or a technical note on those two tools' own files.
- **2026-10-06** — Timing: the site's tests and build (5.3) ran once, after all writing was done, with the local checks (5.2). Task 5.4 waits for the saved preview.
- **2026-10-06** — Saved: everything is written and the checks on this computer pass; the two specs carry the new promises. The look at the saved landing page preview and the README on GitHub (task 5.4) is still to do.
- **2026-10-06** — After seeing the preview, Matthew wrote "Maybe remove for AI? And also change remember to collaborate" → the landing page's headline and shared-link text read "One place to build, collaborate, and get things done."
- **2026-10-06** — Assumed: only the landing page's headline changes; the README and guides keep Build, Remember, Get things done, because that is the vision as agreed and the note was made on the preview.
- **2026-10-06** — Matthew wrote "for readme we dont need the whole blurb just till the bullet points and maybe add an extra bullet on collaborating" → the README's opening ends at the bullets, with a fourth bullet, Collaborate; the lines on one Cloudflare account, several assistants, and "GitHub is for engineers" leave the README.
- **2026-10-06** — Assumed: one sentence naming Matthew and Claymoo stays under the bullets, because an existing promise says the README's first screen says whose way of using AI this is, through his real business.
- **2026-10-06** — Assumed: the Collaborate bullet says a team shares tools and memory and the owner chooses who sees and changes what, and says nothing about teammates publishing, because that is not built on a project kept in Cloudflare.
- **2026-10-06** — Archive checkpoint: built, looked at on the saved preview, and filed for publishing as 37.2.1.

<!-- end proposal.md -->
<!-- file design.md utf8 11732 -->
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

<!-- end design.md -->
<!-- file tasks.md utf8 5845 -->
# Tasks

The source text and the table of what is true today are in design.md - Context. Write every sentence in the wiki's voice (`wiki/voice.md`), and name no other assistant or product to compare or criticise.

## 1. README

- [x] 1.1 Rewrite the opening of `README.md` by design.md - Decision 1: the vision in Matthew's words and order, each of the three bullets with one example request, his first-person paragraph, and the closing line. Verify by reading it against the source text: nothing added that the text or his points do not say.
- [x] 1.2 Rewrite *Start in three steps*: step 1 **Open your assistant**, step 2 **Paste this into a new chat**, step 3 unchanged. Keep the heading text and the fenced message byte for byte. Verify `git diff README.md` shows no change inside the fenced block and the heading line.
- [x] 1.3 Regroup *What you get* under Build, Remember, Get things done, keeping the ownership and no-lock-in points and every existing link. Add *What I use* with the two limits, each linked to its owning page (`wiki/development/required-tools.md`, `wiki/development/memory.md`). Reword *Requirements* to "an assistant and a Cloudflare account". Verify no sentence says Claude Code or Paseo is needed, and none says several people can publish to a project kept in Cloudflare.
- [x] 1.4 Confirm the README still links `LICENSE`, `SECURITY.md`, and `wiki/agent-knowledge-center.md`, and still names Matthew and Claymoo on its first screen. Verify by reading.

## 2. Wiki and setup wording

- [x] 2.1 `wiki/README.md`: rewrite the opening paragraph by design.md - Decision 2, two sentences, link to getting started kept. Verify the first sentence still says what the page is.
- [x] 2.2 `wiki/stack/getting-started.md`: merge the first two hand-done steps into one neutral step, move Paseo to one optional sentence linking `../development/required-tools.md`, fix "The first two happen" and the numbering. Verify the list has six items and names no chat app.
- [x] 2.3 `wiki/development/required-tools.md`: retitle and rewrite the **Paseo is where you chat.** paragraph by design.md - Decision 2, keeping each true limit. Verify every limit in the old paragraph is still stated.
- [x] 2.4 `wiki/maintaining/landing-page.md`: add the examples rule under *Change what it says about installing*. Verify it links `site/src/install.ts`.
- [x] 2.5 `.agents/skills/wong-setup/references/cloudflare.md`: change the closing report's line to *"Next time, open <target> in your assistant to chat."* Verify the new line is no longer than the old one.
- [x] 2.6 `openspec/config.yaml`: change the context's first sentence by design.md - Decision 3. Verify the file's other lines are untouched.
- [x] 2.7 Search once more for pages that state either product as needed: `git grep -n -i -E "claude code|paseo" -- README.md wiki AGENTS.md SECURITY.md .github/CONTRIBUTING.md .agents/skills/wong-setup`. Fix any sentence that tells a reader to get one; leave true limits and optional mentions. Verify by listing each remaining hit with why it stays, in the Decision log if one is surprising.

## 3. Landing page

- [x] 3.1 Replace the moving headline: remove `site/src/Rotator.tsx`, its import and use in `Landing.tsx`, the `.rotator*` rules and the three `@font-face` blocks in `index.css`, and the three files in `site/public/fonts/` once nothing loads them. The hero's `h1` is the plain line from design.md - Decision 4. Verify `git grep -n -i "rotator\|but yours" site/src site/index.html` returns nothing outside `compare.ts` and `Compare.tsx`.
- [x] 3.2 `site/src/install.ts` and `InstallSteps` in `Landing.tsx`: the first step reads neutral words first, then Claude Code and Codex as linked examples. Update `install.test.ts` and the steps test in `Landing.test.tsx` to assert that order.
- [x] 3.3 `Landing.tsx`: the note under the hero picture and in the phone tour, Paseo's line in the open-source list, the two reworded answers, the team answer checked against design.md's table, and the closing band's added line. Update the matching assertions in `App.test.tsx` and `Landing.test.tsx`.
- [x] 3.4 `site/index.html`: the description, `og:description`, `twitter:description`, and `og:image:alt` take the new line. `site/brand/share-image.svg`: the two text lines change; re-render `site/public/share.png` by the SVG's opening comment. Update `shareCard.test.ts`'s `LINE` and alt text. Verify the PNG is 1200×630 and under 300 KB.
- [x] 3.5 Tests for the new promise, beside the source: in `App.test.tsx`, replace the rotator test with one that reads the `h1` and asserts it names none of the comparison table's products; in `Site.test.tsx`, update the heading it finds; add one assertion that the first install step's text begins with the neutral words. Keep the hosting-words test untouched.

## 4. Release

- [x] 4.1 Add `## Next (patch) — <Title>` at the top of `CHANGELOG.md`'s entries, in plain words: the README and guides tell what WongStack is for and name no assistant as needed. **Updating.** Nothing needs doing by hand. Leave `VERSION` alone.

## 5. Verification

- [x] 5.1 Run `openspec validate "tell-the-new-vision" --strict --no-interactive` and expect it valid.
- [x] 5.2 Run `node .github/scripts/checks.mjs --worktree` and repair what fails: it covers the payload links, the OpenSpec config, the skills' text budget, the wiki checks, and `scripts/tests/landing-site.test.mjs`.
- [x] 5.3 In `site/`, run `npm test` and `npm run build`; expect both to pass.
- [x] 5.4 After `/save`, open the landing page's own preview (the `landing-preview` status on the commit) at phone width and at desktop width: the headline fits without sideways scrolling, the note sits under each picture, and the first install step reads neutral words first. Open the README as GitHub renders it on the branch and read the first screen.

<!-- end tasks.md -->
<!-- file specs/install-onboarding/spec.md utf8 3941 -->
# Spec Delta

## MODIFIED Requirements

### Requirement: The README offers one prompt to paste

The README SHALL give one copyable prompt that names the WongStack GitHub repository, asks the agent to install it, and includes the raw address of `.agents/skills/wong-setup/SKILL.md` by its real path. The prompt SHALL name no target folder or folder to make first and SHALL work without a discovered setup slash command. The README SHALL send the person to an assistant that can work on their own computer as the place to paste it, with no terminal inside the chat and no cloud-container session. It SHALL name no assistant or chat app as needed: one it names SHALL come after that neutral wording, as an example or as what the maintainer uses. Where a feature works only with a named assistant or chat app today, the README SHALL say so. It SHALL say what they need first: a free GitHub account and a free Cloudflare account. Its steps SHALL end with opening the starter site and pasting its first message.

#### Scenario: A newcomer reads the README

- **WHEN** someone new to coding agents reads the install section
- **THEN** they find one prompt, an assistant of their own choosing to paste it in, and what they need first, with no step to make a folder

#### Scenario: The agent finds the runbook

- **WHEN** an agent receives only the copied prompt without a discovered setup skill
- **THEN** the message itself supplies the guide's raw address to read and follow

#### Scenario: A reader uses another assistant

- **WHEN** someone who uses neither Claude Code nor Paseo reads the install steps and the list of what they need
- **THEN** no step tells them to get either, and they can tell which features need one of them today

### Requirement: A plain walkthrough covers the whole path

The README SHALL carry the numbered install steps, and no other page SHALL repeat them. The payload's getting-started page SHALL link those steps and say what the README does not: what it costs, a numbered list of every manual step (having an assistant that can work on the computer, GitHub approval, tool installs, conditional Windows administrator approval, Cloudflare signup, the token), and what to do when something goes wrong. It SHALL NOT list a named assistant or chat app as a step. It SHALL say setup may install free tools after asking, and SHALL NOT imply a manual step is automated.

#### Scenario: Reading before starting

- **WHEN** a newcomer reads the walkthrough
- **THEN** they can tell what they must do themselves and which steps open a browser or a Windows permission prompt

#### Scenario: One copy of the steps

- **WHEN** the install steps change
- **THEN** only the README's steps need editing

### Requirement: Setup installs into an empty folder it finds or makes

`/wong-setup` SHALL install into the open folder when it is empty, or holds only a `.git` with no commits. A folder with an install record SHALL go to `/wong-sync`. Any other folder SHALL stay untouched: setup SHALL install instead into a new `wongstack` folder in the person's home folder, taking the next free numbered name when one exists with other files, and going to `/wong-sync` when one already holds WongStack. Setup SHALL make that folder without asking, only once it writes its first file, and SHALL say where it is and to open it in the person's assistant for later chats, naming no chat app. The install SHALL always take everything, with no component question.

#### Scenario: Empty folder

- **WHEN** a person runs setup in an empty folder with a Cloudflare token
- **THEN** setup installs everything there without asking which parts to take

#### Scenario: A folder with files

- **WHEN** setup runs in a folder with files and no install record
- **THEN** it writes nothing in that folder, installs into a new `wongstack` folder in the home folder, and its closing report names that folder and says to open it in their assistant next time

<!-- end specs/install-onboarding/spec.md -->
<!-- file specs/landing-site/spec.md utf8 987 -->
# Spec Delta

## ADDED Requirements

### Requirement: The landing page names assistants and chat apps as examples

The landing page SHALL NOT present any assistant or chat app as needed to install or use WongStack. Its install steps SHALL say an assistant that can work on the visitor's computer before naming one, and SHALL name one only as an example. A picture of a named chat app SHALL be said to show what the maintainer uses. The page's headline, and the text a shared link shows, SHALL say what WongStack is in its own words and SHALL name no other product.

#### Scenario: A visitor who uses another assistant reads the install steps

- **WHEN** a visitor reads the first install step
- **THEN** it says to open an assistant that can work on their computer, and any assistant it names comes after that, as an example

#### Scenario: A link to the page is shared

- **WHEN** the page's headline and its shared-link text are read
- **THEN** neither names another company's product

<!-- end specs/landing-site/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-10-06

~~~
<!-- end .openspec.yaml -->
<!-- file review.html utf8 46096 fence=~~~ -->
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
<title>Review · 2026-10-06-tell-the-new-vision</title>
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
<body data-change="2026-10-06-tell-the-new-vision">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-10-06-tell-the-new-vision</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. Saving a note copies all your notes. Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">WongStack's front pages still describe an older idea of it, and they tell a newcomer to get Claude Code and Paseo first. Neither is needed: they are what Matthew uses, and WongStack works wherever an assistant works. A reader who uses something else is turned away at step one, and nobody is told the plain reason WongStack exists: the AI can write an app, but it has nowhere to put it.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>The README opens with the start of the vision, in Matthew's words, and stops at the bullets.</b> AI is good enough for anyone to build their own apps; most people still can't, because nothing is set up for them. WongStack gives your assistant one place to build, remember, collaborate, and get things done. One line under the bullets says who he is and that he built it to run his clay-kit company.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-1-line-1" tabindex="0">  BEFORE                 AFTER</span>
<span class="ln" data-note="item-1-line-2" tabindex="0">┌───────────────────┐  ┌────────────────────┐</span>
<span class="ln" data-note="item-1-line-3" tabindex="0">│ My opinionated    │  │ +Anyone can build  │</span>
<span class="ln" data-note="item-1-line-4" tabindex="0">│ way of using AI.  │  │ +apps now. Nothing │</span>
<span class="ln" data-note="item-1-line-5" tabindex="0">│ Now yours.        │  │ +is set up for you.│</span>
<span class="ln" data-note="item-1-line-6" tabindex="0">│                   │  │ +One place to:     │</span>
<span class="ln" data-note="item-1-line-7" tabindex="0">│ What you get      │  │ + Build            │</span>
<span class="ln" data-note="item-1-line-8" tabindex="0">│  5 mixed points   │  │ + Remember         │</span>
<span class="ln" data-note="item-1-line-9" tabindex="0">│                   │  │ + Collaborate      │</span>
<span class="ln" data-note="item-1-line-10" tabindex="0">│                   │  │ + Get things done  │</span>
<span class="ln" data-note="item-1-line-11" tabindex="0">└───────────────────┘  └────────────────────┘</span></pre></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>The first step no longer names a product you must get.</b> It says to open an assistant that can work on your computer, then names Claude Code and Paseo as what Matthew uses. The same goes for the list of what you need, the getting-started guide's list of things you do by hand, and the tools guide.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-2-line-1" tabindex="0">  BEFORE                  AFTER</span>
<span class="ln" data-note="item-2-line-2" tabindex="0">1 Get Claude Code       1 +Open your assistant</span>
<span class="ln" data-note="item-2-line-3" tabindex="0">  and Paseo               (I use Claude Code</span>
<span class="ln" data-note="item-2-line-4" tabindex="0">2 Open Paseo, paste       in Paseo)</span>
<span class="ln" data-note="item-2-line-5" tabindex="0">3 Answer questions      2 +Paste in a new chat</span>
<span class="ln" data-note="item-2-line-6" tabindex="0">                        3 Answer questions</span></pre></div></details></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>The pages say plainly what still needs one of them.</b> Giving each assistant its own workspace, so several can work at once, needs the free Paseo app today; without it the parts of a request are done one at a time. Memory that loads by itself at the start of a chat is set up for Claude Code and Codex today; another assistant reads the same files and looks memory up when asked. Nothing claims more than that.</div></div></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>The landing page gets a new headline: &quot;One place to build, collaborate, and get things done.&quot;</b> It no longer opens with &quot;Grok Bot, Muse, or Dots, but yours&quot;, and the text a shared link shows changes with it. The comparison table stays as it is.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-4-line-1" tabindex="0">  BEFORE                 AFTER</span>
<span class="ln" data-note="item-4-line-2" tabindex="0">┌───────────────────┐  ┌────────────────────┐</span>
<span class="ln" data-note="item-4-line-3" tabindex="0">│ Grok Bot ▲        │  │ +One place to      │</span>
<span class="ln" data-note="item-4-line-4" tabindex="0">│ but yours.        │  │ +build,            │</span>
<span class="ln" data-note="item-4-line-5" tabindex="0">│                   │  │ +collaborate, and  │</span>
<span class="ln" data-note="item-4-line-6" tabindex="0">│ You own it all... │  │ +get things done.  │</span>
<span class="ln" data-note="item-4-line-7" tabindex="0">│ [Install]         │  │ You own it all...  │</span>
<span class="ln" data-note="item-4-line-8" tabindex="0">│ Supports Claude…  │  │ [Install]          │</span>
<span class="ln" data-note="item-4-line-9" tabindex="0">│ ┌ app picture ──┐ │  │ ┌ app picture ───┐ │</span>
<span class="ln" data-note="item-4-line-10" tabindex="0">│ └───────────────┘ │  │ └ +what I use ───┘ │</span>
<span class="ln" data-note="item-4-line-11" tabindex="0">└───────────────────┘  └────────────────────┘</span></pre></div></details></li>
<li class="item card" id="item-5"><span class="num">5</span><div class="body"><div class="text" data-note="item-5" tabindex="0"><b>The landing page names Claude Code and Paseo only as examples.</b> Its install step puts &quot;any assistant that can work on your computer&quot; first. The phone and laptop pictures stay, with a line saying they show Paseo, the chat app Matthew uses. The question about Claude accounts stays, worded for people who use Claude.</div></div></li>
<li class="item card" id="item-6"><span class="num">6</span><div class="body"><div class="text" data-note="item-6" tabindex="0"><b>Setup's last message stops sending you to Paseo.</b> When it installs into a new folder, it says to open that folder in your assistant next time.</div></div></li>
<li class="item card" id="item-7"><span class="num">7</span><div class="body"><div class="text" data-note="item-7" tabindex="0"><b>Team wording stays true.</b> No page says that several people can publish to one project kept in Cloudflare; that is not built. Logins, keys, and who on a team can see and change what are described as taken care of, which they are.</div></div></li>
<li class="item card" id="item-8"><span class="num">8</span><div class="body"><div class="text" data-note="item-8" tabindex="0"><b>The docs name no other assistant or product to compare or criticise.</b> The one existing comparison table on the landing page is the exception you chose to keep.</div></div></li>
</ol>
<p class="aside"><b>Non-goals:</b> Changing how anything works: no code that uses Paseo or Claude Code changes, and nothing that needs Paseo today stops needing it (pull request #291 does that). Removing the landing page's comparison table or its pictures. The Cloudflare competition entry, which changes no file here. Old plans in the archive and the changelog's past entries, which stay as written.</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-06</p>Asked where to do this work, given pull request #291 rewrites the same pages → chose to keep going here; #291 stays as it is.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-06</p>Asked how far the landing page should change → chose a new headline in the vision's words and to keep the comparison table.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-06</p>Assumed: the README carries the vision's sentence &quot;one Cloudflare account that you own&quot; as agreed, and its third step keeps saying that the free route keeps files in GitHub, because both are true and the step already owns the cost.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-06</p>Assumed: the landing page says &quot;accounts you own&quot;, not &quot;one Cloudflare account&quot;, because the page lists GitHub and Cloudflare as the free accounts and may not name a price, and keeping files in Cloudflare needs its paid plan.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-06</p>Assumed: the landing page's Paseo pictures stay, with a line saying they show the app Matthew uses, because they are real screens of his own setup and new pictures are a separate job.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-06</p>Assumed: the comparison table's row &quot;Uses your Claude or ChatGPT plan&quot; stays as worded, because you chose to keep the table and each mark was checked against that wording.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-06</p>Assumed: setup's optional line pointing to Paseo when it is missing stays, because it already says Paseo is optional and removing it belongs to pull request #291.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-06</p>Assumed: the pages say automatic memory is set up for Claude Code and Codex today, because the files that load memory at the start of a chat exist only for those two, and the brief says not to claim otherwise.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-06</p>Assumed: the principles page, the change loop, and the memory guide are left alone, because each already names these tools as one way or states a true limit.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-06</p>Assumed: this is a <code>patch</code> release, because every shipped edit is wording.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-06</p>Review note on the landing page's headline: &quot;One place for AI to…&quot; → the headline reads &quot;One place for AI to build, remember, and get things done.&quot;; the README and guides keep the vision's word &quot;assistant&quot;.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-06</p>Built: the README no longer says setup ends with &quot;the steps to connect your phone&quot;, because those steps appear only with Paseo; <i>What I use</i> says Paseo is how Matthew chats from his phone.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-06</p>Built: the landing page's team answer is unchanged. It says everyone works in the same projects and shares one memory, and does not say a teammate publishes; a test now fails if an answer says so.</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-06</p>Built: the shared-link text reads &quot;One place for AI to build, remember, and get things done, in accounts you own. Free and open source.&quot;; the share picture shows the headline on three lines over &quot;In accounts you own.&quot;</li>
<li class="decision card" id="decision-15" data-note="decision-15" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-06</p>Built: the page now loads no font file. The three lookalike fonts served only the moving headline, so <code>Site.test.tsx</code> asserts the styles load no file at all.</li>
<li class="decision card" id="decision-16" data-note="decision-16" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-06</p>Built: task 2.7's search left no sentence telling a reader to get Claude Code or Paseo. Each remaining mention is a stated limit, an optional pointer, or a technical note on those two tools' own files.</li>
<li class="decision card" id="decision-17" data-note="decision-17" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-06</p>Timing: the site's tests and build (5.3) ran once, after all writing was done, with the local checks (5.2). Task 5.4 waits for the saved preview.</li>
<li class="decision card" id="decision-18" data-note="decision-18" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-06</p>Saved: everything is written and the checks on this computer pass; the two specs carry the new promises. The look at the saved landing page preview and the README on GitHub (task 5.4) is still to do.</li>
<li class="decision card" id="decision-19" data-note="decision-19" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-06</p>After seeing the preview, Matthew wrote &quot;Maybe remove for AI? And also change remember to collaborate&quot; → the landing page's headline and shared-link text read &quot;One place to build, collaborate, and get things done.&quot;</li>
<li class="decision card" id="decision-20" data-note="decision-20" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-06</p>Assumed: only the landing page's headline changes; the README and guides keep Build, Remember, Get things done, because that is the vision as agreed and the note was made on the preview.</li>
<li class="decision card" id="decision-21" data-note="decision-21" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-06</p>Matthew wrote &quot;for readme we dont need the whole blurb just till the bullet points and maybe add an extra bullet on collaborating&quot; → the README's opening ends at the bullets, with a fourth bullet, Collaborate; the lines on one Cloudflare account, several assistants, and &quot;GitHub is for engineers&quot; leave the README.</li>
<li class="decision card" id="decision-22" data-note="decision-22" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-06</p>Assumed: one sentence naming Matthew and Claymoo stays under the bullets, because an existing promise says the README's first screen says whose way of using AI this is, through his real business.</li>
<li class="decision card" id="decision-23" data-note="decision-23" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-06</p>Assumed: the Collaborate bullet says a team shares tools and memory and the owner chooses who sees and changes what, and says nothing about teammates publishing, because that is not built on a project kept in Cloudflare.</li>
<li class="decision card" id="decision-24" data-note="decision-24" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-06</p>Archive checkpoint: built, looked at on the saved preview, and filed for publishing as 37.2.1.</li>
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
