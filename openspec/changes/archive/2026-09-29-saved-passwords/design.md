# Design

## Context

See proposal.md for the why. Today `hand-over.mjs` owns the private link: a loopback server, a random 32-byte key in the URL fragment, a Cloudflare quick tunnel, a detached watcher, one link at a time through `~/.wong-stack/hand-over/`, and a 10-minute deadline. `browser-logins` forbids storing a password.

agent-browser 0.38.1 ships an auth vault (checked 2026-09-29 in a throwaway `HOME`):

- `auth save <name> --url <u> --username <u> --password-stdin` writes `~/.agent-browser/auth/<name>.json`, encrypted. The key is `~/.agent-browser/.encryption-key` beside it, and the password never appears in the file in clear.
- `auth list --json` returns `{name, url, username}` per login and never a password. Saving an existing name overwrites it.
- Names must match `^[a-zA-Z0-9_-]+$`, so `netflix.com` is refused and `netflix-com` works.
- `auth login <name> [--no-navigate] [--url <u>]` fills the login form and submits. `--url` sets the origin that the page must match.

## Goals / Non-Goals

**Goals:**
- One link lifecycle for hand-over and passwords: the same key, tunnel, lock, deadline, and ready question.
- A password travels once, from the person's device to `auth save`'s stdin. It never lands in argv, env, a log, `result.json`, or the agent's output.

**Non-Goals:**
- Reading 1Password `.1pux`, Bitwarden JSON, or encrypted exports.
- Matching saved logins across a site's sister domains beyond the rule below.

## Decisions

### A `--passwords` mode on `hand-over.mjs`, with the new parts in their own files

`hand-over.mjs open --passwords` reuses `open`, `watch`, `wait`, and `close` whole. In this mode it skips `prepareBrowser` and the live feed. It serves `passwords-page.html` and `passwords-page.mjs` in place of the hand-over page, and it mounts the routes from `passwords.mjs`. It has no `--until` finish: the link ends on `POST /done`, `close`, or the deadline.

- **Alternative:** a separate `passwords.mjs` CLI importing the tunnel and lock helpers. It would need most of `hand-over.mjs` exported, and a second lock to keep a hand-over and a password link from running at once. Rejected.
- **Cost:** a textual overlap with the `phone-sized-hand-over` plan's edits to the same file. Whichever lands second rebases.

### The device reads the export; only ticked logins travel

`passwords-page.mjs` reads the chosen file with `FileReader` and parses it with a pure, exported `parseExport(text)`:

- The parser follows RFC 4180: quoted fields, doubled quotes, newlines inside quotes, and a leading BOM.
- It finds columns by lowercased header aliases:
  - site: `url`, `login_uri`, `website`, `web site`
  - username: `username`, `login_username`, `login`, `email`, `user name`
  - password: `password`, `login_password`
  - label: `name`, `title`
- It adds `https://` to a bare site, such as `netflix.com`.
- It skips a row with no username or password, a line break in the username, or a field over 1,024 characters, since the server would refuse it. It also skips a row whose URL isn't `http(s)`, such as an Android `android://` entry, and a repeat of the same host and username.
- A file with no site or password column returns `null`, and the page shows the "export as CSV" message.

The list shows each login as host plus username, sorted by host, with none ticked, and a search box filters it. *Save* posts only the ticked logins. The file is never uploaded, so the server has nothing to delete.

### `POST /save` and `POST /done`

Both need the `x-hand-over-key` header, as the field routes do.

`/save` takes `{logins: [{url, username, password}]}`:
- It accepts up to 500 logins, a 256 KB body, and 1,024 characters per field. It gets its own body limit, because `BODY_LIMIT` is 4 KB.
- It rejects a non-`http(s)` URL, and it refuses a CR or LF in the username.

For each login, it reads the current `auth list --json` once and chooses a name:
- The same host and username as an existing login reuses that name, so a new password replaces the old.
- Otherwise the name is `slug(host)`: the host lowercased, `www.` stripped, and each run of other characters turned into `-`. A second account on the same host gets `-2`, then `-3`, and so on.

It then runs `execFile('agent-browser', ['auth', 'save', name, '--url', url, '--username', username, '--password-stdin'])` and writes the password to stdin. It never builds a shell string. It replies `{saved: [{name, host}], failed: [index]}`, where `failed` lists the positions in the request's `logins` that didn't save. The page shows the saved hosts and keeps the failed ones ticked.

It adds each saved name to the watcher's in-memory list. `/done` finishes the watcher with `done`. `teardown` writes `{result, saved: [names]}` to `result.json`, and `wait` prints `HANDOVER_SAVED=<name>,<name>` after `HANDOVER_RESULT`.

### Logging in with a saved login

`browsing.md` gains the steps. When a task meets a login form:
1. The agent reads `agent-browser auth list --json` and matches the page's host against each login's URL host. The two hosts match when they're equal, or when one ends with `.` plus the other's registrable part after stripping `www.`. So `login.netflix.com` matches `netflix.com`.
2. With one match, it runs `auth login <name> --no-navigate --url <page origin>`. It then checks the address left the login page. It never passes a password.
3. With two matches, it asks in the chat which account to use. With none, or a failure, or a code page, it runs the hand-over as today.

This is agent guidance, not a script, because each site's login differs and the fallback is the hand-over the agent already runs.

## UX

### Use-case brief

The owner, or a teammate, not technical, gives the agent the logins it needs, once, often from a phone. They're done when the page names the saved sites and the chat confirms them.

- **Common case:** add one or two logins from a phone, filled from saved passwords.
- **Edge case:** a 200-row export from a laptop, of which they tick five.
- **Frequency:** once at setup, then rarely, when a password changes.

It mirrors the hand-over page: same private link, same look, and no live view.

### Flow

1. The person asks. The agent asks *Ready, send the link / Not now*, then sends the link.
2. The start screen offers *Upload a password export* or *Add one login*.
3. **Export:** they pick a file, tick sites, and tap *Save N logins*. The saved screen follows.
4. **Add one:** they fill the form and tap *Save*. The saved screen follows.
5. On the saved screen, *Done* closes the link and *Add another* returns to the start screen. The agent names the saved sites in the chat.

An unreadable file shows its message on the start screen. A failed save names the sites that failed and keeps them ticked.

### Hierarchy

- **Start screen:** two equal choices, with the bank-and-email note under them.
- **Tick list:** *Save N logins*. The search box is secondary.
- **Add one:** *Save*.
- **Saved screen:** *Done*. *Add another* is secondary.

### Review

[review.html](review.html). What Changes items 1 to 4 sketch the start screen, the tick list with its error line, the add-one form, and the saved screen. Item 5 draws the login flow.

### Components

The hand-over page's plain HTML and CSS, reused as-is: its header, buttons, and field boxes. New pieces:
- A file input with `accept=".csv,text/csv"`.
- A filtered checkbox list.
- The add-one form, with `autocomplete="url"`, `"username"`, and `"current-password"`, so managers offer their fill.

## Risks / Trade-offs

- **Anyone with the computer can read the logins.** The vault's key sits beside it, so anyone with the person's account on that computer, the agent included, can decrypt the vault. → The page, the wiki, and the changelog say so plainly, and advise keeping bank and email out. The agent's rules forbid reading `~/.agent-browser/auth/`.
- **Password managers won't autofill by site.** The page's address is a tunnel domain, so no manager autofills by site. → The form says to pick the site's login from the manager's list. Typing still works.
- **Some logins may defeat `auth login`.** A two-step login, with the username on one page and the password on the next, or an unusual form, may not work. → It falls back to the hand-over. A memory thread checks the first real saved login.
- **The username shows up in the process list.** It's in `auth save`'s argv, so the machine's process list shows it for a moment. → That's acceptable, since a username isn't a secret. The password goes only through stdin.

## Open Questions

- Does `auth login` handle a two-step login? Only the fallback depends on it; the first real use answers it.
