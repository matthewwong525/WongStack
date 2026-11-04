// One Markdown renderer for the app and the public address: a page's content never runs code in a reader's browser.
// wiki/stack/knowledge-reader.md
import { Marked, type RendererObject } from "marked";
import { address } from "./source.ts";

/** `app` links pages inside the app and shows pictures; `public` links public addresses and shows alt text. */
export type Mode = "app" | "public";

const ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const escapeHtml = (text: string) => text.replace(/[&<>"']/g, char => ESCAPES[char]);

const FRONT = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/;
/** A bare `public: true` line in the leading frontmatter marks a page public; the body is what follows it. */
export function frontmatter(markdown: string): { isPublic: boolean; body: string } {
  const match = FRONT.exec(markdown);
  if (!match) return { isPublic: false, body: markdown };
  return { isPublic: match[1].split(/\r?\n/).some(line => line.trim() === "public: true"), body: markdown.slice(match[0].length) };
}

/** The first `#` line's text, or the address's last part when the page has none. */
export function titleOf(body: string, path: string): string {
  const heading = /^#[ \t]+(.+?)[ \t#]*$/m.exec(body)?.[1].replace(/[*_`]/g, "").trim();
  return heading || address(path).split("/").pop()!;
}

/** A heading's anchor, as the wiki writes one: lowercased, spaces as hyphens, punctuation dropped. */
const slug = (text: string) => text.toLowerCase().replace(/[^\p{L}\p{N} _-]/gu, "").trim().replace(/ /g, "-");

/** A relative link's repository path, resolved from the page's folder; null when it leaves the repository. */
function resolve(from: string, href: string): string | null {
  const parts = href.startsWith("/") ? [] : from.split("/").slice(0, -1);
  for (const part of href.split("/")) {
    if (part === "..") {
      if (!parts.length) return null;
      parts.pop();
    } else if (part && part !== ".") parts.push(part);
  }
  return parts.join("/");
}

const ALLOWED = ["http", "https", "mailto"];
const encodePath = (path: string) => path.split("/").map(encodeURIComponent).join("/");
/** Where a link may go: an allowed scheme as written, an anchor, or a repository path rewritten. Null shows text. */
function linkTarget(href: string, from: string, mode: Mode): string | null {
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(href)?.[1].toLowerCase();
  if (scheme !== undefined) return ALLOWED.includes(scheme) ? href : null;
  if (href.startsWith("#")) return href;
  const [, file, anchor] = /^([^#]*)(.*)$/s.exec(href)!;
  let path: string | null;
  try { path = resolve(from, decodeURI(file)); } catch { path = null; }
  if (path === null) return null;
  const base = mode === "app" ? "/apps/knowledge/" : "/public/";
  if (path.endsWith(".md") || !/\.[^/]*$/.test(path)) return `${base}${encodePath(address(path))}${anchor}`;
  return mode === "app" ? `/apps/knowledge/api/file?path=${encodeURIComponent(path)}` : null;
}

/** A picture's source in the app: a web address or a repository file. Null shows its alt text, as in public. */
// A picture the app serves. SVG never is: it can hold a script.
export const isPicture = (path: string) => /\.(png|jpg|gif|webp)$/i.test(path);

function pictureSource(href: string, from: string, mode: Mode): string | null {
  const target = mode === "app" ? linkTarget(href, from, mode) : null;
  if (!target || /^https?:/i.test(target)) return target;
  const file = new URL(target, "https://app.invalid").searchParams.get("path");
  return target.startsWith("/apps/knowledge/api/file?") && file && isPicture(file) ? target : null;
}

function renderer(from: string, mode: Mode): RendererObject {
  return {
    html: ({ text }) => escapeHtml(text),
    heading({ tokens, depth, text }) {
      return `<h${depth} id="${escapeHtml(slug(text))}">${this.parser.parseInline(tokens)}</h${depth}>\n`;
    },
    code: ({ text, lang }) => lang === "mermaid" ? `<pre class="mermaid">${escapeHtml(text)}</pre>\n` : false,
    link({ href, title, tokens }) {
      const inner = this.parser.parseInline(tokens);
      const target = linkTarget(href, from, mode);
      if (target === null) return inner;
      return `<a href="${escapeHtml(target)}"${title ? ` title="${escapeHtml(title)}"` : ""}>${inner}</a>`;
    },
    image({ href, text }) {
      const source = pictureSource(href, from, mode);
      return source === null ? escapeHtml(text) : `<img src="${escapeHtml(source)}" alt="${escapeHtml(text)}">`;
    },
  };
}

/** A page's title, whether it is public, and its HTML, for the page at repository path `path`. */
export function render(markdown: string, path: string, mode: Mode): { title: string; isPublic: boolean; html: string } {
  const { isPublic, body } = frontmatter(markdown);
  const html = new Marked({ gfm: true, async: false, renderer: renderer(path, mode) }).parse(body) as string;
  return { title: titleOf(body, path), isPublic, html };
}
