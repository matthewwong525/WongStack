// The Knowledge app's server side: the page list, a page, search and pictures, each read from the knowledge
// repository's newest save. Each route needs the Knowledge app. wiki/stack/knowledge-reader.md
import { z } from "zod";
import { defineAction, type Action, type Route } from "../../api/contract.ts";
import { listPages } from "./list.ts";
import { isPicture, render, titleOf } from "./render.ts";
import { find, searchIndex, type Index } from "./search.ts";
import { keptAlready, newest, readPage, safePath } from "./source.ts";

type Handler = Exclude<Route, Action>;

const ERRORS = { not_set_up: "Company knowledge is not set up on this app.", not_found: "No page is at that address." };
const failure = (code: keyof typeof ERRORS, status: number) => Response.json({ error: { code } }, { status });
const notSetUp = () => failure("not_set_up", 503);
const commit = z.string().describe("The save this answer was read from.");
const capped = z.boolean().describe("True when the repository holds more pages than the 2,000 read.");
const COMMIT = "0475a632f5fa49d896248a8a0328e6d76a8d17f3";
const big = { inputBytes: 65536, outputBytes: 1_048_576, timeoutMs: 30_000 };

/** GET pages → every page's path and title, at the newest save. */
const pages = defineAction({
  operationId: "knowledge.pages", summary: "List company knowledge pages",
  description: "Every page in company knowledge at its newest save, by path. A title is the page's file name until a search has read the pages.",
  input: z.strictObject({}), output: z.strictObject({ commit, capped, pages: z.array(z.strictObject({ path: z.string(), title: z.string() })) }),
  encoding: "none", effect: "read", agentAvailable: true, errors: ERRORS, limits: big,
  examples: [{ input: {}, output: { commit: COMMIT, capped: false, pages: [{ path: "how-we-work/refunds.md", title: "Refunds" }] } }],
  async handler(_request, _env, { knowledge: reader }) {
    const knowledge = await newest(reader);
    if (!knowledge) return notSetUp();
    const { paths, capped } = await listPages(knowledge);
    const index = keptAlready<Index>(knowledge, "index");
    const titles = new Map(index?.entries.map(entry => [entry.path, entry.title]));
    return Response.json({ commit: knowledge.head.hash, capped, pages: paths.map(path => ({ path, title: titles.get(path) ?? titleOf("", path) })) });
  },
});

/** GET page?path= → one page, rendered, with its Markdown and when it was saved. */
const page = defineAction({
  operationId: "knowledge.page", summary: "Read a company knowledge page",
  description: "One page at the newest save: its title, whether it is public, its HTML and Markdown, and when the save was made.",
  input: z.strictObject({ path: z.string().min(1).max(512).describe("The page's path, such as how-we-work/refunds.md, or its address without .md.") }),
  output: z.strictObject({ commit, path: z.string(), title: z.string(), public: z.boolean(), html: z.string(), markdown: z.string(),
    saved: z.string().describe("When the save was made, as an ISO time.") }),
  encoding: "query", effect: "read", agentAvailable: true, errors: ERRORS, limits: big,
  examples: [{ input: { path: "how-we-work/refunds" }, output: { commit: COMMIT, path: "how-we-work/refunds.md", title: "Refunds", public: false,
    html: "<h1 id=\"refunds\">Refunds</h1>\n", markdown: "# Refunds\n", saved: "2026-11-04T09:00:00.000Z" } }],
  async handler(_request, _env, { input, knowledge: reader }) {
    const knowledge = await newest(reader);
    if (!knowledge) return notSetUp();
    const found = await readPage(knowledge, (input as { path: string }).path);
    if (!found) return failure("not_found", 404);
    const { title, isPublic, html } = render(found.markdown, found.path, "app");
    return Response.json({ commit: knowledge.head.hash, path: found.path, title, public: isPublic, html, markdown: found.markdown,
      saved: new Date(knowledge.head.committedAt * 1000).toISOString() });
  },
});

/** GET search?q= → up to 20 pages holding the words, each with its matching line. */
const search = defineAction({
  operationId: "knowledge.search", summary: "Search company knowledge",
  description: "Pages at the newest save whose title or words hold the query, case ignored: up to 20, each with the first line that matches.",
  input: z.strictObject({ q: z.string().trim().min(2).max(100).describe("The words to find, 2 to 100 characters.") }),
  output: z.strictObject({ commit, capped, hits: z.array(z.strictObject({ path: z.string(), title: z.string(), line: z.string() })) }),
  encoding: "query", effect: "read", agentAvailable: true, errors: ERRORS, limits: { ...big, timeoutMs: 60_000 },
  examples: [{ input: { q: "refund" }, output: { commit: COMMIT, capped: false,
    hits: [{ path: "how-we-work/refunds.md", title: "Refunds", line: "We refund within 30 days of delivery." }] } }],
  async handler(_request, _env, { input, knowledge: reader }) {
    const knowledge = await newest(reader);
    if (!knowledge) return notSetUp();
    const index = await searchIndex(knowledge);
    return Response.json({ commit: knowledge.head.hash, capped: index.capped, hits: find(index, (input as { q: string }).q) });
  },
});

const TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];

/** GET file?path= → a picture at the newest save; any other file, or none, is not found. */
const file: Handler = async (_request, _env, { url, knowledge: reader }) => {
  const path = url.searchParams.get("path") ?? "";
  const knowledge = safePath(path) && isPicture(path) ? await newest(reader) : null;
  const blob = knowledge && await knowledge.repo.readFile({ ref: knowledge.head.hash, path });
  return blob && TYPES.includes(blob.type) ? new Response(blob, { headers: { "Content-Type": blob.type, "Cache-Control": "private, max-age=300",
    "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'" } }) : Response.json({ error: "Not found" }, { status: 404 });
};

export const routes = new Map<string, Route>([["GET pages", pages], ["GET page", page], ["GET search", search], ["GET file", file]]);
