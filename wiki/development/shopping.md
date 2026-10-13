# Shopping

Shopping lets the agent find, compare, and buy products for you through [Shop](https://shop.com/skill.md), Shopify's shopping service. Looking needs no account, paying needs your yes each time, and no payment secret reaches the agent. One script runs it: [`shop.mjs`](../../.agents/skills/shop/scripts/shop.mjs) installs Shop's command, passes the safe commands through, and owns the one pay step.

## Shop first

**For a product request, the agent searches Shop before it browses a store's website.** One search covers many stores, needs no login, and meets no robot check:

```bash
S=.claude/skills/shop/scripts/shop.mjs
node $S guide                             # Shop's own guide; also: guide references/transactions.md
node $S search "rain jacket" --limit 5    # also: catalog get <id>, cart create, checkout create
node $S checkout get <checkout-id> --shop <seller.domain>
```

- **The agent reads Shop's guide before the first call of a task**, and `references/transactions.md` before a checkout. The guide comes from the installed command, so it matches it. No copy is kept here: a second copy goes stale.
- **Where the guide and this page differ, this page wins**: no spend request, connect only on a yes, pay only through `pay`.
- **Each option names the seller and the price with its currency, and links the product.**
- **Every cart and checkout comes with the store's checkout link**, the `continue_url` in the answer, so you can always pay yourself.
- **`--help` or `--schema` on a command gives its inputs.** `tools` lists what Shop offers.

The agent searches, compares, and fills a cart without an account. For a store Shop can't pay at, it gives you the store's checkout link or [browses as you](browsing.md).

## The first request installs Shop's command

A command that prints `SHOP_NEEDS=install` found no install. The agent asks once, [the shared way](../../.agents/skills/explore/references/asking-the-user.md), naming the size (about 2 MB, in your home folder, no admin password). On a yes it runs `shop.mjs install` and carries on. [Installing Shop's command](required-tools.md#installing-shops-command) says what lands where.

- **A no installs nothing.** The agent does the errand by [browsing as you](browsing.md).
- **`SHOP_NEEDS=node` means this computer's Node is not one Shop's command runs on.** The agent says so and browses instead; it never installs Node for this.
- **`SHOP_ERROR=` after `install` means nothing was installed**, as when the download does not match the recorded fingerprint. The agent says so and browses instead.

## Connecting your Shop account

**The agent asks before it connects your Shop account, and only when the task needs it**: to pay, to use a saved address, or to look up an order. It asks [the shared way](../../.agents/skills/explore/references/asking-the-user.md), saying what the connection lets it do.

1. On a yes, it runs `shop.mjs account login --wait 0 --device-name "WongStack"`, which answers with Shop's link and a short code.
2. It sends you both in the chat. The code is public: you open the link and approve in Shop yourself.
3. It runs `shop.mjs account login --wait 90`, again while the answer is pending, and uses the account only once `shop.mjs account` shows `signed_in: true`.

- **A no connects nothing.** The agent goes on with what needs no account and doesn't ask again in that task. It writes the no to [memory](memory.md), so a later task knows.
- **One connection serves every repo on the computer.** `shop.mjs account logout` disconnects this computer.
- **A passed-through command that exits 3 with `auth_required` is signed out**, not uninstalled: only a `SHOP_NEEDS=` line asks for an install.

## The pay question

**The agent pays only on a yes that names the purchase.** It reads the checkout, then asks [the shared way](../../.agents/skills/explore/references/asking-the-user.md), naming:

- the store;
- each item, with its options and quantity;
- the total with its currency;
- the delivery address;
- the card, by brand and last digits.

The first choice is the payment, by its total and card: *Pay $84.00 with Visa ··4242 (Recommended)* / *Send me the checkout link* / *Not now*.

On a yes, the agent pays once, with the total it showed you and the card's `n` from the checkout it read:

```bash
node $S pay <checkout-id> --shop <seller.domain> --instrument <n> --total <minor units> --currency <code>
```

`--total` is in the currency's smallest unit, as Shop gives it: `8400` for $84.00. It ties your yes to the charge: `pay` reads the checkout again and sends nothing unless it is ready, its total and currency are the ones passed, and that card is still offered.

| `pay` prints | It means | The agent |
|---|---|---|
| `SHOP_PAY=completed` | Shop returned a completed order. `SHOP_ORDER=` and `SHOP_ORDER_URL=` follow. | Reports the order with its link. |
| `SHOP_PAY=changed` | Nothing was sent. `SHOP_WHY=` and `SHOP_TOTAL=` say what moved. | Asks again with the new total: your yes covered the earlier total alone. |
| `SHOP_PAY=not-completed` | Shop answered, and the checkout is not paid. | Gives you the link in `SHOP_CHECKOUT_URL=` and says what is left. |
| `SHOP_PAY=unknown` | A payment was sent and no clear answer came back. | Says the payment is not confirmed, and gives you the link. |

## What ends with the link, never a second try

**A payment is sent at most once per purchase.** Each of these ends with the store's checkout link and what is left to do:

- a checkout whose status is `requires_escalation`: a step only you can do;
- `SHOP_PAY=unknown`;
- `SHOP_PAY=not-completed`.

The agent never runs `pay` again hoping for another answer, never starts a replacement checkout, and never finishes the same purchase in the browser: the first payment may have gone through, and a second route would charge you twice. `pay` holds the line itself: once it has sent a payment for a checkout, a later `pay` only reads it and reports.

## What the agent never sees

- **A saved payment method reaches the agent as `n`, `id`, `type`, `display`, and `selected`**: enough to name the card to you. The script keeps the full entry, with its credential, in a private file and pipes it to Shop itself at `pay`.
- **A command that could show a secret is refused**, with one `SHOP_REFUSED=` line that says why: `spend-request`, `checkout complete`, `call`, `checkout update --arguments`, `skill --install`, `--verbose`, `--as curl`, `--url`, `--format md` on a checkout or the account, and any command the script does not list. The agent never runs the installed command directly to get round a refusal: nothing there hides the card.
- **The sign-in stays in its file.** A token from it is written `[hidden]` in anything the command prints.
- **The agent never asks Shop for a card to type into a website.** A purchase that needs a card typed into a website's own form goes through [the private form](browsing.md#the-private-form), as before.
- **A checkout is changed with `checkout update --patch`**, never a full document: a full one would carry the hidden entries back.

## What Shop learns

Shop's command talks to Shop, so Shop sees what the agent does there: each search, each cart and checkout, and the delivery country. Every request also names the command's version, your computer's operating system, processor type, and Node version, and the assistant app it runs in with its version, such as Claude Code or Codex. The command has no setting that leaves the assistant's name out. Once you connect, Shop ties all of it to your account.

## Where things are kept

Everything sits in `~/.wong-stack/shop/` on your computer, and nothing in the repository:

| What | Where |
|---|---|
| Shop's command, in one version | `~/.wong-stack/shop/<version>/` |
| Your sign-in | `~/.wong-stack/shop/credentials.json`, a file only your user can read |
| A checkout's full payment entries | `~/.wong-stack/shop/checkouts/`, one file per checkout, readable only by your user. Removed when the order completes, and after a day. |

**To remove it all,** ask the agent to disconnect Shop (`shop.mjs account logout`), delete `~/.wong-stack/shop/`, and remove *WongStack* from the connections list in your Shop account.

## Untried

- **Connecting and paying.** No one has connected a real Shop account or paid through `pay` yet: both were built from Shop's published description and tested against a stand-in. Where Shop answers in a shape the script does not expect, `pay` sends nothing and the agent gives you the store's checkout link.
- **Windows.** The command keeps its sign-in in its own folder there, `%LOCALAPPDATA%\shop-node-wasm\`, and the install needs Windows' own `tar`. No one has run it on Windows.

Part of [Development](README.md), beside [Browsing](browsing.md).
