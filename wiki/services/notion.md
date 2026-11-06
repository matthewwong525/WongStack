# Notion

Notion holds the company's pages, docs and task databases; the app reads them through the `notion` tool. API guide: https://developers.notion.com/reference/intro

## Make the key

- **The key page moved.** `https://www.notion.so/my-integrations` and `/profile/integrations` now open *Developer tools → Connections* at `app.notion.com/developers/connections`.
- **Make a new connection** with *New connection*, a name, and *API token* (workspace-scoped). The token starts with `ntn_`.
- **Turn off the write capabilities.** A new connection starts with *Read content*, *Update content* and *Insert content* all on. Turn off *Update* and *Insert* for a key that only reads. The page saves each change at once.
- **The page shows the token as plain text**, beside the connection's name in a text box and a connection id in the address. [`take-key`](../stack/connect-your-tools.md#use-the-assistants-browser) with no ref takes the one that starts with `ntn_`.
- **A new connection sees no pages.** Share pages or teamspaces in its *Content access* tab, or from a page's *Connections* menu. Ask the person first: this changes what Notion shares.

## Add the tool

Notion needs a `Notion-Version` header on every call. Put it in `forward.headers`:

```json
{ "base": "https://api.notion.com/v1/", "header": "Authorization", "prefix": "Bearer ",
  "headers": { "Notion-Version": "2022-06-28" },
  "lookups": ["POST search", "GET pages/*", "GET blocks/*/children", "GET databases/*", "POST databases/*/query", "GET users/me"] }
```

`POST search` and `POST databases/*/query` only read, so they are look-ups.

## Search pages

`notion.read` with `{ "method": "POST", "path": "search", "body": { "page_size": 5 } }`. A `200` with no `results` means the connection has no shared pages, not a wrong key.

Part of [services](README.md).
