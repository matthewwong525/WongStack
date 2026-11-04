# Tasks

## 1. The step-title script

- [x] 1.1 Add `.agents/skills/explore/scripts/step-title.mjs` with `set` and `hook` by design decisions 1–5: verb map, order guard, per-chat state under the git common dir, Paseo agent and worktree workspace rename (reusing `renameArgs`), Codex `session_index.jsonl` append, Claude `sessionTitle` output, task words and branch-name detection, fail-open exits.
- [x] 1.2 Add `scripts/tests/step-title.test.mjs` with a fake `paseo` and a temp `CODEX_HOME`: each verb maps to its step; `/ship` then a nested `set APPLY` stays SHIP; DONE is kept until a typed verb; `PLAN: X` becomes `APPLY: X`; a branch-like name takes `--task`; the main-folder workspace is not renamed; the Claude hook prints `sessionTitle` and the Codex hook appends one line; `/daily` as a first message sets nothing; a failing `paseo` still exits 0 with `STEP_TITLE=skipped`.

## 2. Hooks and skills

- [x] 2.1 Add the hook entries to `.agents/settings.json` and `.agents/hooks.json` by design decision 7; extend the hooks test that checks their shape, if one exists, else cover them in 1.2.
- [x] 2.2 Add the one-line calls to `explore`, `plan`, `apply` and `ship` `SKILL.md` by design decision 6, with offsetting cuts in the same files.

## 3. Docs and release

- [x] 3.1 In `wiki/development/the-change-loop.md#what-each-step-may-change`, add that each chat's name starts with its step word, and how it shows on each host.
- [x] 3.2 Add a `## Next (minor) — Show the step in the chat title` entry to `CHANGELOG.md` with no hand step.

## 4. Verify

- [x] 4.1 Run `node --test scripts/tests/step-title.test.mjs`, `node scripts/measure-context.mjs --check`, `node scripts/check-payload-links.mjs` and `node .github/scripts/checks.mjs --worktree`; all pass.
- [x] 4.2 In this Paseo chat, run `step-title.mjs set APPLY` and confirm with `paseo workspace ls --json` and `paseo agent inspect` that both names start with `APPLY: `; in a throwaway `CODEX_HOME`, confirm `codex resume` lists the new name; feed the Claude hook a sample prompt and confirm its `sessionTitle`.
