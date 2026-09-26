# Mini-app save

Load when the session built or changed a mini app. A mini app has no OpenSpec change and no branch of its own: its folder on the default branch and the dashboard are the record. [Mini apps](../../../../wiki/stack/mini-apps.md) owns the layout.

Follow the main save procedure's credential exclusion before every commit and publication.

## The direct route — straight to the default branch

Take it when every changed path is inside one app's folder, `mini-apps/apps/<name>/`, and every commit ahead of the default branch touches only that folder. It is the second direct route beside [the prose save](prose-save.md), with the same limits.

1. **Run the app's tests on this host.** It is the gate for this route, because there is no pull request for CI to gate:

   ```bash
   (cd "mini-apps/apps/<name>" && node --test)
   ```

   A failing test stops the save: report it, and push nothing. A folder with no test file says so in the report and goes on.
2. **Commit** only the folder's paths, never the generated `index.html` or `routes.gen.ts`, with `feat(mini): <name> — <what changed>` and the usual trailer.
3. **Push** `git push origin HEAD:main`, using the resolved default branch. Do not switch a dirty checkout or overwrite another worktree to make the route fit.

A rejected push — protection with no bypass, required review, or a branch that moved — is never forced or retried. Take the fallback below.

Report in two lines: the commit on the default branch, and that the app goes live on production at its production URL, with production data, once CI deploys. Print no `SAVE_GATE_RESULT` line; nothing waited. CI on the default branch runs the app's tests again and deploys only the production mini Worker.

## The fallback — a pull request

A changed path outside the app's folder — a migration under `schema/migrations/`, `mini-apps/worker.ts`, or `mini-apps/wrangler.jsonc` — or a rejected push takes save's normal route: a feature branch, a commit, and a pull request, with the gate that [the git gate](git-gate.md) owns. There is still no OpenSpec change. Build the body with [the body renderer](../scripts/render-pr-body.mjs) in its `mini-app` mode:

```bash
node "$ROOT/.claude/skills/save/scripts/render-pr-body.mjs" \
  --change-root "mini-apps/apps/<name>" --mode mini-app \
  --repo-url "$REPO_URL" --branch "$BRANCH" \
  --summary-file "$SUMMARY_FILE" --output "$BODY_FILE"
```

The summary says what the app does and what data it writes; pass `--preview-url` when you have one. End with the usual report and exactly one `SAVE_GATE_RESULT=` line. [`/ship`](../../ship/SKILL.md#merge-a-mini-app-pull-request) merges it with no archive and no walk.
