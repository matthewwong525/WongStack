// The hello app's server side: the main Worker sends /apps/hello/api/<route>
// here. A new route is a handler file beside this one and one entry below.
// A handler gets the database, saved keys, and who is calling; see
// ../index.ts. env.DB is staging data on a preview, production once published.
import type { AppHandler } from "../index.ts";
import { greeting } from "./greeting.ts";

// Keyed "METHOD route". A Map, so a route like `constructor` can't reach a
// property every object inherits.
export const routes = new Map<string, AppHandler>([["GET greeting", greeting]]);
