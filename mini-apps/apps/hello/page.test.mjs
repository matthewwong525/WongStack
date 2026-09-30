// Run: node --test   (from this folder; no install)
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const html = readFileSync(new URL("./index.html", import.meta.url), "utf8");

test("the page links the shared look", () => {
	assert.match(html, /<link rel="stylesheet" href="\/style\.css">/);
});

test("the page links its own styles beside the shared look", () => {
	assert.match(html, /<link rel="stylesheet" href="style\.css">/);
	assert.ok(existsSync(new URL("./style.css", import.meta.url)), "style.css exists");
});

test("the editable brand is the sole link home", () => {
	assert.match(html, /<a class="site-brand" href="\/">\s*<img[^>]+src="\/favicon\.svg" alt="">\s*<span>WongStack<\/span>\s*<\/a>/);
	assert.equal([...html.matchAll(/<a\b[^>]*\bhref="\/"/g)].length, 1);
});

test("the form names its field and announces the greeting below submit", () => {
	assert.match(html, /<label[^>]+for="name">Your name<\/label>/);
	assert.match(html, /<input[^>]+id="name" autocomplete="given-name"/);
	assert.match(html, /<form[^>]+id="form"[\s\S]*<button[^>]+type="submit">Say hello<\/button>\s*<p[^>]+id="message" aria-live="polite">Your greeting will appear here\.<\/p>\s*<\/form>/);
});

test("the page loads its script from app.js, not inline", () => {
	assert.match(html, /<script type="module" src="app\.js"><\/script>/);
	assert.ok(existsSync(new URL("./app.js", import.meta.url)), "app.js exists");
	assert.doesNotMatch(html, /<script(?![^>]*\bsrc=)[^>]*>/, "no inline script");
});
