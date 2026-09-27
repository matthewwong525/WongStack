## Context

`npm ci` sends the installed tree to npm's audit endpoint after it links packages. npm is retiring that endpoint (the log says `This endpoint is being retired. Use the bulk advisory endpoint instead`). On CI run 36283461754 the request stalled and the Install step took 5m, against 7–9 s on the runs before and after. No WongStack step reads the audit summary or the funding notice.

WongStack runs `npm ci` in four places:

| File | Ships to | Line |
|---|---|---|
| `.github/workflows/test.yml` | every repo (core) | `Install` step |
| `.github/workflows/deploy.yml` | pack repos | `Install` step |
| `scripts/cf-preview.sh` | pack repos | first-run install in `$BUILD_DIR` |
| `.github/workflows/payload.yml` | this repo only | `scripts/tests` install |

## Goals / Non-Goals

**Goals:** no WongStack install waits on the audit endpoint; a check that keeps a new `npm ci` line from dropping the flags.

**Non-Goals:** a replacement vulnerability scan (for example `npm audit signatures` or the bulk endpoint); changing installs people run by hand, or `CONTRIBUTING.md`'s local commands.

## Decisions

- **Flags on each command, not `.npmrc` or `NPM_CONFIG_AUDIT`.** An `app/.npmrc` would also silence audit for a person running `npm install` by hand, and would be one more scaffold file. A workflow-level `env` would miss `cf-preview.sh`. The flag on the line is visible where the step is read.
- **`--no-fund` too.** The funding notice is noise in every log; dropping it costs nothing.
- **A payload check guards it.** Add a test in `scripts/tests/` that reads every file under `.github/workflows/` and `scripts/` (excluding `scripts/tests/`) and fails on an `npm ci` command line without both flags. A shell comment that mentions `npm ci` (`cf-build.sh`) is not a command; the test matches `run: npm ci` and `npm ci` at the start of a command or after `&&`/`(`/`;`.
- **Patch release 25.4.1.** The only visible difference is a shorter install log.

## Risks / Trade-offs

- Repos lose the audit summary line in CI logs → nobody reads it, and the endpoint is going away anyway.
- A target that customized its `Install` step keeps its own line → `/wong-sync` plans the update and shows the diff, as for any workflow edit.

## Migration Plan

`/wong-sync` brings the new `test.yml`, `deploy.yml`, and `cf-preview.sh`. Nothing to do by hand.
