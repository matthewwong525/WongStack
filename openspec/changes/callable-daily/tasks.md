# Tasks

## 1. Script

- [ ] 1.1 In `.agents/skills/daily/scripts/daily.mjs`, build the context with `repoContext(SKILL)` and pass `cwd: ctx.root` to the launcher and memory `spawnSync` calls; in `scripts/tests/daily.test.mjs`, verify a CLI run from another repo's folder reads the daily repo's git email and writes the daily repo's `wong-daily` state.
- [ ] 1.2 Add the read-only `day` command (who, reminders or `not-read`, today's opened rows, `watch` command or `null`; `signed-out` exits 1) and its usage line; verify with tests for a normal day, an empty day, a memory failure and a signed-out person.

## 2. Skill

- [ ] 2.1 In `.agents/skills/daily/SKILL.md`, name the fixed reply lines in step 5 and add `## When another skill runs it` (absolute `D`, signed-out hand-back, covered steps, no offer or question or watch, the `Watch:` line, `D day` for scripts); verify every line it names matches the design.
- [ ] 2.2 Offset the added words by trimming `SKILL.md` and `references/chief.md` without dropping a rule; verify `node scripts/measure-context.mjs --check` passes.

## 3. Docs and release

- [ ] 3.1 Add `## Run it from your own agent` to `wiki/development/daily.md`: what a caller's skill copies, what comes back, one watch; verify links with `node scripts/check-payload-links.mjs`.
- [ ] 3.2 Add a `## Next (minor) — Another agent can run /daily inside its own day` entry to `CHANGELOG.md` with an **Updating.** note saying nothing needs doing by hand.

## 4. Verification

- [ ] 4.1 Run `node .github/scripts/checks.mjs --worktree` and `node --test scripts/tests/daily.test.mjs`; both pass.
- [ ] 4.2 From a second repo's folder, run `node <this repo>/.claude/skills/daily/scripts/daily.mjs day` and confirm it names this repo's person and state, then `/save` for the gate.
