import { humanEmail, type Route } from "../../api/contract.ts";
import { installationOf } from "./store.ts";
import { lineOf } from "./wake.ts";

const refuse = (status: number, text: string) => new Response(text, { status, headers: { "Cache-Control": "no-store" } });

/** GET line → opens the signed-in person's live line: `?computer=<id>` for their computer, none for an open inbox.
 *  A page must send this app's Origin, so no other site opens it with the person's sign-in; a computer may omit it. */
export const line: Route = async (request, env, { url, identity }) => {
  const email = humanEmail(identity);
  if (!email) return refuse(403, "A person's sign-in opens a line.");
  if (request.headers.get("upgrade")?.toLowerCase() !== "websocket") return refuse(426, "Expected a WebSocket.");
  const computer = url.searchParams.get("computer");
  if (computer !== null && !/^[0-9a-f]{32}$/.test(computer)) return refuse(400, "Unknown computer.");
  const origin = request.headers.get("origin");
  if (origin === null ? computer === null : origin !== url.origin) return refuse(403, "Open the line from this app.");
  const installation = await installationOf(env.DB.withSession("first-primary"));
  const stub = lineOf(env, installation, email);
  if (!stub) return refuse(503, "This app has no line yet; the inbox keeps checking.");
  return stub.fetch("https://line/connect", { headers: { upgrade: "websocket", "x-line-tag": computer ? `computer:${computer}` : "page",
    "x-line-exp": String(identity!.claims.exp * 1000), "x-line-installation": installation, "x-line-email": email } });
};
