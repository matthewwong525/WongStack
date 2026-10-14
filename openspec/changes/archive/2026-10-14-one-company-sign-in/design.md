# Design

## Context

See proposal.md for why. Today:

- **The employee client signs in with Cloudflare Access.** `scripts/employee-bootstrap.mjs` gets the token from `cloudflared access token -app=<origin>`. That command is non-interactive and reads a session that lasts `720h` (`private-access.mjs:135`). The client sends it as `cf-access-token`, and the Access edge turns that header into `Cf-Access-Jwt-Assertion`.
- **The Worker already verifies Access tokens.** `getAccessIdentity` in `app/worker/access.ts` checks RS256 against the team certs, plus `aud`, `iss` and `exp`. It accepts the assertion header or the `CF_Authorization` cookie. The cookie holds the same app token that `cloudflared access token` returns.
- **Memory checks its own key.** `/_memory/*` is the one route that skips the edge wall (`private-access.mjs:136`). There, `memory-worker.mjs` checks a bearer memory key against `memory_keys`, and rows are owned by `owner_machine_id`. The live store has one active machine, `261649d2…`, labelled `matthewwong525@gmail.com`.
- **Git already goes through the app.** `/api/access/code/git/` in `app/worker/employee-access/code.ts` proxies upload-pack and receive-pack to GitHub or Artifacts. It sits behind the edge wall, though, so only `projectGit` can use it, by injecting `http.<url>.extraHeader` through `GIT_CONFIG_*` env. A plain `git fetch`, which Paseo runs in the background, is redirected to the Access login and fails.
- **The paused branch `installation-owned-memory-devices`** (draft PR #242) builds machine-owned credentials, the opposite model.

## Goals / Non-Goals

**Goals:**

- One Access session per person serves company actions, memory and git.
- Plain git works for any tool, with no secret written to disk.

**Non-Goals:**

- Changing Paseo.
- Changing push rules.
- Memory on staging.
- An Access identity provider other than the one configured.

## Decisions

### 1. The Worker verifies the app token on two bypassed routes

`/_memory/*` and `/api/access/code/git/*` both skip the edge wall. On both, the Worker verifies the app token itself with the existing `getAccessIdentity`, extended to read it from:

- `cf-access-token` (memory), and
- an HTTP Basic password (git; the username is ignored).

Any other caller gets 401.

*Alternative:* keep git behind the edge and teach git to send `cf-access-token`. Git's credential protocol only yields `Authorization`, and a static `extraHeader` would put a 30-day token in `.git/config`. Rejected.

*Alternative:* a `git-remote-wong::` remote helper. It needs a binary on Paseo's daemon `PATH`, which is fragile. Rejected.

### 2. A git credential helper by absolute path

Setup writes this into the copy's `.git/config`:

```
credential.https://<host>/api/access/code/git.helper = !"<node>" "<copy>/scripts/company-git-credential.mjs"
credential.https://<host>/api/access/code/git.useHttpPath = true
```

Both paths are absolute, so it works under any daemon `PATH`. Setup first writes an empty `credential.https://<host>/api/access/code/git.helper =` entry, which clears any global helper (`osxkeychain`, `manager`, `store`) for this one address. Otherwise git would hand the token to those helpers to store after a successful fetch. On `get`, the helper runs `cloudflared access token -app=<origin>` and checks the token is for the saved identity and not expired. It returns `username=x-access` and `password=<token>`, and it ignores `store` and `erase`. When there is no valid token, it prints nothing, and git fails with the Worker's 401 body, which names the sign-in step. The helper never runs `access login`, so it never blocks.

`projectGit` drops its header injection and uses the same path, which leaves one way in.

### 3. Pull on chat start only in a teammate's copy

`session-start.mjs` detects the app route with `delivery-route.mjs` (`routeOf === 'app'`). On the published branch with a clean tree and no commits ahead, it spawns a detached `git pull --ff-only`. That is the same rule as `projectCopy`. The owner's GitHub-linked copy is never touched.

### 4. Memory identity is the Access subject

The rows get a new `owner_subject` column (migration `0008`), with the email kept for display. The Worker derives a memory role on each call from the existing employee-access policy:

| Who | Memory role |
|---|---|
| The owner, or the Admin role | `admin` |
| Holds the `code` key | `member` |
| Any other allowed person | `reader` |
| A service token named `memory-schedule:<name>` | `team` |

`team` reads shared facts only and writes shared facts with no owner. The member and reader statement rewriting in `statements.mjs` switches from `machine_id` to `owner_subject`. The `CLOUDFLARE_API_TOKEN` admin path to D1 stays for owner jobs.

*Alternative:* key ownership on email. Rejected: an email can change at the identity provider, but the subject can't.

### 5. Migration moves linked machines' notes

`memory.mjs migrate-people` runs during the owner's update and needs the admin API token.

1. **Move the notes.** For each `memory_keys` row with a `login_identity`, it sets `owner_subject` on that machine's facts and sessions. The ownership triggers allow a one-time null → subject write.
2. **Leave the rest admin-only.** Unlinked machines' rows keep `owner_subject` null, which the Worker treats as admin-only. `memory.mjs assign <machine> <email>` handles them later.
3. **Turn off old keys.** It sets `expires_at` on every key in one statement, only after the move commits.

The step is idempotent: reruns skip moved rows.

### 6. Expiry warning and offline fallback

The client decodes `exp` locally from the token, without verifying it, only for display. When fewer than 5 days remain, the digest's first line warns and prints the sign-in link. Getting that link needs `cloudflared access login`, so the digest only names the command the assistant runs to show it.

With no valid token:

- the cached digest loads,
- spooled writes wait (the existing "A write that cannot reach the store waits"), and
- `company-api.mjs` failures attach the sign-in notice.

### 7. Setup message and report

`prompt.ts`'s `setupMessage` takes the business name from `.wong-stack.json` / app config. It says *"This file signs me in to <Business> and downloads our project; read it first if you like."*

`employee-bootstrap.mjs install` does three new things:

- installs the git helper,
- confirms memory with one `/_memory/caller` call, and
- prints a plain summary.

The `next` command field is dropped.

### 8. Publish through the app

The key registry gives Project code (`code`) the levels `["read", "write"]`. Access shows `write` as the *Can publish* tick, which needs install. `everyKey()` already gives the owner and the verification token the top level, and Admins get it too.

A new route, `POST /api/access/code/change/publish`, runs behind the same sign-in. It takes `{branch, sha}` and does the following:

1. Checks that the caller holds `code:write` now, using `holds(level, "write")`.
2. Re-reads the change's checks for that exact `sha`, and refuses unless every check has passed.
3. Publishes:
   - **GitHub:** it merges the pull request with the `WONG_CODE_WRITE` key, by squash. The PAT gains the *Pull requests: write* and *Contents: write* permissions it already needs for saving.
   - **Cloudflare:** it fast-forwards `main` on the Artifacts repo to that `sha` with a write-scoped token.
4. Records the publisher in the merge message.

The git route keeps refusing every push to the published branch, so a push can never skip the checks.

In an app copy, `ship.mjs` replaces its `APP_NEXT` stop with this:

- **With the publish tick:** archive, `/save`, wait for checks, then `app-change.mjs publish`.
- **Without it:** today's message.

*Alternative:* let a ticked person push to `main`. Rejected, because a push skips the checks and the app could no longer tell a publish from a mistake.

### 9. Retire the paused work

PR #242 is closed with a comment linking this change, and its branch is kept. Ideas carried over:

- Transcripts stay owner-only.
- A copied folder opens nothing.
- Revocation is immediate.

The rest is dropped.

## Risks / Trade-offs

- **[Risk] The `cloudflared` app token might not verify in the Worker** (different `aud` or claims) → First task: verify on staging for git, then on the live app's `/_memory/caller`. If it fails, stop and re-plan before anything else.
- **[Risk] Opening two routes past the edge wall widens the Worker's own job** → Each route verifies before any other work. Tests send anonymous, wrong-`aud`, expired and service-token requests.
- **[Risk] Turning off old keys locks out a computer that never signed in** → The update report lists those machines. Their next chat shows the sign-in link, since memory falls back to the cached digest.
- **[Risk] A 30-day session can't be renewed unattended** → The 5-day warning, and a cached digest after it runs out.
- **[Trade-off] Large clones go through the Worker** → Responses are already streamed, never held.

## Migration Plan

1. Deploy the Worker. It accepts the sign-in on both routes and still accepts memory keys.
2. The owner runs the update. It signs the owner in, runs `migrate-people`, and turns off the keys.
3. The next release removes key acceptance from the Worker.

For other installs, `/wong-sync` runs the same steps. Rollback before step 2 is a redeploy. After step 2, keys must be reissued.

## Open Questions

- The exact Access policy for `memory-schedule:` service tokens: per schedule, or one policy listing them. Either fits the spec.
