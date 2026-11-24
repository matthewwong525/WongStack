import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { expect, it } from "vitest";

// The file that adds the plain flag and team links, run on a database the files before it left holding inbox rows.
const SHARES = "20261123120000_inbox_shared_pages.sql";
const folder = new URL("../../../../schema/migrations/", import.meta.url);
const read = (file: string) => readFileSync(new URL(file, folder), "utf8");

it("keeps every inbox row as a review page updated when made, and lets a page have one open team link at a time", () => {
  const sql = new DatabaseSync(":memory:");
  for (const file of readdirSync(folder).filter(file => file.endsWith(".sql") && file < SHARES).sort()) sql.exec(read(file));
  const row = sql.prepare(`INSERT INTO inbox_items (installation_id, email, id, kind, title, workspace, body, actions, version,
    created_at, closes_at) VALUES ('', ?, ?, 'plan', 'Title', 'desk', '<p>Plan</p>', '[]', 'v1', 1, 2)`);
  row.run("sam@example.com", "a".repeat(32));
  row.run("jo@example.com", "a".repeat(32));
  const columns = "installation_id, email, id, kind, title, workspace, body, actions, version, created_at, closes_at, closed_at, hidden";
  const rows = () => sql.prepare(`SELECT ${columns} FROM inbox_items ORDER BY email, id`).all();
  const before = rows();
  sql.exec(read(SHARES));
  expect(rows()).toEqual(before);
  expect(sql.prepare("SELECT DISTINCT plain, updated_at FROM inbox_items").all().map(row => ({ ...row }))).toEqual([{ plain: 0, updated_at: 1 }]);
  const link = sql.prepare("INSERT INTO inbox_shares VALUES (?, '', 'sam@example.com', ?, 1, ?)");
  link.run("t1", "a".repeat(32), null);
  expect(() => link.run("t2", "a".repeat(32), null)).toThrow(/UNIQUE/);
  link.run("t3", "a".repeat(32), 5);
  sql.exec("UPDATE inbox_shares SET stopped_at = 6 WHERE token = 't1'");
  link.run("t4", "a".repeat(32), null);
  expect(sql.prepare("SELECT COUNT(*) AS n FROM inbox_shares WHERE stopped_at IS NULL").get()).toEqual({ n: 1 });
});
