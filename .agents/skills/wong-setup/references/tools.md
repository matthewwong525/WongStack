# Get the computer ready

[`/wong-setup`](../SKILL.md) runs this after the empty-folder check and before it clones the source. It readies four things, in order: the tools, the GitHub sign-in, the git name and email, and on Windows, folder links. Nothing is written in the target folder until all four pass. Every other skill installs a tool only when a step needs it; setup checks ahead, because nothing works until these exist. [Required tools](../../../../wiki/development/required-tools.md) says why each tool is needed.

**The person types no command.** The agent runs every command below and asks in [the shared ask format](../../explore/references/asking-the-user.md), in [plain words](../../explore/references/asking-the-user.md#write-in-plain-words): *"I need two free tools, Node.js and GitHub's app, to set things up. Install them (Recommended), or stop here?"* One yes covers the tools that ask names. A decline or a failed install stops setup with nothing written: say what is missing, what it is for, and that running setup again picks up from this check. [The failure map](failure-map.md#getting-the-computer-ready) owns the plain fix for each stop.

## 1. The tools

Check each with `command -v`, in this order, because the clone needs `git` and OpenSpec needs Node:

| Tool | Ready when |
|---|---|
| `git` | `git --version` answers |
| `gh` | `gh --version` answers |
| Node.js | `node --version` is at least the major version in the source's `.nvmrc`, read from `https://raw.githubusercontent.com/matthewwong525/WongStack/refs/heads/main/.nvmrc` |
| OpenSpec | `openspec --version` answers |

Install each missing one by the first route that needs **no password prompt**, because the agent's shell cannot answer one. Never install a package manager.

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

On macOS, Node's archive is `node-v…-darwin-<arch>.tar.gz` (unpack with `tar -xz`), and `gh`'s is `gh_…_macOS_<arch>.zip`; unzip it and copy its `bin/gh` into `~/.local/bin`.

**OpenSpec** installs with the command in [the preconditions](../../save/references/preconditions.md), which owns the pinned version. When a global npm install needs `sudo`, add `--prefix ~/.local`.

After a user-folder install, run `export PATH="$HOME/.local/bin:$PATH"` for this session, and add that line once to the profile of the shell `$SHELL` names (`~/.zshrc` or `~/.bashrc`). Then check every tool again; one still missing is a failed install.

## 2. The GitHub sign-in

Check `gh auth status`. Setup needs the `workflow` scope, to add the publishing step, and `user:email`, to set the git email and let teammates [join memory](../../../../wiki/development/memory.md#joining-through-github). [Required tools](../../../../wiki/development/required-tools.md#gh-needs-the-workflow-scope) says what each prevents.

- **Signed out** → run `gh auth login --web --hostname github.com --git-protocol https --scopes workflow,user:email` in the background, writing its output to a temporary file.
- **Signed in, a scope missing** from the `Token scopes:` line → run `gh auth refresh --hostname github.com --scopes <every missing scope>` the same way. One refresh covers all of them.

Neither needs a terminal. Each prints `First copy your one-time code: XXXX-XXXX` and the link `https://github.com/login/device`, then waits for the approval. Show the person both:

```text
I need you to approve GitHub once.
1. Open https://github.com/login/device
2. Enter the code  XXXX-XXXX
3. Approve, then tell me you're done
```

When they say done, check `gh auth status` again, then run `gh auth setup-git`, so the first push needs no second sign-in. No code in the output, or no sign-in after they say done → stop, create nothing, and use the failure map.

## 3. The git name and email

Read `git config user.name` and `git config user.email`. Set only a value that is empty, in the global config, and never change one that is set:

```bash
git config --global user.name "$(gh api user --jq '.name // .login')"
git config --global user.email "$(gh api user/emails --jq '[.[] | select(.primary and .verified)][0].email')"
```

The email must be non-empty; with no verified primary email, stop and use the failure map. Memory's admin key is made for this email.

## 4. Windows folder links

On Windows only, test a real link in a temporary folder:

```bash
T=$(mktemp -d) && mkdir "$T/a" && MSYS=winsymlinks:nativestrict ln -s a "$T/b"; echo $?; rm -rf "$T"
```

A non-zero result means Windows refuses links, and Git Bash would quietly make copies, which the agents cannot read as their folder. Walk the person through it:

```text
Windows needs one setting so I can link
your assistant's folders.
1. Open Settings > System > For developers
2. Turn on Developer Mode
3. Tell me when it's on
```

Then run `git config --global core.symlinks true` and test again. Continue only when the test passes. Setup's agent-folder step makes its links with `MSYS=winsymlinks:nativestrict` on Windows, so a refused link fails out loud instead of becoming a copy.
