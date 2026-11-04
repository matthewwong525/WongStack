import { expect, it } from "vitest";
import { knowledgeReader } from "../../employee-access/knowledge-reader";
import { fakeKnowledge, PAGES } from "../../../tests/knowledge";
import { kept, keptAlready, newest, readPage, safePath } from "./source";

it("reads the newest commit on main, and nothing on a preview, without a repository, or with no commit", async () => {
  const { env, state } = fakeKnowledge(PAGES);
  expect((await newest(knowledgeReader(env)))?.head).toEqual({ hash: state.hash, treeHash: "tree:", committedAt: state.committedAt });
  expect(await newest(knowledgeReader({ ...env, WONG_ENVIRONMENT: "staging" }))).toBeNull();
  expect(await newest(knowledgeReader({ ...env, WONG_KNOWLEDGE_REPOSITORY: "" }))).toBeNull();
  state.hash = "";
  expect(await newest(knowledgeReader(env))).toBeNull();
});

it("refuses a path that climbs, starts at the root, names .git, or has an empty part", () => {
  for (const path of ["people/sam-lee.md", "README.md", "a b/c.md"]) expect(safePath(path), path).toBe(true);
  for (const path of ["", "../x.md", "a/../../x.md", "/etc/x", ".git/config", "a/.GIT/x", "a//b", "a/./b", "a\\b", "a/"]) {
    expect(safePath(path), path).toBe(false);
  }
});

it("finds a page by its address: the file, then the folder's README", async () => {
  const knowledge = (await newest(knowledgeReader(fakeKnowledge(PAGES).env)))!;
  expect(await readPage(knowledge, "people/sam-lee")).toEqual({ path: "people/sam-lee.md", markdown: PAGES["people/sam-lee.md"] });
  expect((await readPage(knowledge, "people"))?.path).toBe("people/README.md");
  expect((await readPage(knowledge, "welcome.md"))?.path).toBe("welcome.md");
  expect(await readPage(knowledge, "nobody")).toBeNull();
  expect(await readPage(knowledge, "../secrets")).toBeNull();
});

it("keeps what it built for one save, builds again for the next, and drops a failed build", async () => {
  const repo = fakeKnowledge(PAGES);
  const first = (await newest(knowledgeReader(repo.env)))!;
  let builds = 0;
  const build = async () => ++builds;
  expect([await kept(first, "n", build), await kept(first, "n", build)]).toEqual([1, 1]);
  expect(keptAlready(first, "n")).toBe(1);
  repo.save(PAGES);
  const second = (await newest(knowledgeReader(repo.env)))!;
  expect(keptAlready(second, "n")).toBeUndefined();
  expect(await kept(second, "n", build)).toBe(2);
  expect(keptAlready(first, "n")).toBeUndefined();
  await expect(kept(second, "broken", async () => { throw new Error("read failed"); })).rejects.toThrow("read failed");
  expect(await kept(second, "broken", build)).toBe(3);
});

it("gives only a finished build, never one still running or one that failed", async () => {
  const knowledge = (await newest(knowledgeReader(fakeKnowledge(PAGES).env)))!;
  let finish = (_value: number) => {};
  const building = kept(knowledge, "slow", () => new Promise<number>(resolve => { finish = resolve; }));
  expect(keptAlready(knowledge, "slow")).toBeUndefined();
  finish(7);
  await building;
  expect(keptAlready(knowledge, "slow")).toBe(7);
  await kept(knowledge, "broken", async () => { throw new Error("read failed"); }).catch(() => {});
  expect(keptAlready(knowledge, "broken")).toBeUndefined();
});
