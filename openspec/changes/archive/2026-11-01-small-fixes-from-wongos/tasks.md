## 1. Scripts

- [x] 1.1 `workspace.mjs`: add `--label` with its safe pattern, export `openWorkspace(flags, env, { cwd })`, pass `cwd` to `primaryRoot`, and pass the label to `paseo run`.
- [x] 1.2 `scripts/tests/workspace.test.mjs`: `runArgs` adds `--label` before `--mode`; an unsafe label is refused before anything opens; `openWorkspace` is exported.
- [x] 1.3 `worktree-secrets.mjs seed`: copy `.claude/settings.local.json` once when the primary has it, the workspace has none, and git ignores it; mode 0600; report it in `settings`; keep it out of the baseline.
- [x] 1.4 `scripts/tests/worktree-secrets.test.mjs`: copied when missing, kept when present, none when the primary has none, and never listed by `status`.

## 2. CI and app

- [x] 2.1 `app/index.html`: `viewport-fit=cover` and `apple-mobile-web-app-capable`; title unchanged.
- [x] 2.2 `app/worker/employee-access/start.test.ts`: the first import writes no key grants or role members, and Admin is the only role.
- [x] 2.3 `app/src/apps/hello/App.test.tsx`: the phone keyboard's Go key submits the form; add an assert that `index.html` carries both home-screen settings where the app's tests read it, or in a script test.

## 3. Docs and release

- [x] 3.1 `wiki/development/kept-checks.md`: add the sample-data bullet.
- [x] 3.2 `.agents/skills/verify/references/walkthrough.md`: add the date-field re-read bullet to the evidence rules.
- [x] 3.3 `CHANGELOG.md`: a `## Next (minor) — Small fixes from WongOS` entry, with an **Updating.** note that a repo with its own `paseo.json` needs nothing new.

## 4. Verification

- [x] 4.1 Run `node .github/scripts/checks.mjs --worktree` and fix what it reports.
- [x] 4.2 `/save`; CI passes on the pull request.
