import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { ConfigEnv, UserConfig } from "vite";
import { expect, it, vi } from "vitest";
import lineWorker, { Line } from "./line-worker";
import { Line as InboxLine } from "./apps/inbox/line";

const cloudflare = vi.hoisted(() => vi.fn((options: unknown) => ({ name: "cloudflare", options })));
vi.mock("@cloudflare/vite-plugin", () => ({ cloudflare }));

it("exports the inbox's line and answers 404 to any request", async () => {
  expect(Line).toBe(InboxLine);
  const answer = await lineWorker.fetch();
  expect(answer.status).toBe(404);
});

it("runs the line beside the app in local dev, and leaves it out of a build", async () => {
  const { default: config } = await import("../vite.config") as { default: (env: ConfigEnv) => UserConfig };
  const at = (command: ConfigEnv["command"]) => (config({ command, mode: "test" }), cloudflare.mock.lastCall?.[0]);
  expect(at("serve")).toEqual({ auxiliaryWorkers: [{ configPath: "./wrangler.line.jsonc" }] });
  expect(at("build")).toEqual({});
});

/** Every file `entry` reaches through relative imports, itself included. */
function reached(entry: string, found = new Set<string>()) {
  if (found.has(entry)) return found;
  found.add(entry);
  for (const [, path] of readFileSync(entry, "utf8").matchAll(/^(?:import|export)\b[^;]*?from\s+"(\.[^"]+)"/gms)) {
    reached(resolve(dirname(entry), path), found);
  }
  return found;
}

it("reaches no Vite-only import.meta.glob, since wrangler bundles the line alone and the Worker would fail to start", () => {
  const files = [...reached(fileURLToPath(new URL("./line-worker.ts", import.meta.url)))];
  expect(files.some(file => file.endsWith("inbox/schedule-store.ts"))).toBe(true);
  expect(files.filter(file => readFileSync(file, "utf8").includes("import.meta.glob"))).toEqual([]);
});
