# Design

## Context

43.14.0 added two save routes into `~/.wong-stack/details.json`: a private form's *Save for next time* (`private: true` sets, cards with security codes, read only by `hand-over.mjs fill`) and `details.mjs save` for everyday chat answers (`private: false`, readable by the agent). This change removes the first route and everything only it needed.

## Goals / Non-Goals

**Goals:**

- No path writes a private form's values anywhere.
- A `private: true` set already on disk is deleted, never filled.
- Everyday chat answers keep saving, listing, and forgetting as now.

**Non-Goals:**

- Saved logins (`logins.json`) and the password link.
- How the private form types into the site, empties a refused page, or picks a dropdown by its text.

## Decisions

- **Remove, not hide.** The tick, the `save` body flag, `keepForm`, the `HANDOVER_SAVED_HINT` report, and the whole `fill` command (with `--use`, `checkFill`, the fill lock in `wait`/`close`) go. A hidden tick would leave dead code that could be turned back on by a stray flag. `valuesFor`, `choiceFor`, `normalise`, and their helpers served only `fill`, so they go too.
- **Everyday answers are typed by the agent.** It reads an everyday set from `details.mjs list` and types it with `browse.mjs`, as it types any chat answer. `fill` gave no extra safety for values the agent may already read.
- **`readDetails` drops private sets and rewrites the file.** Every command reads through it, so the first `list`, `save`, or `forget` after the update deletes any card. The changelog's **Updating.** step runs `details.mjs list` once, so a card doesn't wait for the next saved-answer use. `list` stays read-only otherwise.
- **The kinds a chat save refuses move into `details.mjs`.** `form.mjs`'s `UNKEPT` and `keepable` existed for the tick; `details.mjs` now refuses `cc-*`, passwords, and `one-time-code` itself. `form.mjs`'s `AUTOFILL_TOKENS` and `LIMITS` stay shared.
- **The hint stays simple.** An everyday set's hint is its labels, as now; the card branch of `hintOf` goes.
- **Retired names.** `hand-over.mjs fill`, `--use`, `HANDOVER_SAVED_HINT`, and `Save for next time` go in `scripts/retired-names.json`, allowed in the 43.14.0 archive, its CHANGELOG entry, and this change.
- **Minor release.** The `fill` command is removed, but it shipped hours ago and only this skill's guide called it.

## Risks / Trade-offs

- An install that saved a card loses it on update → intended; the CHANGELOG says so in plain words.
- The private form shows one fewer control → no layout change beyond the row going.
