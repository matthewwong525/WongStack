<!-- openspec-archive v1 2026-10-13-buy-through-shop -->
<!-- file proposal.md utf8 10142 -->
# Buy through Shop

**Status:** ready-to-ship
**Branch:** shopping-payments
**Open questions:** none

## Why

Buying something today means the assistant drives a store's website: it is slow, some stores turn its browser away, and you type your card into a private form for every order. Shop, from Shopify, now gives assistants a direct way to search millions of stores and pay with a card you already saved there, so no card is typed at all.

## What Changes

- **Ask the assistant to find or buy something, and it searches Shop first.** It shows a few options with the seller, the price, and a link to each product, and says why each fits. No account is needed to search, compare, or fill a cart.
- **You connect your Shop account once, only if you say yes.** The assistant asks first, then sends a link and a short code; you check the code and approve in Shop. After that it can read your saved addresses and orders and pay with a card you saved in Shop. Say no and it keeps shopping without an account, and does not ask again in that task.
- **It pays only after your yes, once.** The question names the store, the items, the total, the delivery address, and the card by brand and last digits. If the total changes after your yes, it asks again. A payment can't be undone from here: a refund is between you and the store.
  ```text
  you            assistant         Shop
   │─ "buy it" ────▶│
   │                │─ checkout ───▶│
   │                │◀─ Visa ··4242 │
   │◀─ Pay $84? ────│
   │─ yes ─────────▶│
   │                │─ pay once ───▶│
   │◀─ order #1042 ─│◀─ order ──────│
  ```
- **Your card stays in Shop; the assistant never sees a card number.** Shop sends back a payment detail for each saved card. A small program keeps that in a private file and shows the assistant only the brand and last digits. The sign-in sits in a private file in your home folder that only your user can read.
- **An unsure payment is never tried twice.** If the answer does not come back, the assistant looks the order up. If it still can't tell, it says so and gives you the store's checkout link.
- **Every other store works as today.** A store Shop can't pay at, or a checkout that needs you, falls back to what exists now.
  ```text
  store            │ how it pays
  ─────────────────┼──────────────────
  Shopify, Shop    │ +saved card,
  connected        │  after your yes
  Shopify, not     │ +checkout link,
  connected        │  you pay
  any other site   │ browser and
                   │ private form
  ```
- **The first shopping request asks before a small download.** Shop's command is about 2 MB and goes into your home folder, in the one version WongStack has tried. A download that does not match that version installs nothing. Setup never offers it.
- **One sign-in serves every repo on the computer**, as saved website logins do. To disconnect, ask the assistant, or remove the connection in your Shop account.
- **What was checked.** On 2026-10-13 a search without an account returned real products. Connecting and paying have not been tried with a real account: they were tested against a stand-in, and the owner chose to publish before a real purchase. The Shopping page says so.

Non-goals: paying on websites outside Shopify with a card Shop issues to the assistant (it would put a card number in front of the assistant); returns and cancelling an order, which Shop's command does not do; a sign-in per repo; connecting through a chat app's own plug-in list.

## Capabilities

### New Capabilities

- `shopping`: finding, comparing, and buying products through Shop: no account needed to look, a connection only on a yes, one payment per confirmed purchase, no payment secret in the agent's view, and the fallback for stores Shop can't pay at.

### Modified Capabilities

- `dependencies`: Shop's command joins the tools a machine may need, installed on first use in one tried version whose download is checked.

## Impact

- New `.agents/skills/shop/`: a hidden `SKILL.md` and `scripts/shop.mjs`, which installs the pinned `@shopify/shop` command, passes allowed commands through, hides payment details from its output, and owns the one pay step. New `scripts/tests/shop.test.mjs` with a stand-in command.
- New `wiki/development/shopping.md`, linked from `wiki/development/README.md`; `wiki/development/required-tools.md` gains the tool and its install section; the `WONG-STACK` block in `AGENTS.md` links the new page from the browsing rule.
- `.agents/skills/wong-sync/references/payload-files.json` and the payload manifest list the skill; `.agents/skills/memory/references/areas.json` gains a `shopping` area; `.agents/skills/wong-setup/references/tools.md` says setup never offers the command; `.agents/skills/update-dependencies/scripts/update.mjs` surveys the pin.
- New dependency on a machine, not in the repo: `@shopify/shop` 1.1.0 in `~/.wong-stack/shop/`. It needs Node 22.21 or newer in the 22 line, or 24.5 or newer in the 24 line.
- Requests go to `mcp.shop.com` and `accounts.shop.app`. No change to the app, the private form, or camofox.
- `CHANGELOG.md` *Next (minor)* entry.

## Decision log

- **2026-10-13** — Asked how far the first version should go → chose pay at Shopify stores: find, compare, and pay with a card saved in Shop after a yes; other websites keep the browser and the private form.
- **2026-10-13** — Asked where the Shop sign-in should live → chose one per computer, shared by every repo, as saved website logins are.
- **2026-10-13** — Asked what should happen next → chose plan it.
- **2026-10-13** — Assumed: Shop's own guide is read from its command each time and no copy ships, because a copy goes stale; the browser tool's guide is read the same way.
- **2026-10-13** — Assumed: the command is installed in one pinned version and only when its download matches a recorded fingerprint, because its main part is a sealed file nobody here can read and it handles payments.
- **2026-10-13** — Assumed: a small program hides what Shop returns for each saved card and sends the chosen one itself, because Shop's own input description says that entry can carry a payment credential, and the choice made was that the assistant never sees one.
- **2026-10-13** — Assumed: the program refuses Shop's request for an issued card, because that hands the assistant a card number, which the chosen reach leaves out.
- **2026-10-13** — Assumed: the assistant offers to connect only when a task needs the account (paying, saved addresses, orders), not at the first search, because looking needs no account and an early ask adds a step.
- **2026-10-13** — Assumed: setup never offers the command and the first shopping request asks, because most installs never shop; camofox is offered the same way.
- **2026-10-13** — Assumed: the new page is its own wiki page, because the browsing page is four words under its 3,000-word limit.
- **2026-10-13** — Assumed: the build's real purchase waits for the owner's yes and his choice of item, because it spends his money; if he declines, connecting and paying stay recorded as untried.
- **2026-10-13** — Build: every list of saved cards is hidden, not only a checkout's, because Shop's own description of the account read lists the saved cards with a credential each, under another name. A credential found anywhere else in an answer is written over, and an answer that is not JSON is not shown for a checkout or the account.
- **2026-10-13** — Build: the program also refuses the flag that sends a request to another address, and starts Shop's command with every Shop setting cleared but the sign-in's place, because either could send the sign-in elsewhere. The text format is refused on the account read too.
- **2026-10-13** — Build: the pay step sends the card whose id matches the one last shown under that number, because Shop may list the cards in another order between the question and the payment. It also notes that a payment was sent, so a later pay for the same checkout only reads and reports; without the note a second run could pay twice.
- **2026-10-13** — Build: "not completed" is said only when Shop answered the payment and the checkout shows an unpaid state; a payment still in progress, or no answer, is "unknown".
- **2026-10-13** — Build: Shop's search also passes under its other name, `catalog search`, because Shop's guide uses both for the same search. A refusal exits with the usage code.
- **2026-10-13** — Build: the wiki page is listed in the files an install receives, beside the skill folder, because the always-loaded rule links it.
- **2026-10-13** — Build: the plan's test steps inside each part ran once at the end, after all code and tests were written, by the build helper's rule.
- **2026-10-13** — Build: each token in the sign-in file is written over in whatever Shop's command prints, because a request plan (`--dry-run`) lists request headers and nobody has checked it with a signed-in account.
- **2026-10-13** — Checked on this computer: the command installs from the registry in the tried version, an anonymous search returns real products, the guide prints, and each refusal refuses. The command has no setting that leaves the assistant's name out of its requests, so nothing is set and the wiki page says what Shop learns.
- **2026-10-13** — Asked whether to connect Shop and buy one small item before this goes live → chose publish without it. Connecting and paying are listed as untried on the Shopping page and in the release note.
- **2026-10-13** — Archive checkpoint: built, tried on this computer up to signing in (install, a search without an account, each refusal), main merged in, numbered 40.9.0. Connecting and paying remain untried with a real account.
- **2026-10-13** — Archive checkpoint: another release (40.8.1) went out first, so main was merged in again; this release keeps 40.9.0. Nothing else changed.

<!-- end proposal.md -->
<!-- file design.md utf8 11235 -->
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

<!-- end design.md -->
<!-- file tasks.md utf8 5043 -->
# Tasks

## 1. The Shop script (`.agents/skills/shop/`)

- [x] 1.1 Write `scripts/shop.mjs` with `install` by the design (version and integrity in one constant, `fetch`, SHA-512 check before unpacking, `~/.wong-stack/shop/<version>/`, `SHOP_NEEDS=install` exit 3, `SHOP_NEEDS=node` outside the engines, the command run by path, never PATH); verify `scripts/tests/shop.test.mjs` covers needs-install, a mismatch that installs nothing, and the Node range, against a stand-in tarball.
- [x] 1.2 Add the allow-list pass-through, `guide`, and each refusal with its `SHOP_REFUSED=` line, and set `SHOP_AUTH_FILE` on POSIX; verify the tests cover every allowed and refused row of the design's table, an unknown subcommand, and the sign-in path, against a stand-in command that records argv, env, and stdin.
- [x] 1.3 Add instrument masking on every JSON result and the kept file (0600, replaced per checkout, removed after a day); verify by test that a canned credential appears in no stdout or stderr, that the masked entry keeps `n`, `id`, `type`, `display`, and `selected`, and that `--format md` is refused on checkout commands.
- [x] 1.4 Add `pay` by the design: one read, the status and total check, one completion with the entry on stdin, one read after an uncertain result, and `SHOP_PAY=completed|changed|unknown|not-completed`; verify the tests cover each result, that exactly one completion is ever sent, and that the entry is in no argv.
- [x] 1.5 Write `SKILL.md` as `browser`'s is (`hidden`, `disable-model-invocation`, the script's commands, a link to the wiki page); verify `node scripts/measure-context.mjs --check` passes.
- [x] 1.6 Add the script to `scripts/tests/cli-conventions.test.mjs` if that test lists scripts by name; verify the script suite passes.

## 2. Dependencies and setup

- [x] 2.1 Teach `.agents/skills/update-dependencies/scripts/update.mjs` to read the Shop pin from `shop.mjs` and survey it, never moving it; verify its test covers reading the pin and a repo without the file.
- [x] 2.2 Add one line to `.agents/skills/wong-setup/references/tools.md`: setup never offers Shop's command, the first shopping request asks; verify it links the install section and `measure-context.mjs --check` still passes.

## 3. Docs (`wiki/`, `AGENTS.md`)

- [x] 3.1 Write `wiki/development/shopping.md` by the design's list: Shop first, reading Shop's guide and where this page wins, connecting on a yes, the pay question with one example, the checkout link, what ends without a second try, what Shop learns, where things are kept and how to remove them, and what is untried (Windows); verify the wiki checks pass and each command on the page runs as written against the stand-in.
- [x] 3.2 Link the page from `wiki/development/README.md` under Browsing; verify the hub-coverage check passes.
- [x] 3.3 Add Shop's command to `wiki/development/required-tools.md`: the first-use sentence, a table row, and an *Installing Shop's command* section (size, folder, the Node range, the fingerprint, how to remove it); verify the page stays under 3,000 words.
- [x] 3.4 Add `[buying](wiki/development/shopping.md)` to the browsing rule in the `WONG-STACK` block of `AGENTS.md`; verify `measure-context.mjs --check` passes and start-up words stay under the ceiling.

## 4. Payload wiring

- [x] 4.1 Add `shop` to `core.skillDirs` in `.agents/skills/wong-sync/references/payload-files.json` and name it in the payload manifest's Core line; verify `node scripts/check-payload-links.mjs` passes.
- [x] 4.2 Add a `shopping` area to `.agents/skills/memory/references/areas.json` (the skill folder, the wiki page, the new spec); verify `memory-areas.test.mjs` passes.

## 5. Release

- [x] 5.1 Add the `## Next (minor) — Buy through Shop` entry to `CHANGELOG.md`, with an **Updating.** note in plain words: nothing is installed by the update, the first shopping request asks, and connecting Shop is optional; verify the entry names no file or command the person need not type.

## 6. Verification

- [x] 6.1 On this machine, run `shop.mjs install` against the real registry, then one anonymous search, `guide`, and each refusal; verify real products return, the install folder holds only the pinned version, and no file appears in the repo.
- [x] 6.2 Check whether the command has a setting that drops the harness name from its `User-Agent`; set it in `shop.mjs` if so, and write what Shop learns on the wiki page either way.
- [x] 6.3 Ask the owner, the shared way, to connect his Shop account and buy one small item he picks. On a yes: connect, create the checkout, record the field names (never values) of one live saved-payment entry in the design, widen the mask's allow-list if the card can't be named, ask the pay question, and run `pay` once; verify the order shows in `order search`. On a no: record connecting and paying as untried on the wiki page and as an open thread in memory.
- [x] 6.4 Run `node .github/scripts/checks.mjs --worktree` and `openspec validate "buy-through-shop" --strict --no-interactive`; verify both pass.

<!-- end tasks.md -->
<!-- file specs/dependencies/spec.md utf8 997 -->
# Spec Delta

## ADDED Requirements

### Requirement: Shopping adds one command on first use

Shopping through Shop SHALL need one tool beyond the core: Shop's command, installed into the person's home folder the first time a shopping task needs it, in the one version WongStack has tried. Before installing, the agent SHALL ask once, naming its size. A download that does not match the recorded fingerprint of that version SHALL install nothing. It SHALL add nothing to the repository, SHALL need no admin password, and setup SHALL NOT offer it.

#### Scenario: A first shopping request

- **WHEN** a task first needs Shop on a machine without the command
- **THEN** the agent says what the install needs, asks, installs it into the home folder, and carries on with the task

#### Scenario: The download does not match

- **WHEN** the downloaded command differs from the recorded fingerprint
- **THEN** nothing is installed, the agent says so, and the errand falls back to browsing as the person

<!-- end specs/dependencies/spec.md -->
<!-- file specs/shopping/spec.md utf8 4844 -->
# Spec Delta

## Purpose

Lets the agent find, compare, and buy products through Shop for the person: looking needs no account, paying needs the person's yes each time, and no payment secret reaches the agent.

## ADDED Requirements

### Requirement: The agent shops through Shop without an account

For a product request, the agent SHALL search Shop before it browses a store's website, and SHALL be able to search, compare, and fill a cart with no Shop account. Each option it shows SHALL name the seller and the price with its currency and link the product. With a cart or checkout it SHALL give the store's own checkout link, so the person can always pay themselves.

#### Scenario: A request with no account connected

- **WHEN** the person asks for a product and no Shop account is connected
- **THEN** the agent shows options with seller, price, and product link, without asking the person to sign in

#### Scenario: The person wants to pay themselves

- **WHEN** the person picks an item and has not connected Shop
- **THEN** the agent gives the store's checkout link for that item and pays nothing

### Requirement: The agent connects a Shop account only on the person's yes

The agent SHALL ask in the chat before it connects the person's Shop account, and SHALL ask only when the task needs the account. The person SHALL approve the connection in Shop themselves. One connection SHALL serve every repo on the computer. After a no, the agent SHALL continue without an account and SHALL NOT ask again in that task.

#### Scenario: The person says yes

- **WHEN** the person agrees to connect Shop
- **THEN** the agent gives them Shop's link and code, and uses the account only once Shop reports the connection approved

#### Scenario: The person says no

- **WHEN** the person declines to connect Shop
- **THEN** nothing is connected, the agent goes on with what needs no account, and the task does not ask again

### Requirement: The agent pays only after a yes that names the purchase

Before it pays through Shop, the agent SHALL ask the person in the chat, naming the store, the items, the total with its currency, the delivery address, and the card by brand and last digits, and SHALL pay only on a yes. The yes SHALL cover that purchase at that total alone.

#### Scenario: A confirmed purchase

- **WHEN** the person says yes to the named purchase
- **THEN** the agent pays once and reports the order only when Shop returns a completed order

#### Scenario: The total moved after the yes

- **WHEN** the store's total differs from the one the person agreed to
- **THEN** nothing is paid, and the agent asks again with the new total

### Requirement: A payment through Shop is never sent twice

The agent SHALL send a payment at most once per confirmed purchase. When the outcome is not known, it SHALL look the purchase up, SHALL NOT pay again or start a replacement purchase, and SHALL tell the person the outcome is not confirmed and give the store's checkout link.

#### Scenario: No answer comes back

- **WHEN** a payment is sent and no result returns
- **THEN** the agent reads the purchase's state once, reports an order only if it shows completed, and otherwise says it is not confirmed without paying again

### Requirement: The agent never sees a payment secret from Shop

A card number, a payment credential, or the Shop sign-in SHALL NOT appear in any command, output, log, message, or repository file the agent can read. Of a saved payment method the agent SHALL see only what names it to the person, such as brand and last digits. The agent SHALL NOT obtain a card issued for it to type into a website.

#### Scenario: A checkout lists saved cards

- **WHEN** a checkout returns the person's saved payment methods
- **THEN** the agent sees each one's brand and last digits, and no credential

#### Scenario: A website outside Shop's checkout

- **WHEN** a purchase can only be made by typing a card into a website's own form
- **THEN** the agent requests no card from Shop, and the card goes through the private form as before

### Requirement: A purchase Shop cannot complete falls back without a second charge

When Shop cannot complete a purchase, because the store is not one Shop pays at, the checkout needs the person, or the Shop command is not installed, the agent SHALL fall back to the store's checkout link or to browsing as the person, and SHALL NOT pay by a second route for a purchase whose first payment may have gone through.

#### Scenario: A checkout needs the person

- **WHEN** a checkout reports a step only the person can do
- **THEN** the agent gives the person the checkout link and what is left to do

#### Scenario: The command is declined

- **WHEN** the person declines to install the Shop command
- **THEN** nothing is installed and the agent does the errand by browsing as the person

<!-- end specs/shopping/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-10-13

~~~
<!-- end .openspec.yaml -->
<!-- file review.html utf8 55918 fence=~~~ -->
~~~html
<!-- wong-review:3 -->
<!doctype html>
<!--
  WongStack review kit. build-review.mjs writes the proposal as static HTML at the
  review:content marker and puts the change name in place of its token. The one
  script adds Note buttons, drawing fit and full screen, notes, drafts, and copy. It loads nothing from the network;
  opened through a reply link (reply-link.mjs), it sends the saved notes to the chat, and its footer
  asks the chat to build, or to build and publish, with saved unsent notes.
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Review · 2026-10-13-buy-through-shop</title>
<style>
  :root { --ink:#222; --muted:#5f5f5f; --line:#b5b5b5; --fill:#f3f3f3; }
  * { box-sizing:border-box; }
  html { -webkit-text-size-adjust:100%; }
  body { margin:0; padding-bottom:var(--bar, 76px); background:#e6e6e6; color:var(--ink); font:16px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; overflow-wrap:anywhere; }
  main { max-width:700px; margin:0 auto; padding:0 12px; }
  a { color:inherit; }
  code, pre, .ln { font-family:ui-monospace, Menlo, Consolas, monospace; }
  code { background:var(--fill); border:1px solid #ddd; border-radius:3px; padding:0 3px; font-size:.88em; }
  :focus-visible { outline:3px solid #111; outline-offset:2px; }
  [hidden] { display:none !important; }
  header { padding:18px 0 4px; }
  .eyebrow { margin:0; color:var(--muted); font-size:13px; letter-spacing:.06em; text-transform:uppercase; }
  h1 { margin:2px 0 4px; font-size:22px; line-height:1.25; }
  .jump { display:flex; flex-wrap:wrap; gap:0 18px; margin:4px 0 0; padding:0; list-style:none; }
  .jump a { display:inline-block; padding:8px 0; }
  .hint, .muted { color:var(--muted); font-size:14px; margin:4px 0 0; }
  #script-error { color:#a00; font-weight:600; }
  section { margin:18px 0; scroll-margin-top:8px; }
  h2 { margin:0 0 8px; color:var(--muted); font-size:13px; letter-spacing:.08em; text-transform:uppercase; }
  .card { background:#fff; border:1px solid var(--line); border-radius:6px; padding:12px; margin:0 0 10px; }
  .card p { margin:0 0 10px; } .card p:last-child { margin-bottom:0; }
  .items, .decisions, .note-list { list-style:none; margin:0; padding:0; }
  .item { display:grid; grid-template-columns:26px minmax(0,1fr); gap:0 10px; overflow:hidden; }
  .item, .decision { scroll-margin-top:8px; }
  .num { flex:0 0 26px; height:26px; border-radius:50%; background:#d6d6d6; font-size:13px; font-weight:700; display:flex; align-items:center; justify-content:center; }
  .body { flex:1; min-width:0; }
  [data-note] { border-radius:3px; }
  [data-note]:hover, .noting { background:#f1f1f1; }
  .item > .drawing { position:relative; grid-column:1 / -1; margin:10px -12px 0; }
  .item > .drawing:last-child { margin-bottom:-12px; }
  .drawing summary { display:flex; align-items:center; gap:6px; min-height:44px; padding:0 12px; border-top:1px solid #ddd; color:var(--muted); font-size:14px; cursor:pointer; list-style:none; }
  .drawing summary::-webkit-details-marker { display:none; }
  .drawing summary::before { content:'\25B8'; display:inline-block; width:1em; }
  .drawing[open] summary::before { transform:rotate(90deg); }
  .drawing[open] .show, .drawing:not([open]) .hide { display:none; }
  .drawing .count { color:var(--ink); font-weight:600; }
  .frame { overflow:auto; border-top:1px solid var(--line); background:var(--fill); touch-action:pan-y; }
  .js .frame { overflow:hidden; cursor:zoom-in; }
  .art { display:block; width:max-content; margin:0; padding:.6em .8em; font-size:13px; line-height:1.2; white-space:pre; overflow-wrap:normal; }
  .art .pin { min-width:1.8em; min-height:1.6em; margin-left:.4em; padding:0 .5em; border-radius:.8em; font-size:.85em; line-height:1.5em; }
  .enlarge { position:absolute; top:6px; right:12px; min-height:32px; padding:2px 10px; font-size:13px; }
  .add { min-width:0; min-height:34px; margin-left:6px; padding:0 12px; border-color:#aaa; border-radius:17px; color:var(--muted); font-size:13px; vertical-align:middle; }
  .zoom { display:flex; align-items:center; gap:6px; }
  .zoom .level { margin-right:auto; color:var(--muted); font-size:13px; }
  #viewer { position:fixed; top:0; left:0; right:0; bottom:0; z-index:8; display:flex; flex-direction:column; background:#fff; }
  #viewer .zoom { flex:none; padding:calc(6px + env(safe-area-inset-top)) 12px 6px; border-bottom:1px solid var(--line); }
  #viewer .vframe { flex:1; min-height:0; overflow:auto; background:var(--fill); touch-action:pan-x pan-y; overscroll-behavior:contain; -webkit-overflow-scrolling:touch; }
  #viewer .vhint { flex:none; margin:0; padding:6px 12px calc(6px + env(safe-area-inset-bottom)); border-top:1px solid var(--line); color:var(--muted); font-size:13px; }
  body.viewing { overflow:hidden; }
  .meta { margin:0 0 4px !important; color:var(--muted); font-size:13px; }
  .tag { display:inline-block; margin-right:8px; padding:0 8px; border:1px solid #777; border-radius:10px; background:#fff; color:var(--ink); font-size:12px; font-weight:700; }
  .tag.assumed { border-style:dashed; }
  .tag.check { border:2px dotted #333; }
  .hit { outline:3px solid #888; outline-offset:3px; }
  button { font:inherit; font-size:14px; min-width:40px; min-height:40px; padding:4px 12px; border:1px solid #777; border-radius:4px; background:#fff; color:var(--ink); cursor:pointer; }
  button.primary { background:#333; border-color:#333; color:#fff; }
  button:disabled { opacity:.45; cursor:default; }
  .pin { min-width:24px; min-height:24px; margin-left:6px; padding:0 7px; border-radius:12px; background:#333; border-color:#333; color:#fff; font:700 12px/22px system-ui, sans-serif; vertical-align:middle; }
  .pin.draft { background:#fff; color:var(--ink); border-style:dashed; }
  .entry { display:block; width:100%; margin:0 0 8px; padding:8px 10px; text-align:left; }
  .entry .where { display:block; color:var(--muted); font-size:13px; }
  .entry .tag { margin:0 0 0 6px; }
  #chip { position:absolute; z-index:9; box-shadow:0 2px 8px rgba(0,0,0,.3); }
  #editor { position:absolute; z-index:6; width:260px; padding:10px; background:#fff; border:2px solid #333; border-radius:6px; box-shadow:0 4px 16px rgba(0,0,0,.25); }
  #editor.docked { position:fixed; left:0; right:0; bottom:0; width:auto; display:flex; flex-direction:column; overflow:auto; border-width:2px 0 0; border-radius:0; padding:8px 12px max(8px, env(safe-area-inset-bottom)); }
  #editor.docked .where { flex:none; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  #editor.docked textarea { flex:1 1 auto; min-height:44px; }
  #editor.docked .row { flex:none; }
  #editor .where { margin:0 0 6px; color:var(--muted); font-size:13px; }
  #editor .moved { margin:0 0 6px; font-size:13px; font-weight:600; }
  #editor textarea { display:block; width:100%; min-height:76px; padding:6px 8px; border:1px solid #777; border-radius:4px; font:16px/1.4 system-ui, sans-serif; resize:vertical; }
  #editor .row { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
  .bar { position:fixed; left:0; right:0; bottom:0; z-index:4; display:grid; grid-template-columns:repeat(3, minmax(0, 1fr)); align-items:stretch; gap:8px; padding:8px 12px calc(8px + env(safe-area-inset-bottom)); background:#fff; border-top:1px solid var(--line); }
  .bar:has(#ready[hidden]) { grid-template-columns:1fr; }
  .bar > button, #ready > button { min-width:0; height:64px; padding:6px; white-space:normal; line-height:1.3; }
  body.docked .bar, body.viewing .bar { display:none; }
  #ready { display:contents; }
  #ready-confirm { position:absolute; right:12px; bottom:calc(100% + 8px); width:272px; max-width:calc(100vw - 24px); max-height:calc(100dvh - var(--bar, 76px) - 24px); overflow:auto; padding:12px; background:#fff; border:1px solid var(--line); border-radius:6px; box-shadow:0 4px 16px rgba(0,0,0,.2); }
  #ready-confirm .row { display:flex; gap:8px; margin-top:10px; }
  #ready-confirm button { flex:1; min-height:44px; }
  #ready-confirm p { margin:0; font-size:14px; }
  #ready-says { position:absolute; right:12px; bottom:calc(100% + 8px); max-width:calc(100vw - 24px); margin:0; padding:8px 12px; background:#fff; border:1px solid var(--line); border-radius:4px; font-size:14px; font-weight:600; pointer-events:none; }
  .bar:has(#ready-confirm:not([hidden])) #ready-says { bottom:calc(100% + 16px + var(--choices, 0px)); }
  .spinner { display:inline-block; width:14px; height:14px; margin-right:6px; vertical-align:-2px; border:2px solid currentColor; border-right-color:transparent; border-radius:50%; animation:spin .8s linear infinite; }
  @keyframes spin { to { transform:rotate(360deg); } }
  @media (prefers-reduced-motion:reduce) { .spinner { animation:none; } }
  .session, #editor .copies { color:var(--muted); font-size:13px; }
  #editor .copies { flex:none; margin:6px 0 0; }
  .pin.sent { background:#fff; color:var(--ink); }
  #toast { position:fixed; left:50%; bottom:calc(var(--bar, 76px) - 4px); z-index:7; max-width:90vw; transform:translateX(-50%); padding:6px 12px; border-radius:4px; background:#222; color:#fff; font-size:14px; opacity:0; pointer-events:none; transition:opacity .2s; }
  #toast.show { opacity:1; }
  #copybuf { position:fixed; left:0; top:0; width:1px; height:1px; opacity:0; pointer-events:none; }
  @media (min-width:701px) {
    body { font-size:20px; }
    h1 { font-size:30px; }
    .eyebrow, h2, .hint, .muted, .num, .drawing summary, .add, .meta, .entry .where, #editor .where, #editor .moved, .session, #editor .copies, #ready-confirm p, #ready-says { font-size:16px; }
    button { font-size:18px; }
    .entry { font-size:20px; }
    .bar { grid-template-columns:repeat(3, minmax(0, 1fr)); padding-left:max(12px, calc((100vw - 700px) / 2 + 12px)); padding-right:max(12px, calc((100vw - 700px) / 2 + 12px)); }
    .bar:has(#ready[hidden]) { grid-template-columns:1fr; }
    .bar > button, #ready > button { height:44px; }
    #ready-confirm, #ready-says { right:max(12px, calc((100vw - 700px) / 2 + 12px)); }
    #ready-confirm { width:320px; }
  }
</style>
</head>
<body data-change="2026-10-13-buy-through-shop">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-10-13-buy-through-shop</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. <span class="copies">Saving a note copies all your notes.</span> Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">Buying something today means the assistant drives a store's website: it is slow, some stores turn its browser away, and you type your card into a private form for every order. Shop, from Shopify, now gives assistants a direct way to search millions of stores and pay with a card you already saved there, so no card is typed at all.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>Ask the assistant to find or buy something, and it searches Shop first.</b> It shows a few options with the seller, the price, and a link to each product, and says why each fits. No account is needed to search, compare, or fill a cart.</div></div></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>You connect your Shop account once, only if you say yes.</b> The assistant asks first, then sends a link and a short code; you check the code and approve in Shop. After that it can read your saved addresses and orders and pay with a card you saved in Shop. Say no and it keeps shopping without an account, and does not ask again in that task.</div></div></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>It pays only after your yes, once.</b> The question names the store, the items, the total, the delivery address, and the card by brand and last digits. If the total changes after your yes, it asks again. A payment can't be undone from here: a refund is between you and the store.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-3-line-1" tabindex="0">you            assistant         Shop</span>
<span class="ln" data-note="item-3-line-2" tabindex="0"> │─ &quot;buy it&quot; ────▶│</span>
<span class="ln" data-note="item-3-line-3" tabindex="0"> │                │─ checkout ───▶│</span>
<span class="ln" data-note="item-3-line-4" tabindex="0"> │                │◀─ Visa ··4242 │</span>
<span class="ln" data-note="item-3-line-5" tabindex="0"> │◀─ Pay $84? ────│</span>
<span class="ln" data-note="item-3-line-6" tabindex="0"> │─ yes ─────────▶│</span>
<span class="ln" data-note="item-3-line-7" tabindex="0"> │                │─ pay once ───▶│</span>
<span class="ln" data-note="item-3-line-8" tabindex="0"> │◀─ order #1042 ─│◀─ order ──────│</span></pre></div></details></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>Your card stays in Shop; the assistant never sees a card number.</b> Shop sends back a payment detail for each saved card. A small program keeps that in a private file and shows the assistant only the brand and last digits. The sign-in sits in a private file in your home folder that only your user can read.</div></div></li>
<li class="item card" id="item-5"><span class="num">5</span><div class="body"><div class="text" data-note="item-5" tabindex="0"><b>An unsure payment is never tried twice.</b> If the answer does not come back, the assistant looks the order up. If it still can't tell, it says so and gives you the store's checkout link.</div></div></li>
<li class="item card" id="item-6"><span class="num">6</span><div class="body"><div class="text" data-note="item-6" tabindex="0"><b>Every other store works as today.</b> A store Shop can't pay at, or a checkout that needs you, falls back to what exists now.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-6-line-1" tabindex="0">store            │ how it pays</span>
<span class="ln" data-note="item-6-line-2" tabindex="0">─────────────────┼──────────────────</span>
<span class="ln" data-note="item-6-line-3" tabindex="0">Shopify, Shop    │ +saved card,</span>
<span class="ln" data-note="item-6-line-4" tabindex="0">connected        │  after your yes</span>
<span class="ln" data-note="item-6-line-5" tabindex="0">Shopify, not     │ +checkout link,</span>
<span class="ln" data-note="item-6-line-6" tabindex="0">connected        │  you pay</span>
<span class="ln" data-note="item-6-line-7" tabindex="0">any other site   │ browser and</span>
<span class="ln" data-note="item-6-line-8" tabindex="0">                 │ private form</span></pre></div></details></li>
<li class="item card" id="item-7"><span class="num">7</span><div class="body"><div class="text" data-note="item-7" tabindex="0"><b>The first shopping request asks before a small download.</b> Shop's command is about 2 MB and goes into your home folder, in the one version WongStack has tried. A download that does not match that version installs nothing. Setup never offers it.</div></div></li>
<li class="item card" id="item-8"><span class="num">8</span><div class="body"><div class="text" data-note="item-8" tabindex="0"><b>One sign-in serves every repo on the computer</b>, as saved website logins do. To disconnect, ask the assistant, or remove the connection in your Shop account.</div></div></li>
<li class="item card" id="item-9"><span class="num">9</span><div class="body"><div class="text" data-note="item-9" tabindex="0"><b>What was checked.</b> On 2026-10-13 a search without an account returned real products. Connecting and paying have not been tried with a real account: they were tested against a stand-in, and the owner chose to publish before a real purchase. The Shopping page says so.</div></div></li>
</ol>
<p class="aside">Non-goals: paying on websites outside Shopify with a card Shop issues to the assistant (it would put a card number in front of the assistant); returns and cancelling an order, which Shop's command does not do; a sign-in per repo; connecting through a chat app's own plug-in list.</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-13</p>Asked how far the first version should go → chose pay at Shopify stores: find, compare, and pay with a card saved in Shop after a yes; other websites keep the browser and the private form.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-13</p>Asked where the Shop sign-in should live → chose one per computer, shared by every repo, as saved website logins are.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-13</p>Asked what should happen next → chose plan it.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-13</p>Assumed: Shop's own guide is read from its command each time and no copy ships, because a copy goes stale; the browser tool's guide is read the same way.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-13</p>Assumed: the command is installed in one pinned version and only when its download matches a recorded fingerprint, because its main part is a sealed file nobody here can read and it handles payments.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-13</p>Assumed: a small program hides what Shop returns for each saved card and sends the chosen one itself, because Shop's own input description says that entry can carry a payment credential, and the choice made was that the assistant never sees one.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-13</p>Assumed: the program refuses Shop's request for an issued card, because that hands the assistant a card number, which the chosen reach leaves out.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-13</p>Assumed: the assistant offers to connect only when a task needs the account (paying, saved addresses, orders), not at the first search, because looking needs no account and an early ask adds a step.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-13</p>Assumed: setup never offers the command and the first shopping request asks, because most installs never shop; camofox is offered the same way.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-13</p>Assumed: the new page is its own wiki page, because the browsing page is four words under its 3,000-word limit.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-13</p>Assumed: the build's real purchase waits for the owner's yes and his choice of item, because it spends his money; if he declines, connecting and paying stay recorded as untried.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-13</p>Build: every list of saved cards is hidden, not only a checkout's, because Shop's own description of the account read lists the saved cards with a credential each, under another name. A credential found anywhere else in an answer is written over, and an answer that is not JSON is not shown for a checkout or the account.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-13</p>Build: the program also refuses the flag that sends a request to another address, and starts Shop's command with every Shop setting cleared but the sign-in's place, because either could send the sign-in elsewhere. The text format is refused on the account read too.</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-13</p>Build: the pay step sends the card whose id matches the one last shown under that number, because Shop may list the cards in another order between the question and the payment. It also notes that a payment was sent, so a later pay for the same checkout only reads and reports; without the note a second run could pay twice.</li>
<li class="decision card" id="decision-15" data-note="decision-15" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-13</p>Build: &quot;not completed&quot; is said only when Shop answered the payment and the checkout shows an unpaid state; a payment still in progress, or no answer, is &quot;unknown&quot;.</li>
<li class="decision card" id="decision-16" data-note="decision-16" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-13</p>Build: Shop's search also passes under its other name, <code>catalog search</code>, because Shop's guide uses both for the same search. A refusal exits with the usage code.</li>
<li class="decision card" id="decision-17" data-note="decision-17" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-13</p>Build: the wiki page is listed in the files an install receives, beside the skill folder, because the always-loaded rule links it.</li>
<li class="decision card" id="decision-18" data-note="decision-18" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-13</p>Build: the plan's test steps inside each part ran once at the end, after all code and tests were written, by the build helper's rule.</li>
<li class="decision card" id="decision-19" data-note="decision-19" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-13</p>Build: each token in the sign-in file is written over in whatever Shop's command prints, because a request plan (<code>--dry-run</code>) lists request headers and nobody has checked it with a signed-in account.</li>
<li class="decision card" id="decision-20" data-note="decision-20" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-13</p>Checked on this computer: the command installs from the registry in the tried version, an anonymous search returns real products, the guide prints, and each refusal refuses. The command has no setting that leaves the assistant's name out of its requests, so nothing is set and the wiki page says what Shop learns.</li>
<li class="decision card" id="decision-21" data-note="decision-21" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-13</p>Asked whether to connect Shop and buy one small item before this goes live → chose publish without it. Connecting and paying are listed as untried on the Shopping page and in the release note.</li>
<li class="decision card" id="decision-22" data-note="decision-22" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-13</p>Archive checkpoint: built, tried on this computer up to signing in (install, a search without an account, each refusal), main merged in, numbered 40.9.0. Connecting and paying remain untried with a real account.</li>
<li class="decision card" id="decision-23" data-note="decision-23" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-13</p>Archive checkpoint: another release (40.8.1) went out first, so main was merged in again; this release keeps 40.9.0. Nothing else changed.</li>
</ol>
</section>
<section id="notes" aria-labelledby="notes-h"><h2 id="notes-h">Your notes</h2>
<p class="session" hidden>Storage is off. Notes and drafts last for this session only.</p>
<ul class="note-list" id="note-list"></ul>
</section>
</main>
<button type="button" id="chip" hidden>Add note</button>
<div id="editor" role="dialog" aria-labelledby="editor-where" hidden>
  <p class="where" id="editor-where"></p>
  <p class="moved">Possibly moved: its text changed, so this note is not attached.</p>
  <textarea aria-label="Note text" rows="3" placeholder="A question or a change"></textarea>
  <div class="row"><button type="button" class="primary" data-act="save">Save</button><button type="button" data-act="discard">Discard</button><button type="button" data-act="delete">Delete note</button><button type="button" data-act="close">Close</button></div>
  <p class="copies">Saving a note copies all your notes.</p>
  <p class="session" hidden>Notes last for this session only.</p>
</div>
<div id="viewer" role="dialog" aria-modal="true" aria-label="Drawing, full screen" hidden>
  <div class="zoom"><span class="level"></span><button type="button" aria-label="Zoom out">−</button><button type="button">Fit</button><button type="button" aria-label="Zoom in">+</button><button type="button" class="primary">Close</button></div>
  <div class="vframe"></div>
  <p class="vhint">Drag to move · pinch or + to zoom · tap a line to note it</p>
</div>
<div class="bar" data-busy="false"><button type="button" class="primary" id="copy"><span class="spinner" hidden aria-hidden="true"></span><span id="copy-label">Copy notes</span></button>
  <div id="ready" hidden>
    <button type="button" data-ready="build"><span class="spinner" hidden aria-hidden="true"></span><span>Build it</span></button>
    <button type="button" data-ready="publish" aria-expanded="false" aria-controls="ready-confirm">Build and publish</button>
    <div id="ready-confirm" role="group" aria-label="Build and publish? This goes live and can't be undone." hidden><p>Goes live, can't be undone.</p><div class="row"><button type="button" class="primary" data-ready="yes"><span class="spinner" hidden aria-hidden="true"></span><span>Yes, publish</span></button><button type="button" data-ready="cancel">Cancel</button></div></div>
  </div>
  <p id="ready-says" role="status" aria-live="polite" hidden><span class="spinner" hidden aria-hidden="true"></span><span id="ready-message"></span></p>
</div>
<div id="toast" role="status"></div>
<textarea id="copybuf" aria-hidden="true" tabindex="-1" readonly></textarea>
<script>
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  window.addEventListener('error', function (e) {
    $('script-error').hidden = false;
    $('script-error').textContent = 'Review script error: ' + e.message + ' (line ' + e.lineno + ')';
  });
  const root = document.documentElement;
  root.classList.add('js');
  const CHANGE = document.body.getAttribute('data-change');
  const KEY = 'wong-review3:' + CHANGE;
  const phone = window.matchMedia ? window.matchMedia('(max-width: 700px)') : { matches: false };
  const chip = $('chip'), editor = $('editor'), ta = editor.querySelector('textarea');
  const viewer = $('viewer'), vframe = viewer.querySelector('.vframe'), vbar = viewer.querySelector('.zoom'), vb = vbar.querySelectorAll('button');
  const all = function (sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); };
  const esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };

  // ── storage: a refused store keeps notes for this session ──
  let store = null, data = { notes: [], drafts: {} };
  const ok = function (r, id) { return r && typeof r.label === 'string' && typeof r.text === 'string' && /^[\w-]+$/.test(id); };
  try { store = window.localStorage; store.getItem(KEY); } catch (e) { store = null; }
  try {
    const saved = store ? JSON.parse(store.getItem(KEY) || 'null') : null;
    if (saved && Array.isArray(saved.notes)) data.notes = saved.notes.filter(function (n) { return ok(n, n && n.id); });
    if (saved && saved.drafts) Object.keys(saved.drafts).forEach(function (id) { if (ok(saved.drafts[id], id)) data.drafts[id] = saved.drafts[id]; });
  } catch (e) { /* unreadable notes start empty */ }
  function persist() {
    if (store) { try { store.setItem(KEY, JSON.stringify(data)); } catch (e) { store = null; } }
    render();
  }

  // ── targets: a data-note id names its location; the label pins a note to its text ──
  function where(id) {
    const m = /^(why|item|decision)-(\d+)(?:-line-(\d+))?$/.exec(id) || [];
    if (m[1] === 'why') return { at: '#/why', kind: 'paragraph ' + m[2], spot: 'Why, paragraph ' + m[2] };
    if (m[1] === 'item') return { at: '#/' + m[2], kind: m[3] ? 'drawing line ' + m[3] : 'item', spot: 'Change #' + m[2] + (m[3] ? ', drawing line ' + m[3] : '') };
    return { at: '#/decisions/' + m[2], kind: 'decision', spot: 'Decision #' + m[2] };
  }
  function labelOf(el) {
    const c = el.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll('.pin, .meta, .add'), function (n) { n.parentNode.removeChild(n); });
    const text = c.textContent.replace(/\s+/g, ' ').trim();
    return where(el.getAttribute('data-note')).kind + ' "' + (text.length > 60 ? text.slice(0, 59) + '…' : text) + '"';
  }
  function find(id, label) {
    const el = document.querySelector('[data-note="' + id + '"]');
    return el && labelOf(el) === label ? el : null;
  }
  function noteOf(id) { return data.notes.filter(function (n) { return n.id === id; })[0] || null; }

  // ── render pins, Note buttons, counts, and the notes list ──
  function render() {
    all('.pin, .add', function (p) { p.parentNode.removeChild(p); });
    const n = data.notes.length, d = Object.keys(data.drafts).length;
    const count = plural(n) + (d ? ' · ' + d + (d === 1 ? ' draft' : ' drafts') : '');
    all('.note-count', function (el) { el.textContent = count; });
    all('.session', function (el) { el.hidden = !!store; });
    const ids = data.notes.map(function (x) { return x.id; }).concat(Object.keys(data.drafts).filter(function (id) { return !noteOf(id); }));
    $('note-list').innerHTML = ids.length ? '' : '<li class="muted">No notes yet.</li>';
    ids.forEach(function (id) {
      const note = noteOf(id), draft = data.drafts[id], rec = note || draft, num = note ? data.notes.indexOf(note) + 1 : 0, sent = !!(note && note.sent);
      const el = find(id, rec.label);
      if (el) {
        const pin = document.createElement('button');
        pin.type = 'button'; pin.className = draft ? 'pin draft' : sent ? 'pin sent' : 'pin'; pin.setAttribute('data-open', id);
        pin.textContent = (num || '') + (num && (draft || sent) ? ' · ' : '') + (draft ? 'Draft' : sent ? 'Sent' : '');
        pin.setAttribute('aria-label', (num ? 'Open note ' + num : 'Open draft') + (num && draft ? ' and its draft' : ''));
        el.appendChild(pin);
      }
      const li = document.createElement('li');
      li.innerHTML = '<button type="button" class="entry" data-open="' + id + '"><span class="where">' + (num ? num + '. ' : '')
        + esc(where(id).at + ' · ' + rec.label) + (draft ? '<span class="tag">Draft</span>' : '') + (sent ? '<span class="tag">Sent</span>' : '') + (el ? '' : '<span class="tag">possibly moved</span>')
        + '</span>' + esc(draft ? draft.text : note.text) + '</button>';
      $('note-list').appendChild(li);
    });
    all('[data-note]', function (el) {
      if (el.closest('.art') || el.querySelector('.pin')) return;
      const id = el.getAttribute('data-note'), add = document.createElement('button');
      add.type = 'button'; add.className = 'add'; add.setAttribute('data-open', id);
      add.textContent = '+ Note'; add.setAttribute('aria-label', 'Note on ' + where(id).kind);
      el.appendChild(add);
    });
    drawings.forEach(function (d) {
      const k = d.art.querySelectorAll('.pin').length;
      d.count.textContent = k ? ' · ' + k + (k === 1 ? ' note' : ' notes') : '';
      fit(d);
    });
    bar();
  }

  // ── still-tap to note: a mouse on text, or any pointer on a full-screen drawing line, shows the chip ──
  let chipFor = null, tap = null;
  const pointers = {};
  function showChip(el, x, y, keyboard) {
    const id = el.getAttribute('data-note');
    chipFor = el;
    chip.textContent = noteOf(id) || data.drafts[id] ? 'Edit note' : 'Add note';
    chip.hidden = false;
    const w = chip.offsetWidth, vw = root.clientWidth;
    chip.style.left = Math.max(8, Math.min(x - w / 2, vw - w - 8)) + window.pageXOffset + 'px';
    chip.style.top = y + 12 + window.pageYOffset + 'px';
    if (keyboard) chip.focus({ preventScroll: true });
  }
  function hideChip() { chip.hidden = true; chipFor = null; }
  document.addEventListener('pointerdown', function (e) {
    if (e.isPrimary) Object.keys(pointers).forEach(function (k) { delete pointers[k]; });
    pointers[e.pointerId] = true;
    tap = Object.keys(pointers).length === 1 && e.button === 0 ? { id: e.pointerId, x: e.clientX, y: e.clientY, t: Date.now(), target: e.target } : null;
  });
  document.addEventListener('pointermove', function (e) {
    if (tap && e.pointerId === tap.id && Math.abs(e.clientX - tap.x) + Math.abs(e.clientY - tap.y) > 8) tap = null;
  });
  document.addEventListener('pointercancel', function (e) { delete pointers[e.pointerId]; tap = null; });
  document.addEventListener('pointerup', function (e) {
    const t = tap;
    delete pointers[e.pointerId]; tap = null;
    if (!t || t.id !== e.pointerId || Date.now() - t.t > 500) return;
    if (t.target.closest('a, button, input, textarea, select, label, summary, #editor')) return;
    const el = t.target.closest('[data-note]');
    const offer = el && (el.closest('#viewer') || (e.pointerType === 'mouse' && !el.closest('.frame')));
    if (offer) showChip(el, e.clientX, e.clientY, false); else hideChip();
  });
  chip.addEventListener('click', function () { if (chipFor) openEditor(chipFor.getAttribute('data-note'), chipFor); });
  document.addEventListener('click', function (e) {
    const t = e.target.closest ? e.target.closest('[data-open]') : null;
    if (!t) return;
    const id = t.getAttribute('data-open'), rec = data.drafts[id] || noteOf(id), el = rec ? find(id, rec.label) : t.closest('[data-note]');
    if (el && t.classList.contains('entry')) { reveal(el); el.scrollIntoView({ block: 'center' }); }
    openEditor(id, el);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (open) closeEditor(true);
      else if (chipFor) { const el = chipFor; hideChip(); el.focus(); }
      else if (view) closeViewer(true);
    } else if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-note]')) {
      e.preventDefault();
      const r = e.target.getBoundingClientRect();
      showChip(e.target, r.left + 48, r.top + Math.min(r.height, 24), true);
    }
  });

  // ── the editor: beside its target on a desktop, docked at the bottom of the visible screen on a phone ──
  let open = null;
  function openEditor(id, el) {
    closeViewer(false); closeEditor(false); hideChip();
    if (el) reveal(el);
    const note = noteOf(id), draft = data.drafts[id];
    const label = draft ? draft.label : note ? note.label : labelOf(el);
    open = { id: id, label: label, el: el };
    $('editor-where').textContent = where(id).at + ' · ' + label;
    editor.querySelector('.moved').hidden = !!el;
    editor.querySelector('[data-act="delete"]').hidden = !note;
    ta.value = draft ? draft.text : note ? note.text : '';
    editor.hidden = false;
    if (el) el.classList.add('noting');
    place();
    ta.focus({ preventScroll: editor.classList.contains('docked') });
  }
  function closeEditor(restore) {
    if (!open) return;
    const el = open.el;
    open = null; editor.hidden = true;
    document.body.classList.remove('docked'); document.body.style.paddingBottom = '';
    bar();
    if (el) { el.classList.remove('noting'); if (restore) el.focus({ preventScroll: true }); }
  }
  function place() {
    const docked = phone.matches || !open.el;
    editor.classList.toggle('docked', docked);
    document.body.classList.toggle('docked', docked);
    editor.style.left = editor.style.top = editor.style.bottom = editor.style.maxHeight = '';
    if (docked) {
      dock();
      document.body.style.paddingBottom = editor.offsetHeight + 24 + 'px';
      keepVisible();
      return;
    }
    const r = open.el.getBoundingClientRect(), w = editor.offsetWidth, vw = root.clientWidth;
    let left = r.right + 12, top = r.top;
    if (left + w > vw - 8) { left = Math.max(8, Math.min(r.left, vw - w - 8)); top = r.bottom + 8; }
    editor.style.left = left + window.pageXOffset + 'px';
    editor.style.top = top + window.pageYOffset + 'px';
  }
  // The visible screen: a phone keyboard shrinks it, and a host app may shrink the page too, so place from its top.
  function screen() {
    const vv = window.visualViewport;
    return vv ? { top: vv.offsetTop, h: vv.height } : { top: 0, h: window.innerHeight };
  }
  function dock() {
    if (!open || !editor.classList.contains('docked')) return;
    const s = screen();
    editor.style.maxHeight = s.h + 'px';
    editor.style.bottom = 'auto';
    editor.style.top = s.top + Math.max(0, s.h - editor.offsetHeight) + 'px';
  }
  function keepVisible() {
    if (!open || !open.el) return;
    const r = open.el.getBoundingClientRect(), s = screen(), limit = s.top + s.h - editor.offsetHeight - 8;
    if (r.bottom > limit) window.scrollBy(0, Math.min(r.top - s.top - 8, r.bottom - limit));
  }
  let seen = screen().h;
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', function () {
      const h = screen().h, keyboard = Math.abs(h - seen) > 100;
      seen = h; dock();
      if (keyboard) keepVisible();
    });
    window.visualViewport.addEventListener('scroll', dock);
  }
  ta.addEventListener('input', function () {
    if (!open) return;
    const note = noteOf(open.id), text = ta.value;
    if (!text.trim() || (note && text === note.text)) delete data.drafts[open.id];
    else data.drafts[open.id] = { label: open.label, text: text };
    persist();
  });
  editor.addEventListener('click', function (e) {
    const act = e.target.getAttribute('data-act');
    if (!act || !open) return;
    const id = open.id, note = noteOf(id), text = ta.value.trim();
    if (act === 'save') {
      if (!text) { ta.focus(); return; }
      if (!note) data.notes.push({ id: id, label: open.label, text: text });
      else if (note.text !== text) { note.text = text; delete note.sent; }
    }
    if (act === 'delete') data.notes = data.notes.filter(function (n) { return n.id !== id; });
    if (act !== 'close') delete data.drafts[id];
    closeEditor(true); persist();
    if (act === 'save' && live) toast('Saved. Tap Send notes to send it to the chat.');
    else if (act === 'save') {
      const n = unsent().length;
      copyNotes(function () { toast('Saved and copied ' + plural(n) + '. Paste them into chat.'); },
        function () { toast('Saved. Tap Copy notes to copy them.'); });
    }
  });

  // ── drawings: fitted by font size on the page; a tap shows one full screen, where it zooms and scrolls natively ──
  const BASE = 13, drawings = [];
  let view = null;
  const V = { f: BASE, lo: BASE, hi: BASE };
  function size(art, f, max) {
    art.style.fontSize = f + 'px';
    for (let i = 0; i < 3 && art.offsetWidth > max; i += 1) { f *= max / art.offsetWidth; art.style.fontSize = f + 'px'; }
    return f;
  }
  function fit(d) {
    if (!d.fig.open || view === d) return;
    d.art.style.fontSize = BASE + 'px';
    const w = d.art.offsetWidth, fw = d.frame.clientWidth - 1;
    if (w > 0 && fw > 0) size(d.art, BASE * Math.min(1.25, fw / w), fw);
  }
  function reveal(el) {
    const fig = el.closest('details');
    if (fig && !fig.open) { fig.open = true; drawings.forEach(fit); }
  }
  function scale(f, cx, cy) {
    f = Math.max(V.lo, Math.min(V.hi, f));
    const k = f / V.f, x = (vframe.scrollLeft + cx) * k - cx, y = (vframe.scrollTop + cy) * k - cy;
    V.f = f; view.art.style.fontSize = f + 'px';
    vframe.scrollLeft = x; vframe.scrollTop = y;
    const atFit = f <= V.lo * 1.001;
    vbar.firstChild.textContent = (atFit ? 'Fit · ' : '') + Math.round(f / BASE * 100) + '%';
    vb[0].disabled = atFit; vb[2].disabled = f >= V.hi * 0.999;
  }
  function openViewer(d) {
    hideChip();
    view = d; viewer.hidden = false; document.body.classList.add('viewing');
    vframe.appendChild(d.art);
    d.art.style.fontSize = BASE + 'px';
    const fw = vframe.clientWidth - 1;
    V.lo = size(d.art, BASE * fw / Math.max(1, d.art.offsetWidth), fw);
    V.hi = Math.max(V.lo * 4, 40); V.f = V.lo;
    vframe.scrollLeft = vframe.scrollTop = 0;
    scale(V.lo, 0, 0);
    vb[3].focus({ preventScroll: true });
  }
  function closeViewer(restore) {
    if (!view) return;
    const d = view;
    view = null;
    d.frame.insertBefore(d.art, d.frame.firstChild);
    viewer.hidden = true; document.body.classList.remove('viewing');
    fit(d); bar();
    if (restore) d.enlarge.focus({ preventScroll: true });
  }
  vbar.addEventListener('click', function (e) {
    const i = Array.prototype.indexOf.call(vb, e.target);
    if (i === 3) closeViewer(true);
    else if (i >= 0) scale([V.f / 1.25, V.lo, V.f * 1.25][i], vframe.clientWidth / 2, vframe.clientHeight / 2);
  });
  vframe.addEventListener('wheel', function (e) {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const r = vframe.getBoundingClientRect();
    scale(V.f * (e.deltaY < 0 ? 1.1 : 1 / 1.1), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });
  // One finger scrolls natively; two fingers pinch around their midpoint.
  let pinch = null;
  const span = function (t) { return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY) || 1; };
  vframe.addEventListener('touchstart', function (e) { if (e.touches.length === 2) pinch = { f: V.f, dist: span(e.touches) }; }, { passive: true });
  vframe.addEventListener('touchmove', function (e) {
    if (!pinch || e.touches.length !== 2) return;
    if (e.cancelable) e.preventDefault();
    const r = vframe.getBoundingClientRect(), t = e.touches;
    scale(pinch.f * span(t) / pinch.dist, (t[0].clientX + t[1].clientX) / 2 - r.left, (t[0].clientY + t[1].clientY) / 2 - r.top);
  }, { passive: false });
  vframe.addEventListener('touchend', function (e) { if (e.touches.length < 2) pinch = null; });
  document.addEventListener('gesturestart', function (e) { if (view) e.preventDefault(); });
  all('.drawing', function (fig) {
    const frame = fig.querySelector('.frame'), enlarge = document.createElement('button');
    enlarge.type = 'button'; enlarge.className = 'enlarge'; enlarge.textContent = 'Full screen';
    frame.appendChild(enlarge);
    const d = { fig: fig, frame: frame, art: fig.querySelector('.art'), count: fig.querySelector('.count'), enlarge: enlarge };
    drawings.push(d);
    fig.addEventListener('toggle', function () { fit(d); });
    frame.addEventListener('click', function (e) { if (!e.target.closest('[data-open]')) openViewer(d); });
  });

  // ── direct links: #/why, #/<n>, #/decisions/<n> ──
  function jump() {
    const m = /^#\/(?:decisions\/(\d+)|(\d+)|(why|changes|decisions))$/.exec(location.hash);
    const el = m ? $(m[1] ? 'decision-' + m[1] : m[2] ? 'item-' + m[2] : m[3]) : null;
    if (!el) return;
    all('.hit', function (n) { n.classList.remove('hit'); });
    el.classList.add('hit');
    el.scrollIntoView({ block: 'start' });
  }

  // ── copy: saved notes only, as notes on the plan: each asks or changes something ──
  // A note sent through a reply link is in the chat already, so it is never copied or sent again.
  function unsent() { return data.notes.filter(function (n) { return !n.sent; }); }
  function snapshot() { return unsent().map(function (n) { return { id: n.id, label: n.label, text: n.text }; }); }
  function acknowledge(notes) {
    notes.forEach(function (submitted) {
      data.notes.forEach(function (current) {
        if (current.id === submitted.id && current.label === submitted.label && current.text === submitted.text) current.sent = true;
      });
    });
    persist();
  }
  function bullets(notes) {
    return notes.map(function (n) {
      const w = where(n.id);
      return '- ' + w.spot + ' (' + n.label.slice(w.kind.length + 1) + '): ' + n.text.replace(/\s*\n\s*/g, ' ');
    });
  }
  function notesText() {
    return ['Notes on the plan ' + CHANGE + ' from the review page. Don\'t build yet.'].concat(bullets(unsent())).join('\n');
  }
  function toast(text) {
    $('toast').textContent = text; $('toast').classList.add('show');
    setTimeout(function () { $('toast').classList.remove('show'); }, 2000);
  }
  function plural(n) { return n + (n === 1 ? ' note' : ' notes'); }
  // One routine for Copy notes and Save: the Clipboard API, else select #copybuf and execCommand, then hand focus back.
  function copyNotes(done, failed) {
    const buf = $('copybuf');
    buf.value = notesText();
    const fallback = function () {
      const back = document.activeElement;
      buf.select();
      const ok = document.execCommand('copy');
      if (back && back !== buf && back.focus) back.focus({ preventScroll: true });
      if (ok) done(); else failed();
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(buf.value).then(done, fallback); else fallback();
  }
  // Nothing to copy or send: say why. True when it spoke.
  function nothing(verb) {
    if (unsent().length) return false;
    toast(data.notes.length ? 'Every note is already sent.' : 'No saved notes yet. Drafts are not ' + verb + '.');
    return true;
  }

  // ── reply link: at a web address with #key=, the bar's button sends unsent notes to the chat that made the plan ──
  // `live` is the link's key while the link is open. The key stays in memory and this tab's session, never in a link.
  let live = null, connecting = false, pending = null;
  function setLive(key) {
    live = key;
    if (!key) hideActions();
    all('.copies', function (el) { el.textContent = key ? 'Send notes sends your saved notes to the chat.' : 'Saving a note copies all your notes.'; });
    bar();
  }
  // One request owns every reply control until the response body has been read.
  function busy(kind) {
    pending = kind;
    bar();
  }
  function linkKey() {
    if (!/^https?:$/.test(location.protocol) || !window.fetch) return null;
    const m = /(?:^#|&)key=([0-9a-f]{64})(?:&|$)/.exec(location.hash), at = 'wong-reply-key:' + location.pathname;
    try {
      if (m) window.sessionStorage.setItem(at, m[1]);
      return m ? m[1] : window.sessionStorage.getItem(at);
    } catch (e) { return m ? m[1] : null; }
  }
  function ask(path, key, body) {
    const headers = { 'x-reply-key': key };
    if (body) headers['content-type'] = 'application/json';
    return fetch(path, { method: body ? 'POST' : 'GET', cache: 'no-store', headers: headers, body: body ? JSON.stringify(body) : undefined });
  }
  async function sendNotes() {
    const notes = snapshot(), n = notes.length;
    if (pending || connecting || nothing('sent')) return;
    busy('send'); says('Sending your notes…');
    // A closed link or an unreachable chat: the same tap copies, and the page goes back to Copy notes.
    const closed = function () {
      setLive(null); says('This link has closed. Copy your notes into chat.');
      copyNotes(function () { toast('This link has closed. Copied ' + plural(n) + ': paste them into chat.'); },
        function () { toast('This link has closed. Tap Copy notes to copy them.'); });
    };
    try {
      const r = await ask('send', live, { text: bullets(notes).join('\n') });
      if (r.status === 429) { says('Wait a few seconds, then tap Send notes again.'); toast('Wait a few seconds, then tap Send notes again.'); return; }
      if (!r.ok) { closed(); return; }
      const answer = await r.json();
      if (!answer || answer.sent !== true) { closed(); return; }
      acknowledge(notes);
      says('Sent ' + plural(n) + ' to the chat.');
      toast('Sent ' + plural(n) + ' to the chat.');
    } catch (e) { closed(); }
    finally { busy(null); }
  }
  $('copy').addEventListener('click', function () {
    if (pending || connecting) return;
    if (live) { sendNotes(); return; }
    const n = unsent().length;
    if (nothing('copied')) return;
    copyNotes(function () { toast('Copied ' + plural(n) + '. Paste them into chat.'); },
      function () { toast('Copy failed. Copy the notes list by hand.'); });
  });

  // ── visible build choices, with publish confirmation above the footer ──
  let version = null;
  const publishButton = $('ready').querySelector('[data-ready="publish"]');
  function says(text) { $('ready-message').textContent = text; $('ready-says').hidden = !text; }
  function closeActions(focus) {
    const wasOpen = !$('ready-confirm').hidden;
    $('ready-confirm').hidden = true;
    publishButton.setAttribute('aria-expanded', 'false');
    if (focus && wasOpen && !$('ready').hidden) publishButton.focus({ preventScroll: true });
    bar();
  }
  function hideActions() {
    const focused = $('ready').contains(document.activeElement);
    closeActions(false);
    $('ready').hidden = true;
    if (focused) $('copy').focus({ preventScroll: true });
    bar();
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !$('ready-confirm').hidden) { e.preventDefault(); closeActions(true); }
  });
  document.addEventListener('pointerdown', function (e) {
    if (!$('ready').contains(e.target)) closeActions(false);
  });
  $('ready').addEventListener('focusout', function (e) {
    if (e.relatedTarget && !$('ready').contains(e.relatedTarget)) closeActions(false);
  });
  // Only the row contributes to page padding; popovers and status never increase its height.
  function bar() {
    const el = $('copy').parentNode, waiting = connecting || !!pending;
    $('copy-label').textContent = connecting ? 'Connecting…' : pending === 'send' ? 'Sending…' : live ? 'Send notes' : 'Copy notes';
    $('copy').disabled = waiting;
    $('copy').querySelector('.spinner').hidden = !(connecting || pending === 'send');
    el.setAttribute('data-busy', String(waiting));
    $('copy').setAttribute('aria-busy', String(connecting || pending === 'send'));
    root.style.setProperty('--choices', $('ready-confirm').offsetHeight + 'px');
    $('ready-says').querySelector('.spinner').hidden = !waiting;
    all('[data-ready]', function (b) {
      const step = b.getAttribute('data-ready');
      b.disabled = waiting;
      b.setAttribute('aria-busy', String(pending === (step === 'yes' ? 'publish' : step) && step !== 'publish'));
      const spinner = b.querySelector('.spinner');
      if (spinner) {
        const active = pending === (step === 'yes' ? 'publish' : step);
        spinner.hidden = !active;
        b.querySelector('span:last-child').textContent = active ? 'Sending…' : step === 'yes' ? 'Yes, publish' : 'Build it';
      }
    });
    if (el.offsetHeight) root.style.setProperty('--bar', el.offsetHeight + 19 + 'px');
  }
  function offer(answer) {
    const names = answer && answer.actions;
    if (!Array.isArray(names) || names.indexOf('build') < 0 || names.indexOf('publish') < 0 || typeof answer.version !== 'string') return;
    version = answer.version;
    $('ready').hidden = false;
    bar();
  }
  async function act(name) {
    if (pending || connecting || !live) return;
    const notes = snapshot();
    busy(name); says('Sending your request…');
    const closed = function () { setLive(null); says('This link has closed. Copy your notes and choose in the chat.'); toast('This link has closed. Copy your notes and choose in the chat.'); };
    try {
      const body = { action: name, version: version };
      if (notes.length) body.text = bullets(notes).join('\n');
      const r = await ask('act', live, body);
      if (r.status === 429) { says('Wait a few seconds, then tap again.'); return; }
      const a = await r.json() || {};
      const line = r.status === 200 && a.sent === true ? 'Asked the chat to build' + (name === 'publish' ? ' and publish.' : '.')
        : r.status === 409 && a.changed === true ? 'The plan changed. Reload to read it first.'
        : r.status === 409 && a.done === true ? 'The chat was already asked.' : '';
      if (r.status === 410 || r.status === 403) { closed(); return; }
      if (!line) { says('The request was not confirmed. Your notes are saved. Try again.'); return; }
      if (r.status === 200 && a.sent === true) acknowledge(notes);
      hideActions(); says(line);
    } catch (e) { says('The request was not confirmed. Your notes are saved. Try again.'); }
    finally { busy(null); }
  }
  $('ready').addEventListener('click', function (e) {
    const button = e.target.closest('[data-ready]');
    if (!button || pending || connecting) return;
    const step = button.getAttribute('data-ready');
    if (step === 'build' || step === 'yes') act(step === 'yes' ? 'publish' : 'build');
    else if (step === 'cancel' || step === 'publish') {
      says('');
      $('ready-confirm').hidden = step === 'cancel';
      publishButton.setAttribute('aria-expanded', String(step === 'publish'));
      bar();
      $('ready').querySelector('[data-ready="' + (step === 'cancel' ? 'publish' : 'cancel') + '"]').focus({ preventScroll: true });
    }
  });

  let width = root.clientWidth;
  window.addEventListener('resize', function () {
    if (root.clientWidth !== width) {
      width = root.clientWidth; hideChip();
      if (view) { const d = view; closeViewer(false); openViewer(d); }
    }
    drawings.forEach(fit);
    if (open) place();
    bar();
  });
  window.addEventListener('hashchange', jump);
  render();
  jump();
  const key = linkKey();
  if (key) {
    connecting = true; says('Connecting to the chat…'); bar();
    (async function () {
      try {
        const r = await ask('alive', key);
        if (!r.ok) return;
        const answer = await r.json();
        if (!answer || typeof answer !== 'object') return;
        setLive(key); offer(answer);
      } catch (e) { /* not live: the page copies */ }
      finally { connecting = false; says(''); bar(); }
    }());
  }
}());
</script>
</body>
</html>

~~~
<!-- end review.html -->
