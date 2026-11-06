# Tasks

## 1. The step-title script

- [x] 1.1 In `.agents/skills/explore/scripts/step-title.mjs`, change `stateFor` so a first plain message stores task words with no step (design decision 1), and update its comment; verify by the tests in 1.4.
- [x] 1.2 Add `copiedName(name, prompt)` and use it in `stateFor`: a copied Paseo name gives `clauseOf(prompt)` (none for a bare command such as `/email`) with `taskFrom: 'prompt'` (design decision 2); verify by the tests in 1.4.
- [x] 1.3 Make a typed command give its step at once (design decision 3): `explore` → EXPLORE, `plan` and `improve-code` → PLAN, `apply`/`continue`/`ship` → none, another repo skill → its name in capitals without `wong-`, a name with no `.claude/skills/<name>/SKILL.md` → none; update the file's usage line and the `stateFor` comment; verify by the tests in 1.4.
- [x] 1.4 Update `scripts/tests/step-title.test.mjs`: replace "a first plain message starts at PLAN" with a test where a first plain message shows and writes nothing, then `set PLAN` gives `PLAN: Fix the invoice total` and the next message shows it; change "a task from the first message gives way" to expect no write from the hook; add a test where a Paseo name that is the first 60 characters of the message gives way to `set PLAN --task "Fix the invoice total"`, and a name that is not a prefix stays; make the Codex hook test run a `set` first so the hook still writes one line; replace the `/daily` first-message test with one where `/verify the invoice page` gives `VERIFY: The invoice page` at once, `/explore` gives `EXPLORE`, a bare `/ship` keeps the step, and `/compact` (no such skill) changes nothing. Run `node --test scripts/tests/step-title.test.mjs`; all pass.
- [x] 1.5 In `setStep`, use the host's name as the task only when no state exists (design decision 4): a state with no task means the hook refused the name. Add a test: a bare `/plan` with Paseo name `/plan`, then `set PLAN`, then `set PLAN --task X` gives `PLAN: X`.
- [x] 1.6 Add a Paseo hook test for a host name that starts with a command: a bare `/verify` with Paseo name `/verify`, then `/plan fix x` writes `PLAN: Fix x`, and `set PLAN --task Y` gives `PLAN: Y`.

## 2. Docs and release

- [x] 2.1 In `wiki/development/the-change-loop.md`, add to the "A chat's name starts with the step at work" line that a chat that starts no step, such as a question, keeps its name, and a typed command shows its step at once. Verify `node scripts/check-payload-links.mjs` passes.
- [x] 2.2 Add a `## Next (minor) — The chat name waits for a step, and a typed command names it at once` entry to `CHANGELOG.md` with no hand step.

## 3. Verify

- [x] 3.1 Run `node .github/scripts/checks.mjs --worktree`; all pass.
- [x] 3.2 Run the hook by hand (`step-title.mjs hook --agent claude` with a fake prompt in a scratch Claude session id) for a plain question, `/verify the invoice page`, and `/explore fix it`; confirm the printed `sessionTitle` is none, `VERIFY: The invoice page`, and `EXPLORE: Fix it`.
