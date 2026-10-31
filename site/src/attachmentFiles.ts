// Every site/attachments/<slug>.md, read when the site is built, so the page sends no request.
// wiki/maintaining/attachments.md owns what a file holds.
import { parseAttachment } from "../attachments/parse.mjs";

const FILES = import.meta.glob<string>("../attachments/*.md", { query: "?raw", import: "default", eager: true });

/** Every attachment with its slug, the file's name, in the order its `order:` field sets. */
export const ATTACHMENTS = Object.entries(FILES)
  .map(([path, text]) => ({ slug: path.slice(path.lastIndexOf("/") + 1, -".md".length), ...parseAttachment(text) }))
  .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
