# Design

## Context

See `proposal.md` for why. What exists today:

- `app/package.json`'s `test` script runs `oxlint --deny-warnings`, `vitest run --coverage`, `knip`, `jscpd` and `node ../scripts/check-app-keys.mjs`. It runs no type check. `tsc -b` runs only inside `build:app`, which the Deploy workflow calls; main's ruleset requires only the `test` and `payload` checks.
- `tsc -b` covers `src/` (tests included), `worker/` without its tests, and `vite.config.ts`. `tsconfig.worker.json` excludes `worker/**/*.test.ts` because that project resolves modules the Node way and Vitest resolves them the Vite way. `app/tests/` is in no project.
- `app/.jscpd.json` with a comment in it is ignored whole by jscpd, which then passes everything (35.0.1). Only a sentence in `wiki/stack/mini-apps.md` guards it.
- [`checks.mjs`](../../../.github/scripts/checks.mjs) owns the `test` check on both routes and the pre-check on this computer. [`loosened-checks.mjs`](../../../.github/scripts/loosened-checks.mjs) holds the list of what counts as a check's settings.
- `scripts/tests/.c8rc.json` sets the scripts' floor at 85 lines and 81 branches. Main's last Payload run measured 92.88 and 90.02.
- No mini app imports outside its folder, `src/lib/`, `src/components/` or `worker/api/contract.ts` today, test files aside.

Measured on 2026-10-06 in a throwaway copy: `tsc -b` takes about 4 seconds. A trial project over `worker/` and `tests/` with bundler resolution and Node types reported 106 errors: 77 are a response body read as `unknown` (TS2571, TS18046), 5 are skill modules the copy lacked, and the rest are argument and call shapes (TS2345, TS2349, TS2352, TS2554, TS7006) in 12 test files.

## Goals / Non-Goals

**Goals:**

- Each new check ships with the app, so an install gets it through the normal update.
- No change that leaves check settings alone takes longer than a few seconds more.
- No `any`, skip comment or excluded file is added to make a gate pass.

**Non-Goals:**

- No proof for the landing page's checks in `site/`, or for the payload's lint and shell checks, which read no settings file.
- No change to what the loosened-check rule flags.

## Decisions

### The type check is one more link in `npm test`

`test` becomes `npm run lint && tsc -b && vitest run --coverage && …`. It sits second: it is the fastest gate after lint and its errors explain most test failures that follow.

A fourth project, `app/tsconfig.tests.json`, covers `worker/**/*.test.ts` and `tests/`, and `tsconfig.json` references it, so one `tsc -b` checks everything and the build checks the same set. It extends `tsconfig.node.json` and sets `module: esnext`, `moduleResolution: bundler`, `resolveJsonModule`, and the types `./worker-configuration.d.ts`, `vite/client` and `node`. It includes the Worker's source too, since the tests import it; `tsconfig.worker.json` keeps its exclusion, so the Worker's own project still resolves the Node way.

*Over a separate `typecheck` step in `checks.mjs`:* `npm test` is the whole contract of the `test` check, and an install's own runner would be skipped.

*Over removing the exclusion in `tsconfig.worker.json`:* its comment gives the reason, and the two resolution modes still disagree.

### The test fixes go through one helper, with no `any`

Most reports are `(await response.json()).error.code` on an `unknown` body. One helper in `app/tests/` reads a response body as a loose tree type whose every property is the same loose type, so a test reads `body.error.code` and hands it to `expect`. The lint rule against `any` stays on in tests. The remaining reports are fixed where they are: a fake handed where `Env` is wanted gets a typed builder, not a cast to `unknown` and back. A report that shows a real slip in a test is fixed as one and named in the Decision log.

### The proof is a script that runs the real commands on samples

`scripts/check-app-checks.mjs` builds a throwaway folder in the system's temp directory, links the app's installed packages into it, copies the app's real settings files, and writes small samples. For each gate it runs the command `npm test` runs and expects a non-zero exit and output that names the sample:

| Gate | Settings copied | Sample |
|---|---|---|
| lint | `.oxlintrc.json` | one file per rule the settings name: an explicit `any`, a 501-line file, a function over the complexity cap, a hook in a branch, a mini app importing a sibling |
| types | `tsconfig*.json` | a wrong type in `src/`, in `worker/`, and in a Worker test |
| coverage | `vitest.config.ts` | a function with an untested branch and its test |
| unused code | `knip.jsonc`, `package.json` | an exported file nothing imports |
| repeated code | `.jscpd.json` | two files with the same 40 lines |
| saved keys | `worker/keys.ts` | a handler naming a secret its route does not list |

A gate that exits zero, or fails without naming its sample, is reported as `passed a bad sample` and the script exits 1. Each gate prints one line. The folder is removed on exit. The samples are generated by the script, so no bad file sits in the repo for the real gates to trip on.

It ships beside `check-app-keys.mjs` in the pack's file list. `app/package.json` gains `"test:checks": "node ../scripts/check-app-checks.mjs"`.

*Over a test per tool inside the app's Vitest suite:* the suite runs under coverage with a Node environment, and spawning five tools there would slow every run.

*Over asserting each tool's file count:* that catches a tool that scanned nothing, but not one that scanned and no longer applies a rule.

### The proof runs when a check's settings or tools change

A check should run only when its kind of file changed. This one can only fail when a settings file, a tool's version, or the proof itself changed, so `checks.mjs` runs `npm run test:checks` in the suite's folder when the change touches:

- a check's settings, by the list `loosened-checks.mjs` uses;
- the suite's `package.json` or `package-lock.json`, which is how a weekly dependency update moves a tool;
- `scripts/check-app-checks.mjs`.

It also runs when there is no base to compare, and it is skipped, with a line in the summary, when the suite's `package.json` has no `test:checks` script. The settings list and the changed-file list move from `loosened-checks.mjs` into a small shared module, `.github/scripts/check-settings.mjs`, so the two scripts can not drift. The pre-check gets a part named `proof` for `--only`.

*Over always running it in `npm test`:* it would add its whole time to every app change, for a check that can not fail on one.

*Over adding the lockfile to the loosened-check list:* every dependency update would then need a written reason.

### The folder rule is a lint rule with an allow-list

Two overrides in `app/.oxlintrc.json` use `no-restricted-imports` patterns, proven on oxlint 1.86.0:

- `src/apps/*/**`: restrict `../**`, `@/apps/**`, `@/pages/**`; allow `../../lib/**` and `../../components/**`. `@/components/**` and `@/lib/**` are untouched.
- `worker/apps/*/**`: restrict `../**`; allow `../../api/contract.ts` and `../../api/body.ts`.
- A last override turns the rule off for `**/*.test.ts` and `**/*.test.tsx`.

`src/apps/AppPage.tsx`, `src/apps/index.ts` and `worker/apps/index.ts` sit one level up and are core, so the globs do not reach them. The pattern matches the written import, not the resolved file, so a mini app that grows a subfolder imports upward within itself through `@/apps/<name>/…`; when the first one does, the rule gains an allow for that. No mini app has a subfolder today.

*Over a source-reading test like `style.test.ts`:* the lint rule needs no code, reports in the same run as the other rules, and the proof already covers it.

### The scripts' floor moves to 92 and 89

`scripts/tests/.c8rc.json` takes `lines: 92`, `branches: 89`, after re-measuring on this branch. A script test runs `c8` with that file on a half-tested sample and expects it to refuse, which is the proof for this gate; it lives in `scripts/tests/` because the floor is meta-only.

## Risks / Trade-offs

- [An install's own tests hold type errors, so its `test` check goes red after the update] → The changelog's **Updating.** note says the assistant fixes what the check names; `/wong-sync`'s plan lists it.
- [A tool resolves packages differently through the linked folder, so a gate fails for the wrong reason] → A gate must name its sample to count as caught, so a wrong-reason failure shows as `passed a bad sample`. The script's own tests use stand-in commands, since the Payload job installs no app packages; the real tools run in the `test` check of this change itself, which touches settings, and of every later one that does.
- [The Skills API workspace edits the same Worker tests] → The helper is additive and each fix is local; whichever lands second takes main in and reruns the type check.
- [The floor fails a change in flight that tests less than it adds] → That is the floor working; 92 leaves 0.88 of a point and 89 a full point.

## Migration Plan

Nothing to migrate. Removing `tsc -b` from the `test` script, the `test:checks` script and the two overrides restores today's behaviour.
