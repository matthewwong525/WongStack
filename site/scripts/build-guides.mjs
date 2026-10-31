// Builds site/guides/*.md into pages that read with no script, plain-text copies, a list, and llms.txt in dist/,
// so an agent reads a guide with no browser. wiki/maintaining/service-guides.md owns how to add or recheck a guide.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Marked } from "marked";
import { REPO_URL } from "../src/install.ts";

const SITE_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** The one address every page names. */
export const SITE = "https://wongstack.com";

/** The site's own file that adds Copy buttons, the only script a guide page loads. */
export const COPY_SCRIPT = "/guides/copy.js";

/** The page that every guide links at its save step. */
export const SAFETY_ID = "keep-keys-safe";

/** The site header's links, as `SiteHeader.tsx` prints them. guides.test.ts fails when the two differ. */
export const HEADER_LINKS = [
  ["GitHub", REPO_URL],
  ["Install", "/#install"],
  ["Guides", "/guides"],
];

const SUPPORT_EMAIL = "support@wongstack.com";

/** The site footer's links, as `SiteFooter.tsx` prints them. guides.test.ts fails when the two differ. */
export const FOOTER_LINKS = [
  ["License", `${REPO_URL}/blob/main/LICENSE`],
  ["Privacy", "/privacy"],
  [SUPPORT_EMAIL, `mailto:${SUPPORT_EMAIL}`],
];

/** Front matter fields every tool guide has. The safety page needs only the first three. */
export const GUIDE_FIELDS = ["title", "name", "summary", "order", "minutes", "needs", "lastChecked", "env"];
const PAGE_FIELDS = ["title", "summary", "lastChecked"];

const escape = (text) =>
  String(text).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

/** A heading's anchor: lowercased, spaces to hyphens, other punctuation dropped. */
export const slug = (text) =>
  text
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/[^a-z0-9 -]/g, "")
    .trim()
    .replace(/\s+/g, "-");

/** `key: value` lines between two `---` lines. A value in `[a, b]` is a list; a number stays a number. */
export function parseFrontMatter(text, file = "guide") {
  const match = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) throw new Error(`${file}: no front matter`);
  const meta = {};
  for (const line of match[1].split("\n")) {
    if (!line.trim()) continue;
    const pair = line.match(/^(\w+):\s*(.*)$/);
    if (!pair) throw new Error(`${file}: front matter line is not "key: value": ${line}`);
    const [, key, raw] = pair;
    const value = raw.trim();
    if (value.startsWith("[") && value.endsWith("]")) {
      meta[key] = value
        .slice(1, -1)
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    } else if (/^\d+$/.test(value)) {
      meta[key] = Number(value);
    } else {
      meta[key] = value;
    }
  }
  return { meta, body: text.slice(match[0].length).trim() };
}

/** Every guide in `dir`, in list order: `_` files are parts the build inserts, never guides. */
export function readGuides(dir = join(SITE_DIR, "guides")) {
  const guides = readdirSync(dir)
    .filter((name) => name.endsWith(".md") && !name.startsWith("_"))
    .map((name) => {
      const id = name.slice(0, -3);
      const { meta, body } = parseFrontMatter(readFileSync(join(dir, name), "utf8"), name);
      const kind = id === SAFETY_ID ? "page" : "guide";
      for (const field of kind === "guide" ? GUIDE_FIELDS : PAGE_FIELDS) {
        if (meta[field] === undefined || meta[field] === "") throw new Error(`${name}: front matter has no ${field}`);
      }
      return { id, kind, meta, body };
    });
  return guides.sort((a, b) => (a.meta.order ?? 99) - (b.meta.order ?? 99) || a.id.localeCompare(b.id));
}

/** The agent part every tool guide opens with, from one file, so one edit changes every guide. */
export const readAgentPart = (dir = join(SITE_DIR, "guides")) => readFileSync(join(dir, "_agent.md"), "utf8").trim();

/** Screenshots still to take, keyed by picture address: the page to open, what to show, and where to stop. */
export const readShotList = (dir = join(SITE_DIR, "guides")) => JSON.parse(readFileSync(join(dir, "shot-list.json"), "utf8"));

/** `markdown` without its pictures still on the shot list, so a page never shows a broken picture. */
export const withoutPending = (markdown, shots) =>
  markdown.replace(/^!\[[^\]]*\]\(([^)\s]+)\)\n*/gm, (line, src) => (src in shots ? "" : line));

/** "2026-10-31" as "October 31, 2026". */
export function longDate(iso) {
  const date = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) throw new Error(`not a date: ${iso}`);
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
}

/** Markdown to HTML, with anchors on headings and a lone picture as a figure. */
function markdownToHtml(markdown) {
  const marked = new Marked({ gfm: true });
  marked.use({
    renderer: {
      heading({ tokens, depth }) {
        const inner = this.parser.parseInline(tokens);
        return `<h${depth} id="${slug(inner)}">${inner}</h${depth}>\n`;
      },
      paragraph({ tokens }) {
        const real = tokens.filter((token) => !(token.type === "text" && !token.raw.trim()));
        if (real.length === 1 && real[0].type === "image") {
          const { href, text, title } = real[0];
          const caption = title ? `<figcaption>${escape(title)}</figcaption>` : "";
          return `<figure><img src="${escape(href)}" alt="${escape(text)}" loading="lazy" />${caption}</figure>\n`;
        }
        return `<p>${this.parser.parseInline(tokens)}</p>\n`;
      },
    },
  });
  return marked.parse(markdown);
}

/** A guide's Markdown as an agent reads it: a full address for every picture and guide link. */
export function absoluteMarkdown(markdown) {
  return markdown
    .replace(/\]\((\/guides\/[^)\s]+\.(?:webp|svg|png))/g, `](${SITE}$1`)
    .replace(/\]\(\/guides\/([a-z0-9-]+)(#[^)\s]*)?\)/g, (_, id, anchor = "") => `](${SITE}/guides/${id}.md${anchor})`)
    .replace(/\]\(\/guides\)/g, `](${SITE}/guides.md)`);
}

const header = () => `<header class="site-header">
      <a href="/"><img src="/favicon.svg" alt="" /><span>WongStack</span></a>
      <nav>
${HEADER_LINKS.map(([text, href]) => `        <a href="${escape(href)}">${escape(text)}</a>`).join("\n")}
      </nav>
    </header>`;

const footer = () => `<footer class="site-footer note">
${FOOTER_LINKS.map(([text, href]) => `      <a href="${escape(href)}">${escape(text)}</a>`).join("\n")}
    </footer>`;

/** A whole page that reads with no script: the site's header, `main`, and footer, styled by the built CSS.
 * `COPY_SCRIPT` only adds Copy buttons to code boxes. */
function page({ title, description, path, markdownPath, cssHref, main }) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escape(title)}</title>
    <meta name="description" content="${escape(description)}" />
    <link rel="canonical" href="${SITE}${path}" />
    <link rel="alternate" type="text/markdown" href="${SITE}${markdownPath}" />
    <link rel="stylesheet" href="${escape(cssHref)}" />
    <script src="${COPY_SCRIPT}" defer></script>
  </head>
  <body>
    <div class="site">
    ${header()}
    <main>
${main}
    </main>
    ${footer()}
    </div>
  </body>
</html>
`;
}

/** The facts under a guide's title, the same in its page and its plain text. */
function facts(guide) {
  const { meta } = guide;
  const list = [];
  if (meta.minutes) list.push(["Time", `about ${meta.minutes} minutes`]);
  if (meta.needs) list.push(["You need", meta.needs]);
  list.push(["Last checked", longDate(meta.lastChecked)]);
  return list;
}

/** The guide as plain text: title, facts, the agent part, then the body. */
export function guideMarkdown(guide, agentPart) {
  const lines = [
    `# ${guide.meta.title}`,
    "",
    guide.meta.summary.endsWith(".") ? guide.meta.summary : `${guide.meta.summary}.`,
    "",
    ...facts(guide).map(([label, value]) => `- ${label}: ${value}`),
    `- Web page: ${SITE}/guides/${guide.id}`,
    "",
  ];
  if (guide.kind === "guide") lines.push(agentPart, "");
  lines.push(guide.body, "");
  return absoluteMarkdown(lines.join("\n"));
}

function guideHtml(guide, agentPart, cssHref) {
  const factList = facts(guide)
    .map(([label, value]) => `<li><b>${escape(label)}:</b> ${escape(value)}</li>`)
    .join("");
  const agent = guide.kind === "guide" ? `<section class="guide-agent">\n${markdownToHtml(agentPart)}</section>\n` : "";
  const crumb = guide.meta.name ?? guide.meta.title;
  const main = `<article class="guide">
<p class="note"><a href="/guides">Guides</a> › ${escape(crumb)}</p>
<h1>${escape(guide.meta.title)}</h1>
<p class="guide-lead">${escape(guide.meta.summary)}</p>
<ul class="guide-facts">${factList}</ul>
${agent}${markdownToHtml(guide.body)}<p class="note">Plain text for AI agents: <a href="/guides/${guide.id}.md">/guides/${guide.id}.md</a></p>
</article>`;
  return page({
    title: guide.meta.title,
    description: guide.meta.summary,
    path: `/guides/${guide.id}`,
    markdownPath: `/guides/${guide.id}.md`,
    cssHref,
    main,
  });
}

const LIST_TITLE = "Connect your tools";
const LIST_LEAD = "Get a key from each tool, so you or your AI agent can use it. Each guide takes 5 to 15 minutes.";

function listHtml(guides, cssHref) {
  const tools = guides.filter((guide) => guide.kind === "guide");
  const safety = guides.find((guide) => guide.id === SAFETY_ID);
  const rows = tools
    .map(
      (guide) =>
        `<li><a href="/guides/${guide.id}"><b>${escape(guide.meta.name)}</b><span class="note">${escape(guide.meta.summary)}</span><span class="guide-time">${guide.meta.minutes} min</span></a></li>`,
    )
    .join("\n");
  const main = `<article class="guide">
<h1>${LIST_TITLE}</h1>
<p class="guide-lead">${LIST_LEAD}</p>
<ul class="guide-list">
${rows}
</ul>
${safety ? `<p><a class="guide-safety" href="/guides/${SAFETY_ID}">${escape(safety.meta.title)}</a></p>` : ""}
<p class="note">For AI agents: each guide is also plain text at its address with <code>.md</code> on the end. The list is at <a href="/guides.md">/guides.md</a>.</p>
</article>`;
  return page({ title: LIST_TITLE, description: LIST_LEAD, path: "/guides", markdownPath: "/guides.md", cssHref, main });
}

const listLine = (guide) => `- [${guide.meta.title}](${SITE}/guides/${guide.id}.md): ${guide.meta.summary}`;

function listMarkdown(guides) {
  return [
    `# ${LIST_TITLE}`,
    "",
    LIST_LEAD,
    "Each guide is a web page at the same address without `.md`.",
    "",
    ...guides.filter((guide) => guide.kind === "guide").map(listLine),
    "",
    ...guides.filter((guide) => guide.kind === "page").map(listLine),
    "",
  ].join("\n");
}

/** The site's purpose, from the description `index.html` gives every shared link. */
function purpose(indexHtml) {
  const match = indexHtml.match(/<meta name="description" content="([^"]+)"/);
  if (!match) throw new Error("index.html has no description");
  return match[1];
}

function llmsTxt(guides, indexHtml) {
  return [
    "# WongStack",
    "",
    `> ${purpose(indexHtml)}`,
    "",
    "Guides to get a key from a business tool and save it safely. Each one opens with steps for an AI agent.",
    "",
    "## Guides",
    "",
    ...guides.map(listLine),
    "",
  ].join("\n");
}

/** Every file the guides build, as `{ path in dist: text }`. `cssHref` is the built stylesheet's address, and
 * `indexHtml` the page whose description `llms.txt` repeats. */
export function renderGuides({ dir = join(SITE_DIR, "guides"), cssHref, indexHtml }) {
  const guides = readGuides(dir);
  const agentPart = readAgentPart(dir);
  const shots = readShotList(dir);
  const files = {};
  for (const read of guides) {
    const guide = { ...read, body: withoutPending(read.body, shots) };
    files[`guides/${guide.id}/index.html`] = guideHtml(guide, agentPart, cssHref);
    files[`guides/${guide.id}.md`] = guideMarkdown(guide, agentPart);
  }
  files["guides/index.html"] = listHtml(guides, cssHref);
  files["guides.md"] = listMarkdown(guides);
  files["llms.txt"] = llmsTxt(guides, indexHtml);
  return files;
}

/** The built stylesheet `vite build` linked in `dist/index.html`. */
export function builtCss(indexHtml) {
  const match = indexHtml.match(/<link rel="stylesheet"[^>]*href="([^"]+\.css)"/);
  if (!match) throw new Error("dist/index.html links no stylesheet: run vite build first");
  return match[1];
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dist = join(SITE_DIR, "dist");
  const indexPath = join(dist, "index.html");
  if (!existsSync(indexPath)) throw new Error("no dist/index.html: run vite build first");
  const indexHtml = readFileSync(indexPath, "utf8");
  const files = renderGuides({ cssHref: builtCss(indexHtml), indexHtml });
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(dist, path)), { recursive: true });
    writeFileSync(join(dist, path), text);
  }
  console.log(`build-guides: wrote ${Object.keys(files).length} files`);
}
