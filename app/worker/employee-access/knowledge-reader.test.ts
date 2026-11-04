import { expect, it, vi } from "vitest";
import { knowledgeReader } from "./knowledge-reader";

const commit = { hash: "c1", treeHash: "t1", committedAt: 1 };
const setUp = (extra: object = {}) => {
  const repo = { log: vi.fn(async () => [commit]), readTree: vi.fn(async () => []), readFile: vi.fn(async () => new Blob(["# Hi"])),
    createToken: vi.fn(), info: vi.fn(), fork: vi.fn() };
  const artifacts = { get: vi.fn(async () => repo) };
  const env = { ARTIFACTS: artifacts, WONG_KNOWLEDGE_REPOSITORY: "acme-knowledge", WONG_CODE_REPOSITORY: "acme-code",
    WONG_ENVIRONMENT: "production", ...extra };
  return { repo, artifacts, env };
};

it("reads main's newest commit, a folder and a file of the knowledge repository, and nothing else", async () => {
  const { repo, artifacts, env } = setUp();
  const reader = knowledgeReader(env)!;
  expect(Object.isFrozen(reader)).toBe(true);
  expect(Object.keys(reader).sort()).toEqual(["head", "name", "readFile", "readTree"]);
  expect(await reader.head()).toEqual(commit);
  expect(repo.log).toHaveBeenCalledWith({ ref: "main", limit: 1 });
  await reader.readTree("t1");
  expect(await (await reader.readFile({ ref: "c1", path: "a.md" }))?.text()).toBe("# Hi");
  expect(repo.readFile).toHaveBeenCalledWith({ ref: "c1", path: "a.md" });
  // One handle, to the knowledge repository alone; no token is made and no save can be.
  expect(artifacts.get.mock.calls).toEqual([["acme-knowledge"]]);
  for (const call of [repo.createToken, repo.info, repo.fork]) expect(call).not.toHaveBeenCalled();
});

it("gives no reader on a preview, with no binding, or with no usable repository name", () => {
  for (const extra of [{ WONG_ENVIRONMENT: "staging" }, { ARTIFACTS: undefined }, { WONG_KNOWLEDGE_REPOSITORY: "" },
    { WONG_KNOWLEDGE_REPOSITORY: "../acme-code" }]) {
    expect(knowledgeReader(setUp(extra).env), JSON.stringify(extra)).toBeNull();
  }
});

it("says main has no commit as null", async () => {
  const { repo, env } = setUp();
  repo.log.mockResolvedValueOnce([]);
  expect(await knowledgeReader(env)!.head()).toBeNull();
});
