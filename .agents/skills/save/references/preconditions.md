# Git preconditions

[Hosted](../../../../wiki/stack/hosted-workspaces.md#detect-the-route-first): context/origin/OpenSpec without `gh`. Personal routes check below once; failure stops with its fix.

| Check | Fails when | Fix |
|---|---|---|
| `gh auth status` | signed out, or token expired | `gh auth login` |
| `git remote get-url origin` | no `origin` remote | `gh repo create --source . --remote origin` (new GitHub repository) or `git remote add origin <url>` (existing) |
| `openspec --version` | OpenSpec CLI not installed | `npm install -g @fission-ai/openspec@1.13.2` |

Why each is needed: [required tools](../../../../wiki/development/required-tools.md). [The git gate](git-gate.md) sends `gh pr view` failures here.
