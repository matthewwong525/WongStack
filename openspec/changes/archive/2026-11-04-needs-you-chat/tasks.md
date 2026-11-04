# Tasks

## 1. The worker

- [x] 1.1 In `.agents/skills/daily/scripts/worker.mjs`, add the failure count in `needs-you.json`, `failed`, `worked` and `ignored` to `makeWorker`, with the kinds' titles and default fix steps and the `guide` line in the message; take `openChat` and `guide` as inputs; a dry run prints `wouldOpen`.
- [x] 1.2 In `dispatch`, send a `not-read` of `board` or `workspaces` to `failed` (`board`, `paseo`) and a `read` of them to `worked`; drop other `again` and `read` events without a journal line.
- [x] 1.3 Route the job check (`checked`) and a `sweep` item's start (`start`, now async) through `failed` and `worked` with `job:<id>`; route `serveDaily`'s morning through `failed('morning')` and `worked('morning')`, replacing its `note` set; pass `ignore: worker.ignored()` to `watch`.
- [x] 1.4 In `.agents/skills/daily/scripts/daily.mjs` `commands().serve`, pass `openChat` on `launchWorkspace` in the project and the settings' `guide`.

## 2. The watch and the stop check

- [x] 2.1 In `.agents/skills/daily/scripts/chief.mjs` `passes`, with `service` on, emit `not-read` with `again: true` on each repeat failure and `{event: 'read', source}` when a listed source reads again (`board`, `workspaces`, add-ons); a chat's own watch is unchanged.
- [x] 2.2 In `.agents/skills/daily/scripts/stop-check.mjs`, skip a chat whose `PASEO_AGENT_ID` is in `<state>/needs-you.json`'s `chats`.

## 3. Tests

- [x] 3.1 In `scripts/tests/daily-worker.test.mjs`: one failure writes one line and opens nothing; two in a row open one chat titled `Needs you: …` with the reason, fix steps and guide line; a third that day and a later run of failures that day open none; the next day opens one again; a success between two failures opens none; each kind counts alone; a failed open journals `Not opened` with the reason; the chat's id reaches the watch's `ignore`; a dry run opens nothing; the morning and a job check go through the count.
- [x] 3.2 In `scripts/tests/daily-chief.test.mjs`: the service watch emits `not-read` with `again` on a second failed board read and `read` when it reads again; a chat's watch emits neither.
- [x] 3.3 In `scripts/tests/daily-stop-check.test.mjs`: a chat in `needs-you.json`'s `chats` gets no check-in.

## 4. Docs and release

- [x] 4.1 In `wiki/development/daily.md`, say in *The daily on a computer* and *The journal* that a second failure in a row opens one *Needs you* chat a kind a day, and in *Your settings file* that `guide` may give its own fix text.
- [x] 4.2 Add a `## Next (minor) — A problem that needs you opens one chat` entry to `CHANGELOG.md`; no hand step.

## 5. Verify

- [x] 5.1 Run `node --test scripts/tests/daily*.test.mjs`, `node scripts/check-payload-links.mjs`, `node scripts/measure-context.mjs --check` and `node .github/scripts/checks.mjs --worktree`; all pass.
- [x] 5.2 Run `openspec validate needs-you-chat --strict --no-interactive`; it passes.

## 6. Review fixes

- [x] 6.1 In `worker.mjs` `checked`, reset the `job:<id>` count only when the check answers with no run; when it asks for a run, leave the reset to `start`. Add a test in `scripts/tests/daily-worker.test.mjs`: a job whose check passes and whose start fails two periods in a row opens one chat and writes one `Not started` line.
