// The inbox's server side: items, taps and schedules, each for the signed-in person alone, and the owner's week board
// (tasks/), which the week screen and the daily change. wiki/development/reply-links.md
import type { Route } from "../../api/contract.ts";
import { checkin } from "./checkin.ts";
import { claim } from "./claim.ts";
import { itemClose } from "./item-close.ts";
import { itemPut } from "./item-put.ts";
import { item } from "./item.ts";
import { items } from "./items.ts";
import { line } from "./line-open.ts";
import { mirror } from "./mirror.ts";
import { runResult } from "./run-result.ts";
import { pause, resume, runCancel, runNow, scheduleDelete } from "./schedule-control.ts";
import { schedulePut } from "./schedule-put.ts";
import { scheduleDetail, schedules } from "./schedules.ts";
import { tapCancel } from "./tap-cancel.ts";
import { tapResult } from "./tap-result.ts";
import { tapStatus } from "./tap-status.ts";
import { tap } from "./tap.ts";
import { dailyRoutes } from "./tasks/daily-routes.ts";
import { weekRoutes } from "./tasks/week-routes.ts";

export const routes = new Map<string, Route>([
  ["GET items", items], ["GET item", item], ["POST tap", tap], ["GET tap", tapStatus], ["POST tap-cancel", tapCancel],
  ["PUT item", itemPut], ["POST item-close", itemClose], ["POST checkin", checkin], ["POST tap-result", tapResult], ["GET line", line],
  ["GET schedules", schedules], ["GET schedule", scheduleDetail], ["PUT schedule", schedulePut], ["POST pause", pause], ["POST resume", resume],
  ["POST delete", scheduleDelete], ["POST run-now", runNow], ["POST run-cancel", runCancel], ["POST claim", claim],
  ["POST run-result", runResult], ["PUT mirror", mirror], ...weekRoutes, ...dailyRoutes,
]);
