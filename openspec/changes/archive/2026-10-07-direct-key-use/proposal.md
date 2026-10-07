# Let an assistant use a saved key directly, when you switch it on

**Status:** ready-to-ship

**Branch:** keys-skills-api-design

**Open questions:** none

## Why

Today a teammate's assistant can only do work with a service that someone has already built into the app. Every new question, such as *find this page in Notion*, needs a build first. So people fall back to keeping the key on their own computer, where nobody can limit it, see its use, or take it away. That is what happened in Claymoo App: its Notion, Shade and Klaviyo skills read the key from the computer and work only on the owner's server.

## What Changes

- **A key can be used directly, through the app.** The assistant asks the app to pass one request on to the service. The app checks the person's level for that key, adds the key itself, and returns the answer. The key never reaches the person's device, each use is recorded with who made it, and lowering a person's level stops their next request.
  ```text
    BEFORE                 AFTER
  assistant ─▶ key on    assistant ─▶ the app ─▶ service
               your own       │         │
               computer       ▼         ▼
  works only for you       their     level ok?
                           login     +adds the key
                                     +records who
  ```
- **You switch it on per key, in Access.** Each key's page gets one choice: *Off*, *Look-ups only*, or *Look-ups and changes*. It is *Off* until you pick. The page says what the choice opens and how many people it reaches, because direct use makes a level mean more: *Notion: Read* then lets a person's assistant read everything that key can see. The Keys list shows the choice on the key's row.
  ```text
    BEFORE                    AFTER
  ┌────────────────────────┐ ┌──────────────────────────┐
  │ Notion              ✕  │ │ Notion                ✕  │
  │ Saved                  │ │ Saved                    │
  │ Used by Tasks: look up │ │ Used by Tasks: look up   │
  │                        │ │                          │
  │                        │ │+Direct use               │
  │                        │ │+( ) Off                  │
  │                        │ │+(•) Look-ups only        │
  │                        │ │+( ) Look-ups and changes │
  │                        │ │+Anyone with Read can look│
  │                        │ │+up anything this key can │
  │                        │ │+see. 3 people today.     │
  │                        │ │                          │
  │ Sales  [Read        ▾] │ │ Sales  [Read          ▾] │
  │ Kim    [None        ▾] │ │ Kim    [None          ▾] │
  │                        │ │                          │
  │ [Save access] Cancel   │ │ [Save access] Cancel     │
  └────────────────────────┘ └──────────────────────────┘
  ```
  A key whose service can't be used this way yet says so, with no choice to make:
  ```text
  ┌──────────────────────────────────┐
  │ Stripe                        ✕  │
  │ Saved                            │
  │ Nothing uses it yet              │
  │                                  │
  │ Direct use                       │
  │ Not set up for this key. Ask     │
  │ your assistant to add it.        │
  │                                  │
  │ Sales  [None                  ▾] │
  │ [Save access] Cancel             │
  └──────────────────────────────────┘
  ```
- **A person's level decides what they can do with it.** *Read* passes on look-ups. *Read & write* also passes on changes, and only when you chose *Look-ups and changes* for that key. A refusal says what is missing, such as *Notion: direct use is off*.
  ```text
  your choice    │ Read    │ Read & write
  ───────────────┼─────────┼──────────────
  Off            │ nothing │ nothing
  Look-ups only  │ look up │ look up
  Look-ups and   │ look up │ look up and
  changes        │         │ change
  ```
- **The app passes on only what is safe to pass.** A request goes to that service's own address and nowhere else, the answer is cut off at a fixed size, and no answer can carry the key back.
- **A skill can use a key this way, and Access still shows who can run it.** The Skills view names the key and the level as it does now, and says *direct use is off* when that is what stops the skill.
- **The assistant sets a service up when it saves the key.** WongStack ships with no service ready-made. When you give a new key, the assistant adds where that service lives and which of its requests only look things up, from the service's own guide. That goes out with a normal publish. Direct use still stays *Off* until you choose.
- **Building the work into the app stays the first choice** for anything you do again and again, or that touches money or customers. Only built work can limit a person to one area or one record. Direct use is for look-ups and one-off jobs nobody has built.

## Non-goals

- A ready-made list of services. Each is added when its key is saved.
- Services whose key must be renewed every hour through a sign-in, such as Google. Those still need built work.
- Limiting direct use to part of a service. The key's own permissions at the service are the limit: make a narrower key there.
- Changing the Cloudflare look-ups, which keep their own stricter rules.
- Changing Claymoo App. It has its own Access and would take this in through its own update.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `key-access`: a key may be used directly through the app when the employer turns it on for that key; the person's level and the key's direct-use choice together decide; what the app will and will not pass on; Access shows and sets the choice.
- `skill-actions`: a skill may call a key's direct-use actions, and Access names *direct use is off* as what is missing.

## Impact

- Worker: the key registry `app/worker/keys.ts` gains an optional forwarding entry; a new `app/worker/api/forward.ts` makes two described actions per forwardable key and the main router registers them; `app/worker/employee-access/` (policy read, key catalogue, a new save, status); `app/worker/api/discovery.ts`; a new migration with one table; `schema/seed.sql`.
- Screens: `app/src/apps/access/` (`KeyPage.tsx`, `Keys.tsx`, `levels.ts`, the skill panel's missing lines), `app/src/lib/access.ts`.
- Checks: `app/worker/apps/keys.test.ts` holds a forwarding entry to its rules; `scripts/check-skill-actions.mjs` needs no change.
- Docs: `wiki/stack/company-api.md`, `api-keys.md`, `employee-access.md`, `access-screens.md`; one clause in `wiki/development/secrets.md`.
- Payload release: `CHANGELOG.md` entry, **minor**: nothing an install has stops working, and direct use is off everywhere until chosen.

## Decision log

- **2026-10-07** — Asked whether skills should reach a service by forwarding on the key or through built actions → chose both: built actions stay the default, forwarding is added per key.
- **2026-10-07** — Asked where forwarding is switched on for a key → chose in Access, per key: Off, Look-ups only, or Look-ups and changes, off until picked.
- **2026-10-07** — Asked which services forward out of the box → chose none; the assistant adds a service's details when it saves that key.
- **2026-10-07** — Assumed: the screens call it *direct use*, because *forwarding* describes the plumbing and the owner is choosing whether an assistant may use the key directly.
- **2026-10-07** — Assumed: the owner and a manager can both set the choice, because a manager already sets every key level and Access gives managers everything but managing managers.
- **2026-10-07** — Assumed: *Off* is off for the owner too, because one switch that means one thing is easier to trust, and the owner's own computer already holds the key.
- **2026-10-07** — Assumed: direct use needs no app ticked, only the key's level, because Cloudflare look-ups already work that way and a direct request belongs to no app.
- **2026-10-07** — Assumed: each key gets two actions, one for look-ups and one for changes, because the app already decides the level a call needs from what the action does, and a skill's list then shows which it uses.
- **2026-10-07** — Assumed: a request counts as a look-up when it only reads by the web's own rules, or is on the key's short list of look-up requests, because some services search with a request that looks like a change; anything else needs Read & write.
- **2026-10-07** — Assumed: only a service that takes one fixed key in a request header can be set up, because a key renewed through a sign-in needs code of its own.
- **2026-10-07** — Assumed: Cloudflare look-ups stay as they are, because their rules about stored data are stricter than a general pass-through and already live.
- **2026-10-07** — Assumed: a preview keeps its own direct-use choice with its practice list, because a preview's Access already changes nothing on the live app.
- **2026-10-07** — Assumed: a preview shows only a key that is not set up, and the first real direct request is made on a real install with a real key after publishing, because WongStack ships no service key and a practice one would need a second key list of its own; tests with a stand-in service cover the rest.
- **2026-10-07** — Assumed: the Cloudflare look-up key and Project code say *Not offered for this key* and give no hint to ask, because neither can ever be set up for direct use and the hint would send the owner to ask for something that can't be done.
- **2026-10-07** — Built: the one linking clause planned for the secrets page was left out, because it pushed a save route's instructions past their word limit; the two key pages carry the guidance.
- **2026-10-07** — Assumed: the save and the preview walk are publishing's own steps and no longer boxes in the task list, because they are the routine gate every publish runs; the list keeps what the walk should look at. A real direct request is unverified until a real install saves a real key.
- **2026-10-07** — Archived for publishing as 37.3.0; the checkpoint after this entry is the one that merges.
