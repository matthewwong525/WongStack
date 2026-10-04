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

## Preserve an existing server

The source-only `server/preservation.json` declares `{ "version": 1 }`. A host checks it before selecting preservation; there is no fallback to fresh setup.

```bash
sudo WORKSPACE_USER=wong WORKSPACE_HOME=/home/wong bash server/setup.sh --preserve --preflight
sudo WORKSPACE_USER=wong WORKSPACE_HOME=/home/wong bash server/setup.sh --preserve
```

The first command only checks; it never creates an account, installs tools, or writes files. The second repeats every check before changing anything. Both require root, Ubuntu 24.04 and x86-64 or Arm64. Before mutation they print a read-only capacity inventory (`memoryKiB`, `rootFreeKiB`, `workspaceFreeKiB`): MemTotal from `/proc/meminfo`, and available 1024-byte blocks on `/` and the selected home, or its nearest safe existing parent when that home is absent. Missing commands or unreadable/malformed capacity data refuse with bounded `memory` or `disk` reasons. These observations add no memory/free-space eligibility floor or current-load restriction; the host checks its provider's hardware baseline. Capacity inventory does not promise every project dependency installation will fit, and an installation that fails remains incomplete. An existing nonroot account must match its passwd home and own regular, symlink-free home/tool directories. A missing account may be created only with an unoccupied, safe home and compatible unoccupied service/port. Never select root. The agent additionally requires the account to exist when it starts.

Existing executable tools must answer a version check; Node must be major 22 or 24 and OpenSpec exactly 1.13.2. Other tools must report a semantic version. These are executable compatibility checks, not permission to update a tool. Missing Node and npm tools go into the selected home, missing git/gh use Ubuntu packages, and missing cloudflared/Claude use per-user binaries. Package installation uses `--no-upgrade`. No global Node/npm tool is replaced. If Node exists without npm, setup refuses. An existing Paseo unit must run as the selected account, with its exact HOME and `daemon run --home <home>/.paseo`, be active, and listen only on `127.0.0.1:6767`. Setup keeps that unit and its ports intact; an occupied or unrelated unit/port refuses. A missing unit is created only after preflight.

A missing agent-browser gets its browser, missing Chrome libraries and a new account-specific AppArmor profile. Existing browser caches and unrelated policies remain intact; a taken profile name refuses. Setup never reboots, upgrades the OS, changes firewall/network policy, deletes caches, or writes host enrollment paths. A refusal prints `preserve: <reason>` (`root`, `os`, `architecture`, `user`, `home`, `path`, `tool_<name>`, `service`, `port`, `browser`, `memory`, or `disk`) and exits nonzero. The host must independently refuse an unrelated existing host agent before enrollment; setup never replaces one.

## Trusted runtime for the root agent

Both setup modes ensure `/usr/local/lib/wongstack-agent-runtime/bin/node` for the host's root agent, independently of the workspace user's Node. A missing workspace Node can still be installed in that user's home; it never runs the root agent. The source-only `server/agent-runtime.sh` exposes `--preflight` (no writes), `--ensure` (fill a missing runtime) and `--path` (print that exact destination). Preservation runs runtime preflight before mutation.

Every existing runtime ancestor must be root-owned, have no group/other write or setuid/setgid bits, and contain no symlink. The binary must be regular, executable, single-link, root-owned ELF and report Node major 22 or 24. An incompatible or unsafe occupied destination refuses; a compatible binary is kept. For a missing runtime, setup copies only a similarly verified `/usr/bin/node` or `/usr/local/bin/node`, or downloads an official Node 22 archive after verifying its SHA256 manifest. Download staging is private under the guarded `/usr/local/lib` parent; extraction does not restore archive ownership/permissions. No workspace binary is discovered or copied. The host independently verifies the final runtime before reporting setup success and uses its absolute path in the unit.

The root unit must use system PATH `/usr/sbin:/usr/bin:/sbin:/bin`. The source process and root command runner enforce that path too; user-local `systemctl`, `runuser` or `tar` cannot become root commands. Workspace commands continue using their selected account's clean environment and tool path.

## Prepare an existing private project

The preservation `github` job takes `{token, repo, login, preserve:true}`. Its fixed helper receives credentials on stdin, authenticates the token's GitHub identity, and uses a clean scoped child environment. It never signs over an existing gh login or changes global/repo git configuration. A stored matching identity can be reused; an unrelated stored identity refuses with `identity_conflict` and stays intact. It clones only into the selected home when that folder is absent. A matching owned checkout or worktree keeps its branch, dirty files and unpushed commits; foreign origin/folder, symlink or backing git-directory ownership refuses. The token is neither persisted nor put in arguments. Reconnecting adds no clone; project registration happens in `project-prepare`.

`project-prepare` takes `{repo,generation}`, with a nonnegative integer generation (fresh/rebuilt hosts use 0; attachment enrollment uses a positive generation). It supports tracked npm manifests with package-lock versions 2/3, installs with `npm ci --no-audit --no-fund` as the selected account, and refuses locally modified manifests or `.nvmrc`, or unsupported dependency contracts (including Python/yarn/pnpm). A present `.nvmrc` must be tracked, regular and owned, and declare supported Node major 22 or 24 matching the selected user's effective `node --version` before installation. A mismatch remains `needs_input` with reason `unsupported`; setup never replaces the runtime to satisfy the project. Fingerprints include `.nvmrc` when present and live privately outside the checkout under `~/.local/state/wongstack/projects`; a retry keeps a completed install while manifests/tool versions match and node_modules exists. Dependency scripts receive only HOME, USER and PATH, with no host token or root privileges. The host must authorize the repository before running it.

Configuration stays `needs_input` unless the repository or a locally reviewed setup profile at `.wongstack/project.json` explicitly declares its required names:

```json
{ "version": 1, "requiredSettings": ["APP_NAME"], "browser": false }
```

A reviewed `requiredSettings: []` means no settings are required for this code workspace. The optional `browser: true` installs the user's browser; it does not install system packages or relax sandbox policy. Required names must be uppercase environment names (at most 64 names, each at most 64 characters). Only this checkout's regular, owned `.env` is checked for nonempty declarations; values stay private. This verifies configuration presence, not provider credentials or production readiness. Example env keys do not become requirements; no production secrets are copied and no AI credential files are read. An unknown/invalid profile stays pending. A completed dependency step is kept after configuration/Paseo failure. Paseo projects, the named Claude/Codex sign-in workspaces, their terminal metadata and Start here are found before creating them, making partial retry and reconnect duplicate-free. New sign-in terminals run only the fixed `claude auth login` or `codex login --device-auth` action; existing terminals remain untouched. A private step record retries a newly created terminal whose command delivery failed, without creating a second terminal or reading its contents. Paseo readiness requires these sign-in terminals too.

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

`agent/agent.mjs` runs on a host's server as root and takes the host's requests: pair a device, connect GitHub, install WongStack, add a teammate, copy the server. It uses this source, `agent.env` and the trusted root runtime above. It imports the installer's names [above](#what-a-host-may-import), and runs [the installer](#install-wongstack-into-a-repo) as the workspace user from a clone pinned to the job's commit.

### What runs it

The host does this at first boot, in order:

1. Unpack this source at the build's commit, root-owned and mode 0755, so the workspace user can read it. wongstack.com uses `/opt/wongstack/source`.
2. Write `/etc/wongstack/agent.env`, mode 0600: `APP_URL`, `AGENT_TOKEN`, `VM_ID`, `SOURCE_REPO`, and `SOURCE_COMMIT`, the 40-character commit it unpacked. Optional `WORKSPACE_USER` and `WORKSPACE_HOME` select a validated existing nonroot account; defaults are `wong` and `/home/wong`. Execution, Paseo, checkout/cache paths, copies and private-result ownership all use that identity. A preserved host also sets `WORKSPACE_MODE=preserve`.
3. Run `server/setup.sh`, with `AGENT_TOKEN` kept out of its environment.
4. Send the setup report (below).
5. On a zero exit, run `/usr/local/lib/wongstack-agent-runtime/bin/node server/agent/agent.mjs` as root under a service that restarts it, with `agent.env` as its environment.

The agent runs that copy for the server's life. Rebuilding the server is the only way it gets a newer agent.

### Contract 5

`agent.mjs` exports `CONTRACT = 5`. Every request carries `Authorization: Bearer <AGENT_TOKEN>` and a JSON body.

**The poll.** Every `interval` seconds (10 by default) the agent sends `POST /api/agent/poll`:

```json
{ "contract": 5, "commit": "<SOURCE_COMMIT, or null when it is not 40 hex>", "paseo": "up" }
```

`paseo` is `up` when `paseo.service` is active, else `down`. The reply is `{ jobs, interval }`, each job `{ id, type, payload }`. A reply without them means no work and the default wait.

**The jobs.** Each job type, its payload, and the `result` a done job returns:

| Type | Payload | Result |
| --- | --- | --- |
| `pair` | none | The Paseo relay pairing link. |
| `suspend` | none | none; stops `paseo.service`. |
| `resume` | none | none; starts `paseo.service`. |
| `github` | `{ token, repo, name, email, invited }` | none; signs `gh` in, sets git's name and email, clones `repo` once, and sets up Paseo. With `{token,repo,login,preserve:true}`, uses the preservation path above without overwriting identities/configuration or local work. An `invited` teammate's server accepts the owner's invitation first, or fails with `repo`. |
| `hosted-bootstrap` | [The hosted job](#hosted-project-bootstrap) | Bounded repository/workspace readiness and the exact project/template generation; memory stays unconfigured. |
| `project-prepare` | `{ repo, generation }` | none; delivers the bounded project report below, then reports done only when every step is done. |
| `cloudflare` | [The installer's job](#the-job), plus `sourceRepo` and `sourceCommit`, the pinned clone. The agent adds `openWithoutLogin: true` itself. | none; `rolled` says whether it swapped the pasted token's value for one only the server holds. A failure carries the installer's `reason`, and `detail` when the line before it matches `CLOUDFLARE_CALL`. |
| `team-add` | `{ repo, login }` | none; gives the GitHub `login` push access to the owner's `repo`. |
| `team-remove` | `{ repo, login }` | none; withdraws the invitation, removes access, and stops the teammate's memory keys where the repo's memory supports it. |
| `copy-key` | none | The new server's public X25519 key, base64. |
| `copy-send` | `{ copyId, publicKey, port, peer, pullToken }` | none; sends the home folder, locked to `publicKey`, to the one connection from `peer` that proves `pullToken`. |
| `copy-restore` | `{ copyId, host, port, pullToken }` | none; pulls the copy from `host`, unlocks it, and unpacks it as the workspace user. |

A job of any other type is `rejected` and runs nothing. `cloudflare`, `project-prepare`, `hosted-bootstrap`, `copy-send`, and `copy-restore` run in the background, one of each type at a time, so the poll goes on around them.

**The job result.** The agent sends `POST /api/agent/jobs/:id` with `{ status, result?, reason?, detail?, rolled?, hosted? }`, where `status` is `done`, `failed`, or `rejected`. For a `cloudflare` job, the host answers `{ ok: true }`, or the agent keeps the outcome and sends it again.

**The access result.** After a `cloudflare` job with a `managementResult`, the agent reads the [private management result](#the-private-management-result), restricted or open, from its exact path, checks it against the job, and sends it to `POST /api/agent/jobs/:id/access`. It keeps a private journal under `/var/lib/wongstack/access-jobs` so a restart resends it rather than installing again.

**The project result.** `POST /api/agent/jobs/:id/project` uses the existing VM bearer credential and exactly `{generation,clone,dependencies,configuration,paseo,missingSettings,reason?}`. Clone is `done|failed`; dependencies are `done|failed|needs_input`; configuration is `done|needs_input`; Paseo is `done|failed`. Missing settings are names only. The optional reason is `repo|path_conflict|identity_conflict|dependencies|configuration|paseo|unsupported`. A host compares the authenticated VM, selected repo/job and generation with its authoritative records; stale/replaced recipients cannot adopt the result. Its receipt is `{ok:true,generation}` with `Cache-Control: no-store`. A private root-owned journal under `/var/lib/wongstack/project-jobs` saves only bounded reports, then retries identical delivery and final status after a lost receipt/restart. It never stores credentials or command output. Preparation failure remains distinct from clone success. An interrupted preparation without a saved report can retry the same fixed helper; its dependency fingerprints and Paseo lookups keep completed steps.

**The setup report.** The host, not the agent, sends `POST /api/agent/setup?exit=<code>` once after `setup.sh`, with the last 4,000 bytes of its log as `text/plain`.

For `WORKSPACE_MODE=preserve`, an authenticated poll returning HTTP 401 means host authorization was revoked: the agent exits normally (status 0), without stopping or modifying shared Paseo. A host uses `Restart=on-failure`, so revocation does not create a restart loop. Other poll failures retain bounded polling retries; legacy/fresh mode keeps its previous retry behavior.

A change to any of these shapes raises `CONTRACT`. The host supports the new number first; then the source releases it.

**What changed from contract 4.** Contract 5 adds only `hosted-bootstrap`. Hosts must negotiate 5 before dispatching it; a contract-4 agent retains its existing GitHub and preservation jobs and rejects this type. Managed creation remains disabled until the separately authorized end-to-end acceptance.

**What changed from contract 2.** Contract 4 adds preservation GitHub jobs, configured workspace identity and the project report. It extends the legacy contract-2 Access paths; it does **not** imply implementation of the separately negotiated Artifacts contract-3 capabilities. Hosts check the preservation manifest and contract explicitly before enabling attachment.

**Earlier change from contract 1.** The agent asks the installer for [the open finish](#the-open-finish), so a `cloudflare` job on an account without a card ends `done`, and the access result may be the open one. A contract-1 agent never asks, so its server still stops with `cloudflare`, and the host never gets an open result from it.

### What the agent never does

- It never changes its own code: no fetch, replace, or restart onto other code, and no job that names code for it to run.
- It opens no inbound port. The one exception is `copy-send`, which listens on the job's port for the job's peer alone, until one copy is sent.
- It never passes `AGENT_TOKEN` or other inherited host credentials to workspace commands, the installer or project scripts.
- It never reports installer output beyond the reason word and a line matching `CLOUDFLARE_CALL`, and it logs a job by its id, type, and status alone.

### Change the agent in your fork

Your fork's servers run your fork's agent. Change it as you like, and keep contract 5, or raise `CONTRACT` only once your host supports the new number. A host checks every result against its own records, so an agent that breaks the contract fails its own server's jobs and no one else's.

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

## Hosted project bootstrap

[`hosted/starter.mjs`](hosted/starter.mjs) prepares an HTTP/static starter offline using the existing payload copier and install record. It keeps the complete app test chain, freezes dependencies to the lockfile (Wrangler 4.144.0), uses an ordinary app build, and creates no resource. The release procedure lives in [hosted projects](../wiki/stack/hosted-projects.md#prepare-the-starter).

Contract 5 adds `hosted-bootstrap`, whose payload is exactly `{version:1,provider:"artifacts",projectId,generation,remote,sourceCommit,starterCommit,token,folder,gitToken,ownerName,ownerEmail}`. The owner comes from verified service identity. The token is project-scoped delivery authority without control characters, and gitToken is a repo-scoped Git write token shaped `art_v1_<40 hex>?expires=<unix_seconds>`; neither is a platform, Access or deployment token. The host must bind these to its authenticated VM, project and generation. Customer commands receive the selected workspace account's clean environment. Credentials arrive only on stdin, never in command arguments or bounded results.

The fixed [bootstrap helper](hosted/bootstrap.mjs) validates an Artifacts HTTPS remote returned by the provider and calls `POST https://wongstack.com/api/hosted/projects/:projectId/context` before writing. Its authenticated request excludes the bearer token from the JSON body; response must be `{ok:true,projectId,generation,remote,sourceCommit,starterCommit}` matching every field. The service must compare its project owner, current VM/generation, exact repo and immutable starter against authoritative records, return `Cache-Control: no-store`, and reject replaced or revoked authority. This endpoint is a required companion contract, not an implemented Source service.

The initial checkout must equal the pinned starter SHA and its source install record. Retries verify the remote and starter ancestry, keep later edits/branches, and reuse the existing Paseo project/sign-in workspaces by metadata. A foreign folder, symlink, source mismatch or stale generation stops with `path_conflict` or `reconnect`. The helper never calls personal provisioning, authenticates GitHub, creates memory, or reports site readiness. Its bounded done result is `{status:"done",hosted:{projectId,generation,sourceCommit,starterCommit,repository:"ready",workspace:"ready"}}`; arbitrary stdout and credential fields are discarded by the agent wrapper. A lost final report can rerun this same idempotent helper after reconnect; it creates no second project.

The private handoff and exact-URL Git configuration live in mode-0600 files under the owned mode-0700 `~/.local/state/wongstack/hosted/` folder, keyed by the absolute checkout path. The local Git include references that private config; history contains no credential. A committed `.wongstack/hosted.json` marker or Artifacts origin identifies the route but grants no authority. [Context verification](../.agents/skills/wong-sync/scripts/hosted-context.mjs) reauthenticates with the service before setup/delivery. A missing, invalid or revoked handoff stops with reconnect guidance before personal setup.
