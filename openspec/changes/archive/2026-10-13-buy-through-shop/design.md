# Design

## Context

See proposal.md for the why. What shapes the approach:

- Shop publishes one entry page, <https://shop.com/skill.md>, with three bindings: an npm command (`@shopify/shop`, bin `shop`), an MCP endpoint (`https://mcp.shop.com/`), and raw HTTP. All three reach the same tools: `search_catalog`, `get_product`, `create_cart`, `create_checkout`, `complete_checkout`, `get_account`, `search_orders`, and the spend-request set.
- Read on 2026-10-13: `@shopify/shop` 1.1.0, MIT, published by Shopify, no dependencies, about 2 MB. Its logic is `lib/shop.wasm` (1.9 MB), which can't be read. Engines: Node `>=22.21.0 <23 || >=24.5.0 <25`. Tarball integrity `sha512-tWFsBAWQFWLUdvRiuYzFCrF9leAaIyoHRuZRMbUMH451dw6la1/SkoBFMAMWvjYtIxxbubXFSetVUn1+qRfYUA==`.
- Run on 2026-10-13 from an unpacked copy with a throwaway home: `shop --help`, `shop tools`, `shop checkout complete --schema`, and one anonymous `shop search`, which returned real products.
- `complete_checkout`'s schema gives each `payment.instruments[]` entry a `credential` object, *shape defined by the handler*, and Shop's guide says to pass an instrument by file or stdin when it holds a credential. So a checkout read can put a payment secret in tool output.
- The command stores its sign-in at `~/.config/shop-node-wasm/credentials.json`, mode 0600; `SHOP_AUTH_FILE` moves it.
- Every request's `User-Agent` names the command's version, Node's version, the OS, and the agent harness it detects (seen: `claude_code/2.1.287 (sdk-cli)`).
- WongStack's precedents: camofox and noVNC install on first use into `~/.wong-stack/`, pinned, after one ask ([required tools](../../../wiki/development/required-tools.md)); `agent-browser`'s guide is read from the tool, not vendored; the `browser` skill is hidden and the wiki owns the how; browsing state is per computer.

## Goals / Non-Goals

**Goals:**

- One script between the agent and Shop's command, so the install, the allowed commands, and the pay step are decided by code, not by prose.
- No payment credential, sign-in token, or card number in anything the agent reads.
- Works with any agent that can run a script: no host plug-in, no MCP setup.

**Non-Goals:**

- Spend requests (an issued card for a website's own card form).
- A WongStack copy of Shop's guide, schemas, or tool list.
- Guarding against an agent that deliberately calls the installed command directly. The script stops mistakes; the wiki rule carries the reason.

## Decisions

### The CLI binding, wrapped by `shop.mjs`

`.agents/skills/shop/scripts/shop.mjs` is the only way the agent runs Shop. It takes `isMain` and `parseCli` from `memory/scripts/lib/cli.mjs`.

- *Over MCP:* MCP setup differs per host and some hosts have none; WongStack names no host as a requirement.
- *Over raw HTTP:* Shop's HTTP sign-in needs a private JSON reader and token file handling we would own and keep in step with Shop. The command already does it.
- *Over the bare command:* nothing would pin the version, hide an instrument's credential, or refuse a spend request.

### Install: pinned, fingerprinted, no npm

`shop.mjs install` downloads `https://registry.npmjs.org/@shopify/shop/-/shop-<version>.tgz` with Node's `fetch`, compares its SHA-512 with the integrity recorded beside the version in one constant, and only then unpacks it with the system `tar` into `~/.wong-stack/shop/<version>/`. A mismatch installs nothing and prints `SHOP_ERROR=`. The package has no dependencies, so no `npm install` and no install scripts run.

- Any other command without an install prints `SHOP_NEEDS=install` and exits 3, as `browse.mjs` does.
- A Node outside the command's engines prints `SHOP_NEEDS=node` with the range. The agent says so and falls back; it does not install Node.
- The script runs the command as `node <install>/package/bin/shop.mjs …`, never through PATH, so a global `shop` of another version is never used.
- `update-dependencies` surveys the pin as it does camofox's: read, never moved automatically. A new pin is a release, made after the verification below is rerun.

### An allow-list of commands

| Through | Refused, with a one-line `SHOP_REFUSED=` reason |
|---|---|
| `search`, `catalog lookup`, `catalog get` | `spend-request *`: hands the agent a card number |
| `cart create/get/update` | `checkout complete`, `call`: `pay` is the one pay step |
| `checkout create/get`, `checkout update --patch` | `checkout update --arguments`: a full document would carry masked instruments back |
| `account`, `account login`, `account logout` | `skill --install`: writes a copy of Shop's guide into agent folders |
| `order search` | `--verbose`, `--as curl`: may print the sign-in header (not verified; refused until it is) |
| `guide [references/<name>.md]` → `shop skill …` | |
| `--schema`, `--help`, `--dry-run`, `--format` on the above | |

`tools` passes through. An unknown subcommand is refused, so a command a later version adds stays off until someone reads it.

### Instruments are masked; `pay` sends the chosen one

Every JSON result is walked. Each `payment.instruments[]` entry is replaced with `{ n, id, type, display, selected }` (an allow-list of fields, `n` counting from 1), and the full entries are written to `~/.wong-stack/shop/checkouts/<sha256(shop + checkout id)>.json`, mode 0600, replacing any earlier file for that checkout. Markdown output (`--format md`) is refused on checkout commands, since it can't be walked.

`shop.mjs pay <checkout-id> --shop <seller.domain> --instrument <n> --total <minor units> --currency <code>`:

1. Reads the checkout once (`checkout get`), refreshes the kept instruments, and requires status `ready_for_complete` and a total and currency equal to the ones given. A mismatch prints `SHOP_PAY=changed` with the new total and sends nothing: the agent asks again.
2. Pipes the kept entry `n` to `checkout complete <id> --shop <domain> --instrument -` on stdin, once. Nothing secret is in argv.
3. Prints `SHOP_PAY=completed` with the order's id and link only when the result is `completed` with an `order`. A transport error, timeout, or any other state triggers one `checkout get`; `completed` there counts, anything else prints `SHOP_PAY=unknown` or `SHOP_PAY=not-completed` with the `continue_url`. It never completes twice.
4. Deletes the kept file on `completed`. Files older than a day are deleted at any run.

The `--total` argument is what binds the person's yes to the charge: the agent passes the total it showed, and the script refuses when the store's total has moved.

- *Alternative: trust the instrument to be non-secret.* Rejected: the schema leaves the credential's shape to the payment handler, and no live entry has been seen.

### Sign-in: one file per computer, under WongStack's folder

The script sets `SHOP_AUTH_FILE=~/.wong-stack/shop/credentials.json` on POSIX, so every repo on the computer shares one sign-in and removing the folder removes everything. On Windows it leaves the command's default store, since the command validates Windows paths its own way. `account login --wait 0 --device-name "WongStack"` returns the link and the public code; the agent sends both, then reruns with `--wait 90` until `signed_in: true`. `account logout` disconnects this computer.

- *Alternative: the command's default path.* Rejected: a person who also uses `shop` by hand would share its sign-in with the assistant without having said yes to that.

### The wiki page owns the rules; the skill is hidden

`.agents/skills/shop/SKILL.md` mirrors `browser`'s: `hidden: true`, `disable-model-invocation: true`, a few lines naming the script's commands and linking the page. It is counted as on-call, not instruction text.

`wiki/development/shopping.md` owns when and how:

- **Shop first for a product request**, the browser for a store Shop can't pay at.
- **Read Shop's guide from the command** (`shop.mjs guide`) before the first call of a task, and its `transactions.md` before a checkout. Where the guide and this page differ, this page wins: no spend request, connect only on a yes, pay only through `pay`.
- **Connect on a yes**, asked [the shared way](../../../.agents/skills/explore/references/asking-the-user.md) the first time a task needs the account. A no is remembered through memory.
- **The pay question**, asked the shared way: store, items with options and quantities, total with currency, delivery address, card by brand and last digits. `Pay $84.00 with Visa ··4242 (Recommended) / Send me the checkout link / Not now`.
- **Always give the store's checkout link** with a cart or checkout, so the person can pay themselves.
- **`requires_escalation`, `SHOP_PAY=unknown`, or `not-completed`** end with the checkout link, never a second try and never the browser.
- **What Shop learns**: searches, carts, the delivery country, the computer's OS and Node version, and the assistant's name.
- **Where things are kept, and how to remove them**: the folder, the sign-in file, the Shop account's connection list.

The always-loaded `WONG-STACK` block gains one link on the existing browsing rule, `[buying](wiki/development/shopping.md)`. Start-up words stand at 1,971 of 2,200.

`wiki/development/browsing.md` is not edited: it stands at 2,996 of 3,000 words. `shopping.md` links to it for the fallback.

### Tests use a stand-in command

`scripts/tests/shop.test.mjs` points the script at a fake `shop` (a Node file that records argv and stdin and replays canned JSON) through a test-only install root. It covers: needs-install, a fingerprint mismatch installing nothing, each refusal, masking with no credential in stdout or stderr, `pay` sending exactly one completion with the entry on stdin, `changed` on a moved total, `unknown` after a transport error with no second completion, and the kept file's mode and removal.

## Risks / Trade-offs

- [The command's core is a sealed file] → one pinned version, a recorded fingerprint, no dependencies, published by Shopify. The pin moves only by a release.
- [Shop changes its service and the pinned command stops working] → the agent falls back to the checkout link or the browser, and `update-dependencies` shows a newer version to try.
- [A live instrument has useful non-secret fields outside the allow-list] → the verification purchase records the entry's field names (never values); widen the allow-list in the same change if the card can't be named.
- [The agent runs the installed command directly, past the script] → not prevented. The wiki rule gives the reason, and the refusals name the script as the one route.
- [A yes given for one total is used for another] → `pay` takes the confirmed total and refuses a different one.
- [The harness name in `User-Agent` conflicts with naming no host] → it is Shop's command reporting, not WongStack requiring a host; the wiki page says what Shop learns. The build checks whether the command has a setting to drop it.
- [Windows: sign-in path and `tar`] → Windows 10 and later ship `tar`; the sign-in stays at the command's default there. Not tried on Windows; the page says so.

## Open Questions

- Whether `--verbose` and `--as curl` print the sign-in header. They stay refused until someone checks with a signed-in account.
