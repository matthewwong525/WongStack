# Shopify

Shopify holds the Claymoo store's orders, products and customers; the app reads them through the `shopify` tool. API guide: https://shopify.dev/docs/api/admin-rest

## The key

- **The key is a Dev Dashboard app's Client ID and secret**, which the app trades for a token that lasts 24 hours ([the guide](../../site/guides/shopify.md)). The tool's `forward.exchange` names the store's token address, so the app renews the token itself. `TOOL_SHOPIFY_ID` holds the ID and `TOOL_SHOPIFY` the secret.
- **The app is `AI assistant`** in Claymoo US Inc.'s [Dev Dashboard](https://dev.shopify.com/dashboard/44293130/apps), made on 2026-11-06 with `read_orders`, `read_products` and `read_customers` only, and installed on the store.
- **Make the app with *Create app manually***, not the CLI. Type the scopes as one comma-separated line, turn off *Embed app in Shopify admin*, then *Release*.
- **Install it from the app's *Test app* link.** The link opens a new tab, which the connect helper doesn't follow, so open its address directly: `https://admin.shopify.com/?organization_id=<org>&no_redirect=true&redirect=/oauth/redirect_from_developer_dashboard?client_id%3D<client id>`. Pick the store, check that the list says only *View*, then press *Install*. Afterwards the browser lands on `example.com`, the app's default address: that is expected.
- **Take the keys from *Settings → Credentials*:** `take-key <ref> --tool shopify --id` for the Client ID. Then press *Reveal client secret* and run `take-key <ref> --tool shopify`.
- **A fixed `shpat_` token** works in place of the pair, with no `exchange`. Only a legacy custom app gives one. The ClaymooOS project still holds one that can change almost everything, so don't use it here.

## Add the tool

```json
{ "base": "https://etienne-house.myshopify.com/admin/api/2026-10/", "header": "X-Shopify-Access-Token", "prefix": "",
  "exchange": { "url": "https://etienne-house.myshopify.com/admin/oauth/access_token" },
  "lookups": ["GET shop.json", "GET orders.json", "GET orders/*.json", "GET products.json", "GET products/*.json",
    "GET customers.json", "GET customers/*.json", "GET locations.json", "GET inventory_levels.json"] }
```

The store's own address is `etienne-house.myshopify.com`, not `claymoo.com`. Saving the tool with `exchange` stops look-ups until both keys reach the live app at the next publish.

## Look-ups

- **The store:** `shopify.read` with `{ "method": "GET", "path": "shop.json", "query": "fields=name,domain,currency" }`.
- **Orders today:** `{ "method": "GET", "path": "orders/count.json", "query": "status=any&created_at_min=2026-11-06T00:00:00-05:00" }`.

`query` is one string, not an object: an object is refused as `invalid_input`.

Part of [services](README.md).
