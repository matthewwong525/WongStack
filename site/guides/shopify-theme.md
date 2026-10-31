---
title: Connect your Shopify theme
name: Shopify theme
summary: Change how your store looks
order: 2
minutes: 10
needs: A Shopify store where you can install apps. Node.js 22.12 or newer and Git 2.28 or newer on your computer.
lastChecked: 2026-10-31
env: [SHOPIFY_CLI_THEME_TOKEN, SHOPIFY_FLAG_STORE]
---

## What you make

You make a theme password with Shopify's free Theme Access app. With it, Shopify's command-line tool, Shopify CLI, can read and change your store's themes. It can not see orders, products, or customers.

## Steps

### 1. Install Theme Access

Go to [apps.shopify.com/theme-access](https://apps.shopify.com/theme-access) and tap **Install**. Choose your store, and tap **Install** again in your Shopify admin.

![The Theme Access page in the Shopify App Store, with the Install button marked](/guides/shopify-theme/01.webp)

### 2. Ask for a theme password

In your Shopify admin, open **Apps**, then **Theme Access**. Tap **Create password**. Type your name and your email address, and tap **Create password** again. Shopify sends the password to that email address.

![The Theme Access form with a name and email typed, and Create password marked](/guides/shopify-theme/02.webp)

### 3. Copy the password from the email

Open the email from Theme Access and tap its link. The link works one time only, for 7 days. Copy the password, and paste it straight into your `.env` file, as *Save it* shows.

![Drawing of the Theme Access password page: the password box with its Copy button marked. The password is hidden.](/guides/shopify-theme/03.svg)

## Permissions to choose

A theme password can read, change, add, and delete every theme in your store. You can not make it smaller. Keep your live theme safe this way:

- Tell your agent to work on a copy: `shopify theme duplicate` makes one.
- Look at changes before they go live: `shopify theme dev` shows a preview, and `shopify theme push --unpublished` uploads to a new theme that shoppers do not see.
- Never let the agent run `shopify theme publish` without asking you.

## Save it

Add these lines to the `.env` file in your project folder. `SHOPIFY_FLAG_STORE` is your store's `myshopify.com` address:

```bash
SHOPIFY_CLI_THEME_TOKEN=paste-the-password-here
SHOPIFY_FLAG_STORE=yourshop.myshopify.com
```

Make sure git ignores `.env`, and keep a copy in your password manager: [Keep your keys safe](/guides/keep-keys-safe).

## Check it works

Install Shopify CLI one time, then list your themes. Run these commands in a terminal, in your project folder:

```bash
npm install -g @shopify/cli@latest
set -a; . ./.env; set +a
shopify theme list
```

It works when you see your themes, with `[live]` beside the one shoppers see. If the CLI asks you to sign in, it did not find the password: check the two lines in `.env`.

## If it leaks

1. In your Shopify admin, open **Apps**, then **Theme Access**.
2. Find the password in the list, and tap **Delete**. The leaked password stops working.
3. Ask for a new password (step 2), and put it in `.env` in place of the old one.

## Sources

- Shopify: [Theme Access app](https://shopify.dev/docs/storefronts/themes/tools/theme-access)
- Shopify: [Shopify CLI for themes](https://shopify.dev/docs/storefronts/themes/tools/cli)
- Shopify: [Install Shopify CLI](https://shopify.dev/docs/api/shopify-cli)
- Shopify: [Theme commands](https://shopify.dev/docs/api/shopify-cli/theme)
- Shopify: [Shopify CLI environment variables](https://shopify.dev/docs/api/shopify-cli#environment-variables)
