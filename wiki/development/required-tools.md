# Required tools

WongStack runs on a deliberately small toolchain. A repo that has installed the payload needs exactly four commands on PATH, plus a resolving `origin` remote:

| Tool | Why |
|---|---|
| `git` | Everything lives in the repo; `/save`, `/continue`, and `/ship` own all git. |
| `gh` | PRs, checks, and the GitHub API — the delivery gate. Must be authenticated. (`/wong-sync` doesn't need it: its clone refresh is plain `git`, and it opens no PRs. [Contributing](../contributing.md) upstream is a manual PR, where you'd use `gh` yourself.) |
| `node` | [Node.js](https://nodejs.org/) runs OpenSpec, the session hooks, and the payload's dependency-free scripts (memory, `/improve`'s survey, the review builder). They use only Node's built-in modules. |
| `openspec` | The planning layer the workflow verbs front. It is distributed only as an npm package, so it runs on Node. |

Beyond them, no core payload script or skill invokes another runtime: **no `jq`, no `python`, and no project-language toolchain**, and no script adds a package or lockfile. WongStack installs into repos of every stack, so every added dependency is a repo it cannot serve.

**One core verb adds one tool: [`/verify`](staging-walkthrough.md) needs `agent-browser` — and only for browser journeys. Handing that browser to another device adds one more: `cloudflared`.**

| Tool | Why |
|---|---|
| `agent-browser` | The browser [`/verify`](../../.agents/skills/verify/SKILL.md) drives for UI journeys, carrying its own Chrome. `/verify` installs it on the machine the first time a browser journey needs it, and says so. Its request and state probes ride on `curl` and existing commands, so a walk with no UI journeys needs no browser at all. |
| `cloudflared` | Cloudflare's free tunnel tool, which puts the agent's browser behind a private link when it [hands you the browser](home.md#hand-the-browser-over) on your phone or another computer. The agent asks, then installs it the first time such a hand-over needs it. A hand-over at this computer never needs it. |

The agent installs `cloudflared` from Cloudflare's own channel:

- **macOS:** `brew install cloudflared`
- **Windows:** `winget install --id Cloudflare.cloudflared`
- **Linux:** Cloudflare's [package repository](https://pkg.cloudflare.com/), or with no password, the release binary into `~/.local/bin`:

  ```bash
  mkdir -p ~/.local/bin
  curl -fsSL -o ~/.local/bin/cloudflared https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64   # -arm64 on ARM
  chmod +x ~/.local/bin/cloudflared
  ```

Each is a **tool, not a toolchain**: nothing is added to your repository — no `package.json`, no dependency entry, no lockfile — which is what lets a Python, Rust, or Go repo walk its own app. A repo that never runs `/verify` or hands the browser over acquires neither, and every other core verb still needs only the four commands above. The browser is available for ordinary work too, not only inside a walk; `/verify` is just the surface that grades what it sees and posts the evidence.

**Paseo is where you chat.** [Paseo](https://paseo.sh) runs Claude Code or Codex on your own computer and reaches it from your phone; [the README's steps](https://github.com/matthewwong525/WongStack#start-in-three-steps) start there, and setup points to it when it's missing ([the check](https://github.com/matthewwong525/WongStack/blob/main/.agents/skills/wong-setup/references/tools.md#paseo-point-to-it-never-install-it)). No verb needs it except two: [`/routine`](../../.agents/skills/routine/SKILL.md) schedules recurring runs through it, and a request with several separate parts can [open a new workspace per part](the-change-loop.md#several-parts-several-workspaces). WongStack still never installs Paseo on your computer, because it is a desktop download with its own window; the one place it installs Paseo is the [server setup script](https://github.com/matthewwong525/WongStack/blob/main/server/README.md), for a server you give to agents. Without Paseo, `/routine` says so and changes nothing, the parts of a request are done one at a time, and every other verb works as before. The script uses Paseo's own daemon client, because `paseo schedule create` cannot set worktree isolation. A Paseo update that changes that client makes `/routine` stop and give the steps for the Paseo app.

**With Paseo, WongStack sets two things.** Paseo keeps settings in two places: the repo's `paseo.json` travels with every clone, and `~/.paseo/config.json` stays on each computer (`paseo reload` rereads it). The repo's [`paseo.json`](../../paseo.json) copies your secrets into each new workspace ([the secrets convention](secrets.md)) and tells Paseo to name workspaces, branches, commits, and pull requests the way [`/save` and `/ship`](the-change-loop.md) do. Setup and the server installer also add four agent presets, *Explore / Plan* and *Apply / Ship* for Claude and for Codex, with [`presets.mjs`](../../.agents/skills/routine/scripts/presets.mjs). It adds only the missing ones, never changes one you have, and skips an agent that is not installed. Everything else stays yours: new workspaces start from `main` already, Paseo's app remembers whether you pick a new worktree or local, workspaces stay open after a merge (the session-start [tidy-up](../../.agents/skills/routine/scripts/tidy.mjs) closes saved ones idle three days), and the agent browser stays off. On a new computer, ask your agent to run `node .claude/skills/routine/scripts/presets.mjs add` once; `--dry-run` shows what it would add.

**Setup adds one account: Cloudflare.** Every repo keeps its [memory store](memory.md) there, and every new install hosts its app there.

| Need | Why |
|---|---|
| A Cloudflare account | Holds the memory database and hosts the app. [Setup's provisioning](https://github.com/matthewwong525/WongStack/blob/main/.agents/skills/wong-setup/references/cloudflare.md) creates both from one user token. |
| The user token, `CLOUDFLARE_API_TOKEN` in `.env` | Provisions everything, manages memory keys, and mints the CI deploy token. It stays on your computer. The [credentials page](../stack/cloudflare-credentials.md) owns how to make it. |
| The memory key, `CLOUDFLARE_MEMORY_TOKEN` | Opens this repo's store through the production Worker's memory route. [The memory page](memory.md#the-memory-key) owns its name and what it reaches. |
| R2, optional | Keeps raw transcripts. It needs a payment method on file; without it, memory works and keeps no transcripts. |

`curl` drives the rest of provisioning.

## Symbolic links in the agent folder

Every install keeps its agent files in one real `.agents/` folder, with `.claude` and `.codex` as symbolic links to it ([the agent folder](../../.agents/skills/wong-sync/references/payload-manifest.md#the-agent-folder)). Git stores a link as a link, and macOS and Linux check it out as one. **On Windows, turn on `core.symlinks`** before you clone (`git config --global core.symlinks true`, with Developer Mode on). Without it, Git writes each link as a small text file that holds the path, and neither agent finds its skills. Setup tests this before it makes the links and walks you through Developer Mode ([Windows folder links](https://github.com/matthewwong525/WongStack/blob/main/.agents/skills/wong-setup/references/tools.md#4-windows-folder-links)); a clone you make yourself still needs the setting first.

To check that Codex reads the shared folder, run `codex features list` (the Default-mode question flag shows `true`) and `codex debug prompt-input "hi"` (each skill appears once). Neither calls a model. Run them in a trusted checkout: Codex ignores the project `config.toml` in an untrusted one, whatever the layout.

## `gh` needs the `workflow` scope

`gh auth login`'s minimum scope set is `repo`, `read:org`, `gist` — **`workflow` is not in it.** Without it, pushing any `.github/workflows/*.yml` file fails at *push* time, long after setup reported success, with wording a newcomer can't act on:

```
refusing to allow an OAuth App to create or update workflow
```

The pack's deploy workflow is the file that trips this, so any repo taking (or on) the stack pack needs the scope. The plain-language reason, for when you're asking a user: *"GitHub wants your permission before a tool can add an automated deploy step. This is that permission."*

- **Authenticating fresh:** request it up front — `gh auth login --web --git-protocol https --scopes workflow,user:email`. It costs nothing in the browser visit the login already requires. Setup does this for you, in [one sign-in](https://github.com/matthewwong525/WongStack/blob/main/.agents/skills/wong-setup/references/tools.md#2-the-github-sign-in).
- **Already authenticated:** check `gh auth status` for `workflow` in the token scopes; missing → `gh auth refresh --scopes workflow`.

[Setup's provisioning step](https://github.com/matthewwong525/WongStack/blob/main/.agents/skills/wong-setup/references/cloudflare.md#4e-the-workflow) checks the scope before it relies on a push, and links here rather than re-explaining.

## `gh` needs the `user:email` scope for memory

A teammate gets their memory key by [joining through GitHub](memory.md#joining-through-github), which reads their verified emails. `gh`'s default scopes cannot. Add the scope once: `gh auth refresh -h github.com -s user:email`, or `--scopes workflow,user:email` on a fresh `gh auth login`. Without it, `join` names this command and makes no key.

## Runtimes install at the point of need

**Nothing is installed without asking.** Installing a runtime changes the machine, not the repo. When a step needs a tool and it is missing, the skill explains what and why, and asks.

**Setup is the one skill that checks ahead**, because nothing works until its tools exist. Before it writes anything, it checks for `git`, `gh`, Node.js, and `openspec`, and asks once to install the missing ones ([get the computer ready](https://github.com/matthewwong525/WongStack/blob/main/.agents/skills/wong-setup/references/tools.md)). It uses the system package manager — Homebrew when it is already there, `winget`, or `apt` — only when that needs no password, because an agent can't type one. Otherwise it installs into your home folder, `~/.local`, which also works on managed laptops. It never installs a package manager. Every other skill keeps point-of-need installs: `/verify` adds its browser the first time it needs one, and a hand-over its tunnel tool.

## The Cloudflare stack pack

One exception, and its tools stay in CI. Every new install takes the Cloudflare stack pack, documented under `wiki/stack/`. It ships a handful of scripts that run `node`/`npm` and `wrangler` and expect a Cloudflare account. **Its tools are its own:** they run **only in that repo's own build and CI**, in the pipeline scripts under `scripts/` that migrate and deploy. Nothing on your machine runs them.

**`curl` is a provisioning dependency.** [Setup's provisioning](https://github.com/matthewwong525/WongStack/blob/main/.agents/skills/wong-setup/references/cloudflare.md) drives the Cloudflare REST API with `curl` rather than `wrangler`, so provisioning needs no app dependency installed.

**Pack-gated scripts may use `node`** where it's the better tool — JSON assembly, editing `wrangler.jsonc` — because a pack repo already requires it at its build boundary. The governing rule:

> Use a tool where it is already required. A skill may install a **tool** it needs at the point of need and say so; never let a WongStack skill be the reason a **runtime** gets installed without asking.

That's why provisioning is `curl`-first even though `npx wrangler` would be shorter: reaching for it would add an app dependency to the one flow that has to work on a fresh computer.

So the core four-tool guarantee stays literally true for every repo: the pack adds tools to *its* repo's deploy pipeline, not to WongStack.

## Working with JSON

Two rules keep it that way.

**In scripts, filter with `gh --jq`.** `gh` embeds its own jq implementation ([gojq](https://github.com/itchyny/gojq)), so `--jq` costs nothing while a `| jq` pipeline is an external dependency:

```bash
# yes — gh does the filtering
gh pr checks --json name,bucket,link --jq '.[] | "\(.bucket)\t\(.name)"'

# no — requires jq on PATH
gh pr checks --json name,bucket,link | jq -r '.[] | .name'
```

Keep filters inside the syntax jq and gojq share — `select`, `map`, string interpolation, indexing. That covers everything the payload needs.

**For local JSON files, just read them.** Skills are instructions to an agent, and an agent reading a small file beats a subshell parsing it: state the fields, their defaults, and any expansion in prose. It handles absent keys, renamed files, and malformed input by *noticing*, where `jq -r '.x // empty'` silently yields a blank. [`/wong-sync`](../../.agents/skills/wong-sync/SKILL.md) reads `.claude/.wong-stack.json` this way before anything else.

Reach for a shell pipeline only when you need determinism or volume — parsing four scalars is neither.

## Adding a dependency

Don't, unless the payload genuinely can't work without it. If a change seems to need a new tool, the first question is whether `gh`, `git`, or the agent itself can already do the job. If a new tool is truly required, it belongs in this page, in [the preconditions](../../.agents/skills/save/references/preconditions.md) when a verb must check it, and in the `CHANGELOG.md` entry for that change — a downstream repo shouldn't discover it by failing.

Other development processes live in [Development](README.md).
