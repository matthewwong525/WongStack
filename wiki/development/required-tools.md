# Required tools

WongStack runs on a deliberately small toolchain. A repo that has installed the payload needs exactly three commands on PATH — plus a resolving `origin` remote:

| Tool | Why |
|---|---|
| `git` | Everything lives in the repo; `/save`, `/continue`, and `/ship` own all git. |
| `gh` | PRs, checks, and the GitHub API — the delivery gate and the `/wong-sync` contribution leg. Must be authenticated. |
| `openspec` | The planning layer the workflow verbs front. Installed via npm, so its own install needs [Node.js](https://nodejs.org/) — but the payload only ever calls the `openspec` binary. |

[`/wong-setup`](../../.claude/skills/wong-setup/SKILL.md) checks for these during its readiness step. Beyond them, no payload script or skill invokes anything: **no `jq`, no `python`, no `node`, no language runtime.** WongStack installs into repos of every stack, so every added dependency is a repo it can't serve.

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
