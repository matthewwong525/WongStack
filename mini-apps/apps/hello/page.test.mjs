// Run: node --test   (from this folder; no install)
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const html = readFileSync(new URL("./index.html", import.meta.url), "utf8");

test("the page links the shared look", () => {
	assert.match(html, /<link rel="stylesheet" href="\/style\.css">/);
});

test("the page loads its script from app.js, not inline", () => {
	assert.match(html, /<script type="module" src="app\.js"><\/script>/);
	assert.ok(existsSync(new URL("./app.js", import.meta.url)), "app.js exists");
	assert.doesNotMatch(html, /<script(?![^>]*\bsrc=)[^>]*>/, "no inline script");
});
