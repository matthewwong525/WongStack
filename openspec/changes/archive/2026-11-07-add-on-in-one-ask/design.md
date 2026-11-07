# Design

## Context

The browser skill's add-on line (`.agents/skills/browser/SKILL.md`) says: `addon find`, name the facts, `addon add <slug>` on their yes, and `addon open` only before a sign-in turn. On 2026-11-06 an agent instead opened the add-on's page on addons.mozilla.org and told the person to press *Add to Firefox*. PR #532 (`password-manager-live-view-fixes`) widens the line to any add-on and rewrites the help page's *Ask the agent* section; this change edits that text after it merges.

## Goals / Non-Goals

**Goals:** one ask adds a safe add-on; the add-on's own page opens right after; the person is never sent to the add-on site.

**Non-Goals:** script changes; signing in for the person; restarting to show the toolbar button.

## Decisions

- **The ask is the yes for a safe single match.** "Safe" reuses the existing warning bar: featured, or 10,000 or more daily users, which is exactly when `addon add` prints no `BROWSE_ADDON_WARN`. "Single" means `addon find` lists one match whose name fits the words; a second plausible match (for example "Bitwarden" and "Bitwarden Authenticator") needs a pick. Alternative considered: keep a one-word yes always. Rejected: the person asked for fewer steps, and the facts still reach the chat after the add.
- **Order of facts.** For a safe match, the agent names the maker, website, and daily users in one line before it runs `addon add`, in the same turn, so the existing rule (name the facts before an add) holds and the person can still say *remove it*.
- **`addon open` right after the add**, then the browser goes to the person by the skill's *send me the browser* command (`hand-over.mjs open --view --keep-open`), with a note to sign in to the add-on. It shows the tab in the window, or sends a live view on a server. Not `show`: the skill keeps `show` for a finished page, and only a held turn stops another chat's click taking the window. The rule "only before a sign-in turn" becomes "right after an add, and before a sign-in turn".
- **Skill line wording (on `main`'s line):** `Asked to add one: addon find <name>. One clear match, featured or 10,000+ daily users: name its maker, website, and daily users, and addon add <slug> at once. Else name the matches' facts, with any BROWSE_ADDON_WARN, and add on their yes. Never send them to the add-on site. After an add, tell them its BROWSE_ADDON_TELL, run addon open, then send the browser as above, its note saying to sign in to the add-on. Also run addon open before a sign-in turn.` #532 widens *one* to any add-on.

- **No silent replace.** On `main` an add drops the add-on already there with its stored data, so the ask counts as the yes only when `addon status` shows none it would replace; otherwise the agent names the one that goes and waits. After #532, add-ons sit side by side and only the same add-on is replaced.

## Risks / Trade-offs

- **A look-alike that is featured or popular is added without a pause.** Mozilla's featured list and 10,000 users is the bar the warning already trusts; the file check still runs; and the facts in the same message let the person undo it.
- **PR #532 changes first.** If it changes the same lines again before merge, the build rereads them.
