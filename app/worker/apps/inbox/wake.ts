// Tells a person's line to say *look now*: their open inbox, and their computer, then fetch what changed through the
// signed-in routes. The line carries nothing else. wiki/stack/live-line.md

/** The bindings a wake reads: an app with no line yet has none, and the inbox works by checking. The line lives in its
 *  own Worker, so the app sees an untyped namespace and speaks to it only by `fetch`. */
type LineEnv = { LIVE_LINE?: DurableObjectNamespace };

/** The person's one line in this install, named as every inbox row is keyed, or null on an app with no line bound. */
export const lineOf = (env: LineEnv, installation: string, email: string) =>
  env.LIVE_LINE ? env.LIVE_LINE.get(env.LIVE_LINE.idFromName(`${installation}:${email}`)) : null;

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
