## REMOVED Requirements

### Requirement: Memory installs as one plugin with its own hooks

**Reason**: Memory no longer loads as a plugin, so its hooks ran only in a trusted folder; the project's settings run them now, and Codex needs no per-computer install.
**Migration**: An install's update adds memory's hooks to its settings and removes the plugin files; memory alone updates by its setup guide's `## Update`. See "Memory installs as one folder whose hooks the project runs".

## ADDED Requirements

### Requirement: Memory installs as one folder whose hooks the project runs

The core memory SHALL ship as one folder that carries the list of its start-of-chat, message, before-edit, and end-of-chat hooks for Claude Code and Codex. Every repo that has memory, a full WongStack install or memory alone, SHALL hold it as a real folder in its skills folder and SHALL run those hooks from the project's own settings, never through a plugin, so they run in every chat, trusted folder or not. Claude Code and Codex SHALL load it from the repo's own checkout with no install step on the computer, so a branch runs its own copy. No repo SHALL need a plugin shop to get memory.

#### Scenario: An install after its update

- **WHEN** a WongStack install takes this release with its update, and a person opens a new Claude Code chat in it, in a folder the person never trusted
- **THEN** memory is a real folder in the install's skills folder with no plugin manifest, the digest loads, the before-edit warning shows on the first edit in a mapped folder, and a message naming a topic gets its summary

#### Scenario: Memory alone

- **WHEN** a person adds memory alone to a repo by the setup guide, and opens a Codex chat there
- **THEN** the repo's own Codex hooks file runs memory's hooks, and the chat installs no Codex plugin
