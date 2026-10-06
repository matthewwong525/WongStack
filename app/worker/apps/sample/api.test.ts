import { expect, it } from "vitest";
import type { AccessIdentity } from "../../access";
import { areas, screens } from "../../employee-access/catalogue";
import { handleApp } from "../index";
import { description, title } from "./api";

const person: AccessIdentity = { id: "owner@example.com", kind: "user", claims: { aud: "a", iss: "i", exp: 0 } };
const call = (route: string, init?: RequestInit, identity: AccessIdentity | null = person) =>
  handleApp(new Request(`https://workspace.example.com/apps/sample/api/${route}`, init), {} as Env, identity);
const mark = (id: string) => call("mark", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });

it("is an area with no screen: Access lists it by the words its api.ts exports, and Home has no card for it", () => {
  expect(areas().find(area => area.id === "sample")).toEqual({ id: "sample", title, description, screen: false });
  expect(screens()).not.toContain("sample");
});

it("lists three made-up records", async () => {
  const response = await call("records");
  expect(response.status).toBe(200);
  expect((await response.json()).records.map((record: { id: string; done: boolean }) => [record.id, record.done])).toEqual([["r-1", true], ["r-2", false], ["r-3", false]]);
});

it("answers a mark with the record marked done, and saves nothing", async () => {
  const marked = await mark("r-2");
  expect([marked.status, await marked.json()]).toEqual([200, { id: "r-2", customer: "Bo Example", total: 18, done: true }]);
  expect((await (await call("records")).json()).records[1].done).toBe(false);
});

it("says so when no record has the id, and asks for a signed-in caller", async () => {
  const missing = await mark("r-9");
  expect([missing.status, (await missing.json()).error]).toEqual([404, expect.objectContaining({ code: "not_found", message: "No sample record has that id." })]);
  expect((await call("records", undefined, null)).status).toBe(401);
  expect((await call("mark")).status).toBe(404);
});
