// The inbox's server side: the browser reads and answers items; the person's computer puts items, checks in for
// taps and reports each one. Every route acts for the signed-in person only. wiki/development/reply-links.md
import type { Route } from "../../api/contract.ts";
import { checkin } from "./checkin.ts";
import { itemClose } from "./item-close.ts";
import { itemPut } from "./item-put.ts";
import { item } from "./item.ts";
import { items } from "./items.ts";
import { tapCancel } from "./tap-cancel.ts";
import { tapResult } from "./tap-result.ts";
import { tapStatus } from "./tap-status.ts";
import { tap } from "./tap.ts";

export const routes = new Map<string, Route>([
  ["GET items", items], ["GET item", item], ["POST tap", tap], ["GET tap", tapStatus], ["POST tap-cancel", tapCancel],
  ["PUT item", itemPut], ["POST item-close", itemClose], ["POST checkin", checkin], ["POST tap-result", tapResult],
]);
