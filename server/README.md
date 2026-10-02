# Server setup

`setup.sh` turns a fresh Ubuntu 24.04 server into a workspace where agents work: a workspace user, the tools, and Paseo. [`install-wongstack.mjs`](#install-wongstack-into-a-repo) then installs WongStack into a person's repo there. Run either by hand on any server, or let a host run them for you. A host such as wongstack.com also runs [the agent](#the-agent), which takes its requests on the server. This page is the contract a host relies on, so a host can run WongStack's scripts and agent, or your fork's, without reading them.

## Run it

```bash
git clone https://github.com/matthewwong525/WongStack.git
sudo bash WongStack/server/setup.sh
```

It asks nothing and takes several minutes. It is safe to run again.

## The input

| Variable | Default | What it sets |
| --- | --- | --- |
| `WORKSPACE_USER` | `wong` | The user that owns the tools, the browser, and Paseo. The script creates it when it does not exist. |

## The end state

After a zero exit:

- `node` (the Node.js major CI's .nvmrc names), `git`, `gh`, `openspec`, `paseo`, `claude`, `codex`, `opencode`, `agent-browser`, and `cloudflared` are on the workspace user's path.
- agent-browser's Chrome is in the workspace user's home, with the sandbox on.
- `cloudflared` runs only while a hand-over's link is open, never as a service.
- `paseo.service` runs `paseo daemon run` as the workspace user, on `127.0.0.1:6767`.

The script checks this itself last. When a check fails, it prints `missing: <name>` and exits non-zero. Any failed command earlier also stops it with a non-zero exit.

Then sign in as the workspace user: `gh auth login`, `claude`, and pair a device with `paseo daemon pair`. [Paseo](https://paseo.sh) owns pairing.

## What it never does

- It opens no inbound port. Paseo listens on `127.0.0.1` only and reaches your devices through its relay.
- It reads and writes no secret. Logins happen after, as the workspace user.
- It never writes under `/etc/wongstack` or `/opt/wongstack`. Those paths belong to a host, for its own agent and token.

## Install WongStack into a repo

`install-wongstack.mjs` installs WongStack into a person's empty GitHub repo with no question: the payload, the app's Cloudflare hosting, and memory, then one commit on `main`, pushed. Last, it adds WongStack's agent presets to the workspace user's Paseo with [`presets.mjs`](../.agents/skills/routine/scripts/presets.mjs), when Paseo is set up. A failure there goes to stderr and never changes the last line. It installs the clone it runs from, so the version is the commit you checked out, and a fork installs itself.

### Run it

As the workspace user, clone the source at the commit you pin, clone the person's repo into `~/<name>`, then run the installer with the job on stdin:

```bash
git clone https://github.com/matthewwong525/WongStack.git ~/.cache/wong-stack/WongStack
git -C ~/.cache/wong-stack/WongStack checkout -q --detach <commit>
gh repo clone <owner>/<name> ~/<name>
node ~/.cache/wong-stack/WongStack/server/install-wongstack.mjs < job.json
```

Keep the source at `~/.cache/wong-stack/WongStack`: the install record names that path, and `/wong-sync` updates from it later.

### The job

A JSON object on stdin, never in arguments, since anyone on the server can read a process's arguments:

| Field | What it is |
| --- | --- |
| `token` | The person's Cloudflare user token, made with the two rows on [the credentials page](../wiki/stack/cloudflare-credentials.md#create-the-token). |
| `accountId` | The Cloudflare account to use: 32 hex characters. |
| `repo` | The GitHub repo, as `owner/name`. The installer works in `~/<name>`. |
| `ownerEmail` | The authenticated cloud owner's verified reachable email, independent of git authorship. Missing, synthetic, and GitHub noreply identities stop older jobs with an upgrade/reconnect reason. |
| `managementResult` | Optional version-1 private handoff described below; a trusted host supplies it for cloud-managed workspaces. |
| `openWithoutLogin` | Optional; `true` asks for [the open finish](#the-open-finish). Without it, an account Cloudflare holds back from Zero Trust stops the install with `cloudflare`. |

### The open finish

Cloudflare turns on Zero Trust, the email login, only once the account has a payment method. With `openWithoutLogin: true`, an install on an account without one goes on: the app goes live with the login off, its committed `app/wrangler.jsonc` carries `"WORKSPACE_LOGIN": "off"`, and the last line is `done`. Only that refusal opens it: an outage, any later Access error, or a site that already has the login still stops the install.

Run it again after the card is added, on the installed repo: it makes the login, turns `app/wrangler.jsonc` private, and writes the restricted result. It leaves that edit uncommitted in `~/<name>` for the person's assistant to publish, and never commits or pushes over their work. Until then the Worker stays open, not broken. Still no card: it finishes open again and changes no file.

### The private management result

The trusted host supplies this object on stdin, with string recipient IDs and a positive integer generation. The path is exactly `<workspace user's HOME>/.local/state/wongstack/access-results/<jobId>.json`; it must be outside both repositories, with no symlink. Cleanup IDs are previously recorded account-owned management tokens for this connection and account, never names or user-token IDs.

```json
{
  "version": 1,
  "recipient": { "ownerId": "owner-1", "vmId": "vm-1", "jobId": "job-1", "connectionId": "connection-1", "generation": 1 },
  "path": "/home/wong/.local/state/wongstack/access-results/job-1.json",
  "cleanupTokenIds": []
}
```

Before publishing content, the installer validates the recipient/path and any existing result's job, target, owner, account, and source. After private provisioning succeeds, or [finishes open](#the-open-finish), it atomically writes a bounded (16 KiB) regular result file, mode 0600, inside a workspace-user-owned directory mode 0700. The result contains:

| Field | Contract |
| --- | --- |
| `version`, `recipient` | Version 1 and the exact trusted host recipient. |
| `source` | `{repo, commit}` from the actual checked-out GitHub origin and 40-character HEAD; normalize HTTPS/SSH to `owner/name`, compare repository identities case-insensitively. |
| `accountId`, `repo`, `ownerEmail` | The selected account, target GitHub repository, and normalized verified login email. |
| `appId`, `aud`, `teamDomain`, `anchorHostname` | Owned app identity, audience, Zero Trust hostname, and exact production default `workers.dev` login anchor. |
| `policyIds` | `{human, machine}` IDs for separate owned exact-email allow and service-auth policies. |
| `workers` | `{production: {id, name}, staging: {id, name}}` with actual Worker IDs. |
| `sessionDuration` | The application session duration: new app/human defaults are `720h`; reviewed shorter app or human-policy settings stay separate. |
| `tokenId`, `token` | Account-owned management token and its private value, with only account-scoped `Access: Apps and Policies Write`. |
| `cleanup` | `{revokedTokenIds, pendingTokenIds}` partitions the requested old account-token IDs by acknowledged deletion and outstanding cleanup. |

An install that [finished open](#the-open-finish) writes the open result instead: exactly `version`, `mode: "open"`, `recipient`, `source`, `accountId`, `repo`, `ownerEmail`, and `anchorHostname`, as above. It mints no management token, carries no Access identifier, token, or cleanup field, and leaves `cleanupTokenIds` alone. A retry of the same job reuses it; a retry after the card replaces it with the restricted result.

Live probing of the single-permission management token allowed Worker metadata listing; Worker content/publication, D1/R2, API-token management, and account-member probes were refused. The cloud provider client uses only its recorded Access resources. Cloudflare grants Access policy writes across the selected account, so the cloud must additionally restrict every action to this owner's recorded app/policy/Worker IDs. Its permission supports this application's session revocation. It has a separate lifetime from human sessions and machine credentials.

The host reads only its exact job-derived file, checks schema, size, ownership, permissions, and regular-file status, then sends it over TLS to `POST /api/agent/jobs/:id/access` with its existing VM bearer credential. Source code never receives that host credential. The cloud authenticates the VM and compares all recipient, owner, target, account, pinned source, and generation fields against its authoritative records before encrypting the restricted token. A successful response contains only `{ok:true, connectionId, generation, state:"pending"}` and uses `Cache-Control: no-store`. Repeated identical delivery is idempotent; mismatched, expired, replaced, or deleted recipients cannot adopt it.

After acknowledgement the host erases the file. A lost receipt retries the same file; unsuccessful delivery leaves it privately available for recovery and reports a separate pending management state. Neither recovery nor delivery uses stdout. Rerunning the same source job reuses its result and token; an interrupted one-time token handoff recovers only the recorded connection's token. The result contains no broad setup token, machine secret, memory key, GitHub credential, or human session.

Cleanup uses fresh transient setup authority and only `DELETE /accounts/<accountId>/tokens/<tokenId>` for recorded restricted connection tokens. Failed or unauthorized cleanup stays pending; removing a local value does not revoke it. Retained Access-only authority never gains token management. Keep the Access app and policies while any live Worker, version, alias, or old preview can serve content; removing the wall requires separately authorized and verified Worker decommissioning.

### What it needs

- `node`, `git`, `gh`, and `openspec` on the path. `setup.sh` installs them.
- `gh` signed in as someone who can set the repo's secrets.
- A git email: `git config --global user.email`. The install commits under it, and the person's admin memory key is made for it. With none, it stops with `repo`.

### The last line

Its last line of output is one word, and it exits 0 only on `done`. The cause goes to stderr, with no token in it.

| Line | Meaning |
| --- | --- |
| `done` | Installed and pushed, or it already was; with [the open finish](#the-open-finish), possibly with the login off. |
| `token` | Cloudflare refused the token, or the token lacks one of its two rows. |
| `repo` | A bad job, no clone at `~/<name>`, a repo with other work, no git email, or the copy failed. |
| `cloudflare` | A Cloudflare call, the memory store, or a GitHub secret failed. |
| `push` | The commit or the push failed. The commit stays. |

When a refused Cloudflare call stopped it, the line before the last names that call, its status, and Cloudflare's error codes, never a query or a token:

```text
Cloudflare PUT /user/tokens/abc: HTTP 403 9109
cloudflare
```

It prints that line only when it matches the exported `CLOUDFLARE_CALL` pattern, so a host can test it the same way before it shows it. An unreachable Cloudflare, or any other stop, prints the reason alone.

### What a host may import

A host that runs the installer may import these names from it, and nothing else:

| Name | What it is |
| --- | --- |
| `run` | Runs a command with no shell; `input` goes to stdin, and `timeout` ends it. A non-zero exit rejects with the output on `stdout`. |
| `jobFolder` | The folder a job works in, or `null` when the job is not a valid one. |
| `repoFolder` | The folder name of an `owner/name` repo, or `null` when it is not safe. |
| `CLOUDFLARE_CALL` | The pattern the refused-call line matches. |
| `setEnv` | Replaces each key's own line in a `.env` file, or adds it, and leaves the file mode 0600. |

Run it again after any stop. It finishes what the last run began and makes no second copy of anything. On a repo it already pushed, it restores `.env` and the secrets and commits nothing; on one it installed open, it may turn the config private, uncommitted.

### What the installer never does

- It never puts a token in an argument, an error, its output, or a commit. The user token, memory key, and separate verification credentials stay in the repo's ignored `.env`, mode 0600. The deploy token goes straight to the GitHub secret; the restricted cloud management token uses only the private result file.
- It never changes a repo that holds work it did not commit.
- It touches only owned resources. A taken name moves the workspace to a free suffix, such as `recipe-box-2`. Its only automatic deletion is acknowledged cleanup of recorded restricted account tokens; the login wall remains in place.
- It never writes under `/etc/wongstack` or `/opt/wongstack`.

Its Cloudflare steps are [the provisioning script](../.agents/skills/wong-setup/scripts/provision.mjs) `/wong-setup` runs, so a fix to one reaches both.

## The agent

`agent/agent.mjs` runs on a host's server as root and takes the host's requests: pair a device, connect GitHub, install WongStack, add a teammate, copy the server. It needs nothing beyond this source and `agent.env`. It imports the installer's names [above](#what-a-host-may-import), and runs [the installer](#install-wongstack-into-a-repo) as the workspace user from a clone pinned to the job's commit.

### What runs it

The host does this at first boot, in order:

1. Unpack this source at the build's commit, root-owned and mode 0755, so the workspace user can read it. wongstack.com uses `/opt/wongstack/source`.
2. Write `/etc/wongstack/agent.env`, mode 0600: `APP_URL`, `AGENT_TOKEN`, `VM_ID`, `SOURCE_REPO`, and `SOURCE_COMMIT`, the 40-character commit it unpacked.
3. Run `server/setup.sh`, with `AGENT_TOKEN` kept out of its environment.
4. Send the setup report (below).
5. On a zero exit, run `node server/agent/agent.mjs` as root under a service that restarts it, with `agent.env` as its environment.

The agent runs that copy for the server's life. Rebuilding the server is the only way it gets a newer agent.

### Contract 3

`agent.mjs` exports `CONTRACT = 3`. Every request carries `Authorization: Bearer <AGENT_TOKEN>` and a JSON body.

**The poll.** Every `interval` seconds (10 by default) the agent sends `POST /api/agent/poll`:

```json
{ "contract": 3, "commit": "<SOURCE_COMMIT, or null when it is not 40 hex>", "paseo": "up" }
```

`paseo` is `up` when `paseo.service` is active, else `down`. The reply is `{ jobs, interval }`, each job `{ id, type, payload }`. A reply without them means no work and the default wait.

**The jobs.** Each job type, its payload, and the `result` a done job returns:

| Type | Payload | Result |
| --- | --- | --- |
| `pair` | none | The Paseo relay pairing link. |
| `suspend` | none | none; stops `paseo.service`. |
| `resume` | none | none; starts `paseo.service`. |
| `artifacts` | [The scoped project handoff](#artifacts-preparation-contract-3), plus optional `githubRepo` for owner import or `legacyRepo` for an already verified migration. | `hosted: { projectId, sourceCommit, verified: true, dir }`; prepares the private repo and global setup skill, preserving local work. No payload or site is installed. |
| `github` | `{ token, repo, name, email, invited }` | none; signs `gh` in, sets git's name and email, clones `repo` once, and sets up Paseo. An `invited` teammate's server accepts the owner's invitation first, or fails with `repo`. |
| `cloudflare` | [The installer's job](#the-job), plus `sourceRepo` and `sourceCommit`, the pinned clone. The agent adds `openWithoutLogin: true` itself. | none; `rolled` says whether it swapped the pasted token's value for one only the server holds. A failure carries the installer's `reason`, and `detail` when the line before it matches `CLOUDFLARE_CALL`. |
| `team-add` | `{ repo, login }` | none; gives the GitHub `login` push access to the owner's `repo`. |
| `team-remove` | `{ repo, login }` | none; withdraws the invitation, removes access, and stops the teammate's memory keys where the repo's memory supports it. |
| `copy-key` | none | The new server's public X25519 key, base64. |
| `copy-send` | `{ copyId, publicKey, port, peer, pullToken }` | none; sends the home folder, locked to `publicKey`, to the one connection from `peer` that proves `pullToken`. |
| `copy-restore` | `{ copyId, host, port, pullToken }` | none; pulls the copy from `host`, unlocks it, and unpacks it as the workspace user. |

A job of any other type is `rejected` and runs nothing. `cloudflare`, `artifacts`, `copy-send`, and `copy-restore` run in the background, one of each type at a time, so the poll goes on around them.

**The job result.** The agent sends `POST /api/agent/jobs/:id` with `{ status, result?, reason?, detail?, rolled?, hosted? }`, where `status` is `done`, `failed`, or `rejected`. For a `cloudflare` job, the host answers `{ ok: true }`, or the agent keeps the outcome and sends it again.

**The access result.** After a `cloudflare` job with a `managementResult`, the agent reads the [private management result](#the-private-management-result), restricted or open, from its exact path, checks it against the job, and sends it to `POST /api/agent/jobs/:id/access`. It keeps a private journal under `/var/lib/wongstack/access-jobs` so a restart resends it rather than installing again.

**The setup report.** The host, not the agent, sends `POST /api/agent/setup?exit=<code>` once after `setup.sh`, with the last 4,000 bytes of its log as `text/plain`.

A change to any of these shapes raises `CONTRACT`. The host supports the new number first; then the source releases it.

**What changed from contract 2.** Contract 3 adds scoped Artifacts preparation and the verified `hosted` acknowledgment. Existing GitHub, Cloudflare and copy job shapes remain compatible. Contracts 1 and 2 receive no Artifacts jobs; the host requests a rebuild first.

**What changed from contract 1 to 2.** The agent asks the installer for [the open finish](#the-open-finish), so a `cloudflare` job on an account without a card ends `done`, and the access result may be the open one. A contract-1 agent never asks, so its server still stops with `cloudflare`, and the host never gets an open result from it.

### What the agent never does

- It never changes its own code: no fetch, replace, or restart onto other code, and no job that names code for it to run.
- It opens no inbound port. The one exception is `copy-send`, which listens on the job's port for the job's peer alone, until one copy is sent.
- It never passes `AGENT_TOKEN` to the installer.
- It never reports installer output beyond the reason word and a line matching `CLOUDFLARE_CALL`, and it logs a job by its id, type, and status alone.

### Change the agent in your fork

Your fork's servers run your fork's agent. Change it as you like, and keep contract 3, or raise `CONTRACT` only once your host supports the new number. A host checks every result against its own records, so an agent that breaks the contract fails its own server's jobs and no one else's.

## Test a change on a real server

The source's tests use a pretend Cloudflare. Before you ship a change to either script, run both for real:

1. Make a fresh Ubuntu 24.04 server, the smallest size, and run `setup.sh` from your branch.
2. As the workspace user, sign in to `gh`, set a git email, and make an empty private repo to install into.
3. Run the installer as [above](#install-wongstack-into-a-repo). Check that it prints `done`, the repo's first deploy passes, the site answers, and `memory.mjs digest` reads through the Worker. Run it again: it prints `done` and changes nothing.
4. Delete the server, the repo, and on Cloudflare the Workers, databases, memory bucket, and `<repo>-deploy` token. Deleting a repo needs `gh auth refresh -s delete_repo` first.

## Your fork is your template

[Make WongStack your own](../wiki/stack/customizing-wongstack.md) covers shared defaults, easy setup from a fork, and the two levels of updates.

Fork WongStack and edit `setup.sh` to change what every server gets: add a tool, pin a version, or remove one you do not use. Keep the contract above, and keep the final check honest. A host that pairs devices needs `paseo`, and removing it breaks chat there. Change the payload, and `install-wongstack.mjs` installs your version: your fork's tests install it into a practice repo, so a file it misses fails there first. Neither the scripts nor the agent is in the [payload](../.agents/skills/wong-sync/references/payload-manifest.md#not-copied), so installed repos never get them; the template belongs to the source you fork.

[Required tools](../wiki/development/required-tools.md) owns what WongStack needs on your own machine.

## Artifacts preparation (contract 3)

The existing GitHub, Cloudflare and team jobs retain their shapes. Contract 3 adds the background `artifacts` job with a private payload `{serviceUrl, projectId, token, gitUrl, sourceRepo, sourceCommit, ownerEmail, subject, role, githubRepo?, legacyRepo?}`. The cloud service issues the scoped project token; it is never an agent or platform token. The host verifies the reviewed GitHub source and exact commit using the existing source loader, then executes `server/prepare-hosted.mjs` as wong with the handoff on stdin and `AGENT_TOKEN` removed.

Preparation clones into `/home/wong/wongstack`, registers the existing sign-in and Start here workspaces, and globally registers the pinned `/wong-setup` for Claude and Codex. It leaves the repository empty: no installed payload, site, database or memory. The first message is `/wong-setup`. A reconnect preserves work, rotates scoped access and updates the pinned setup entry point. Git's credential helper obtains fresh repository-only grants, supplies them only for the matching HTTPS host and path, and never prints them outside Git's protocol. Private context and helper state are mode 0600. Installed credentials live in the primary worktree's ignored `.env`.

With `githubRepo`, preparation mirrors all advertised refs, verifies independent restored refs/object IDs and `git fsck`, and only then changes a matching working repository's origin. It preserves uncommitted work and the original `github-backup` remote. The source repository is not deleted. Conflicting destination history or a missing ref stops migration before the working origin changes.

Completion is `{status:"done", hosted:{projectId,sourceCommit,verified:true,dir}}`. Failure is a sanitized `{status:"failed",reason:"repo"}`; no command output or token reaches the control plane. The cloud must require this verified acknowledgment before selecting the Artifacts backend for an existing project. Older agents require a rebuild rather than receiving unsupported jobs. See [the hosted workflow](../wiki/stack/hosted-workspaces.md).

After the owner’s verified migration, `legacyRepo` from the trusted cloud record locates an existing owner or member clone without importing again. This route independently fetches Artifacts and verifies every advertised backup object before changing that machine’s origin, preserving its dirty work and GitHub backup; members never mirror-push.
