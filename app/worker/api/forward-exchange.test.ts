import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { fixture, owner, site } from "../../tests/employee-access/connections";
import type { KeyEntry } from "../employee-access/key-levels";
import { dispatch } from "./contract";
import { forwardRoutes } from "./forward";
import { body } from "../../tests/body";
import { fakeEnv } from "../../tests/env";

// A made-up shop that gives an ID and a secret, which the app trades at the shop's own token address for a token
// that lasts a day: the client-credentials grant. Each test uses a key id of its own, as each isolate keeps its tokens.
const registry = vi.hoisted(() => {
  const shop = (n: number) => ({ title: "Shop", purpose: "Store orders", secrets: [`SHOP_${n}`, `SHOP_${n}_ID`], levels: ["read"] as ["read"],
    forward: { base: "https://shop.example/admin/api/", secret: `SHOP_${n}`, header: "X-Shop-Token", prefix: "",
      exchange: { url: "https://shop.example/admin/oauth/access_token" } } });
  return { keys: Object.fromEntries([1, 2, 3, 4, 5, 6].map(n => [`shop-${n}`, shop(n)])) satisfies Record<string, KeyEntry> };
});
vi.mock("../keys.ts", () => registry);

const secrets = Object.fromEntries([1, 2, 3, 4, 5, 6].flatMap(n => [[`SHOP_${n}`, `shpss_secret-${n}`], [`SHOP_${n}_ID`, `client-id-${n}`]]));
let f: ReturnType<typeof fixture>;
let send: ReturnType<typeof vi.fn<typeof fetch>>;
let given: number;
/** The shop: its token address hands out token-1, token-2…, each for a day; its API takes only the newest. */
const shop = (answer: (url: string) => Response | null = () => null) => async (address: unknown, init?: RequestInit) => {
  const url = String(address);
  const special = answer(url);
  if (special) return special;
  if (url.endsWith("oauth/access_token")) return Response.json({ access_token: `token-${++given}`, expires_in: 86_399, scope: "read_orders" });
  const sent = new Headers(init?.headers).get("X-Shop-Token");
  return sent === `token-${given}` ? Response.json({ shop: { name: "Claymoo" } }) : Response.json({ errors: "Invalid API key or access token" }, { status: 401 });
};
const ask = (key: string, path = "shop.json", env: object = {}) => {
  const { routes, access } = forwardRoutes(registry.keys, send);
  const route = `POST /api/direct/${key}/read`;
  const request = new Request(`${site.origin}${route.slice(5)}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ method: "GET", path }) });
  return dispatch(routes.get(route)!, request, fakeEnv({ ...f.env, ...secrets, ...env }), { url: new URL(request.url), route: new URL(request.url).pathname, identity: owner }, access.get(route));
};
const trades = () => send.mock.calls.filter(([address]) => String(address).endsWith("oauth/access_token"));

beforeEach(() => {
  f = fixture();
  f.sql.exec("UPDATE wong_access_installation SET keys_enabled = 1");
  given = 0;
  send = vi.fn<typeof fetch>(shop());
  vi.spyOn(console, "log").mockImplementation(() => {});
});
afterEach(() => { f.sql.close(); vi.useRealTimers(); vi.restoreAllMocks(); });

it("trades the ID and the secret once for a token that serves two look-ups, and returns only the shop's answer", async () => {
  for (const _ of [1, 2]) expect(await body(await ask("shop-1"))).toEqual({ status: 200, contentType: "application/json", body: { shop: { name: "Claymoo" } } });
  expect(trades()).toHaveLength(1);
  const [address, init] = trades()[0];
  expect([String(address), init?.method, init?.redirect, String(init?.body)]).toEqual(["https://shop.example/admin/oauth/access_token", "POST", "manual",
    "grant_type=client_credentials&client_id=client-id-1&client_secret=shpss_secret-1"]);
  expect(new Headers(init?.headers).get("Content-Type")).toBe("application/x-www-form-urlencoded");
  // The look-up carries the token in the key's header, never the ID or the secret.
  const [, lookup] = send.mock.calls.at(-1)!;
  expect(lookup?.headers).toEqual({ Accept: "application/json", "X-Shop-Token": "token-1" });
});

it("trades again once the token is a minute from running out, or when the secret changed", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  await ask("shop-2");
  vi.setSystemTime(Date.now() + (86_399 - 61) * 1000);
  await ask("shop-2");
  expect(trades()).toHaveLength(1);
  vi.setSystemTime(Date.now() + 2000);
  expect((await ask("shop-2")).status).toBe(200);
  expect(trades()).toHaveLength(2);
  expect((await ask("shop-2", "shop.json", { SHOP_2: "shpss_secret-new" })).status).toBe(200);
  expect(trades()).toHaveLength(3);
});

it("gets a new token once when the shop refuses the kept one, and keeps no token the shop gave no lifetime for", async () => {
  await ask("shop-3");
  given += 1;
  expect(await body(await ask("shop-3"))).toMatchObject({ status: 200, body: { shop: { name: "Claymoo" } } });
  expect(trades()).toHaveLength(2);
  // A refusal the new token does not cure is the shop's own answer, after one more trade only.
  send.mockImplementation(shop(url => url.endsWith("shop.json") ? Response.json({ errors: "no" }, { status: 401 }) : null));
  expect(await body(await ask("shop-3"))).toMatchObject({ status: 401 });
  expect(trades()).toHaveLength(3);
  send.mockImplementation(shop(url => url.endsWith("oauth/access_token") ? Response.json({ access_token: `token-${++given}` }) : null));
  await ask("shop-4");
  await ask("shop-4");
  expect(trades()).toHaveLength(5);
});

it("refuses with no_token when the shop gives none, at first or on the second try", async () => {
  const code = async (response: Response) => [response.status, (await body(response)).error.code];
  for (const answer of [() => new Response("nope", { status: 400 }), () => Response.json({ token: "wrong-field" }), () => new Response("x".repeat(70_000))]) {
    send.mockImplementation(shop(url => url.endsWith("oauth/access_token") ? answer() : null));
    expect(await code(await ask("shop-5"))).toEqual([502, "no_token"]);
  }
  let first = true;
  send.mockImplementation(shop(url => url.endsWith("oauth/access_token") && !first ? new Response(null, { status: 401 })
    : url.endsWith("shop.json") ? (first = false, Response.json({}, { status: 401 })) : null));
  expect(await code(await ask("shop-5"))).toEqual([502, "no_token"]);
});

it("names no_token among the errors of a key that trades for a token, and of no other", () => {
  const { routes } = forwardRoutes({ ...registry.keys, plain: { title: "Plain", purpose: "No trade", secrets: ["PLAIN"], levels: ["read"],
    forward: { base: "https://plain.example/", secret: "PLAIN", header: "X-Key" } } });
  expect([routes.get("POST /api/direct/shop-1/read")!.errors, routes.get("POST /api/direct/plain/read")!.errors].map(errors => "no_token" in errors)).toEqual([true, false]);
});

it("refuses an answer that carries the token, the ID or the secret", async () => {
  for (const echoed of ["token-", "client-id-6", "shpss_secret-6"]) {
    send.mockImplementation(shop(url => url.endsWith("shop.json") ? Response.json({ echo: `${echoed}${echoed === "token-" ? given : ""}` }) : null));
    expect((await body(await ask("shop-6"))).error.code, echoed).toBe("bad_answer");
  }
});
