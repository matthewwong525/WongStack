import { readdirSync, readFileSync } from "node:fs";
import { expect, it } from "vitest";

// An Access read or save takes a `Core`, the pass `ownerCore()` hands out once it has checked who is asking.
// Asserting one by hand skips that check, and nothing else would notice.
const asserted = /\bas\s+(?:Owner)?Core\b/g;
const home = "employee-access/core.ts";
const reason = "asserts an Access pass by hand; take the Core that ownerCore() returns, and narrow it with isOwner()";
const offenders = (sources: Record<string, string>) =>
  Object.entries(sources).filter(([file, text]) => file !== home && text.match(asserted)).map(([file]) => `worker/${file} ${reason}`);

it("flags a pass asserted by hand, naming the file and the reason", () => {
  expect(offenders({ "made.ts": "return { db, env, owner: true } as Core;", "raised.ts": "managerWrites(core as OwnerCore, email, true)",
    "twice.ts": "const core = {} as unknown as Core;", "taken.ts": "export async function save(core: Core) { if (isOwner(core)) await owned(core); }",
    "other.ts": "const view = value as CoreView; // it has Core in it", [home]: "return { db, env } as Core;" }))
    .toEqual([`worker/made.ts ${reason}`, `worker/raised.ts ${reason}`, `worker/twice.ts ${reason}`]);
});

it("keeps every Worker source from asserting a pass, and the sign-in check to one", () => {
  const root = new URL("./", import.meta.url);
  const files = readdirSync(root, { recursive: true, encoding: "utf8" })
    .filter(file => file.endsWith(".ts") && !file.endsWith(".test.ts") && !file.endsWith(".d.ts"));
  const sources = Object.fromEntries(files.map(file => [file, readFileSync(new URL(file, root), "utf8")]));
  expect(files).toContain("employee-access/members.ts");
  expect(offenders(sources)).toEqual([]);
  expect(sources[home].match(asserted)).toHaveLength(1);
});

// A test file is not type checked, so the two lines that must never compile live in a file that is.
it("has the type check read the lines that must not compile", () => {
  expect(readFileSync(new URL("../tsconfig.worker.json", import.meta.url), "utf8")).toContain('"tests/employee-access/unchecked-caller.ts"');
});
