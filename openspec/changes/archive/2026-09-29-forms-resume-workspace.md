<!-- openspec-archive v1 2026-09-29-forms-resume-workspace -->
<!-- file proposal.md utf8 10842 -->
# Proposal

**Status:** ready-to-ship
**Branch:** workspace-notify-form
**Open questions:** none

## Why

After giving the assistant a password or token, you should be able to go straight back to the task without typing another message. Website forms already list their fields outside the live preview, but their submit buttons still require a tap inside it.

## What Changes

- **Save and continue in one tap.** Password and token forms get one main button that saves your entries, closes the private input, and wakes the chat that asked for them. A failed save stays open so you can fix it; a token form waits until every requested token is saved.
  ```text
  PASSWORDS: BEFORE
  ┌──────────────────────────────────┐
  │ Drop an export, or add a login   │
  │ [x] netflix.com                  │
  │ Website  [netflix.com          ] │
  │ Username [me@example.com       ] │
  │ Password [********             ] │
  │ [Add]                            │
  │ [Save 1 login]          [Done]   │
  └──────────────────────────────────┘
  PASSWORDS: AFTER
  ┌──────────────────────────────────┐
  │ Drop an export, or add a login   │
  │ [x] netflix.com                  │
  │ Website  [netflix.com          ] │
  │ Username [me@example.com       ] │
  │ Password [********             ] │
  │ [Add]                            │
  │ [Save and continue]              │
  │ Close without continuing         │
  └──────────────────────────────────┘
  TOKENS: BEFORE
  ┌──────────────────────────────────┐
  │ Keys for your assistant          │
  │ Stripe key [********      ] Show │
  │ [Save]                 [Done]    │
  └──────────────────────────────────┘
  TOKENS: AFTER
  ┌──────────────────────────────────┐
  │ Keys for your assistant          │
  │ Stripe key [********      ] Show │
  │ [Save and continue]              │
  │ Close without continuing         │
  └──────────────────────────────────┘
  EMPTY / SAVING / SAVE ERROR
  ┌──────────────────────────────────┐
  │ No login chosen or key entered   │
  │ [Save and continue: disabled]    │
  └──────────────────────────────────┘
  ┌──────────────────────────────────┐
  │ Saving your entries...           │
  │ [Saving... disabled]             │
  └──────────────────────────────────┘
  ┌──────────────────────────────────┐
  │ Saved entries stay saved         │
  │ Couldn't save one. Try again.    │
  │ [Save and continue]              │
  └──────────────────────────────────┘
  ```
- **The website's button appears under its fields too.** Tap the matching button outside the preview to do the same thing as tapping it on the website. It keeps the site's label and disabled state, follows the next page, and waits for your latest typing. If the next page asks for a code, it stays with you until you finish.
  ```text
  BEFORE
  ┌──────────────────────────────────┐
  │ Website preview                  │
  │ Email, password, [Sign in] here  │
  ├──────────────────────────────────┤
  │ Email    [                     ] │
  │ Password [                     ] │
  │ Other typing                     │
  └──────────────────────────────────┘
  AFTER
  ┌──────────────────────────────────┐
  │ Website preview                  │
  │ Email, password, [Sign in] here  │
  ├──────────────────────────────────┤
  │ Email    [                     ] │
  │ Password [                     ] │
  │ [Sign in]                        │
  │ Other typing                     │
  └──────────────────────────────────┘
  SENDING / NEXT STEP
  ┌──────────────────────────────────┐
  │ Website preview                  │
  │ [Sign in: disabled while sent]   │
  └──────────────────────────────────┘
  ┌──────────────────────────────────┐
  │ Website preview: enter your code │
  │ Code [                         ] │
  │ [Verify]                         │
  └──────────────────────────────────┘
  NO MATCH / PAGE CHANGED
  ┌──────────────────────────────────┐
  │ Website preview                  │
  │ Tap the button on the page       │
  │ Other typing                     │
  └──────────────────────────────────┘
  ```
- **The workspace hears only the result.** The chat receives a brief message saying the input step finished and which entries were saved, never their contents. It resumes even if it had stopped waiting. A website click wakes it only when the requested step is finished. If the wake-up fails, the page tells you to return to the chat; saved entries stay saved.
  ```text
  save entries / finish website step
                  │
                  ▼
         close private input
                  │
                  ▼
       wake the requesting workspace
                  │
                  ▼
           continue the task

  RETURNING / FINISHED
  ┌──────────────────────────────────┐
  │ Saved. Returning to your chat... │
  └──────────────────────────────────┘
  ┌──────────────────────────────────┐
  │ Your assistant was notified      │
  │ You can return to the chat       │
  └──────────────────────────────────┘
  WAKE-UP UNAVAILABLE
  ┌──────────────────────────────────┐
  │ Saved; chat wasn't notified      │
  │ Return to chat and say continue  │
  └──────────────────────────────────┘
  CLOSED / EXPIRED
  ┌──────────────────────────────────┐
  │ This link has closed             │
  │ Ask in chat for a new link       │
  └──────────────────────────────────┘
  ```

Non-goals: managing passwords inside the chat, building a new website, or automatically clicking a website's submit button without your tap.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `browser-logins`: one-tap password completion, mirrored website form actions, permitted action metadata, and completion that wakes the originating workspace.
- `secrets-convention`: one-tap key completion and result-only workspace notification after successful persistence.

## Impact

The hand-over watcher and its password, key, and browser pages under `.agents/skills/verify/scripts/`; their payload tests under `scripts/tests/`; the canonical browsing and secrets guides; and a minor release entry in `CHANGELOG.md`. Uses the installed Paseo CLI when the opener supplies its agent identity. No new service or app dependency. Current branch: `workspace-notify-form`.

## Decision log

- **2026-09-29** — Asked Should the password and token forms save your entries and wake the chat in one tap? → chose Save and continue.
- **2026-09-29** — Assumed: keep both improvements in one change, because the same private hand-over owns the fields, website actions, and return to the requesting chat.
- **2026-09-29** — Assumed: wake the existing requesting chat rather than create a new one, because it holds the task that needs to continue.
- **2026-09-29** — Assumed: a website button mirrors the real action and label, and completion waits for the requested finish, because submitting a password can lead to another code step.
- **2026-09-29** — Assumed: offer mirrors for identifiable visible form actions; unfamiliar embedded or custom controls remain tappable in the preview, because the tool must not guess which action to trigger.
- **2026-09-29** — Assumed: use ordinary code for saving, forwarding taps, and notifying the workspace, because this repeated flow needs no model call to decide when it is complete.

- **2026-09-29** — Assumed: verify implementation tasks with focused checks and keep publishing checks in the final save, because the authorized build-and-publish flow archives completed work before its single publishing checkpoint. All planned coverage and live checks remain required.

- **2026-09-29** — Assumed: record the completed host checks with disposable credentials and an isolated idle chat. Token and password completion woke that chat; a waiting result and repeated identity were consumed once. Website submission included the last character, stayed open for a code, and notified at the requested finish. Partial key input stayed open and cancellation sent no readiness.

- **2026-09-29** — Assumed: checkpoint the completed archive for release 27.7.0 after focused tests and host checks passed; the publishing checks remain the final gate before merging.

<!-- end proposal.md -->
<!-- file design.md utf8 13253 -->
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

<!-- end design.md -->
<!-- file tasks.md utf8 5499 -->
# Tasks

## 1. Hand-over watcher and workspace return

- [x] 1.1 Capture the opener's workspace identity and hand-over identity in private state; implement bounded result-only dispatch through the installed Paseo CLI with argument-array execution. Extend `scripts/tests/hand-over.test.mjs` with fake-Paseo checks for correct target, notification without `wait`, allowlisted content, one send attempt, and absent/failing CLI behavior; verify these focused tests pass.
- [x] 1.2 Add the finishing state and keyed completion receipt: revoke input and stream access, drain in-flight work, restore the viewport, record the result, dispatch, then flush the receipt and tear down within a bounded interval. Preserve CLI result lines and add completion identity/status; cover receipt delivery, replay refusal, cancellation, timeout, a vanished client, duplicate finish callbacks, and cleanup with focused checks.
- [x] 1.3 Update `wiki/development/browsing.md` with the workspace wake-up, result-only message, duplicate-completion handling, manual fallback, and existing explicit-completion path when no browser finish condition was supplied. Verify the guide matches the result contract and its links pass the payload checker.

## 2. Password and token forms

- [x] 2.1 Add serialized keyed `/continue` operations in `passwords.mjs` and `keys.mjs` using existing save logic and limits. Require a saved password selection or every requested key before readiness, retain partial successes, and preserve legacy route callers without treating cancellation as readiness. Extend `scripts/tests/passwords.test.mjs` and `scripts/tests/keys.test.mjs` for combined completion, partial failures, missing keys, repeat requests, legacy callers, and save/close races; verify them with focused checks.
- [x] 2.2 Replace the primary Save/Done controls in both pages with Save and continue and a secondary Close without continuing action. Include a valid typed login that has not been added, keep unticked exports local, disable competing actions during saving, and show the receipt or an honest closed-link fallback. Extend the password DOM tests and add equivalent key-page DOM coverage for empty, invalid, pending, partial-success, complete, notification-failed, and expired states; verify with focused checks and inspect phone-width layouts in the host preview.
- [x] 2.3 Update `wiki/development/browsing.md`'s password section and `wiki/development/secrets.md`'s private-key section for one-tap completion and incomplete saves, preserving Worker-secret push follow-up. Verify the documented fields, actions, and results agree with the implemented forms and payload links resolve.

## 3. Website field list and mirrored actions

- [x] 3.1 Extend the fixed metadata scan with native submit-action labels, form association, visible/enabled state, opaque element identity, and revision. Add keyed action resolution that revalidates the original element and returns its current click point without accepting client selectors or reading private field values. Extend scan/route tests for default-submit buttons, submit inputs, disabled controls, multiple forms, replaced elements, invalid auth, and unsupported embedded/custom controls; verify with focused checks.
- [x] 3.2 Add native buttons under the website's listed fields using the site's labels and disabled states. Drain pending field changes, resolve the action, then forward the click over the same ordered WebSocket as typing; refresh after changes and refuse stale or uncertain dispatches without automatic resubmission. Add DOM/stream coverage for immediate last-character submission, double taps, navigation, code-step continuation, stale targets, and a preview fallback; verify with focused checks and the host preview.
- [x] 3.3 Update `wiki/development/browsing.md`'s field-list guidance for outside submit buttons and their fallback, making clear that the agent resumes only after the requested finish. Verify the guide matches the supported action types and does not conflict with the existing rules for outward actions initiated by the agent.

## 4. Payload release and integrated evidence

- [x] 4.1 Add `## Next (minor) — Forms return to the workspace` to `CHANGELOG.md`, describing the forms, website buttons, and any update step; leave VERSION for `/ship`. Run the payload-link and OpenSpec-config checks, and measure context if instruction text changed; verify the required payload checks are prepared and the focused checks pass; `/ship` runs the final `/save` CI gate.
- [x] 4.2 Validate this change strictly, rebuild `review.html` if the proposal changes, and produce `/apply`'s host preview of the real private forms using test credentials. Inspect its password, token, website-submit, and fallback screens at phone and laptop widths; never save preview credentials to the person's vault or live secret files. Verify the requested behavior visually without building the main app locally.
- [x] 4.3 Prepare the integrated checks for the final `/save` gate and, on the host, verify that a completed form wakes an idle requesting workspace, that a simultaneously waiting result causes only one task continuation, and that website submission waits through a code step. Use an isolated browser/vault, a controlled website, and disposable credentials; send the real wake-up only as the authorized integration test, never as a planning action. Record actual wake-up evidence separately from fake-CLI coverage and report any unverified live scenario.

<!-- end tasks.md -->
<!-- file specs/browser-logins/spec.md utf8 5938 -->
# Spec Delta

## ADDED Requirements

### Requirement: Completed private input wakes the originating workspace

A successful private-input completion opened by an identifiable workspace SHALL make one automatic notification attempt to that same workspace, even when its chat is idle. The notification SHALL contain only completion identity, outcome, and saved-entry names, never credentials, private addresses, or page content. The agent SHALL handle the same completion once if both a waiting tool call and the notification report it. An expired, cancelled, or incomplete input SHALL NOT declare the task ready. A failed or unavailable notification SHALL preserve saved inputs and tell the person how to return to the chat manually.

#### Scenario: The chat stopped waiting

- **WHEN** the person successfully finishes a private-input step whose originating chat is idle
- **THEN** the private input ends and its workspace receives a result-only notification that starts the chat on the existing task without another message from the person
- **AND** a waiting tool call reporting the same completion does not cause the task to run twice

#### Scenario: Workspace notification is unavailable

- **WHEN** entries have been saved but there is no identifiable originating workspace or the notification is unconfirmed
- **THEN** the entries stay saved, the result remains available, and the page directs the person back to the chat without claiming the assistant was notified

### Requirement: The person can submit from outside the website preview

A hand-over page SHALL mirror identifiable visible native form-submit actions outside its live preview, with their own labels, form association, order, and disabled state. The person's tap SHALL activate the corresponding real website control after their queued field changes, preserving the site's validation and click behavior. Stale actions SHALL be refused rather than redirected to a different control, and no failed or uncertain submission SHALL be automatically repeated. Unsupported actions SHALL remain reachable through the preview. Submitting SHALL NOT by itself end the hand-over before its requested finish is reached.

#### Scenario: A login asks for a code next

- **WHEN** the person finishes typing a password and immediately taps the mirrored Sign in action, and the website then asks for a code
- **THEN** the last typed character reaches the page before its actual Sign in button is clicked, the field list and actions follow the code page, and the hand-over stays with the person

#### Scenario: The action changed before the tap

- **WHEN** a mirrored submit action was removed, replaced, or disabled after it was shown
- **THEN** the hand-over does not click a different action or repeat the submit, and offers a refresh or a tap in the preview

## MODIFIED Requirements

### Requirement: The agent keeps its hands off during a hand-over

While a hand-over link is open for input, the agent SHALL send the browser no commands, and SHALL read only the browser's address or whether an element it named is present, never the page's content, field values, or a picture of it. The hand-over tool MAY read the page's field labels, kinds, and dropdown choices and its form actions' labels, association, geometry, and visible/enabled state to list them for the person, and MAY set a field or resolve a mirrored action on the person's action. It SHALL never read a field's value, tick state, or current choice, SHALL never pass what the person types as a command argument, and SHALL give the agent nothing but the result. Private input and browser control through the link SHALL end before the originating workspace is notified to resume.

#### Scenario: A two-step code page

- **WHEN** the site shows a code page after the password
- **THEN** the agent keeps waiting, having read nothing but the address

#### Scenario: A card typed into the field list

- **WHEN** the person types a card number into the hand-over page's field list
- **THEN** the number reaches the page's card field, and appears in no command, file, log, or message the agent can read

### Requirement: The person saves logins through a private password link

When the person asks to save logins, the agent SHALL ask whether they are ready, then send a private link with the hand-over link's safety: a new address and secret key each time, ending private input on successful completion, explicit closure, or after 10 minutes. The link's page SHALL be one screen that takes CSV password exports, dropped onto it or picked from the device, and logins typed or autofilled, into one list. Its primary completion action SHALL save the selected pending logins, including a valid filled login not yet added to the list, and return to the requesting task in one tap. Failed saves SHALL stay open for correction and SHALL NOT announce readiness. For an export, the person's device SHALL read the file and list its sites with none ticked; a typed login SHALL join the list ticked. Only the ticked logins SHALL leave the device. The agent SHALL learn only the names of the saved sites.

#### Scenario: An export with many sites

- **WHEN** the person picks a Chrome export of 200 logins and ticks two
- **THEN** only those two are saved, the other 198 never leave their device, and the agent names the two sites in the chat

#### Scenario: One login from a phone

- **WHEN** the person fills the page's add-a-login form from their phone's saved passwords and taps its save-and-continue action
- **THEN** that login is saved and the requesting chat is notified, and no command, log, file in the repo, or chat message holds its password

#### Scenario: An export plus a typed login

- **WHEN** the person drops an export on a laptop, ticks one site from it, adds a login for a site the export lacks, and taps its save-and-continue action once
- **THEN** both logins are saved, and the agent names both sites in the chat

<!-- end specs/browser-logins/spec.md -->
<!-- file specs/secrets-convention/spec.md utf8 2893 -->
# Spec Delta

## MODIFIED Requirements

### Requirement: The person gives a key through a private key link

When a task needs a key that the live files lack, or the person asks for the key link, the agent SHALL ask whether they are ready, then send a private link with the hand-over link's safety: a new address and secret key each time, one link at a time, ending private input once every asked-for key is saved, on explicit closure, or after 10 minutes. The page SHALL offer one field for each key the agent named, and only those, and a primary action that saves entries and returns to the requesting task in one tap. The agent SHALL name only keys already declared in `.env.example` or `app/.dev.vars.example`. A saved key SHALL go to the matching ignored live file, in the primary worktree and in a seeded branch copy, and a key the live site reads SHALL then reach both Workers. Only successful persistence of every requested key SHALL declare readiness and notify the originating workspace, with no value in that notification. Failed or partial saves SHALL preserve successes, keep missing or failed entries editable, and SHALL NOT declare readiness. The agent SHALL learn only the names of the saved keys.

#### Scenario: A task needs a missing key

- **WHEN** a task needs `STRIPE_SECRET_KEY`, which `app/.dev.vars.example` declares and `app/.dev.vars` lacks, and the person pastes it on the key link's page and taps its save-and-continue action
- **THEN** it lands in `app/.dev.vars`, the originating workspace is notified and pushes it to both Workers, the chat names `STRIPE_SECRET_KEY`, and no command, log, tracked file, or chat message holds its value

#### Scenario: An undeclared name

- **WHEN** the agent asks for a key named in neither example file
- **THEN** no link opens until the name is declared blank, with its comment, in the right example file

## ADDED Requirements

### Requirement: Partial key input does not resume the task as ready

When a private key link requests several keys, it SHALL remain usable until all requested names have been successfully saved or the input is explicitly closed or expires. Retrying an unsuccessful completion SHALL keep earlier successful saves and SHALL send no readiness notification before every requested key is present. An explicit cancellation SHALL NOT claim that missing keys were supplied.

#### Scenario: One of two keys fails to save

- **WHEN** the person submits two requested keys and only one is saved
- **THEN** the successful row stays saved, the unsuccessful row remains editable with an error, and the chat receives no readiness notification

#### Scenario: The person corrects the remaining key

- **WHEN** the person fixes the failed row and completes the form successfully
- **THEN** the two saved keys are reported by name and one automatic completion notification is attempted for the requesting workspace

<!-- end specs/secrets-convention/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-09-29

~~~
<!-- end .openspec.yaml -->
<!-- file review.html utf8 48543 fence=~~~ -->
~~~html
<!-- wong-review:3 -->
<!doctype html>
<!--
  WongStack review kit. build-review.mjs writes the proposal as static HTML at the
  review:content marker and puts the change name in place of its token. The one
  script adds Note buttons, drawing fit and full screen, notes, drafts, and copy. It loads nothing from the network.
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Review · 2026-09-29-forms-resume-workspace</title>
<style>
  :root { --ink:#222; --muted:#5f5f5f; --line:#b5b5b5; --fill:#f3f3f3; }
  * { box-sizing:border-box; }
  html { -webkit-text-size-adjust:100%; }
  body { margin:0; padding-bottom:76px; background:#e6e6e6; color:var(--ink); font:16px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; overflow-wrap:anywhere; }
  main { max-width:700px; margin:0 auto; padding:0 12px; }
  a { color:inherit; }
  code, pre, .ln { font-family:ui-monospace, Menlo, Consolas, monospace; }
  code { background:var(--fill); border:1px solid #ddd; border-radius:3px; padding:0 3px; font-size:.88em; }
  :focus-visible { outline:3px solid #111; outline-offset:2px; }
  [hidden] { display:none !important; }
  header { padding:18px 0 4px; }
  .eyebrow { margin:0; color:var(--muted); font-size:13px; letter-spacing:.06em; text-transform:uppercase; }
  h1 { margin:2px 0 4px; font-size:22px; line-height:1.25; }
  .jump { display:flex; flex-wrap:wrap; gap:0 18px; margin:4px 0 0; padding:0; list-style:none; }
  .jump a { display:inline-block; padding:8px 0; }
  .hint, .muted { color:var(--muted); font-size:14px; margin:4px 0 0; }
  #script-error { color:#a00; font-weight:600; }
  section { margin:18px 0; scroll-margin-top:8px; }
  h2 { margin:0 0 8px; color:var(--muted); font-size:13px; letter-spacing:.08em; text-transform:uppercase; }
  .card { background:#fff; border:1px solid var(--line); border-radius:6px; padding:12px; margin:0 0 10px; }
  .card p { margin:0 0 10px; } .card p:last-child { margin-bottom:0; }
  .items, .decisions, .note-list { list-style:none; margin:0; padding:0; }
  .item { display:grid; grid-template-columns:26px minmax(0,1fr); gap:0 10px; overflow:hidden; }
  .item, .decision { scroll-margin-top:8px; }
  .num { flex:0 0 26px; height:26px; border-radius:50%; background:#d6d6d6; font-size:13px; font-weight:700; display:flex; align-items:center; justify-content:center; }
  .body { flex:1; min-width:0; }
  [data-note] { border-radius:3px; }
  [data-note]:hover, .noting { background:#f1f1f1; }
  .item > .drawing { position:relative; grid-column:1 / -1; margin:10px -12px 0; }
  .item > .drawing:last-child { margin-bottom:-12px; }
  .drawing summary { display:flex; align-items:center; gap:6px; min-height:44px; padding:0 12px; border-top:1px solid #ddd; color:var(--muted); font-size:14px; cursor:pointer; list-style:none; }
  .drawing summary::-webkit-details-marker { display:none; }
  .drawing summary::before { content:'\25B8'; display:inline-block; width:1em; }
  .drawing[open] summary::before { transform:rotate(90deg); }
  .drawing[open] .show, .drawing:not([open]) .hide { display:none; }
  .drawing .count { color:var(--ink); font-weight:600; }
  .frame { overflow:auto; border-top:1px solid var(--line); background:var(--fill); touch-action:pan-y; }
  .js .frame { overflow:hidden; cursor:zoom-in; }
  .art { display:block; width:max-content; margin:0; padding:.6em .8em; font-size:13px; line-height:1.2; white-space:pre; overflow-wrap:normal; }
  .art .pin { min-width:1.8em; min-height:1.6em; margin-left:.4em; padding:0 .5em; border-radius:.8em; font-size:.85em; line-height:1.5em; }
  .enlarge { position:absolute; top:6px; right:12px; min-height:32px; padding:2px 10px; font-size:13px; }
  .add { min-width:0; min-height:34px; margin-left:6px; padding:0 12px; border-color:#aaa; border-radius:17px; color:var(--muted); font-size:13px; vertical-align:middle; }
  .zoom { display:flex; align-items:center; gap:6px; }
  .zoom .level { margin-right:auto; color:var(--muted); font-size:13px; }
  #viewer { position:fixed; top:0; left:0; right:0; bottom:0; z-index:8; display:flex; flex-direction:column; background:#fff; }
  #viewer .zoom { flex:none; padding:calc(6px + env(safe-area-inset-top)) 12px 6px; border-bottom:1px solid var(--line); }
  #viewer .vframe { flex:1; min-height:0; overflow:auto; background:var(--fill); touch-action:pan-x pan-y; overscroll-behavior:contain; -webkit-overflow-scrolling:touch; }
  #viewer .vhint { flex:none; margin:0; padding:6px 12px calc(6px + env(safe-area-inset-bottom)); border-top:1px solid var(--line); color:var(--muted); font-size:13px; }
  body.viewing { overflow:hidden; }
  .meta { margin:0 0 4px !important; color:var(--muted); font-size:13px; }
  .tag { display:inline-block; margin-right:8px; padding:0 8px; border:1px solid #777; border-radius:10px; background:#fff; color:var(--ink); font-size:12px; font-weight:700; }
  .tag.assumed { border-style:dashed; }
  .tag.check { border:2px dotted #333; }
  .hit { outline:3px solid #888; outline-offset:3px; }
  button { font:inherit; font-size:14px; min-width:40px; min-height:40px; padding:4px 12px; border:1px solid #777; border-radius:4px; background:#fff; color:var(--ink); cursor:pointer; }
  button.primary { background:#333; border-color:#333; color:#fff; }
  button:disabled { opacity:.45; cursor:default; }
  .pin { min-width:24px; min-height:24px; margin-left:6px; padding:0 7px; border-radius:12px; background:#333; border-color:#333; color:#fff; font:700 12px/22px system-ui, sans-serif; vertical-align:middle; }
  .pin.draft { background:#fff; color:var(--ink); border-style:dashed; }
  .entry { display:block; width:100%; margin:0 0 8px; padding:8px 10px; text-align:left; }
  .entry .where { display:block; color:var(--muted); font-size:13px; }
  .entry .tag { margin:0 0 0 6px; }
  #chip { position:absolute; z-index:9; box-shadow:0 2px 8px rgba(0,0,0,.3); }
  #editor { position:absolute; z-index:6; width:260px; padding:10px; background:#fff; border:2px solid #333; border-radius:6px; box-shadow:0 4px 16px rgba(0,0,0,.25); }
  #editor.docked { position:fixed; left:0; right:0; bottom:0; width:auto; display:flex; flex-direction:column; overflow:auto; border-width:2px 0 0; border-radius:0; padding:8px 12px max(8px, env(safe-area-inset-bottom)); }
  #editor.docked .where { flex:none; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  #editor.docked textarea { flex:1 1 auto; min-height:44px; }
  #editor.docked .row { flex:none; }
  #editor .where { margin:0 0 6px; color:var(--muted); font-size:13px; }
  #editor .moved { margin:0 0 6px; font-size:13px; font-weight:600; }
  #editor textarea { display:block; width:100%; min-height:76px; padding:6px 8px; border:1px solid #777; border-radius:4px; font:16px/1.4 system-ui, sans-serif; resize:vertical; }
  #editor .row { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
  .bar { position:fixed; left:0; right:0; bottom:0; z-index:4; display:flex; align-items:center; gap:10px; padding:8px 12px calc(8px + env(safe-area-inset-bottom)); background:#fff; border-top:1px solid var(--line); }
  .bar .note-count { margin-right:auto; font-size:14px; }
  body.docked .bar, body.viewing .bar { display:none; }
  .session, #editor .copies { color:var(--muted); font-size:13px; }
  #editor .copies { flex:none; margin:6px 0 0; }
  #toast { position:fixed; left:50%; bottom:72px; z-index:7; max-width:90vw; transform:translateX(-50%); padding:6px 12px; border-radius:4px; background:#222; color:#fff; font-size:14px; opacity:0; pointer-events:none; transition:opacity .2s; }
  #toast.show { opacity:1; }
  #copybuf { position:fixed; left:0; top:0; width:1px; height:1px; opacity:0; pointer-events:none; }
</style>
</head>
<body data-change="2026-09-29-forms-resume-workspace">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-09-29-forms-resume-workspace</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. Saving a note copies all your notes. Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">After giving the assistant a password or token, you should be able to go straight back to the task without typing another message. Website forms already list their fields outside the live preview, but their submit buttons still require a tap inside it.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>Save and continue in one tap.</b> Password and token forms get one main button that saves your entries, closes the private input, and wakes the chat that asked for them. A failed save stays open so you can fix it; a token form waits until every requested token is saved.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-1-line-1" tabindex="0">PASSWORDS: BEFORE</span>
<span class="ln" data-note="item-1-line-2" tabindex="0">┌──────────────────────────────────┐</span>
<span class="ln" data-note="item-1-line-3" tabindex="0">│ Drop an export, or add a login   │</span>
<span class="ln" data-note="item-1-line-4" tabindex="0">│ [x] netflix.com                  │</span>
<span class="ln" data-note="item-1-line-5" tabindex="0">│ Website  [netflix.com          ] │</span>
<span class="ln" data-note="item-1-line-6" tabindex="0">│ Username [me@example.com       ] │</span>
<span class="ln" data-note="item-1-line-7" tabindex="0">│ Password [********             ] │</span>
<span class="ln" data-note="item-1-line-8" tabindex="0">│ [Add]                            │</span>
<span class="ln" data-note="item-1-line-9" tabindex="0">│ [Save 1 login]          [Done]   │</span>
<span class="ln" data-note="item-1-line-10" tabindex="0">└──────────────────────────────────┘</span>
<span class="ln" data-note="item-1-line-11" tabindex="0">PASSWORDS: AFTER</span>
<span class="ln" data-note="item-1-line-12" tabindex="0">┌──────────────────────────────────┐</span>
<span class="ln" data-note="item-1-line-13" tabindex="0">│ Drop an export, or add a login   │</span>
<span class="ln" data-note="item-1-line-14" tabindex="0">│ [x] netflix.com                  │</span>
<span class="ln" data-note="item-1-line-15" tabindex="0">│ Website  [netflix.com          ] │</span>
<span class="ln" data-note="item-1-line-16" tabindex="0">│ Username [me@example.com       ] │</span>
<span class="ln" data-note="item-1-line-17" tabindex="0">│ Password [********             ] │</span>
<span class="ln" data-note="item-1-line-18" tabindex="0">│ [Add]                            │</span>
<span class="ln" data-note="item-1-line-19" tabindex="0">│ [Save and continue]              │</span>
<span class="ln" data-note="item-1-line-20" tabindex="0">│ Close without continuing         │</span>
<span class="ln" data-note="item-1-line-21" tabindex="0">└──────────────────────────────────┘</span>
<span class="ln" data-note="item-1-line-22" tabindex="0">TOKENS: BEFORE</span>
<span class="ln" data-note="item-1-line-23" tabindex="0">┌──────────────────────────────────┐</span>
<span class="ln" data-note="item-1-line-24" tabindex="0">│ Keys for your assistant          │</span>
<span class="ln" data-note="item-1-line-25" tabindex="0">│ Stripe key [********      ] Show │</span>
<span class="ln" data-note="item-1-line-26" tabindex="0">│ [Save]                 [Done]    │</span>
<span class="ln" data-note="item-1-line-27" tabindex="0">└──────────────────────────────────┘</span>
<span class="ln" data-note="item-1-line-28" tabindex="0">TOKENS: AFTER</span>
<span class="ln" data-note="item-1-line-29" tabindex="0">┌──────────────────────────────────┐</span>
<span class="ln" data-note="item-1-line-30" tabindex="0">│ Keys for your assistant          │</span>
<span class="ln" data-note="item-1-line-31" tabindex="0">│ Stripe key [********      ] Show │</span>
<span class="ln" data-note="item-1-line-32" tabindex="0">│ [Save and continue]              │</span>
<span class="ln" data-note="item-1-line-33" tabindex="0">│ Close without continuing         │</span>
<span class="ln" data-note="item-1-line-34" tabindex="0">└──────────────────────────────────┘</span>
<span class="ln" data-note="item-1-line-35" tabindex="0">EMPTY / SAVING / SAVE ERROR</span>
<span class="ln" data-note="item-1-line-36" tabindex="0">┌──────────────────────────────────┐</span>
<span class="ln" data-note="item-1-line-37" tabindex="0">│ No login chosen or key entered   │</span>
<span class="ln" data-note="item-1-line-38" tabindex="0">│ [Save and continue: disabled]    │</span>
<span class="ln" data-note="item-1-line-39" tabindex="0">└──────────────────────────────────┘</span>
<span class="ln" data-note="item-1-line-40" tabindex="0">┌──────────────────────────────────┐</span>
<span class="ln" data-note="item-1-line-41" tabindex="0">│ Saving your entries...           │</span>
<span class="ln" data-note="item-1-line-42" tabindex="0">│ [Saving... disabled]             │</span>
<span class="ln" data-note="item-1-line-43" tabindex="0">└──────────────────────────────────┘</span>
<span class="ln" data-note="item-1-line-44" tabindex="0">┌──────────────────────────────────┐</span>
<span class="ln" data-note="item-1-line-45" tabindex="0">│ Saved entries stay saved         │</span>
<span class="ln" data-note="item-1-line-46" tabindex="0">│ Couldn't save one. Try again.    │</span>
<span class="ln" data-note="item-1-line-47" tabindex="0">│ [Save and continue]              │</span>
<span class="ln" data-note="item-1-line-48" tabindex="0">└──────────────────────────────────┘</span></pre></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>The website's button appears under its fields too.</b> Tap the matching button outside the preview to do the same thing as tapping it on the website. It keeps the site's label and disabled state, follows the next page, and waits for your latest typing. If the next page asks for a code, it stays with you until you finish.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-2-line-1" tabindex="0">BEFORE</span>
<span class="ln" data-note="item-2-line-2" tabindex="0">┌──────────────────────────────────┐</span>
<span class="ln" data-note="item-2-line-3" tabindex="0">│ Website preview                  │</span>
<span class="ln" data-note="item-2-line-4" tabindex="0">│ Email, password, [Sign in] here  │</span>
<span class="ln" data-note="item-2-line-5" tabindex="0">├──────────────────────────────────┤</span>
<span class="ln" data-note="item-2-line-6" tabindex="0">│ Email    [                     ] │</span>
<span class="ln" data-note="item-2-line-7" tabindex="0">│ Password [                     ] │</span>
<span class="ln" data-note="item-2-line-8" tabindex="0">│ Other typing                     │</span>
<span class="ln" data-note="item-2-line-9" tabindex="0">└──────────────────────────────────┘</span>
<span class="ln" data-note="item-2-line-10" tabindex="0">AFTER</span>
<span class="ln" data-note="item-2-line-11" tabindex="0">┌──────────────────────────────────┐</span>
<span class="ln" data-note="item-2-line-12" tabindex="0">│ Website preview                  │</span>
<span class="ln" data-note="item-2-line-13" tabindex="0">│ Email, password, [Sign in] here  │</span>
<span class="ln" data-note="item-2-line-14" tabindex="0">├──────────────────────────────────┤</span>
<span class="ln" data-note="item-2-line-15" tabindex="0">│ Email    [                     ] │</span>
<span class="ln" data-note="item-2-line-16" tabindex="0">│ Password [                     ] │</span>
<span class="ln" data-note="item-2-line-17" tabindex="0">│ [Sign in]                        │</span>
<span class="ln" data-note="item-2-line-18" tabindex="0">│ Other typing                     │</span>
<span class="ln" data-note="item-2-line-19" tabindex="0">└──────────────────────────────────┘</span>
<span class="ln" data-note="item-2-line-20" tabindex="0">SENDING / NEXT STEP</span>
<span class="ln" data-note="item-2-line-21" tabindex="0">┌──────────────────────────────────┐</span>
<span class="ln" data-note="item-2-line-22" tabindex="0">│ Website preview                  │</span>
<span class="ln" data-note="item-2-line-23" tabindex="0">│ [Sign in: disabled while sent]   │</span>
<span class="ln" data-note="item-2-line-24" tabindex="0">└──────────────────────────────────┘</span>
<span class="ln" data-note="item-2-line-25" tabindex="0">┌──────────────────────────────────┐</span>
<span class="ln" data-note="item-2-line-26" tabindex="0">│ Website preview: enter your code │</span>
<span class="ln" data-note="item-2-line-27" tabindex="0">│ Code [                         ] │</span>
<span class="ln" data-note="item-2-line-28" tabindex="0">│ [Verify]                         │</span>
<span class="ln" data-note="item-2-line-29" tabindex="0">└──────────────────────────────────┘</span>
<span class="ln" data-note="item-2-line-30" tabindex="0">NO MATCH / PAGE CHANGED</span>
<span class="ln" data-note="item-2-line-31" tabindex="0">┌──────────────────────────────────┐</span>
<span class="ln" data-note="item-2-line-32" tabindex="0">│ Website preview                  │</span>
<span class="ln" data-note="item-2-line-33" tabindex="0">│ Tap the button on the page       │</span>
<span class="ln" data-note="item-2-line-34" tabindex="0">│ Other typing                     │</span>
<span class="ln" data-note="item-2-line-35" tabindex="0">└──────────────────────────────────┘</span></pre></div></details></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>The workspace hears only the result.</b> The chat receives a brief message saying the input step finished and which entries were saved, never their contents. It resumes even if it had stopped waiting. A website click wakes it only when the requested step is finished. If the wake-up fails, the page tells you to return to the chat; saved entries stay saved.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-3-line-1" tabindex="0">save entries / finish website step</span>
<span class="ln" data-note="item-3-line-2" tabindex="0">                │</span>
<span class="ln" data-note="item-3-line-3" tabindex="0">                ▼</span>
<span class="ln" data-note="item-3-line-4" tabindex="0">       close private input</span>
<span class="ln" data-note="item-3-line-5" tabindex="0">                │</span>
<span class="ln" data-note="item-3-line-6" tabindex="0">                ▼</span>
<span class="ln" data-note="item-3-line-7" tabindex="0">     wake the requesting workspace</span>
<span class="ln" data-note="item-3-line-8" tabindex="0">                │</span>
<span class="ln" data-note="item-3-line-9" tabindex="0">                ▼</span>
<span class="ln" data-note="item-3-line-10" tabindex="0">         continue the task</span>

<span class="ln" data-note="item-3-line-12" tabindex="0">RETURNING / FINISHED</span>
<span class="ln" data-note="item-3-line-13" tabindex="0">┌──────────────────────────────────┐</span>
<span class="ln" data-note="item-3-line-14" tabindex="0">│ Saved. Returning to your chat... │</span>
<span class="ln" data-note="item-3-line-15" tabindex="0">└──────────────────────────────────┘</span>
<span class="ln" data-note="item-3-line-16" tabindex="0">┌──────────────────────────────────┐</span>
<span class="ln" data-note="item-3-line-17" tabindex="0">│ Your assistant was notified      │</span>
<span class="ln" data-note="item-3-line-18" tabindex="0">│ You can return to the chat       │</span>
<span class="ln" data-note="item-3-line-19" tabindex="0">└──────────────────────────────────┘</span>
<span class="ln" data-note="item-3-line-20" tabindex="0">WAKE-UP UNAVAILABLE</span>
<span class="ln" data-note="item-3-line-21" tabindex="0">┌──────────────────────────────────┐</span>
<span class="ln" data-note="item-3-line-22" tabindex="0">│ Saved; chat wasn't notified      │</span>
<span class="ln" data-note="item-3-line-23" tabindex="0">│ Return to chat and say continue  │</span>
<span class="ln" data-note="item-3-line-24" tabindex="0">└──────────────────────────────────┘</span>
<span class="ln" data-note="item-3-line-25" tabindex="0">CLOSED / EXPIRED</span>
<span class="ln" data-note="item-3-line-26" tabindex="0">┌──────────────────────────────────┐</span>
<span class="ln" data-note="item-3-line-27" tabindex="0">│ This link has closed             │</span>
<span class="ln" data-note="item-3-line-28" tabindex="0">│ Ask in chat for a new link       │</span>
<span class="ln" data-note="item-3-line-29" tabindex="0">└──────────────────────────────────┘</span></pre></div></details></li>
</ol>
<p class="aside">Non-goals: managing passwords inside the chat, building a new website, or automatically clicking a website's submit button without your tap.</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-29</p>Asked Should the password and token forms save your entries and wake the chat in one tap? → chose Save and continue.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-29</p>Assumed: keep both improvements in one change, because the same private hand-over owns the fields, website actions, and return to the requesting chat.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-29</p>Assumed: wake the existing requesting chat rather than create a new one, because it holds the task that needs to continue.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-29</p>Assumed: a website button mirrors the real action and label, and completion waits for the requested finish, because submitting a password can lead to another code step.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-29</p>Assumed: offer mirrors for identifiable visible form actions; unfamiliar embedded or custom controls remain tappable in the preview, because the tool must not guess which action to trigger.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-29</p>Assumed: use ordinary code for saving, forwarding taps, and notifying the workspace, because this repeated flow needs no model call to decide when it is complete.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-29</p>Assumed: verify implementation tasks with focused checks and keep publishing checks in the final save, because the authorized build-and-publish flow archives completed work before its single publishing checkpoint. All planned coverage and live checks remain required.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-29</p>Assumed: record the completed host checks with disposable credentials and an isolated idle chat. Token and password completion woke that chat; a waiting result and repeated identity were consumed once. Website submission included the last character, stayed open for a code, and notified at the requested finish. Partial key input stayed open and cancellation sent no readiness.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-29</p>Assumed: checkpoint the completed archive for release 27.7.0 after focused tests and host checks passed; the publishing checks remain the final gate before merging.</li>
</ol>
</section>
<section id="notes" aria-labelledby="notes-h"><h2 id="notes-h">Your notes</h2>
<p class="session" hidden>Storage is off. Notes and drafts last for this session only.</p>
<ul class="note-list" id="note-list"></ul>
</section>
</main>
<button type="button" id="chip" hidden>Add note</button>
<div id="editor" role="dialog" aria-labelledby="editor-where" hidden>
  <p class="where" id="editor-where"></p>
  <p class="moved">Possibly moved: its text changed, so this note is not attached.</p>
  <textarea aria-label="Note text" rows="3" placeholder="A question or a change"></textarea>
  <div class="row"><button type="button" class="primary" data-act="save">Save</button><button type="button" data-act="discard">Discard</button><button type="button" data-act="delete">Delete note</button><button type="button" data-act="close">Close</button></div>
  <p class="copies">Saving a note copies all your notes.</p>
  <p class="session" hidden>Notes last for this session only.</p>
</div>
<div id="viewer" role="dialog" aria-modal="true" aria-label="Drawing, full screen" hidden>
  <div class="zoom"><span class="level"></span><button type="button" aria-label="Zoom out">−</button><button type="button">Fit</button><button type="button" aria-label="Zoom in">+</button><button type="button" class="primary">Close</button></div>
  <div class="vframe"></div>
  <p class="vhint">Drag to move · pinch or + to zoom · tap a line to note it</p>
</div>
<div class="bar"><span class="note-count" aria-live="polite">0 notes</span><span class="session" hidden>Session only</span><button type="button" class="primary" id="copy">Copy notes</button></div>
<div id="toast" role="status"></div>
<textarea id="copybuf" aria-hidden="true" tabindex="-1" readonly></textarea>
<script>
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  window.addEventListener('error', function (e) {
    $('script-error').hidden = false;
    $('script-error').textContent = 'Review script error: ' + e.message + ' (line ' + e.lineno + ')';
  });
  const root = document.documentElement;
  root.classList.add('js');
  const CHANGE = document.body.getAttribute('data-change');
  const KEY = 'wong-review3:' + CHANGE;
  const phone = window.matchMedia ? window.matchMedia('(max-width: 700px)') : { matches: false };
  const chip = $('chip'), editor = $('editor'), ta = editor.querySelector('textarea');
  const viewer = $('viewer'), vframe = viewer.querySelector('.vframe'), vbar = viewer.querySelector('.zoom'), vb = vbar.querySelectorAll('button');
  const all = function (sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); };
  const esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };

  // ── storage: a refused store keeps notes for this session ──
  let store = null, data = { notes: [], drafts: {} };
  const ok = function (r, id) { return r && typeof r.label === 'string' && typeof r.text === 'string' && /^[\w-]+$/.test(id); };
  try { store = window.localStorage; store.getItem(KEY); } catch (e) { store = null; }
  try {
    const saved = store ? JSON.parse(store.getItem(KEY) || 'null') : null;
    if (saved && Array.isArray(saved.notes)) data.notes = saved.notes.filter(function (n) { return ok(n, n && n.id); });
    if (saved && saved.drafts) Object.keys(saved.drafts).forEach(function (id) { if (ok(saved.drafts[id], id)) data.drafts[id] = saved.drafts[id]; });
  } catch (e) { /* unreadable notes start empty */ }
  function persist() {
    if (store) { try { store.setItem(KEY, JSON.stringify(data)); } catch (e) { store = null; } }
    render();
  }

  // ── targets: a data-note id names its location; the label pins a note to its text ──
  function where(id) {
    const m = /^(why|item|decision)-(\d+)(?:-line-(\d+))?$/.exec(id) || [];
    if (m[1] === 'why') return { at: '#/why', kind: 'paragraph ' + m[2], spot: 'Why, paragraph ' + m[2] };
    if (m[1] === 'item') return { at: '#/' + m[2], kind: m[3] ? 'drawing line ' + m[3] : 'item', spot: 'Change #' + m[2] + (m[3] ? ', drawing line ' + m[3] : '') };
    return { at: '#/decisions/' + m[2], kind: 'decision', spot: 'Decision #' + m[2] };
  }
  function labelOf(el) {
    const c = el.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll('.pin, .meta, .add'), function (n) { n.parentNode.removeChild(n); });
    const text = c.textContent.replace(/\s+/g, ' ').trim();
    return where(el.getAttribute('data-note')).kind + ' "' + (text.length > 60 ? text.slice(0, 59) + '…' : text) + '"';
  }
  function find(id, label) {
    const el = document.querySelector('[data-note="' + id + '"]');
    return el && labelOf(el) === label ? el : null;
  }
  function noteOf(id) { return data.notes.filter(function (n) { return n.id === id; })[0] || null; }

  // ── render pins, Note buttons, counts, and the notes list ──
  function render() {
    all('.pin, .add', function (p) { p.parentNode.removeChild(p); });
    const n = data.notes.length, d = Object.keys(data.drafts).length;
    const count = plural(n) + (d ? ' · ' + d + (d === 1 ? ' draft' : ' drafts') : '');
    all('.note-count', function (el) { el.textContent = count; });
    all('.session', function (el) { el.hidden = !!store; });
    const ids = data.notes.map(function (x) { return x.id; }).concat(Object.keys(data.drafts).filter(function (id) { return !noteOf(id); }));
    $('note-list').innerHTML = ids.length ? '' : '<li class="muted">No notes yet.</li>';
    ids.forEach(function (id) {
      const note = noteOf(id), draft = data.drafts[id], rec = note || draft, num = note ? data.notes.indexOf(note) + 1 : 0;
      const el = find(id, rec.label);
      if (el) {
        const pin = document.createElement('button');
        pin.type = 'button'; pin.className = draft ? 'pin draft' : 'pin'; pin.setAttribute('data-open', id);
        pin.textContent = (num || '') + (num && draft ? ' · ' : '') + (draft ? 'Draft' : '');
        pin.setAttribute('aria-label', (num ? 'Open note ' + num : 'Open draft') + (num && draft ? ' and its draft' : ''));
        el.appendChild(pin);
      }
      const li = document.createElement('li');
      li.innerHTML = '<button type="button" class="entry" data-open="' + id + '"><span class="where">' + (num ? num + '. ' : '')
        + esc(where(id).at + ' · ' + rec.label) + (draft ? '<span class="tag">Draft</span>' : '') + (el ? '' : '<span class="tag">possibly moved</span>')
        + '</span>' + esc(draft ? draft.text : note.text) + '</button>';
      $('note-list').appendChild(li);
    });
    all('[data-note]', function (el) {
      if (el.closest('.art') || el.querySelector('.pin')) return;
      const id = el.getAttribute('data-note'), add = document.createElement('button');
      add.type = 'button'; add.className = 'add'; add.setAttribute('data-open', id);
      add.textContent = '+ Note'; add.setAttribute('aria-label', 'Note on ' + where(id).kind);
      el.appendChild(add);
    });
    drawings.forEach(function (d) {
      const k = d.art.querySelectorAll('.pin').length;
      d.count.textContent = k ? ' · ' + k + (k === 1 ? ' note' : ' notes') : '';
      fit(d);
    });
  }

  // ── still-tap to note: a mouse on text, or any pointer on a full-screen drawing line, shows the chip ──
  let chipFor = null, tap = null;
  const pointers = {};
  function showChip(el, x, y, keyboard) {
    const id = el.getAttribute('data-note');
    chipFor = el;
    chip.textContent = noteOf(id) || data.drafts[id] ? 'Edit note' : 'Add note';
    chip.hidden = false;
    const w = chip.offsetWidth, vw = root.clientWidth;
    chip.style.left = Math.max(8, Math.min(x - w / 2, vw - w - 8)) + window.pageXOffset + 'px';
    chip.style.top = y + 12 + window.pageYOffset + 'px';
    if (keyboard) chip.focus({ preventScroll: true });
  }
  function hideChip() { chip.hidden = true; chipFor = null; }
  document.addEventListener('pointerdown', function (e) {
    if (e.isPrimary) Object.keys(pointers).forEach(function (k) { delete pointers[k]; });
    pointers[e.pointerId] = true;
    tap = Object.keys(pointers).length === 1 && e.button === 0 ? { id: e.pointerId, x: e.clientX, y: e.clientY, t: Date.now(), target: e.target } : null;
  });
  document.addEventListener('pointermove', function (e) {
    if (tap && e.pointerId === tap.id && Math.abs(e.clientX - tap.x) + Math.abs(e.clientY - tap.y) > 8) tap = null;
  });
  document.addEventListener('pointercancel', function (e) { delete pointers[e.pointerId]; tap = null; });
  document.addEventListener('pointerup', function (e) {
    const t = tap;
    delete pointers[e.pointerId]; tap = null;
    if (!t || t.id !== e.pointerId || Date.now() - t.t > 500) return;
    if (t.target.closest('a, button, input, textarea, select, label, summary, #editor')) return;
    const el = t.target.closest('[data-note]');
    const offer = el && (el.closest('#viewer') || (e.pointerType === 'mouse' && !el.closest('.frame')));
    if (offer) showChip(el, e.clientX, e.clientY, false); else hideChip();
  });
  chip.addEventListener('click', function () { if (chipFor) openEditor(chipFor.getAttribute('data-note'), chipFor); });
  document.addEventListener('click', function (e) {
    const t = e.target.closest ? e.target.closest('[data-open]') : null;
    if (!t) return;
    const id = t.getAttribute('data-open'), rec = data.drafts[id] || noteOf(id), el = rec ? find(id, rec.label) : t.closest('[data-note]');
    if (el && t.classList.contains('entry')) { reveal(el); el.scrollIntoView({ block: 'center' }); }
    openEditor(id, el);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (open) closeEditor(true);
      else if (chipFor) { const el = chipFor; hideChip(); el.focus(); }
      else if (view) closeViewer(true);
    } else if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-note]')) {
      e.preventDefault();
      const r = e.target.getBoundingClientRect();
      showChip(e.target, r.left + 48, r.top + Math.min(r.height, 24), true);
    }
  });

  // ── the editor: beside its target on a desktop, docked at the bottom of the visible screen on a phone ──
  let open = null;
  function openEditor(id, el) {
    closeViewer(false); closeEditor(false); hideChip();
    if (el) reveal(el);
    const note = noteOf(id), draft = data.drafts[id];
    const label = draft ? draft.label : note ? note.label : labelOf(el);
    open = { id: id, label: label, el: el };
    $('editor-where').textContent = where(id).at + ' · ' + label;
    editor.querySelector('.moved').hidden = !!el;
    editor.querySelector('[data-act="delete"]').hidden = !note;
    ta.value = draft ? draft.text : note ? note.text : '';
    editor.hidden = false;
    if (el) el.classList.add('noting');
    place();
    ta.focus({ preventScroll: editor.classList.contains('docked') });
  }
  function closeEditor(restore) {
    if (!open) return;
    const el = open.el;
    open = null; editor.hidden = true;
    document.body.classList.remove('docked'); document.body.style.paddingBottom = '';
    if (el) { el.classList.remove('noting'); if (restore) el.focus({ preventScroll: true }); }
  }
  function place() {
    const docked = phone.matches || !open.el;
    editor.classList.toggle('docked', docked);
    document.body.classList.toggle('docked', docked);
    editor.style.left = editor.style.top = editor.style.bottom = editor.style.maxHeight = '';
    if (docked) {
      dock();
      document.body.style.paddingBottom = editor.offsetHeight + 24 + 'px';
      keepVisible();
      return;
    }
    const r = open.el.getBoundingClientRect(), w = editor.offsetWidth, vw = root.clientWidth;
    let left = r.right + 12, top = r.top;
    if (left + w > vw - 8) { left = Math.max(8, Math.min(r.left, vw - w - 8)); top = r.bottom + 8; }
    editor.style.left = left + window.pageXOffset + 'px';
    editor.style.top = top + window.pageYOffset + 'px';
  }
  // The visible screen: a phone keyboard shrinks it, and a host app may shrink the page too, so place from its top.
  function screen() {
    const vv = window.visualViewport;
    return vv ? { top: vv.offsetTop, h: vv.height } : { top: 0, h: window.innerHeight };
  }
  function dock() {
    if (!open || !editor.classList.contains('docked')) return;
    const s = screen();
    editor.style.maxHeight = s.h + 'px';
    editor.style.bottom = 'auto';
    editor.style.top = s.top + Math.max(0, s.h - editor.offsetHeight) + 'px';
  }
  function keepVisible() {
    if (!open || !open.el) return;
    const r = open.el.getBoundingClientRect(), s = screen(), limit = s.top + s.h - editor.offsetHeight - 8;
    if (r.bottom > limit) window.scrollBy(0, Math.min(r.top - s.top - 8, r.bottom - limit));
  }
  let seen = screen().h;
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', function () {
      const h = screen().h, keyboard = Math.abs(h - seen) > 100;
      seen = h; dock();
      if (keyboard) keepVisible();
    });
    window.visualViewport.addEventListener('scroll', dock);
  }
  ta.addEventListener('input', function () {
    if (!open) return;
    const note = noteOf(open.id), text = ta.value;
    if (!text.trim() || (note && text === note.text)) delete data.drafts[open.id];
    else data.drafts[open.id] = { label: open.label, text: text };
    persist();
  });
  editor.addEventListener('click', function (e) {
    const act = e.target.getAttribute('data-act');
    if (!act || !open) return;
    const id = open.id, note = noteOf(id), text = ta.value.trim();
    if (act === 'save') {
      if (!text) { ta.focus(); return; }
      if (note) note.text = text; else data.notes.push({ id: id, label: open.label, text: text });
    }
    if (act === 'delete') data.notes = data.notes.filter(function (n) { return n.id !== id; });
    if (act !== 'close') delete data.drafts[id];
    closeEditor(true); persist();
    if (act === 'save') {
      const n = data.notes.length;
      copyNotes(function () { toast('Saved and copied ' + plural(n) + '. Paste them into chat.'); },
        function () { toast('Saved. Tap Copy notes to copy them.'); });
    }
  });

  // ── drawings: fitted by font size on the page; a tap shows one full screen, where it zooms and scrolls natively ──
  const BASE = 13, drawings = [];
  let view = null;
  const V = { f: BASE, lo: BASE, hi: BASE };
  function size(art, f, max) {
    art.style.fontSize = f + 'px';
    for (let i = 0; i < 3 && art.offsetWidth > max; i += 1) { f *= max / art.offsetWidth; art.style.fontSize = f + 'px'; }
    return f;
  }
  function fit(d) {
    if (!d.fig.open || view === d) return;
    d.art.style.fontSize = BASE + 'px';
    const w = d.art.offsetWidth, fw = d.frame.clientWidth - 1;
    if (w > 0 && fw > 0) size(d.art, BASE * Math.min(1.25, fw / w), fw);
  }
  function reveal(el) {
    const fig = el.closest('details');
    if (fig && !fig.open) { fig.open = true; drawings.forEach(fit); }
  }
  function scale(f, cx, cy) {
    f = Math.max(V.lo, Math.min(V.hi, f));
    const k = f / V.f, x = (vframe.scrollLeft + cx) * k - cx, y = (vframe.scrollTop + cy) * k - cy;
    V.f = f; view.art.style.fontSize = f + 'px';
    vframe.scrollLeft = x; vframe.scrollTop = y;
    const atFit = f <= V.lo * 1.001;
    vbar.firstChild.textContent = (atFit ? 'Fit · ' : '') + Math.round(f / BASE * 100) + '%';
    vb[0].disabled = atFit; vb[2].disabled = f >= V.hi * 0.999;
  }
  function openViewer(d) {
    hideChip();
    view = d; viewer.hidden = false; document.body.classList.add('viewing');
    vframe.appendChild(d.art);
    d.art.style.fontSize = BASE + 'px';
    const fw = vframe.clientWidth - 1;
    V.lo = size(d.art, BASE * fw / Math.max(1, d.art.offsetWidth), fw);
    V.hi = Math.max(V.lo * 4, 40); V.f = V.lo;
    vframe.scrollLeft = vframe.scrollTop = 0;
    scale(V.lo, 0, 0);
    vb[3].focus({ preventScroll: true });
  }
  function closeViewer(restore) {
    if (!view) return;
    const d = view;
    view = null;
    d.frame.insertBefore(d.art, d.frame.firstChild);
    viewer.hidden = true; document.body.classList.remove('viewing');
    fit(d);
    if (restore) d.enlarge.focus({ preventScroll: true });
  }
  vbar.addEventListener('click', function (e) {
    const i = Array.prototype.indexOf.call(vb, e.target);
    if (i === 3) closeViewer(true);
    else if (i >= 0) scale([V.f / 1.25, V.lo, V.f * 1.25][i], vframe.clientWidth / 2, vframe.clientHeight / 2);
  });
  vframe.addEventListener('wheel', function (e) {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const r = vframe.getBoundingClientRect();
    scale(V.f * (e.deltaY < 0 ? 1.1 : 1 / 1.1), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });
  // One finger scrolls natively; two fingers pinch around their midpoint.
  let pinch = null;
  const span = function (t) { return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY) || 1; };
  vframe.addEventListener('touchstart', function (e) { if (e.touches.length === 2) pinch = { f: V.f, dist: span(e.touches) }; }, { passive: true });
  vframe.addEventListener('touchmove', function (e) {
    if (!pinch || e.touches.length !== 2) return;
    if (e.cancelable) e.preventDefault();
    const r = vframe.getBoundingClientRect(), t = e.touches;
    scale(pinch.f * span(t) / pinch.dist, (t[0].clientX + t[1].clientX) / 2 - r.left, (t[0].clientY + t[1].clientY) / 2 - r.top);
  }, { passive: false });
  vframe.addEventListener('touchend', function (e) { if (e.touches.length < 2) pinch = null; });
  document.addEventListener('gesturestart', function (e) { if (view) e.preventDefault(); });
  all('.drawing', function (fig) {
    const frame = fig.querySelector('.frame'), enlarge = document.createElement('button');
    enlarge.type = 'button'; enlarge.className = 'enlarge'; enlarge.textContent = 'Full screen';
    frame.appendChild(enlarge);
    const d = { fig: fig, frame: frame, art: fig.querySelector('.art'), count: fig.querySelector('.count'), enlarge: enlarge };
    drawings.push(d);
    fig.addEventListener('toggle', function () { fit(d); });
    frame.addEventListener('click', function (e) { if (!e.target.closest('[data-open]')) openViewer(d); });
  });

  // ── direct links: #/why, #/<n>, #/decisions/<n> ──
  function jump() {
    const m = /^#\/(?:decisions\/(\d+)|(\d+)|(why|changes|decisions))$/.exec(location.hash);
    const el = m ? $(m[1] ? 'decision-' + m[1] : m[2] ? 'item-' + m[2] : m[3]) : null;
    if (!el) return;
    all('.hit', function (n) { n.classList.remove('hit'); });
    el.classList.add('hit');
    el.scrollIntoView({ block: 'start' });
  }

  // ── copy: saved notes only, as notes on the plan: each asks or changes something ──
  function notesText() {
    const lines = ['Notes on the plan ' + CHANGE + ' from the review page. Don\'t build yet.'];
    data.notes.forEach(function (n) {
      const w = where(n.id);
      lines.push('- ' + w.spot + ' (' + n.label.slice(w.kind.length + 1) + '): ' + n.text.replace(/\s*\n\s*/g, ' '));
    });
    return lines.join('\n');
  }
  function toast(text) {
    $('toast').textContent = text; $('toast').classList.add('show');
    setTimeout(function () { $('toast').classList.remove('show'); }, 2000);
  }
  function plural(n) { return n + (n === 1 ? ' note' : ' notes'); }
  // One routine for Copy notes and Save: the Clipboard API, else select #copybuf and execCommand, then hand focus back.
  function copyNotes(done, failed) {
    const buf = $('copybuf');
    buf.value = notesText();
    const fallback = function () {
      const back = document.activeElement;
      buf.select();
      const ok = document.execCommand('copy');
      if (back && back !== buf && back.focus) back.focus({ preventScroll: true });
      if (ok) done(); else failed();
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(buf.value).then(done, fallback); else fallback();
  }
  $('copy').addEventListener('click', function () {
    const n = data.notes.length;
    if (!n) { toast('No saved notes yet. Drafts are not copied.'); return; }
    copyNotes(function () { toast('Copied ' + plural(n) + '. Paste them into chat.'); },
      function () { toast('Copy failed. Copy the notes list by hand.'); });
  });

  let width = root.clientWidth;
  window.addEventListener('resize', function () {
    if (root.clientWidth !== width) {
      width = root.clientWidth; hideChip();
      if (view) { const d = view; closeViewer(false); openViewer(d); }
    }
    drawings.forEach(fit);
    if (open) place();
  });
  window.addEventListener('hashchange', jump);
  render();
  jump();
}());
</script>
</body>
</html>

~~~
<!-- end review.html -->
