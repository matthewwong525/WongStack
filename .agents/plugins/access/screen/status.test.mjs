import { expect, it } from "vitest";
import { canRetry, listed, signInLine } from "./status.mjs";

const status = (changes = {}) => ({ ownerEmail: "owner@example.com", viewer: { email: "owner@example.com", owner: true },
  environment: "live", key: "ready", started: true, imported: 0, keysStarted: true, unticked: { people: [], roles: [] },
  apps: [{ id: "hello", title: "Hello", description: "" }, { id: "orders", title: "Orders", description: "" }],
  keys: [], roles: [], people: [], work: [], project: "ready", ...changes });
const person = (changes = {}) => ({ email: "bo@example.com", status: "active", settled: true, role: null, apps: ["hello"], keys: {}, ...changes });

it("gives each person one sign-in status", () => {
  expect(signInLine(person(), status())).toEqual({ text: "Can sign in", unfinished: false });
  expect(signInLine(person({ settled: false }), status())).toEqual({ text: "Can't sign in yet", unfinished: true });
  expect(signInLine(person({ settled: false }), status({ environment: "practice", key: "practice" }))).toEqual({ text: "Practice list", unfinished: false });
  const removed = person({ status: "removed", apps: [] });
  expect(signInLine(removed, status())).toEqual({ text: "Removed", unfinished: false });
  expect(signInLine({ ...removed, settled: false }, status())).toEqual({ text: "Removed · still signing out", unfinished: true });
  expect(signInLine(removed, status({ work: [{ kind: "policy", status: "ready" }, { kind: "sessions", status: "failed" }] }))).toEqual({ text: "Removed · still signing out", unfinished: true });
  expect(signInLine(removed, status({ work: [{ kind: "policy", status: "failed" }, { kind: "sessions", status: "ready" }] }))).toEqual({ text: "Removed", unfinished: false });
  expect(signInLine({ ...removed, settled: false }, status({ environment: "practice", key: "practice" }))).toEqual({ text: "Removed", unfinished: false });
});

it("says Listed, never a sign-in state, for a project with no sign-in list", () => {
  const none = status({ key: undefined });
  expect(listed(none)).toBe(false);
  expect([signInLine(person(), none), signInLine(person({ settled: false }), none)]).toEqual([{ text: "Listed", unfinished: false }, { text: "Listed", unfinished: false }]);
  // A removed person is still Removed, and never still signing out: there is no list to sign out of.
  expect(signInLine(person({ status: "removed", settled: false }), none)).toEqual({ text: "Removed", unfinished: false });
  expect(canRetry(none)).toBe(false);
});

it("offers Try again only where it can work", () => {
  expect(canRetry(status())).toBe(true);
  for (const changes of [{ key: "missing" }, { started: false }, { environment: "practice", key: "practice" }]) expect(canRetry(status(changes))).toBe(false);
});
