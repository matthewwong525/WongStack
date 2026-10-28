# A saved login gets one try on a sibling subdomain

**Status:** ready-to-ship
**Branch:** browser-main-domain-login
**Open questions:** none

## Why

Some sites give each place its own subdomain and keep one account across them, such as Jane booking pages: `clinic.janeapp.com` and `myodetox.janeapp.com`. A login saved for one does not type on the other, so the agent asks the person again. WongOS added a one-time try for this and uses it; every WongStack install browses the same way, so it belongs here. Matthew chose on 2026-10-28 that general WongOS features go up to WongStack.

## What Changes

- **A saved login can try a sibling subdomain once.** With `--main-domain`, a login saved for `clinic.janeapp.com` also types on `myodetox.janeapp.com`, because both share the main domain `janeapp.com`. The agent tries it once: a repeat can lock the account.
  ```mermaid
  flowchart TD
    page["sign-in page"] --> same{"same site\nas the login?"}
    same -->|yes| type["type the login"]
    same -->|no| flag{"--main-domain and\nsame main domain?"}
    flag -->|yes| once["type it, one try"]
    flag -->|no| stop["wrong-site,\nnothing typed"]
  ```
- **Another main domain still gets nothing.** `janeapp.attacker.example` is not `janeapp.com`, so the login says `wrong-site` and types nothing. Without the flag, a login types only on its own site, as before.
  | Page | Without the flag | With `--main-domain` |
  |-|-|-|
  | `clinic.janeapp.com` | types | types |
  | `myodetox.janeapp.com` | wrong-site | types |
  | `janeapp.attacker.example` | wrong-site | wrong-site |

Non-goals: no automatic try without the flag; WongOS's upstream proxy and language setting stay in WongOS.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `browser-logins`: a login may type on a sibling subdomain of its saved site's main domain when the agent passes `--main-domain`.

## Impact

- `.agents/skills/browser/scripts/browse.mjs`: `mainDomain`, the `--main-domain` flag on `login`, `USAGE`.
- `scripts/tests/browse.test.mjs`: tests for `mainDomain` and the flag.
- `wiki/development/browsing.md`, `CHANGELOG.md`.
- Every install gets it on its next update; nothing to do by hand.
- Source: WongOS `.agents/skills/browser/scripts/browse.mjs` (`mainDomain`, `login`).

## Decision log

- **2026-10-28** — Asked whether general WongOS features go up to WongStack → chose yes, build them in WongStack first, then sync down (Matthew, in the WongOS chat).
- **2026-10-28** — Asked whether each part is planned and published without a stop at the plan → chose /ship for each part (Matthew).
- **2026-10-28** — Assumed: port WongOS's `mainDomain` and flag as they are, because WongOS uses them on real Jane logins; only the example host in the wiki changes to a made-up clinic.
- **2026-10-28** — Assumed: the sign-in-in-a-frame part is not in this change, because WongStack 44.18.0 already has it.
- **2026-10-28** — Archive checkpoint: archived and saved on branch browser-main-domain-login by /ship.
