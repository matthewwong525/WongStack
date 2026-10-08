import { expect, it, vi } from "vitest";
import { z } from "zod";
import { defineAction, registrations, type Action } from "../api/contract";
import type { RouteAccess } from "./policy";
import { listSkills, skills } from "./skills";

// The registry the skills are read against: Project code is a key like any other.
const registry = vi.hoisted(() => ({ keys: {
  stripe: { title: "Stripe", secrets: ["STRIPE_SECRET_KEY"] }, bank: { title: "Bank", secrets: ["BANK_SECRET"] },
  code: { title: "Project code", secrets: ["WONG_CODE_READ"], levels: ["read"], alone: true },
} as Record<string, object> }));
vi.mock("../keys.ts", () => registry);

const action = (operationId: string, extra: Partial<Action> = {}) => defineAction({ operationId, summary: "Orders", description: "Synthetic order action",
  input: z.strictObject({}), output: z.strictObject({ ok: z.boolean() }), encoding: "none", effect: "read", agentAvailable: true,
  errors: {}, examples: [], handler: () => Response.json({ ok: true }), ...extra } as Action);
// Orders looks things up and changes them with Stripe. One main route serves two areas with the bank key, one is a
// reviewed exception, one has no mapping, and one lists a key nobody registered.
const routes = [
  ...registrations(new Map([["GET lookup", action("orders.lookup")], ["POST refund", action("orders.refund", { effect: "write" })],
    ["POST send", action("orders.send", { effect: "external", keys: [] } as Partial<Action>)]]), "orders", undefined, ["stripe"]),
  ...registrations(new Map([["GET /api/report", action("main.report")], ["GET /api/health", action("main.health")], ["GET /api/unmapped", action("main.unmapped")],
    ["GET /api/old", action("main.old")]]), "main", new Map<string, RouteAccess>([["GET /api/report", { apps: ["orders", "payroll"], keys: ["bank"] }],
    ["GET /api/health", { kind: "infrastructure" }], ["GET /api/old", { apps: ["payroll"], keys: ["retired"] }]])),
];
const file = (actions: unknown, title: unknown = "Refund a customer") => ({ title, actions });
const one = (actions: string[]) => listSkills({ "../../../.agents/skills/refund/actions.json": file(actions) }, routes)[0];

it("works out what a skill needs from the routes its actions name: the highest level per area and per key, and Project code", () => {
  expect(one(["orders.lookup"])).toEqual({ id: "refund", title: "Refund a customer", areas: { orders: "read" }, keys: { code: "read", stripe: "read" }, direct: {} });
  // A change anywhere in an area raises the whole area, whichever action is listed first.
  for (const actions of [["orders.lookup", "orders.refund"], ["orders.refund", "orders.lookup"]]) {
    expect(one(actions), actions.join()).toMatchObject({ areas: { orders: "write" }, keys: { code: "read", stripe: "write" } });
  }
  // Sending is a change too, and an action that lists no key needs none.
  expect(one(["orders.send"])).toMatchObject({ areas: { orders: "write" }, keys: { code: "read" } });
  // A shared route needs each of its areas, and a key at the level the call needs.
  expect(one(["main.report", "orders.refund"])).toMatchObject({ areas: { orders: "write", payroll: "read" }, keys: { code: "read", stripe: "write", bank: "read" } });
  // A reviewed exception and a route with no mapping need no area; a key nobody registered is not one to give.
  expect(one(["main.health", "main.unmapped"])).toMatchObject({ areas: {}, keys: { code: "read" } });
  expect(one(["main.old"])).toMatchObject({ areas: { payroll: "read" }, keys: { code: "read" } });
});

it("lists every skill folder that declares actions, sorted, and none when no skill does", () => {
  expect(listSkills({}, routes)).toEqual([]);
  const list = listSkills({ "../../../.agents/skills/weekly-summary/actions.json": file(["orders.lookup"], "  Weekly summary "),
    "../../../.agents/skills/refund/actions.json": file(["orders.refund"]) }, routes);
  expect(list.map(skill => [skill.id, skill.title])).toEqual([["refund", "Refund a customer"], ["weekly-summary", "Weekly summary"]]);
  // An install whose registry has no Project code key asks for none.
  const { code } = registry.keys;
  delete registry.keys.code;
  expect(one(["orders.lookup"]).keys).toEqual({ stripe: "read" });
  registry.keys.code = code;
});

it("fails on a file with no title or no actions, and on an action no route registers, naming the skill", () => {
  for (const declared of [{ actions: ["orders.lookup"] }, file(["orders.lookup"], "  "), file(["orders.lookup"], 3), file([]), file("orders.lookup"),
    file([3]), { title: "Refund a customer" }, null, "orders.lookup"]) {
    expect(() => listSkills({ "../../../.agents/skills/refund/actions.json": declared }, routes), JSON.stringify(declared))
      .toThrow(".agents/skills/refund/actions.json needs a title and a list of actions.");
  }
  // A memory read is no company action, and neither is an action another build registers.
  for (const id of ["orders.missing", "memory.search"]) {
    expect(() => one(["orders.lookup", id]), id).toThrow(`.agents/skills/refund/actions.json lists ${id}, which no route registers.`);
  }
});

it("reads every skill of this build against the routes this build registers", () => {
  const built = skills();
  expect(built.map(skill => skill.id)).toEqual(Object.keys(import.meta.glob("../../../.agents/skills/*/actions.json")).map(path => path.split("/").at(-2)).sort());
  for (const skill of built) expect([skill.title.trim() !== "", skill.keys.code], skill.id).toEqual([true, "read"]);
});
