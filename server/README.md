# Server setup

`setup.sh` turns a fresh Ubuntu 24.04 server into a workspace where agents work: a workspace user, the tools, and Paseo. Run it by hand on any server, or let a host run it for you. This page is the contract a host relies on, so a host can run WongStack's script or your fork's without reading it.

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

- `node` (24), `git`, `gh`, `openspec`, `paseo`, `claude`, `codex`, `opencode`, and `agent-browser` are on the workspace user's path.
- agent-browser's Chrome is in the workspace user's home, with the sandbox on.
- `paseo.service` runs `paseo daemon run` as the workspace user, on `127.0.0.1:6767`.

The script checks this itself last. When a check fails, it prints `missing: <name>` and exits non-zero. Any failed command earlier also stops it with a non-zero exit.

Then sign in as the workspace user: `gh auth login`, `claude`, and pair a device with `paseo daemon pair`. [Paseo](https://paseo.sh) owns pairing.

## What it never does

- It opens no inbound port. Paseo listens on `127.0.0.1` only and reaches your devices through its relay.
- It reads and writes no secret. Logins happen after, as the workspace user.
- It never writes under `/etc/wongstack` or `/opt/wongstack`. Those paths belong to a host, for its own agent and token.

## The size budget

`setup.sh` stays at most 12 KiB. A host can then put it in first-boot data: Hetzner, for one, limits that to 32 KiB, and the host's own files need the rest. The source's tests fail when the script grows past the budget.

## Your fork is your template

Fork WongStack and edit `setup.sh` to change what every server gets: add a tool, pin a version, or remove one you do not use. Keep the contract above, and keep the final check honest. A host that pairs devices needs `paseo`, and removing it breaks chat there. The script is not in the [payload](../.agents/skills/wong-sync/references/payload-manifest.md#not-copied), so installed repos never get it; the template belongs to the source you fork.

[Required tools](../wiki/development/required-tools.md) owns what WongStack needs on your own machine.
