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

- It never puts a token in an argument, an error, its output, or a commit. The user token and the memory key stay in the repo's `.env`, which only the workspace user can read. The deploy token goes straight to the GitHub secret.
- It never changes a repo that holds work it did not commit.
- It never deletes anything on Cloudflare, or touches what another project named: when a name is taken, every name moves to the next free suffix, such as `recipe-box-2`.
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
