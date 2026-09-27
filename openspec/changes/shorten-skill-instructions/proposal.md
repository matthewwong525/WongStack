# Shorter instructions for the assistant

**Status:** in-progress
**Branch:** shorten-skill-instructions
**Open questions:** none

## Why

The assistant reads its instructions for a task before it does the task. They have grown to about 29,000 words: 13,500 in the main instruction pages and 15,700 in the pages they point to. Much of that is the same rule written in several places, reasons already explained in the wiki, and extra examples. Every word costs time and money on every task, and a rule written twice can drift apart. You queued this on 2026-09-27, right after the dependency update.

## What Changes

- **The same rules, in fewer words.** Every instruction page is rewritten in the plain, short style the wiki already uses. Nothing the assistant does changes: every rule, command, and check stays.
  ```text
  before                 after
  13,476 words (main)    10,202 (−24%)
  18,286 (linked pages)  15,693 (−14%)
  ```
- **A rule lives in one place.** A rule repeated across several skills is written once, and the others point to it. The reasons behind a rule stay in the wiki, not in the instructions.
- **You can check the result.** The plan records the word counts before and after, and every automatic check still has to pass.

**Non-goals:** No rule is dropped or changed. The wiki, the `CLAUDE.md` block, and the specs are left alone; thinning the specs is the next queued change. The browser tool's instructions come from its maker and stay as they are.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. The rewrite keeps every behavior the specs describe, so the change sets `skip_specs: true`.

## Impact

- Every `.agents/skills/*/SKILL.md` except `agent-browser` (vendored), and every `.agents/skills/*/references/*.md` (core and pack payload; `update-dependencies` is meta-only).
- `VERSION` → 25.16.0 and a `CHANGELOG.md` entry. `/wong-sync` in an installed repo brings every skill; a skill someone adapted locally shows as a conflict to merge.
- Lands after `update-dependencies` (25.9.0) and main's 25.10.0–25.15.0, on its own branch from `main`.

## Decision log

- **2026-09-27** — Asked to do the next two queued items now → this is the second: shorten the skills' instructions (queued 2026-09-27, memory #283).
- **2026-09-27** — Assumed: keep every behavior and cut only words, because the request was shorter instructions, not fewer rules, and a dropped rule reaches every installed repo.
- **2026-09-27** — Assumed: scope is every skill's `SKILL.md` and `references/*.md`, because references load with their skill; scripts, the wiki, `AGENTS.md`, and `openspec/specs/` are out.
- **2026-09-27** — Assumed: leave `agent-browser/SKILL.md` untouched, because it is vendored from its upstream and a local edit would be lost on its next update.
- **2026-09-27** — Assumed: targets of at least 30% fewer words in the `SKILL.md` files and 20% in references, because a first read found repeated boilerplate and asides at about that rate; the build reports the actual numbers.
- **2026-09-27** — Assumed: every heading another page links to keeps its exact text, because 98 distinct anchors point into these pages and the link check fails on a renamed one.
- **2026-09-27** — Assumed: a minor release (25.10.0), because every installed skill changes and locally adapted skills will need a merge.
- **2026-09-27** — Before counts (`wc -w`, main after 25.9.0): SKILL.md 13,064 without the vendored agent-browser (apply 1,144; continue 1,436; explore 732; improve 1,233; memory 1,093; plan 1,031; routine 567; save 1,347; ship 1,776; update-dependencies 367; verify 1,057; wong-setup 689; wong-sync 592); references 15,674. Targets: SKILL.md ≤ 9,145, references ≤ 12,539.
- **2026-09-27** — Rewrote all 31 files in four parallel passes (ship/continue/save; improve/apply/memory/verify; plan/explore/routine/update-dependencies; wong-setup/wong-sync), each checked against the spec requirements that name its skill. No heading, code block, frontmatter `name`/`user-invocable`, or existing link changed.
- **2026-09-27** — After counts: SKILL.md 13,064 → 9,565 (−26.8%); references 15,674 → 13,013 (−17.0%). At or over target: ship, continue, save, apply, plan, explore, routine, update-dependencies, and every save, plan, explore, and walkthrough reference. Under: improve (−21%), memory (−20%), verify (−23%), wong-setup (−20%), wong-sync (−18%), and the wong-setup/wong-sync references (−15% together).
- **2026-09-27** — Assumed: accept the shortfall rather than cut further, because what remains in those files is spec-required rules or exact data (quoted prompts, permission tables, file lists, error codes, fragments a test parses) that the design says never to change.
- **2026-09-27** — Assumed: `stack-pack-fragments.md` folds its 7th `wrangler.jsonc` rule, a repeat of the 1st (`migrations_dir`), into the 1st, so "Eight rules" reads "Seven rules"; its code-block comment "see the fifth rule below" stays byte-identical (it was already one off — the cron rule is sixth).
- **2026-09-27** — Found, not fixed (out of scope; would change behavior): `asking-the-user.md` names "`/apply` into `/save`" as a chain that continues without asking, while the apply-plan-handoff spec says `/apply` does not invoke `/save`; the code-first-planning spec expects `/explore` to carry "prefer code over AI" guidance that it never had; `failure-map.md`'s missing-secrets row says values live in `.env`, which may be out of date for the minted deploy token.
- **2026-09-27** — Checkpoint on `shorten-skill-instructions`: tasks 1.1–3.3 done; release checks, `measure-context --check`, and all 324 payload tests pass locally. CI decides task 3.4.
- **2026-09-27** — CI passed on PR #151. All tasks done.
- **2026-09-27** — Asked to merge `main` and check the change still holds → merged 25.10.0–25.13.0 (#148, #149, #150, #152, #153). Ten files conflicted; each resolved as the union of intent, main's new rules in the shorter wording: `/apply` builds in a helper (the inline `openspec instructions apply` paragraph moved to `build-helper.md`, so the shortened copy is dropped), plain reports for a non-technical reader in `save`, `ship`, `continue`, and `asking-the-user.md`, the plan's link and "What next?" through the question tool in `plan` and `asking-the-user.md`, and setup's computer-ready step, GitHub re-sign-in, and Windows link prefix in `wong-setup`. Every line main added is present verbatim or in those resolutions.
- **2026-09-27** — Assumed: release 25.14.0, the next minor after main's 25.13.0. Assumed: main's new `apply/references/build-helper.md` and `wong-setup/references/tools.md` stay as written, because they postdate this plan's pass. Counts against main 25.13.0: SKILL.md 13,395 → 9,960 (−25.6%); references 17,526 → 14,865 (−15.2%). Release checks, `measure-context --check`, `openspec validate`, and all 347 payload tests pass.
- **2026-09-27** — Asked to make sure the skill update breaks nothing, OpenSpec included, then publish → a mechanical pass (no code block lost; every frontmatter `name`, `user-invocable`, and flag unchanged; each removed inline command traced) and two independent rule-by-rule reviews against `main`. No OpenSpec command, flag, rung, gate result, or git boundary was lost. Restored what they found: `wong-setup`'s "a request to install continues through `/plan`, `/apply`, and `/save`" (install-onboarding spec), `ship`'s three named pull-in stops, `save`'s `skip_specs` note, prose-save two-line report and failing-gate next step, the `wrangler.jsonc` entry-point and compatibility settings, the unseeded `.env` handling list, `latest-source`'s fetch and timing wording, `update-dependencies`' "more than the user expects" and "adapt the owning skill", `improve`'s instructions read, intent fields, source-owner and architecture guidance, consolidation's "only", routine's delete ask format, the R2 condition, and the `--annotate` condition.
- **2026-09-27** — Merged `main` again for 25.14.0 (plain words for everyone) and 25.15.0 (a workspace per part); conflicts in apply, continue, explore, asking-the-user, plan, routine, save, and ship resolved as main's rules in the shorter wording, with no link left to the retired `#write-at-the-readers-level`. Release is now 25.16.0. Counts against main 25.15.0: SKILL.md 13,476 → 10,202 (−24.3%); references 18,286 → 15,693 (−14.2%, including main's new unshortened `build-helper.md`, `tools.md`, and `new-workspace.md`). Release checks, `openspec validate --specs` (49/49), and all 363 payload tests pass.
