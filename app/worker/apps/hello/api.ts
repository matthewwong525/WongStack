// The hello app's server side: the main Worker sends /apps/hello/api/<route> here. A new route is a handler file
// beside this one and one entry below. env.DB is staging data on a preview, production once published.
import type { Route } from "../../api/contract.ts";
import { greeting } from "./greeting.ts";

// Keyed "METHOD route". A Map, so a route like `constructor` can't reach a
// property every object inherits.
export const routes = new Map<string, Route>([["GET greeting", greeting]]);
