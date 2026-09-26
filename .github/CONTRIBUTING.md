# Contributing to WongStack

This page tells you how to send a change to WongStack. Follow the [code of conduct](../CODE_OF_CONDUCT.md). To report a vulnerability, do not open an issue: follow [`SECURITY.md`](../SECURITY.md).

## Open an issue first

For anything larger than a typo, [open an issue](https://github.com/matthewwong525/WongStack/issues/new/choose) before you write code. Say what goes wrong or what you need. Agree on the approach there, so your pull request is not wasted work. [The bar](../wiki/contributing.md#the-bar-does-this-belong-in-every-wongstack-repo) is simple: the change must belong in every WongStack repo.

## Fork, branch, and open a pull request

1. Fork the repository, and clone your fork: `gh repo fork matthewwong525/WongStack --clone`.
2. Make a branch from `main`.
3. Make the change, and run the checks below.
4. Push the branch to your fork, and open a pull request against `main`. Use the template, and link the issue.

A change to a payload file is a release. Bump `VERSION` and add a `CHANGELOG.md` entry in the same pull request. [Contributing upstream](../wiki/contributing.md) owns the release steps and says which files are payload.

## Run the checks

Use Node.js 22 ([`.nvmrc`](../.nvmrc)) and OpenSpec 1.8.0 (`npm install -g @fission-ai/openspec@1.8.0`). From the repository root:

```bash
(cd app && npm ci && npm test)
node --test scripts/tests/*.test.mjs
node scripts/check-payload-links.mjs
node scripts/check-openspec-config.mjs
node scripts/measure-context.mjs --check
```

`npm test` in `app/` is the `test` check. The other four commands are the `payload` check. Without `npm ci` in `app/`, the review page tests skip.

## What CI does on a pull request from a fork

- **`test` and `payload` must pass.** The ruleset on `main` requires both, so a red pull request cannot merge.
- **`build` runs as a check only.** A fork gets no deploy secret, so the build does not deploy. Your pull request gets no preview URL.
