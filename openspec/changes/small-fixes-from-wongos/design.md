# Design

## Context

Each item already runs in WongOS and sits on its difference list (`/root/WongOS/scripts/wongstack-differences.json`). The port takes WongOS's version, drops every `WongOS:` comment and WongOS name, and fits it to WongStack's tests. See proposal.md for the why.

## Goals / Non-Goals

**Goals:** each item behaves as in WongOS, with WongStack's tests covering it, so the next WongOS sync can drop the matching entries.

**Non-Goals:** WongOS's email launcher (`app/scripts/email-workspace.ts`) stays in WongOS; no safe-area padding work in the starter layout.

## Decisions

- **Tagged opener.** `workspace.mjs` gains `--label key=value`, checked against `^[a-z][a-z0-9-]{0,39}=[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$` before the brief is read, and passed to `paseo run --label`. The private `open(flags, env)` becomes the exported `openWorkspace(flags, env = process.env, { cwd = process.cwd() } = {})`, and `primaryWorktree(cwd)` passes `cwd` to `primaryRoot`. The CLI calls `openWorkspace`. This is WongOS's code as is, so the WongOS entry becomes `matches`.
- **Settings copy in the secrets script, not a second setup command.** WongOS added an inline `node -e` before the secrets seed. WongStack instead copies `.claude/settings.local.json` in `worktree-secrets.mjs seed`: copy only when the primary has it, the workspace has none, and git ignores it; mode 0600. It is not added to the secrets baseline, so `status` and `promote` never touch it. `seed` reports it under a new `settings` field. `paseo.json` stays one command. WongOS's `paseo.json` entry then becomes drift for its sync to drop. Alternative: copy WongOS's inline command; rejected, because it is untested and duplicates the copy logic.
- **Deployment on the head commit.** `deploy.yml`'s preview-record step sets `SHA: ${{ github.event.pull_request.head.sha || github.sha }}` and posts `ref="$SHA"`. On a push, `github.sha` is already the head; on a fork pull request, `github.sha` is the merge commit, which `preview-url.sh` (looking up `deployments?sha=<head>`) never asks for. `deploy-workflow.test.mjs` asserts the step uses the head commit.
- **Home screen.** `app/index.html` adds `viewport-fit=cover` to the viewport and `<meta name="apple-mobile-web-app-capable" content="yes" />`, and keeps `<title>Your apps</title>`. iOS keeps its status bar opaque in this mode, so the top bar is not under it; no layout change.
- **Lessons.** `kept-checks.md` gets WongOS's "names sample data" bullet as is (`schema/seed.sql` ships). The date-field lesson becomes one evidence-rule bullet in `.agents/skills/verify/references/walkthrough.md`, with no tool version number; the walkthrough wiki page is at 2,997 words.
- **Tests.** Port WongOS's added asserts in `start.test.ts` and the Go-key test in `hello/App.test.tsx`, without the WongOS name and navigation asserts.

## Risks / Trade-offs

- [A person's local settings file holds an allow list they may not want copied] → it is their own file on their own computer, and Paseo opens each workspace for the same person; a workspace's own copy is never overwritten.
- [The skill-text budget] → the walk guide gains about 30 words; run `measure-context.mjs --check`.
- [Another release numbers first] → `/ship` renumbers; publish after any WongStack part in flight, by [WongOS's parity page](/root/WongOS/wiki/stack/wongstack-parity.md).
