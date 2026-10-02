# Tasks

## 1. Setup instructions

- [x] 1.1 Update the Windows tools preflight to configure Git unconditionally, probe real directory and file links without masking failures, and automatically enable Developer Mode through an elevated PowerShell command when needed. Verify shell syntax and exercise the probe's success and simulated failure on this Linux host; inspect elevation arguments against Microsoft documentation and record that native Windows approval is untested.
- [x] 1.2 Keep the native-strict creation of installation links and verify the resulting links before proceeding; inspect setup instructions for ordering and no-copy behavior.

## 2. Starting message and guides

- [x] 2.1 Include the raw setup guide URL in the README's single copied prompt and remove its separate agent-only line; inspect that the prompt works without discovered skills.
- [x] 2.2 Update required-tools to explain automatic setup and link to the canonical procedure, and getting-started to list conditional Windows approval; verify simple wording, no duplicate procedure, and that all wiki links pass.
- [x] 2.3 Add a `## Next (minor)` changelog entry with the automatic Windows setup and copied prompt changes, leaving VERSION unchanged; verify the entry exists.

## 3. Integration checks

- [x] 3.1 Run payload-link, OpenSpec-config, context-budget, wiki, and strict change-validation checks; fix any failure introduced by this change and report the Windows-host limitation.
