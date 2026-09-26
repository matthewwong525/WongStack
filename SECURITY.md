# Security

Report a vulnerability privately, not in a public issue. Use GitHub's [private vulnerability reporting](https://github.com/matthewwong525/WongStack/security/advisories/new) for this repository. Say what you found, how to reproduce it, and which release you used.

## What each Cloudflare token can do

WongStack uses three Cloudflare tokens. Each one lives in one place, and only one of them can make other tokens.

| Token | Stored in | What it can do |
|---|---|---|
| User token (`CLOUDFLARE_API_TOKEN` in `.env`) | The git-ignored `.env` of the primary worktree, on your computer only | Mint and edit tokens, and grant itself more permissions. Setup widens it only to the groups each step needs. Treat it like a root password. |
| CI deploy token (`<repo>-deploy`) | The GitHub secret `CLOUDFLARE_API_TOKEN`, and nowhere else | `Workers Scripts Write`, `D1 Write`, and `Account Settings Read` on your account. It cannot mint tokens or change Access. |
| Memory key (`CLOUDFLARE_MEMORY_TOKEN`) | The git-ignored `.env` | Not a Cloudflare token. It opens one repo's memory store through the account's memory Worker, and nothing else. An admin key reads every transcript in that store; a member key reads only its own. It is never a GitHub secret. |

The Cloudflare account ID in [`.agents/.wong-stack.json`](.agents/.wong-stack.json) is an identifier, not a secret. It grants no access without a token.

The CI deploy token's `Workers Scripts Write` and `D1 Write` cover the whole account, because Cloudflare cannot narrow them further. A leaked deploy token could replace the memory Worker or read a memory database, so rotate it as soon as you suspect a leak.

[The credentials page](wiki/stack/cloudflare-credentials.md) owns the details, including how to narrow the user token and how to rotate the deploy token. [The memory page](wiki/development/memory.md#the-memory-token) owns the memory key.
