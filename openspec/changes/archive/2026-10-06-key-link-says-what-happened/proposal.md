# The key link says what happened

**Status:** planned

**Branch:** code-simplification

**Open questions:** none

## Why

Twice this week a key link failed and the assistant could not say why. Three links in a row ran out after 30 minutes each. The assistant could not tell whether you were away or the link would not load, so it sent another each time: about 90 minutes of waiting. Then a link closed 33 seconds after it was sent, because a chat in another workspace needed a private link. The first chat heard only that its link had closed, the same thing it hears when you tap cancel. The link already knows both facts and throws them away when it ends.

## What Changes

- **A key link that ends with nothing saved says whether you opened it.** Never opened: the assistant says so and asks whether the link loaded, before it sends another. Opened but nothing saved: it asks where you got stuck. Today it can only say the link closed.
  ```text
  key link ends, nothing saved
     │
     ├─ never opened ──▶ "did it load?"
     │
     ├─ opened ────────▶ "where did you
     │                    get stuck?"
     │
     └─ another chat ──▶ "that chat took
        took its place    its place"
  ```
- **A link that closed for another chat's link names that chat.** The first chat says which workspace took its place, and offers a new link once you are ready. Today it can not tell this from a cancel.
- **Nothing else about the link changes.** One private link is still open at a time, and a key link nobody has opened still gives way to a newer one. The page looks the same. The assistant learns only a yes or no and a workspace's folder name: never a key, an address, or what was on the page.

**Non-goals:** stopping a newer link from closing one nobody has opened; two links open at once; the password link and the private form; the error page a closed link's address shows.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `secrets-convention`: a key link that ends with nothing saved tells the agent whether it was opened and which workspace's link took its place, and the agent says which before offering another.

## Impact

- `.agents/skills/hand-over/scripts/hand-over.mjs`: `wait` prints `HANDOVER_OPENED=yes|no` for a key link and `HANDOVER_REPLACED_BY=<folder>` for one that gave way; a small record file in `~/.wong-stack/hand-over/`.
- `scripts/tests/hand-over.test.mjs`: the give-way test, and new cases for opened, unopened, and other links.
- `wiki/development/secrets.md` (the owning page) and one sentence in `wiki/stack/api-keys.md`.
- `CHANGELOG.md`: a `minor` entry; nothing to do by hand.
- No app, database, or page change.

## Decision log

- **2026-10-06** — Assumed: this is the one improvement to make, because two open struggle notes (#1128, #1137) record real failed key hand-offs in a part changed four times in a week, and both name a fact the script holds and drops.
- **2026-10-06** — Assumed: the fix is a result line the script prints, not one more instruction, because whether a link was opened is a fact a machine has and a person reading a rule can not guess.
- **2026-10-06** — Assumed: the rule that an unopened key link gives way stays as it is, because holding the slot for 30 minutes would block every other chat's password or payment form; changing that trade is the owner's choice and is left as a recommendation.
- **2026-10-06** — Assumed: only the key link reports whether it was opened, because it is the one link that waits 30 minutes and gives way, and the password page asks for nothing with its key until a save.
- **2026-10-06** — Assumed: the other chat is named by its workspace's folder name, because that is the name the person sees in their list of chats, and it holds nothing private.
- **2026-10-06** — Assumed: this is a minor release, because the result gains two lines and nothing an install relies on changes or goes away.
