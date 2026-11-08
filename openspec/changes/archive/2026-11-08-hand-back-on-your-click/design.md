# Design

## Context

`hand-over.mjs` opens three kinds of turn on the agent's browser: a live view (`open --view`), a window turn (`open --view` when `HANDOVER_VIEW=window`), and a watch link's sign-in turn (`turn`). Each takes a finish (`--until`, `--until-gone`, `--until-text`) that the watcher polls with `seen()` and `finished()`; when it holds, the turn ends as `done` (view) or `signed-in` (watch). `--keep-open` already opens a view with no finish, which ends only on *Hand back*, `close`, or the deadline. See proposal.md for why.

## Goals / Non-Goals

**Goals:** every turn behaves as `--keep-open` does today; the finish code goes, with its docs and tests.

**Non-Goals:** the key link's save, reply links, and the watch link's agent-driven part (*Take over*, `line`) stay as they are.

## Decisions

- **Delete the finish, don't default it off.** Remove `finished`, `seen`, `pageFault`'s finish branch and `MET`, the finish fields in the state, and the poll that reads them. `pageFault` keeps the no-page check. Alternative: keep the flags and ignore them; rejected, a dead flag misleads.
- **Old flags are a usage fault.** `--until`, `--until-gone`, `--until-text`, and `--keep-open` are dropped from `parseArgs`, so `strict` parsing fails with exit 2 and the usage. Add each to `scripts/retired-names.json` with its replacement (`open --view --note <line>`), so docs that still name one fail the check.
- **The watch turn ends on Hand back only.** `turn --note <line>` takes no finish; `wait` prints `handed-back` when the person taps it, and `signed-in` is no longer printed. `connect/scripts/browser.mjs` waits for `handed-back`, keeps its check of the sign-in boxes after the turn, and its line becomes *Sign in to <tool>, then tap Hand back.* In a window, the person's *done* runs `close`, as today.
- **`done` stays for the key link and the keys page saves.** A view's `wait` gives `handed-back`, `closed`, `timeout`, or `error`.
- **The view page loses the met-finish *Done* page** if it has one of its own; the closed and handed-back pages stay.

## Risks / Trade-offs

- [A person forgets to tap *Hand back* after a payment, so the chat waits] → The line already ends *then tap Hand back*; the 8-hour limit and *done* in the chat still end it.
- [A downstream repo's skill still passes `--until`] → It fails loudly with exit 2 and the usage, and `retired-names.json` names the replacement; `/wong-sync` carries the doc changes.

## Migration Plan

Ships as a minor version. No data changes. A link open while the update lands keeps its own state and ends as before.
