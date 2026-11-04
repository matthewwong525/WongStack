# Connect your tools after install

**Status:** built
**Branch:** powerful-hippo
**Open questions:** none

## Why

When someone installs WongStack, usually the owner, setup ends with a report and the *Make it yours* request. Nothing helps them connect the tools they already work with, like Stripe, Notion or Figma. To connect one today, they must know to ask for a key, and the assistant must add the tool to the app. This must be easy and step by step: right after install, and later, when they say *connect my Figma*.

## What Changes

1. **Install goes straight on to connecting your tools.** After setup's closing report, the same chat asks which tools you use for your work. When your tools are connected, or you say *skip*, it gives the usual last step: open your site and paste the *Make it yours* request. Your first app can then use the tools you connected.
   ```text
   Your site is live: https://recipe-box.ana.workers.dev
   ...
   Next, let's connect the tools you work with,
   so I can use them for you. Which tools do you
   use? For example: Stripe, Notion, Shopify,
   Gmail. Say "skip" to do it later.
   ```
2. **A helper sorts each tool and does the right thing for it.** It puts each tool in one of three groups. A tool the app can already use gets one harmless look-up, so you see it work. A tool the app doesn't know yet gets added (item 3): you get its key in your own browser and give it through one private link, and the assistant stores it in your company app. A website with no API, or your own mail, is marked *not connected yet*: for now, the helper gives steps only, and does not use its own browser or send a password link. It ends with a short list.
   ```text
   Your tools
     ✓ Stripe     works: 3 charges today
     ✓ Notion     works: found 12 pages
     ✓ Figma      works: 4 files
     – Gmail      not connected yet: use it yourself
   ```
3. **The helper works out how to add each new tool.** Most tools will be new to the app, so this is the main job. For each one, the assistant reads the tool's own developer pages and finds how the app can reach it: a key you make on the tool's site, or the tool's own AI connector that takes a key. It writes down what it found on a notes page, so the next chat doesn't need to find it again. A tool that only lets you sign in with your account, with no key, is *not connected yet*, and the list says why. Then one private link takes every key, with steps for each tool. The assistant makes one change that adds all the new tools to the app, and asks *publish it?* once, with no plan page to review. When the change is live, it stores the keys in the app and shows each tool working.
   ```mermaid
   flowchart TD
     tools[your tools] --> how[work out how]
     how --> link[one key link]
     link --> change[one change adds them]
     change --> yes{"publish it?"}
     yes --> keys[keys go to the app]
     keys --> look[a look-up for each]
   ```
4. **A teammate gets a message for the owner.** A teammate can also say *connect my Figma*. Their computer can't store a key in the app, so the helper writes a short message they send to the owner. The owner says *connect Figma for Ana*, which runs the same steps. It then reminds the owner to give Ana a level on Access, because only the owner or an admin can do that.
   ```text
   Send this to Matthew (owner):
     Hi Matthew, please connect Figma to the
     company app and give me Read on it in
     Access. Say "connect Figma for Ana" to
     your assistant.
   ```
5. **One wiki page explains it.** A new page, *Connect your tools*, gives the three groups and what the helper does for each. The getting-started page, the API keys page and the services list link to it.

**Non-goals:** signing in to websites in the assistant's browser, or sending a password link (steps only for now); a key kept only on a teammate's computer; a teammate storing a key in the app; the assistant changing Access; a plan page for adding a tool; teammates' first-day lessons (the separate *first-day-lessons* part).

## What the build needs

- **Nothing.**

## Capabilities

### New Capabilities
- `connect-tools`: the `connect` skill: how a person starts it, how it sorts each tool, what it does and never does for each group, the owner's one-yes path for new tools, and a teammate's message.

### Modified Capabilities
- `install-onboarding`: after its closing report, setup goes on to connecting the owner's tools before the *Make it yours* step.
- `change-loop`: a small change whose shape a skill's own page fixes, such as adding a new tool while connecting tools, is recorded and built on the person's request and stops only at *publish it?*, with no plan review link.
- `asking-the-user`: the same exception to *a request goes straight to a plan*.

## Impact

- New `.agents/skills/connect/SKILL.md`; `.agents/skills/wong-sync/references/payload-files.json` (`core.skillDirs`); possibly a shorter `description` in another `SKILL.md` to keep the start-up budget.
- `.agents/skills/wong-setup/references/cloudflare.md` (Step 5, the closing report) and `.agents/skills/wong-setup/SKILL.md`: go on to `connect` after the report.
- New `wiki/stack/connect-your-tools.md`; links from `wiki/stack/README.md`, `wiki/stack/getting-started.md`, `wiki/stack/api-keys.md` and `wiki/stack/service-catalogue.md`.
- `openspec/specs/install-onboarding/spec.md`, `openspec/specs/change-loop/spec.md`, `openspec/specs/asking-the-user/spec.md`, new `openspec/specs/connect-tools/spec.md`, `.agents/skills/memory/references/areas.json`.
- `CHANGELOG.md`: a `## Next (minor)` entry.
- `wiki/development/the-change-loop.md` (*Just ask*): one exception sentence for a skill whose own page fixes a small change's shape.
- No overlap with `first-day-lessons`: this change no longer touches teammate setup's `summary()`.

## Decision log

- **2026-11-04** — Asked whether the helper signs the person in to sites with no key in its own browser, or gives steps only → chose steps only for now, because Matthew is not yet confident in the browser.
- **2026-11-04** — Asked who this is for → chose the person who installs WongStack, usually the owner, right after install; not a teammate after their setup. Matthew's review note; it replaces the earlier choice that a teammate saves the change that adds a tool.
- **2026-11-04** — Asked when connecting happens for the owner → chose right after install: the setup chat goes on after its closing report, then gives the *Make it yours* step.
- **2026-11-04** — Asked how much the owner sees when a new tool needs a change to the app → chose one yes and no plan page: one key link, one change for every new tool, one *publish it?*.
- **2026-11-04** — Asked how often a tool is new to the app → Matthew said most tools will be, so the helper must work out how to add each: the tool's developer pages, a fixed key first, else the tool's own AI connector that takes a key, else *not connected yet*; what it learns goes on the tool's notes page.
- **2026-11-04** — Assumed: the computer can store keys in the app when its `.env` holds the Cloudflare token, as setup leaves it on the owner's computer; any other computer takes the teammate path, because storing a key needs that token.
- **2026-11-04** — Assumed: a teammate gets a message only, and the owner runs *connect <tool> for <name>*, because the owner's helper then does the whole job in one go, and only the owner or an Admin can give a level on Access.
- **2026-11-04** — Assumed: no new status script, because steps only removes the saved-logins half, and `company-api.mjs services --all` already gives each key's state.
- **2026-11-04** — Assumed: a website with no API is only marked *not connected yet*, with no steps to save a password, because steps only means no password link and no browser.
- **2026-11-04** — Assumed: the skill is `connect`, model-invoked with a short description, so *connect my Figma* finds it in any later chat; the steps live on a wiki page so the skill stays short.
- **2026-11-04** — Assumed: teammates' setup report is unchanged, because this part is for the owner; a teammate can still ask *connect my Figma* at any time.
- **2026-11-04** — Assumed: `wong-setup/SKILL.md` gets no clause, because its last paragraph already sends the install to Step 5's report, which now goes on to `connect`; the payload manifest lists no skill names, so only `payload-files.json` names the new skill.
- **2026-11-04** — Assumed: `connect` is `user-invocable: false`, like `daily`, because a person asks in plain words and is never told a slash command.
- **2026-11-04** — Assumed: the connect helper records its change through the OpenSpec CLI, not `/plan`, and the change loop's *Just ask* gets one exception sentence for a skill whose own page fixes a small change's shape, because `/plan` asks exit-round questions and ends on a review page, which Matthew's one-yes choice rules out.
- **2026-11-04** — Assumed: a new tool whose key does not come through the key link stays in the change, its line says *waiting for your key*, and the next run sends only its link, because the dry run (task 4.3) found the page gave no line for that case, and a saved entry with no key already takes the *in the list, not saved* row.
- **2026-11-04** — Assumed: shortened the `update-dependencies` and `connect` descriptions, because `lesson` (48.1.0) reached `main` first and left 8 start-up words, fewer than the new description needs.
