/// <reference types="node" />
// Every guide in site/guides/ keeps one shape, its pictures are the site's own files, and the built pages need no
// script. wiki/maintaining/service-guides.md owns what a guide holds.
import { cleanup, render } from "@testing-library/react";
import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, expect, it, vi } from "vitest";
import {
  FOOTER_LINKS,
  HEADER_LINKS,
  SAFETY_ID,
  SITE,
  COPY_SCRIPT,
  readAgentPart,
  readGuides,
  readShotList,
  renderGuides,
} from "../scripts/build-guides.mjs";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

type Guide = { id: string; kind: "guide" | "page"; meta: Record<string, unknown>; body: string };

const site = (path: string) => resolve(import.meta.dirname, "..", path);
const guides = readGuides() as Guide[];
const tools = guides.filter((guide) => guide.kind === "guide");
const files = renderGuides({
  cssHref: "/src/index.css",
  indexHtml: readFileSync(site("index.html"), "utf8"),
}) as Record<string, string>;

/** The eight tools the site carries a guide for. */
const TOOLS = ["shopify", "shopify-theme", "klaviyo", "meta-ads", "google", "canva", "slack", "notion"];

/** Parts every tool guide has after its steps, in order. */
const PARTS = ["Permissions to choose", "Save it", "Check it works", "If it leaks", "Sources"];

const MAX_PICTURE_BYTES = 150 * 1024;

const shots = readShotList();

afterEach(cleanup);

/** `markdown` cut at each `## ` heading: its title, and the text under it. */
function sections(markdown: string) {
  return markdown
    .split(/^## /m)
    .slice(1)
    .map((part) => {
      const [title = "", ...rest] = part.split("\n");
      return { title: title.trim(), text: rest.join("\n") };
    });
}

const pictures = (markdown: string) => [...markdown.matchAll(/!\[([^\]]*)\]\(([^)\s]+)/g)].map(([, alt, src]) => ({ alt, src }));

/** Each numbered step in a steps part, with the text under it. */
function steps(text: string) {
  return text
    .split(/^### /m)
    .slice(1)
    .map((part) => ({ heading: part.split("\n")[0] ?? "", text: part }));
}

function stepProblems(title: string, text: string) {
  const list = steps(text);
  if (list.length === 0) return [`"${title}" has no numbered steps`];
  return list.flatMap((step, i) => {
    const problems = [];
    if (!step.heading.startsWith(`${i + 1}. `)) problems.push(`"${title}" step ${i + 1} is not numbered ${i + 1}`);
    if (!pictures(step.text).some((picture) => picture.alt.trim())) {
      problems.push(`"${title}" step ${i + 1} has no picture with describing text`);
    }
    return problems;
  });
}

/** Every part a tool guide lacks, each naming the guide and the part. */
function guideProblems(guide: Guide) {
  const { id, meta, body } = guide;
  const parts = sections(body);
  const titles = parts.map((part) => part.title);
  const named = (title: string) => parts.find((part) => part.title === title)?.text ?? "";
  const problems = [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(meta.lastChecked))) problems.push("no last-checked date");
  if (!(Number(meta.minutes) > 0)) problems.push("no time");
  if (!String(meta.needs ?? "").trim()) problems.push("no needs");
  const stepParts = parts.filter((part) => part.title.startsWith("Steps"));
  if (stepParts.length === 0) problems.push("no steps");
  for (const part of stepParts) problems.push(...stepProblems(part.title, part.text));
  for (const title of PARTS) if (!titles.includes(title)) problems.push(`no "${title}" part`);
  const env = (meta.env as string[] | undefined) ?? [];
  if (env.length === 0) problems.push("no names to save");
  for (const name of env) if (!named("Save it").includes(name)) problems.push(`"Save it" does not name ${name}`);
  if (!named("Save it").includes(`](/guides/${SAFETY_ID})`)) problems.push(`"Save it" does not link /guides/${SAFETY_ID}`);
  if (!/```/.test(named("Check it works"))) problems.push(`"Check it works" has no command`);
  if (!/\]\(https:\/\//.test(named("Sources"))) problems.push(`"Sources" links no page`);
  return problems.map((problem) => `${id}: ${problem}`);
}

it("carries a guide for each of the eight tools, and the safety page", () => {
  expect(tools.map((guide) => guide.id).sort()).toEqual([...TOOLS].sort());
  expect(guides.some((guide) => guide.id === SAFETY_ID && guide.kind === "page")).toBe(true);
});

it("finds each part in every guide, and names the guide and the part that is missing", () => {
  for (const guide of tools) expect(guideProblems(guide)).toEqual([]);

  // A guide with parts taken out fails, naming each, so a clean read means something.
  const broken: Guide = {
    id: "broken",
    kind: "guide",
    meta: { lastChecked: "soon", minutes: 5, needs: "", env: ["A_KEY"] },
    body: "## Steps\n\n### 1. Open it\n\nNo picture.\n\n### 3. Skip\n\n![](/guides/broken/03.webp)\n\n## Save it\n\nNothing.",
  };
  expect(guideProblems(broken)).toEqual([
    "broken: no last-checked date",
    "broken: no needs",
    'broken: "Steps" step 1 has no picture with describing text',
    'broken: "Steps" step 2 is not numbered 2',
    'broken: "Steps" step 2 has no picture with describing text',
    'broken: no "Permissions to choose" part',
    'broken: no "Check it works" part',
    'broken: no "If it leaks" part',
    'broken: no "Sources" part',
    'broken: "Save it" does not name A_KEY',
    `broken: "Save it" does not link /guides/${SAFETY_ID}`,
    `broken: "Check it works" has no command`,
    `broken: "Sources" links no page`,
  ]);
});

it("shows only pictures the site serves itself, each with describing text and small enough for a phone", () => {
  let count = 0;
  for (const guide of guides) {
    for (const { alt, src } of pictures(guide.body)) {
      count++;
      const where = `${guide.id}: ${src}`;
      expect([where, alt.trim().length > 0]).toEqual([where, true]);
      expect([where, src.startsWith(`/guides/${guide.id}/`) && /\.(webp|svg)$/.test(src)]).toEqual([where, true]);
      const file = site(`public${src}`);
      // A screenshot still to take waits on the shot list; the build leaves it out.
      expect([where, existsSync(file) || src in shots]).toEqual([where, true]);
      if (existsSync(file)) expect([where, statSync(file).size <= MAX_PICTURE_BYTES]).toEqual([where, true]);
    }
  }
  expect(count).toBeGreaterThan(tools.length);
});

it("keeps the shot list to pictures a guide uses and nobody has taken, and builds no page that shows one", () => {
  const used = new Set(guides.flatMap((guide) => pictures(guide.body).map(({ src }) => src)));
  for (const [src, shot] of Object.entries(shots)) {
    expect([src, used.has(src), existsSync(site(`public${src}`))]).toEqual([src, true, false]);
    expect([src, shot.page.startsWith("https://"), Boolean(shot.show && shot.stop)]).toEqual([src, true, true]);
  }
  const built = Object.values(files).join("\n");
  for (const src of Object.keys(shots)) expect([src, built.includes(src)]).toEqual([src, false]);
});

// The products a guide never names: the guides are for anyone, whichever agent or chat app reads them. A web address
// is not a name. Names match with their capital letters, so a plain word such as "cursor" or "AI" still passes.
const withoutAddresses = (text: string) => text.replace(/https?:\/\/\S+|\]\([^)]*\)/g, "");
const AGENT_NAMES = /\b(?:Claude|Anthropic|Codex|ChatGPT|OpenAI|Cursor|Gemini|Copilot|Paseo|Windsurf|Perplexity)\b/;
const productName = (text: string) => {
  const words = withoutAddresses(text);
  return words.match(/wongstack/i)?.[0] ?? words.match(AGENT_NAMES)?.[0] ?? null;
};

it("names no one agent product or the site's own product inside a guide", () => {
  for (const guide of guides) {
    const copy = files[`guides/${guide.id}.md`] as string;
    expect([guide.id, productName(copy)]).toEqual([guide.id, null]);
  }
  expect(productName(readAgentPart())).toBeNull();

  // The check finds a name, and lets tool words and web addresses pass.
  expect(productName("Paste the key into Claude.")).toBe("Claude");
  expect(productName("Move the cursor, then ask Copilot.")).toBe("Copilot");
  expect(productName("Install WongStack first.")).toBe("WongStack");
  expect(productName("Turn on Canva's AI connector. Move the cursor to Save.")).toBeNull();
  expect(productName("Open [the docs](https://docs.anthropic.com/claude) or https://cursor.com.")).toBeNull();
});

/** Every script a built page loads or holds, as its `src`, or "inline". */
const scripts = (page: Document) => [...page.querySelectorAll("script")].map((script) => script.getAttribute("src") ?? "inline");

it("builds every guide as a whole page that reads with no script, at /guides/<id>, opening with the agent part", () => {
  for (const guide of guides) {
    const html = files[`guides/${guide.id}/index.html`] as string;
    const page = new DOMParser().parseFromString(html, "text/html");
    // The one script adds Copy buttons; every word is in the page without it.
    expect([guide.id, scripts(page)]).toEqual([guide.id, [COPY_SCRIPT]]);
    expect(page.querySelector("h1")?.textContent).toBe(guide.meta.title);
    expect(page.querySelector('link[rel="canonical"]')?.getAttribute("href")).toBe(`${SITE}/guides/${guide.id}`);
    if (guide.kind !== "guide") continue;
    // The agent part comes before the guide's own first part, and every step's words are in the page.
    const firstHeading = page.querySelector("article h2");
    expect([guide.id, firstHeading?.textContent]).toEqual([guide.id, "If you are an AI agent"]);
    for (const title of PARTS) expect([guide.id, title, html.includes(`>${title}</h2>`)]).toEqual([guide.id, title, true]);
    for (const img of page.querySelectorAll("img")) expect([guide.id, img.getAttribute("alt") !== null]).toEqual([guide.id, true]);
  }
  const list = new DOMParser().parseFromString(files["guides/index.html"] as string, "text/html");
  expect(scripts(list)).toEqual([COPY_SCRIPT]);
});

it("adds a Copy button to each code box that copies only the box's text, and leaves it to select when refused", async () => {
  const writeText = vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("refused"));
  vi.stubGlobal("navigator", { clipboard: { writeText } });
  document.body.innerHTML = '<article class="guide"><pre><code>KLAVIYO_API_KEY=paste-here\n</code></pre></article>';
  await import(/* @vite-ignore */ `${site(`public${COPY_SCRIPT}`)}?run=${Date.now()}`);
  const button = document.querySelector(".code > button") as HTMLButtonElement;
  button.click();
  await vi.waitFor(() => expect(button.textContent).toBe("Copied"));
  expect(writeText).toHaveBeenCalledWith("KLAVIYO_API_KEY=paste-here");
  button.click();
  await vi.waitFor(() => expect(button.textContent).toBe("Select and copy"));
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

it("gives every guide a plain-text copy with full addresses, and lists each one in guides.md and llms.txt", () => {
  for (const guide of guides) {
    const copy = files[`guides/${guide.id}.md`] as string;
    expect(copy.startsWith(`# ${guide.meta.title}\n`)).toBe(true);
    // Every picture and guide link is a full address, so an agent that fetched only this text can follow it.
    expect([guide.id, copy.match(/\]\(\/[^)]*\)/)?.[0] ?? null]).toEqual([guide.id, null]);
    if (guide.kind === "guide") {
      expect(copy.indexOf("## If you are an AI agent")).toBeLessThan(copy.indexOf("## Steps"));
      expect(copy).toContain(`](${SITE}/guides/${SAFETY_ID}.md)`);
    }
    for (const list of ["guides.md", "llms.txt"]) {
      expect([list, guide.id, (files[list] as string).includes(`(${SITE}/guides/${guide.id}.md)`)]).toEqual([list, guide.id, true]);
    }
    expect([guide.id, (files["guides/index.html"] as string).includes(`href="/guides/${guide.id}"`)]).toEqual([guide.id, true]);
  }
});

const links = (root: ParentNode | null) =>
  [...(root?.querySelectorAll("a") ?? [])].map((a) => [a.textContent?.trim(), a.getAttribute("href")]);

it("prints the same header and footer links as the React pages", () => {
  const header = render(<SiteHeader />).container.querySelector("nav");
  const footer = render(<SiteFooter />).container.querySelector("footer");
  expect(links(header)).toEqual(HEADER_LINKS);
  expect(links(footer)).toEqual(FOOTER_LINKS);
  const page = new DOMParser().parseFromString(files["guides/index.html"] as string, "text/html");
  expect(links(page.querySelector("header nav"))).toEqual(HEADER_LINKS);
  expect(links(page.querySelector("footer"))).toEqual(FOOTER_LINKS);
});
