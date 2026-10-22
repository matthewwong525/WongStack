import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { expect, it } from "vitest";

// The file that adds `start` and `agent` to the inbox's kinds, run on a database the files before it left holding rows.
const AGENTS = "20261024120000_inbox_agent_items.sql";
const folder = new URL("../../../../schema/migrations/", import.meta.url);
const read = (file: string) => readFileSync(new URL(file, folder), "utf8");

it("rebuilds the inbox's items with start and agent among their kinds, keeping every row and every tap", () => {
  const sql = new DatabaseSync(":memory:");
  const earlier = readdirSync(folder).filter(file => file.endsWith(".sql") && file < AGENTS).sort();
  expect(earlier).toContain("20261023120000_inbox_link_items.sql");
  for (const file of earlier) sql.exec(read(file));
  const row = sql.prepare(`INSERT INTO inbox_items (installation_id, email, id, kind, title, workspace, body, actions, version,
    created_at, closes_at, closed_at) VALUES ('', ?, ?, ?, 'Title', 'desk', '{"state":"working"}', '[]', 'v1', 1, 2, ?)`);
  row.run("sam@example.com", "a".repeat(32), "link", null);
  row.run("sam@example.com", "b".repeat(32), "approval", 5);
  row.run("jo@example.com", "a".repeat(32), "plan", null);
  sql.exec(`INSERT INTO inbox_taps VALUES ('', 'sam@example.com', '${"c".repeat(32)}', '${"b".repeat(32)}', 'approve', '', 'v1', 1, 'sent', 1, 2)`);
  const rows = () => sql.prepare("SELECT * FROM inbox_items ORDER BY email, id").all();
  const before = rows();
  for (const kind of ["start", "agent"]) expect(() => row.run("sam@example.com", "d".repeat(32), kind, null)).toThrow(/CHECK/);
  sql.exec(read(AGENTS));
  expect(rows()).toEqual(before);
  expect(sql.prepare("SELECT COUNT(*) AS taps FROM inbox_taps").get()).toEqual({ taps: 1 });
  row.run("sam@example.com", "d".repeat(32), "start", null);
  row.run("sam@example.com", "e".repeat(32), "agent", null);
  expect(() => row.run("sam@example.com", "f".repeat(32), "note", null)).toThrow(/CHECK/);
  expect(() => row.run("sam@example.com", "d".repeat(32), "agent", null)).toThrow(/UNIQUE/);
});
