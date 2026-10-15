# Design

## Context

See proposal.md for why. Two WongOS changes shaped this: `daily-decision-page` (PR #119), which reads Matt's board and sends a day page, and `populate-daily-work`, which opens each due routine in its own Paseo workspace once a day. Both are Matt-only: WongOS's `references/settings.md` says "there is no other-person setup or identity selection".

WongStack already has the pieces:

- **Identity.** `memory/scripts/lib/store.mjs` `signIn(origin)` reads the token `cloudflared` saved and returns `{state: missing|expired|near|valid, email}`; it never logs in. `memoryOrigin(loadConfig(ctx))` gives the app origin. `signInHelp(origin)` is the login command.
- **Workspaces.** `schedule/scripts/workspace.mjs open --title --brief` opens one Paseo workspace from the default branch; it fails outside Paseo.
- **Excluding files from a shipped skill.** `install.mjs` and `preflight.mjs` drop any path under a category's `exclude` list.
- **Budget.** `measure-context.mjs` has under 100 bytes of instruction headroom; `disable-model-invocation: true` skills count as `on-call`, apart.

## Goals / Non-Goals

**Goals:** a general `/daily` every install gets; a script that owns the deterministic parts (who, which file, already opened today) so the skill keeps only the steps.

**Non-Goals:** no step parsing into a schema; no new app route or database; no change to `/schedule`.

## Decisions

**1. Files: `team.md` and `people/<name>.md` inside the skill.** Each people file starts with YAML frontmatter `emails: [...]`, then a plain bullet list of steps; `team.md` is just the list. Name files like wiki person pages (`jo-lee.md`). *Over a JSON settings file (WongOS):* people edit by talking, and words carry "Mondays" or "the first of the month" without a cadence schema. *Over keying files by email:* one person signs in with several emails.

A step line reads `- [days:] <what to do>`, with `(own workspace)` at the end for a step that should not take over the chat:

```markdown
---
emails: [jo@example.com, jo.lee@gmail.com]
---
- Check yesterday's Shopify orders and flag refunds.
- Weekdays: /email (own workspace)
- Fridays: draft the week's update for the team.
```

**2. `scripts/daily.mjs` owns the deterministic parts.**

- `who` → `{state, email, origin, file, login}`: the sign-in from `signIn(memoryOrigin(config))`; with no app origin, `git config user.email` and `source: "git"`; `file` is the people file whose `emails` holds it (case-insensitive), or `null`; `login` is the `signInHelp` command when not `valid`/`near`.
- `opened --day <YYYY-MM-DD>` lists the workspaces opened today; `open --step <text> --title <t> --brief <file>` runs `workspace.mjs open` once per (person, step, local day), recorded in `<git common dir>/wong-daily/`, beside memory's `wong-memory/` state, so every worktree of this checkout sees it and git never tracks it, and returns `already` on a repeat. Outside Paseo it returns `unsupported` and opens nothing, so the skill runs the step in chat.

Which steps are due today stays with the assistant: it reads the day words against today's local date. *Over parsing days in code:* the words are open-ended, and a wrong read only skips or adds one step that the reply shows.

**3. Signing in waits on the person.** On `missing`/`expired`, the skill runs the `login` command in the background, shows the link it prints, waits for it to exit, then reruns `who`. Memory never runs a login because it must not wait on a person; `/daily` is started by one, so it can.

**4. Changing steps uses the change loop.** "Add X to my daily" edits the person's file (creating it with their sign-in email if missing), shows the new list, and offers to publish like any repo edit. Team steps change only through the owner's review. Steps are in a shared repo: the skill keeps private life out, by [the wiki's People rules](../../../wiki/wiki-style.md#people).

**5. Person-started only.** `disable-model-invocation: true`; no `AGENTS.md` line, which keeps startup words unchanged. The wiki page and changelog announce it.

**6. Ship the skill, not the steps.** `core.skillDirs` gains `daily`; `core.exclude` gains `.claude/skills/daily/team.md` and `.claude/skills/daily/people`. This repo keeps none of either, so nothing excluded exists here today.

## Risks / Trade-offs

- [An update overwrites or deletes a team's files] → `install.mjs` only fills an empty folder, and sync's `preflight.mjs` lists only upstream paths outside `exclude`, so a target's own `team.md` and `people/` never appear as changes. Tests cover both: install leaves them out, and preflight never lists them even when this repo holds such files.
- [`cloudflared` missing] → `who` reports `missing` with the login command; the skill says the tool is needed and links [required tools](../../../wiki/development/required-tools.md).
- [A step misread as due] → the reply lists each step run and skipped, so the person sees it.
- [The workspace record lives on one computer] → a second computer may open a step again the same day; acceptable for a person-started command.

## Migration Plan

Additive. Existing installs get the skill on their next sync with no hand step; WongOS can then move Matt's routines into its own `people/matthew-wong.md`, its own change.
