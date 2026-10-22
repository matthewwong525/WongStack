import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { expect, it } from "vitest";

// The file that adds `link` to the inbox's kinds, run on a database the files before it left holding inbox rows.
const LINKS = "20261023120000_inbox_link_items.sql";
const folder = new URL("../../../../schema/migrations/", import.meta.url);
const read = (file: string) => readFileSync(new URL(file, folder), "utf8");

it("rebuilds the inbox's items with link among their kinds, keeping every row and every tap", () => {
  const sql = new DatabaseSync(":memory:");
  const earlier = readdirSync(folder).filter(file => file.endsWith(".sql") && file < LINKS).sort();
  expect(earlier).toContain("20261022120000_inbox.sql");
  for (const file of earlier) sql.exec(read(file));
  const row = sql.prepare(`INSERT INTO inbox_items (installation_id, email, id, kind, title, workspace, body, actions, version,
    created_at, closes_at, closed_at) VALUES ('', ?, ?, ?, 'Title', 'desk', '{"text":"Go?"}', '[]', 'v1', 1, 2, ?)`);
  row.run("sam@example.com", "a".repeat(32), "plan", null);
  row.run("sam@example.com", "b".repeat(32), "approval", 5);
  row.run("jo@example.com", "a".repeat(32), "question", null);
  sql.exec(`INSERT INTO inbox_taps VALUES ('', 'sam@example.com', '${"c".repeat(32)}', '${"b".repeat(32)}', 'approve', '', 'v1', 1, 'sent', 1, 2)`);
  const rows = () => sql.prepare("SELECT * FROM inbox_items ORDER BY email, id").all();
  const before = rows();
  expect(() => row.run("sam@example.com", "d".repeat(32), "link", null)).toThrow(/CHECK/);
  sql.exec(read(LINKS));
  expect(rows()).toEqual(before);
  expect(sql.prepare("SELECT COUNT(*) AS taps FROM inbox_taps").get()).toEqual({ taps: 1 });
  row.run("sam@example.com", "d".repeat(32), "link", null);
  expect(() => row.run("sam@example.com", "e".repeat(32), "note", null)).toThrow(/CHECK/);
  expect(() => row.run("sam@example.com", "d".repeat(32), "link", null)).toThrow(/UNIQUE/);
});
