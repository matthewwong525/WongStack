import { readdirSync, readFileSync } from "node:fs";
import { expect, it } from "vitest";

// The Workers runtime throws on `redirect: "error"` before a request leaves; Node accepts it,
// so no other test here notices. Use "manual" and check the status.
const refused = /redirect\s*:\s*["'`]error["'`]/;
const reason = 'passes redirect: "error", which a Worker\'s fetch rejects; use "manual" and check the status';
const offenders = (sources: Record<string, string>) =>
  Object.entries(sources).filter(([, text]) => refused.test(text)).map(([file]) => `worker/${file} ${reason}`);

it("flags the redirect mode a Worker's fetch rejects, naming the file and the reason", () => {
  expect(offenders({ "old.ts": 'await fetch(url, { method, redirect: "error" })', "new.ts": 'await fetch(url, { redirect: "manual" })',
    "single.ts": "fetch(url, { redirect:'error' })" })).toEqual([`worker/old.ts ${reason}`, `worker/single.ts ${reason}`]);
});

it("keeps every Worker source off that redirect mode", () => {
  const root = new URL("./", import.meta.url);
  const files = readdirSync(root, { recursive: true, encoding: "utf8" })
    .filter(file => file.endsWith(".ts") && !file.endsWith(".test.ts") && !file.endsWith(".d.ts"));
  expect(files).toContain("employee-access/provider.ts");
  expect(offenders(Object.fromEntries(files.map(file => [file, readFileSync(new URL(file, root), "utf8")])))).toEqual([]);
});
