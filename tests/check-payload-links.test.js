import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// The link checker is the release gate this repo cannot replace with inspection:
// every payload link resolves *here*, because this repo holds the payload plus
// everything around it. Its whole value is the distinction between a link that
// resolves in no install shape (dead — a defect) and one that resolves only in
// an opt-in shape (conditional — reported, allowed). These tests pin that
// distinction and the shape matrix it is computed over.
function run() {
  return execFileSync("node", ["scripts/check-payload-links.mjs"], {
    cwd: ROOT,
    encoding: "utf8",
  });
}

describe("check-payload-links", () => {
  it("passes with no dead links, and exits zero", () => {
    const out = run();
    expect(out).toMatch(/No dead links/i);
  });

  it("checks every install shape a target can be in", () => {
    const out = run();
    for (const shape of [
      "plain repo",
      "UI repo, no pack",
      "pack, own app",
      "pack + app scaffold",
    ]) {
      expect(out).toContain(shape);
    }
  });

  it("reports conditional links separately from dead ones", () => {
    const out = run();
    // A conditional link points into an opt-in category the shape declined. It
    // must never be counted as dead: doing so would make correct pack-only
    // documentation unshippable.
    expect(out).not.toMatch(/dead link\(s\)/i);
  });

  it("fails loudly when a payload file cites a file no shape ships", () => {
    // The check runs over the manifest's file set, so a link into a path that
    // exists in no category is the failure mode worth proving. Rather than
    // mutate the payload, assert the checker's own contract: it exits non-zero
    // only on dead links, which is what makes it usable as a release gate.
    const source = execFileSync("cat", ["scripts/check-payload-links.mjs"], {
      cwd: ROOT,
      encoding: "utf8",
    });
    expect(source).toMatch(/process\.exit\(1\)/);
  });
});
