# Git preconditions

`/save`, `/apply`'s [pick-up](../../apply/references/pick-up.md), `/ship`: [`delivery-route.mjs`](../scripts/delivery-route.mjs) prints `artifacts` → no `gh`: [that route](https://github.com/matthewwong525/WongStack/blob/main/wiki/stack/artifacts-route.md#how-the-verbs-differ). `app` → no `gh`, app sign-in only: [its route](https://github.com/matthewwong525/WongStack/blob/main/wiki/stack/employee-project.md#how-the-verbs-differ). `local` → check only `openspec`. Otherwise check GitHub once:

| Check | Fails when | Fix |
|---|---|---|
| `gh auth status` | signed out | `gh auth login` |
| `git remote get-url origin` | no `origin` | `gh repo create --source . --remote origin` (new) or `git remote add origin <url>` |
| `openspec --version` | not installed | `npm install -g @fission-ai/openspec@1.13.2` |

[The git gate](git-gate.md) sends `gh pr view` failures here.
