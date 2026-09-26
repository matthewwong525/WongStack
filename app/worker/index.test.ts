import { describe, expect, it } from "vitest";

import worker from "./index";

// The routing contract the SPA fallback sits in front of: `/api/*`, `/_memory/*`, and `/apps/*`
// are the Worker's, everything else is not found and is left to the static assets.
describe("worker routing", () => {
  const assets = { fetch: async () => new Response("asset", { status: 200 }) };
  const call = (path: string) =>
    worker.fetch(
      new Request(`https://example.com${path}`),
      { ASSETS: assets } as unknown as Env,
      {} as ExecutionContext,
    );

  it("answers /api/* with the JSON payload", async () => {
    const response = await call("/api/hello");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ name: "Cloudflare" });
  });

  it("answers the API root prefix too", async () => {
    const response = await call("/api/");

    expect(response.status).toBe(200);
  });

  it("sends /_memory/* to the memory route, which answers 404 with no memory store bound", async () => {
    const response = await call("/_memory/accounts/a/d1/database/d/query");

    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({
      errors: [{ code: "no_store" }],
    });
  });

  it("sends /apps/* to the mini-app route, which serves the static assets", async () => {
    const response = await call("/apps/tips/");

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("asset");
  });

  it("answers anything else with 404", async () => {
    for (const path of ["/", "/index.html", "/api", "/apiary/thing", "/_memory", "/apps", "/appstore/"]) {
      const response = await call(path);
      expect(response.status, path).toBe(404);
    }
  });
});
