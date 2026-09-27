# Design

## Context

Codex discovers project instructions by walking from the repo root to the working directory, reading `AGENTS.override.md`, then `AGENTS.md`, then any `project_doc_fallback_filenames` ([Codex docs](https://learn.chatgpt.com/docs/agent-configuration/agents-md)). The docs set that fallback list only in `~/.codex/config.toml`, which an install can't ship.

Three install paths exist today:

| Path | Rules file |
|---|---|
| this source | real `AGENTS.md`, `CLAUDE.md` → `AGENTS.md` |
| `server/install-wongstack.mjs` | real `AGENTS.md`, `CLAUDE.md` → `AGENTS.md` |
| `/wong-setup` (chat) | real `CLAUDE.md` only |

`/wong-sync` treats `CLAUDE.md` as a block unit (`payload-files.json` `blocks`). `preflight.mjs` `targetValue` reads the target with `readFileSync`, which follows a link, and `inside(target, realpathSync(path))` accepts a link that resolves inside the target. So a linked target already reads correctly. Only a test is missing.

`scripts/check-payload-links.mjs` excuses a shipped page that links `CLAUDE.md` through the source's link, because the target used to hold a real `CLAUDE.md`. After this change the target's `CLAUDE.md` is a link too, and GitHub's web view shows a file link as its target path, not the page. So shipped pages should link `AGENTS.md`, like source-only pages.

## Goals / Non-Goals

**Goals:**
- Every install, whichever path made it, has a real `AGENTS.md` with the `WONG-STACK` block and `CLAUDE.md` linking to it.
- Existing chat-setup installs migrate on their next `/wong-sync`, reviewed, with no lost prose.

**Non-Goals:**
- Editing the person's `~/.codex/config.toml`.
- Renaming the inventory's block unit from `CLAUDE.md` to `AGENTS.md`.
- Changing Claude Code's behavior.

## Decisions

**Real `AGENTS.md`, linked `CLAUDE.md`.** It matches the source and the server installer, so all three paths converge. The reverse direction (`AGENTS.md` → `CLAUDE.md`) would disturb fewer existing files, but leave installs split two ways.

**Migrate through the sync plan, not a script.** `/wong-sync` already turns each difference into a reviewed plan task, and its [agent folder](../../../.agents/skills/wong-sync/references/payload-manifest.md#the-agent-folder) section owns layout rules. The manifest gains the rule; the sync agent writes the task:
- real `CLAUDE.md`, no `AGENTS.md` → `git mv CLAUDE.md AGENTS.md`, then `ln -s AGENTS.md CLAUDE.md`.
- real `CLAUDE.md` and real `AGENTS.md` → merge both into `AGENTS.md` as a reviewed task, with one `WONG-STACK` block, then link.
- `CLAUDE.md` already links to `AGENTS.md` → nothing.

Windows installs make the link with `MSYS=winsymlinks:nativestrict`, as setup does for `.claude` and `.codex`. Setup's tool check already requires working links.

**Keep the block unit named `CLAUDE.md`.** The preflight reads through the link, so the unit keeps classifying the same. Renaming it would show every existing install a removed `CLAUDE.md` block and an added `AGENTS.md` block.

**Shipped pages link `AGENTS.md`.** `AGENTS.md` joins the checker's target file set, and the `CLAUDE.md` exception goes, so the one rule "link the real path" holds for shipped and source pages alike.

## Risks / Trade-offs

- **A target whose Git doesn't keep links** (Windows without `core.symlinks`) would get a text file named `CLAUDE.md` holding `AGENTS.md`. Setup's link test and the `nativestrict` prefix make that fail loudly instead.
- **The move shows as a rename in the target's history.** That's accepted; the person sees it on the review page first.
- **Unconfirmed live:** that Codex follows the source layout. This repo already works that way under Codex, which lowers the risk.
