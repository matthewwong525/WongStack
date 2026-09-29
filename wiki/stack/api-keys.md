# API keys

An API key is a long password that lets your app or the assistant use another service, like a maps, payments, or AI service. You get it from that service, paste it into the chat, and the assistant keeps it private. This page is for the person doing it. No developer knowledge is needed.

## Get the key

Sign in to the service's website and look for a page called *API keys*, *Developers*, or *Tokens*. Create a key there and copy it. Many services show a key only once, so copy it before you leave the page.

If the service asks what the key may do, give it only what you need. A key that can only read cannot be used to change or spend anything.

## Paste it into the chat

Paste the key and say what it's for, for example: *here's my Stripe key for the shop page*. The name matters: it tells the assistant where the key belongs. A pasted key with no word about what it's for is not saved.

The assistant then:

1. **Saves it before the chat ends**, in a private file on your computer that is never published or shared. A key that is only in the chat is not safe: chats are stored, and the private file is how the assistant knows to hide the key.
2. **Sends it to your live site too**, when the site itself needs it. Your site's test copy gets it as well, so a preview works the same way.
3. **Tells you where it saved it**, by name, never by showing the key again.

You never type a command or edit a file. Developers who want the details can read [the secrets convention](../development/secrets.md) and [how the live site gets its keys](cloudflare-credentials.md#worker-secrets-are-per-environment).

## If a key leaks

If you shared a key by mistake (in a message, a screenshot, or a public page), replace it:

1. Create a new key at the service.
2. Paste the new key into the chat and say it replaces the old one.
3. Delete the old key at the service. This is the step that makes the leaked key useless.

## Keys are not logins

A key is for a service your app talks to. Signing in to a website as yourself, like your email or bank, is different: you never paste a password into the chat. The assistant opens a browser and you sign in there once. [Saved browser logins](../development/browsing.md#saved-browser-logins) explains how.

The Cloudflare key you made during [getting started](getting-started.md) is a key like these; [Cloudflare credentials](cloudflare-credentials.md) covers it. Back to [the Cloudflare stack](README.md).
