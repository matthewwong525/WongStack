import { expect, it } from "vitest";
import { holders, holdersLine, offered } from "./subjects.mjs";

const key = (id, title = id, levels = ["read", "write"]) => ({ id, title, levels, saved: true, setup: false, alone: false });
const person = (email, changes = {}) => ({ email, status: "active", settled: true, role: null, apps: [], keys: {}, ...changes });
// Sales has Hello, with Stripe at Read and the project. The office has nothing yet. Kim has her own set.
const sales = { id: "sales", name: "Sales", apps: ["hello"], keys: { stripe: "read", code: "read" } };
const office = { id: "office", name: "Office", apps: [], keys: {} };
const kim = person("kim@shop.com", { apps: ["hello", "tips"], keys: { stripe: "write", code: "read" } });
// A person who holds a role is sent with the role's set on their own row.
const inSales = { role: "sales", apps: sales.apps, keys: sales.keys };
const status = { ownerEmail: "owner@example.com", viewer: { email: "owner@example.com", owner: true }, environment: "live", key: "ready", started: true,
  imported: 0, keysStarted: true, unticked: { people: [], roles: [] },
  apps: [{ id: "hello", title: "Hello", description: "" }, { id: "tips", title: "Tip calculator", description: "" }, { id: "payroll", title: "Payroll", description: "" }],
  keys: [key("stripe", "Stripe"), key("code", "Project code", ["read"])], roles: [office, sales],
  people: [person("gone@shop.com", { status: "removed" }), kim, person("lee@shop.com", inSales), person("sam@shop.com", inSales)], work: [], project: "ready" };

it("names who holds a role, and nobody for a role with no one or not saved yet", () => {
  expect(holdersLine(status, "sales")).toBe("lee@shop.com, sam@shop.com");
  expect(holdersLine(status, "office")).toBe("nobody yet");
  expect(holdersLine(status)).toBe("nobody yet");
  expect([holders(status, "sales"), holders(status, "office"), holders(status)]).toEqual([["lee@shop.com", "sam@shop.com"], [], []]);
});

it("offers the built-in role to the owner alone, and every other role to whoever manages", () => {
  const admin = { id: "admin", name: "Admin", builtIn: true, apps: ["hello", "tips", "payroll"], keys: { stripe: "write", code: "read" } };
  const names = owner => offered({ ...status, roles: [admin, office, sales], viewer: { email: "kim@shop.com", owner } }).map(role => role.name);
  expect([names(true), names(false)]).toEqual([["Admin", "Office", "Sales"], ["Office", "Sales"]]);
});
