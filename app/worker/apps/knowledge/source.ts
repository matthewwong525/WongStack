// The knowledge repository at its newest save, read through the reader the app hands this app's routes: reads only,
// with no binding, no token and no Git. wiki/stack/knowledge-reader.md
import type { Commit, KnowledgeReader } from "../../api/contract.ts";

/** One read of the repository, pinned to the commit that was newest when it began. */
export type Knowledge = { repo: KnowledgeReader; head: Commit };

/** The repository at main's newest commit; null with no reader (a preview, or no knowledge repository) or no commit. */
export async function newest(reader: KnowledgeReader | null | undefined): Promise<Knowledge | null> {
  const head = reader && await reader.head();
  return reader && head ? { repo: reader, head } : null;
}

/** A path a caller may name: repository-relative, with no `..`, no leading `/`, no `.git` and no empty part. */
export const safePath = (path: string) => !path.includes("\\") &&
  path.split("/").every(part => part !== "" && part !== "." && part !== ".." && part.toLowerCase() !== ".git");

/** A page's address: its path without `.md`, and a folder's README as the folder. */
export const address = (path: string) => path.replace(/\.md$/, "").replace(/\/README$/, "");

/** A file's text at the pinned commit, or null when the commit holds no such file. */
export async function readText(knowledge: Knowledge, path: string): Promise<string | null> {
  const file = await knowledge.repo.readFile({ ref: knowledge.head.hash, path });
  return file && file.text();
}

/** The page at an address: `<address>.md`, then `<address>/README.md`; null when neither is there. */
export async function readPage(knowledge: Knowledge, at: string): Promise<{ path: string; markdown: string } | null> {
  if (!safePath(at)) return null;
  for (const path of at.endsWith(".md") ? [at] : [`${at}.md`, `${at}/README.md`]) {
    const markdown = await readText(knowledge, path);
    if (markdown !== null) return { path, markdown };
  }
  return null;
}

// The Cache API does nothing for a Worker behind Cloudflare Access, so each Worker instance keeps the newest save's.
const memo = new Map<string, Promise<unknown>>();
const done = new Map<string, unknown>();
let memoHead = "";

/** Built once per save in this Worker instance: keyed by the head commit, so an edit shows at the next request. */
export function kept<T>(knowledge: Knowledge, key: string, build: () => Promise<T>): Promise<T> {
  const head = `${knowledge.repo.name}@${knowledge.head.hash}`;
  if (head !== memoHead) {
    memo.clear();
    done.clear();
    memoHead = head;
  }
  const found = memo.get(key) as Promise<T> | undefined;
  if (found) return found;
  const built = build();
  memo.set(key, built);
  const current = () => memo.get(key) === built;
  built.then(value => current() && done.set(key, value), () => current() && memo.delete(key));
  return built;
}

/** What `kept` finished building for the key, without building or waiting: undefined while a build runs or failed. */
export const keptAlready = <T>(knowledge: Knowledge, key: string) =>
  memoHead === `${knowledge.repo.name}@${knowledge.head.hash}` ? done.get(key) as T | undefined : undefined;
