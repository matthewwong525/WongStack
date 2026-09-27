# Contributing to WongStack

This page tells you how to send a change to WongStack. Follow the [code of conduct](../CODE_OF_CONDUCT.md). To report a vulnerability, do not open an issue: follow [`SECURITY.md`](../SECURITY.md).

## Open an issue first

For anything larger than a typo, [open an issue](https://github.com/matthewwong525/WongStack/issues/new/choose) before you write code. Say what goes wrong or what you need. Agree on the approach there, so your pull request is not wasted work. [The bar](../wiki/contributing.md#the-bar-does-this-belong-in-every-wongstack-repo) is simple: the change must belong in every WongStack repo.

## Fork, branch, and open a pull request

1. Fork the repository, and clone your fork: `gh repo fork matthewwong525/WongStack --clone`.
2. Make a branch from `main`.
3. Make the change, and run the checks below.
4. Push the branch to your fork, and open a pull request against `main`. Use the template, and link the issue.

A change to a payload file is a release. Add a `## Next (patch|minor|major) — <Title>` entry to `CHANGELOG.md` in the same pull request, and leave `VERSION` alone. [The payload rule](../.agents/rules/payload.md) owns the release steps; [contributing upstream](../wiki/contributing.md#whats-in-scope) says which files are payload.

## Run the checks

Use Node.js 22 ([`.nvmrc`](../.nvmrc)) and OpenSpec 1.13.2 (`npm install -g @fission-ai/openspec@1.13.2`). From the repository root:

```bash
(cd app && npm ci && npm test)
(cd scripts/tests && npm ci)
scripts/tests/node_modules/.bin/oxlint --deny-warnings scripts .agents/skills/*/scripts
shellcheck --severity=warning scripts/*.sh .github/scripts/*.sh .agents/skills/*/scripts/*.sh server/*.sh
scripts/tests/node_modules/.bin/c8 --config scripts/tests/.c8rc.json node --test scripts/tests/*.test.mjs
node scripts/check-payload-links.mjs
node scripts/check-openspec-config.mjs
node scripts/check-retired-names.mjs
openspec validate --specs --strict --no-interactive
node scripts/measure-context.mjs --check
```

`measure-context.mjs --check` fails when the start-up load (the `WONG-STACK` block and the rest of `AGENTS.md`, the wiki style and voice pages, and every skill description) passes `startupCeiling` in [its baseline](../scripts/fixtures/context-baseline.json); raising the ceiling is a Decision log entry in the change that raises it. A change that trims instructions first runs `node scripts/measure-context.mjs --write-baseline`, before any text edit, so the report counts that change alone.

`npm test` in `app/` is the `test` check. The rest are the `payload` check. Outside CI, the review page tests skip without `npm ci` in `scripts/tests/`, and its browser tests skip unless Google Chrome is installed or `CHROME_PATH` names a Chromium; in CI both fail instead.

A test of WongStack itself, and any dependency it needs, goes in `scripts/tests/` and [its manifest](../scripts/tests/package.json), never in `app/`: the whole `app/` folder ships to every repo, so a test there runs, and installs its dependencies, in repos that never edit the file it tests.

The coverage floor in [`scripts/tests/.c8rc.json`](../scripts/tests/.c8rc.json) only rises. Raise it when your tests raise coverage; lowering it needs a stated reason in the change's Decision log.

## What CI does on a pull request from a fork

- **`test` and `payload` must pass.** The ruleset on `main` requires both, so a red pull request cannot merge.
- **`build` runs as a check only.** A fork gets no deploy secret, so the build does not deploy. Your pull request gets no preview URL.
