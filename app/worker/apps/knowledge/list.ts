// Every page in the knowledge repository: its tree walked depth-first from the head commit's root.
import { kept, type Knowledge } from "./source.ts";

export const PAGE_CAP = 2000;
export const FOLDER_CAP = 200;
export type Listing = { paths: string[]; capped: boolean };

/** Every `.md` path at the head commit, up to the caps; `capped` says some were left out. Hidden names are skipped. */
export function listPages(knowledge: Knowledge): Promise<Listing> {
  return kept(knowledge, "list", async () => {
    const listing: Listing = { paths: [], capped: false };
    let folders = 0;
    const walk = async (hash: string, prefix: string) => {
      if (++folders > FOLDER_CAP) return void (listing.capped = true);
      for (const entry of await knowledge.repo.readTree(hash) ?? []) {
        if (entry.name.startsWith(".")) continue;
        if (entry.type === "tree") await walk(entry.hash, `${prefix}${entry.name}/`);
        else if (entry.type === "blob" && entry.name.endsWith(".md")) {
          if (listing.paths.length < PAGE_CAP) listing.paths.push(`${prefix}${entry.name}`);
          else listing.capped = true;
        }
      }
    };
    await walk(knowledge.head.treeHash, "");
    return listing;
  });
}
