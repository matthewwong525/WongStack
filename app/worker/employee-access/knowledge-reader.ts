// The Knowledge app's three reads of the knowledge repository, made in core: no app code holds the Artifacts
// binding, a token, or a way to the code repository. wiki/stack/knowledge-reader.md
import { knowledgeSource } from "./knowledge.ts";

// The answers' shapes, as a real repository gave them through Cloudflare's REST API on 2026-11-04.
type TreeEntry = { name: string; mode: string; hash: string; type: "tree" | "blob" | "symlink" | "gitlink" | "exec" };
export type Commit = { hash: string; treeHash: string; committedAt: number };
type Repo = {
  log(options: { ref: string; limit: number }): Promise<Commit[]>;
  readTree(hash: string): Promise<TreeEntry[] | null>;
  readFile(args: { ref: string; path: string }): Promise<Blob | null>;
};

/** Reads only: main's newest commit, one folder, one file. It can not save, make a token, or reach another repo. */
export type KnowledgeReader = Readonly<{
  /** The knowledge repository's committed, nonsecret name. */
  name: string;
  head(): Promise<Commit | null>;
  readTree(hash: string): Promise<TreeEntry[] | null>;
  readFile(args: { ref: string; path: string }): Promise<Blob | null>;
}>;

/** The reader, or null on a preview and with no knowledge repo, by the rule the Git address uses. Calls nothing. */
export function knowledgeReader(env: object): KnowledgeReader | null {
  const source = knowledgeSource(env);
  if (!source) return null;
  let handle: Promise<Repo> | undefined;
  // The shared binding type names only the Git calls; these reads are on the same handle, which never leaves here.
  const repo = () => handle ??= source.artifacts.get(source.name) as unknown as Promise<Repo>;
  return Object.freeze({
    name: source.name,
    head: async () => (await (await repo()).log({ ref: "main", limit: 1 }))[0] ?? null,
    readTree: async (hash: string) => (await repo()).readTree(hash),
    readFile: async ({ ref, path }: { ref: string; path: string }) => (await repo()).readFile({ ref, path }),
  });
}
