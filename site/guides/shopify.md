---
title: Connect Shopify
name: Shopify
summary: Orders, products, and customers
order: 1
minutes: 10
needs: A Shopify store where you are the owner, or a staff member with the App developer permission.
lastChecked: 2026-10-31
env: [SHOPIFY_STORE, SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET]
---

## What you make

You make a custom app for your own store in Shopify's Dev Dashboard. The app gets a Client ID and a secret. With them, your agent asks Shopify for a short access token each time it starts work. The token lasts 24 hours, and it can do only what you choose in step 3.

## Steps

### 1. Open app development

In your Shopify admin, tap **Settings**, then **Apps**, then **Develop apps**. Tap **Build apps in Dev Dashboard**. The Dev Dashboard opens at [dev.shopify.com](https://dev.shopify.com).

![The Develop apps page in Shopify settings, with Build apps in Dev Dashboard marked](/guides/shopify/01.webp)

### 2. Make the app

In the Dev Dashboard, tap **Create app**. Type a name you will know later, such as `AI assistant`, and tap **Create**.

![The Create app form in the Dev Dashboard, with the app name typed and Create marked](/guides/shopify/02.webp)

### 3. Choose what it can read, then release it

Shopify opens a new version of the app. Under **Access**, find **Scopes** and add only what the job needs; read [Permissions to choose](#permissions-to-choose). To start read-only, add `read_orders`, `read_products`, and `read_customers`. Tap **Release**.

![The app's new version form, with the Scopes box and Release marked](/guides/shopify/03.webp)

### 4. Install it on your store

Open the app's **Home** page and tap **Install app**. Choose your store, read what the app can see, and tap **Install**.

![The app's Home page, with the Install app button marked](/guides/shopify/04.webp)

### 5. Copy the Client ID and secret

Open the app's **Settings** page. Under **Credentials**, copy the **Client ID** and the **Secret**. Paste each one straight into your `.env` file, as *Save it* shows. Do not paste them anywhere else.

![Drawing of the app's Settings page: the Client ID and Secret boxes, with their Copy buttons marked. The values are hidden.](/guides/shopify/05.svg)

## Permissions to choose

| Scope | What it lets the app do |
|-|-|
| `read_orders` | Read orders from the last 60 days |
| `read_all_orders` | Read older orders too. Add it with `read_orders`. |
| `read_products` | Read products and stock |
| `read_customers` | Read customers. Shopify can hide names and emails until you allow customer data for the app. |
| `write_products`, `write_orders` | Change products or orders. Add these only when a job needs them. |

To change the scopes later, make a new version in the Dev Dashboard, release it, and approve the change in your store.

## Save it

Add these lines to the `.env` file in your project folder. `SHOPIFY_STORE` is the first part of your store's `myshopify.com` address, such as `yourshop` for `yourshop.myshopify.com`:

```bash
SHOPIFY_STORE=yourshop
SHOPIFY_CLIENT_ID=paste-the-client-id-here
SHOPIFY_CLIENT_SECRET=paste-the-secret-here
```

Make sure git ignores `.env`, and keep a copy in your password manager: [Keep your keys safe](/guides/keep-keys-safe).

## Check it works

Run these commands in a terminal, in your project folder. The first asks Shopify for a token. The second reads your store's name with it:

```bash
set -a; . ./.env; set +a
TOKEN=$(curl -s -X POST "https://$SHOPIFY_STORE.myshopify.com/admin/oauth/access_token" \
  -d grant_type=client_credentials -d client_id="$SHOPIFY_CLIENT_ID" -d client_secret="$SHOPIFY_CLIENT_SECRET" \
  | sed -n 's/.*"access_token":"\([^"]*\)".*/\1/p')
curl -s "https://$SHOPIFY_STORE.myshopify.com/admin/api/2026-10/shop.json" \
  -H "X-Shopify-Access-Token: $TOKEN" | head -c 120
```

It works when the answer starts with `{"shop":` and shows your store's name. `Invalid API key or access token` means the token request failed: check the three lines in `.env`, and check that you did step 4.

## If it leaks

1. Open the app in the [Dev Dashboard](https://dev.shopify.com), then **Settings**.
2. Under **Credentials**, tap **Rotate** beside the secret. Shopify makes a new secret, and the leaked one stops working.
3. Put the new secret in `.env` in place of the old one.

If you do not need the app any more, open your Shopify admin, tap **Settings**, then **Apps**, and uninstall it.

## Sources

- Shopify: [Custom apps](https://help.shopify.com/en/manual/apps/app-types/custom-apps)
- Shopify: [Dev Dashboard](https://shopify.dev/docs/apps/build/dev-dashboard)
- Shopify: [Client credentials grant](https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/client-credentials-grant)
- Shopify: [Access scopes](https://shopify.dev/docs/api/usage/access-scopes)
- Shopify: [Shop resource](https://shopify.dev/docs/api/admin-rest/latest/resources/shop)
- Shopify: [Protected customer data](https://shopify.dev/docs/apps/launch/protected-customer-data)
