# The README leads with how Matt uses AI

**Status:** in-progress
**Branch:** assess-wongstack-market
**Open questions:** none

## Why

WongStack is for business owners who want AI working across their whole business. The README still pitches a personal helper that finds cafés and plans your week, so a visitor can't tell who it's for. The new landing page leads with a real business, Claymoo. The README should tell the same story, so both say one thing.

## What Changes

- **The README opens with Matt's way of using AI.** The first screen says this is Matt's opinionated way of using AI, for Matt's business and for everything else, and now it's yours. Claymoo, Matt's clay-kit company, is the proof. The example asks come mostly from the business: timing packed orders, profit by sales channel, and design briefs for ads. A daily routine, a team memory, and planning your week come next. The café and bill-splitter examples go.
  ```text
  Before                 After
  ─────────────────────  ─────────────────────
  Your own AI assistant  My opinionated way
  that remembers you     of using AI. Now
                         yours. (I run
                         Claymoo.)
  What you can ask       What you can ask
   · quiet cafés          · time packed orders
   · plan my week         · profit by channel
   · bill splitter        · ad briefs
   · a 9am list           · a 9am list
   · short answers        · a team memory
                          · plan my week
  Start in three steps   Start in three steps
  ```
- **"What you get" speaks to a business and its team.** It keeps the same points: memory, apps, your own site, the notebook, your home base, and no lock-in. The wording now talks about tools that fit your business and one memory the whole team shares. The setup steps and the whole "For developers" part stay as they are.
- **Your company name can appear in public files.** A check keeps private project names out of the public repo, and it also blocks the word "Claymoo". It will now block only the private project names, so the README can name your company.
- **The agent's short description of this repo matches.** The first line agents read here says "business owner and their team" instead of "personal AI assistant".

Non-goals: no new page, since owners chat with the assistant and never read the repo; no change to the setup steps, the wiki, or the starter app; no link to the hosted service while it is private.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `open-source-release`: *The README speaks to a non-technical reader first* becomes *The README speaks to a business owner first*, with one real business as the example. *No secret or private name is published* gains scenarios saying that a company name is allowed and a private repository's name is not.

## Impact

- `README.md`: the title block, "What you can ask", and "What you get" are rewritten. "Start in three steps", "Where you chat", "For developers", "Learn more", and "License" are unchanged.
- `scripts/tests/private-names.test.mjs`: `PRIVATE` narrows from `claymoo` to `claymooapp`, and the sample set gains an allowed company-name line.
- `AGENTS.md`: the meta-only "What this is" paragraph, above the `WONG-STACK` block. The block itself is unchanged, so installed repos see no difference.
- `CHANGELOG.md`: a `## Next (patch)` entry, because `scripts/**` and `AGENTS.md` are payload paths. `VERSION` is left alone.

## Decision log

- **2026-09-27** — Asked what the README's first screen should lead with → chose the Claymoo story, matching the new landing page.
- **2026-09-27** — Asked whether installs should get a "What you can ask" page → declined: owners only chat with the assistant and see the landing page, so a page in the repo is never read.
- **2026-09-27** — Assumed: the audience is business owners who want AI across their whole business, because the user said so and pointed to the landing page change.
- **2026-09-27** — Assumed: the private-names check narrows to `claymooapp` instead of exempting the README, because the rule protects private repositories and services; the company is public on the landing page, and one list with no per-file exceptions stays simple.
- **2026-09-27** — Assumed: the README doesn't mention or link the hosted service, because its repository is private, and naming it would fail the same check.
- **2026-09-27** — Assumed: the wiki's first page, the `WONG-STACK` block, and the setup's closing message stay as they are, because they ship to every install, and a person's home repo is not a business.
- **2026-09-27** — Assumed: the example asks reuse the landing page's three apps, because one story told the same way in both places is the point.
- **2026-09-27** — Assumed: a patch release, because installs see no change; only the source's own check and description move.
- **2026-09-27** — Assumed: the allowed company-name sample in the matcher test uses its own path, `wiki/company.md`, because sharing `README.md` with a flagged sample would let the test pass even if the company name were flagged.
- **2026-09-27** — Built: the README leads with Claymoo per the copy table, the matcher narrows to `claymooapp`, `AGENTS.md`'s "What this is" line changes, and the changelog has its patch entry. Local checks pass; CI (task 3.2) is next.
- **2026-09-27** — Saved: merged main's 26.10.0–26.11.0 (changelog conflict resolved with this entry on top) and reconciled the `open-source-release` delta. The live spec's new scenario says "a private repository or service" rather than naming them, because naming them failed the private-name check.
- **2026-09-27** — CI passed on PR #170 (task 3.2); every task is done.
- **2026-09-27** — Asked at the publish question → the user said the lead should be wider than running Claymoo: it is how Matt uses AI in general, his opinionated way of doing it. The lead line now says so with Claymoo as the proof, a sixth ask (planning the week) shows the non-business side, and the spec says whose way it is.
