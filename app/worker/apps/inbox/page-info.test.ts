// What the inbox reads from a review page's HTML when it is put.
import { expect, it } from "vitest";
import { readPageInfo } from "./page-info";

const key = (html: string) => readPageInfo(html).key;
const ownBack = (html: string) => readPageInfo(html).ownBack;
const labels = (html: string) => readPageInfo(html).labels;

it("reads a plan's notes key from its review page's body, and none from a page that names no change", () => {
  expect(key('<!doctype html><body class="x" data-change="inbox-mini-app">')).toBe("wong-review3:inbox-mini-app");
  for (const body of ['<p data-change="inbox">', '<body data-change="">', '<body data-change="a b">', "<body>"]) expect(key(body)).toBeNull();
});

it("reads whether a plan draws its own Back from its body tag, and from nothing else", () => {
  expect(ownBack('<!doctype html><body class="x" data-change="inbox" data-own-back>')).toBe(true);
  expect(ownBack('<body data-own-back="">')).toBe(true);
  for (const body of ['<body data-change="inbox">', "<p data-own-back>", "<body data-own-backs>", "<body x-data-own-back>",
    "<body><p>data-own-back</p>", "<div data-own-back></div><body>"]) expect(ownBack(body)).toBe(false);
});

it("reads a page's button labels from its ready line, and none from a page with no line or a broken one", () => {
  const ready = (actions: string) => `<p>Plan</p><div id="ready" data-actions="${actions}" hidden></div>`;
  expect(labels(ready("[{&quot;name&quot;:&quot;publish&quot;,&quot;label&quot;:&quot;Build &amp; publish&quot;}]"))).toEqual({ publish: "Build & publish" });
  expect(labels("<p>Plan</p>")).toEqual({});
  expect(labels(ready("[{"))).toEqual({});
  expect(labels(ready("[{&quot;name&quot;:3}]"))).toEqual({});
});
