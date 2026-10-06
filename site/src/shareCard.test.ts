// @vitest-environment node
/// <reference types="node" />
// The share card: the tags in index.html, which every address serves, and the
// picture they point at. They name wongstack.com, so a preview shares and
// indexes as the real site.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, it } from "vitest";

const site = (path: string) => resolve(import.meta.dirname, "..", path);
const html = readFileSync(site("index.html"), "utf8");
const LINE = "One place for AI to build, remember, and get things done, in accounts you own. Free and open source.";

const tags = Object.fromEntries(
  [...html.matchAll(/<meta (?:name|property)="(description|og:[^"]+|twitter:[^"]+)" content="([^"]*)"/g)].map(
    ([, key, value]) => [key, value],
  ),
);

it("gives every shared link the WongStack title, line, and picture", () => {
  expect(tags).toEqual({
    description: LINE,
    "og:type": "website",
    "og:site_name": "WongStack",
    "og:url": "https://wongstack.com/",
    "og:title": "WongStack",
    "og:description": LINE,
    "og:image": "https://wongstack.com/share.png",
    "og:image:width": "1200",
    "og:image:height": "630",
    "og:image:alt": "The WongStack logo beside a phone running it, with the line: One place for AI to build, remember, and get things done. In accounts you own.",
    "twitter:card": "summary_large_image",
    "twitter:title": "WongStack",
    "twitter:description": LINE,
    "twitter:image": "https://wongstack.com/share.png",
  });
  expect(html).toContain("<title>WongStack</title>");
});

it("names wongstack.com as the one address to index, whichever address served the page", () => {
  expect([...html.matchAll(/<link rel="canonical" href="([^"]*)"/g)].map(([, href]) => href)).toEqual([
    "https://wongstack.com/",
  ]);
  expect(html).not.toMatch(/noindex/i);
});

it("serves share.png as a 1200×630 PNG small enough for every previewer", () => {
  const png = readFileSync(site("public/share.png"));
  expect(png.subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  expect(png.toString("ascii", 12, 16)).toBe("IHDR");
  expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1200, 630]);
  expect(png.length).toBeLessThan(300 * 1024);
});
