# Design

## Context

The README's *Start in three steps* sends people to the Claude desktop app and has them paste a three-line prompt with the raw `wong-setup/SKILL.md` address. [`wiki/stack/getting-started.md`](../../../wiki/stack/getting-started.md) repeats those steps as five. The token is made by the click path on [`cloudflare-credentials.md`](../../../wiki/stack/cloudflare-credentials.md#create-the-token), which [`wong-setup/SKILL.md`](../../../.agents/skills/wong-setup/SKILL.md) and [`cloudflare.md`](../../../.agents/skills/wong-setup/references/cloudflare.md) quote when they ask for it. [`required-tools.md`](../../../wiki/development/required-tools.md) calls Paseo optional; setup adds presets only when `paseo` is installed.

Two constraints shape this. Paseo runs the agent CLIs already on the computer and bundles none (paseo.sh docs). And `scripts/tests/downstream-contract.test.mjs` requires at least one raw `…/refs/heads/main/<path>` address in the README that names a tracked file, because hosted setups read it.

## Goals / Non-Goals

**Goals:**

- A newcomer reads three short steps and one line to paste.
- The token is made from one link, and a test holds that link to the two groups in [`permission-groups.md`](../../../.agents/skills/wong-setup/references/permission-groups.md#what-the-user-grants).

**Non-Goals:**

- Installing Paseo, Claude Code, or Codex from setup.
- Changing the widen, the account choice, or the failure map's token messages.

## Decisions

- **The prompt names the repo; an agent line carries the raw address.** Prompt: `Install WongStack in this folder from github.com/matthewwong525/WongStack`. Right under the box, one italic line: *For the agent: read and follow `https://raw.githubusercontent.com/matthewwong525/WongStack/refs/heads/main/.agents/skills/wong-setup/SKILL.md`.* An agent that opens the repo reads the README and finds it; setup already handles a pasted URL ([Get the latest source](../../../.agents/skills/wong-setup/SKILL.md#get-the-latest-source)). Alternative: keep the raw address in the prompt; reliable, but the long line is what we're removing. Alternative: a root `INSTALL.md`; another page to find, and it would repeat the steps.
- **Step 1 is Claude Code (or Codex) and Paseo.** The README links Claude Code's and Codex's own install pages and paseo.sh, rather than copying their install commands, which drift. *Where you chat* leads with Paseo on the computer and the phone; the Claude desktop app line goes. The "other agents" line stays, one sentence.
- **Setup checks `paseo` in [`tools.md`](../../../.agents/skills/wong-setup/references/tools.md), outside the blocking table.** A new short section after the tools: `command -v paseo`; missing → one plain sentence and the paseo.sh link, then continue. The closing report (runbook Step 5) already names the presets; it adds one line when Paseo is present: pair a phone from Paseo's **Settings → your host → Pair Device**. Alternative: install `@getpaseo/cli` with npm, as `server/setup.sh` does; a laptop wants the desktop app, which bundles the daemon, and a second daemon would clash.
- **The token link is a Cloudflare user-token template URL.** `https://dash.cloudflare.com/profile/api-tokens?permissionGroupKeys=<encoded>&accountId=*&zoneId=all&name=WongStack`, where `<encoded>` is the URL-encoded `[{"key":"<user API Tokens key>","type":"edit"},{"key":"<account API Tokens key>","type":"edit"}]`. The two keys are unknown from docs, so task 1.1 finds them on a real dashboard and records them in a *Key* column of *What the user grants*. `accountId=*` grants all accounts, so Account Resources can't be left unset; [the account choice](../../../.agents/skills/wong-setup/references/cloudflare.md) still asks when the token sees two. `zoneId=all` is required by the format and grants nothing, since neither group is zone-scoped. The widen keeps the `resources` block as is, so an all-accounts block survives.
- **A test decodes the link.** `provision.test.mjs` already pins the script's groups to `permission-groups.md`; it gains a test that finds the template URL on `cloudflare-credentials.md`, decodes `permissionGroupKeys`, and asserts the two keys from the table, `type: edit`, `accountId=*`, and `name=WongStack`. A key edited on one page and not the other fails.
- **The README owns the steps; getting-started keeps the rest.** Getting started drops *The five steps* and *You don't need to have built anything yet*, and links the README's steps from its first lines. It keeps *What you'll end up with*, *What it costs*, *After that*, the manual-steps list (now: install Claude Code or Codex, get Paseo, GitHub, tools, Cloudflare, the key), the login wall, *When something goes wrong*, and teardown. Anchors other pages link (`#teardown` and the like) keep their exact heading text.

## Risks / Trade-offs

- [Cloudflare drops or renames template keys, so the form opens with rows missing] → the credentials page says to check the two rows before Create, and the click path stays beside the link; the failure map still names a missing permission.
- [An agent given only the repo name never opens the README] → the prompt names the full repo address; setup's own path from a pasted URL clones it. The raw address stays on the agent line for agents that read the page.
- [Step 1 now needs Claude Code's installer, which may open a terminal] → the README says so plainly and links the vendor's page; it's the one terminal moment, before the chat exists.
- [All-accounts reach is wider than one account] → it matches what a person selecting their only account gets today, and the widen already made the token account-root; the credentials page's trade-off section covers it.

## Migration Plan

None for installs: `/wong-sync` brings the new wiki pages and setup text, with no hand step.
