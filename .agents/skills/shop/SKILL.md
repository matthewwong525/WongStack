---
name: shop
description: Shop's catalog and checkout, for buying.
hidden: true
disable-model-invocation: true
---

# shop

`scripts/shop.mjs` installs Shop's command and stands between it and the agent. [Shopping](../../../wiki/development/shopping.md) owns when and how to run it:

- `install` downloads the one tried version; `SHOP_NEEDS=install` asks for it.
- `guide` prints Shop's own guide.
- `search`, `catalog`, `cart`, `checkout`, `account`, `order`, and `tools` pass through; `SHOP_REFUSED=` gives a refusal's reason.
- `pay` pays one checkout once and prints `SHOP_PAY=`.
