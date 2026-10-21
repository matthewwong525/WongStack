# Tasks

## 1. Saved logins only on their site

- [x] 1.1 In `.agents/skills/browser/scripts/browse.mjs`, add `sameSite(a, b)` and make `login()` compare `hostOf(await page.url())` with `hostOf(entry.url)` before the username type and again before the password type, returning `{ result: 'wrong-site' }` with nothing typed or submitted; add `wrong-site` to the usage line. Verify with tests in `scripts/tests/browse.test.mjs` against the fake camofox: a login saved for `https://shop.example.com/login` on a tab at `https://shop.example.com.attacker.example/login` prints `BROWSE_LOGIN=wrong-site` and records no `type` call; a tab moved to another host after the username step records the username's `type` and no password `type`; `https://login.shop.example.com/` still prints `accepted`.
- [x] 1.2 `wiki/development/browsing.md` step 2: the script checks the host itself, and `wrong-site` means nothing was typed, handled as *No match*. Verify with `node scripts/check-payload-links.mjs`.

## 2. The Access key only to the install's own site

- [x] 2.1 Add `.agents/skills/verify/scripts/own-site.mjs`: pure exported `ownSite(address, origin)` and the CLI `node own-site.mjs <address>` reading the origin through `store.mjs`, by design decision 2. Verify with a new `scripts/tests/own-site.test.mjs` covering every case in design decision 6.
- [x] 2.2 In `.agents/skills/verify/scripts/verify-runner.sh`, withhold the pair off-site (unset, write `$RUN_DIR/access-withheld`, print the reason), give the browser the pair with `open "$URL_UNDER_TEST" --headers` instead of `set headers`, and add curl Access headers only for a request on `URL_UNDER_TEST`'s origin. Verify with `scripts/tests/verify-scripts.test.mjs`: the finding's regression (recorder at `http://127.0.0.1:<port>` sees no `CF-Access-*` header, stdout says the key was not sent) and the reworked header test (an own `https` preview through recording `curl`/`agent-browser` stubs gets the pair on `open --headers`, no `set headers`, and a full-URL line to another host goes without it).
- [x] 2.3 In `.agents/skills/verify/scripts/verify-staging.sh` `run`, print `ACCESS=withheld` with the reason when the runner withheld it, and `BLOCK=not-own-site` instead of `BLOCK=access-challenge` on exit 3 with the key withheld; narrow preflight's `http*` URL filter to `https://*`. Verify with a `verify-scripts.test.mjs` case: an Access-challenge answer from an off-site address prints `BLOCK=not-own-site` and no `BLOCK=access-challenge`.
- [x] 2.4 Rework `scripts/tests/verify-journeys.test.mjs` *a named site is sent no Access credential; the preview still is* so the preview's positive case uses an own `https` address through the stubs and counts `open --headers`, not `set`; fix any other replay test that expected the pair on a loopback address. Verify with `node --test scripts/tests/verify-journeys.test.mjs`.
- [x] 2.5 `.agents/skills/verify/SKILL.md`: one clause that `BLOCK=not-own-site` gets no mint and reports `UNKNOWN` naming the address; `wiki/development/staging-walkthrough.md`: the key goes only to the install's own `https` site and its origin. Verify with `node scripts/measure-context.mjs --check` (offset the added words) and `node scripts/check-payload-links.mjs`.

## 3. Preview discovery from deploy apps only

- [x] 3.1 In `.agents/skills/save/scripts/preview-url.sh`, read method 4 from the issue-comments API with each comment's `user.type`, keep `Bot` lines, newest first without `tac`, and take only `https://` addresses in every method and in `emit`, by design decision 5; update the header comment. Verify with `scripts/tests/preview-url.test.mjs`, its stub `gh` answering `pr view --json number` and the comments call with `Bot\t…`/`User\t…` lines: the finding's regression (a bot's `workers.dev` comment, then a newer person's comment naming the head SHA with `https://deploy-preview.attacker.example/`, reports the bot's), an `http://preview.localhost:18080/` comment reports none, and the existing cases pass as bot comments.

## 4. Release

- [x] 4.1 Add a `## Next (patch) — Keys and passwords go only to their own site` entry at the top of `CHANGELOG.md`'s entries, in plain words, with an **Updating.** note: nothing to do; a preview announced only by a person's comment, or an install with no recorded live address, now walks without the key. Verify it sits above the newest numbered entry.

## 5. Verification

- [x] 5.1 With the real agent-browser (0.38.1), serve two local origins: a page on the first that loads a script from the second, then navigates within the first. Run the runner's `open <url> --headers` and a batch `open` of a second page on the first origin; confirm with each server's log that both first-origin requests carry the headers and the second origin's request does not.
- [x] 5.2 Run `node --test scripts/tests/browse.test.mjs scripts/tests/own-site.test.mjs scripts/tests/verify-scripts.test.mjs scripts/tests/verify-journeys.test.mjs scripts/tests/preview-url.test.mjs`, `node .github/scripts/checks.mjs --worktree`, and `openspec validate send-secrets-only-to-their-site --strict --no-interactive`, then `/save` for CI.
- [x] 5.3 After `/save`, run `/verify` on this branch's own preview with one request probe, and confirm the walk sent the key (no `ACCESS=withheld`) and reached the page past Access.
