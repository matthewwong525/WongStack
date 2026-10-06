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
