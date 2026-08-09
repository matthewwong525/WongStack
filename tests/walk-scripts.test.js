import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { mkdtempSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WALK = resolve(ROOT, ".claude/skills/walk/scripts/walk-staging.sh");
const RUNNER = resolve(ROOT, ".claude/skills/walk/scripts/walk-runner.sh");

function sh(args, opts = {}) {
  try {
    return {
      status: 0,
      out: execFileSync("bash", args, { cwd: ROOT, encoding: "utf8", ...opts }),
    };
  } catch (err) {
    return { status: err.status, out: `${err.stdout ?? ""}${err.stderr ?? ""}` };
  }
}

// The walk scripts print a verdict vocabulary the skill reads to decide what to
// report. Those words are a contract: the scripts must never print SUCCESS or
// FAILURE, because a run that *looks* graded when nothing judged it is the one
// failure mode the whole capability is arranged to prevent.
describe("walk-staging.sh phase contract", () => {
  it("is syntactically valid", () => {
    expect(sh(["-n", WALK]).status).toBe(0);
    expect(sh(["-n", RUNNER]).status).toBe(0);
  });

  it("scout-check answers without touching the network or a credential", () => {
    const { out } = sh([WALK, "scout-check"]);
    expect(out).toMatch(/^RESULT: (READY|UNKNOWN)/m);
  });

  it("never prints a graded verdict — those words belong to the grader", () => {
    const source = execFileSync("cat", [WALK, RUNNER], { encoding: "utf8" });
    expect(source).not.toMatch(/^\s*emit (SUCCESS|FAILURE)/m);
  });

  it("prints usage and fails on an unknown phase", () => {
    const { status, out } = sh([WALK, "not-a-phase"]);
    expect(status).not.toBe(0);
    expect(out).toContain("usage: walk-staging.sh");
  });

  it("refuses to remove a directory it did not create", () => {
    const outsider = mkdtempSync(join(tmpdir(), "not-a-walk-"));
    const { status, out } = sh([WALK, "cleanup", outsider]);
    expect(status).toBe(1);
    expect(out).toMatch(/refusing to remove/);
    expect(existsSync(outsider)).toBe(true);
  });

  it("removes a run directory it did create", () => {
    const runDir = mkdtempSync(join(tmpdir(), "wong-walk-"));
    const { status } = sh([WALK, "cleanup", runDir]);
    expect(status).toBe(0);
    expect(existsSync(runDir)).toBe(false);
  });

  it("reports NONE when a run has no journeys, rather than failing", () => {
    const runDir = mkdtempSync(join(tmpdir(), "wong-walk-"));
    mkdirSync(join(runDir, "journeys"), { recursive: true });
    const { out } = sh([WALK, "run", runDir, "https://example.com/", "1"]);
    expect(out).toMatch(/^RESULT: NONE/m);
    sh([WALK, "cleanup", runDir]);
  });

  it("carries no Cloudflare browser endpoint or credential", () => {
    // The browser stopped being a vendor service; a reintroduced endpoint or
    // bearer token here would silently re-couple a core verb to one stack.
    const source = execFileSync("cat", [WALK, RUNNER], { encoding: "utf8" });
    expect(source).not.toMatch(/browser-rendering|WALK_CF_ACCOUNT_ID/);
  });
});

describe("walk-runner.sh", () => {
  it("refuses to start without a run directory and URL", () => {
    const { status, out } = sh([RUNNER], { env: { ...process.env, WALK_URL: "" } });
    expect(status).toBe(2);
    expect(out).toMatch(/need <run-dir> and WALK_URL/);
  });

  it("treats a run with no journeys as a driver error, not a silent pass", () => {
    const runDir = mkdtempSync(join(tmpdir(), "wong-walk-"));
    mkdirSync(join(runDir, "journeys"), { recursive: true });
    const { status } = sh([RUNNER, runDir], {
      env: { ...process.env, WALK_URL: "https://example.com/" },
    });
    expect(status).toBe(2);
    sh([WALK, "cleanup", runDir]);
  });

  it("feeds the scout's batch file to the tool unread", () => {
    // Nothing may sit between what the scout wrote and what runs: the driver
    // must not parse, rewrite, or reorder the journey.
    const runDir = mkdtempSync(join(tmpdir(), "wong-walk-"));
    mkdirSync(join(runDir, "journeys"), { recursive: true });
    writeFileSync(join(runDir, "journeys", "x.batch.json"), "[]");
    const source = execFileSync("cat", [RUNNER], { encoding: "utf8" });
    expect(source).toMatch(/batch --bail --json <"\$batch"/);
    sh([WALK, "cleanup", runDir]);
  });
});
