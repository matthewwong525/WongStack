# Shopify

Shopify holds the Claymoo store's orders, products and customers; the app reads them through the `shopify` tool. API guide: https://shopify.dev/docs/api/admin-rest

## The key

- **A fixed Admin API token** starts with `shpat_` and goes in the `X-Shopify-Access-Token` header, with no prefix. Only a legacy custom app made in the store's admin gives one.
- **A new app gives no fixed token.** Since 2026, a custom app is made in the [Dev Dashboard](https://dev.shopify.com) and gives a Client ID and a secret, which trade for a token that lasts 24 hours ([the guide](../../site/guides/shopify.md)). The app can not renew one yet, so a fixed token is the one that works.
- **Check what a token can do** with `GET admin/oauth/access_scopes.json`, which every token may call. The token saved on 2026-11-06 came from the ClaymooOS project and can also change things, so the tool gives only Read.

## Add the tool

```json
{ "base": "https://etienne-house.myshopify.com/admin/api/2026-10/", "header": "X-Shopify-Access-Token", "prefix": "",
  "lookups": ["GET shop.json", "GET orders.json", "GET orders/*.json", "GET products.json", "GET products/*.json",
    "GET customers.json", "GET customers/*.json", "GET locations.json", "GET inventory_levels.json"] }
```

The store's own address is `etienne-house.myshopify.com`, not `claymoo.com`.

## Look-ups

- **The store:** `shopify.read` with `{ "method": "GET", "path": "shop.json", "query": "fields=name,domain,currency" }`.
- **Orders today:** `{ "method": "GET", "path": "orders/count.json", "query": "status=any&created_at_min=2026-11-06T00:00:00-05:00" }`.

`query` is one string, not an object: an object is refused as `invalid_input`.

Part of [services](README.md).
