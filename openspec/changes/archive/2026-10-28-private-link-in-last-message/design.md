# Design

## Context

`hand-over.mjs open` prints `HANDOVER_LINK=<url>` in `startLink` (near line 495) and returns. Four guides say "send the `HANDOVER_LINK` it prints, and run `wait` in the background": `passwords.md` (*How*), `live-view.md` step 3, `private-form.md` step 3, `secrets.md` step 3. None says *where* to send it. Source: WongOS PR #220 (`matthewwong525/WongOS` commit `c88ef93`), archived there as `2026-10-28-private-link-in-last-message`. WongStack's files differ (one link at a time, not per chat; tests in `scripts/tests/`), so this ports by hand.

## Goals / Non-Goals

**Goals:** the link always lands in the turn's last message; one owner for the rule; a deterministic nudge from the tool.

**Non-Goals:** reply links (`reply-link.mjs`); any WongOS path, person's name, or per-chat behavior.

## Decisions

- **Owner: a *Send it last* bullet in `browsing.md#how-private-links-work`, after *Ask first*.** Text: the agent runs `open`, starts `wait` in the background, then ends its turn with the link on its own line, never only between steps: the chat often hides that text. `open` prints a `HANDOVER_SEND=` reminder under the link. The four guides link *end your turn with the `HANDOVER_LINK` it prints* to that section. Alternative: the sentence on each page; rejected, a second copy goes stale.
- **Tool nudge: a fixed `HANDOVER_SEND=` line right after `HANDOVER_LINK=`.** A `SEND_REMINDER` constant beside the other constants, with a one-line comment on why: `Run wait in the background, then end this turn with the link above on its own line; text between tool calls may not show.` The usage line for `open` names it. A printed line beats prose alone ([principles](../../../wiki/agent-knowledge-center.md#most-process-improvements-shouldnt-use-ai)); it holds no secret, so it is safe in logs. Alternative: a hook that scans the final message; rejected as heavy for one line.
- **Order: `wait` before the message.** `wait` must start in the background before the turn ends, so the final message is the turn's last act.
- **Word cap.** `browsing.md` is at 2,909 of 3,000 words; the new bullet adds about 45. Trim the *Always through Cloudflare* and *Is a link safe?* paragraphs as WongOS did, keeping every fact.
- **Tests.** In `scripts/tests/hand-over.test.mjs`, the `opened` helper asserts `HANDOVER_SEND=` is the line right after `HANDOVER_LINK=` and that it matches no `https?:`, `key=`, or `trycloudflare`; so every open in the file checks it. The refused-open test and the never-answers test assert no `HANDOVER_(LINK|SEND)=` line.
- **Pull request.** This repo is WongStack, so the change publishes through the normal `/save` → `/ship`. Before the first `/save` opens the pull request, show the person its title and body and wait for a yes. The body argues generality: any chat app may hide text between tool calls; the line costs one print and carries no secret; it is already live in one install.

## Risks / Trade-offs

- [The agent still ignores the line] → the guides back it, and the line arrives at the exact moment.
- [A parser reads every `HANDOVER_*` line] → `wait` and the inbox read only their own keys; existing tests still match `HANDOVER_LINK`.
- [`per-chat-private-links` edits the same bullets] → whichever publishes second rebases and keeps both: the *Send it last* bullet and its per-chat wording.
