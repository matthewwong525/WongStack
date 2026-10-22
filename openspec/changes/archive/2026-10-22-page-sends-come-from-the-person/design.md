# Design

## Context

One page server serves every reply link on the computer, with its state in `~/.wong-stack/reply-link`. The first opener spawns it with its own env, so the server keeps that chat's `PASEO_AGENT_ID`. `wakeChat` in `.agents/skills/hand-over/scripts/lib/wake.mjs` runs `paseo send` with the env it inherits, and Paseo names a send's sender from `PASEO_AGENT_ID` (`@getpaseo/cli`, `dist/commands/agent/send.js` and `dist/utils/caller-agent.js`). Every later send, from any repo, then reads *[Message received] <first chat's title>*.

WongStack has a second long-lived waker WongOS lacks: the inbox helper (`reply-link.mjs serve-inbox`), started by `startInbox` with the opener's env, which delivers inbox taps through `wakeChat`. It records only `{pid}` in `inbox.json` and keeps running while any item is open.

WongOS fixed the page server in its PR #178 (merged 2026-10-22).

## Goals / Non-Goals

**Goals:** every wake reaches its chat as the person's own message; a server or inbox helper from older code is replaced on the next open, keeping open links at their addresses.

**Non-Goals:** no change to the chat target, header, limits, actions, or routes; no change to `chatTarget`, which still reads the opener's `PASEO_AGENT_ID` to name the chat a link wakes.

## Decisions

- **Strip the sender in `wakeChat`, not at spawn.** A `personEnv(env)` copy drops `PASEO_AGENT_ID` and `PASEO_AGENT_CWD`; `execFile` gets `env: personEnv(env)`. `--home` and `--host` still come from the target, and `PASEO_HOME`/`PASEO_HOST` stay in the env. One place covers the page server, the inbox helper, and `hand-over.mjs`. Stripping at spawn instead would miss a caller and leave the server unable to tell why. The caller's env object is not mutated.
- **`PROTOCOL` 3 → 4.** `ensureServer` already swaps a live server whose `protocol` is lower, keeping its port, tunnel, and origin. Raising it is the whole update path for the page server, as in WongOS.
- **The inbox helper gets a protocol too.** `startInbox` writes `{pid, protocol: PROTOCOL}`. When `inbox.json` names a live pid whose `protocol` is missing or lower, and that pid's command line is `reply-link.mjs serve-inbox` (a reused pid is never signalled), it SIGTERMs that pid, waits for it to end (as `swapServer` waits), then spawns the new one. The old helper's `serveInbox` loop re-reads `inbox.json` only between rounds, so killing it is what stops it. A *Build it* tap the old helper was waking mid-round can be lost: it shows *Didn't arrive*, and a retry finds the action marked done and reports sent with no message. Matthew accepted that once-per-install window over the added code to close it. Alternative: leave it to stop on its own once no item is open; rejected because a plan rebuilt each day keeps it alive indefinitely.
- **Tests extend WongStack's own files.** WongOS added `lib/wake.test.mjs` and `reply-link.test.mjs` beside the scripts; WongStack already tests the wake and the swap in `scripts/tests/reply-link.test.mjs`, so the new checks go there, generalized, with no WongOS names or paths. `fakePaseo` gains an optional env record so both tests read what `paseo send` ran with.

## Risks / Trade-offs

- **A host whose `paseo send` needs `PASEO_AGENT_ID` to resolve the daemon.** It doesn't: the target's `--home`/`--host` carry that, and WongOS has run this since 2026-10-22.
- **`hand-over.mjs` wakes now arrive as the person's message too.** Those report a private link's result (*key received*), which is the person's action, so this is right.
