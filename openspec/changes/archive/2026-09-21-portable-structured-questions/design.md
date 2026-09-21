## Context

See [proposal.md](proposal.md) for motivation. The current question mechanism names Claude `AskUserQuestion` and treats other structured tools generically. Codex 0.155.1 exposes the under-development `default_mode_request_user_input` feature, but it is off by default. Official Codex configuration supports trusted project overrides in `.codex/config.toml`.

## Goals / Non-Goals

**Goals:**

- Use a structured selection UI whenever Codex, Claude, or another host makes one callable.
- Enable Codex structured questions in Default mode only for the requested trusted repository.
- Keep `/improve` on `/explore`'s one question mechanism.

**Non-Goals:**

- Emulate a structured UI when the host does not expose one.
- Change a thread's collaboration mode.
- Enable an experimental feature in the user's global Codex configuration.
- Make ClaymooApp edits from the WongStack change.

## Decisions

### Name the two known tools and test callability

The question mechanism will prefer callable `request_user_input`, then callable `AskUserQuestion`, then any other host-equivalent structured tool. It will use numbered chat only when no structured tool is usable. Callability includes the active mode restriction; a tool name in instructions is not proof that the host permits a call.

This keeps host selection in one owner. `/improve` continues to link to `/explore`; it does not copy the selection rule. Direct `AskUserQuestion` wording in `/continue` will use the same portable rule.

Alternative: keep “host equivalent” only. Rejected because the first Codex run did not make the expected tool mapping clear to the user, and direct references elsewhere still named only Claude.

### Enable the Codex feature in project configuration

Add `.codex/config.toml` with `features.default_mode_request_user_input = true`. Project scope applies the setting to trusted WongStack checkouts and worktrees without changing other repositories. The flag is deterministic configuration; model instructions cannot make an unavailable tool callable.

Alternative: add the flag to `/root/.codex/config.toml`. Rejected because it would enable an under-development feature for every local repository, beyond the two repositories the user named.

### Keep tool choice as agent judgment

No script will select a question tool. Availability is supplied dynamically by the host, and the tool schema and mode limits can differ per turn. The deterministic part is the Codex feature flag; the remaining selection needs the active tool catalog.

### Publish a patch release

The portable naming and project configuration fix existing structured-question behavior without changing the workflow contract, so the release advances from 16.2.0 to 16.2.1.

## Risks / Trade-offs

- [The Codex feature is under development and can change name or behavior] → State the current supported flag in release notes and keep the numbered-chat fallback.
- [Older Codex versions might not recognize the feature] → Validate with the repository's installed Codex and avoid a user-wide setting; removing the project file rolls back cleanly.
- [A skill can still choose the wrong tool if a host advertises unusable metadata] → Require actual callability and preserve the chat fallback.

## Migration Plan

1. Ship the WongStack skill, spec, project configuration, and 16.2.1 release together.
2. Start a new Default-mode Codex session in the trusted WongStack checkout to confirm that the new session exposes `request_user_input`; the current session's tool catalog cannot change after startup.
3. Adopt 16.2.1 in ClaymooApp through its normal clean-worktree sync, then add the matching project-local Codex flag there. Track and report this as a second delivery for the user's request.
4. For rollback, remove the project feature flag and restore generic tool wording; numbered chat remains available throughout.
