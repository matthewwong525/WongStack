# Proposal

**Status:** ready-to-ship
**Branch:** stop-payment-saving
**Open questions:** none

## Why

Since 43.14.0 the private form can save a card, security code included, so a later payment takes only a yes in the chat. You want every payment typed through the private form each time, with no card kept on the computer: a saved card is one more copy of it to lose.

## What Changes

- **The private form saves nothing.** The *Save for next time* tick goes. You type the card each time; it reaches the site and is gone.
  ```screen
  <div class="row gap">
    <div class="card col gap phone">
      <span class="tag-outline">Before</span>
      <h3>Pay City of Markham</h3>
      <div class="field"><label>Card number</label><input></div>
      <div class="field"><label>Security code</label><input></div>
      <div class="row gap"><input type="checkbox"><span>Save for next time</span></div>
      <button class="btn-primary">Pay $45.00</button>
    </div>
    <div class="card col gap phone">
      <span class="tag-outline">After</span>
      <h3>Pay City of Markham</h3>
      <div class="field"><label>Card number</label><input></div>
      <div class="field"><label>Security code</label><input></div>
      <button class="btn-primary">Pay $45.00</button>
    </div>
  </div>
  ```

- **Every payment goes through the private form.** The chat no longer asks *Pay with your card ending 4242?*; it asks whether you're ready and sends the form, as before 43.14.0.
  ```mermaid
  flowchart LR
    page[asks for a card] --> ready["chat: ready?"] --> form[private form] --> done[receipt]
  ```

- **Everyday answers still save.** After you give an email, name, address, or phone in the chat, the assistant still asks once whether to keep them. Next time it asks *Use 1 Main St?* and types them itself.

- **A card saved before this update is deleted** the next time saved details are read, and the update reads them once. This can't be undone; you type that card again next time.

**Non-goals:** changing saved passwords, or how the private form fills the site.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `saved-details`: only everyday answers from the chat are saved; a card never is, and one saved earlier is deleted; a saved answer is typed by the agent after a yes.
- `browser-logins`: the private form offers no *Save for next time* and stores nothing.

## Impact

- `.agents/skills/hand-over/scripts/`: `hand-over.mjs` loses `fill`, `--use`, and the saved-card report; `form.mjs`, `form-page.html`, `form-page.mjs` lose the tick; `details.mjs` keeps chat answers only and drops any card set it reads.
- `.agents/skills/hand-over/SKILL.md`, `wiki/development/private-form.md`, `browsing.md`, `README.md` (and its seed copy).
- Tests: `details.test.mjs`, `hand-over.test.mjs`, `form.test.mjs`, `form-page.test.mjs`.
- `~/.wong-stack/details.json` on each install: card sets removed.

## Decision log

- **2026-10-20** — Assumed: the private form saves nothing at all, not only cards, because it carries cards and backup codes, and a backup code was never kept.
- **2026-10-20** — Assumed: `hand-over.mjs fill` goes too, because it existed to type a saved card the agent can't see; an everyday answer the agent can read and type itself, as it types every chat answer.
- **2026-10-20** — Assumed: everyday answers saved from the chat stay, because you named payments only.
- **2026-10-20** — Assumed: a card saved before the update is deleted, not just left unused, because a stored card is the risk this removes. None is saved on this computer.
- **2026-10-20** — Assumed: a minor release, not major, because the feature shipped today as 43.14.0 and no install's own skill calls `fill`.
- **2026-10-20** — Assumed: the retired name is `--use <name>`, not bare `--use`, because `--use` also matches `--username` in live files.
- **2026-10-20** — Assumed: `Save for next time` stays allowed in `openspec/specs/browser-logins/spec.md` and `openspec/specs/saved-details/spec.md`, because their 43.14.0 requirements name it until this change's archive replaces them; the allow can go after the archive.
- **2026-10-20** — Check: `wiki-development-README.md` (the seed copy) never said "can save a card", so it is unchanged.
- **2026-10-20** — Check: local pre-checks pass; the four changed test files pass (105 tests).
- **2026-10-20** — Check: walked a pretend card page over a real private link: the form showed no *Save for next time*, a made-up card paid and reached the receipt, `wait` printed no saved line, and `details.json` stayed byte-identical. A file holding an old card and an email read back as the email alone, with the card gone from disk.
- **2026-10-20** — Archived for publishing as 43.16.0.
