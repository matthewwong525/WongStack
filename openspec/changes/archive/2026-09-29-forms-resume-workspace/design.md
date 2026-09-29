# Design

## Context

See [proposal.md](proposal.md) for the requested outcome. `hand-over.mjs` launches a detached watcher for all three private-link modes. Its `finish` closes the server, restores the browser viewport, records `result.json`, and exits. Only a still-running `wait` delivers that result to the agent; no completion message currently wakes an idle chat.

`passwords-page.mjs` has separate Save and Done actions; `keys-page.mjs` closes automatically when all requested names have been saved. Both can close without having supplied everything. `hand-over-page.mjs` lists fields, queues changes, and sends typed characters through the live stream. Its native form has no submit action. The installed agent-browser streaming guide documents ordered mouse and keyboard events on the same connection, making that connection the way to keep the final character ahead of a mirrored click.

## Goals / Non-Goals

Use the existing private-link watcher, persistence routes, and live stream. Keep workspace routing server-owned, completion independent of a foreground tool call, and action handling deterministic. Keep the existing CLI open/wait/close interface usable outside Paseo.

No changes to Paseo itself, browser-vault format, secret destinations, or the vendored browser skill. No new browser-control service, connector, model call, or mini app.

## Decisions

### 1. Capture the opener and notify it from the watcher

At `open`, capture the full `PASEO_AGENT_ID`, a random hand-over identity, the current working directory, and the existing CLI connection context in private state. Never accept an agent id, prompt, executable, or daemon address from the page. Locate Paseo using the repository's existing CLI discovery convention. Confirm its installed `send --no-wait --json` interface during implementation; the inspected help supports sending to an existing agent without waiting for its next turn.

After successful credential completion or the browser's configured `until`/`untilGone` finish, the watcher runs Paseo with argument-array execution, a bounded timeout, and suppressed raw stdout/stderr. The message is assembled from an allowlist: hand-over identity, mode, result, saved vault/key names, and Worker-key names. It says the private input has ended and the original task can resume, with any secret-push follow-up still needed. It includes no address, key-link token, selector, username, password, token value, or page text. The person explicitly requested this message to the workspace; it is not a message to another person.

The event identifies its hand-over so an agent that also observed `wait` can recognize the same completion and continue once. Preserve the existing `HANDOVER_RESULT`, `HANDOVER_SAVED`, and `HANDOVER_APP_KEYS` output. Add an optional completion identity and notification status to results rather than replacing those lines. The guides tell the receiving agent to consume a repeated completion once, resume the existing task, and push Worker secrets where required. The wake-up message carries its own result so a later link cannot make a queued message read the wrong `result.json`.

One automatic send attempt belongs to one completed hand-over, guarded by the watcher's finish latch; neither `wait` nor `close` sends again. An ambiguous CLI failure is recorded as unconfirmed and never automatically resent. This avoids asserting exactly-once delivery across a process failure. Without an opener id, a CLI, or an acknowledged send, keep the saved result, expose an honest manual-return status, and retain `wait`. Do not infer a target by repo name or open a new chat.

Alternative: teach agents to keep polling `wait`. This leaves the idle-chat problem unresolved. Calling Paseo from the page would expose routing and require a second trust boundary.

### 2. Make credential completion a save operation

Add a keyed `/continue` operation to the existing password and key route sets, reusing their persistence helpers, size limits, and serial queues. The password request includes only selected pending rows, plus a valid filled add-a-login form; the key request includes only requested filled boxes. Avoid calling `/done` concurrently with an outstanding save.

The server returns per-entry success/failure and completes only after persistence succeeds. Password completion requires at least one saved login and no failure in the submitted selection; unticked export rows never leave the device. A previously saved selection can continue without being saved again. Key completion requires every requested name to have been saved, including earlier successful partial saves. A partial success clears and locks only successful entries, keeps the rest editable, and neither declares readiness nor wakes the workspace. Missing required keys and incomplete typed logins remain actionable errors. Use the existing body limits and allow retry in batches where an oversized password selection requires it.

Replace the pages' main Save/Done pair with Save and continue. Keep Add as a secondary list-edit action on the password page. Close without continuing is secondary and cancels without sending a readiness event. Preserve legacy `/save` and `/done` callers and their result format, but never interpret a cancellation or an incomplete key set as readiness. Credential Save and continue requests disable all competing save/close controls until their outcome is known.

Alternative: retain two taps. The user selected the combined action in the exploration question.

### 3. Separate private-input closure from the final receipt

Completion must acknowledge both saving and the wake-up while ensuring the agent cannot resume against a browser still accepting the person's input. Add a terminal finishing state shared by all modes:

1. Stop accepting private-input requests, close stream connections, finish queued saves/actions, and restore the browser viewport when applicable.
2. Write the result and completion identity outside the repo, then attempt the bounded workspace notification.
3. Return or expose a keyed, read-only completion receipt containing only notification status and saved names; flush it before closing the listener and tunnel.

During this short finishing interval, only the receipt and page assets remain available; replayed save, field, action, viewport, and stream requests are refused. Password/key `/continue` responses carry the receipt. Browser pages poll the same status when their stream closes at an automatic finish. Network loss may prevent a receipt from arriving: display 'Link closed; return to chat' rather than inventing a send result. Bound receipt delivery and teardown independently so a vanished client cannot extend the input lifetime. Do not leave a tunnel open while waiting for the agent's next turn.

The page shows notified only after the CLI acknowledges dispatch. A missing target or failed send shows that the entries were saved but the chat was not notified. Timeout and cancellation never claim the assistant has all inputs. Errors leave the link's established expiry and cleanup behavior intact.

Alternative: notify after fully killing the tunnel. That wakes the chat but prevents the form from reporting whether dispatch succeeded.

### 4. Mirror native form actions, forwarding taps on the ordered stream

Extend the fixed field scan to include visible native submit controls, including default-submit buttons and submit inputs associated with a form. Show all identified actions in page order, grouped with their form when more than one form is present; retain disabled controls as disabled. Read only an action's accessible label, form association, enabled/visible state, identity, and geometry. Strip input descendants from button labels; a submit input's declared label is action metadata, not a text field's current value. Exclude resets and unrelated links. Custom controls and inaccessible embedded frames use the existing preview fallback.

Return opaque action references and a scan revision alongside the field signature. A keyed action-resolution route accepts only a server-issued action reference and revision, revalidates that the exact original element still belongs to the current document/form and is visible/enabled, and returns its current click point. Reject obsolete identities; never retry a ref against a newly numbered list. No client-supplied selector or JavaScript is accepted. Scroll a known action into view on the person's tap if needed; scanning alone must not scroll.

The UI waits for its pending field queue, resolves the selected action, and sends mouse move/press/release over the same WebSocket as the queued keyboard events. The stream preserves their order. Block repeated taps during dispatch; never automatically resend a submit following a disconnect or stale-action response. This clicks the real website element, preserving its validation, submitter choice, and handlers; do not call `form.submit()` or synthesize a generic Enter key. Refresh actions with fields after navigation and dynamic changes without losing the person's locally typed entries. A stale or unsupported action gives the preview fallback.

A mirrored click alone does not finish the hand-over. Continue waiting for the opener's original finish condition, so login-to-code transitions keep the agent's hands off. In a hand-over with no finish condition, the existing explicit completion path remains. The person's tap on a Pay/Send button is their own browser action; existing chat confirmation rules for actions the agent initiates remain in force.

Alternative: issue a CLI click beside the typing WebSocket. Separate transports could let a click overtake the last input. Guessing a primary button by wording would choose the wrong action on multi-form pages.

## UX

### Use-case brief

The owner supplies credentials or completes a website step while chatting, commonly from a phone and sometimes from a laptop. Done means the selected entries are saved or the requested website step is complete, and the originating chat can continue. Mirror the existing private password/key pages and browser field list, keeping their layouts and autofill hints. Assume one interruption per task when an input is missing; this is not a daily credential-management dashboard. Partial saves, multiple forms, unsupported embedded controls, and unavailable workspace dispatch are edge cases.

### Flow

Credential page → select/type → Save and continue → saved result → requesting chat. A failed or incomplete save stays on the same page with successful rows retained. Cancellation closes without readiness. Website page → fill listed fields → tap the mirrored site action → stay on the next input step, or finish and return to chat when the configured condition holds.

### Hierarchy

Save and continue is the credential page's one primary action, placed in its bottom action bar. Add, Show, and Close without continuing are secondary. Each website form shows its own actions below its fields, using actual labels to avoid a generic Submit ambiguity. A single form has its submit as the primary outside action; multiple real alternatives remain explicit. Other typing is de-emphasized. Final states emphasize whether the assistant was notified, without exposing routing details.

### Review

[review.html](review.html): What Changes #1 sketches password/token screens and save states, #2 sketches the browser page and next-step/fallback states, and #3 sketches completion and failure receipts.

### Components

Reuse the standalone HTML forms, native inputs, status regions, password list, key rows, browser canvas, and native button styles under `.agents/skills/verify/scripts/`. Add a native action group under listed website fields and a shared terminal receipt contract; no React page, app router, or new component dependency is needed.

## Risks / Trade-offs

- A CLI acceptance is dispatch evidence, not proof the agent has finished resuming → label the receipt 'notified'; verify an idle chat actually starts during the end-to-end check.
- `wait` and a queued completion can both reach the agent → include the same completion identity and guide the agent to handle it once; emit only one automatic notification attempt.
- A page can replace a submit control after it was scanned → bind references to the original document/element, revalidate on tap, and refuse stale targets.
- A website can provide only custom or cross-origin embedded actions → keep preview interaction available and show a short fallback, rather than claiming every site supports mirroring.
- A client may disappear during completion → persist the result first and bound receipt delivery/cleanup; the person can still return to the chat.

## Migration Plan

Ship a minor payload release with the scripts, focused tests, and updated canonical browsing/secrets guides. Leave VERSION numbering to `/ship`; add the normal Next entry while implementing. Existing private links use the script version that opened them; let those expire before restarting the hand-over tool. No credential migration or new required environment variable. Reverting the payload restores the previous forms and polling behavior while keeping saved credentials intact.
