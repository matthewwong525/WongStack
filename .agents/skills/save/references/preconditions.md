# Git preconditions

`/save`, `/continue`, and `/ship` run these checks once, before their first git or GitHub action. A failed check stops the verb with its fix. Never guess: a signed-out `gh` looks like "no PR", and a missing `origin` like "nothing pushed".

| Check | Fails when | Fix |
|---|---|---|
| `gh auth status` | signed out, or token expired | `gh auth login` |
| `git remote get-url origin` | no `origin` remote | `gh repo create --source . --remote origin` (new GitHub repository) or `git remote add origin <url>` (existing) |
| `openspec --version` | OpenSpec CLI not installed | `npm install -g @fission-ai/openspec@1.13.2` |

Why each is needed: [required tools](../../../../wiki/development/required-tools.md). [The git gate](git-gate.md) applies this page to `gh pr view` failures.
