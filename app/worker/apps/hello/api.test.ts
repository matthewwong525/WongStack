import { expect, it } from "vitest";
import { handleApp } from "../index";

const get = (path: string, method = "GET") =>
  handleApp(new Request(`https://workspace.example.com${path}`, { method }), {} as Env, null);

it("the greeting names the person", async () => {
  const response = await get("/apps/hello/api/greeting?name=Ada");
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ message: "Hello, Ada!" });
});

it("no name greets the world, and a long one is cut to 40 characters", async () => {
  expect(await (await get("/apps/hello/api/greeting?name=%20")).json()).toEqual({ message: "Hello, world!" });
  expect(await (await get("/apps/hello/api/greeting")).json()).toEqual({ message: "Hello, world!" });
  expect(await (await get(`/apps/hello/api/greeting?name=${"a".repeat(50)}`)).json()).toEqual({
    message: `Hello, ${"a".repeat(40)}!`,
  });
});

it("an unknown route, or a known one with the wrong method, is not found", async () => {
  for (const response of [await get("/apps/hello/api/nothing"), await get("/apps/hello/api/greeting", "POST")]) {
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Not found" });
  }
});

it("a route named for an inherited property is not found", async () => {
  for (const route of ["constructor", "__proto__", "toString"]) {
    expect((await get(`/apps/hello/api/${route}`)).status, route).toBe(404);
  }
});
