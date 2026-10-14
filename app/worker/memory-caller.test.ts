import { describe, expect, it, vi } from "vitest";
import * as access from "./access.ts";
import { memoryCaller, memoryRole } from "./memory-caller.ts";

const current = (manages: boolean, keys: ReadonlyMap<string, "read" | "write"> | null) =>
  ({ state: "current", role: "employee", manages, revision: 1, apps: new Set<string>(), keys, keysStarted: keys !== null }) as const;

describe("memoryRole", () => {
  it("makes the owner and Admins admins, Project code holders members, and anyone else a reader", () => {
    expect(memoryRole(current(true, new Map()))).toBe("admin");
    expect(memoryRole(current(false, new Map([["code", "write"]])))).toBe("member");
    expect(memoryRole(current(false, new Map([["code", "read"]])))).toBe("member");
    expect(memoryRole(current(false, new Map()))).toBe("reader");
  });
  it("keeps everyone a member until key levels start, and the manager an admin", () => {
    expect(memoryRole(current(false, null))).toBe("member");
    expect(memoryRole({ state: "not_started", role: "employee", manages: false })).toBe("member");
    expect(memoryRole({ state: "not_started", role: "owner", manages: true })).toBe("admin");
  });
  it("reads an install with no owner as a reader and refuses a removed or unknown person", () => {
    expect(memoryRole({ state: "legacy" })).toBe("reader");
    for (const state of ["denied", "unavailable"] as const) expect(memoryRole({ state })).toBeNull();
  });
});

describe("memoryCaller", () => {
  it("refuses a request with no verified sign-in", async () => {
    expect(await memoryCaller(new Request("https://workspace.example.com/_memory/x"), {})).toBeNull();
  });

  it("takes the subject and email from a verified person, with the role Access gives", async () => {
    const claims = { aud: "a", iss: "i", exp: Math.floor(Date.now() / 1000) + 600, sub: "subject-1", email: "ana@example.com" };
    vi.spyOn(access, "getAccessIdentity").mockResolvedValue({ id: "ana@example.com", kind: "user", claims });
    const request = new Request("https://workspace.example.com/_memory/x");
    expect(await memoryCaller(request, {})).toEqual({ role: "reader", subject: "subject-1", email: "ana@example.com" });
    expect(await memoryCaller(request, { WONG_OWNER_EMAIL: "owner@example.com" })).toBeNull();
    vi.restoreAllMocks();
  });
});
