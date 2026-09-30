# Server setup

`setup.sh` turns a fresh Ubuntu 24.04 server into a workspace where agents work: a workspace user, the tools, and Paseo. [`install-wongstack.mjs`](#install-wongstack-into-a-repo) then installs WongStack into a person's repo there. Run either by hand on any server, or let a host run them for you. This page is the contract a host relies on, so a host can run WongStack's scripts or your fork's without reading them.

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

Before publishing content, the installer validates the recipient/path and any existing result's job, target, owner, account, and source. After private provisioning succeeds, it atomically writes a bounded (16 KiB) regular result file, mode 0600, inside a workspace-user-owned directory mode 0700. The result contains:

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
| `done` | Installed and pushed, or it already was. |
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

Run it again after any stop. It finishes what the last run began and makes no second copy of anything. On a repo it already pushed, it restores `.env` and the secrets and commits nothing.

### What the installer never does

- It never puts a token in an argument, an error, its output, or a commit. The user token, memory key, and separate verification credentials stay in the repo's ignored `.env`, mode 0600. The deploy token goes straight to the GitHub secret; the restricted cloud management token uses only the private result file.
- It never changes a repo that holds work it did not commit.
- It touches only owned resources. A taken name moves the workspace to a free suffix, such as `recipe-box-2`. Its only automatic deletion is acknowledged cleanup of recorded restricted account tokens; the login wall remains in place.
- It never writes under `/etc/wongstack` or `/opt/wongstack`.

Its Cloudflare steps are [the provisioning script](../.agents/skills/wong-setup/scripts/provision.mjs) `/wong-setup` runs, so a fix to one reaches both.

## Test a change on a real server

The source's tests use a pretend Cloudflare. Before you ship a change to either script, run both for real:

1. Make a fresh Ubuntu 24.04 server, the smallest size, and run `setup.sh` from your branch.
2. As the workspace user, sign in to `gh`, set a git email, and make an empty private repo to install into.
3. Run the installer as [above](#install-wongstack-into-a-repo). Check that it prints `done`, the repo's first deploy passes, the site answers, and `memory.mjs digest` reads through the Worker. Run it again: it prints `done` and changes nothing.
4. Delete the server, the repo, and on Cloudflare the Workers, databases, memory bucket, and `<repo>-deploy` token. Deleting a repo needs `gh auth refresh -s delete_repo` first.

## The size budget

`setup.sh` stays at most 12 KiB. A host can then put it in first-boot data: Hetzner, for one, limits that to 32 KiB, and the host's own files need the rest. The source's tests fail when the script grows past the budget. The installer has no budget: it runs from the clone.

## Your fork is your template

Fork WongStack and edit `setup.sh` to change what every server gets: add a tool, pin a version, or remove one you do not use. Keep the contract above, and keep the final check honest. A host that pairs devices needs `paseo`, and removing it breaks chat there. Change the payload, and `install-wongstack.mjs` installs your version: your fork's tests install it into a practice repo, so a file it misses fails there first. Neither script is in the [payload](../.agents/skills/wong-sync/references/payload-manifest.md#not-copied), so installed repos never get them; the template belongs to the source you fork.

[Required tools](../wiki/development/required-tools.md) owns what WongStack needs on your own machine.
