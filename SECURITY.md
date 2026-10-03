# Security

Report a vulnerability privately, not in a public issue. Use GitHub's [private vulnerability reporting](https://github.com/matthewwong525/WongStack/security/advisories/new) for this repository. Say what you found, how to reproduce it, and which release you used.

## What each Cloudflare token can do

WongStack uses two provider tokens and private machine credentials. Each has its own storage boundary; only the user token can make other tokens.

| Credential | Stored in | What it can do |
|---|---|---|
| User token (`CLOUDFLARE_API_TOKEN` in `.env`) | The git-ignored `.env` of the primary worktree, on your computer only | Mint and edit tokens, and grant itself more permissions. Setup widens it only to the groups each step needs. Treat it like a root password. |
| CI deploy token (`<repo>-deploy`) | The GitHub secret `CLOUDFLARE_API_TOKEN`, and nowhere else | `Workers Scripts Write`, `D1 Write`, and `Account Settings Read` on your account. It cannot mint tokens or change Access. |
| Machine private key and rotating bearer | Private OS-user state outside git and `.env`, bound to one installation and machine grant | Read its own private memory and permitted shared work. Raw transcripts stay owner-only unless an explicit installation data-admin grant permits access. Provider tokens, email and GitHub membership do not authorize ordinary memory calls. Admission requires verified trusted setup. |

The Cloudflare account ID in [`.agents/.wong-stack.json`](.agents/.wong-stack.json) is an identifier, not a secret. It grants no access without a token.

The CI deploy token's `Workers Scripts Write` and `D1 Write` cover the whole account, because Cloudflare cannot narrow them further. A leaked deploy token could replace the production Worker, which also serves memory, or read a memory database, so rotate it as soon as you suspect a leak. Privileged Worker core code can read the memory bindings, so a bug there could expose transcripts. Ordinary mini-app environments strip every `MEMORY_*` binding and pin.

[The credentials page](wiki/stack/cloudflare-credentials.md) owns the details, including how to narrow the user token and how to rotate the deploy token. [The memory page](wiki/development/memory-key.md) owns private machine credentials and the trusted setup boundary.
