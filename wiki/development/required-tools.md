# Required tools

WongStack runs on a deliberately small toolchain. A repo that has installed the payload needs exactly three commands on PATH — plus a resolving `origin` remote:

| Tool | Why |
|---|---|
| `git` | Everything lives in the repo; `/save`, `/continue`, and `/ship` own all git. |
| `gh` | PRs, checks, and the GitHub API — the delivery gate. Must be authenticated. (`/wong-sync` doesn't need it: its clone refresh is plain `git`, and it opens no PRs. [Contributing](../contributing.md) upstream is a manual PR, where you'd use `gh` yourself.) |
| `openspec` | The planning layer the workflow verbs front. Distributed only as an npm package (no standalone binary), so it needs [Node.js](https://nodejs.org/) — but the payload only ever calls the `openspec` binary. |

`/wong-setup` checks for these during its readiness step when it installs WongStack into a repo. Beyond them, no core payload script or skill invokes another runtime: **no `jq`, no `python`, and no project-language toolchain.** [`/improve`](repository-improvement.md) runs one dependency-free Node.js survey beside the OpenSpec CLI, so it adds no runtime or package requirement. WongStack installs into repos of every stack, so every added dependency is a repo it cannot serve.

**One core verb adds one tool: [`/verify`](staging-walkthrough.md) needs `agent-browser` — and only for browser journeys.**

| Tool | Why |
|---|---|
| `agent-browser` | The browser [`/verify`](../../.claude/skills/verify/SKILL.md) drives for UI journeys, carrying its own Chrome. `/verify` installs it on the machine the first time a browser journey needs it, and says so. Its request and state probes ride on `curl` and existing commands, so a walk with no UI journeys needs no browser at all. |

It is a **tool, not a toolchain**: nothing is added to your repository — no `package.json`, no dependency entry, no lockfile — which is what lets a Python, Rust, or Go repo walk its own app. A repo that never runs `/verify` never acquires it, and every other core verb still needs only the three commands above. The browser is available for ordinary work too, not only inside a walk; `/verify` is just the surface that grades what it sees and posts the evidence.

**One optional verb uses Paseo: [`/routine`](../../.claude/skills/routine/SKILL.md).** It schedules recurring runs through [Paseo](https://paseo.sh). WongStack never installs Paseo. Without it, `/routine` says so and changes nothing, and every other verb works as before. The script uses Paseo's own daemon client, because `paseo schedule create` cannot set worktree isolation. A Paseo update that changes that client makes `/routine` stop and give the steps for the Paseo app.

**Setup adds one account: Cloudflare.** Every repo keeps its [memory store](memory.md) there, and every new install hosts its app there.

| Need | Why |
|---|---|
| A Cloudflare account | Holds the memory database and hosts the app. [Setup's provisioning](https://github.com/matthewwong525/WongStack/blob/main/.agents/skills/wong-setup/references/cloudflare.md) creates both from one user token. |
| The user token, `CLOUDFLARE_API_TOKEN` in `.env` | Provisions everything and mints the memory token and the CI deploy token. It stays on your computer. The [credentials page](../stack/cloudflare-credentials.md) owns how to make it. |
| The memory token, `CLOUDFLARE_MEMORY_TOKEN` | Reads and writes the store. [The memory page](memory.md#the-memory-token) owns its name and scope. |
| R2, optional | Keeps raw transcripts. It needs a payment method on file; without it, memory works and keeps no transcripts. |

The memory scripts use only Node's built-in modules, on the Node that OpenSpec already needs, and add no package or lockfile. `curl` drives the rest of provisioning.

## Symbolic links in the agent folder

Every install keeps its agent files in one real `.agents/` folder, with `.claude` and `.codex` as symbolic links to it ([the agent folder](../../.claude/skills/wong-sync/references/payload-manifest.md#the-agent-folder)). Git stores a link as a link, and macOS and Linux check it out as one. **On Windows, turn on `core.symlinks`** before you clone (`git config --global core.symlinks true`, with Developer Mode on). Without it, Git writes each link as a small text file that holds the path, and neither agent finds its skills.

To check that Codex reads the shared folder, run `codex features list` (the Default-mode question flag shows `true`) and `codex debug prompt-input "hi"` (each skill appears once). Neither calls a model. Run them in a trusted checkout: Codex ignores the project `config.toml` in an untrusted one, whatever the layout.

## `gh` needs the `workflow` scope

`gh auth login`'s minimum scope set is `repo`, `read:org`, `gist` — **`workflow` is not in it.** Without it, pushing any `.github/workflows/*.yml` file fails at *push* time, long after setup reported success, with wording a newcomer can't act on:

```
refusing to allow an OAuth App to create or update workflow
```

The pack's deploy workflow is the file that trips this, so any repo taking (or on) the stack pack needs the scope. The plain-language reason, for when you're asking a user: *"GitHub wants your permission before a tool can add an automated deploy step. This is that permission."*

- **Authenticating fresh:** request it up front — `gh auth login --web --git-protocol https --scopes workflow`. It costs nothing in the browser visit the login already requires.
- **Already authenticated:** check `gh auth status` for `workflow` in the token scopes; missing → `gh auth refresh --scopes workflow`.

`/wong-setup` catches this during readiness and [its provisioning step](https://github.com/matthewwong525/WongStack/blob/main/.agents/skills/wong-setup/references/cloudflare.md#4e-the-workflow) re-checks before relying on a push; both point here rather than re-explaining.

## Runtimes install at the point of need

**Nothing is installed pre-emptively.** A readiness check that installs Node "while we're here" is the one action in setup that changes the machine rather than the repo — so it isn't taken as a precaution. Setup proceeds until a step genuinely requires a runtime, then explains what and why, and asks.

When the answer is yes, prefer a **user-local** install (the [official installer](https://nodejs.org/) or `nvm` into `$HOME`) over a `sudo` package manager, which fails outright on plenty of managed laptops.

When the answer is no, setup doesn't dead-end — the layers degrade cleanly:

```
   git + gh + an agent   →  CLAUDE.md, wiki/, the skills       ← zero runtime
   + node → openspec     →  /plan, /apply, /save, /continue,
                            /ship, /improve, the memory scripts
   + a Cloudflare account →  session memory (R2 optional)
   + the stack pack      →  the running app                   ← nothing local
```

The instructions, the wiki, and the skills' text work with **no Node at all**. The planning verbs need the CLI, and session memory needs the Node it brings, because they ask it for artifact templates and the dependency graph at runtime rather than carrying a fork of its schema. Setup completes the runtime-free layer and names exactly which verbs are missing, so declining is a real choice rather than a failure.

## The Cloudflare stack pack

One exception, and its tools stay in CI. Every new install takes the Cloudflare stack pack, documented under `wiki/stack/`. It ships a handful of scripts that run `node`/`npm` and `wrangler` and expect a Cloudflare account. **Its tools are its own:**

- They run **only in that repo's own build/CI** — the pipeline scripts under `scripts/` that migrate and deploy. Nothing on your machine runs them.
- A repo installed before 18.0.0 that **declined the pack** runs the entire toolkit on `git`, `gh`, and `openspec` alone. It receives no pack file and needs no extra tool.

**`curl` is a provisioning dependency.** [Setup's provisioning](https://github.com/matthewwong525/WongStack/blob/main/.agents/skills/wong-setup/references/cloudflare.md) drives the Cloudflare REST API with `curl` rather than `wrangler`, so provisioning needs no app dependency installed.

**Pack-gated scripts may use `node`** where it's the better tool — JSON assembly, editing `wrangler.jsonc` — because a pack repo already requires it at its build boundary. The governing rule:

> Use a tool where it is already required. A skill may install a **tool** it needs at the point of need and say so; never let a WongStack skill be the reason a **runtime** gets installed without asking.

That's why provisioning is `curl`-first even though `npx wrangler` would be shorter: reaching for it would trigger an install during the one flow whose whole selling point is having no local setup.

So the core three-tool guarantee stays literally true for every repo: the pack adds tools to *its* repo's deploy pipeline, not to WongStack.

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

**For local JSON files, just read them.** Skills are instructions to an agent, and an agent reading a small file beats a subshell parsing it: state the fields, their defaults, and any expansion in prose. It handles absent keys, renamed files, and malformed input by *noticing*, where `jq -r '.x // empty'` silently yields a blank. [`/wong-sync`](../../.claude/skills/wong-sync/SKILL.md) Step 0 reads `.claude/.wong-stack.json` this way.

Reach for a shell pipeline only when you need determinism or volume — parsing four scalars is neither.

## Adding a dependency

Don't, unless the payload genuinely can't work without it. If a change seems to need a new tool, the first question is whether `gh`, `git`, or the agent itself can already do the job. If a new tool is truly required, it belongs in this page, in the `wong-setup` readiness step, and in the `CHANGELOG.md` entry for that change — a downstream repo shouldn't discover it by failing.

Other development processes live in [Development](README.md).
