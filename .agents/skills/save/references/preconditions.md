# Git preconditions

`/save`, `/continue`, `/ship`: [`delivery-route.mjs`](../scripts/delivery-route.mjs) prints `artifacts` → no `gh`: [that route](../../../../wiki/stack/artifacts-route.md#how-the-verbs-differ). `app` → no `gh`, app sign-in only: [its route](../../../../wiki/stack/employee-project.md#how-the-verbs-differ). Otherwise check GitHub once:

| Check | Fails when | Fix |
|---|---|---|
| `gh auth status` | signed out | `gh auth login` |
| `git remote get-url origin` | no `origin` | `gh repo create --source . --remote origin` (new) or `git remote add origin <url>` |
| `openspec --version` | not installed | `npm install -g @fission-ai/openspec@1.13.2` |

Why: [required tools](../../../../wiki/development/required-tools.md). [The git gate](git-gate.md) sends `gh pr view` failures here.
