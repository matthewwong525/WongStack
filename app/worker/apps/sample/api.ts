// The sample area's server side, with no screen: only skills and assistants call it, so it names itself for
// Access. It exists in this source repo alone, so a preview has an area and a skill to show; no install gets it.
// wiki/stack/mini-apps.md#an-area-with-no-screen
import type { Route } from "../../api/contract.ts";
import { mark, records } from "./records.ts";

export const title = "Sample records";
export const description = "Made-up records for trying a skill on a preview.";

// Keyed "METHOD route". A Map, so a route like `constructor` can't reach a
// property every object inherits.
export const routes = new Map<string, Route>([["GET records", records], ["POST mark", mark]]);
