# Each plugin's guide stands on its own, with no broken links

**Status:** in-progress
**Branch:** paltry-hound
**Open questions:** none

## Why

The build loop, memory, and Daily can each go into another project alone. But their instructions link to WongStack's own guide pages by a short path. Those pages are not in the other project, so the links there lead nowhere. The assistant then misses the rule it was sent to read. A plugin should carry what it needs to work, and WongStack's guide should point down to the plugin, not the other way.

## What Changes

- **What a plugin needs to do its job moves into the plugin.** Rules a step follows, such as what each step may change, when to fix and when to ask, and how a plan page shows each kind of card, move from WongStack's guide into the plugin's own pages. WongStack's guide keeps each heading as a short line that points down to the plugin, so no older link breaks.
  ```text
  before
    plan step ──▶ WongStack guide
                  (missing elsewhere)
  after
    plan step ───────▶ loop's own page
    WongStack guide ─▶ loop's own page
  ```

- **One-sentence rules go in the step itself.** Where a step linked a whole page for one rule, such as "use a script, not AI, for fixed steps", the rule is written in place and the link goes.

- **WongStack-only steps keep a full web address.** A few steps apply only inside WongStack: the Artifacts save route, a teammate saving through the app, Cloudflare sign-in for previews, mini apps, company pages, and old cloud schedules. They link their page by its full GitHub address, as the browser and Access plugins already do. That link opens from any project.

- **Links that only explain why go.** A link that gave a person background, such as why the preview check works the way it does, is removed from the plugin. The assistant does not need it to act, and the WongStack guide still explains it.

- **A test keeps it fixed.** The test that puts each plugin alone in an empty project now also fails on a link that leaves the plugin's own folder by a short path. A web address passes.
  ```mermaid
  flowchart TD
    T[Plugin alone in an empty project] --> L{Short-path link out?}
    L -->|yes| F[Fails, names the link]
    L -->|no| P[Passes]
  ```

Non-goals: links between plugins (the "Same shape for browser and daily" part owns those); notes inside code files; what each plugin does.

## What the build needs

- **Nothing from you.** The build checks itself by putting each plugin alone in an empty project.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `payload-layout`: adds the requirement that a module's Markdown links nothing outside its own folder by a relative path; WongStack's wiki links down to the module.

## Impact

- Skill and reference Markdown under `.agents/plugins/{loop,memory,daily}/`; new references in `.agents/plugins/loop/references/`, `.agents/plugins/loop/skills/plan/references/`, and `.agents/plugins/memory/skills/dream-memory/references/`; memory's and Daily's READMEs.
- Wiki pages that lose moved sections to a pointer: `wiki/development/the-change-loop.md`, `wiki/review-pages.md`, `wiki/prototypes.md`, `wiki/ux-principles.md`, `wiki/development/wiki-dream.md`, `wiki/development/memory.md`, `wiki/development/daily.md`; the module rules in `wiki/maintaining/adding-a-module.md`.
- `scripts/tests/module-install.test.mjs` gains a link test.
- `AGENTS.md` and other wiki pages that link a moved section, where the pointer is not enough.
- Module versions rise for loop, memory, and Daily; a `patch` CHANGELOG entry.
- `scripts/measure-context.mjs`: moved text in skill folders counts toward the instruction total; it must fit the baseline.

## Decision log

- **2026-11-12** — Asked how a plugin should point to a WongStack-only page (Artifacts route, a teammate's save through the app, Cloudflare sign-in, mini apps, company pages, old cloud schedules) → chose a full web address, as browser and Access already do.
- **2026-11-12** — Assumed: a moved section keeps its heading on the wiki page as a one-line pointer down, because installs' own pages link those headings and the payload link check fails on a lost anchor.
- **2026-11-12** — Assumed: a link that gives only the why (staging walkthrough, chief of staff, the daily tidy) is removed, not moved, because the step does not need it to act and the wiki page already links down to the skill.
- **2026-11-12** — Assumed: long detail pages a skill needs only on a rare path, such as recall's scopes and the chat-reading setup, use a web address, not a move, because moving them grows the skill text past its size check for little gain.
- **2026-11-12** — Assumed: secrets, kept checks, reply links, required tools, and WongStack's own scripts outside the module (`worktree-secrets.mjs`, the vendored `agent-browser`) count as WongStack-only and take a web address, because the module reaches them only through WongStack's profile.
- **2026-11-12** — Assumed: the new test checks every relative link out of a module, links to other modules included; any such link still there when this builds takes a web address, because this part builds on the "Same shape for browser and daily" part, which owns cross-links.
- **2026-11-12** — Assumed: the build starts from both other parts as published; a skill file they removed or reshaped (such as `/continue`) takes the same treatment as it stands then, because this part builds on both.
- **2026-11-12** — Assumed: Access and the browser need no edit here, because they already link WongStack's wiki only by web address.
- **2026-11-12** — Assumed: a `patch` release, because no behavior changes, only where the text lives.
- **2026-11-12** — Assumed: the link survey, rerun on the current tree, found the planned 103 links (loop 81, memory 13, Daily 9); `main` had nothing new, so the build worked from it.
- **2026-11-12** — Assumed: the review page's card view, live card, page card, and files sections stay on the wiki, and the drawing guide links them no more, because they describe what the person sees and the builder already stops on each limit; the plan's own page keeps one line for each where a step needs it.
- **2026-11-12** — Assumed: moved text is cut hard so the skills' instruction total still fits its baseline, with no baseline change; the change leaves 6 words of headroom, so a later part that adds skill text must cut its own lines.
- **2026-11-12** — Assumed: why-only links to required tools (`/save`'s preconditions), the Artifacts route (`/apply`'s boundaries), and the staging walkthrough (`/verify`) are dropped, not given a web address, because the step acts without them.
- **2026-11-12** — Assumed: the chat-name paragraph and the scratch-file tidy stay on the change-loop wiki page, because both run through WongStack's own profile and scripts.
- **2026-11-12** — Assumed: links between modules (loop to memory, the browser, and Daily; Daily and memory to loop) take a web address, by the design's fallback, until the "Same shape for browser and daily" part reshapes them.
- **2026-11-12** — Assumed: task 7.3's full local check runs in /ship's prepare after `main` comes in, because before the merge it failed only on browser's version (raised on `main` by #579 and #580, a folder this change does not touch), and another chat held the check lock.
