## 1. Browser source

- [x] 1.1 In `browse.mjs`, add `look.json` to `FILES`, a `readLook()` returning `local` or `us`, and the `look [us|local]` command with its usage line; saving writes mode 0600 and prints `BROWSE_LOOK=` and, with a live server, `BROWSE_LOOK_APPLIES=next-start`
- [x] 1.2 Make `serverEnv` take the look: `us` adds `CAMOFOX_LOCALE=en-US`, `CAMOFOX_TIMEZONE=America/New_York`, `BROWSE_LOOK=us`; `local` removes all three; record `proxy` and `look` in `server.json`
- [x] 1.3 In `server.mjs`, start no forwarder when `BROWSE_LOOK=us` and strip every `PROXY_*` variable; keep today's path and its no-fallback failure otherwise
- [x] 1.4 Show the saved look and the running server's look in `status`

## 2. Tests

- [x] 2.1 `serverEnv` unit tests: `us` sets both variables, `local` clears stray shell values; update the existing exact-env test
- [x] 2.2 Fixture tests: `look us` while a server runs leaves its pages and prints `next-start`; a start after it records `proxy: 'none'` and the fake camofox gets both variables and no `PROXY_*`; `look local` restores the forwarder; a bad value is a usage error and the file is 0600

## 3. Docs

- [x] 3.1 `wiki/development/browsing.md`: a short *Look American* section beside the proxy paragraph (what it changes, what it doesn't, restart only when asked, `look local` to undo); link it from the refusal section
- [x] 3.2 `.agents/skills/browser/SKILL.md` and the `browse.mjs` usage text name the `look` command
- [x] 3.3 `CHANGELOG.md`: a `## Next (minor) — The browser can look American` entry

## 4. US by default

- [x] 4.1 Make a missing or unreadable `look.json` read as `us` in `readLook()`, `status`, and the start; only a saved `local` keeps the forwarder; a server recorded before this change still reads as `local`
- [x] 4.2 Update the tests: a fresh fixture start has the two US variables and no forwarder; tests that rely on the forwarder save `look local` first
- [x] 4.3 Reword the wiki *Look American* section, `SKILL.md`, the usage text, and the changelog entry for US by default, with `look local` to opt out

## 5. Verification

- [x] 5.1 Run the browser and payload checks locally as a pre-check
- [ ] 5.2 With Matthew's yes to restart, restart the personal browser, and confirm in a real page that `navigator.language` is `en-US` and the time zone is `America/New_York`; then open GoDaddy's sign-in and report its language
- [ ] 5.3 `/save` and pass CI
