# Design

## Context

See proposal.md for the why. Today's key link is three files under `.agents/skills/hand-over/scripts/`:

- `hand-over.mjs open --keys NAME[,NAME]` resolves each name against the example files, starts a tunnel and a detached watcher, sets `deadline = now + 10 min`, and prints the link. `~/.wong-stack/hand-over/` holds one state file and one watcher pid, so one link is open per computer.
- `keys.mjs` serves `GET /keys`, `POST /save`, `POST /continue`, `POST /done`. A value with a line break is refused. Each key becomes one dotenv line, because every reader of the live files is line-based: dotenv, wrangler, `worktree-secrets.mjs`, `cf-secrets.mjs`, and memory's redaction.
- `keys-page.html` and `keys-page.mjs` show one row per key: the code name, a hint (the first sentence of the example-file comment, 200 characters), a hidden box, *Show*.

[`wiki/development/secrets.md`](../../../wiki/development/secrets.md#receive-a-key-through-a-private-link) owns the chat side: steps in chat, a *Ready, send the link* ask, then `open` and a background `wait`.

## Goals / Non-Goals

**Goals:**

- One page carries the name, the service link, the steps, the box, and the test result.
- No per-service data in the payload: the agent supplies it per request.
- A key value still reaches only the live files, plus the one test address when a test is given.
- The link's other modes (browser hand-over, passwords) behave exactly as before.

**Non-Goals:**

- Several links open at once. One state directory stays.
- Tests that need two values (an id and a secret).
- Showing which keys are already connected, beyond today's *This replaces the one saved now*.

## Decisions

### D1. The guide is a JSON file passed to `open`

`open --keys A,B --guide <file>` reads a JSON object keyed by name:

```json
{ "STRIPE_SECRET_KEY": {
    "title": "Stripe key",
    "url": "https://dashboard.stripe.com/apikeys",
    "open": "Open Stripe's keys",
    "steps": ["Tap Create restricted key", "Tick Read charges", "Copy the key"],
    "check": { "url": "https://api.stripe.com/v1/balance", "auth": "bearer" } } }
```

`keys.mjs` validates it before any tunnel starts: only asked-for names; `title` and `open` ≤ 40 characters; `url` and `check.url` parse as `https` with a dotted host that is not an IP literal or `localhost`; at most 6 steps of ≤ 140 characters; `auth` one of `bearer`, `basic`, `header:<Name>` (a token-shaped name, never `Host`, `Cookie`, or `Content-Length`), `query:<name>`. A bad guide exits 2 with `KEYS_GUIDE=<name>: <reason>`, like `KEYS_UNDECLARED`. The valid guide rides in the state file; `GET /keys` returns `title`, `url`, `open`, `steps`, and `checkHost` per key, never `check.url`'s path.

*Why a file, not flags:* steps hold quotes and spaces, and several keys would need repeated flag groups. *Why not the example-file comment:* that comment is for developers and ships in git; the steps are for one person, one request, and change when the service's site does. The comment stays the fallback hint.

The page renders every guide string with `textContent`. The open control is an `<a target="_blank" rel="noopener noreferrer">`; the page already sends `no-referrer`.

### D2. One 30-minute limit

`open --keys` defaults `--minutes` to 30; the hand-over and password links keep 10. The deadline still starts at `open`, so the watcher's loop is unchanged. `GET /keys` returns `closesAt`, and the page counts down in whole minutes. On the first authenticated `GET /keys` the watcher writes an `opened` marker file, which D3 reads.

*Alternatives considered:* a clock that starts on first open, with a *More* button to 30 minutes. Dropped after review: one number is simpler to explain and to build. Keeping the *Ready?* ask was rejected: it is a round trip whose only job was to guard a short clock and the single slot, and D3 guards the slot.

### D3. An unopened key link gives way

`open` today exits 1 when a watcher is alive. New rule: when the live watcher is a key link with no `opened` marker, `open` signals it (`SIGTERM`, which already ends as `closed`), waits for it to exit, and carries on. An opened key link, a hand-over, or a password link still refuses the second `open`.

`wait` in the first chat prints `HANDOVER_RESULT=closed`; the wiki tells the agent to say the link closed and offer a new one.

*Alternative considered:* a state directory per link. Rejected for now: the tunnel, lock, recovery, and `wait` all assume one, and the hand-over mode needs one browser anyway.

### D4. The test runs in the watcher, on save

`keyRoutes` takes an injectable `fetch`. For a key with a `check`, before writing:

- `GET` the URL with the key placed by `auth`, `redirect: 'manual'`, `AbortSignal.timeout(8000)`; cancel the body unread.
- 2xx → `works`: write. 401 or 403 → `refused`: do not write, list under `refused`. Anything else, a redirect, or a throw → `untested`: write.
- The request body may carry `force: [NAME]` for *Save anyway*: that name skips the test and writes as `untested`.

The reply gains `checked: {NAME: 'works' | 'untested'}` and `refused: [NAME]`. A refused name is neither saved nor failed, so `ready` stays false by the existing rule. Nothing is logged.

*Why hold a refused key back:* the person still has the service's page open and can copy again. *Why allow Save anyway:* the agent wrote the test; a key limited to other permissions can earn a 403 and still be right.

*Why on the page, not in the chat afterwards:* the result must arrive while the person can still fix it, and the key must not pass through a command line.

### D5. Long keys on one line

`cleanValue` returns a storable value or null:

- No line break: as today.
- Parses as JSON: `JSON.stringify(JSON.parse(text))`, then the existing single-quote rule.
- Other text: normalise `\r\n` to `\n`, trim, and write it double-quoted with each line break as the two characters `\n`. dotenv and wrangler turn `\n` back into a line break inside double quotes. Refuse a value holding `"`, `\`, `$`, or a backtick, since no quoting keeps it whole.

The 4,096-character cap stays: a Worker secret holds 5 KB. The page reads a picked file with `file.text()`, refuses one over 16 KB before sending, and keeps the content in memory, never in the visible box. A hand paste into the single-line box is caught on the `paste` event, so its line breaks survive.

A shell that `source`s `.env` reads the literal `\n`; that is accepted, since such keys are read by the app through dotenv or wrangler.

### D6. Paste button

`navigator.clipboard.readText()` behind a user tap. The button is absent when the API is; a refusal shows *Tap and hold the box to paste.* The tunnel is `https` and `--local` is loopback, so both are secure contexts.

### D7. The chat side

[`secrets.md`](../../../wiki/development/secrets.md#receive-a-key-through-a-private-link) becomes: declare, write the guide from the service's public help pages (a plain read, never the agent's browser on a token page), `open --keys … --guide …`, send the link in the same reply, `wait` in the background. [The token-website steps](../../../wiki/development/secrets.md#api-token-website-steps) keep their rule and say the link and steps go on the page when a value comes back. The guide's link follows the existing rule: the direct token page from provider guidance, else the dashboard link with the path as a step; never an invented account address.

## Risks / Trade-offs

- [A wrong test address sends the key to the wrong host] → `https` only, no redirects followed, the host named on the page, and the agent already holds file access to the same key.
- [A wrong test blocks a good key] → only 401 and 403 hold a key back, and *Save anyway* writes it.
- [A link unopened for 30 minutes holds the one slot] → D3: any newer `open` takes it.
- [A link opened late has little time left] → the page shows the time left, and the agent offers a new link on `timeout`.
- [`\n` storage surprises a non-dotenv reader] → documented in `secrets.md`; JSON key files, the common case, need no escaping.
- [The guide is agent-written text on a page the person trusts] → plain text only, length caps, one `https` link per key shown with its host.
- [Clipboard read prompts differ per browser] → the button is optional; the box still takes a manual paste.

## Migration Plan

No migration. `open --keys` without `--guide` behaves as today apart from the 30-minute limit. Roll back by reverting the change.

## UX

### Use-case brief

A business owner, not a developer, on a phone, mid-task in the chat. The job: give the assistant one service's key so the task carries on. Done: the chat resumes by itself and names the key. They switch between this page and the service's site once, often through a sign-in with a code. Common case: one key, steps given, test given. Edge cases: several keys, no steps, a refused key, a key file, a slow sign-in that outlasts the link. Assumed frequency: a few times in the first week, then about once a month. It mirrors the password link's page, `passwords-page.html`.

### Flow

Tap the link in the chat → tap *Open …* → make and copy the key at the service → back to the page → *Paste* → *Save and continue* → *Works* → the chat carries on. A refused key branches to the same box with a message. A key file replaces *Paste* with *pick a file*.

### Hierarchy

*Save and continue* is the one filled button in every state. *Open …* is an outline button, as step 1. *Paste* is a small outline button beside the box. *Show*, *pick a file*, *Close without continuing*, *Save anyway*, and the time left are muted text. Steps are short lines, with no explanatory paragraph: the person asked for less text on screens.

### Review

[review.html](review.html). What Changes items 1, 3, and 4 sketch the page: before and after, the three test results, and the picked-file state.

### Components

The existing page's own styles and elements: `h1`, `.hint`, `.row`, `button.main`. New: an ordered list for the steps, an outline link-button, a file input, and a time line. No library.
