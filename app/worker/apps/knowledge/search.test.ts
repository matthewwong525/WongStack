import { expect, it } from "vitest";
import { knowledgeReader } from "../../employee-access/knowledge-reader";
import { fakeKnowledge, PAGES } from "../../../tests/knowledge";
import { find, searchIndex } from "./search";
import { newest } from "./source";

it("finds a word in a page's body, with its title and the line that holds it, and reads the pages once per save", async () => {
  const repo = fakeKnowledge(PAGES);
  const knowledge = (await newest(knowledgeReader(repo.env)))!;
  const index = await searchIndex(knowledge);
  expect(find(index, "WAREHOUSE")).toEqual([{ path: "people/sam-lee.md", title: "Sam Lee", line: "Runs shipping and the warehouse." }]);
  // Markdown's marks are gone from the words; a title matches as a line of its own.
  expect(find(index, "refunds")).toEqual([
    { path: "README.md", title: "Company knowledge", line: "Start with refunds and the people." },
    { path: "how-we-work/refunds.md", title: "Refunds", line: "Refunds" },
    { path: "welcome.md", title: "Welcome", line: "Welcome to Acme Clay. See refunds." },
  ]);
  expect(find(index, "nothing like this")).toEqual([]);
  const reads = repo.calls.readFile;
  await searchIndex(knowledge);
  expect(repo.calls.readFile).toBe(reads);
});

it("returns at most 20 hits, cuts a long line round the match, and reads a page gone missing as empty", async () => {
  const many = Object.fromEntries(Array.from({ length: 25 }, (_, n) => [`p${String(n).padStart(2, "0")}.md`, `# Page ${n}\n\nshared word\n`]));
  expect(find(await searchIndex((await newest(knowledgeReader(fakeKnowledge(many).env)))!), "shared")).toHaveLength(20);
  const long = `${"a".repeat(100)} needle ${"b".repeat(300)}`;
  const index = { entries: [{ path: "x.md", title: "X", text: long }, { path: "y.md", title: "Y", text: `needle ${"c".repeat(300)}` }], capped: false };
  const [cut, start] = find(index, "needle");
  expect(cut.line).toMatch(/^…a{49} needle b+…$/);
  expect(cut.line).toHaveLength(202);
  expect(start.line).toMatch(/^needle c+…$/);
  const repo = fakeKnowledge(PAGES);
  const knowledge = (await newest(knowledgeReader(repo.env)))!;
  const readFile = repo.repo.readFile;
  repo.repo.readFile = async args => args.path === "welcome.md" ? null : readFile(args);
  expect((await searchIndex(knowledge)).entries.find(entry => entry.path === "welcome.md")).toEqual({ path: "welcome.md", title: "welcome", text: "" });
});
