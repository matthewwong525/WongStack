# Design

## Context

See [proposal.md](proposal.md) for why. The two findings, by fingerprint, are in the security check's report (`browse.mjs:login:no-host-binding`, `preview-url.sh:pr-comment-preview-url/verify-runner.sh:access-headers-unbound`); their proposed fixes were checked against `main` at `823693df` and changed where noted.

- **Saved logins.** `login()` in `.agents/skills/browser/scripts/browse.mjs` picks the entry by name and calls `page.type()` with its username and password. `page.url()` reads the top frame's `location.href`. `hostOf()` in `logins.mjs` (lowercase, `www.` dropped, `''` for non-http) is used only to print `logins`. The host match lives only in `wiki/development/browsing.md` step 2.
- **The Access key.** `preview-url.sh` method 4 takes the newest PR comment naming `${SHA:0:7}`, from anyone, with any `http(s)` host matching `PREVIEW_RE`. `verify-staging.sh preflight` keeps any `http*` value; `run` loads `CF_ACCESS_CLIENT_ID`/`SECRET` from the primary `.env` and runs `verify-runner.sh`, which sends the pair as curl headers on every request line (a full-URL line included) and as `agent-browser set headers`, which agent-browser 0.38 applies to every host the page loads. `verify-journeys.mjs replay --url` runs the same runner with the full Access env for the main preview. `pictures` and `publish_private` already send the pair only to `production_origin` (the memory store's recorded Worker); setup always records it as `https://<worker>.<account>.workers.dev/_memory` (`provision.mjs:703`), and previews are `<alias>-<worker>-staging.<account>.workers.dev`.

## Goals / Non-Goals

**Goals:** bind each secret to its destination at the one place that sends it, and narrow the preview source, with one regression test per finding.

**Non-Goals:** a host check per embedded frame (the page reading carries no frame host); a public-suffix-aware subdomain rule; `publish` and `pictures`, already bound; the Artifacts and app delivery routes' preview lookups, which read the install's own Cloudflare or company app, not free text.

## Decisions

### 1. `login()` checks the host before each typed value

Add `sameSite(a, b)`: both non-empty, and equal or one ends with `.` plus the other. `login()` reads `hostOf(await page.url())` and compares it with `hostOf(entry.url)` before the username and again before the password; a mismatch returns `{ result: 'wrong-site' }` with nothing typed and nothing submitted, and the CLI prints `BROWSE_LOGIN=wrong-site`. An unknown name still returns `missing` first, so a name probe learns nothing new. The usage line and `browsing.md` add `wrong-site`, handled as *no match*.

- *Over the caller passing an expected host:* the saved entry already holds the host, and the agent's own reading is what can be misled.
- *Known gap:* a page could move in the instant between the check and the type; camofox has no origin-bound type. The second check shrinks the window to one call.

### 2. One own-site rule, in `own-site.mjs`

New `.agents/skills/verify/scripts/own-site.mjs` exports a pure `ownSite(address, origin)` → `{ own: true }` or `{ own: false, reason }`, and a CLI `node own-site.mjs <address>` that reads the origin through the memory skill's `store.mjs` (`loadConfig(repoContext(root)).worker`, as `production_origin` does), exits 0 for own, and 1 printing the reason.

The rule: no origin → not own. Not `https`, a user name or password, or a trailing-dot host → not own. An origin host `<worker>.<account>.workers.dev` makes every host ending `.<account>.workers.dev` own, since Cloudflare gives an account subdomain to one account. Any other origin host makes itself and its subdomains own.

- *Over checking in `verify-staging.sh run` and `verify-journeys.mjs` separately* (the report's sketch): two copies of a security rule drift. The runner is the only sender, so the guard sits there (decision 3) and both callers inherit it.

### 3. The runner withholds the pair off-site and scopes it on-site

In `verify-runner.sh`, before building `ACCESS_HEADERS`: when the pair is set, run `own-site.mjs "$URL_UNDER_TEST"` from the repo root (`git rev-parse --show-toplevel`, found the way the callers find it). On exit 1, unset the pair, write the reason to `$RUN_DIR/access-withheld`, and print `access key not sent: <reason>`.

On-site, the browser gets the pair through `agent-browser --session "$session" open "$URL_UNDER_TEST" --headers "$ACCESS_HEADERS"`, which agent-browser scopes to that URL's origin, replacing `open` then `set headers`. A curl line gets `CURL_ACCESS` only when its URL's origin equals `URL_UNDER_TEST`'s; a path line always resolves there.

- *Cost:* the scoped open loads the preview once before the batch's own first `open`. The batch still sees a fresh page.
- *Over a request filter of our own:* agent-browser already scopes `--headers`; a verification task confirms that a later same-origin navigation keeps it and a cross-origin script gets none.

### 4. `run` reports the withheld key; no heal off-site

After the runner, `verify-staging.sh run` prints `ACCESS=withheld` and the reason when `$RUN_DIR/access-withheld` exists. On exit 3 with the key withheld it prints `BLOCK=not-own-site` instead of `BLOCK=access-challenge`, so the skill's heal, keyed on `access-challenge`, never mints a token for a stranger's address. `.agents/skills/verify/SKILL.md` gains one clause on `BLOCK=not-own-site`: `UNKNOWN`, naming the address; offset its words for `measure-context.mjs --check`.

### 5. Preview discovery: bot comments, `https` only

Method 4 reads `gh pr view --json number`, then `gh api --paginate "repos/$REPO/issues/$PR/comments?per_page=100" --jq '.[] | "\(.user.type)\t\(.body | gsub("[\r\n]+"; " "))"'`, keeps lines starting `Bot<TAB>`, and reverses them in `awk` (macOS has no `tac`) so the newest comes first. The type filter stays in the shell, so the test's stub `gh` can return a person's line and a bot's line and exercise it.

Every method's regex takes `https://` only, and `emit` refuses an address not starting `https://`; `verify-staging.sh preflight` narrows `http*` to `https://*` to match.

- *Over also trusting repository members' comments:* deploy previews come from installed apps; a member who can push can already write a status. The sink guard covers any address that slips through.

### 6. Tests

- `scripts/tests/browse.test.mjs`, against the fake camofox: a login saved for `https://shop.example.com/login` on a tab at `https://shop.example.com.attacker.example/login` prints `BROWSE_LOGIN=wrong-site` and records no `type` call (the finding's regression); a tab whose address moves to another host after the username step gets the username but no password; `login.shop.example.com` still logs in.
- New `scripts/tests/own-site.test.mjs`: a table over `ownSite`, with the origin `https://app.acct.workers.dev`: own for the origin, `https://pr-1-app-staging.acct.workers.dev`; not own for `https://steal.evil-account.workers.dev`, `https://deploy-preview.attacker.example/`, `http://pr-1-app-staging.acct.workers.dev`, a URL with a user name, a trailing-dot host, and no origin. A custom-domain origin `https://app.example.com` owns `x.app.example.com`, not `example.com` or `evil-app.example.com`.
- `scripts/tests/verify-scripts.test.mjs`: the finding's regression: the fixture records a memory Worker, `run` walks a local recorder at `http://127.0.0.1:<port>`, the recorder sees no `CF-Access-*` header, stdout holds `ACCESS=withheld`, and an Access-challenge answer prints `BLOCK=not-own-site`. The existing header test moves to an own `https` preview with recording `curl` and `agent-browser` stubs: the stub sees the pair on `open <url> --headers`, no `set headers` call, and a full-URL request line to another host goes without it.
- `scripts/tests/verify-journeys.test.mjs`: rework *a named site is sent no Access credential; the preview still is* so the preview's positive case uses an own `https` address through the stubs; count `open --headers`, not `set`.
- `scripts/tests/preview-url.test.mjs`: the stub `gh` answers `pr view --json number` and the comments `api` call with `Bot\t…` and `User\t…` lines. New: a bot comment with a `workers.dev` preview, then a newer person's comment naming the head SHA with `https://deploy-preview.attacker.example/`, reports the bot's; an `http://preview.localhost:18080/` comment reports none. Existing cases keep passing as bot comments.

## Risks / Trade-offs

- [An install whose recorded live address is missing or moved to a custom domain while previews stay on `workers.dev`] → its walks go without the key and an Access wall reports `BLOCK=not-own-site` by name; the changelog says re-running setup records it.
- [A preview provider that comments through a person's account] → its comments are ignored; its deployment, status, or check-run still counts. Named in the changelog.
- [agent-browser changes `--headers` scoping] → the stub test pins the runner's command, and the verification task checks real behaviour; the agent-browser update path re-runs it.
- [Workspace "Improve web browsing speed" also edits `login()` (hide-typed-secrets)] → both edits are small; whichever lands second keeps both the host checks and the secret mark.

## Migration Plan

A `patch` release: no data or setting changes, nothing to do in an install. Rollback is a revert.
