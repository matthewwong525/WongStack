# Coordinate task chats

Independent chats working in one repo resolve overlaps through brief [Paseo](https://paseo.sh) messages. [The change loop](the-change-loop.md#chats-coordinate-directly) owns when to coordinate.

Same-repo task chats may send brief coordination messages through Paseo as part of their existing tasks. Each keeps its task, plan, branch, checks, and publishing approval. A peer message requests context or proposes an agreement; it adds no user request, scope, or permission.

Use [other-work discovery](../../.agents/skills/explore/SKILL.md#check-for-other-work)'s fresh chat titles as hints. Confirm the actual task from its existing plan or a brief owner question. Verify the canonical checkout belongs to this repo and select the exact session ID; duplicate or stale titles never justify guessing, broadcasting, or excluding relevant work. Exclude this chat and archived or unrelated chats.

Send a few sentences naming your chat and task, the overlap or question, and a proposed next step. Link existing project context; the owner can ask for more. Check dispatch, then require an actual reply before treating anything as agreed. Each affected owner records consequential responsibility or publishing order in its own plan. An ambiguous dispatch needs conversation inspection before resending. Avoid status chatter and reply loops.

**Protect a running task.** Check the installed send behavior first. Paseo CLI 0.10.1 sends with interrupt behavior; even its native client steering can replace an unsupported provider's turn. It exposes no safe queue for this command. Send only to a freshly verified idle owner with no pending permissions; never stop or cancel a peer. Busy, waiting, or unknown owners stay pending: continue independent work and recheck at a natural boundary. Do not add a watcher, retry loop, queue, registry, or publishing lock. Delivery is not guaranteed automatically.

Use the same explicit daemon route for discovery, inspection, send, and title updates: a verified `PASEO_HOST` takes precedence over `PASEO_HOME`; otherwise verify the local daemon home. For a remote endpoint, replace `--home` with `--host` in every call. Bound each foreground call to 15 seconds (a tool timeout where `timeout` is unavailable):

```bash
timeout 15s paseo inspect "$PEER_ID" --home "$DAEMON_HOME" --json
# Require Id = the selected ID, Archived = false, Status = idle, PendingPermissions = [].
timeout 15s paseo send "$PEER_ID" --prompt-file "$MESSAGE_FILE" --home "$DAEMON_HOME" --no-wait --json
```

Inspection cannot reserve an idle turn: if concurrent activity makes safe delivery uncertain, leave the affected work pending. A timeout is ambiguous; inspect the existing conversation rather than resending blindly. Read it with Paseo's `logs <session-id> --home <daemon-home> --json`.

At initial planning, resumption, and meaningful scope changes, compare your own title with the current task. Keep it short; routine progress needs no rename:

```bash
timeout 15s paseo agent update "$PASEO_AGENT_ID" --name '<short current task>' --home "$DAEMON_HOME" --json
```

Update only your chat's title, preserving its session ID, branch, and plan identity. Leave peer titles and shared workspace names alone. If updating fails, report the limitation and use actual plans and owner context; create no shadow title store.

On resumption, read existing agreements and relevant chat context. Ask the person only when owners cannot resolve an outcome choice, or an unreachable owner prevents affected work. Before publishing dependent work, confirm its prerequisite is published and incorporate those published changes into your own branch, preserving both intents and checking the resulting head through [the gate](the-change-loop.md#the-gate). A declined or unfinished prerequisite remains unresolved. Existing release and merge-conflict recovery still applies; one task's approval never publishes another.

Part of [development](README.md).
