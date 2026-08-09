import { describe, expect, it } from "vitest";

import worker from "./index";

// The routing contract the SPA fallback sits in front of: `/api/*` is the
// Worker's, everything else is not found and is left to the static assets.
describe("worker routing", () => {
  const call = (path: string) =>
    worker.fetch(
      new Request(`https://example.com${path}`),
      {} as Env,
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

  it("answers anything else with 404", async () => {
    for (const path of ["/", "/index.html", "/api", "/apiary/thing"]) {
      const response = await call(path);
      expect(response.status, path).toBe(404);
    }
  });
});
