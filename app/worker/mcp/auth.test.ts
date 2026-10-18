import { afterEach, beforeEach, expect, it } from "vitest";
import { accessToken, finishSignIn, SignInBusy, SignInEnded, startSignIn, takeSignIn, tokensPlace } from "./auth";
import { McpRefusal } from "./discover";
import { seal } from "./seal";
import { serverAuth } from "./store";
import { employee, owner, site } from "../../tests/employee-access/connections";
import { AUTH, mcpFixture } from "../../tests/mcp";

let f: ReturnType<typeof mcpFixture>;
beforeEach(async () => { f = mcpFixture(); await f.add(); });
afterEach(() => { f.sql.close(); });
const server = async () => (await serverAuth(f.caller(), "canva"))!;
const preview = () => ({ ...f.caller(), origin: "https://preview.business.example.com" });
const row = () => f.sql.prepare("SELECT state, tokens, share, refresh_lease_until AS lease FROM wong_mcp_connections").get() as { state: string; tokens: string | null; share: string; lease: string | null };
/** The owner signed in straight through the sign-in functions, with the service's tokens as it issues them. */
async function signedIn(caller = f.caller()) {
  const url = new URL(await startSignIn(caller, await server(), f.service.send));
  const taken = await takeSignIn(caller, url.searchParams.get("state")!);
  if (typeof taken === "string") throw new Error(taken);
  return finishSignIn(caller, await server(), f.service.send, "good-code", taken.verifier);
}

it("registers each copy of the app once, and sends the person to the service with a challenge", async () => {
  const url = new URL(await startSignIn(f.caller(), await server(), f.service.send));
  expect(Object.fromEntries(url.searchParams)).toMatchObject({ response_type: "code", client_id: "client-1", redirect_uri: `${site.origin}/api/mcp/callback`,
    code_challenge_method: "S256", resource: "https://mcp.canva.example/mcp", scope: "design:read" });
  await startSignIn(f.caller(employee.id), await server(), f.service.send);
  expect(f.service.state.registered).toBe(1);
  expect(new URL(await startSignIn(preview(), await server(), f.service.send)).searchParams.get("client_id")).toBe("client-2");
  f.sql.exec("UPDATE wong_mcp_servers SET scopes = ''");
  expect(new URL(await startSignIn(f.caller(), await server(), f.service.send)).searchParams.has("scope")).toBe(false);
  expect(JSON.stringify(f.sql.prepare("SELECT registration FROM wong_mcp_servers").get())).not.toContain("client-1");
});
it("stops when the service will not register the app", async () => {
  f.service.state.override = url => url.pathname === "/register" ? Response.json({ error: "invalid_redirect_uri" }, { status: 400 }) : undefined;
  await expect(startSignIn(f.caller(), await server(), f.service.send)).rejects.toThrow(McpRefusal);
  f.service.state.override = url => url.pathname === "/register" ? new Response("odd") : undefined;
  await expect(startSignIn(f.caller(), await server(), f.service.send)).rejects.toThrow("Canva would not register this app's address.");
});
it("hands a sign-in back once, to the person and copy that started it, within ten minutes", async () => {
  const state = async (caller = f.caller()) => new URL(await startSignIn(caller, await server(), f.service.send)).searchParams.get("state")!;
  expect(await takeSignIn(f.caller(), "unknown")).toBe("expired");
  const mine = await state();
  expect(await takeSignIn(f.caller(employee.id), mine)).toBe("wrong_person");
  expect(await takeSignIn(preview(), mine)).toBe("wrong_person");
  expect(await takeSignIn(f.caller(), mine)).toMatchObject({ server: "canva" });
  expect(await takeSignIn(f.caller(), mine)).toBe("expired");
  const old = await state();
  f.sql.exec(`UPDATE wong_mcp_sign_ins SET created_at = '${new Date(Date.now() - 11 * 60_000).toISOString()}'`);
  expect(await takeSignIn(f.caller(), old)).toBe("expired");
  // A sign-in left too long is cleared by the next Connect.
  await state(); await state();
  expect(f.sql.prepare("SELECT count(*) AS n FROM wong_mcp_sign_ins").get()).toEqual({ n: 2 });
});
it("keeps the sign-in sealed, labelled with who the service says signed in", async () => {
  expect(await signedIn()).toMatchObject({ access: "access-1", refresh: "refresh-1", origin: site.origin });
  expect(f.sql.prepare("SELECT account_label, state FROM wong_mcp_connections").get()).toEqual({ account_label: "designer@canva.example", state: "connected" });
  expect(row().tokens).not.toContain("access-1");
  f.service.state.override = url => url.pathname === "/token" ? Response.json({ access_token: "plain", id_token: "not-a-jwt" }) : undefined;
  expect(await signedIn()).toEqual({ access: "plain", origin: site.origin });
  expect(f.sql.prepare("SELECT account_label FROM wong_mcp_connections").get()).toEqual({ account_label: null });
  f.service.state.override = url => url.pathname === "/token" ? Response.json({ access_token: "named", id_token: `x.${btoa(JSON.stringify({ name: "Designer" }))}.y` }) : undefined;
  await signedIn();
  expect(f.sql.prepare("SELECT account_label FROM wong_mcp_connections").get()).toEqual({ account_label: "Designer" });
  f.service.state.override = url => url.pathname === "/token" ? Response.json({ access_token: "nameless", id_token: `x.${btoa("{}")}.y` }) : undefined;
  await signedIn();
  expect(f.sql.prepare("SELECT account_label FROM wong_mcp_connections").get()).toEqual({ account_label: null });
});
it("sends a client secret when the service gave one, and stops on a code it refuses", async () => {
  f.sql.exec("UPDATE wong_mcp_servers SET auth_method = 'client_secret_post'");
  let form = new URLSearchParams();
  f.service.state.override = (url, _init, text) => {
    if (url.pathname === "/register") return Response.json({ client_id: "secretive", client_secret: "client-secret" });
    if (url.pathname === "/token") form = new URLSearchParams(text);
    return undefined;
  };
  await signedIn();
  expect(form.get("client_secret")).toBe("client-secret");
  // A service that gave no secret gets none back.
  f.sql.exec("UPDATE wong_mcp_servers SET registration = NULL");
  f.service.state.override = (url, _init, text) => {
    if (url.pathname === "/register") return Response.json({ client_id: "public" });
    if (url.pathname === "/token") form = new URLSearchParams(text);
    return undefined;
  };
  await signedIn();
  expect(form.has("client_secret")).toBe(false);
  const url = new URL(await startSignIn(f.caller(), await server(), f.service.send));
  const taken = await takeSignIn(f.caller(), url.searchParams.get("state")!) as { verifier: string };
  await expect(finishSignIn(f.caller(), await server(), f.service.send, "bad-code", taken.verifier)).rejects.toThrow(SignInEnded);
  f.service.state.override = url => url.pathname === "/token" ? new Response("down", { status: 502 }) : undefined;
  await expect(finishSignIn(f.caller(), await server(), f.service.send, "good-code", taken.verifier)).rejects.toThrow("Canva did not finish the sign-in.");
});
it("uses a live token as it is, and renews one about to end", async () => {
  await signedIn();
  expect((await accessToken(f.caller(), await server(), owner.id, f.service.send)).access).toBe("access-1");
  expect(f.service.state.tokenCalls).toBe(1);
  expect((await accessToken(f.caller(), await server(), owner.id, f.service.send, true)).access).toBe("access-2");
  f.service.state.expiresIn = 60;
  expect((await accessToken(f.caller(), await server(), owner.id, f.service.send, true)).access).toBe("access-3");
  expect((await accessToken(f.caller(), await server(), owner.id, f.service.send)).access).toBe("access-4");
  // The service sent no new refresh token: the old one is kept.
  f.service.state.override = url => url.pathname === "/token" ? Response.json({ access_token: "kept-refresh", expires_in: 3600 }) : undefined;
  expect(await accessToken(f.caller(), await server(), owner.id, f.service.send)).toMatchObject({ access: "kept-refresh", refresh: "refresh-4" });
  expect(row().lease).toBeNull();
});
it("renews once when two calls need it at the same moment", async () => {
  f.service.state.expiresIn = 60;
  await signedIn();
  const [one, two] = await Promise.all([1, 2].map(async () => accessToken(f.caller(), await server(), owner.id, f.service.send)));
  expect([one.access, two.access, f.service.state.tokenCalls]).toEqual(["access-2", "access-2", 2]);
});
it("ends a sign-in the service ended, with its share, until the person connects again", async () => {
  await signedIn();
  f.sql.exec("UPDATE wong_mcp_connections SET share = 'read'");
  f.service.state.used.add("refresh-1");
  await expect(accessToken(f.caller(), await server(), owner.id, f.service.send, true)).rejects.toThrow(SignInEnded);
  expect(row()).toEqual({ state: "reconnect", tokens: null, share: "none", lease: null });
  await expect(accessToken(f.caller(), await server(), owner.id, f.service.send)).rejects.toThrow(SignInEnded);
  await expect(accessToken(f.caller(), await server(), employee.id, f.service.send)).rejects.toThrow(SignInEnded);
});
it("keeps a token with no way to renew it until it ends", async () => {
  f.service.state.override = url => url.pathname === "/token" ? Response.json({ access_token: "only", expires_in: 60 }) : undefined;
  await signedIn();
  expect((await accessToken(f.caller(), await server(), owner.id, f.service.send)).access).toBe("only");
  await expect(accessToken(f.caller(), await server(), owner.id, f.service.send, true)).rejects.toThrow(SignInEnded);
  expect(row().state).toBe("reconnect");
});
it("keeps the old token when renewing fails while it still works, and says so when it does not", async () => {
  f.service.state.expiresIn = 60;
  await signedIn();
  f.service.state.override = url => url.pathname === "/token" ? new Response("down", { status: 503 }) : undefined;
  expect((await accessToken(f.caller(), await server(), owner.id, f.service.send)).access).toBe("access-1");
  expect(row().lease).toBeNull();
  await expect(accessToken(f.caller(), await server(), owner.id, f.service.send, true)).rejects.toThrow(McpRefusal);
});
it("renews a preview's sign-in with the preview's own client, and ends it when that client is gone", async () => {
  f.service.state.expiresIn = 60;
  await signedIn(preview());
  expect((await accessToken(f.caller(), await server(), owner.id, f.service.send)).origin).toBe(preview().origin);
  expect(f.service.state.registered).toBe(1);
  f.sql.exec("UPDATE wong_mcp_servers SET registration = NULL");
  await expect(accessToken(f.caller(), await server(), owner.id, f.service.send)).rejects.toThrow(SignInEnded);
});
it("waits for another call's renewal instead of asking the service itself", async () => {
  f.service.state.expiresIn = 60;
  await signedIn();
  const hold = () => f.sql.exec(`UPDATE wong_mcp_connections SET refresh_lease_until = '${new Date(Date.now() + 30_000).toISOString()}'`);
  const wait = async (change?: () => Promise<void> | void) => {
    hold();
    const pending = accessToken(f.caller(), await server(), owner.id, f.service.send).catch((error: unknown) => error);
    await new Promise(resolve => setTimeout(resolve, 300));
    await change?.();
    return pending;
  };
  // Nothing changed: the old token still works for a minute.
  expect(await wait()).toMatchObject({ access: "access-1" });
  const place = tokensPlace(f.caller(), "canva", owner.id);
  const put = async (tokens: object) => { f.sql.prepare("UPDATE wong_mcp_connections SET tokens = ?").run(await seal(f.env, place, tokens)); };
  expect(await wait(() => put({ access: "renewed", origin: site.origin }))).toMatchObject({ access: "renewed" });
  await put({ access: "gone", refresh: "r", expires: Date.now() - 1, origin: site.origin });
  expect(await wait()).toBeInstanceOf(SignInBusy);
  expect(await wait(() => { f.sql.exec("UPDATE wong_mcp_connections SET state = 'reconnect'"); })).toBeInstanceOf(SignInEnded);
  expect([f.service.state.tokenCalls, AUTH]).toEqual([1, "https://auth.canva.example"]);
}, 15_000);
