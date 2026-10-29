// The week board tests' shared parts (worker/apps/inbox/tasks/): a fresh board, its owner and others, and one call
// to a board route.
import type { AccessIdentity } from "../worker/access.ts";
import { handleApp } from "../worker/apps/index.ts";
import { body, type Loose } from "./body.ts";
import { fakeEnv } from "./env.ts";
import { database } from "./employee-access/connections.ts";

export const OWNER = "owner@example.com";
export const WEEK = "2026-10-05";
export const NEXT = "2026-10-12";

export const person = (email: string): AccessIdentity => ({ kind: "user", id: email, claims: { email, sub: `${email}-subject`,
  iss: "https://business.cloudflareaccess.com", aud: "business-app", exp: 9999999999 } });
const owner = person(OWNER);
export const checker: AccessIdentity = { kind: "service", id: "checker.access", claims: { common_name: "checker.access",
  iss: "https://business.cloudflareaccess.com", aud: "business-app", exp: 9999999999 } };

/** A fresh board, and a call to one of its routes: GET and DELETE send the input as a query, the rest as JSON. */
export function board(vars: Record<string, string> = { WONG_OWNER_EMAIL: OWNER }) {
  const db = database();
  async function call(method: string, route: string, input?: Record<string, unknown>, who: AccessIdentity | null = owner) {
    const query = ["GET", "DELETE"].includes(method) && input ? `?${new URLSearchParams(input as Record<string, string>)}` : "";
    const sends = !query && input !== undefined;
    const response = await handleApp(new Request(`https://business.example.com/apps/inbox/api/${route}${query}`, {
      method, ...(sends && { headers: { "content-type": "application/json" }, body: JSON.stringify(input) }) }),
    fakeEnv({ DB: db.DB, ...vars }), who);
    return { status: response.status, json: await body(response) };
  }
  /** Adds a task through the screen's route and gives it back. */
  const add = async (title: string, slot = "mon", extra: Record<string, unknown> = {}) =>
    (await call("POST", "task", { title, week: WEEK, slot, ...extra })).json.task;
  /** The titles of one slot of a week, in the order the board shows them. */
  const titles = async (slot: string, week = WEEK) =>
    ((await call("GET", "week", { week })).json.plan.slots[slot] as readonly Loose[]).map(task => task.title);
  return { db, call, add, titles };
}
