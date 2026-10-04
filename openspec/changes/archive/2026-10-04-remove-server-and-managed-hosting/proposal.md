# Remove the server and managed-hosting pieces

**Status:** ready-to-ship

**Branch:** fabulous-unicorn

**Open questions:** none

## Why

WongStack now has one way in: you run it from your own computer, with your own GitHub and Cloudflare accounts. wongstack.com becomes a landing page only, so the parts of this repo that existed to serve it, or to set up a rented server, have no one left to use them. Left in place they keep costing: every change is checked against them, and the guides describe a route nobody can take.

## What Changes

- **One way in, not three.** The repo stops carrying the server setup and the wongstack.com-managed route. Installing from your own computer through GitHub works exactly as it does today.
  ```text
        BEFORE                    AFTER
  your computer ─▶ GitHub   your computer ─▶ GitHub
  wongstack.com ─▶ managed
  your server ─▶ setup
  ```
- **The server folder goes.** **BREAKING** for anyone who sets up servers from it: the script that turns a fresh server into a workspace, the helper that runs on that server, and the installer it used all leave the repo. They stay in the repo's history at version 30.10.0 for anyone who needs them.
- **Saving and publishing stop looking for a managed workspace.** Setup, save, publish and resume no longer check first whether the project is hosted by wongstack.com. They go straight to the GitHub steps they already use.
- **The guides describe one route.** Getting started, the stack overview and the change-loop page drop the managed route, and the managed-projects page is removed. Nothing in them promises a hosted service.
- **The automatic checks get lighter.** The checks no longer build a hosted starter or test the server pieces, so about fifteen test files leave and each check run has less to do.
- **Installed projects lose nothing they used.** Managed hosting was never switched on for anyone. The next update of an installed project removes the unused pieces and asks for nothing.

**Non-goals:** Moving the landing page into this repo. Shutting down the wongstack.com app, its servers, or its keys. The new route that keeps a project in your own Cloudflare account. Rewriting the changelog's history or archived plans. Changing how setup creates your site, database, memory, or login wall.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `delivery-gate`: the managed Artifacts route leaves the gate, save, precondition, branch-cleanup and one-route requirements; the GitHub wording stays.
- `install-onboarding`: the hosted-workspace check, the hosted starter, the server setup script, the unattended server installer and its rerun leave; interactive setup stays.
- `cloudflare-provisioning`: the shared provisioning script serves `/wong-setup` only.
- `dependencies`: no server script installs Paseo or the tunnel tool.
- `paseo-defaults`: only setup adds the agent presets.
- `cloudflare-hosted-projects`, `managed-workspace-access`, `server-agent`, `preserved-server-setup`: retired whole.

## Impact

- **Deleted:** `server/` (20 files); `.agents/skills/save/scripts/hosted-delivery.mjs`, `hosted-main-pre-push.mjs`, `.agents/skills/save/references/hosted-delivery.md`; `.agents/skills/wong-sync/scripts/hosted-context.mjs`; `scripts/check-hosted-starter.mjs`; `scripts/acceptance/`; `wiki/stack/hosted-projects.md`; fifteen `scripts/tests/server-*.test.mjs` and `hosted-*.test.mjs` files; four specs.
- **Edited, shared with the GitHub route:** `.agents/skills/save/scripts/saved-revision.mjs` and its test; the `/wong-setup`, `/save`, `/ship`, `/continue`, `/apply`, `/verify` and `/wong-sync` skill text; `.agents/skills/memory/references/areas.json`; `.agents/skills/update-dependencies/scripts/update.mjs`; `.env.example`; `.github/workflows/payload.yml`; `scripts/tests/.c8rc.json`; `README.md`; `.github/CONTRIBUTING.md`; nine wiki pages.
- **Unchanged in behavior:** `provision.mjs` and `private-access.mjs` (comments only), `.github/scripts/checks.mjs` (untouched), the GitHub route of every verb.
- **Release:** a major `CHANGELOG.md` entry and new `scripts/retired-names.json` rows.
- **Other work in flight:** the own-account Artifacts part edits the same verbs and the change-loop page; `installation-owned-memory-devices` edits three `server/` files and one requirement this change removes. Whichever publishes second catches up.

## Decision log

- **2026-10-04** — Asked what stays of the server and managed hosting → chose none of it: "None of it should be in this repo for now." wongstack.com becomes a landing page and people run WongStack from their own computer.
- **2026-10-04** — Asked whether the GitHub route changes → chose it stays exactly as it is.
- **2026-10-04** — Assumed: the script setup uses to create your Cloudflare site keeps every behavior, the open-until-you-add-a-card finish included, because interactive setup uses the same option; only its comments named the server installer.
- **2026-10-04** — Assumed: the checks' option that only lists which checks apply stays, because it holds nothing about hosting and the own-account Artifacts part may call it; only one test's title changes.
- **2026-10-04** — Assumed: this is a major release, because a fork that sets up servers from the server folder loses it; an installed project on GitHub has nothing to do.
- **2026-10-04** — Assumed: the frozen sample documents used to test search keep their old wording, because they are fixed snapshots whose content the tests pin.
- **2026-10-04** — Assumed: publishing this before wongstack.com is shut down breaks no running server, because the server guide has each host copy the source at a fixed earlier version, which stays in history. How the wongstack.com app pins it was not checked in its own repo.
- **2026-10-04** — Assumed: the line on Matthew's page that prefers a sign-in service "hosted inside WongStack cloud" loses that clause, because that cloud is going; his wish for free, generic connections stays.
- **2026-10-04** — Assumed: the example "a computer with no recent chats, such as a hosted server" stays, because it describes any server, not the managed service.
- **2026-10-04** — Check: `scripts/tests/server-agent-contract.test.mjs`, `scripts/tests/server-agent-copy.test.mjs`, `scripts/tests/server-agent-management.test.mjs`, `scripts/tests/server-agent-roll.test.mjs`, `scripts/tests/server-agent-runtime.test.mjs`, `scripts/tests/server-agent-source.test.mjs`, `scripts/tests/server-agent.test.mjs`, `scripts/tests/server-install.test.mjs`, `scripts/tests/server-preservation.test.mjs`, `scripts/tests/server-project.test.mjs`, `scripts/tests/server-setup.test.mjs` are deleted, because the server code they test is deleted with them. The one test in them that guards something else, that every place naming the OpenSpec version agrees, moves to `scripts/tests/update-dependencies.test.mjs`.
- **2026-10-04** — Check: `scripts/tests/hosted-acceptance-evidence.test.mjs`, `scripts/tests/hosted-bootstrap.test.mjs`, `scripts/tests/hosted-delivery.test.mjs`, `scripts/tests/hosted-starter.test.mjs` are deleted, because the managed-hosting code they test is deleted with them.
- **2026-10-04** — Check: `.github/workflows/payload.yml` drops the hosted-starter step and the `server` paths from its lint and shell checks, because those files are gone; every other check stays.
- **2026-10-04** — Check: `scripts/tests/.c8rc.json` stops measuring `server/` and `scripts/acceptance/`, which no longer exist; the coverage floors stay where they are.
- **2026-10-04** — Assumed while building: a few leftover mentions the design did not list go too, because no live file should name the server or the managed route. They are the fourth "server setup script" clause and the Paseo sentence on the required-tools page, the "on a hosted server" sentence on the login-wall page, one test's failure message, one test helper's comment, the dependency test's title (three pins, not five), and one line of the revision-check notes. Nothing behaves differently.
- **2026-10-04** — Assumed: the retired-name check and the leftover search are confirmed again after the plan is archived, because archiving is what rewrites the main specs; the automatic checks' result is read at the publish checkpoint, not ticked as a build task.
- **2026-10-04** — Archive checkpoint: built, archived and numbered 31.0.0; the retired-name check, the leftover search, the link check and spec validation pass against the reconciled specs.
