# API keys

An API key is a long password that lets your app or the assistant use another service, like a maps, payments, or AI service. You get it from that service and paste it into a private link the assistant sends, so it never sits in the chat. This page is for the person doing it. No developer knowledge is needed.

## Get the key

The private link's page has a button to the service's key page and short steps, including which permissions you need. Tap the button: the service opens in a new tab of your own browser, and you sign in there. If the service's exact key-page address is unclear, the button opens its dashboard and the steps say where to go next, usually *API keys*, *Developers*, or *Tokens*. Create a key there and copy it. Many services show a key only once, so copy it before you leave the page.

If the service asks what the key may do, give it only what you need. A key that can only read cannot be used to change or spend anything.

Changes to an existing key, such as replacing it, editing permissions, or deleting it, also use your own browser. Give new or replacement values through [the private link below](#give-it-through-the-private-link). For a change with no new value, the assistant gives the link and steps in the chat; tell it when you're done. The assistant follows [the token website procedure](../development/secrets.md#api-token-website-steps).

## Give it through the private link

When a task needs a key the assistant doesn't have, it sends a private link straight away. You can also ask for it: *send me the key link*. The link stays open for 30 minutes, so open it when you're ready; the page shows the time left.

1. **Open the link** the assistant sends, on your phone or computer.
2. **Follow the steps on the page.** Tap *Open …*, make the key at the service, copy it, and come back.
3. **Tap *Paste***, or paste into the box by hand. A key that comes as a file, like Google's key file, goes in through *pick a file*: your device reads it, and the page shows only its name. *This replaces the one saved now* means a new key takes the old one's place.
4. **Tap *Save and continue*.** When the assistant knows a harmless way to test the key, the page tries it once, at the service's own address, which it names, and says *Works*. If the service says no, copy the key again; *Save anyway* keeps it as it is. *Saved, not tested* means there was no test to run. The link closes by itself once every key is saved, and *Close without continuing* closes it sooner.

If you haven't opened the link and the assistant needs another private link on the same computer, the first one closes early. The assistant says so and offers a new one.

The assistant then:

1. **Saves it** in a private file on your computer that is never published or shared.
2. **Sends it to your live site too**, when the site itself needs it. Your site's test copy gets it as well, so a preview works the same way.
3. **Tells you which keys it saved**, by name, never by showing a key.

The link is new each time and works only until it closes; see [how it stays safe](../development/browsing.md#hand-the-browser-over). You never type a command or edit a file.

**Pasting into the chat still works.** Paste the key and say what it's for, for example: *here's my Stripe key for the shop page*. The assistant saves it the same way and says the link is safer next time: chats are stored, so a key pasted there sits in the chat's history. A pasted key with no word about what it's for is not saved.

Developers who want the details can read [how the assistant sends the link](../development/secrets.md#receive-a-key-through-a-private-link) and [how the live site gets its keys](cloudflare-credentials.md#worker-secrets-are-per-environment).

## A saved key shows in Access

When the assistant saves a key your app will use, it also adds the key to [the app's key list](../../app/worker/keys.ts): a name you will recognise, such as *Stripe*, and the secret names it covers. From then on the key shows in [Access](employee-access.md#four-views), where you choose who may look things up with it and who may also change things. A check fails before publishing when a secret the app declares is in no key, or in two.

Each app says which keys it uses, and gets only those ([list the keys a route uses](company-api.md#list-the-keys-a-route-uses)). Nobody on your team is ever handed a key: the app holds it, and each person's level decides what they can do with it.

## If a key leaks

If you shared a key by mistake (in a message, a screenshot, or a public page), replace it:

1. Create a new key at the service.
2. Ask the assistant for the key link, and give it the new key there. It replaces the old one.
3. Delete the old key at the service. This is the step that makes the leaked key useless.

## Keys are not logins

A key is for a service your app talks to. Signing in to a website as yourself, like your email or bank, is different: you never paste a password into the chat. For ordinary website tasks, the assistant opens a browser and you sign in there once. [Saved browser logins](../development/browsing.md#saved-browser-logins) explains how. To have the assistant log in for you instead, give it the logins you choose through a private link: [save your passwords](../development/passwords.md).

The Cloudflare key you made during [getting started](getting-started.md) is a key like these; [Cloudflare credentials](cloudflare-credentials.md) covers it. Back to [the Cloudflare stack](README.md).
