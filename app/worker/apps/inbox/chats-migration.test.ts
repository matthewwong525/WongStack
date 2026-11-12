import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { expect, it } from "vitest";

// The file that drops the chat list, run on a database the files before it left holding chats and inbox rows.
const DROP = "20261112120000_drop_inbox_chats.sql";
const folder = new URL("../../../../schema/migrations/", import.meta.url);
const read = (file: string) => readFileSync(new URL(file, folder), "utf8");

it("drops the chats table and its index, and keeps every inbox item, its chat and its taps", () => {
  const sql = new DatabaseSync(":memory:");
  const earlier = readdirSync(folder).filter(file => file.endsWith(".sql") && file < DROP).sort();
  expect(earlier).toContain("20261107120000_inbox_chats.sql");
  for (const file of earlier) sql.exec(read(file));
  sql.exec(`INSERT INTO chats (installation_id, agent_id, owner, computer, name, folder, seen_at)
    VALUES ('', 'agent-1', 'sam@example.com', '${"c".repeat(32)}', 'Chat', 'desk', 1)`);
  const row = sql.prepare(`INSERT INTO inbox_items (installation_id, email, id, kind, title, workspace, body, actions, version,
    created_at, closes_at, closed_at, chat) VALUES ('', ?, ?, 'plan', 'Title', 'desk', '<p>Plan</p>', '[]', 'v1', 1, 2, ?, ?)`);
  row.run("sam@example.com", "a".repeat(32), null, "agent-1");
  row.run("sam@example.com", "b".repeat(32), 5, null);
  sql.exec(`INSERT INTO inbox_taps VALUES ('', 'sam@example.com', '${"c".repeat(32)}', '${"b".repeat(32)}', 'build', '', 'v1', 1, 'sent', 1, 2)`);
  const rows = () => sql.prepare("SELECT * FROM inbox_items ORDER BY email, id").all();
  const before = rows();
  sql.exec(read(DROP));
  expect(sql.prepare("SELECT name FROM sqlite_master WHERE name IN ('chats', 'chats_owner', 'inbox_items_chats')").all()).toEqual([]);
  expect(rows()).toEqual(before);
  expect(sql.prepare("SELECT COUNT(*) AS taps FROM inbox_taps").get()).toEqual({ taps: 1 });
  row.run("sam@example.com", "d".repeat(32), null, "agent-2");
  expect(() => row.run("sam@example.com", "d".repeat(32), null, null)).toThrow(/UNIQUE/);
  // An install that ran it once runs it again with no error.
  sql.exec(read(DROP));
});
