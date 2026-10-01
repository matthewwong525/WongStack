# Make WongStack your own

**Status:** ready-to-ship
**Branch:** fork-wongstack-guide
**Open questions:** none

## Why

WongStack invites you to copy and change it, but the guide to making your own version is scattered. Your version should keep the same easy setup: give the assistant your fork's address and let it install and host a fresh project.

## What Changes

- **A guide to customizing the stack.** Explain how to fork WongStack, change the defaults and tools that new projects receive, and maintain your version. Link it from the main introduction and setup guide.
  ```text
  WongStack ──▶ your fork ──▶ your defaults
                    │
                    ▼
              easy setup
                    │
                    ▼
             your hosted project
  ```
- **Easy setup works with your fork.** A request to install from your fork uses that version throughout setup, including its starter site and hosting guidance. A request with no custom source keeps the usual WongStack setup.
  ```text
  install from your fork
            │
            ▼
  tools ──▶ hosting ──▶ site online
  ```
- **Updates keep following your version.** Explain how to bring WongStack improvements into your fork, then update projects from it while preserving their own changes.
  ```text
  WongStack improvements
            │
            ▼
         your fork
            │
            ▼
     review project update
  ```

Non-goals: building a customer sign-up service, changing the current hosting provider, or making every possible forked hosting architecture work automatically.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `install-onboarding`: easy setup honors an explicitly selected fork and records it as the installed project's source.
- `wong-sync`: installed projects retrieve updates from their recorded source, including a customized fork.

## Impact

Documentation in `README.md`, `wiki/stack/`, and `server/README.md`; source selection in `.agents/skills/wong-setup/` and `.agents/skills/wong-sync/references/latest-source.md`; install-record guidance in the payload manifest. No new dependencies or host protocol changes. A minor payload release records the new setup behavior. Current branch: `fork-wongstack-guide`.

## Decision log

- **2026-10-01** — Asked whether this is for a team or a hosted service → chose a guide for people who want to customize the stack.
- **2026-10-01** — Asked whether to make a concrete plan → chose Plan it.
- **2026-10-01** — Assumed: keep easy setup through WongStack for the custom version, because the user explicitly said that path should remain available.
- **2026-10-01** — Assumed: place the guide in the shipped stack wiki and link from the README, because both new readers and installed projects need to find it.
- **2026-10-01** — Assumed: retain the existing Cloudflare hosting flow and use the chosen fork's guidance, because this request adds customization guidance rather than a new deployment system.
- **2026-10-01** — Asked whether to publish the completed change → chose Publish it. Archived the completed plan for the release checkpoint; automated checks precede merging. A real selected-fork install remains unverified.
