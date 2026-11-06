// What every app's runtime file shares: the one started runtime, signed tokens, and a request helper.
// wiki/stack/testing.md says how to add an app's file.
import type { identities } from "./identity.ts";
import { site } from "./identity.ts";
import type { Playback } from "./services.ts";
import type { Runtime } from "./setup.ts";

/** `services` answers a served outside service from its saved examples: wiki/stack/testing.md#service-examples */
export type Context = { runtime: Runtime; signed: Awaited<ReturnType<typeof identities>>; services: Playback };
/** An app's runtime cases, registered inside its one `describe`; the getter reads the context once it is started. */
export type AppTests = (context: () => Context) => void;

type Call = { token?: string; method?: string; body?: object; origin?: boolean };

/** A request to the started Worker: signed when given a token, from the app's own Origin unless told not, and JSON
 *  when it has a body, a POST unless a method is given. */
export function call({ runtime }: Context, path: string, { token, method, body, origin = true }: Call = {}) {
  return runtime.worker.fetch(`${site.origin}${path}`, {
    method: method ?? (body ? "POST" : "GET"), ...(body && { body: JSON.stringify(body) }),
    headers: { ...(token && { "Cf-Access-Jwt-Assertion": token }), ...(origin && { Origin: site.origin }),
      ...(body && { "content-type": "application/json" }) },
  });
}
