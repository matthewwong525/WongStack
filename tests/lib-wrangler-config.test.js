import { describe, expect, it } from "vitest";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readDatabaseName } from "../scripts/lib-wrangler-config.mjs";

// `readDatabaseName` is the rule that decides which database a pipeline script
// touches. Reading production's name where staging was meant is the failure
// this helper exists to prevent, and it is silent — the deploy succeeds against
// the wrong database. `cf-build.sh` implements the identical rule in bash, so
// these cases are also the contract those two must agree on.
function withConfig(body, run) {
  const dir = mkdtempSync(join(tmpdir(), "wrangler-cfg-"));
  const path = join(dir, "wrangler.jsonc");
  writeFileSync(path, body);
  try {
    return run(path);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const CONFIG = `{
  "name": "demo",
  "d1_databases": [{ "binding": "DB", "database_name": "demo-prod", "database_id": "p" }],
  "env": {
    "staging": {
      "name": "demo-staging",
      "d1_databases": [{ "binding": "DB", "database_name": "demo-staging-db", "database_id": "s" }]
    }
  }
}`;

describe("readDatabaseName", () => {
  it("reads the top-level database name with no environment", () => {
    withConfig(CONFIG, (p) => {
      expect(readDatabaseName(p)).toBe("demo-prod");
    });
  });

  it("reads the name declared inside an environment block", () => {
    withConfig(CONFIG, (p) => {
      expect(readDatabaseName(p, "staging")).toBe("demo-staging-db");
    });
  });

  it("does not fall back to production when an environment is asked for", () => {
    // The dangerous outcome: a staging request silently answered with the
    // production database. Scanning starts at the environment key precisely so
    // this cannot happen.
    withConfig(CONFIG, (p) => {
      expect(readDatabaseName(p, "staging")).not.toBe("demo-prod");
    });
  });

  it("reads a toml-shaped config too", () => {
    const toml = `name = "demo"
[[d1_databases]]
binding = "DB"
database_name = "demo-prod"
`;
    const dir = mkdtempSync(join(tmpdir(), "wrangler-cfg-"));
    const path = join(dir, "wrangler.toml");
    writeFileSync(path, toml);
    try {
      expect(readDatabaseName(path)).toBe("demo-prod");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
