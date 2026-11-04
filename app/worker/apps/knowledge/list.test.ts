import { expect, it } from "vitest";
import { knowledgeReader } from "../../employee-access/knowledge-reader";
import { fakeKnowledge, PAGES } from "../../../tests/knowledge";
import { FOLDER_CAP, listPages, PAGE_CAP } from "./list";
import { newest } from "./source";

it("lists every .md page depth-first, skipping hidden folders and other files, and reads the tree once per save", async () => {
  const repo = fakeKnowledge(PAGES);
  const knowledge = (await newest(knowledgeReader(repo.env)))!;
  const listing = { paths: ["README.md", "how-we-work/refunds.md", "people/README.md", "people/sam-lee.md", "welcome.md"], capped: false };
  expect(await listPages(knowledge)).toEqual(listing);
  const reads = repo.calls.readTree;
  expect(await listPages(knowledge)).toEqual(listing);
  expect(repo.calls.readTree).toBe(reads);
});

it("a tree the repository no longer holds lists nothing", async () => {
  const repo = fakeKnowledge(PAGES);
  const knowledge = (await newest(knowledgeReader(repo.env)))!;
  expect(await listPages({ ...knowledge, head: { ...knowledge.head, treeHash: "gone" } })).toEqual({ paths: [], capped: false });
});

it("stops at 2,000 pages and 200 folders, and says so", async () => {
  const many = Object.fromEntries(Array.from({ length: PAGE_CAP + 1 }, (_, n) => [`p${String(n).padStart(4, "0")}.md`, "# Page\n"]));
  const pages = (await listPages((await newest(knowledgeReader(fakeKnowledge(many).env)))!));
  expect([pages.paths.length, pages.capped]).toEqual([PAGE_CAP, true]);
  const deep = Object.fromEntries(Array.from({ length: FOLDER_CAP + 1 }, (_, n) => [`f${String(n).padStart(3, "0")}/page.md`, "# Page\n"]));
  const folders = await listPages((await newest(knowledgeReader(fakeKnowledge(deep).env)))!);
  // The root is one of the 200 folders read.
  expect([folders.paths.length, folders.capped]).toEqual([FOLDER_CAP - 1, true]);
});
