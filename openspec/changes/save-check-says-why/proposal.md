# A failed save says why

**Status:** in-progress
**Branch:** save-check-says-why
**Open questions:** none

## Why

When a teammate saves a change through the app and GitHub turns it down, or can't be reached, Git shows only *the requested URL returned error: 503*. The app's own words never reach the screen, and nothing is written down, so nobody can tell a bad key from an outage. A real install hit this and lost time guessing.

## What Changes

- **A failed save names the place and what it answered.** Git prints one line instead of a bare error number: *The app could not finish this save (GitHub answered 403). Try again, or ask the owner to look.* The reason is only the place, an answer's number, or *could not be reached* or *its answer could not be read*: never the place's own words or a key. A project kept in Cloudflare reads the same with *Cloudflare*.
  | What went wrong | What Git prints, in brackets |
  |---|---|
  | GitHub turned the key down | *GitHub answered 401* (or 403, 404) |
  | GitHub was down or slow | *GitHub could not be reached* |
  | GitHub's answer came back broken | *GitHub's answer could not be read* |
  | Cloudflare gave the app no key to save with | *Cloudflare gave no key to save with* |
- **The app writes one log line per failed save.** It names who saved, the branch, the step that failed, the answer's number, and the error's kind, so the owner finds it by searching the app's logs for `code_save_failed`. It never holds a key, a sign-in or the place's own words.
- **The owner's page says what to do for each.** A turned-down key: save a new one. Can't be reached: try again, then tell the owner. A broken answer: tell the owner.

Non-goals: downloading the project keeps its one generic answer; publishing and reading a saved change are unchanged.

## Capabilities

### New Capabilities

### Modified Capabilities
- `employee-onboarding`: a save that fails upstream names the place and its answer, and leaves one log line.

## Impact

- `app/worker/employee-access/code.ts`: the save path keeps the failure's step, status and error; a failed save answers in Git's words and logs `code_save_failed`. `codeGit` takes who is saving.
- `app/worker/employee-access/router.ts`: passes who is saving.
- `app/worker/employee-access/code.test.ts`: each failure's line and log.
- `wiki/stack/employee-project.md`, `wiki/stack/project-git-route.md`: the new lines and what to do.
- Installs get it by their next sync, so a `CHANGELOG.md` `## Next (patch)` entry.

## Decision log

- **2026-10-28** — Assumed: only saving says why; downloading keeps its one generic answer, because the request was about refused saves, and a download failure has the same causes the save line now names.
- **2026-10-28** — Assumed: the line names the place, a status number, or one of three fixed phrases, never the place's text, because the old rule (no upstream words leave) guarded against leaking a key or a message; a number and a fixed phrase carry neither.
- **2026-10-28** — Assumed: the line says *could not finish this save*, not *nothing was saved*, because when GitHub's answer can't be read after the push went on, the change may already be there.
- **2026-10-28** — Assumed: the log line keeps the error's kind and a 120-character message, but only the kind for a parse error, because a parse error quotes the answer it failed on.
- **2026-10-28** — Assumed: this is a `patch` release, because it changes only the words of a failure and adds a log line.
- **2026-10-28** — Built: the local pre-check passed except `view-page.test.mjs`'s time-limit test, which reads this device's clock and fails on `main` too; this change touches no file it reads, so the online checks decide.
- **2026-10-28** — Saved for review, built and checked locally; asked for by another agent to stop at the preview, so publishing waits for the owner.
