---
name: services
description: Use an outside service (Notion, Stripe, a CRM…): call it through the app, or write code that calls it.
user-invocable: false
---

# Services

The app holds each service's key; use it through the helper: `node scripts/company-api.mjs` in WongStack, else `node "$(git rev-parse --show-toplevel)/.claude/skills/access/scripts/services.mjs"`. [The services list](https://github.com/matthewwong525/WongStack/blob/main/wiki/stack/service-catalogue.md) owns the why and the rest.

1. Run `services` to find the key and its notes page. Read the notes page for the key, its levels and its limits.
2. Run `api <key>`, then `api <key> <call>` before you call or write code. Never open the service's `openapi.json`: the short view is enough.
3. For a call `api` doesn't list, read the service's guide, then call it with `<key>.read` or `<key>.change`. When the helper says the call isn't added yet, run the `record` command it prints, then write the call's `summary` (what we use it for) and `description` (how we use it, its quirks) in `openapi.json`.
4. Add what you learn about one call to its `description`, not to the notes page.
5. In code, type the answer with the service's types file, and test it on the saved examples: [service examples](https://github.com/matthewwong525/WongStack/blob/main/wiki/stack/testing.md#service-examples).
