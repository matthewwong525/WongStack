# Git preconditions

`/save`, `/continue`, and `/ship` run these three checks before their first git or GitHub action. A failed check stops the verb and gives the user its fix. Do not continue on a guess: a signed-out `gh` looks like "no PR", and a missing `origin` looks like "nothing pushed".

| Check | Fails when | Fix |
|---|---|---|
| `gh auth status` | `gh` is signed out or its token expired | `gh auth login` |
| `git remote get-url origin` | the repository has no `origin` | `gh repo create --source . --remote origin` for a new GitHub repository, or `git remote add origin <url>` for one that exists |
| `openspec --version` | the OpenSpec CLI is not installed | `npm install -g @fission-ai/openspec@1.8.0` |

Run each check once per verb, not before each command. [Required tools](../../../../wiki/development/required-tools.md) owns why each tool is needed; [the git gate](git-gate.md) reads a `gh pr view` failure against this page.
