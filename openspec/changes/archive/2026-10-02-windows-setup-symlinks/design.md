# Design

## Context

See proposal.md for the problem. Setup already reads its tools reference remotely before cloning. Its Windows check currently sets `core.symlinks` only after a failed probe, and the copyable README prompt omits the raw guide address. Git Bash is the native Windows shell used by the existing setup instructions.

## Goals / Non-Goals

**Goals:** make a fresh Windows setup automatic through the assistant, preserving native link checks and simple messages.

**Non-Goals:** repair old clones, change OS policy, introduce a new installer, or add a new screen.

## Decisions

- Keep the flow in `.agents/skills/wong-setup/references/tools.md`: set `git config --global core.symlinks true` unconditionally on native Windows before the source checkout. Stop if writing that setting fails. Leaving it conditional permits broken source clones even when native links work.
- Probe directory and file symlinks with `MSYS=winsymlinks:nativestrict`, `test -L`, and readable targets in a temporary directory. Use a subshell and cleanup trap so cleanup cannot hide the probe's failure.
- If the probe fails, enable Developer Mode using Microsoft's documented `AllowDevelopmentWithoutDevLicense` registry value through PowerShell `Start-Process reg.exe -Verb RunAs -Wait -PassThru`. Explain the Windows permission dialog before launching it; the user approves it in Windows. Retest after successful elevation. Do not repeatedly request elevation after cancellation, modify organization policy, or claim success from the registry change alone. If the command cannot launch the dialog, guide the person through Settings as a fallback. If policy blocks it, stop and name the help needed.
- Put the guide's raw URL inside the copied one-line README prompt. Remove the separate agent-only line, since it is not copied with the prompt. The nontechnical person pastes one message without needing skill discovery.
- Update the required-tools page by linking the canonical procedure and add the conditional Windows approval to getting-started's manual-step list. Add a minor release entry without changing VERSION.

## Risks / Trade-offs

- No native Windows host here → inspect the Windows commands against Microsoft documentation and validate the probe's failure semantics on Linux; report that Windows approval remains untested.
- Administrator approval or organization policy may block the change → stop clearly; keep Settings guidance as the supported fallback when automation cannot launch, and never bypass a refused prompt.
- Global Git configuration applies to later clones → limit the change to `core.symlinks`, the prerequisite already promised by setup.

Reference: [Microsoft's Developer Mode instructions](https://learn.microsoft.com/en-us/windows/advanced-settings/developer-mode#use-powershell-to-enable-your-device).
