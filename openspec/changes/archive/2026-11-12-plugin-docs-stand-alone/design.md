# Design

## Context

A module installs alone: `install-path.mjs` copies `.agents/plugins/<name>/` to `.agents/skills/…` and repoints each relative link by its new place. A link into `wiki/` stays relative, so in a project without WongStack's wiki it leads nowhere. Today (from the `main` this plan read):

| Module | Relative links out of the module |
|---|---|
| loop | 81: 65 into `wiki/`, the rest to other modules and to `.agents/loop/worktree-secrets.mjs` and `.agents/skills/agent-browser/` |
| memory | 13: 12 into `wiki/`, 1 to loop |
| daily | 9: 7 into `wiki/`, 2 to loop |
| browser, access | none; they already link WongStack's wiki by `https://github.com/matthewwong525/WongStack/blob/main/…` |

Code comments that name a `wiki/` path are not links and stay out of scope.

This part builds on two others: "Build loop without memory" (loop without memory, `/save` hidden, `/continue` removed) and "Same shape for browser and daily" (browser, Daily, Access reshape and links between modules). The build starts from both as published, and applies the treatment below to each link as it then stands.

## Goals / Non-Goals

**Goals:** no relative link leaves a module; each rule a module needs lives in it once; WongStack's wiki points down; a test keeps it so.

**Non-Goals:** links between modules (owned by the other part; see the fallback under Decisions); comments in code; any change to what a step does.

## Decisions

### Four treatments, chosen by what the link is for

1. **Move** — the step needs the rule to act. The section's rule text moves into the module; the wiki keeps the heading with one line pointing down, plus any WongStack-only lines that were in it.
2. **Inline** — the step needs one sentence. Write it in place; drop the link.
3. **Web address** — the page is WongStack-only, or long detail used on a rare path. Link `https://github.com/matthewwong525/WongStack/blob/main/<path>#<anchor>`, by [repo layout](../../../wiki/maintaining/repo-layout.md#linking) (real `.agents/` path, never `.claude/`).
4. **Drop** — the link only explains why, for a person. Remove it; the wiki page already links the skill.

### The map

| Target | Treatment | Lands in |
|---|---|---|
| `the-change-loop.md`: bare page, `#what-each-step-may-change`, `#fix-it-or-ask`, `#inside-ship`, `#apply-never-saves-…`, `#verbs-for-any-work`, `#the-gate` (route-neutral part), `#the-change-is-a-living-handoff-…`, `#where-the-plan-and-record-live`, `#several-parts-several-workspaces`, `#offer-a-routine-or-an-app` | Move | `.agents/plugins/loop/references/rules.md`, one heading each, same heading text so anchors carry over |
| `the-change-loop.md#a-loosened-check-needs-a-reason` | Web address | WongStack's `loosened-checks.mjs` is its own CI |
| `review-pages.md`: bare, `#a-card-shows-the-closest-real-result`, `#what-the-build-needs`, `#the-card-view`, `#the-page-card`, `#the-live-card`, `#files`, `#a-website-prototype` | Move | `.agents/plugins/loop/skills/plan/references/review-page.md` |
| `prototypes.md`, `#an-app-the-preview-cant-serve` | Move | `.agents/plugins/loop/skills/plan/references/prototypes.md` |
| `ux-principles.md#the-review-file`, `#the--ux-section-in-designmd` | Move | `plan/references/review-page.md` (review file) and `plan/references/drawings.md` or the plan skill (UX section), whichever is shorter |
| `agent-knowledge-center.md#most-process-improvements-shouldnt-use-ai` | Inline | `/plan`: fixed steps get a script, not AI |
| `wiki-style.md#people`, `#keeping-it-tidy` | Inline | `asking-the-user.md`; `dream-memory/SKILL.md` |
| `wiki-dream.md#placing-a-fact-on-a-page` | Move | `.agents/plugins/memory/skills/dream-memory/references/placing-facts.md`; `/close` inlines a two-line generic version, since loop must not need memory |
| `wiki-dream.md` bare, `#the-daily-tidy` | Drop, or a link inside memory to `dream-memory/SKILL.md` | — |
| `memory.md#who-sees-what`, bare | Move | `.agents/plugins/memory/README.md`, new `## Who sees what`; WongStack's Access-role line stays on the wiki |
| `daily.md#your-settings-file`, bare | Move | `.agents/plugins/daily/daily/README.md`, new `## Your settings` |
| `daily.md#the-chief-of-staff`, `staging-walkthrough.md` (all four) | Drop | — |
| `artifacts-route.md`, `employee-project.md`, `cloudflare-access.md`, `cloudflare-credentials.md`, `mini-apps.md`, `company-knowledge.md`, `company-api.md`, `legacy-cloud-schedules.md`, `required-tools.md`, `reply-links.md`, `secrets.md` (all), `kept-checks.md`, `testing.md#who-checks-what`, `document-retrieval.md`, `learning-from-chats.md` | Web address | — |
| `.agents/loop/worktree-secrets.mjs`, `.agents/skills/agent-browser/SKILL.md` | Web address | WongStack's own files outside the module |

The builder may adjust a row when the text it finds argues otherwise (a "why" link that turns out to carry a rule moves instead), and logs each such change as an `Assumed` line.

### Moved text is written as rules, not copied

A moved section is cut to the rules a step acts on (a rule before words, by [adding a skill](../../../wiki/maintaining/adding-a-skill.md)), and the wiki keeps the person-facing why. One topic, one page: the rule lives only in the module; the wiki heading says what it is in one line and links down.

### Links between modules: fallback only

The "Same shape for browser and daily" part owns them. The new test checks every relative link out of a module, so any still present when this builds (such as loop → memory or Daily → loop) takes a web address here, and that part catches up if it publishes later.

### The test

`scripts/tests/module-install.test.mjs` gains `<name>'s docs link nothing outside its own folder`, beside the import test: for each Markdown file in the module's source folders (Daily's two and the browser's three count as one module), every relative link and reference-style link, anchor stripped, must resolve inside the module. `http(s):`, `mailto:`, and `#` links pass. It prints `file → link` for each failure. `wiki/maintaining/adding-a-module.md`'s *What it may reach* gets the rule and names the test.

## Risks / Trade-offs

- **The skill-size check.** Text moved into a counted skill folder (`plan/references/`, `dream-memory/references/`) raises the instruction total; about 500 words of headroom remain. Loop-wide rules go in `loop/references/`, and moved text is cut to rules. If `measure-context.mjs --check` still fails, offset by trimming the skills' own lines; never raise the baseline without asking.
- **Overlap with the other two parts.** All three edit loop, memory, and Daily skill files. This part builds last; a conflict resolves toward the other part's shape, then the treatment here.
- **Old anchors.** Every moved heading stays on its wiki page; `check-payload-links.mjs` catches a lost one.
- **A web address points at `main`.** It shows WongStack's latest text, not the installed version. Acceptable for WongStack-only steps.
