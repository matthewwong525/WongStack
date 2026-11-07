# The agent adds an add-on in one ask, and you only sign in

**Status:** ready-to-ship
**Branch:** browser-addon-skill-update
**Open questions:** none

## Why

You asked the agent to add 1Password. It opened Firefox's add-on page and told you to press *Add to Firefox* yourself. When you ask for an add-on, the agent should do every step it can, and leave you only the steps that need you, such as signing in.

## What Changes

- **Your ask is your yes for a safe match.** You name one add-on, such as 1Password. When the best match is featured by Mozilla, or used by more than 10,000 people a day, the agent adds it at once, with the same checks. It names the maker, website, and daily users as it adds it. It still asks first when the match is little-used, when your words fit more than one add-on, or when the agent already added it.
  ```mermaid
  flowchart TD
    A["You: add 1Password"] --> B["Agent finds it on Firefox's site"]
    B --> C{"Featured or popular, one clear match?"}
    C -- yes --> D["Agent adds it, checks the file"]
    C -- no --> E["Agent asks, with a warning"]
    E -- "your yes" --> D
    D --> F["Agent opens its sign-in page for you"]
    F --> G["You sign in"]
  ```
- **The agent opens the add-on's sign-in page right after it adds it**, in the browser window or a live view. You sign in there; that's your only step.
- **The agent never sends you to Firefox's add-on site to press the button.** That copy didn't work for 1Password, and it's work the agent can do.
  | Step | Before | After |
  |---|---|---|
  | Find the add-on | Agent | Agent |
  | Say yes | You | Your ask, unless it's a doubtful match |
  | Add it | You, or agent after a second yes | Agent |
  | Open its sign-in page | Agent, only before a site sign-in | Agent, right after the add |
  | Sign in to it | You | You |

**Non-goals:** the agent signing in to or unlocking an add-on; any change to the file checks; a restart to show the toolbar button.

## What the build needs

- **The browser instructions and the help page**: Ready. Nothing else changes.
- **The open add-on change (PR #532)**: Ready. It changes the same lines; whichever is published second fits the two together.

## Capabilities

### New Capabilities

### Modified Capabilities

- `password-manager-add-on`: a new requirement: the person's ask is the yes for a featured or popular single match, and the agent opens the add-on's own page right after an add.

## Impact

- `.agents/skills/browser/SKILL.md`: the add-on line.
- `wiki/development/password-manager.md`: *Ask the agent* and *The checks*.
- `openspec/specs/password-manager-add-on/spec.md`: through the delta.
- `CHANGELOG.md`: a minor entry.

## Decision log

- **2026-11-07** — Assumed: the person's ask counts as the yes when it names one add-on and the best match is featured or has 10,000 or more daily users, with no `BROWSE_ADDON_WARN`, because Matthew asked on 2026-11-06 that the agent do as much as possible when he asks to add something, and the warning rule already marks the doubtful case.
- **2026-11-07** — Assumed: the agent asks first when `addon find` lists more than one plausible match for the words, because the yes then picks the add-on, not only approves it.
- **2026-11-07** — Assumed: the agent runs `addon open` right after an add, then `show` in a window or a live view on a server, because signing in to the add-on is the person's next step; the old rule ran it only before a site's sign-in turn.
- **2026-11-07** — Asked whether to fold this into PR #532 or keep it separate → chose continue here (the person: "it's already added but it's good let's continue here"). This builds now on `main`'s text; whichever of the two merges second resolves the overlap in the skill line and the help page.
- **2026-11-07** — Assumed: no script change, because `addon find` already prints whether a match is featured and its daily users, and `addon find` already prints `BROWSE_ADDON_WARN` only for a little-used one; the agent's instructions decide when to ask.
- **2026-11-07** — Assumed: the spec gets a new requirement, not a change to *The person's choice of add-on, after their yes*, because #532 rewrites that requirement whole and the second archive would drop the other's text; the ask by name is the yes that requirement waits for, and the facts are named in the same turn, before the add.
- **2026-11-07** — Assumed: after `addon open`, the agent sends the browser by the skill's *send me the browser* command (`hand-over.mjs open --view --keep-open`), not `show`, because the skill keeps `show` for a finished page, and a sign-in is the person's turn, which only a held turn guards from another chat's click. The same command shows the window tab or sends a live view.
- **2026-11-07** — Assumed: the skill line keeps `main`'s *Asked to add one* (a password manager), because #532 widens it to any add-on; this change adds no second wording for it.
- **2026-11-07** — Assumed (review): the agent adds at once only when the add replaces no add-on in `addon status`, because on `main` an add removes the old add-on and its sign-in, which can't be undone; after #532 only the same add-on is replaced.
- **2026-11-07** — Assumed (review): the page's first sentence and *Add it yourself* lead with asking the agent, keeping the heading for its changelog link, because the page must not send the person to the site; #532's rewrite replaces this text.
- **2026-11-07** — Assumed (review): the release is minor, not patch, because the agent gains new behavior ([the release rules](../../../.agents/rules/payload.md)).
- **2026-11-07** — Saved for publish (`/ship`); task 3.2 waits on this save's CI.
- **2026-11-07** — Archived for publish as release 50.7.0.
- **2026-11-07** — Assumed: on merging PR #532 (50.7.0, add-ons side by side), the replace rule became "already added → say so and add nothing", and `addon open` runs only after a password manager is added, because an add no longer removes another add-on, and `addon open` would show a password manager's page after an add of, say, Dark Reader.
