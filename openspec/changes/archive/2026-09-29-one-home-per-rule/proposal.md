# Give each rule one home, so the docs stop disagreeing

**Status:** ready-to-ship
**Branch:** naive-catfish
**Open questions:** none

## Why

An audit on 2026-09-29 found the same rule written in several places, and the copies now say different things: what an install gets, whether the Cloudflare setup is optional, which commands save and publish, what to ask after a plan. An agent that reads the wrong copy does the wrong thing, and every copy has to be fixed by hand each time the rule changes. The record of what shipped has drifted the same way.

## What Changes

- **Each rule is written once and linked everywhere else.** Where a page repeats a rule, it now points to the one page that owns it, in a few words. The next edit to a rule then reaches everyone at once.
  ```text
       BEFORE                AFTER
  ┌──────────────┐     ┌──────────────┐
  │ page A: rule │     │ owner: rule  │
  │ page B: rule'│     └──────▲───────┘
  │ page C: rule"│      A ────┤
  │ page D: rule │      B ────┤
  └──────────────┘      C ────┘
   four copies drift    one copy, links
  ```
- **What an install gets is described once.** Three pages that listed it, each a bit wrong, now point to the one list. That list now also names the blank settings file every install gets.
- **The Cloudflare setup is no longer called optional.** Every install takes it; pages that said "if you took the stack" now just say what it does.
- **Which commands save and publish is stated once**, on the page about how work moves, and the others link it.
- **After a plan, one way to go on.** The closing question already offers *Build it now*, so the "type `/apply` to build it" line under the plan's link no longer shows beside it. It shows only after you pick *Review the plan*, where no question follows.
- **The question after a publish is listed once.** The publish step links it instead of keeping its own list; the same goes for the choices when a request splits into parts.
- **The record of what shipped matches what the tools do.** Pasted review notes that only ask a question get an answer, not a plan edit. A failed check of the preview pauses a publish. Plain words and link checks each get one owner, and the record names the rules file by its real name.
- **Small mismatches fixed.** A new server gets the same Node version everything else uses. The command list in the README gains `/verify`, and the knowledge-center page gains `/improve` and `/routine`. A few titles, counts, and a hard-coded version number now match the facts.

Non-goals: no new behavior beyond the one line after a plan; no page moves or merges (the "Reshape the wiki" part owns those); no code bugs (the "Real bugs" part).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `asking-the-user`: the plan link's next-step line appears only on the *Review the plan* reply; the plain-words requirement also owns short messages and when to name git, OpenSpec, or CI.
- `knowledge-center`: its plain-message requirement is removed; `asking-the-user` owns it.
- `ux-wireframes`: pasted notes change the plan only for notes that ask for a change.
- `staging-walkthrough`: `/verify` gates nothing on its own run; `delivery-gate` owns what a failed walk does inside `/ship`.
- `delivery-gate`: the gate doctrine's one summary line lives in `AGENTS.md`.
- `context-economy`: the meta-repo half and the measured start-up load name `AGENTS.md`.
- `payload-checks`: the one owner of link checks, fresh-install and GitHub cases included.
- `payload-layout`: its link requirement is removed; `payload-checks` owns it.
- `open-source-release`: its link requirement is removed; `payload-checks` owns it.

## Impact

- Payload prose: `AGENTS.md`, `wiki/development/{README,the-change-loop,required-tools,staging-walkthrough,adding-a-skill}.md`, `wiki/{contributing,agent-knowledge-center,ux-principles}.md`, `wiki/stack/{README,core-stack,d1-pipeline,mini-apps}.md`, `.agents/rules/payload.md`, `.agents/skills/{ship,save}/SKILL.md`, `.agents/skills/save/references/facts-save.md`, `.agents/skills/explore/references/asking-the-user.md`, `.agents/skills/plan/references/{new-workspace,openspec-cli}.md`, `.agents/skills/wong-sync/references/payload-manifest.md`.
- Config and scripts: `openspec/config.yaml`, `server/setup.sh`, `.agents/skills/plan/scripts/build-review.mjs` (comment only), `README.md`.
- Specs: the nine capabilities above, plus Purpose lines in `staging-walkthrough` and `context-economy`.
- Release: one `## Next (patch)` entry in `CHANGELOG.md`.
- Overlap: "Reshape the wiki" also edits `wiki/development/` and `wiki/stack/d1-pipeline.md`; whichever publishes second merges the other's edits.

## Decision log

- **2026-09-29** — Asked whether to keep the "type `/apply`" line beside a question that already offers *Build it now* → chose to show it only when no question follows (the *Review the plan* reply).
- **2026-09-29** — Assumed: all ten audit findings from the 2026-09-29 `/explore` are in scope, each by its suggested fix, because the user settled that before this plan.
- **2026-09-29** — Assumed: `server/README.md` needs no Node edit, because a recheck against main found it no longer names Node 24; only `server/setup.sh` does.
- **2026-09-29** — Assumed: `server/setup.sh` moves to Node 22, not `.nvmrc` to 24, because CI, `.nvmrc`, `@types/node`, and setup's own version check all read 22.
- **2026-09-29** — Assumed: `ship/SKILL.md`'s "never … delete a local branch" stays, because it is scoped to recovering a merge conflict and does not contradict `/close` deleting a branch after its merge.
- **2026-09-29** — Assumed: `payload.md`'s git-owner line is now at line 42, not 79, and `the-change-loop.md`'s Status list near line 126; the fixes target the text, not the old line numbers.
- **2026-09-29** — Assumed: `required-tools.md` lists `curl` as a fifth required command, because setup's provisioning and `/verify`'s probes need it; saying "four" hides it.
- **2026-09-29** — Assumed: the wiki's staging-walkthrough line "None of them gates anything" gets the same fix as its spec, because it states the same rule.
- **2026-09-29** — Assumed: the plain-words overlap is resolved by removing the `knowledge-center` requirement and folding its unique parts (short messages, when to name git) into `asking-the-user`, because that spec already owns reports and plain words.
- **2026-09-29** — Assumed: Purpose lines, which a delta cannot change, are edited directly in `openspec/specs/`, because `/save` reconciles main specs on the branch anyway.
- **2026-09-29** — Assumed: a patch release, because the only behavior change is one line of chat after a plan.
- **2026-09-29** — Assumed: the plan's "run `/save`" task is dropped, because `/ship`'s own checkpoint runs CI after the archive.
- **2026-09-29** — Assumed: `verify/SKILL.md`'s "stack-pack repos:" tag and the walkthrough page's opening "It gates nothing" get the same fixes, because the build found them saying what the change removes elsewhere.
- **2026-09-29** — Assumed: archived and checkpointed by `/ship` as 27.1.1, after merging main's 27.1.0 release; the build tasks all passed the payload link, config, retired-name, and context-size checks.
- **2026-09-29** — Assumed: after "Reshape the wiki" shipped as 27.1.1 first, this release is renumbered 27.1.2; its payload paragraph moved to `wiki/maintaining/README.md`, so the "manifest lists what ships" fix went there, and the development hub keeps main's new opening.
