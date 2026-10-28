## 1. Browser script

- [x] 1.1 Add `mainDomain` and the `--main-domain` flag to `login` and `USAGE` in `.agents/skills/browser/scripts/browse.mjs` (design §1–2). Write tests in `scripts/tests/browse.test.mjs`: `mainDomain` keeps `janeapp.com`, `bbc.co.uk` and an IP; a sibling subdomain says `wrong-site` without the flag and `accepted` with it; another main domain says `wrong-site` with the flag.

## 2. Docs

- [x] 2.1 Add the one-try line to `wiki/development/browsing.md#saved-browser-logins`.
- [x] 2.2 Add a `## Next (minor)` entry to `CHANGELOG.md`; leave `VERSION` alone.

## 3. Verification

- [x] 3.1 Run `node --test scripts/tests/browse.test.mjs`, `node .github/scripts/checks.mjs --worktree`, and `openspec validate browser-main-domain-login --strict --no-interactive`.
