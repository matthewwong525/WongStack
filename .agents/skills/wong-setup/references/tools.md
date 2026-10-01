# Get the computer ready

[`/wong-setup`](../SKILL.md) runs this before cloning. Use its selected repository and raw root for every source reference. Ready the tools, GitHub sign-in, git identity, and Windows links before writing in the target. [Required tools](../../../../wiki/development/required-tools.md) explains each.

**The person types no command.** The agent runs every command below and asks in [the ask format](../../explore/references/asking-the-user.md), in [plain words](../../explore/references/asking-the-user.md#write-in-plain-words): *"I need a few free tools: Node.js and GitHub's app to set things up, a browser for me, and a tool that links you to it. Install them (Recommended), or stop here?"* One yes covers every tool it names. A decline or failed install stops setup with nothing written: say what is missing, what it is for, and that running setup again picks up here. Only a failed [helper](#the-helpers-the-browser-and-the-link-tool) is skipped instead. [The failure map](failure-map.md#getting-the-computer-ready) owns each stop's fix.

## 1. The tools

Check each with `command -v`, in this order, since the clone needs `git` and OpenSpec needs Node:

| Tool | Ready when |
|---|---|
| `git` | `git --version` answers |
| `gh` | `gh --version` answers |
| Node.js | `node --version` is at least the major version in `<selected raw root>/.nvmrc`; an unreadable or invalid requirement stops setup |
| OpenSpec | `openspec --version` answers |

Check [the helpers](#the-helpers-the-browser-and-the-link-tool) too, so the ask names them. Install each missing one of the four by the first route with **no password prompt**, which the agent's shell cannot answer. Never install a package manager.

| System (`uname -s`) | Route |
|---|---|
| macOS (`Darwin`) | `brew install git gh node` when `brew` is on `PATH`. Without it, `git` is `xcode-select --install`, Apple's own dialog the person clicks; the rest go to the user folder. |
| Windows (`MINGW*`, `MSYS*`, `CYGWIN*`) | `winget install --id Git.Git`, `GitHub.cli`, or `OpenJS.NodeJS.LTS`, with `--accept-package-agreements --accept-source-agreements`. Windows shows its own consent window. |
| Linux | `sudo -n apt-get install -y git gh` when `sudo -n true` succeeds. Node comes from `apt` only when `apt-cache policy nodejs` offers the required major; otherwise, and with no passwordless `sudo`, the user folder. |

**The user folder** is `~/.local`, with `~/.local/bin` on `PATH`. Map `uname -m` to the archive names: `x86_64` is `x64` for Node and `amd64` for `gh`; `arm64` and `aarch64` are `arm64`.

```bash
mkdir -p ~/.local/bin
# Node: the newest release of the required major (22 shown), from nodejs.org
N=$(curl -fsSL https://nodejs.org/dist/latest-v22.x/SHASUMS256.txt | grep -o 'node-v[0-9.]*-linux-x64\.tar\.xz' | head -1)
curl -fsSL "https://nodejs.org/dist/latest-v22.x/$N" | tar -xJ -C ~/.local --strip-components=1
# gh: the latest release archive from GitHub
G=$(curl -fsSL https://api.github.com/repos/cli/cli/releases/latest | grep -o 'https://[^"]*/gh_[0-9.]*_linux_amd64\.tar\.gz' | head -1)
curl -fsSL "$G" | tar -xz -C ~/.local --strip-components=1
```

On macOS, Node's archive is `node-v…-darwin-<arch>.tar.gz` (unpack with `tar -xz`), and `gh`'s is `gh_…_macOS_<arch>.zip`: unzip it and copy `bin/gh` into `~/.local/bin`.

**OpenSpec** installs with the command in [the preconditions](../../save/references/preconditions.md), which own the pinned version. When a global npm install needs `sudo`, add `--prefix ~/.local`.

After a user-folder install, run `export PATH="$HOME/.local/bin:$PATH"`, and add that line once to the profile of the shell `$SHELL` names (`~/.zshrc` or `~/.bashrc`). Then check every tool again; one still missing is a failed install.

### The helpers: the browser and the link tool

After the four pass, install each missing helper the same yes covered ([why each](../../../../wiki/development/required-tools.md)):

- **`agent-browser`:** `npm install -g agent-browser` (`--prefix ~/.local` when it needs `sudo`), then `agent-browser install` for its Chrome, with `--with-deps` on Linux only when `sudo -n true` succeeds.
- **`cloudflared`:** [its route](../../../../wiki/development/required-tools.md#installing-cloudflared) for this system.

A helper still missing after its install is not a stop: say so in one plain line (*"The browser didn't install; I'll offer it again when I need it."*) and continue.

### Paseo: point to it, never install it

After the tools pass, check `command -v paseo`. Missing → say one plain sentence, then continue: *"Paseo is a free app for chatting with me from your phone, running things on a schedule, and giving each piece of work its own space; get it at [paseo.sh](https://paseo.sh) whenever you like."* Never install it, and never stop setup without it: it is a desktop download with its own window.

## 2. The GitHub sign-in

Check `gh auth status`. Setup needs the `workflow` scope, to add the publishing step, and `user:email`, to set the git email and let teammates [join memory](../../../../wiki/development/memory-key.md#joining-through-github) ([why](../../../../wiki/development/required-tools.md#gh-needs-the-workflow-scope)).

- **Signed out** → run `gh auth login --web --hostname github.com --git-protocol https --scopes workflow,user:email` in the background, output to a temporary file.
- **Signed in, a scope missing** from the `Token scopes:` line → run `gh auth refresh --hostname github.com --scopes <every missing scope>` the same way; one refresh covers them all.

Neither needs a terminal. Each prints `First copy your one-time code: XXXX-XXXX` and `https://github.com/login/device`, then waits for approval. Show the person both:

```text
I need you to approve GitHub once.
1. Open https://github.com/login/device
2. Enter the code  XXXX-XXXX
3. Approve, then tell me you're done
```

When they say done, check `gh auth status` again, then run `gh auth setup-git` so the first push needs no second sign-in. No code in the output, or no sign-in after they say done → stop, create nothing, and use the failure map.

## 3. The git name and email

Read `git config user.name` and `git config user.email`. Set only an empty value, in the global config; never change a set one:

```bash
git config --global user.name "$(gh api user --jq '.name // .login')"
git config --global user.email "$(gh api user/emails --jq '[.[] | select(.primary and .verified)][0].email')"
```

The email must be non-empty, because memory's admin key is made for it; with no verified primary email, stop and use the failure map.

## 4. Windows folder links

On Windows only, test a real link in a temporary folder:

```bash
T=$(mktemp -d) && mkdir "$T/a" && MSYS=winsymlinks:nativestrict ln -s a "$T/b"; echo $?; rm -rf "$T"
```

Non-zero means Windows refuses links, and Git Bash would quietly make copies the agents cannot read as their folder. Walk the person through it:

```text
Windows needs one setting so I can link
your assistant's folders.
1. Open Settings > System > For developers
2. Turn on Developer Mode
3. Tell me when it's on
```

Then run `git config --global core.symlinks true` and test again; continue only when it passes.
