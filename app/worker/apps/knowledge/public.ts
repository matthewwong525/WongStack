// The public address, answered before the sign-in check: a page marked `public: true` opens for anyone, and every
// other request gets one fixed not-found page, so a private page's name never shows. wiki/stack/knowledge-reader.md
import type { KnowledgeReader } from "../../api/contract.ts";
import { escapeHtml, render } from "./render.ts";
import { newest, readPage } from "./source.ts";

export const PUBLIC_KNOWLEDGE = "/public/";

// A page of its own: nothing loads from the app, and nothing it holds can run.
const HEADERS = { "Content-Type": "text/html; charset=utf-8", "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'",
  "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" };
const STYLE = "body{margin:0;font:16px/1.6 system-ui,sans-serif;color:#1a1a1a;background:#fff}" +
  "main{max-width:44rem;margin:0 auto;padding:2rem 1rem}a{color:inherit;text-underline-offset:.25rem}" +
  "pre{overflow-x:auto;padding:.75rem;border-radius:.375rem;background:#f4f4f5;font-size:.875rem}" +
  "code{font-size:.875em}table{border-collapse:collapse}th,td{border:1px solid #e4e4e7;padding:.25rem .5rem}" +
  "img{max-width:100%}h1{line-height:1.25}";

const shell = (title: string, body: string, status: number) => new Response(`<!doctype html><html lang="en"><head>` +
  `<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(title)}</title>` +
  `<style>${STYLE}</style></head><body><main>${body}</main></body></html>`, { status, headers: HEADERS });

const notFound = () => shell("Page not found", "<h1>Page not found</h1><p>There is no page at this address.</p>", 404);

/** `/public/<address>` → the page, when its frontmatter holds a bare `public: true`; else the one not-found page.
 *  Core hands it the reader, or null on a preview and with no knowledge repository. */
export async function publicKnowledge(request: Request, reader: KnowledgeReader | null): Promise<Response> {
  try {
    const at = decodeURIComponent(new URL(request.url).pathname.slice(PUBLIC_KNOWLEDGE.length)).replace(/\/$/, "");
    const knowledge = request.method === "GET" ? await newest(reader) : null;
    const page = knowledge && await readPage(knowledge, at);
    const shown = page && render(page.markdown, page.path, "public");
    return shown && shown.isPublic ? shell(shown.title, shown.html, 200) : notFound();
  } catch {
    return notFound();
  }
}
