// Search over every page's words at the head commit: the index is built at the first search after a save.
import { listPages } from "./list.ts";
import { frontmatter, titleOf } from "./render.ts";
import { kept, readText, type Knowledge } from "./source.ts";

type Entry = { path: string; title: string; text: string };
export type Index = { entries: Entry[]; capped: boolean };
export type Hit = { path: string; title: string; line: string };

const READS_AT_ONCE = 6;
const MAX_HITS = 20;
const LINE = 200;

/** A page's words with Markdown's marks taken out: link targets, heading and list marks, emphasis, fences. */
const plain = (body: string) => body
  .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
  .replace(/^[ \t]*(?:#{1,6}[ \t]+|>[ \t]?|[-*+][ \t]+|\d+\.[ \t]+|```.*|~~~.*)/gm, "")
  .replace(/[*_`]/g, "");

/** Every listed page's title and words, kept for this save. */
export function searchIndex(knowledge: Knowledge): Promise<Index> {
  return kept(knowledge, "index", async () => {
    const { paths, capped } = await listPages(knowledge);
    const entries: Entry[] = [];
    for (let at = 0; at < paths.length; at += READS_AT_ONCE) {
      entries.push(...await Promise.all(paths.slice(at, at + READS_AT_ONCE).map(async path => {
        const { body } = frontmatter(await readText(knowledge, path) ?? "");
        return { path, title: titleOf(body, path), text: plain(body) };
      })));
    }
    return { entries, capped };
  });
}

/** The line around the match, cut to a readable length. */
function around(line: string, at: number): string {
  const start = Math.max(0, at - LINE / 4);
  return `${start ? "…" : ""}${line.slice(start, start + LINE).trim()}${start + LINE < line.length ? "…" : ""}`;
}

/** Up to 20 pages whose title or words hold the query, each with the first line that does. Case is ignored. */
export function find(index: Index, query: string): Hit[] {
  const needle = query.toLowerCase();
  const hits: Hit[] = [];
  for (const { path, title, text } of index.entries) {
    const line = [title, ...text.split("\n")].find(each => each.toLowerCase().includes(needle));
    if (line !== undefined) hits.push({ path, title, line: around(line.trim(), line.trim().toLowerCase().indexOf(needle)) });
    if (hits.length === MAX_HITS) break;
  }
  return hits;
}
