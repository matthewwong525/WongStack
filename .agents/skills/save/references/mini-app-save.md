# Mini-app save

Load when the session built or changed a mini app. A mini app has no OpenSpec change and no branch of its own: its folder on the default branch and the app list at `/apps/` are the record. [Mini apps](../../../../wiki/stack/mini-apps.md) owns the layout.

Follow the main save procedure's credential exclusion before every commit and publication.

## The direct route — straight to the default branch

Take it when every changed path is inside one app's folder, `mini-apps/apps/<name>/`, and every commit ahead of the default branch touches only that folder. It is the second direct route beside [the prose save](prose-save.md), with the same limits.

1. **Commit** only the folder's paths, with `feat(mini): <name> — <what changed>` and the usual trailer. Do not switch a dirty checkout or overwrite another worktree to make the route fit.
2. **Test and push** with the script. It runs the app's tests on this host, the gate for this route, because there is no pull request for CI to gate. Then it pushes, and when the default branch moved, it rebases once, tests again, and pushes again. It never forces a push:

   ```bash
   bash "$(git rev-parse --show-toplevel)/.claude/skills/save/scripts/mini-app-push.sh" "<name>" main
   ```

   Pass the resolved default branch. Read its exit code:

   | Exit | Meaning | Next |
   |---|---|---|
   | 0 | pushed (`rebased=yes` when it retried) | report below |
   | 1 | the app's tests failed; nothing pushed | report the failing test and stop |
   | 3 | `reason=` outside, refused, rebase-conflict, tests-after-rebase, or second-push | take the fallback below |

Report in two lines: the commit on the default branch, and that the app goes live on production at `/apps/<name>/`, with production data, once CI deploys. Print no `SAVE_GATE_RESULT` line; nothing waited. CI on the default branch runs the app's tests again, skips the main app's suite, and builds and deploys the main app's Worker, which serves the app.

## The fallback — a pull request

A changed path outside the app's folder — a migration under `schema/migrations/`, a file in `app/`, or a shared file under `mini-apps/` such as `router.mjs` — or a rejected push takes save's normal route: a feature branch, a commit, and a pull request, with the gate that [the git gate](git-gate.md) owns. There is still no OpenSpec change. Build the body with [the body renderer](../scripts/render-pr-body.mjs) in its `mini-app` mode:

```bash
node "$ROOT/.claude/skills/save/scripts/render-pr-body.mjs" \
  --change-root "mini-apps/apps/<name>" --mode mini-app \
  --repo-url "$REPO_URL" --branch "$BRANCH" \
  --summary-file "$SUMMARY_FILE" --output "$BODY_FILE"
```

The summary says what the app does and what data it writes; pass `--preview-url` when you have one. End with the usual report and exactly one `SAVE_GATE_RESULT=` line. [`/ship`](../../ship/SKILL.md#merge-a-mini-app-pull-request) merges it with no archive and no walk.
