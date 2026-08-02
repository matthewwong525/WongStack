# Required tools

WongStack runs on a deliberately small toolchain. A repo that has installed the payload needs exactly three commands on PATH — plus a resolving `origin` remote:

| Tool | Why |
|---|---|
| `git` | Everything lives in the repo; `/save`, `/continue`, and `/ship` own all git. |
| `gh` | PRs, checks, and the GitHub API — the delivery gate. Must be authenticated. (`/wong-sync` doesn't need it: its clone refresh is plain `git`, and it opens no PRs. [Contributing](../contributing.md) upstream is a manual PR, where you'd use `gh` yourself.) |
| `openspec` | The planning layer the workflow verbs front. Distributed only as an npm package (no standalone binary), so it needs [Node.js](https://nodejs.org/) — but the payload only ever calls the `openspec` binary. |

`/wong-setup` checks for these during its readiness step when it installs WongStack into a repo. Beyond them, no core payload script or skill invokes anything: **no `jq`, no `python`, no `node`, no language runtime.** WongStack installs into repos of every stack, so every added dependency is a repo it can't serve.

## `gh` needs the `workflow` scope

`gh auth login`'s minimum scope set is `repo`, `read:org`, `gist` — **`workflow` is not in it.** Without it, pushing any `.github/workflows/*.yml` file fails at *push* time, long after setup reported success, with wording a newcomer can't act on:

```
refusing to allow an OAuth App to create or update workflow
```

The pack's deploy workflow is the file that trips this, so any repo taking (or on) the stack pack needs the scope. The plain-language reason, for when you're asking a user: *"GitHub wants your permission before a tool can add an automated deploy step. This is that permission."*

- **Authenticating fresh:** request it up front — `gh auth login --web --git-protocol https --scopes workflow`. It costs nothing in the browser visit the login already requires.
- **Already authenticated:** check `gh auth status` for `workflow` in the token scopes; missing → `gh auth refresh --scopes workflow`.

`/wong-setup` catches this during readiness and [`/wong-cloudflare`](../../.claude/skills/wong-cloudflare/SKILL.md) re-checks before relying on a push; both point here rather than re-explaining.

## Runtimes install at the point of need

**Nothing is installed pre-emptively.** A readiness check that installs Node "while we're here" is the one action in setup that changes the machine rather than the repo — so it isn't taken as a precaution. Setup proceeds until a step genuinely requires a runtime, then explains what and why, and asks.

When the answer is yes, prefer a **user-local** install (the [official installer](https://nodejs.org/) or `nvm` into `$HOME`) over a `sudo` package manager, which fails outright on plenty of managed laptops.

When the answer is no, setup doesn't dead-end — the layers degrade cleanly:

```
   git + gh + an agent   →  CLAUDE.md, wiki/, notes/, the skills,
                            /save, /continue, /dream          ← zero runtime
   + node → openspec     →  /plan, /apply, /ship
   + a Cloudflare token  →  the running app                   ← nothing local
```

The knowledge center — most of what WongStack promises — works with **no Node at all**. Only the planning verbs need the CLI, because they ask it for artifact templates and the dependency graph at runtime rather than carrying a fork of its schema. Setup completes the runtime-free layer and names exactly which verbs are missing, so declining is a real choice rather than a failure.

## The opt-in Cloudflare stack pack

One exception, and it proves the rule by staying opt-in. The Cloudflare stack pack — documented under `wiki/stack/` in a repo that took it — ships a handful of scripts that run `node`/`npm` and `wrangler` and expect a Cloudflare account. That's more than the core three tools — so the pack is **opt-in, and its tools are its own:**

- They run **only in a repo that explicitly took the pack** (`components.stackPack: true`), and **only in that repo's own build/CI** — the pipeline scripts under `scripts/` that migrate and deploy.
- A repo that **declined the pack** runs the entire toolkit on `git`, `gh`, and `openspec` alone, exactly as before. It receives no pack file and needs no extra tool.

**`curl` is a pack-gated skill dependency.** [`/wong-cloudflare`](../../.claude/skills/wong-cloudflare/SKILL.md) drives the Cloudflare REST API with `curl` rather than `wrangler`, so provisioning works on a machine with no runtime installed. (An earlier version of this page said pack tools run "never inside a WongStack skill." That was true when no skill touched Cloudflare; it isn't now, so the carve-out is named rather than quietly broken.)

**Pack-gated scripts may use `node`** where it's the better tool — JSON assembly, editing `wrangler.jsonc` — because a pack repo already requires it at its build boundary. The governing rule:

> Use `node` where it is already required. Never let a WongStack skill be the reason a runtime gets installed.

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
