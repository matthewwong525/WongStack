// Tells a person's line to say *look now*: their open inbox, and their computer, then fetch what changed through the
// signed-in routes. The line carries nothing else. wiki/stack/live-line.md
import type { Line } from "./line.ts";

/** The bindings a wake reads: an app with no line yet has none, and the inbox works by checking. */
type LineEnv = { LINE?: DurableObjectNamespace<Line> };

/** The person's one line in this install, named as every inbox row is keyed, or null on an app with no line bound. */
export const lineOf = (env: LineEnv, installation: string, email: string) =>
  env.LINE ? env.LINE.get(env.LINE.idFromName(`${installation}:${email}`)) : null;

/** Wakes every page on the line and `computer`: undefined for every computer, null for none. It never fails a
 *  route: a lost wake is caught by the next check. */
export async function wake(env: LineEnv, installation: string, email: string, computer?: string | null) {
  try {
    const line = lineOf(env, installation, email);
    if (!line) return;
    const answer = await line.fetch("https://line/wake", { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ installation, email, computer: computer === undefined ? "*" : computer }) });
    await answer.body?.cancel();
  } catch { /* the computer's regular check and the page's refresh still find the change */ }
}
