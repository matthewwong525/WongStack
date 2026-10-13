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
