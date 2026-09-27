import { expect, it } from "vitest";

import { API_PREFIX, handleApi } from "./router";

const call = (path: string, method = "GET") =>
  handleApi(new Request(`https://example.com${path}`, { method }), {} as Env);

const expectNotFound = async (response: Response) => {
  expect(response.status).toBe(404);
  expect(await response.json()).toEqual({ error: "Not found" });
};

it("serves the API under /api/", () => {
  expect(API_PREFIX).toBe("/api/");
});

it("answers the health route", async () => {
  const response = await call("/api/health");

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ ok: true });
});

it("answers an unknown path with 404", async () => {
  for (const path of ["/api/nothing", "/api/", "/api/health/", "/api/health/extra"]) {
    await expectNotFound(await call(path));
  }
});

it("answers a known path with the wrong method with 404", async () => {
  await expectNotFound(await call("/api/health", "POST"));
});

it("does not match a property every object inherits", async () => {
  for (const path of ["/api/constructor", "/api/__proto__", "/api/toString"]) {
    await expectNotFound(await call(path));
  }
});
